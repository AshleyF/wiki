const INPUTS = 25;
const STORAGE_VERSION = 4;
const MODE_KEY = 'neural-net-playground-mode';
const SHAPE_LABELS = ['square', 'circle', 'triangle'];
const GLYPH_LINES = {
  '0': ['01110', '10001', '10011', '10101', '01110'],
  '1': ['00100', '01100', '00100', '00100', '01110'],
  '2': ['01110', '10001', '00010', '00100', '11111'],
  '3': ['11110', '00001', '01110', '00001', '11110'],
  '4': ['00010', '00110', '01010', '11111', '00010'],
  '5': ['11111', '10000', '11110', '00001', '11110'],
  '6': ['01110', '10000', '11110', '10001', '01110'],
  '7': ['11111', '00010', '00100', '01000', '01000'],
  '8': ['01110', '10001', '01110', '10001', '01110'],
  '9': ['01110', '10001', '01111', '00001', '01110'],
  A: ['01110', '10001', '11111', '10001', '10001'],
  B: ['11110', '10001', '11110', '10001', '11110'],
  C: ['01111', '10000', '10000', '10000', '01111'],
  D: ['11110', '10001', '10001', '10001', '11110'],
  E: ['11111', '10000', '11110', '10000', '11111'],
  F: ['11111', '10000', '11110', '10000', '10000'],
  G: ['01111', '10000', '10111', '10001', '01110'],
  H: ['10001', '10001', '11111', '10001', '10001'],
  I: ['11111', '00100', '00100', '00100', '11111'],
  J: ['00111', '00010', '00010', '10010', '01100'],
  K: ['10001', '10010', '11100', '10010', '10001'],
  L: ['10000', '10000', '10000', '10000', '11111'],
  M: ['10001', '11011', '10101', '10001', '10001'],
  N: ['10001', '11001', '10101', '10011', '10001'],
  O: ['01110', '10001', '10001', '10001', '01110'],
  P: ['11110', '10001', '11110', '10000', '10000'],
  Q: ['01110', '10001', '10101', '10010', '01101'],
  R: ['11110', '10001', '11110', '10010', '10001'],
  S: ['01111', '10000', '01110', '00001', '11110'],
  T: ['11111', '00100', '00100', '00100', '00100'],
  U: ['10001', '10001', '10001', '10001', '01110'],
  V: ['10001', '10001', '10001', '01010', '00100'],
  W: ['10001', '10001', '10101', '11011', '10001'],
  X: ['10001', '01010', '00100', '01010', '10001'],
  Y: ['10001', '01010', '00100', '00100', '00100'],
  Z: ['11111', '00010', '00100', '01000', '11111']
};

const gridValues = new Array(INPUTS).fill(0);
const predictionLabel = document.querySelector('#prediction-label');
const predictionConfidence = document.querySelector('#prediction-confidence');
const outputBars = document.querySelector('#output-bars');
const statusElement = document.querySelector('#train-status');
const networkSvg = document.querySelector('#network');
const trainingSetElement = document.querySelector('#training-set');
const weightTooltip = document.querySelector('#weight-tooltip');
const labelActions = document.querySelector('#label-actions');
const modeSelect = document.querySelector('#recognizer-mode');
let currentMode = 'shapes';
let currentConfig;
let examples = [];
let model;
let painting = false;
let paintValue = 1;
let recentWeightChanges = null;
let trainingGeneration = 0;

function seededRandom(seed = 0x51a9e) {
  let state = seed >>> 0;
  return () => {
    state = (state * 1664525 + 1013904223) >>> 0;
    return state / 4294967296;
  };
}

const weightRandom = seededRandom();
const randWeight = fanIn => (weightRandom() * 2 - 1) * Math.sqrt(2 / fanIn);
const flatPattern = lines => lines.join('').split('').map(Number);

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

function shiftPattern(source, horizontal, vertical) {
  const result = new Array(INPUTS).fill(0);
  source.forEach((value, index) => {
    if (!value) return;
    const row = Math.floor(index / 5) + vertical;
    const column = index % 5 + horizontal;
    if (row >= 0 && row < 5 && column >= 0 && column < 5) result[row * 5 + column] = 1;
  });
  return result;
}

function shuffleWith(items, generator) {
  for (let index = items.length - 1; index > 0; index -= 1) {
    const other = Math.floor(generator() * (index + 1));
    [items[index], items[other]] = [items[other], items[index]];
  }
  return items;
}

function balancedExamples(patternSets, labels, perClass, seed) {
  const seeded = seededRandom(seed);
  const result = [];
  patternSets.forEach((patterns, classIndex) => {
    const unique = [...new Map(patterns.map(pattern => [pattern.join(''), pattern])).values()];
    shuffleWith(unique, seeded);
    const classExamples = unique.map(x => ({ x, y: classIndex, source: 'starter' }));
    let cursor = 0;
    while (classExamples.length < perClass) {
      const x = [...unique[cursor % unique.length]];
      const flips = seeded() < .78 ? 1 : 2;
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

function shapeExamples() {
  return balancedExamples([squarePatterns(), circlePatterns(), trianglePatterns()], SHAPE_LABELS, 96, 0xc1a551f1);
}

function glyphExamples(labels, perClass, seed) {
  const seeded = seededRandom(seed);
  const rawSets = labels.map(label => {
    const base = flatPattern(GLYPH_LINES[label]);
    const shifted = [];
    for (let vertical = -1; vertical <= 1; vertical += 1) {
      for (let horizontal = -1; horizontal <= 1; horizontal += 1) shifted.push(shiftPattern(base, horizontal, vertical));
    }
    return [...new Map(shifted.map(pattern => [pattern.join(''), pattern])).values()];
  });
  const owners = new Map();
  rawSets.forEach((patterns, classIndex) => patterns.forEach(pattern => {
    const key = pattern.join('');
    if (!owners.has(key)) owners.set(key, new Set());
    owners.get(key).add(classIndex);
  }));
  const patternSets = rawSets.map((patterns, classIndex) => patterns.filter(pattern => owners.get(pattern.join('')).size === 1));
  const used = new Map();
  const byClass = patternSets.map((patterns, classIndex) => {
    const selected = shuffleWith([...patterns], seeded).map(x => ({ x, y: classIndex, source: 'starter' }));
    selected.forEach(example => used.set(example.x.join(''), classIndex));
    return selected;
  });
  byClass.forEach((selected, classIndex) => {
    let attempts = 0;
    while (selected.length < perClass && attempts < perClass * 500) {
      attempts += 1;
      const source = patternSets[classIndex][Math.floor(seeded() * patternSets[classIndex].length)];
      const x = [...source];
      const flips = seeded() < .86 ? 1 : 2;
      for (let flip = 0; flip < flips; flip += 1) {
        const index = Math.floor(seeded() * INPUTS);
        x[index] = x[index] ? 0 : 1;
      }
      const key = x.join('');
      if (used.has(key)) continue;
      used.set(key, classIndex);
      selected.push({ x, y: classIndex, source: 'starter' });
    }
  });
  return byClass.flatMap(selected => selected.slice(0, perClass));
}

const CONFIGS = {
  shapes: {
    name: 'Shape recognizer network',
    labels: SHAPE_LABELS,
    layers: [25, 12, 3],
    epochs: 600,
    learningRate: .08,
    createExamples: shapeExamples
  },
  digits: {
    name: 'Digit recognizer network',
    labels: [...'0123456789'],
    layers: [25, 20, 14, 10],
    epochs: 300,
    learningRate: .065,
    createExamples: () => glyphExamples([...'0123456789'], 32, 0xd16175)
  },
  letters: {
    name: 'Letter recognizer network',
    labels: [...'ABCDEFGHIJKLMNOPQRSTUVWXYZ'],
    layers: [25, 28, 18, 26],
    epochs: 200,
    learningRate: .05,
    createExamples: () => glyphExamples([...'ABCDEFGHIJKLMNOPQRSTUVWXYZ'], 20, 0x1e77e25)
  }
};

function freshModel() {
  return {
    weights: currentConfig.layers.slice(1).map((size, layerIndex) => Array.from({ length: size }, () => Array.from({ length: currentConfig.layers[layerIndex] }, () => randWeight(currentConfig.layers[layerIndex])))),
    biases: currentConfig.layers.slice(1).map(size => new Array(size).fill(0))
  };
}

function softmax(logits) {
  const maximum = Math.max(...logits);
  const exponents = logits.map(value => Math.exp(value - maximum));
  const total = exponents.reduce((sum, value) => sum + value, 0);
  return exponents.map(value => value / total);
}

function forward(input, network = model) {
  const activations = [input];
  network.weights.forEach((matrix, layerIndex) => {
    const previous = activations[layerIndex];
    const values = matrix.map((weights, neuronIndex) => network.biases[layerIndex][neuronIndex] + weights.reduce((sum, weight, inputIndex) => sum + weight * previous[inputIndex], 0));
    activations.push(layerIndex === network.weights.length - 1 ? softmax(values) : values.map(Math.tanh));
  });
  return { activations, output: activations.at(-1) };
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
      const result = forward(example.x);
      let delta = result.output.map((probability, index) => probability - (index === example.y ? 1 : 0));
      for (let layerIndex = model.weights.length - 1; layerIndex >= 0; layerIndex -= 1) {
        const matrix = model.weights[layerIndex];
        const previousActivation = result.activations[layerIndex];
        let previousDelta = null;
        if (layerIndex > 0) {
          previousDelta = previousActivation.map((activation, inputIndex) => {
            const downstream = delta.reduce((sum, value, neuronIndex) => sum + matrix[neuronIndex][inputIndex] * value, 0);
            return downstream * (1 - activation * activation);
          });
        }
        matrix.forEach((weights, neuronIndex) => {
          weights.forEach((weight, inputIndex) => {
            weights[inputIndex] -= learningRate * delta[neuronIndex] * previousActivation[inputIndex];
          });
          model.biases[layerIndex][neuronIndex] -= learningRate * delta[neuronIndex];
        });
        delta = previousDelta;
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

function storageKey() {
  return `neural-net-playground-v${STORAGE_VERSION}-${currentMode}`;
}

function modelMatchesConfig(candidate) {
  return candidate?.weights?.length === currentConfig.layers.length - 1 && candidate.weights.every((matrix, layerIndex) => matrix.length === currentConfig.layers[layerIndex + 1] && matrix.every(row => row.length === currentConfig.layers[layerIndex]));
}

function save() {
  try { localStorage.setItem(storageKey(), JSON.stringify({ model, examples })); } catch (error) {}
}

function load() {
  try {
    const saved = JSON.parse(localStorage.getItem(storageKey()));
    if (modelMatchesConfig(saved?.model) && Array.isArray(saved.examples)) {
      model = saved.model;
      examples = saved.examples;
      return true;
    }
  } catch (error) {}
  examples = currentConfig.createExamples();
  model = freshModel();
  return false;
}

function snapshotWeights() {
  return model.weights.flat(2);
}

function recordWeightChanges(before) {
  const after = snapshotWeights();
  const deltas = after.map((weight, index) => Math.abs(weight - before[index]));
  const maximum = Math.max(1e-9, ...deltas);
  recentWeightChanges = deltas.map(delta => ({ delta, normalized: delta / maximum }));
}

function setPixel(index, value) {
  gridValues[index] = value;
}

function setGrid(next) {
  next.forEach((value, index) => setPixel(index, value));
  renderPrediction();
}

function displayLabel(label) {
  return SHAPE_LABELS.includes(label) ? `${label[0].toUpperCase()}${label.slice(1)}` : label;
}

function outputSymbol(label) {
  return { square: '□', circle: '○', triangle: '△' }[label] || label;
}

function formatProbability(value) {
  const percent = value * 100;
  if (percent > 0 && percent < .1) return '<0.1%';
  if (percent < 10) return `${percent.toFixed(1)}%`;
  return `${Math.round(percent)}%`;
}

function renderBars(output) {
  outputBars.innerHTML = '';
  const ranked = output.map((probability, index) => ({ probability, index })).sort((a, b) => b.probability - a.probability);
  const visible = currentConfig.labels.length > 10 ? ranked.slice(0, 5) : currentConfig.labels.length > 5 ? ranked.slice(0, 5) : output.map((probability, index) => ({ probability, index }));
  visible.forEach(({ probability, index }) => {
    const label = currentConfig.labels[index];
    const row = document.createElement('div');
    row.className = `output-row${index === ranked[0].index ? ' winner' : ''}`;
    row.setAttribute('aria-label', `${displayLabel(label)}: ${formatProbability(probability)}`);
    row.innerHTML = `<span>${displayLabel(label)}</span><span class="bar-track"><i class="bar-fill" style="width:${(probability * 100).toFixed(2)}%"></i></span><output>${formatProbability(probability)}</output>`;
    outputBars.append(row);
  });
}

function renderPrediction() {
  const active = gridValues.some(Boolean);
  const result = forward(gridValues);
  const winner = result.output.indexOf(Math.max(...result.output));
  predictionLabel.textContent = active ? displayLabel(currentConfig.labels[winner]) : '—';
  predictionLabel.setAttribute('aria-label', active ? displayLabel(currentConfig.labels[winner]) : 'No prediction');
  predictionConfidence.textContent = active ? `${formatProbability(result.output[winner])} confidence` : 'Draw something';
  renderBars(result.output);
  renderNetwork(result);
}

const svgElement = (name, attributes = {}) => {
  const element = document.createElementNS('http://www.w3.org/2000/svg', name);
  Object.entries(attributes).forEach(([key, value]) => element.setAttribute(key, value));
  return element;
};

function networkPositions() {
  const layers = [];
  layers.push(Array.from({ length: INPUTS }, (_, index) => ({ x: 55 + (index % 5) * 62, y: 65 + Math.floor(index / 5) * 65 })));
  const remaining = currentConfig.layers.length - 1;
  for (let layerIndex = 1; layerIndex < currentConfig.layers.length; layerIndex += 1) {
    const count = currentConfig.layers[layerIndex];
    const x = remaining === 2 ? (layerIndex === 1 ? 500 : 700) : 385 + (layerIndex - 1) * 157;
    const minimumY = 45;
    const maximumY = 405;
    const gap = count > 1 ? (maximumY - minimumY) / (count - 1) : 0;
    layers.push(Array.from({ length: count }, (_, index) => ({ x, y: minimumY + index * gap })));
  }
  return layers;
}

function activationColor(value, output = false) {
  const amount = Math.min(1, Math.abs(value));
  const color = output || value >= 0 ? 'var(--positive)' : 'var(--negative)';
  return `color-mix(in srgb, ${color} ${Math.round(amount * 88)}%, var(--panel-2))`;
}

function layerName(index) {
  if (index === 0) return 'Input';
  if (index === currentConfig.layers.length - 1) return 'Output';
  return `Hidden ${index}`;
}

function connectionLabel(layerIndex, inputIndex, outputIndex) {
  const from = layerIndex === 0 ? `Pixel ${Math.floor(inputIndex / 5) + 1},${(inputIndex % 5) + 1}` : `${layerName(layerIndex)} neuron ${inputIndex + 1}`;
  const to = layerIndex + 1 === currentConfig.layers.length - 1 ? displayLabel(currentConfig.labels[outputIndex]) : `${layerName(layerIndex + 1)} neuron ${outputIndex + 1}`;
  return `${from} → ${to}`;
}

function renderNetwork(result = forward(gridValues)) {
  networkSvg.innerHTML = '';
  const positions = networkPositions();
  const allWeights = model.weights.flat(2).map(Math.abs);
  const scale = Math.max(.001, ...allWeights);
  const connectionGroup = svgElement('g');
  let changeIndex = 0;

  model.weights.forEach((matrix, layerIndex) => matrix.forEach((row, outputIndex) => row.forEach((weight, inputIndex) => {
    const change = recentWeightChanges?.[changeIndex] || null;
    changeIndex += 1;
    const strength = Math.abs(weight) / scale;
    const activity = result.activations[layerIndex][inputIndex];
    const label = connectionLabel(layerIndex, inputIndex, outputIndex);
    const line = svgElement('line', {
      x1: positions[layerIndex][inputIndex].x,
      y1: positions[layerIndex][inputIndex].y,
      x2: positions[layerIndex + 1][outputIndex].x,
      y2: positions[layerIndex + 1][outputIndex].y,
      class: `connection${change?.normalized > .16 ? ' learned' : ''}`,
      stroke: weight >= 0 ? 'var(--positive)' : 'var(--negative)',
      'stroke-width': (.28 + strength * 4.1).toFixed(2),
      opacity: (.04 + strength * .34 + Math.min(1, Math.abs(activity)) * .23).toFixed(2),
      'data-connection-label': label,
      'data-weight': weight.toFixed(6),
      'data-delta': change ? change.delta.toFixed(6) : ''
    });
    const title = svgElement('title');
    title.textContent = `${label}: ${weight >= 0 ? '+' : ''}${weight.toFixed(4)}`;
    line.append(title);
    connectionGroup.append(line);
  })));
  networkSvg.append(connectionGroup);

  positions[0].forEach((position, index) => {
    const size = 42;
    const pixel = svgElement('rect', {
      x: position.x - size / 2,
      y: position.y - size / 2,
      width: size,
      height: size,
      rx: 5,
      class: 'input-pixel',
      fill: gridValues[index] ? 'var(--text)' : 'var(--panel-2)',
      'data-input-index': index,
      'data-on': String(Boolean(gridValues[index])),
      role: 'checkbox',
      tabindex: 0,
      'aria-checked': String(Boolean(gridValues[index])),
      'aria-label': `Input row ${Math.floor(index / 5) + 1}, column ${(index % 5) + 1}`
    });
    networkSvg.append(pixel);
  });

  for (let layerIndex = 1; layerIndex < positions.length; layerIndex += 1) {
    const count = positions[layerIndex].length;
    const isOutput = layerIndex === positions.length - 1;
    const radius = count > 24 ? 5.5 : count > 16 ? 7 : count > 12 ? 9 : 13;
    positions[layerIndex].forEach((position, index) => {
      const activation = result.activations[layerIndex][index];
      const circle = svgElement('circle', { cx: position.x, cy: position.y, r: radius, class: 'neuron', fill: activationColor(activation, isOutput) });
      const title = svgElement('title');
      title.textContent = `${isOutput ? displayLabel(currentConfig.labels[index]) : `${layerName(layerIndex)} neuron ${index + 1}`} activation: ${activation.toFixed(4)}`;
      circle.append(title);
      networkSvg.append(circle);
      if (!isOutput && count <= 14) {
        const value = svgElement('text', { x: position.x + radius + 5, y: position.y, class: `hidden-activation ${activation >= 0 ? 'positive' : 'negative'}` });
        value.textContent = `${activation >= 0 ? '+' : '−'}${Math.abs(activation).toFixed(2)}`;
        networkSvg.append(value);
      }
      if (isOutput) {
        const symbol = svgElement('text', { x: position.x + radius + 8, y: position.y, class: `output-symbol${count > 14 ? ' compact' : ''}` });
        symbol.textContent = outputSymbol(currentConfig.labels[index]);
        networkSvg.append(symbol);
        if (count <= 10) {
          const text = svgElement('text', { x: position.x + radius + 30, y: position.y, class: 'neuron-label' });
          text.textContent = formatProbability(activation);
          networkSvg.append(text);
        }
      }
    });
  }

  positions.forEach((layer, index) => {
    const text = svgElement('text', { x: layer[0].x, y: 27, class: 'layer-label' });
    text.textContent = index === 0 ? 'DRAW HERE · 5×5 INPUT' : `${currentConfig.layers[index]} ${layerName(index).toUpperCase()}`;
    networkSvg.append(text);
  });
}

function updateStats(lastEpochs = null) {
  const summary = metrics();
  document.querySelector('#example-count').textContent = String(examples.length);
  document.querySelector('#accuracy').textContent = `${Math.round(summary.accuracy * 100)}%`;
  document.querySelector('#loss').textContent = summary.loss.toFixed(4);
  if (lastEpochs !== null) document.querySelector('#last-epochs').textContent = String(lastEpochs);
  document.querySelector('#class-counts').textContent = currentConfig.labels.map((label, index) => `${displayLabel(label)}: ${examples.filter(example => example.y === index).length}`).join(' · ');
}

function rebuildExampleFilter() {
  const filter = document.querySelector('#example-filter');
  filter.innerHTML = '<option value="all">Everything</option><option value="user">My examples</option>';
  currentConfig.labels.forEach(label => {
    const option = document.createElement('option');
    option.value = label;
    option.textContent = displayLabel(label);
    filter.append(option);
  });
}

function renderTrainingSet() {
  const filter = document.querySelector('#example-filter').value;
  const visible = examples
    .map((example, index) => ({ example, index }))
    .filter(({ example }) => filter === 'all' || (filter === 'user' ? example.source === 'user' : currentConfig.labels[example.y] === filter));
  trainingSetElement.innerHTML = '';
  if (!visible.length) {
    const empty = document.createElement('p');
    empty.className = 'empty-examples';
    empty.textContent = 'No examples in this group yet.';
    trainingSetElement.append(empty);
    return;
  }
  const displayLimit = 200;
  visible.slice(0, displayLimit).forEach(({ example, index }) => {
    const card = document.createElement('button');
    card.type = 'button';
    card.className = 'example-card';
    card.dataset.exampleIndex = String(index);
    card.setAttribute('aria-label', `Load ${displayLabel(currentConfig.labels[example.y])} training example ${index + 1}`);
    const miniGrid = document.createElement('span');
    miniGrid.className = 'mini-grid';
    example.x.forEach(value => {
      const pixel = document.createElement('i');
      if (value) pixel.className = 'on';
      miniGrid.append(pixel);
    });
    const meta = document.createElement('span');
    meta.className = 'example-meta';
    meta.innerHTML = `<strong>${displayLabel(currentConfig.labels[example.y])}</strong><small>${example.source === 'user' ? 'mine' : 'starter'}</small>`;
    card.append(miniGrid, meta);
    trainingSetElement.append(card);
  });
  if (visible.length > displayLimit) {
    const note = document.createElement('p');
    note.className = 'empty-examples';
    note.textContent = `Showing ${displayLimit} of ${visible.length}. Filter by class to inspect the rest.`;
    trainingSetElement.append(note);
  }
}

function addExample(label) {
  if (!gridValues.some(Boolean)) {
    statusElement.textContent = 'Draw something before labeling it.';
    return;
  }
  examples.push({ x: [...gridValues], y: currentConfig.labels.indexOf(label), source: 'user' });
  const epochs = Math.min(80, currentConfig.epochs);
  train(epochs, Number(document.querySelector('#learning-rate').value) || currentConfig.learningRate);
  save();
  updateStats(epochs);
  renderTrainingSet();
  renderPrediction();
  statusElement.textContent = `Added and learned ${displayLabel(label)}.`;
}

function rebuildLabelActions() {
  labelActions.innerHTML = '<span>Teach it:</span>';
  if (currentConfig.labels.length <= 10) {
    currentConfig.labels.forEach(label => {
      const button = document.createElement('button');
      button.type = 'button';
      button.dataset.label = label;
      button.innerHTML = currentMode === 'shapes' ? `<span aria-hidden="true">${outputSymbol(label)}</span> ${displayLabel(label)}` : displayLabel(label);
      labelActions.append(button);
    });
  } else {
    const select = document.createElement('select');
    select.id = 'teach-label';
    currentConfig.labels.forEach(label => select.add(new Option(displayLabel(label), label)));
    const button = document.createElement('button');
    button.type = 'button';
    button.id = 'teach-selected';
    button.textContent = 'Add example';
    labelActions.append(select, button);
  }
}

function updateModeUi() {
  document.querySelector('#network-title').textContent = currentConfig.name;
  document.querySelector('#architecture-label').textContent = currentConfig.layers.join(' → ');
  document.querySelector('#epochs').value = String(currentConfig.epochs);
  document.querySelector('#learning-rate').value = String(currentConfig.learningRate);
  document.querySelector('#last-epochs').textContent = '—';
  rebuildExampleFilter();
  rebuildLabelActions();
}

function autoTrain(generation) {
  const epochs = currentConfig.epochs;
  const rate = currentConfig.learningRate;
  const mode = currentMode;
  statusElement.textContent = `Auto-training ${epochs} epochs…`;
  requestAnimationFrame(() => {
    if (generation !== trainingGeneration || mode !== currentMode) return;
    const started = performance.now();
    const beforeAccuracy = metrics().accuracy;
    train(epochs, rate);
    const afterAccuracy = metrics().accuracy;
    save();
    updateStats(epochs);
    renderPrediction();
    statusElement.textContent = `Auto-trained ${epochs} epochs · ${Math.round(beforeAccuracy * 100)}% → ${Math.round(afterAccuracy * 100)}% · ${Math.round(performance.now() - started)} ms`;
  });
}

function switchMode(mode) {
  trainingGeneration += 1;
  currentMode = CONFIGS[mode] ? mode : 'shapes';
  currentConfig = CONFIGS[currentMode];
  modeSelect.value = currentMode;
  gridValues.fill(0);
  recentWeightChanges = null;
  weightTooltip.hidden = true;
  load();
  updateModeUi();
  updateStats();
  renderPrediction();
  renderTrainingSet();
  try {
    localStorage.setItem(MODE_KEY, currentMode);
  } catch (error) {}
  autoTrain(trainingGeneration);
}

networkSvg.addEventListener('pointerdown', event => {
  const cell = event.target.closest('.input-pixel');
  if (!cell) return;
  event.preventDefault();
  painting = true;
  paintValue = gridValues[Number(cell.dataset.inputIndex)] ? 0 : 1;
  setPixel(Number(cell.dataset.inputIndex), paintValue);
  renderPrediction();
});
networkSvg.addEventListener('pointermove', event => {
  if (painting) {
    event.preventDefault();
    const target = document.elementFromPoint(event.clientX, event.clientY);
    const cell = target?.closest?.('.input-pixel');
    if (cell && networkSvg.contains(cell)) {
      setPixel(Number(cell.dataset.inputIndex), paintValue);
      renderPrediction();
    }
  }
  const connection = event.target.closest('.connection');
  if (!connection) {
    weightTooltip.hidden = true;
    return;
  }
  const weight = Number(connection.dataset.weight);
  const delta = Number(connection.dataset.delta);
  weightTooltip.textContent = `${connection.dataset.connectionLabel}\nWeight ${weight >= 0 ? '+' : ''}${weight.toFixed(4)} · ${weight >= 0 ? 'Positive contribution' : 'Negative contribution'}${delta ? `\nLast training change Δ ${delta.toFixed(4)}` : ''}`;
  weightTooltip.hidden = false;
  const bounds = weightTooltip.getBoundingClientRect();
  weightTooltip.style.left = `${Math.max(8, Math.min(window.innerWidth - bounds.width - 8, event.clientX + 14))}px`;
  weightTooltip.style.top = `${Math.max(8, Math.min(window.innerHeight - bounds.height - 8, event.clientY + 14))}px`;
});
networkSvg.addEventListener('keydown', event => {
  if (!['Enter', ' '].includes(event.key)) return;
  const cell = event.target.closest('.input-pixel');
  if (!cell) return;
  event.preventDefault();
  const index = Number(cell.dataset.inputIndex);
  setPixel(index, gridValues[index] ? 0 : 1);
  renderPrediction();
});
networkSvg.addEventListener('pointerleave', () => { weightTooltip.hidden = true; });
window.addEventListener('pointerup', () => { painting = false; });
window.addEventListener('pointercancel', () => { painting = false; });

document.querySelector('#clear-grid').addEventListener('click', () => setGrid(new Array(INPUTS).fill(0)));
labelActions.addEventListener('click', event => {
  const direct = event.target.closest('[data-label]');
  if (direct) addExample(direct.dataset.label);
  else if (event.target.closest('#teach-selected')) addExample(document.querySelector('#teach-label').value);
});
document.querySelector('#train').addEventListener('click', () => {
  const epochs = Math.max(1, Math.min(5000, Number(document.querySelector('#epochs').value) || currentConfig.epochs));
  const rate = Math.max(.001, Math.min(1, Number(document.querySelector('#learning-rate').value) || currentConfig.learningRate));
  const generation = trainingGeneration;
  statusElement.textContent = 'Training…';
  requestAnimationFrame(() => {
    if (generation !== trainingGeneration) return;
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
  if (!window.confirm(`Remove your ${currentConfig.name.toLowerCase()} examples and restore its starter training set?`)) return;
  examples = currentConfig.createExamples();
  model = freshModel();
  train(currentConfig.epochs, currentConfig.learningRate);
  save();
  updateStats(currentConfig.epochs);
  renderTrainingSet();
  setGrid(new Array(INPUTS).fill(0));
  statusElement.textContent = 'Starter examples restored and trained.';
});
modeSelect.addEventListener('change', () => switchMode(modeSelect.value));
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

const themeToggle = document.querySelector('#theme-toggle');
const initialTheme = document.documentElement.dataset.theme;
themeToggle.textContent = initialTheme === 'dark' ? '☀' : '☾';
themeToggle.setAttribute('aria-label', `Switch to ${initialTheme === 'dark' ? 'light' : 'dark'} mode`);
themeToggle.title = themeToggle.getAttribute('aria-label');
try { currentMode = localStorage.getItem(MODE_KEY) || 'shapes'; } catch (error) {}
switchMode(currentMode);
