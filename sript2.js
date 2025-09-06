
const ZERO_C = math.complex(0,0);
function c(re, im=0) { return math.complex(re, im); }
const cre = math.re, cim = math.im;
// ---------- DOM elements ----------
const btnSet = document.getElementById('btnSet');
const resultsDiv = document.getElementById("results");
const afterSet = document.getElementById('afterSet');
const numQInput = document.getElementById('numQ');
const basisSelect = document.getElementById('basisState');

const gateType = document.getElementById('gateType');
const singleTargetDiv = document.getElementById('singleTargetDiv');
const targetQ = document.getElementById('targetQ');

const angleDiv = document.getElementById('angleDiv');
const angleDeg = document.getElementById('angleDeg');
const angleLabel = document.getElementById('angleLabel');

const cnotDiv = document.getElementById('cnotDiv');
const controlQ = document.getElementById('controlQ');
const targetQ2 = document.getElementById('targetQ2');

const swapDiv = document.getElementById('swapDiv');
const swapA = document.getElementById('swapA');
const swapB = document.getElementById('swapB');

const ccnotDiv = document.getElementById('ccnotDiv');
const cc_c1 = document.getElementById('cc_c1');
const cc_c2 = document.getElementById('cc_c2');
const cc_t = document.getElementById('cc_t');

const btnAddGate = document.getElementById('btnAddGate');
const btnUndo = document.getElementById('btnUndo');
const btnClearGates = document.getElementById('btnClearGates');
const gatesListDiv = document.getElementById('gatesList');

const blochSpheresDiv = document.getElementById('blochSpheres');
// ---------- Setup handlers ----------
btnSet.addEventListener('click', onSet);
gateType.addEventListener('change', onGateTypeChange);
btnAddGate.addEventListener('click', onAddGate);
btnUndo.addEventListener('click', onUndo);
btnClearGates.addEventListener('click', onClearGates);


// ---------- Functions ----------
blochSpheresDiv.innerHTML = "<div class = grid > <b><h2 style= text-align:'centre'>Qubit</h2></b> <p>The fundemental unit of quantum information, serving as the quantum equvivalent of a classical computer's bit. A qubit can have states 0, 1, 0/1(superposition). </p></div>"

let firstQubit = false;
let gateSequence = [];  // store sequence of gates
let nQ = 0;             // number of qubits

function onSet(){
  nQ = parseInt(numQInput.value);
  if (!(nQ >=1 && nQ <=5)) { alert("Choose n between 1 and 5"); return; }
  populateBasis(nQ);
  populateQubitSelectors(nQ);
  initState(nQ);
  afterSet.classList.remove('hidden');
  gateSequence = [];
  renderGateList(gateSequence);
  resultsDiv.innerHTML = "<div class='small'>Initial state set. Add gates and click Run.</div>";
  if(!firstQubit){
    blochSpheresDiv.innerHTML = "<div class = grid ><p>Tensor  products (&#8855;) are essential for describing subsystems composed of multiple quantum subsystems, where the state of the total system is given by the tensor product of the states of the individual subsystems </p></div>";
    firstQubit = true;
  }
  
}
function populateBasis(n){
  basisSelect.innerHTML = "";
  for (let i = 0; i < (1 << n); i++){
    const opt = document.createElement('option');
    opt.value = i.toString(2).padStart(n, '0');
    // separate each qubit with | >
    opt.innerHTML = opt.value.split('').map(bit => `|${bit}⟩ `).join(' &#8855; ');
    basisSelect.appendChild(opt);
  }
  // default to |0⟩|0⟩...|0⟩
  basisSelect.value = '0'.repeat(n);
}


function populateQubitSelectors(n){
  const sels = [targetQ, controlQ, targetQ2, swapA, swapB, cc_c1, cc_c2, cc_t];
  sels.forEach(s => s.innerHTML = '');
  for (let i=0;i<n;i++){
    const opt = (id)=>{ const o=document.createElement('option'); o.value=i; o.text='q'+i; return o; };
    sels.forEach(s => s.appendChild(opt()));
  }
}

function initState(n){
  const dim = 1<<n;
  stateVec = Array(dim).fill(0).map(()=>c(0,0));
  const initIndex = parseInt(basisSelect.value || "0", 2);
  stateVec[initIndex] = c(1,0);
}

function onGateTypeChange(){
  const type = gateType.value;
  // hide all
  singleTargetDiv.classList.add('hidden');
  cnotDiv.classList.add('hidden');
  swapDiv.classList.add('hidden');
  ccnotDiv.classList.add('hidden');
  angleDiv.classList.add('hidden');

  // show relevant
  if (['X','Y','Z','H','S','Sdg','T','Tdg','Rx','Ry','Rz','Phase'].includes(type)){
    singleTargetDiv.classList.remove('hidden');
  }
  if (['Rx','Ry','Rz','Phase'].includes(type)){
    angleDiv.classList.remove('hidden');
    angleLabel.textContent = (type==='Phase') ? 'φ (degrees):' : 'θ (degrees):';
  }
  if (type === 'CNOT' || type === 'CZ'){
    cnotDiv.classList.remove('hidden');
  }
  if (type === 'SWAP'){
    swapDiv.classList.remove('hidden');
  }
  if (type === 'CCNOT'){
    ccnotDiv.classList.remove('hidden');
  }
}
function renderGateList(gates) {
  const listDiv = document.getElementById("gatesList");
  listDiv.innerHTML = "";

  if (!gates || gates.length === 0) {
    listDiv.innerHTML = "<div class='small'>No gates added yet.</div>";
    return;
  }

  gates.forEach((g, i) => {
    const d = document.createElement("div");
    d.className = "gate-item";

    // --- Left (description) ---
    const left = document.createElement("div");
    left.className = "gate-left";

    let desc = `<b>${i + 1}.</b> <span style="color:blue">${g.type}</span>`;

    if (Array.isArray(g.params) && g.params.length > 0) {
      desc += ` ⟶ <span style="color:green">[${g.params.join(", ")}]</span>`;
    }

    if (g.angle !== undefined) {
      const deg = (g.angle * 180 / Math.PI).toFixed(2);
      desc += ` <span style="color:darkred">(θ=${deg}°)</span>`;
    }

    left.innerHTML = desc;

    // --- Right (buttons) ---
    const right = document.createElement("div");
    right.className = "gate-right";

    const up = document.createElement("button");
    up.textContent = "↑";
    up.onclick = () => {
      if (i > 0) {
        [gates[i - 1], gates[i]] = [gates[i], gates[i - 1]];
        renderGateList(gates);
      }
    };

    const down = document.createElement("button");
    down.textContent = "↓";
    down.onclick = () => {
      if (i < gates.length - 1) {
        [gates[i + 1], gates[i]] = [gates[i], gates[i + 1]];
        renderGateList(gates);
      }
    };

    const rm = document.createElement("button");
    rm.textContent = "Remove";
    rm.className = "rm";
    rm.onclick = () => {
      gates.splice(i, 1);
      renderGateList(gates);
    };

    right.appendChild(up);
    right.appendChild(down);
    right.appendChild(rm);

    // --- Store gate info for backend ---
    d.dataset.gate = JSON.stringify({
      type: g.type,
      params: g.params || [],
      angle: g.angle !== undefined ? g.angle : null
    });

    d.appendChild(left);
    d.appendChild(right);
    listDiv.appendChild(d);
  });
}
function onAddGate(){
  const type = gateType.value;
  let gate = { type, params: [] };

  if (['X','Y','Z','H','S','Sdg','T','Tdg','Rx','Ry','Rz','Phase'].includes(type)){
    const t = parseInt(targetQ.value);
    gate.params = [t];
    if (['Rx','Ry','Rz','Phase'].includes(type)){
      gate.angle = (parseFloat(angleDeg.value) || 0) * Math.PI/180; // store radians
    }
  } else if (type === 'CNOT' || type === 'CZ'){
    const c = parseInt(controlQ.value), t = parseInt(targetQ2.value);
    if (c === t) { alert("Control and target must be different"); return; }
    gate.params = [c, t];
  } else if (type === 'SWAP'){
    const a = parseInt(swapA.value), b = parseInt(swapB.value);
    if (a === b) { alert("Choose two different qubits"); return; }
    gate.params = [a, b];
  } else if (type === 'CCNOT'){
    const c1 = parseInt(cc_c1.value), c2 = parseInt(cc_c2.value), t = parseInt(cc_t.value);
    const set = new Set([c1,c2,t]);
    if (set.size < 3) { alert("Controls and target must be all different"); return; }
    if (nQ < 3) { alert("CCNOT needs at least 3 qubits"); return; }
    gate.params = [c1, c2, t];
  }

  gateSequence.push(gate);
  renderGateList(gateSequence);
}

function onUndo(){
  gateSequence.pop();
  renderGateList(gateSequence);
}

function onClearGates(){
  gateSequence = [];
  renderGateList(gateSequence);
}
// Format a complex number as "a + bi"
function formatComplex([re, im]) {
  re = Math.round(re * 1000) / 1000;
  im = Math.round(im * 1000) / 1000;
  if (Math.abs(im) < 1e-10) return `${re}`;
  if (Math.abs(re) < 1e-10) return `${im}i`;
  return `${re} ${im >= 0 ? "+" : "-"} ${Math.abs(im)}i`;
}
// Format a complex number nicely for amplitudes
function formatAmplitude([re, im]) {
  re = Math.round(re * 1000) / 1000;
  im = Math.round(im * 1000) / 1000;

  if (Math.abs(im) < 1e-10) return `${re}`;
  if (Math.abs(re) < 1e-10) return `${im}i`;
  return `${re}${im >= 0 ? "+" : ""}${im}i`;
}

// Render the full state vector as a ket expansion
function renderStateVector(stateVector) {
  const nQubits = Math.log2(stateVector.length);
  const container = document.createElement("div");
  const heading = document.createElement("h4");
  heading.textContent = "Full State Vector";
  container.appendChild(heading);

  let latex = "|\\psi\\rangle = ";
  let terms = [];

  for (let i = 0; i < stateVector.length; i++) {
    const amp = formatAmplitude(stateVector[i]);
    if (amp === "0") continue;  // skip zero amplitudes
    const basis = i.toString(2).padStart(nQubits, "0"); // binary string
    terms.push(`${amp}|${basis}\\rangle`);
  }

  latex += terms.join(" + ");

  const latexDiv = document.createElement("div");
  latexDiv.innerHTML = `$$${latex}$$`;
  container.appendChild(latexDiv);

  return container;
}

// Render matrix in LaTeX (if ≤ 2x2) or HTML table (if bigger)
function renderMatrix(matrix, title) {
  const size = Math.sqrt(matrix.length); // assume square
  const container = document.createElement("div");
  const heading = document.createElement("h4");
  heading.textContent = title;
  container.appendChild(heading);

  if (size <= 2) {
    // Convert to LaTeX
    let latex = "\\begin{bmatrix}";
    latex += matrix.map(row => row.map(formatComplex).join(" & ")).join(" \\\\ ");
  
    latex += "\\end{bmatrix}";

    const latexDiv = document.createElement("div");
    latexDiv.innerHTML = `$$${latex}$$`;
    container.appendChild(latexDiv);
    if (window.MathJax) {
    MathJax.typesetPromise([latexDiv]).catch(err =>
      console.error("MathJax rendering failed:", err)
    );
  }
  } else {
    // Render as HTML table
    const table = document.createElement("table");
    table.style.borderCollapse = "collapse";
    table.style.marginBottom = "10px";
    for (let i = 0; i < size; i++) {
      const row = document.createElement("tr");
      for (let j = 0; j < size; j++) {
        const cell = document.createElement("td");
        cell.textContent = formatComplex(matrix[i*size + j]);
        cell.style.border = "1px solid black";
        cell.style.padding = "5px";
        row.appendChild(cell);
      }
      table.appendChild(row);
    }
    container.appendChild(table);
  }
  
  return container;
}
function renderQubitProperties(q) {
  const div = document.createElement("div");
  div.className = "qubit-properties";

  div.innerHTML = `
    <h4>Qubit ${q.index}</h4>
    <p><b>Bloch Vector:</b> [${q.bloch.map(v => v.toFixed(3)).join(", ")}]</p>
    <p><b>Probabilities:</b> |0⟩ = ${(q.probabilities["0"]*100).toFixed(2)}%, 
                               |1⟩ = ${(q.probabilities["1"]*100).toFixed(2)}%</p>
    <p><b>Purity:</b> ${q.purity.toFixed(3)}</p>
    <p><b>Entropy:</b> ${q.entropy.toFixed(3)}</p>
  `;

  return div;
}

document.addEventListener("DOMContentLoaded", () => {
  const btnRun = document.getElementById("btnRun");
  const loading = document.getElementById("loading");
// ---------- App state ----------

  btnRun.addEventListener("click", async () => {
    loading.style.display  = "block";
    // Example: collect values from your form
    const numQubits = parseInt(document.getElementById("numQ").value);
    const initState = document.getElementById("basisState").value || "0";
    
    // Collect gates from your gatesList
    const gateElements = document.querySelectorAll("#gatesList .gate-item");
    const gates = Array.from(gateElements).map(el => {
      const g = JSON.parse(el.dataset.gate);  // parse JSON
      const type = g.type;
      const params = g.params || [];
      const angle = g.angle;

      if (["X","Y","Z","H","S","Sdg","T","Tdg"].includes(type)) {
        return `${type}(${params[0]})`;
      }

      if (["Rx","Ry","Rz","Phase"].includes(type)) {
          const target = params[0];             // qubit index
          const ang = angle ? parseFloat(angle) : 90; // ensure it's a number
          return `${type}(${target},${ang})`;   // qubit index first, angle second
      }

      if (["CNOT","CZ"].includes(type)) {
        return `${type}(${params[0]},${params[1]})`;
      }

      if (type === "SWAP") {
        return `SWAP(${params[0]},${params[1]})`;
      }

      if (type === "CCNOT") {
        return `TOFFOLI(${params[0]},${params[1]},${params[2]})`;
      }

      return null; // unknown
    }).filter(g => g !== null);
    try {
      const res = await fetch("https://quantum-sim.onrender.com", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          numQubits: numQubits,
          initState: initState,
          gates: gates
        })
      });
      const data = await res.json();
      console.log("Backend response:", data);

      resultsDiv.innerHTML = "";
      // Full state vector
      const stateMatrixContainer = renderStateVector(data.full_state_vector, "Full State Vector");
      resultsDiv.appendChild(stateMatrixContainer);

      blochSpheresDiv.innerHTML = "";/*
    // Loop through qubits and render their properties + Bloch spheres
      data.qubits.forEach((q, i) => {
        const wrapper = document.createElement("div");
        wrapper.classList.add("bloch-wrapper");
        // Render reduced density matrix (as LaTeX or table)
        if (q.density_matrix && q.density_matrix.length){
          const matrixContainer = renderMatrix(q.density_matrix, `Qubit ${i} Reduced Density Matrix`);
          resultsDiv.appendChild(matrixContainer);
        }
        else{
          console.warn("matrix is undefined or empty: ",q.density_matrix);
        }
        // Bloch sphere
        const sphereId = `bloch-${i}`;
        const sphereDiv = document.createElement("div");
        sphereDiv.id = sphereId;
        sphereDiv.classList.add("bloch-canvas");
        wrapper.appendChild(sphereDiv);
        // Render qubit properties (bloch vector, probs, purity, entropy)
        const propsDiv = renderQubitProperties(q);
        propsDiv.classList.add("bloch-properties");
        wrapper.appendChild(propsDiv);
        blochSpheresDiv.appendChild(wrapper);
        
        plotBloch(sphereId, {x: q.bloch[0], y: q.bloch[1], z: q.bloch[2]}, i);
        
      });
      */
      data.qubits.forEach((q, i) => {
      const wrapper = document.createElement("div");
      wrapper.classList.add("bloch-wrapper");
      if (q.density_matrix && q.density_matrix.length){
          const matrixContainer = renderMatrix(q.density_matrix, `Qubit ${i} Reduced Density Matrix`);
          resultsDiv.appendChild(matrixContainer);
        }
        else{
          console.warn("matrix is undefined or empty: ",q.density_matrix);
        }

      // Bloch sphere
      const sphereId = `bloch-${i}`;
      const sphereDiv = document.createElement("div");
      sphereDiv.id = sphereId;
      sphereDiv.classList.add("bloch-canvas");
      wrapper.appendChild(sphereDiv);

      // Button for properties
      const btnProps = document.createElement("button");
      btnProps.textContent = "Show Properties";
      btnProps.classList.add("props-btn");
      wrapper.appendChild(btnProps);

      // Empty div to hold properties later
      const propsDiv = document.createElement("div");
      propsDiv.id = `props-${i}`;
      propsDiv.classList.add("bloch-properties");
      wrapper.appendChild(propsDiv);

      // Attach to DOM
      blochSpheresDiv.appendChild(wrapper);

      // Draw Bloch sphere
      plotBloch(sphereId, {x: q.bloch[0], y: q.bloch[1], z: q.bloch[2]}, i);

      // Button handler → calculate/render only when clicked
      btnProps.addEventListener("click", async () => {
        // Clear old
        propsDiv.innerHTML = "<em>Loading...</em>";

        try {
          // OPTION 1: Use already computed info from data.qubits[i]
          const props = renderQubitProperties(data.qubits[i]);
          propsDiv.innerHTML = props.innerHTML;

          // OPTION 2: If you want to fetch fresh values from backend:
          /*
          const res = await fetch("https://quantum-sim.onrender.com", {
            method: "POST",
            headers: {"Content-Type": "application/json"},
            body: JSON.stringify({ numQubit: i })
          });
          const qData = await res.json();
          const props = renderQubitProperties(qData);
          propsDiv.innerHTML = props.innerHTML;
          */
        } catch (err) {
          console.error("Failed to fetch properties:", err);
          propsDiv.innerHTML = "<span style='color:red'>Error loading properties</span>";
        }
      });
    });


      // Tell MathJax to re-render LaTeX
      if (window.MathJax) {
        MathJax.typesetPromise();
      }

    } catch (err) {
      console.error("Error contacting backend:", err);
      resultsDiv.textContent = "Backend error! See console.";
    }finally{
      loading.style.display = "none";
    }
  });
});
function plotBloch(containerId, bloch, q) {
  const U = 30, V = 30;
  let xs = [], ys = [], zs = [];

  // Sphere coordinates
  for (let i = 0; i <= U; i++) {
    const rowx = [], rowy = [], rowz = [];
    const theta = Math.PI * i / U;
    for (let j = 0; j <= V; j++) {
      const phi = 2 * Math.PI * j / V;
      rowx.push(Math.sin(theta) * Math.cos(phi));
      rowy.push(Math.sin(theta) * Math.sin(phi));
      rowz.push(Math.cos(theta));
    }
    xs.push(rowx); ys.push(rowy); zs.push(rowz);
  }

  // Bloch sphere mesh
  const sphere = {
    type: "surface",
    x: xs, y: ys, z: zs,
    opacity: 0.3,
    colorscale: [[0, "rgba(228, 246, 253, 0.87)"], [1, "rgba(248, 200, 244, 1)"]],
    showscale: false,
    contours: {
      x: { show: true, color: "#5a56568a", width: 20 },
      y: { show: true, color: "#5a565680", width: 20 },
      z: { show: true, color: "#5a565685", width: 20 }
    },
    hoverinfo: "skip"
  };

  // Axes
  const axes = [
    { type: "scatter3d", mode: "lines", x: [-1, 1], y: [0, 0], z: [0, 0], line: { width: 3, color: "purple" }, name: "xiaxis"}, // X
    { type: "scatter3d", mode: "lines", x: [0, 0], y: [-1, 1], z: [0, 0], line: { width: 3, color: "purple" }, name:"y-axis"}, // Y
    { type: "scatter3d", mode: "lines", x: [0, 0], y: [0, 0], z: [-1, 1], line: { width: 3, color: "purple" }, name : "z-axis"}  // Z
  ];

  // Backend-provided Bloch vector
  const vx = bloch.x, vy = bloch.y, vz = bloch.z;
  const stateVector = {
    type: "scatter3d",
    mode: "lines+markers",
    x: [0, vx], y: [0, vy], z: [0, vz],
    line: { width: 6, color: "#ff6969ec" },
    marker: { size: 1, color: "#f16464f5" },
    hoverinfo: "x+y+z",
    name: "qubit"
  };

  // Arrowhead
  const arrowHead = {
    type: "cone",
    x: [vx], y: [vy], z: [vz],
    u: [vx], v: [vy], w: [vz],
    sizemode: "absolute",
    sizeref: 0.2,
    anchor: "tip",
    colorscale: [[0, "red"], [1, "red"]],
    showscale: false
  };

  // Basis state labels
  const labels = {
    type: "scatter3d",
    mode: "text",
    x: [0, 0, 1.3, -1.3, 0, 0],
    y: [0, 0, 0, 0, 1.3, -1.3],
    z: [1.3, -1.3, 0, 0, 0, 0],
    text: ["z |0⟩", "|1⟩", "x |+⟩", "|−⟩", "y |+i⟩", "|−i⟩"],
    textfont: { size: 13, color: "#161618b2" },
    textposition: "middle center",
    hoverinfo: "text",
    name:""
  };

  // Layout
  const layout = {
    title: `Qubit ${q}`,
    margin: { l: 0, r: 0, b: 0, t: 30 },
    scene: {
      aspectmode: "cube",
      xaxis: { range: [-1.3, 1.3], showgrid: false, zeroline: false, showticklabels: false, visible: false },
      yaxis: { range: [-1.3, 1.3], showgrid: false, zeroline: false, showticklabels: false, visible: false },
      zaxis: { range: [-1.3, 1.3], showgrid: false, zeroline: false, showticklabels: false, visible: false },
      camera: { eye: { x: 0.8, y: 0.8, z: 0.8 } }
    }
  };

  Plotly.newPlot(containerId, [sphere, ...axes, stateVector, arrowHead, labels], layout, { displayModeBar: false });
}

