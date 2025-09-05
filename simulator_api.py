# simulator_api.py
import numpy as np
import math
from fastapi import FastAPI
from pydantic import BaseModel
from typing import List
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import HTMLResponse

app = FastAPI()


# --------------------
# Quantum helper funcs
# --------------------
zero = np.array([1, 0])
one = np.array([0, 1])

def tensor_product(states):
    result = states[0]
    for s in states[1:]:
        result = np.kron(result, s)
    return result

def single_qubit_gates():
    return {
        "I": np.array([[1, 0], [0, 1]], dtype=complex),  # Identity
        "X": np.array([[0, 1], [1, 0]], dtype=complex),  # Pauli-X
        "Y": np.array([[0, -1j], [1j, 0]], dtype=complex), # Pauli-Y
        "Z": np.array([[1, 0], [0, -1]], dtype=complex), # Pauli-Z
        "H": (1/np.sqrt(2)) * np.array([[1, 1], [1, -1]], dtype=complex), # Hadamard
        "S": np.array([[1, 0], [0, 1j]], dtype=complex),  # Phase
        "Sd": np.array([[1, 0], [0, -1j]], dtype=complex), # S dagger
        "T": np.array([[1, 0], [0, np.exp(1j*np.pi/4)]], dtype=complex), # T gate
        "Td": np.array([[1, 0], [0, np.exp(-1j*np.pi/4)]], dtype=complex), # T dagger
        # Rotation gates
        "Rx": lambda theta: np.array([[np.cos(theta/2), -1j*np.sin(theta/2)],
                                      [-1j*np.sin(theta/2), np.cos(theta/2)]], dtype=complex),
        "Ry": lambda theta: np.array([[np.cos(theta/2), -np.sin(theta/2)],
                                      [np.sin(theta/2), np.cos(theta/2)]], dtype=complex),
        "Rz": lambda theta: np.array([[np.exp(-1j*theta/2), 0],
                                      [0, np.exp(1j*theta/2)]], dtype=complex)
    }
def expand_single_qubit_gate(gate, target_qubit, num_qubits):
    """Expand a single-qubit gate to the full system (qubit 0 = leftmost in tensor product)"""
    op_list = []
    for i in range(num_qubits):
        if i == target_qubit:
            op_list.append(gate)
        else:
            op_list.append(np.eye(2, dtype=complex))
    # Tensor product from left to right: qubit 0 is leftmost
    full_op = op_list[0]
    for mat in op_list[1:]:
        full_op = np.kron(full_op, mat)
    return full_op
def complex_array_to_list(arr):
    return [[float(x.real), float(x.imag)] for x in arr]

def apply_gate(state, gate_name, num_qubits, targets, theta=None):
    gates = single_qubit_gates()

    if gate_name in ["Rx", "Ry", "Rz"]:  # parametric single-qubit gate
        gate = gates[gate_name](theta)
        U = expand_single_qubit_gate(gate, targets[0], num_qubits)
        return U @ state

    elif gate_name in gates:  # non-parametric single-qubit gate
        gate = gates[gate_name]
        U = expand_single_qubit_gate(gate, targets[0], num_qubits)
        return U @ state

    elif gate_name == "CNOT":
        control, target = targets
        U = np.eye(2**num_qubits, dtype=complex)
        for i in range(2**num_qubits):
            bits = [(i >> j) & 1 for j in reversed(range(num_qubits))]
            if bits[control] == 1:
                flipped = i ^ (1 << (num_qubits-1-target))
                U[i, i] = 0
                U[flipped, i] = 1
        return U @ state

    elif gate_name == "CZ":
        control, target = targets
        U = np.eye(2**num_qubits, dtype=complex)
        for i in range(2**num_qubits):
            bits = [(i >> j) & 1 for j in reversed(range(num_qubits))]
            if bits[control] == 1 and bits[target] == 1:
                U[i, i] = -1
        return U @ state

    elif gate_name == "SWAP":
        q1, q2 = targets
        U = np.eye(2**num_qubits, dtype=complex)
        for i in range(2**num_qubits):
            bits = [(i >> j) & 1 for j in reversed(range(num_qubits))]
            swapped = bits[:]
            swapped[q1], swapped[q2] = swapped[q2], swapped[q1]
            new_index = int("".join(map(str, swapped)), 2)
            U[i, i] = 0
            U[new_index, i] = 1
        return U @ state

    elif gate_name == "TOFFOLI":
        c1, c2, target = targets
        U = np.eye(2**num_qubits, dtype=complex)
        for i in range(2**num_qubits):
            bits = [(i >> j) & 1 for j in reversed(range(num_qubits))]
            if bits[c1] == 1 and bits[c2] == 1:
                flipped = i ^ (1 << (num_qubits-1-target))
                U[i, i] = 0
                U[flipped, i] = 1
        return U @ state

    else:
        raise ValueError(f"Unknown gate: {gate_name}")
def partial_trace(rho, keep, dims):
    """Trace out all subsystems except those in keep"""
    n = len(dims)   # number of qubits
    total_dim = 2**n
    if rho.shape != (total_dim, total_dim):
        raise ValueError("Full density matrix shape does not match 2^n x 2^n for the given n.")
    
    # keep is passed as a list, so make sure it's an int
    if isinstance(keep, list):
        if len(keep) != 1:
            raise ValueError("This partial_trace supports keeping exactly one qubit.")
        keep = keep[0]

    others = [i for i in range(n) if i != keep]
    rho_red = np.zeros((2,2), dtype=complex)

    # Loop over basis values for the kept qubit and sum over all assignments of other qubits
    for i_k in (0,1):
        for j_k in (0,1):
            ssum = 0+0j
            for s in range(2**(n-1)):
                bits_other = [(s >> (len(others)-1 - t)) & 1 for t in range(len(others))]
                bits_row = [0]*n
                bits_col = [0]*n
                bits_row[keep] = i_k
                bits_col[keep] = j_k
                for t, pos in enumerate(others):
                    bits_row[pos] = bits_other[t]
                    bits_col[pos] = bits_other[t]
                # convert bit-lists to linear index (big-endian)
                idx_row = 0
                idx_col = 0
                for b in bits_row:
                    idx_row = (idx_row << 1) | b
                for b in bits_col:
                    idx_col = (idx_col << 1) | b
                ssum += rho[idx_row, idx_col]
            rho_red[i_k, j_k] = ssum
    return rho_red


def get_reduced_density_matrix(state, num_qubits, target_qubit):
    rho = np.outer(state, np.conjugate(state))
    return partial_trace(rho, [target_qubit], [2]*num_qubits)

def recognize_gate(name):
    gates = single_qubit_gates()
    return gates.get(name, None)

# --------------------
# Bloch sphere utility
# --------------------
def state_to_bloch(alpha, beta):
    x = 2 * (alpha.real * beta.real + alpha.imag * beta.imag)
    y = 2 * (alpha.real * beta.imag - alpha.imag * beta.real)
    z = abs(alpha)**2 - abs(beta)**2
    return [x, y, z]

def qubit_properties(reduced):
    # Bloch coordinates (already computed in your code, but keep for clarity)
    X = np.array([[0, 1], [1, 0]], dtype=complex)
    Y = np.array([[0, -1j], [1j, 0]], dtype=complex)
    Z = np.array([[1, 0], [0, -1]], dtype=complex)
    bloch=[
        float(np.real(np.trace(reduced @ X))),
        float(np.real(np.trace(reduced @ Y))),
        float(np.real(np.trace(reduced @ Z)))
    ]
    # Measurement probabilities
    p0 = float(np.real(reduced[0, 0]))
    p1 = float(np.real(reduced[1, 1]))

        # Purity = Tr(ρ²)
    purity = float(np.real(np.trace(reduced @ reduced)))

        # Entropy (von Neumann entropy)
    evals = np.linalg.eigvalsh(reduced)
    evals = [e for e in evals if e > 1e-12]  # filter numerical noise
    entropy = float(-sum(e * np.log2(e) for e in evals))

    return {
        "bloch": bloch,
        "probabilities": {"0": p0, "1": p1},
        "purity": purity,
        "entropy": entropy
    }

def safe_float(x):
    return 0.0 if np.isnan(x) else float(x)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # allow all origins
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
# --------------------
# API Models
# --------------------
class SimRequest(BaseModel):
    numQubits: int
    initState: str
    gates: List[str]

# --------------------
# API Endpoints
# --------------------
@app.get("/", response_class=HTMLResponse)
async def root():
    return """
    <h1>Quantum Simulator</h1>
    <p>Go to the frontend page to run your simulator.</p>
    """

@app.post("/simulate")
async def simulate(req: SimRequest):
    """
    Run a quantum simulation.
    Example input:
    {
      "numQubits": 1,
      "initState": "0",
      "gates": ["H(0)"]
    }
    """

    # 1. Initial state preparation
    qubits = [zero if b == "0" else one for b in req.initState]
    state = tensor_product(qubits)

    # 2. Apply gates in sequence
    for g in req.gates:
        g = g.strip()
        if "(" in g and ")" in g:
            name, params = g.split("(")
            params = params[:-1]  # remove trailing ")"
            if "," in params:
                raw = params.split(",")
                if name in ["Rx", "Ry", "Rz", "Phase"]:
                    # rotation gates: first param = angle, rest = qubits
                    theta = float(raw[1])
                    targets = [int(raw[0])]
                else:
                    # normal gates: all params are qubit indices
                    targets = [int(x) for x in raw]
            elif params != "":
                if name in ["Rx", "Ry", "Rz", "Phase"]:
                    theta = float(params)
                    targets = []
                else:
                    targets = [int(params)]
            else:
                targets = []

        else:
            continue

        theta = None
        if name in ["Rx", "Ry", "Rz"]:
            # Example: "Rx(90,0)" → first value is θ in degrees
            if len(targets) > 1:
                theta = math.radians(targets[0])
                targets = targets[1:]
            else:
                # fallback: 90 degrees
                theta = math.pi/2

        state = apply_gate(state, name, req.numQubits, targets, theta)

    # 3. Compute Bloch vectors for each qubit
    results = []
    for i in range(req.numQubits):
        reduced = get_reduced_density_matrix(state, req.numQubits, i)
        props = qubit_properties(reduced)
        results.append({
            "index": i,
            "bloch": props["bloch"],
            "entropy": props["entropy"],
            "purity": props["purity"],
            "probabilities": props["probabilities"],
            "density_matrix": [[[safe_float(x.real),safe_float(x.imag)]for x in row]for row in reduced]
        })
    # 5. Prepare full state vector amplitudes
    full_amplitudes = complex_array_to_list(state)
    return{
        "qubits": results,
        "full_state_vector": full_amplitudes
    }


@app.post("/reduce")
async def reduce_state(req: SimRequest):
    """
    Return reduced density matrix of first qubit (example).
    """
    qubits = [zero if b == "0" else one for b in req.initState]
    state = tensor_product(qubits)

    reduced = get_reduced_density_matrix(state, req.numQubits, 0)
    return {"reduced": reduced.tolist()}


@app.get("/recognize/{gate}")
async def recognize_gate_api(gate: str):
    """
    Return the matrix of a gate.
    Example: GET /recognize/H
    """
    matrix = recognize_gate(gate)
    if matrix is None:
        return {"error": "Unknown gate"}
    return {"matrix": matrix.tolist()}

