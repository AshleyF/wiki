const $ = (selector) => document.querySelector(selector);

const THEME_KEY = 'personal-wiki-theme';
const PATTERN_KEY = 'drum-groove-explorer-pattern-v1';
const SETTINGS_KEY = 'drum-groove-explorer-settings-v1';

const instruments = [
  { id: 'cr2', label: 'Crash 2', key: 'c/6/X2', family: 'cymbal', pan: .55, states: ['off', 'hit', 'accent'] },
  { id: 'cr1', label: 'Crash 1', key: 'b/5/X2', family: 'cymbal', pan: -.45, states: ['off', 'hit', 'accent'] },
  { id: 'china', label: 'China', key: 'a/5/X2', family: 'cymbal', pan: .35, states: ['off', 'hit', 'accent'] },
  { id: 'ride', label: 'Ride', key: 'g/5/X2', family: 'ride', pan: .45, states: ['off', 'hit', 'accent'] },
  { id: 'cowbell', label: 'Cowbell', key: 'f/5/X2', family: 'cowbell', pan: .2, states: ['off', 'hit', 'accent'] },
  { id: 'hh', label: 'Hi-hat', key: 'f/5/X2', family: 'hat', pan: -.35, states: ['off', 'closed', 'open', 'bark', 'accent'] },
  { id: 'ht', label: 'High tom', key: 'e/5', family: 'tom', pitch: 190, pan: -.35, states: ['off', 'hit', 'flam', 'drag', 'accent'] },
  { id: 'mt', label: 'Mid tom', key: 'd/5', family: 'tom', pitch: 145, pan: .05, states: ['off', 'hit', 'flam', 'drag', 'accent'] },
  { id: 'lt', label: 'Low tom', key: 'b/4', family: 'tom', pitch: 112, pan: .28, states: ['off', 'hit', 'flam', 'drag', 'accent'] },
  { id: 'ft', label: 'Floor tom', key: 'a/4', family: 'tom', pitch: 82, pan: .48, states: ['off', 'hit', 'flam', 'drag', 'accent'] },
  { id: 'sn', label: 'Snare', key: 'c/5', family: 'snare', pan: .08, states: ['off', 'hit', 'ghost', 'cross-stick', 'flam', 'drag', 'accent'] },
  { id: 'bd', label: 'Kick', key: 'f/4', family: 'kick', pan: 0, states: ['off', 'hit', 'accent'] }
];

const meters = {
  '4/4': { numerator: 4, denominator: 4, slots: 16, groups: [0, 4, 8, 12], backbeats: [4, 12], anchors: [0, 8], beams: [[1, 4]] },
  '3/4': { numerator: 3, denominator: 4, slots: 12, groups: [0, 4, 8], backbeats: [4], anchors: [0, 8], beams: [[1, 4]] },
  '5/4': { numerator: 5, denominator: 4, slots: 20, groups: [0, 4, 8, 12, 16], backbeats: [4, 12], anchors: [0, 8, 16], beams: [[1, 4]] },
  '6/8': { numerator: 6, denominator: 8, slots: 12, groups: [0, 6], backbeats: [6], anchors: [0, 6], beams: [[3, 8]] },
  '7/8': { numerator: 7, denominator: 8, slots: 14, groups: [0, 4, 8], backbeats: [4, 8], anchors: [0, 8], beams: [[2, 8], [2, 8], [3, 8]] }
};

const refs = {
  play: $('#play-toggle'), tempo: $('#tempo'), meter: $('#meter'), length: $('#length'), clear: $('#clear-pattern'), copy: $('#copy-source'),
  status: $('#save-status'), preset: $('#preset'), density: $('#kick-density'), syncopation: $('#syncopation'),
  surprise: $('#surprise'), orchestration: $('#orchestration'), linearity: $('#linearity'), backbeat: $('#keep-backbeat'),
  generate: $('#generate-pattern'),
  mutate: $('#mutate-pattern'), money: $('#money-beat'), grid: $('#step-grid'), notation: $('#notation-target'),
  source: $('#pattern-source'), tags: $('#character-tags'), note: $('#analysis-note'), theme: $('.theme-toggle')
};

let pattern = createPattern('4/4', 1, 100);
let notationElements = [];
let audioContext = null;
let noiseBuffer = null;
let playing = false;
let schedulerTimer = null;
let nextStep = 0;
let nextStepTime = 0;
let scheduledNodes = [];
let highlightTimers = [];
let resizeTimer = null;
let generationTimer = null;

function meterConfig(meter = pattern?.meter || '4/4') {
  return meters[meter] || meters['4/4'];
}

function createPattern(meter, bars, tempo) {
  const safeMeter = meters[meter] ? meter : '4/4';
  const safeBars = bars === 2 ? 2 : 1;
  const steps = meterConfig(safeMeter).slots * safeBars;
  return {
    meter: safeMeter,
    bars: safeBars,
    steps,
    tempo,
    tracks: Object.fromEntries(instruments.map(({ id }) => [id, Array(steps).fill('off')]))
  };
}

function moneyBeat(meter = pattern.meter, bars = pattern.bars) {
  const next = createPattern(meter, bars, Number(refs.tempo.value) || 100);
  const config = meterConfig(meter);
  for (let i = 0; i < next.steps; i += 2) next.tracks.hh[i] = 'closed';
  for (let bar = 0; bar < bars; bar += 1) {
    const offset = bar * config.slots;
    config.anchors.forEach(local => { next.tracks.bd[offset + local] = 'hit'; });
    config.backbeats.forEach(local => { next.tracks.sn[offset + local] = 'hit'; });
  }
  return next;
}

function sanitizePattern(value) {
  const meter = meters[value?.meter] ? value.meter : '4/4';
  const inferredBars = Number(value?.bars) || Math.round((Number(value?.steps) || meterConfig(meter).slots) / meterConfig(meter).slots);
  const next = createPattern(meter, inferredBars === 2 ? 2 : 1, Math.min(300, Math.max(30, Number(value?.tempo) || 100)));
  for (const instrument of instruments) {
    const values = Array.isArray(value?.tracks?.[instrument.id]) ? value.tracks[instrument.id] : [];
    next.tracks[instrument.id] = Array.from({ length: next.steps }, (_, i) => {
      const state = values[i] === 'rim' ? 'cross-stick' : values[i];
      return instrument.states.includes(state) ? state : 'off';
    });
  }
  return next;
}

function loadState() {
  try {
    const saved = JSON.parse(localStorage.getItem(PATTERN_KEY));
    pattern = saved ? sanitizePattern(saved) : moneyBeat('4/4', 1);
    const settings = JSON.parse(localStorage.getItem(SETTINGS_KEY));
    if (settings) {
      for (const [key, ref] of [['preset', refs.preset], ['density', refs.density], ['syncopation', refs.syncopation], ['surprise', refs.surprise], ['orchestration', refs.orchestration], ['linearity', refs.linearity]]) {
        if (settings[key] !== undefined) ref.value = settings[key];
      }
      refs.backbeat.checked = settings.backbeat ?? true;
    }
  } catch (error) {
    pattern = moneyBeat('4/4', 1);
  }
  refs.tempo.value = pattern.tempo;
  refs.meter.value = pattern.meter;
  refs.length.value = pattern.bars;
}

function saveState() {
  try {
    localStorage.setItem(PATTERN_KEY, JSON.stringify(pattern));
    localStorage.setItem(SETTINGS_KEY, JSON.stringify({
      preset: refs.preset.value, density: refs.density.value, syncopation: refs.syncopation.value,
      surprise: refs.surprise.value, orchestration: refs.orchestration.value, linearity: refs.linearity.value,
      backbeat: refs.backbeat.checked
    }));
    refs.status.textContent = 'Saved locally';
  } catch (error) {
    refs.status.textContent = 'Local save unavailable';
  }
}

function sourceToken(state) {
  return ({ off: '.', hit: 'x', closed: 'x', accent: 'x>', ghost: '(x)', 'cross-stick': 'c', flam: 'f', drag: 'd', open: 'o', bark: '+' })[state] || '.';
}

function sourceText() {
  const lines = [`tempo ${pattern.tempo}`, `meter ${pattern.meter}`, `division 16`, `bars ${pattern.bars}`, `steps ${pattern.steps}`];
  for (const instrument of instruments) lines.push(`${instrument.id}: ${pattern.tracks[instrument.id].map(sourceToken).join(' ')}`);
  return lines.join('\n');
}

function stepLabel(index) {
  const config = meterConfig();
  const local = index % config.slots;
  if (config.denominator === 8) return `${Math.floor(local / 2) + 1}${local % 2 ? '&' : ''}`;
  const parts = ['', 'e', '&', 'a'];
  return `${Math.floor(local / 4) + 1}${parts[local % 4]}`;
}

function isGroupStart(index) {
  const config = meterConfig();
  return config.groups.includes(index % config.slots);
}

function stepDescription(index) {
  const bar = Math.floor(index / meterConfig().slots) + 1;
  return pattern.bars === 1 ? stepLabel(index) : `bar ${bar}, ${stepLabel(index)}`;
}

function renderGrid() {
  refs.grid.style.setProperty('--steps', pattern.steps);
  const header = `<div class="grid-row grid-header"><span class="grid-label">Instrument</span>${Array.from({ length: pattern.steps }, (_, i) => `<span class="step-number${isGroupStart(i) ? ' is-beat' : ''}" title="${stepDescription(i)}">${stepLabel(i)}</span>`).join('')}</div>`;
  const rows = instruments.map(instrument => {
    const cells = pattern.tracks[instrument.id].map((state, step) => `<button class="step-cell${isGroupStart(step) ? ' is-beat' : ''}" type="button" data-instrument="${instrument.id}" data-step="${step}" data-state="${state}" aria-label="${instrument.label}, ${stepDescription(step)}: ${state}" title="${instrument.label} · ${stepDescription(step)} · ${state}"></button>`).join('');
    return `<div class="grid-row"><span class="grid-label">${instrument.label}</span>${cells}</div>`;
  }).join('');
  refs.grid.innerHTML = header + rows;
}

function addModifier(note, modifier, index = 0) {
  try { note.addModifier(modifier, index); } catch (error) { note.addModifier(modifier); }
}

function renderNotation() {
  notationElements = [];
  if (!window.Vex?.Flow) {
    refs.notation.innerHTML = '<p class="notation-error">VexFlow is unavailable. The editable grid and playback still work.</p>';
    return;
  }
  try {
    const VF = window.Vex.Flow;
    refs.notation.innerHTML = '';
    const width = Math.max(refs.notation.clientWidth - 20, pattern.steps * 44 + 150);
    const renderer = new VF.Renderer(refs.notation, VF.Renderer.Backends.SVG);
    renderer.resize(width, 220);
    const context = renderer.getContext();
    const stave = new VF.Stave(30, 55, width - 60);
    const config = meterConfig();
    stave.addClef('percussion').addTimeSignature(pattern.meter);
    stave.setBegBarType(VF.Barline.type.REPEAT_BEGIN).setEndBarType(VF.Barline.type.REPEAT_END);
    stave.setContext(context).draw();

    const notes = [];
    for (let step = 0; step < pattern.steps; step += 1) {
      const active = instruments.filter(instrument => pattern.tracks[instrument.id][step] !== 'off');
      const note = new VF.StaveNote({
        clef: 'percussion', keys: active.length ? active.map(item => pattern.tracks[item.id][step] === 'cross-stick' ? `${item.key}/X2` : item.key) : ['b/4'],
        duration: active.length ? '16' : '16r', stem_direction: VF.Stem.UP
      });
      active.forEach((instrument, index) => {
        const state = pattern.tracks[instrument.id][step];
        if (state === 'accent') addModifier(note, new VF.Articulation('a>').setPosition(VF.Modifier.Position.ABOVE), index);
        if (state === 'ghost') addModifier(note, new VF.Parenthesis(VF.Modifier.Position.LEFT), index);
        if (state === 'ghost') addModifier(note, new VF.Parenthesis(VF.Modifier.Position.RIGHT), index);
        if (instrument.id === 'hh' && state === 'open') addModifier(note, new VF.Annotation('○').setVerticalJustification(VF.Annotation.VerticalJustify.TOP), index);
        if (instrument.id === 'hh' && state === 'bark') addModifier(note, new VF.Annotation('+').setVerticalJustification(VF.Annotation.VerticalJustify.TOP), index);
        if (['flam', 'drag'].includes(state) && VF.GraceNote && VF.GraceNoteGroup) {
          const graceNotes = Array.from({ length: state === 'drag' ? 2 : 1 }, () => new VF.GraceNote({
            keys: [instrument.key], duration: '16', slash: state === 'flam', stem_direction: VF.Stem.UP
          }));
          const graceGroup = new VF.GraceNoteGroup(graceNotes, false);
          if (graceNotes.length > 1) graceGroup.beamNotes();
          addModifier(note, graceGroup, index);
        }
      });
      notes.push(note);
    }
    const voice = new VF.Voice({ num_beats: config.numerator * pattern.bars, beat_value: config.denominator }).setMode(VF.Voice.Mode.SOFT);
    voice.addTickables(notes);
    new VF.Formatter().joinVoices([voice]).format([voice], width - 145);
    voice.draw(context, stave);
    try { VF.Beam.generateBeams(notes, { groups: config.beams.map(([top, bottom]) => new VF.Fraction(top, bottom)) }).forEach(beam => beam.setContext(context).draw()); } catch (error) { /* notes remain readable without beams */ }
    notationElements = notes.map((note, step) => {
      const element = note.getSVGElement?.() || null;
      if (element) element.dataset.step = step;
      return element;
    });
  } catch (error) {
    refs.notation.innerHTML = `<p class="notation-error">Notation error: ${String(error.message || error)}</p>`;
  }
}

function active(state) { return state !== 'off'; }

function smallestPeriod(values) {
  for (let period = 1; period <= values.length; period += 1) {
    if (values.length % period === 0 && values.every((value, i) => value === values[i % period])) return period;
  }
  return values.length;
}

function longestCircularRun(values) {
  if (!values.some(Boolean)) return 0;
  if (values.every(Boolean)) return values.length;
  let best = 0;
  let run = 0;
  [...values, ...values].forEach(value => { run = value ? run + 1 : 0; best = Math.max(best, run); });
  return Math.min(best, values.length);
}

function spacingVariation(values) {
  const points = values.map((value, i) => value ? i : -1).filter(i => i >= 0);
  if (points.length < 2) return null;
  const gaps = points.map((point, i) => (points[(i + 1) % points.length] - point + values.length) % values.length);
  const mean = gaps.reduce((sum, gap) => sum + gap, 0) / gaps.length;
  return Math.sqrt(gaps.reduce((sum, gap) => sum + (gap - mean) ** 2, 0) / gaps.length);
}

function updateAnalysis() {
  const config = meterConfig();
  const kicks = pattern.tracks.bd.map(active);
  const snares = pattern.tracks.sn.map(active);
  const count = kicks.filter(Boolean).length;
  const offbeats = kicks.filter((hit, i) => hit && !config.groups.includes(i % config.slots)).length;
  const unisons = kicks.filter((hit, i) => hit && snares[i]).length;
  const run = longestCircularRun(kicks);
  const period = smallestPeriod(kicks);
  const variation = spacingVariation(kicks);
  $('#metric-kicks').textContent = count;
  $('#metric-offbeats').textContent = offbeats;
  $('#metric-unisons').textContent = unisons;
  $('#metric-run').textContent = run;
  $('#metric-period').textContent = `${period} step${period === 1 ? '' : 's'}`;
  $('#metric-spacing').textContent = variation === null ? '—' : variation < .75 ? 'even' : variation < 1.8 ? 'mixed' : 'irregular';
  const tags = [];
  if (!unisons && count) tags.push('interlocking');
  if (unisons >= 2) tags.push('stacked backbeat');
  if (offbeats >= Math.max(2, count / 2)) tags.push('syncopated');
  const anticipations = config.groups.map(group => (group - 1 + config.slots) % config.slots);
  if (kicks.some((hit, i) => hit && anticipations.includes(i % config.slots))) tags.push('anticipatory');
  if (period === pattern.steps && count) tags.push('developing');
  if (period <= pattern.steps / 2 && count) tags.push('repeating cell');
  if (run >= 2) tags.push('kick run');
  if (count >= pattern.steps * .42) tags.push('dense');
  if (count && count <= pattern.steps * .18) tags.push('sparse');
  if (variation !== null && variation < .6) tags.push('evenly spaced');
  if (!tags.length) tags.push('open texture');
  refs.tags.innerHTML = tags.map(tag => `<span class="character-tag">${tag}</span>`).join('');
  refs.note.textContent = `This groove is ${tags.slice(0, -1).join(', ')}${tags.length > 1 ? ' and ' : ''}${tags.at(-1)}. ${unisons ? 'Kick/snare reinforcement adds weight.' : 'Kick and snare occupy separate attacks, which leaves the backbeat clearer.'}`;
}

function updateOutputs() {
  for (const [ref, output] of [[refs.density, '#kick-density-output'], [refs.syncopation, '#syncopation-output'], [refs.surprise, '#surprise-output'], [refs.orchestration, '#orchestration-output'], [refs.linearity, '#linearity-output']]) $(output).textContent = `${ref.value}%`;
}

function updateAll({ save = true } = {}) {
  pattern.tempo = Math.min(300, Math.max(30, Number(refs.tempo.value) || 100));
  refs.meter.value = pattern.meter;
  refs.length.value = String(pattern.bars);
  renderGrid();
  renderNotation();
  updateAnalysis();
  refs.source.value = sourceText();
  updateOutputs();
  if (save) saveState();
}

function weightedPick(items) {
  const total = items.reduce((sum, item) => sum + item.weight, 0);
  let cursor = Math.random() * total;
  for (const item of items) {
    cursor -= item.weight;
    if (cursor <= 0) return item.index;
  }
  return items.at(-1)?.index;
}

function generateKickBar(offset, target, sync, preset, config) {
  const chosen = new Set();
  if (preset === 'dance') config.groups.forEach(i => chosen.add(offset + i));
  if (preset === 'grounded' || preset === 'hiphop') config.anchors.forEach(i => chosen.add(offset + i));
  while (chosen.size < target) {
    const candidates = [];
    for (let local = 0; local < config.slots; local += 1) {
      const index = offset + local;
      if (chosen.has(index)) continue;
      let weight = config.groups.includes(local) ? 1.7 - sync : local % 2 === 0 ? .8 + sync : .25 + sync * 1.8;
      if (config.groups.map(group => (group - 1 + config.slots) % config.slots).includes(local)) weight *= 1 + sync;
      candidates.push({ index, weight: Math.max(.01, weight) });
    }
    const pick = weightedPick(candidates);
    if (pick === undefined) break;
    chosen.add(pick);
  }
  chosen.forEach(index => { pattern.tracks.bd[index] = Math.random() < .13 ? 'accent' : 'hit'; });
}

function applyLinearity(amount) {
  const config = meterConfig();
  for (let step = 0; step < pattern.steps; step += 1) {
    const sounding = instruments.filter(instrument => pattern.tracks[instrument.id][step] !== 'off');
    if (sounding.length < 2 || Math.random() >= amount) continue;
    const anchoredSnare = refs.backbeat.checked && config.backbeats.includes(step % config.slots)
      ? sounding.find(instrument => instrument.id === 'sn')
      : null;
    const accented = sounding.filter(instrument => pattern.tracks[instrument.id][step] === 'accent');
    const pool = accented.length ? accented : sounding;
    const keep = anchoredSnare || pool[Math.floor(Math.random() * pool.length)];
    sounding.forEach(instrument => {
      if (instrument !== keep) pattern.tracks[instrument.id][step] = 'off';
    });
  }
}

function generatePattern() {
  const meter = refs.meter.value;
  const bars = Number(refs.length.value);
  pattern = createPattern(meter, bars, Number(refs.tempo.value) || 100);
  const config = meterConfig();
  const preset = refs.preset.value;
  const density = Number(refs.density.value) / 100;
  const sync = Number(refs.syncopation.value) / 100;
  const surprise = Number(refs.surprise.value) / 100;
  const orchestration = Number(refs.orchestration.value) / 100;
  const linearity = Number(refs.linearity.value) / 100;
  for (let bar = 0; bar < pattern.bars; bar += 1) {
    const offset = bar * config.slots;
    for (let local = 0; local < config.slots; local += 1) {
      const step = offset + local;
      const hatHit = preset === 'funk' ? true : local % 2 === 0;
      if (hatHit) pattern.tracks.hh[step] = preset === 'dance' && !config.groups.includes(local) ? 'open' : 'closed';
    }
    if (refs.backbeat.checked) {
      config.backbeats.forEach(local => { pattern.tracks.sn[offset + local] = 'accent'; });
    }
    const target = Math.max(preset === 'dance' ? config.groups.length : 1, Math.round(1 + density * 8 * config.slots / 16));
    generateKickBar(offset, Math.min(config.slots - 1, target + (bar && Math.random() < surprise ? 1 : 0)), sync, preset, config);
    if (preset === 'hiphop' || preset === 'funk') {
      Array.from({ length: config.slots }, (_, local) => local).filter(local => local % 4 === 3).forEach(local => {
        if (Math.random() < orchestration * .8) pattern.tracks.sn[offset + local] = 'ghost';
      });
    }
    if (Math.random() < .55) pattern.tracks.cr1[offset] = bar === 0 ? 'accent' : 'off';
    for (let local = 0; local < config.slots; local += 1) {
      const step = offset + local;
      if (Math.random() < orchestration * .09) pattern.tracks.cowbell[step] = 'hit';
      if (Math.random() < orchestration * .08) pattern.tracks.ride[step] = 'hit';
    }
    const fillChance = preset === 'toms' ? .95 : orchestration * .65;
    if (Math.random() < fillChance) {
      ['ht', 'mt', 'lt', 'ft'].forEach((id, i) => { pattern.tracks[id][offset + config.slots - 4 + i] = i === 3 ? 'accent' : 'hit'; });
    }
    if (Math.random() < orchestration * .25) pattern.tracks.china[offset + config.groups[Math.floor(config.groups.length / 2)]] = 'accent';
  }
  applyLinearity(linearity);
  updateAll();
}

function mutatePattern() {
  const amount = Math.max(1, Math.round(pattern.steps * (Number(refs.surprise.value) / 100) * .35));
  const preferred = instruments.filter(item => ['bd', 'sn', 'hh', 'ht', 'mt', 'lt', 'ft', 'ride'].includes(item.id));
  for (let i = 0; i < amount; i += 1) {
    const instrument = preferred[Math.floor(Math.random() * preferred.length)];
    const step = Math.floor(Math.random() * pattern.steps);
    pattern.tracks[instrument.id][step] = pattern.tracks[instrument.id][step] === 'off' ? instrument.states[1] : 'off';
  }
  updateAll();
}

function setTheme(theme) {
  document.documentElement.dataset.theme = theme;
  const light = theme === 'light';
  refs.theme.textContent = light ? '☾' : '☀';
  refs.theme.setAttribute('aria-label', light ? 'Switch to dark mode' : 'Switch to light mode');
  refs.theme.title = refs.theme.getAttribute('aria-label');
  try { localStorage.setItem(THEME_KEY, theme); } catch (error) { /* preference stays for this visit */ }
  renderNotation();
}

function ensureAudio() {
  if (!audioContext) {
    audioContext = new (window.AudioContext || window.webkitAudioContext)();
    noiseBuffer = audioContext.createBuffer(1, audioContext.sampleRate * 2, audioContext.sampleRate);
    const data = noiseBuffer.getChannelData(0);
    for (let i = 0; i < data.length; i += 1) data[i] = Math.random() * 2 - 1;
  }
  return audioContext.resume();
}

function outputNode(time, duration, volume, pan = 0) {
  const gain = audioContext.createGain();
  gain.gain.setValueAtTime(Math.max(.0001, volume), time);
  gain.gain.exponentialRampToValueAtTime(.0001, time + duration);
  const panner = audioContext.createStereoPanner ? audioContext.createStereoPanner() : null;
  if (panner) { panner.pan.value = pan; gain.connect(panner).connect(audioContext.destination); }
  else gain.connect(audioContext.destination);
  return gain;
}

function oscillator(type, frequency, time, duration, volume, pan, endFrequency = frequency) {
  const node = audioContext.createOscillator();
  node.type = type;
  node.frequency.setValueAtTime(frequency, time);
  node.frequency.exponentialRampToValueAtTime(Math.max(20, endFrequency), time + duration);
  node.connect(outputNode(time, duration, volume, pan));
  node.start(time); node.stop(time + duration + .01); scheduledNodes.push(node);
}

function noise(time, duration, volume, pan, frequency, type = 'highpass') {
  const source = audioContext.createBufferSource(); source.buffer = noiseBuffer;
  const filter = audioContext.createBiquadFilter(); filter.type = type; filter.frequency.value = frequency;
  source.connect(filter).connect(outputNode(time, duration, volume, pan));
  source.start(time); source.stop(time + duration + .01); scheduledNodes.push(source);
}

function scheduleInstrument(instrument, state, time) {
  if (state === 'flam' || state === 'drag') {
    const graceGap = (60 / pattern.tempo / 4) * .16;
    const graceCount = state === 'drag' ? 2 : 1;
    for (let grace = graceCount; grace > 0; grace -= 1) scheduleInstrument(instrument, 'ghost', time - graceGap * grace);
    state = 'hit';
  }
  const strength = state === 'accent' ? 1.8 : state === 'ghost' ? .28 : state === 'bark' ? 1.35 : 1;
  const pan = instrument.pan;
  switch (instrument.family) {
    case 'kick': oscillator('sine', 145, time, .2, .55 * strength, pan, 48); break;
    case 'snare':
      if (state === 'cross-stick') oscillator('square', 850, time, .045, .12 * strength, pan, 430);
      else { noise(time, .13, .21 * strength, pan, 1050); oscillator('triangle', 185, time, .08, .12 * strength, pan, 150); }
      break;
    case 'hat': noise(time, state === 'open' || state === 'bark' ? .42 : .055, .075 * strength, pan, 6500); break;
    case 'ride': noise(time, .55, .07 * strength, pan, 4300); oscillator('square', 1750, time, .22, .025 * strength, pan, 1450); break;
    case 'cymbal': noise(time, instrument.id === 'china' ? .65 : .8, .105 * strength, pan, instrument.id === 'china' ? 2300 : 3900); break;
    case 'tom': oscillator('sine', instrument.pitch, time, .22, .24 * strength, pan, instrument.pitch * .68); break;
    case 'cowbell': oscillator('square', 570, time, .11, .075 * strength, pan, 510); oscillator('square', 845, time, .09, .05 * strength, pan, 760); break;
  }
}

function clearHighlight() {
  document.querySelectorAll('.step-cell.is-current').forEach(element => element.classList.remove('is-current'));
  document.querySelectorAll('.notation-target .current-note').forEach(element => element.classList.remove('current-note'));
}

function highlightStep(step, atTime) {
  const delay = Math.max(0, (atTime - audioContext.currentTime) * 1000);
  const timer = window.setTimeout(() => {
    clearHighlight();
    refs.grid.querySelectorAll(`[data-step="${step}"]`).forEach(element => element.classList.add('is-current'));
    notationElements[step]?.classList.add('current-note');
  }, delay);
  highlightTimers.push(timer);
}

function scheduleStep(step, time) {
  for (const instrument of instruments) {
    const state = pattern.tracks[instrument.id][step];
    if (state !== 'off') scheduleInstrument(instrument, state, time);
  }
  highlightStep(step, time);
}

function scheduler() {
  const stepDuration = 60 / pattern.tempo / 4;
  while (nextStepTime < audioContext.currentTime + .16) {
    scheduleStep(nextStep, nextStepTime);
    nextStep = (nextStep + 1) % pattern.steps;
    nextStepTime += stepDuration;
  }
}

async function startPlayback() {
  stopPlayback();
  await ensureAudio();
  // Schedule ahead from the first stroke so initialization never stretches the first loop.
  nextStep = 0;
  nextStepTime = audioContext.currentTime + .09;
  playing = true;
  refs.play.textContent = '■ Stop';
  refs.play.dataset.playing = 'true';
  refs.play.setAttribute('aria-label', 'Stop groove');
  scheduler();
  schedulerTimer = window.setInterval(scheduler, 40);
}

function stopPlayback() {
  playing = false;
  if (schedulerTimer) window.clearInterval(schedulerTimer);
  schedulerTimer = null;
  highlightTimers.forEach(timer => window.clearTimeout(timer)); highlightTimers = [];
  scheduledNodes.forEach(node => { try { node.stop(); } catch (error) { /* already ended */ } }); scheduledNodes = [];
  clearHighlight();
  refs.play.textContent = '▶ Play';
  refs.play.dataset.playing = 'false';
  refs.play.setAttribute('aria-label', 'Play groove');
}

refs.grid.addEventListener('click', event => {
  const cell = event.target.closest('.step-cell');
  if (!cell) return;
  const instrument = instruments.find(item => item.id === cell.dataset.instrument);
  const states = instrument.states;
  const step = Number(cell.dataset.step);
  const current = pattern.tracks[instrument.id][step];
  pattern.tracks[instrument.id][step] = states[(states.indexOf(current) + 1) % states.length];
  updateAll();
});

refs.play.addEventListener('click', () => playing ? stopPlayback() : startPlayback().catch(error => {
  stopPlayback(); refs.status.textContent = `Audio error: ${error.message || error}`;
}));
refs.generate.addEventListener('click', generatePattern);
refs.mutate.addEventListener('click', mutatePattern);
refs.money.addEventListener('click', () => { pattern = moneyBeat('4/4', 1); updateAll(); });
refs.clear.addEventListener('click', () => { pattern = createPattern(pattern.meter, pattern.bars, pattern.tempo); updateAll(); });
refs.copy.addEventListener('click', async () => {
  try { await navigator.clipboard.writeText(sourceText()); refs.status.textContent = 'Source copied'; }
  catch (error) { refs.source.focus(); refs.source.select(); refs.status.textContent = 'Source selected'; }
});
refs.tempo.addEventListener('change', () => { pattern.tempo = Number(refs.tempo.value) || 100; const restart = playing; stopPlayback(); updateAll(); if (restart) startPlayback(); });
function regenerateStructure() {
  const restart = playing;
  stopPlayback();
  generatePattern();
  if (restart) startPlayback();
}

refs.meter.addEventListener('change', regenerateStructure);
refs.length.addEventListener('change', regenerateStructure);
for (const ref of [refs.density, refs.syncopation, refs.surprise, refs.orchestration, refs.linearity]) ref.addEventListener('input', () => {
  updateOutputs();
  window.clearTimeout(generationTimer);
  generationTimer = window.setTimeout(generatePattern, 120);
});
for (const ref of [refs.preset, refs.backbeat]) ref.addEventListener('change', generatePattern);
refs.theme.addEventListener('click', () => setTheme(document.documentElement.dataset.theme === 'dark' ? 'light' : 'dark'));
window.addEventListener('resize', () => { window.clearTimeout(resizeTimer); resizeTimer = window.setTimeout(renderNotation, 150); });
window.addEventListener('pagehide', stopPlayback);

loadState();
setTheme(document.documentElement.dataset.theme === 'light' ? 'light' : 'dark');
updateAll({ save: false });
