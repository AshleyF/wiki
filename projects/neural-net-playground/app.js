const SHAPES = ['square', 'circle', 'triangle'];
const INPUTS = 25;
const HIDDEN = 12;
const STORAGE_KEY = 'neural-net-playground-v2';

const predictionLabel = document.querySelector('#prediction-label');
const predictionConfidence = document.querySelector('#prediction-confidence');
const outputBars = document.querySelector('#output-bars');
const statusElement = document.querySelector('#train-status');
const networkSvg = document.querySelector('#network');
const trainingSetElement = document.querySelector('#training-set');
const weightTooltip = document.querySelector('#weight-tooltip');
const values = new Array(INPUTS).fill(0);
let examples = [];
let model;
let painting = false;
let paintValue = 1;
let recentWeightChanges = null;

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

function snapshotWeights() {
  return [...model.w1.flat(), ...model.w2.flat()];
}

function recordWeightChanges(before) {
  const after = snapshotWeights();
  const deltas = after.map((weight, index) => Math.abs(weight - before[index]));
  const maximum = Math.max(1e-9, ...deltas);
  recentWeightChanges = deltas.map(delta => ({ delta, normalized: delta / maximum }));
}

function template(lines) {
  return lines.map(line => [...line].map(Number));
}

function placeTemplate(source, top, left) {
  const result = new Array(INPUTS).fill(0);
  source.forEach((row, rowIndex) => row.forEach((value, columnIndex) => {
    if (value) result[(top + rowIndex) * 5 + left + columnIndex] = 1;
  }));
  return result;
}

function rotateTemplate(source) {
  return source[0].map((_, column) => source.map(row => row[column]).reverse());
}

function placements(source) {
  const results = [];
  for (let top = 0; top <= 5 - source.length; top += 1) {
    for (let left = 0; left <= 5 - source[0].length; left += 1) results.push(placeTemplate(source, top, left));
  }
  return results;
}

function squarePatterns() {
  const results = [];
  for (let size = 3; size <= 5; size += 1) {
    const outline = Array.from({ length: size }, (_, row) => Array.from({ length: size }, (_, column) => Number(row === 0 || column === 0 || row === size - 1 || column === size - 1)));
    const filled = Array.from({ length: size }, () => new Array(size).fill(1));
    results.push(...placements(outline), ...placements(filled));
  }
  return results;
}

function circlePatterns() {
  const forms = [
    [template(['010', '101', '010']), template(['010', '111', '010'])],
    [template(['0110', '1001', '1001', '0110']), template(['0110', '1111', '1111', '0110'])],
    [template(['01110', '10001', '10001', '10001', '01110']), template(['01110', '11111', '11111', '11111', '01110'])]
  ];
  return forms.flatMap(([outline, filled]) => [...placements(outline), ...placements(filled)]);
}

function trianglePatterns() {
  const forms = [
    [template(['010', '101', '111']), template(['010', '111', '111'])],
    [template(['0010', '0101', '1001', '1111']), template(['0010', '0111', '1111', '1111'])],
    [template(['00100', '01010', '10001', '11111', '00000']), template(['00100', '01110', '11111', '11111', '00000'])]
  ];
  const results = [];
  forms.forEach(pair => pair.forEach(original => {
    let rotated = original;
    for (let turn = 0; turn < 4; turn += 1) {
      results.push(...placements(rotated));
      rotated = rotateTemplate(rotated);
    }
  }));
  return results;
}

function shuffleWith(items, generator) {
  for (let index = items.length - 1; index > 0; index -= 1) {
    const other = Math.floor(generator() * (index + 1));
    [items[index], items[other]] = [items[other], items[index]];
  }
  return items;
}

function starterExamples() {
  const seeded = seededRandom(0xc1a551f1);
  const patternSets = [squarePatterns(), circlePatterns(), trianglePatterns()];
  const perClass = 96;
  const result = [];
  patternSets.forEach((patterns, classIndex) => {
    const unique = [...new Map(patterns.map(pattern => [pattern.join(''), pattern])).values()];
    shuffleWith(unique, seeded);
    const classExamples = unique.map(x => ({ x, y: classIndex, source: 'starter' }));
    let cursor = 0;
    while (classExamples.length < perClass) {
      const x = [...unique[cursor % unique.length]];
      const flips = seeded() < .7 ? 1 : 2;
      for (let flip = 0; flip < flips; flip += 1) {
        const index = Math.floor(seeded() * INPUTS);
        x[index] = x[index] ? 0 : 1;
      }
      classExamples.push({ x, y: classIndex, source: 'starter' });
      cursor += 1;
    }
    result.push(...classExamples.slice(0, perClass));
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
  return false;
}

function setPixel(index, value) {
  values[index] = value;
}

function setGrid(next) {
  next.forEach((value, index) => setPixel(index, value));
  renderPrediction();
}

function formatProbability(value) {
  const percent = value * 100;
  if (percent > 0 && percent < .1) return '<0.1%';
  if (percent < 10) return `${percent.toFixed(1)}%`;
  return `${Math.round(percent)}%`;
}

function renderBars(output) {
  outputBars.innerHTML = '';
  const winner = output.indexOf(Math.max(...output));
  SHAPES.forEach((shape, index) => {
    const row = document.createElement('div');
    row.className = `output-row${index === winner ? ' winner' : ''}`;
    row.setAttribute('aria-label', `${shape}: ${formatProbability(output[index])}`);
    row.innerHTML = `<span>${shape}</span><span class="bar-track"><i class="bar-fill" style="width:${(output[index] * 100).toFixed(2)}%"></i></span><output>${formatProbability(output[index])}</output>`;
    outputBars.append(row);
  });
}

function renderPrediction() {
  const active = values.some(Boolean);
  const result = forward(values);
  const winner = result.output.indexOf(Math.max(...result.output));
  predictionLabel.textContent = active ? SHAPES[winner] : '—';
  predictionLabel.setAttribute('aria-label', active ? SHAPES[winner] : 'No prediction');
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
  const inputs = Array.from({ length: INPUTS }, (_, index) => ({ x: 55 + (index % 5) * 62, y: 65 + Math.floor(index / 5) * 65 }));
  const hidden = Array.from({ length: HIDDEN }, (_, index) => ({ x: 500, y: 45 + index * 29 }));
  const output = Array.from({ length: 3 }, (_, index) => ({ x: 700, y: 125 + index * 95 }));
  return { inputs, hidden, output };
}

function activationColor(value, output = false) {
  const amount = Math.min(1, Math.abs(value));
  const color = output || value >= 0 ? 'var(--positive)' : 'var(--negative)';
  return `color-mix(in srgb, ${color} ${Math.round(amount * 88)}%, var(--panel-2))`;
}

function renderNetwork(result = forward(values)) {
  networkSvg.innerHTML = '';
  const positions = neuronPositions();
  const allWeights = [...model.w1.flat(), ...model.w2.flat()].map(Math.abs);
  const scale = Math.max(.001, ...allWeights);
  const connectionGroup = svgElement('g');
  let connectionIndex = 0;

  const addConnection = (from, to, weight, label, activity = 0) => {
    const change = recentWeightChanges?.[connectionIndex] || null;
    connectionIndex += 1;
    const strength = Math.abs(weight) / scale;
    const line = svgElement('line', {
      x1: from.x, y1: from.y, x2: to.x, y2: to.y,
      class: `connection${change?.normalized > .16 ? ' learned' : ''}`,
      stroke: weight >= 0 ? 'var(--positive)' : 'var(--negative)',
      'stroke-width': (.35 + strength * 4.3).toFixed(2),
      opacity: (.055 + strength * .38 + Math.min(1, Math.abs(activity)) * .28).toFixed(2),
      'data-connection-label': label,
      'data-weight': weight.toFixed(6),
      'data-delta': change ? change.delta.toFixed(6) : ''
    });
    const title = svgElement('title');
    title.textContent = `${label}: ${weight >= 0 ? '+' : ''}${weight.toFixed(4)}${change ? ` · Δ ${change.delta.toFixed(4)}` : ''}`;
    line.append(title);
    connectionGroup.append(line);
  };

  model.w1.forEach((row, hiddenIndex) => row.forEach((weight, inputIndex) => addConnection(positions.inputs[inputIndex], positions.hidden[hiddenIndex], weight, `Pixel ${Math.floor(inputIndex / 5) + 1},${(inputIndex % 5) + 1} → Hidden ${hiddenIndex + 1}`, values[inputIndex])));
  model.w2.forEach((row, outputIndex) => row.forEach((weight, hiddenIndex) => addConnection(positions.hidden[hiddenIndex], positions.output[outputIndex], weight, `Hidden ${hiddenIndex + 1} → ${SHAPES[outputIndex]}`, result.hidden[hiddenIndex])));
  networkSvg.append(connectionGroup);

  const addNeuron = (position, activation, label, radius = 13, isOutput = false) => {
    const circle = svgElement('circle', { cx: position.x, cy: position.y, r: radius, class: 'neuron', fill: activationColor(activation, isOutput) });
    const title = svgElement('title');
    title.textContent = `${label} activation: ${activation.toFixed(4)}`;
    circle.append(title);
    networkSvg.append(circle);
  };
  positions.inputs.forEach((position, index) => {
    const size = 42;
    const pixel = svgElement('rect', {
      x: position.x - size / 2,
      y: position.y - size / 2,
      width: size,
      height: size,
      rx: 5,
      class: 'input-pixel',
      fill: values[index] ? 'var(--text)' : 'var(--panel-2)',
      'data-input-index': index,
      'data-on': String(Boolean(values[index])),
      role: 'checkbox',
      tabindex: 0,
      'aria-checked': String(Boolean(values[index])),
      'aria-label': `Input row ${Math.floor(index / 5) + 1}, column ${(index % 5) + 1}`
    });
    const title = svgElement('title');
    title.textContent = `Input ${index + 1}: ${values[index] ? 'on' : 'off'}`;
    pixel.append(title);
    networkSvg.append(pixel);
  });
  positions.hidden.forEach((position, index) => {
    const activation = result.hidden[index];
    addNeuron(position, activation, `Hidden ${index + 1}`, 13);
    const value = svgElement('text', {
      x: position.x + 19,
      y: position.y,
      class: `hidden-activation ${activation >= 0 ? 'positive' : 'negative'}`
    });
    value.textContent = `${activation >= 0 ? '+' : '−'}${Math.abs(activation).toFixed(2)}`;
    networkSvg.append(value);
  });
  positions.output.forEach((position, index) => {
    addNeuron(position, result.output[index], SHAPES[index], 21, true);
    const symbol = svgElement('text', { x: position.x + 31, y: position.y, class: 'output-symbol' });
    symbol.textContent = { square: '□', circle: '○', triangle: '△' }[SHAPES[index]];
    networkSvg.append(symbol);
    const text = svgElement('text', { x: position.x + 54, y: position.y, class: 'neuron-label' });
    text.textContent = formatProbability(result.output[index]);
    networkSvg.append(text);
  });
  [['DRAW HERE · 5×5 INPUT', 179], ['12 HIDDEN', 500], ['3 OUTPUT', 700]].forEach(([label, x]) => {
    const text = svgElement('text', { x, y: 27, class: 'layer-label' });
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

function renderTrainingSet() {
  const filter = document.querySelector('#example-filter').value;
  const visible = examples
    .map((example, index) => ({ example, index }))
    .filter(({ example }) => filter === 'all' || (filter === 'user' ? example.source === 'user' : SHAPES[example.y] === filter));
  trainingSetElement.innerHTML = '';
  if (!visible.length) {
    const empty = document.createElement('p');
    empty.className = 'empty-examples';
    empty.textContent = 'No examples in this group yet.';
    trainingSetElement.append(empty);
    return;
  }
  visible.forEach(({ example, index }) => {
    const card = document.createElement('button');
    card.type = 'button';
    card.className = 'example-card';
    card.dataset.exampleIndex = String(index);
    card.setAttribute('aria-label', `Load ${SHAPES[example.y]} training example ${index + 1}`);
    const miniGrid = document.createElement('span');
    miniGrid.className = 'mini-grid';
    example.x.forEach(value => {
      const pixel = document.createElement('i');
      if (value) pixel.className = 'on';
      miniGrid.append(pixel);
    });
    const meta = document.createElement('span');
    meta.className = 'example-meta';
    meta.innerHTML = `<strong>${SHAPES[example.y]}</strong><small>${example.source === 'user' ? 'mine' : 'starter'}</small>`;
    card.append(miniGrid, meta);
    trainingSetElement.append(card);
  });
}

networkSvg.addEventListener('pointerdown', event => {
  const cell = event.target.closest('.input-pixel');
  if (!cell) return;
  event.preventDefault();
  painting = true;
  paintValue = values[Number(cell.dataset.inputIndex)] ? 0 : 1;
  setPixel(Number(cell.dataset.inputIndex), paintValue);
  renderPrediction();
});
networkSvg.addEventListener('pointermove', event => {
  if (!painting) return;
  event.preventDefault();
  const target = document.elementFromPoint(event.clientX, event.clientY);
  const cell = target?.closest?.('.input-pixel');
  if (!cell || !networkSvg.contains(cell)) return;
  setPixel(Number(cell.dataset.inputIndex), paintValue);
  renderPrediction();
});
networkSvg.addEventListener('keydown', event => {
  if (!['Enter', ' '].includes(event.key)) return;
  const cell = event.target.closest('.input-pixel');
  if (!cell) return;
  event.preventDefault();
  const index = Number(cell.dataset.inputIndex);
  setPixel(index, values[index] ? 0 : 1);
  renderPrediction();
});
networkSvg.addEventListener('pointermove', event => {
  const connection = event.target.closest('.connection');
  if (!connection) {
    weightTooltip.hidden = true;
    return;
  }
  const weight = Number(connection.dataset.weight);
  const delta = Number(connection.dataset.delta);
  const sign = weight >= 0 ? 'Positive contribution' : 'Negative contribution';
  weightTooltip.textContent = `${connection.dataset.connectionLabel}\nWeight ${weight >= 0 ? '+' : ''}${weight.toFixed(4)} · ${sign}${delta ? `\nLast training change Δ ${delta.toFixed(4)}` : ''}`;
  weightTooltip.hidden = false;
  const bounds = weightTooltip.getBoundingClientRect();
  weightTooltip.style.left = `${Math.max(8, Math.min(window.innerWidth - bounds.width - 8, event.clientX + 14))}px`;
  weightTooltip.style.top = `${Math.max(8, Math.min(window.innerHeight - bounds.height - 8, event.clientY + 14))}px`;
});
networkSvg.addEventListener('pointerleave', () => { weightTooltip.hidden = true; });
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
  train(80, Number(document.querySelector('#learning-rate').value) || .08);
  save();
  updateStats(80);
  renderTrainingSet();
  renderPrediction();
  statusElement.textContent = `Added and learned one ${label}.`;
}));

document.querySelector('#train').addEventListener('click', () => {
  const epochs = Math.max(1, Math.min(5000, Number(document.querySelector('#epochs').value) || 600));
  const rate = Math.max(.001, Math.min(1, Number(document.querySelector('#learning-rate').value) || .08));
  statusElement.textContent = 'Training…';
  requestAnimationFrame(() => {
    const started = performance.now();
    const beforeAccuracy = metrics().accuracy;
    const beforeWeights = snapshotWeights();
    train(epochs, rate);
    recordWeightChanges(beforeWeights);
    const afterAccuracy = metrics().accuracy;
    save();
    updateStats(epochs);
    renderPrediction();
    recentWeightChanges = null;
    statusElement.textContent = `Trained ${epochs} epochs · ${Math.round(beforeAccuracy * 100)}% → ${Math.round(afterAccuracy * 100)}% · ${Math.round(performance.now() - started)} ms`;
  });
});

document.querySelector('#randomize-weights').addEventListener('click', () => {
  model = freshModel();
  recentWeightChanges = null;
  save();
  updateStats();
  document.querySelector('#last-epochs').textContent = '—';
  renderPrediction();
  statusElement.textContent = 'Weights randomized · ready to train.';
});

document.querySelector('#reset-all').addEventListener('click', () => {
  if (!window.confirm('Remove your examples and restore the starter training set?')) return;
  examples = starterExamples();
  model = freshModel();
  train(600, .08);
  save();
  updateStats(600);
  renderTrainingSet();
  setGrid(new Array(INPUTS).fill(0));
  statusElement.textContent = 'Starter examples restored.';
});

document.querySelector('#example-filter').addEventListener('change', renderTrainingSet);
trainingSetElement.addEventListener('click', event => {
  const card = event.target.closest('.example-card');
  if (!card) return;
  const example = examples[Number(card.dataset.exampleIndex)];
  if (example) setGrid([...example.x]);
});
document.querySelector('#theme-toggle').addEventListener('click', event => {
  const next = document.documentElement.dataset.theme === 'light' ? 'dark' : 'light';
  document.documentElement.dataset.theme = next;
  try { localStorage.setItem('personal-wiki-theme', next); } catch (error) {}
  event.currentTarget.textContent = next === 'dark' ? '☀' : '☾';
  event.currentTarget.setAttribute('aria-label', `Switch to ${next === 'dark' ? 'light' : 'dark'} mode`);
  renderPrediction();
});

load();
const themeToggle = document.querySelector('#theme-toggle');
const initialTheme = document.documentElement.dataset.theme;
themeToggle.textContent = initialTheme === 'dark' ? '☀' : '☾';
themeToggle.setAttribute('aria-label', `Switch to ${initialTheme === 'dark' ? 'light' : 'dark'} mode`);
themeToggle.title = themeToggle.getAttribute('aria-label');
updateStats();
renderPrediction();
renderTrainingSet();

const automaticEpochs = 600;
statusElement.textContent = `Auto-training ${automaticEpochs} epochs…`;
requestAnimationFrame(() => {
  const started = performance.now();
  const beforeAccuracy = metrics().accuracy;
  train(automaticEpochs, .08);
  const afterAccuracy = metrics().accuracy;
  save();
  updateStats(automaticEpochs);
  renderPrediction();
  statusElement.textContent = `Auto-trained ${automaticEpochs} epochs · ${Math.round(beforeAccuracy * 100)}% → ${Math.round(afterAccuracy * 100)}% · ${Math.round(performance.now() - started)} ms`;
});
