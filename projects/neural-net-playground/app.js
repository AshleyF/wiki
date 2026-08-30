const SHAPES = ['square', 'circle', 'triangle'];
const INPUTS = 25;
const HIDDEN = 12;
const STORAGE_KEY = 'neural-net-playground-v1';

const gridElement = document.querySelector('#pixel-grid');
const predictionLabel = document.querySelector('#prediction-label');
const predictionConfidence = document.querySelector('#prediction-confidence');
const outputBars = document.querySelector('#output-bars');
const statusElement = document.querySelector('#train-status');
const networkSvg = document.querySelector('#network');
const values = new Array(INPUTS).fill(0);
let examples = [];
let model;
let painting = false;
let paintValue = 1;

function seededRandom(seed = 0x51a9e) {
  let state = seed >>> 0;
  return () => {
    state = (state * 1664525 + 1013904223) >>> 0;
    return state / 4294967296;
  };
}

const random = seededRandom();
const randWeight = fanIn => (random() * 2 - 1) * Math.sqrt(2 / fanIn);

function freshModel() {
  return {
    w1: Array.from({ length: HIDDEN }, () => Array.from({ length: INPUTS }, () => randWeight(INPUTS))),
    b1: new Array(HIDDEN).fill(0),
    w2: Array.from({ length: SHAPES.length }, () => Array.from({ length: HIDDEN }, () => randWeight(HIDDEN))),
    b2: new Array(SHAPES.length).fill(0)
  };
}

function pattern(lines) {
  return lines.join('').split('').map(value => Number(value));
}

const BASE_PATTERNS = {
  square: [
    pattern(['11111', '10001', '10001', '10001', '11111']),
    pattern(['00000', '01110', '01010', '01110', '00000']),
    pattern(['11110', '10010', '10010', '11110', '00000'])
  ],
  circle: [
    pattern(['01110', '10001', '10001', '10001', '01110']),
    pattern(['00100', '01010', '01010', '00100', '00000']),
    pattern(['01100', '10010', '10010', '01100', '00000'])
  ],
  triangle: [
    pattern(['00100', '01010', '10001', '11111', '00000']),
    pattern(['00000', '00100', '01010', '11111', '00000']),
    pattern(['10000', '11000', '10100', '11110', '00000'])
  ]
};

function starterExamples() {
  const seeded = seededRandom(0xc1a551f1);
  const result = [];
  SHAPES.forEach((label, classIndex) => {
    BASE_PATTERNS[label].forEach(base => {
      result.push({ x: [...base], y: classIndex, source: 'starter' });
      for (let copy = 0; copy < 7; copy += 1) {
        const perturbed = base.map(pixel => {
          if (pixel && seeded() < .045) return 0;
          if (!pixel && seeded() < .018) return 1;
          return pixel;
        });
        result.push({ x: perturbed, y: classIndex, source: 'starter' });
      }
    });
  });
  return result;
}

function softmax(logits) {
  const maximum = Math.max(...logits);
  const exponents = logits.map(value => Math.exp(value - maximum));
  const total = exponents.reduce((sum, value) => sum + value, 0);
  return exponents.map(value => value / total);
}

function forward(input, network = model) {
  const hidden = network.w1.map((weights, index) => Math.tanh(network.b1[index] + weights.reduce((sum, weight, inputIndex) => sum + weight * input[inputIndex], 0)));
  const logits = network.w2.map((weights, index) => network.b2[index] + weights.reduce((sum, weight, hiddenIndex) => sum + weight * hidden[hiddenIndex], 0));
  return { hidden, output: softmax(logits) };
}

function shuffle(items) {
  for (let index = items.length - 1; index > 0; index -= 1) {
    const other = Math.floor(Math.random() * (index + 1));
    [items[index], items[other]] = [items[other], items[index]];
  }
}

function train(epochs, learningRate) {
  if (!examples.length) return;
  const order = [...examples];
  for (let epoch = 0; epoch < epochs; epoch += 1) {
    shuffle(order);
    for (const example of order) {
      const { hidden, output } = forward(example.x);
      const outputDelta = output.map((probability, index) => probability - (index === example.y ? 1 : 0));
      const oldW2 = model.w2.map(row => [...row]);
      for (let outputIndex = 0; outputIndex < SHAPES.length; outputIndex += 1) {
        for (let hiddenIndex = 0; hiddenIndex < HIDDEN; hiddenIndex += 1) {
          model.w2[outputIndex][hiddenIndex] -= learningRate * outputDelta[outputIndex] * hidden[hiddenIndex];
        }
        model.b2[outputIndex] -= learningRate * outputDelta[outputIndex];
      }
      const hiddenDelta = hidden.map((activation, hiddenIndex) => {
        const downstream = outputDelta.reduce((sum, delta, outputIndex) => sum + oldW2[outputIndex][hiddenIndex] * delta, 0);
        return downstream * (1 - activation * activation);
      });
      for (let hiddenIndex = 0; hiddenIndex < HIDDEN; hiddenIndex += 1) {
        for (let inputIndex = 0; inputIndex < INPUTS; inputIndex += 1) {
          model.w1[hiddenIndex][inputIndex] -= learningRate * hiddenDelta[hiddenIndex] * example.x[inputIndex];
        }
        model.b1[hiddenIndex] -= learningRate * hiddenDelta[hiddenIndex];
      }
    }
  }
}

function metrics() {
  let correct = 0;
  let loss = 0;
  examples.forEach(example => {
    const output = forward(example.x).output;
    const winner = output.indexOf(Math.max(...output));
    if (winner === example.y) correct += 1;
    loss -= Math.log(Math.max(1e-9, output[example.y]));
  });
  return { accuracy: correct / examples.length, loss: loss / examples.length };
}

function save() {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify({ model, examples })); } catch (error) {}
}

function load() {
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY));
    if (saved?.model?.w1?.length === HIDDEN && Array.isArray(saved.examples)) {
      model = saved.model;
      examples = saved.examples;
      return true;
    }
  } catch (error) {}
  model = freshModel();
  examples = starterExamples();
  train(450, .08);
  save();
  return false;
}

function createGrid() {
  for (let index = 0; index < INPUTS; index += 1) {
    const cell = document.createElement('button');
    cell.className = 'pixel';
    cell.type = 'button';
    cell.dataset.index = String(index);
    cell.dataset.on = 'false';
    cell.setAttribute('role', 'gridcell');
    cell.setAttribute('aria-label', `Row ${Math.floor(index / 5) + 1}, column ${(index % 5) + 1}`);
    gridElement.append(cell);
  }
}

function setPixel(index, value) {
  values[index] = value;
  const cell = gridElement.children[index];
  cell.dataset.on = String(Boolean(value));
  cell.setAttribute('aria-pressed', String(Boolean(value)));
}

function setGrid(next) {
  next.forEach((value, index) => setPixel(index, value));
  renderPrediction();
}

function renderBars(output) {
  outputBars.innerHTML = '';
  const winner = output.indexOf(Math.max(...output));
  SHAPES.forEach((shape, index) => {
    const row = document.createElement('div');
    row.className = `output-row${index === winner ? ' winner' : ''}`;
    row.innerHTML = `<span>${shape}</span><span class="bar-track"><i class="bar-fill" style="width:${(output[index] * 100).toFixed(2)}%"></i></span><output>${Math.round(output[index] * 100)}%</output>`;
    outputBars.append(row);
  });
}

function renderPrediction() {
  const active = values.some(Boolean);
  const result = forward(values);
  const winner = result.output.indexOf(Math.max(...result.output));
  predictionLabel.textContent = active ? SHAPES[winner] : '—';
  predictionConfidence.textContent = active ? `${Math.round(result.output[winner] * 100)}% confidence` : 'Draw something';
  renderBars(result.output);
  renderNetwork(result);
}

const svgElement = (name, attributes = {}) => {
  const element = document.createElementNS('http://www.w3.org/2000/svg', name);
  Object.entries(attributes).forEach(([key, value]) => element.setAttribute(key, value));
  return element;
};

function neuronPositions() {
  const inputs = Array.from({ length: INPUTS }, (_, index) => ({ x: 80 + (index % 5) * 34, y: 105 + Math.floor(index / 5) * 82 }));
  const hidden = Array.from({ length: HIDDEN }, (_, index) => ({ x: 545, y: 75 + index * 42 }));
  const output = Array.from({ length: 3 }, (_, index) => ({ x: 880, y: 195 + index * 105 }));
  return { inputs, hidden, output };
}

function activationColor(value) {
  const amount = Math.min(1, Math.abs(value));
  return `color-mix(in srgb, var(--accent) ${Math.round(amount * 85)}%, var(--panel-2))`;
}

function renderNetwork(result = forward(values)) {
  networkSvg.innerHTML = '';
  const positions = neuronPositions();
  const view = document.querySelector('#connection-view').value;
  const allWeights = [...model.w1.flat(), ...model.w2.flat()].map(Math.abs);
  const scale = Math.max(.001, ...allWeights);
  const connectionGroup = svgElement('g');

  const addConnection = (from, to, weight, label, layer) => {
    const strength = Math.abs(weight) / scale;
    if (view === 'strong' && strength < .42) return;
    if (view === 'input' && layer !== 'input') return;
    if (view === 'output' && layer !== 'output') return;
    const line = svgElement('line', {
      x1: from.x, y1: from.y, x2: to.x, y2: to.y,
      class: 'connection',
      stroke: weight >= 0 ? 'var(--positive)' : 'var(--negative)',
      'stroke-width': (.35 + strength * 4.3).toFixed(2),
      opacity: (.08 + strength * .65).toFixed(2)
    });
    const title = svgElement('title');
    title.textContent = `${label}: ${weight >= 0 ? '+' : ''}${weight.toFixed(4)}`;
    line.append(title);
    connectionGroup.append(line);
  };

  model.w1.forEach((row, hiddenIndex) => row.forEach((weight, inputIndex) => addConnection(positions.inputs[inputIndex], positions.hidden[hiddenIndex], weight, `Pixel ${Math.floor(inputIndex / 5) + 1},${(inputIndex % 5) + 1} → Hidden ${hiddenIndex + 1}`, 'input')));
  model.w2.forEach((row, outputIndex) => row.forEach((weight, hiddenIndex) => addConnection(positions.hidden[hiddenIndex], positions.output[outputIndex], weight, `Hidden ${hiddenIndex + 1} → ${SHAPES[outputIndex]}`, 'output')));
  networkSvg.append(connectionGroup);

  const addNeuron = (position, activation, label, radius = 13) => {
    const circle = svgElement('circle', { cx: position.x, cy: position.y, r: radius, class: 'neuron', fill: activationColor(activation) });
    const title = svgElement('title');
    title.textContent = `${label} activation: ${activation.toFixed(4)}`;
    circle.append(title);
    networkSvg.append(circle);
  };
  positions.inputs.forEach((position, index) => addNeuron(position, values[index], `Input ${index + 1}`, 12));
  positions.hidden.forEach((position, index) => addNeuron(position, result.hidden[index], `Hidden ${index + 1}`, 13));
  positions.output.forEach((position, index) => {
    addNeuron(position, result.output[index], SHAPES[index], 21);
    const text = svgElement('text', { x: position.x + 34, y: position.y, class: 'neuron-label' });
    text.textContent = `${SHAPES[index]} ${Math.round(result.output[index] * 100)}%`;
    networkSvg.append(text);
  });
  [['5×5 input', 148], ['12 hidden', 545], ['3 output', 880]].forEach(([label, x]) => {
    const text = svgElement('text', { x, y: 35, class: 'layer-label' });
    text.textContent = label;
    networkSvg.append(text);
  });
}

function updateStats(lastEpochs = null) {
  const summary = metrics();
  document.querySelector('#example-count').textContent = String(examples.length);
  document.querySelector('#accuracy').textContent = `${Math.round(summary.accuracy * 100)}%`;
  document.querySelector('#loss').textContent = summary.loss.toFixed(4);
  if (lastEpochs !== null) document.querySelector('#last-epochs').textContent = String(lastEpochs);
  const counts = SHAPES.map((shape, index) => `${shape}: ${examples.filter(example => example.y === index).length}`);
  document.querySelector('#class-counts').textContent = counts.join(' · ');
}

gridElement.addEventListener('pointerdown', event => {
  const cell = event.target.closest('.pixel');
  if (!cell) return;
  event.preventDefault();
  painting = true;
  paintValue = values[Number(cell.dataset.index)] ? 0 : 1;
  setPixel(Number(cell.dataset.index), paintValue);
  renderPrediction();
});
gridElement.addEventListener('pointermove', event => {
  if (!painting) return;
  event.preventDefault();
  const target = document.elementFromPoint(event.clientX, event.clientY);
  const cell = target?.closest?.('.pixel');
  if (!cell || !gridElement.contains(cell)) return;
  setPixel(Number(cell.dataset.index), paintValue);
  renderPrediction();
});
window.addEventListener('pointerup', () => { painting = false; });
window.addEventListener('pointercancel', () => { painting = false; });

document.querySelector('#clear-grid').addEventListener('click', () => setGrid(new Array(INPUTS).fill(0)));
document.querySelectorAll('[data-label]').forEach(button => button.addEventListener('click', () => {
  if (!values.some(Boolean)) {
    statusElement.textContent = 'Draw a shape before labeling it.';
    return;
  }
  const label = button.dataset.label;
  examples.push({ x: [...values], y: SHAPES.indexOf(label), source: 'user' });
  train(180, Number(document.querySelector('#learning-rate').value) || .08);
  save();
  updateStats(180);
  renderPrediction();
  statusElement.textContent = `Added and learned one ${label}.`;
}));

document.querySelector('#train').addEventListener('click', () => {
  const epochs = Math.max(1, Math.min(5000, Number(document.querySelector('#epochs').value) || 600));
  const rate = Math.max(.001, Math.min(1, Number(document.querySelector('#learning-rate').value) || .08));
  statusElement.textContent = 'Training…';
  requestAnimationFrame(() => {
    const started = performance.now();
    train(epochs, rate);
    save();
    updateStats(epochs);
    renderPrediction();
    statusElement.textContent = `Trained in ${Math.round(performance.now() - started)} ms.`;
  });
});

document.querySelector('#reset-network').addEventListener('click', () => {
  model = freshModel();
  train(450, .08);
  save();
  updateStats(450);
  renderPrediction();
  statusElement.textContent = 'Weights reset and retrained.';
});

document.querySelector('#reset-all').addEventListener('click', () => {
  if (!window.confirm('Remove your examples and restore the starter training set?')) return;
  examples = starterExamples();
  model = freshModel();
  train(450, .08);
  save();
  updateStats(450);
  setGrid(new Array(INPUTS).fill(0));
  statusElement.textContent = 'Starter examples restored.';
});

document.querySelector('#connection-view').addEventListener('change', () => renderPrediction());
document.querySelector('#theme-toggle').addEventListener('click', event => {
  const next = document.documentElement.dataset.theme === 'light' ? 'dark' : 'light';
  document.documentElement.dataset.theme = next;
  try { localStorage.setItem('personal-wiki-theme', next); } catch (error) {}
  event.currentTarget.textContent = next === 'dark' ? '☀' : '☾';
  event.currentTarget.setAttribute('aria-label', `Switch to ${next === 'dark' ? 'light' : 'dark'} mode`);
  renderPrediction();
});

createGrid();
const restored = load();
const themeToggle = document.querySelector('#theme-toggle');
const initialTheme = document.documentElement.dataset.theme;
themeToggle.textContent = initialTheme === 'dark' ? '☀' : '☾';
themeToggle.setAttribute('aria-label', `Switch to ${initialTheme === 'dark' ? 'light' : 'dark'} mode`);
themeToggle.title = themeToggle.getAttribute('aria-label');
updateStats(restored ? null : 450);
renderPrediction();
