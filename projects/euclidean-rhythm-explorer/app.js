import {
  euclideanPattern,
  evaluatePatternClauses,
  formatPatternExpression,
  patternExpressionPeriod,
  renderPatternTrack,
  snapRangeValue,
  trackTimingOffsetSeconds
} from './euclidean-core.js';
import { INSTRUMENTS, instrumentGroups } from './instrument-catalog.js';

const STORAGE_KEY = 'euclidean-rhythm-explorer-state-v2';
const OPERATIONS = ['union', 'difference', 'intersection', 'xor'];
const STRAIGHT_SWING = 50;
const TRIPLET_SWING = 66.667;
const MAX_SWING = 83.333;
const SWING_SNAP_THRESHOLD = 0.6;
const TIMING_SNAP_THRESHOLD_MS = 2;
const clampSwing = value => Math.max(STRAIGHT_SWING, Math.min(MAX_SWING, Number(value) || STRAIGHT_SWING));
const clampTrackTiming = value => Math.max(-80, Math.min(80, Math.round(Number(value) || 0)));
const makeId = () => globalThis.crypto?.randomUUID?.() || `${Date.now()}-${Math.random().toString(36).slice(2)}`;
const makePattern = ([pulses = 1, steps = 8, rotation = 0] = []) => ({ pulses, steps, rotation });
const makeClause = (pattern = makePattern(), operation = null) => ({ ...(operation ? { operation } : {}), pattern, collapsed: false });
const findInstrument = id => INSTRUMENTS.find(instrument => instrument.id === id) || null;
const freshState = () => ({
  tempo: 108,
  meter: '4/4',
  subdivision: 4,
  bars: 2,
  swing: STRAIGHT_SWING,
  swingUnit: 8,
  muted: false,
  midiOutputId: '',
  midiChannel: 10,
  midiClock: false,
  tracks: []
});

function sanitizePattern(candidate, fallback = makePattern()) {
  const steps = Math.max(1, Math.min(32, Math.round(Number(candidate?.steps) || fallback.steps)));
  return {
    pulses: Math.max(0, Math.min(steps, Math.round(Number(candidate?.pulses) || 0))),
    steps,
    rotation: Math.max(0, Math.min(steps - 1, Math.round(Number(candidate?.rotation) || 0)))
  };
}

function sanitizeState(candidate) {
  const result = freshState();
  if (!candidate || typeof candidate !== 'object') return result;
  result.tempo = Math.max(30, Math.min(300, Number(candidate.tempo) || result.tempo));
  result.meter = ['4/4', '3/4', '5/4', '6/8', '7/8'].includes(candidate.meter) ? candidate.meter : result.meter;
  result.subdivision = [2, 3, 4].includes(Number(candidate.subdivision)) ? Number(candidate.subdivision) : result.subdivision;
  result.bars = [1, 2, 4, 8].includes(Number(candidate.bars)) ? Number(candidate.bars) : result.bars;
  result.swing = clampSwing(candidate.swing);
  result.swingUnit = [8, 16].includes(Number(candidate.swingUnit)) ? Number(candidate.swingUnit) : result.swingUnit;
  result.muted = Boolean(candidate.muted);
  result.midiOutputId = typeof candidate.midiOutputId === 'string' ? candidate.midiOutputId : '';
  result.midiChannel = Math.max(1, Math.min(16, Math.round(Number(candidate.midiChannel) || 10)));
  result.midiClock = Boolean(candidate.midiClock);
  result.tracks = (Array.isArray(candidate.tracks) ? candidate.tracks : []).slice(0, 24).map(source => {
    const instrument = findInstrument(source.instrument);
    const clauses = (Array.isArray(source.clauses) ? source.clauses : []).slice(0, 12).map((clause, index) => ({
      ...(index ? { operation: OPERATIONS.includes(clause.operation) ? clause.operation : 'union' } : {}),
      pattern: sanitizePattern(clause.pattern, makePattern(instrument?.pattern || [3, 8, 0])),
      collapsed: Boolean(clause.collapsed)
    }));
    return {
      id: typeof source.id === 'string' ? source.id : makeId(),
      instrument: instrument?.id || '',
      clauses: clauses.length ? clauses : [makeClause(makePattern(instrument?.pattern || [3, 8, 0]))],
      muted: Boolean(source.muted),
      level: Math.max(20, Math.min(127, Math.round(Number(source.level) || instrument?.level || 82))),
      swing: source.swing === null || source.swing === undefined ? null : clampSwing(source.swing),
      timingOffsetMs: clampTrackTiming(source.timingOffsetMs),
      collapsed: Boolean(source.collapsed)
    };
  });
  return result;
}

function loadState() {
  try { return sanitizeState(JSON.parse(localStorage.getItem(STORAGE_KEY))); } catch (error) { return freshState(); }
}

let state = loadState();
let saveTimer = 0;
let audioContext = null;
let masterGain = null;
let activeAudioNodes = new Set();
let schedulerTimer = 0;
let playing = false;
let nextStep = 0;
let nextStepTime = 0;
let visualTimers = new Set();
let midiAccess = null;
let midiOutput = null;
let pendingMidiOutputId = state.midiOutputId;
let midiClockRunning = false;
let activeFeelRange = null;

const elements = {
  play: document.querySelector('#play-toggle'),
  mute: document.querySelector('#mute-toggle'),
  tempo: document.querySelector('#tempo'),
  meter: document.querySelector('#meter'),
  subdivision: document.querySelector('#subdivision'),
  bars: document.querySelector('#bars'),
  swingUnit: document.querySelector('#swing-unit'),
  globalSwing: document.querySelector('#global-swing'),
  globalSwingOutput: document.querySelector('#global-swing-output'),
  status: document.querySelector('#status'),
  midiControls: document.querySelector('.midi-controls'),
  midiEnable: document.querySelector('#enable-midi'),
  midiOutput: document.querySelector('#midi-output'),
  midiChannel: document.querySelector('#midi-channel'),
  midiClock: document.querySelector('#midi-clock'),
  trackBank: document.querySelector('#track-bank'),
  emptyState: document.querySelector('#empty-state'),
  phraseSummary: document.querySelector('#phrase-summary'),
  changeLegend: document.querySelector('#change-legend')
};

function meterParts() {
  const [beats, denominator] = state.meter.split('/').map(Number);
  return { beats, denominator };
}

function slotsPerBar() { return meterParts().beats * state.subdivision; }
function totalSlots() { return slotsPerBar() * state.bars; }

function secondsPerSlot() {
  const { denominator } = meterParts();
  return (60 / state.tempo) * (4 / denominator) / state.subdivision;
}

function slotsPerSwingUnit() {
  const { denominator } = meterParts();
  return denominator * state.subdivision / state.swingUnit;
}

function swingLabel(value) {
  const amount = clampSwing(value);
  if (Math.abs(amount - STRAIGHT_SWING) < 0.05) return '50%';
  if (Math.abs(amount - TRIPLET_SWING) < 0.11) return '66.7%';
  return `${amount.toFixed(1)}%`;
}

function swingAriaLabel(value) {
  const amount = clampSwing(value);
  if (Math.abs(amount - STRAIGHT_SWING) < 0.05) return '50%, straight';
  if (Math.abs(amount - TRIPLET_SWING) < 0.11) return '66.7%, triplet swing';
  return `${amount.toFixed(1)}% swing`;
}

function timingLabel(value) {
  const amount = clampTrackTiming(value);
  if (!amount) return '0 ms · On beat';
  return `${amount > 0 ? '+' : '−'}${Math.abs(amount)} ms · ${amount < 0 ? 'Ahead' : 'Behind'}`;
}

function snapFeelRangeInput(input) {
  if (!input || input !== activeFeelRange) return false;
  const timing = input.matches('.track-timing');
  const center = timing ? 0 : TRIPLET_SWING;
  const threshold = timing ? TIMING_SNAP_THRESHOLD_MS : SWING_SNAP_THRESHOLD;
  const value = Number(input.value);
  const snapped = snapRangeValue(value, center, threshold);
  if (snapped === value) return false;
  input.value = String(snapped);
  return true;
}

function effectiveTrackSwing(track) {
  return track.swing === null ? state.swing : track.swing;
}

function updateGlobalSwingControl() {
  const value = clampSwing(state.swing);
  elements.globalSwing.value = value;
  elements.globalSwingOutput.textContent = swingLabel(value);
  elements.globalSwing.setAttribute('aria-valuetext', swingAriaLabel(value));
}

function saveSoon() {
  clearTimeout(saveTimer);
  saveTimer = setTimeout(() => {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(state)); } catch (error) {}
    elements.status.textContent = 'Saved';
    setTimeout(() => { if (elements.status.textContent === 'Saved') elements.status.textContent = ''; }, 800);
  }, 120);
}

function renderPhraseSummary() {
  const slots = totalSlots();
  const periods = state.tracks.map(track => patternExpressionPeriod(track.clauses)).filter(Boolean);
  const longest = periods.length ? Math.max(...periods) : 0;
  const chips = [`${slots} slots`, `${state.bars} ${state.bars === 1 ? 'bar' : 'bars'}`, `${state.tracks.length} ${state.tracks.length === 1 ? 'track' : 'tracks'}`];
  if (longest) chips.push(`Longest natural cycle: ${longest} slots`);
  elements.phraseSummary.innerHTML = chips.map(text => `<span class="summary-chip">${text}</span>`).join('');
  elements.changeLegend.hidden = !state.tracks.some(track => track.clauses.length > 1);
}

function previewSlots(container, pattern, previous = null) {
  container.replaceChildren(...pattern.map((hit, slot) => {
    const cell = document.createElement('i');
    const beat = slot % state.subdivision === 0;
    const added = previous && hit && !previous[slot];
    const removed = previous && !hit && previous[slot];
    cell.className = `preview-slot${hit ? ' is-hit' : ''}${added ? ' is-added' : ''}${removed ? ' is-removed' : ''}${beat ? ' is-beat' : ''}`;
    cell.dataset.slot = slot;
    return cell;
  }));
}

function sourceFormula(pattern) {
  return `E(${pattern.pulses},${pattern.steps})${pattern.rotation ? ` r${pattern.rotation}` : ''}`;
}

function updatePatternSection(track, index, section) {
  const clause = track.clauses[index];
  const pattern = clause.pattern;
  section.classList.toggle('is-collapsed', clause.collapsed);
  section.querySelector('.pattern-disclosure').setAttribute('aria-expanded', String(!clause.collapsed));
  section.querySelector('.pattern-disclosure').title = clause.collapsed ? 'Expand pattern' : 'Collapse pattern';
  section.querySelector('.pattern-operation').value = clause.operation || 'union';
  const cumulativeClauses = track.clauses.slice(0, index + 1);
  const cumulative = renderPatternTrack(cumulativeClauses, totalSlots());
  const previous = index > 0 ? renderPatternTrack(track.clauses.slice(0, index), totalSlots()) : null;
  const cumulativeFormula = formatPatternExpression(cumulativeClauses);
  section.querySelector('.collapsed-result-formula').textContent = cumulativeFormula;
  section.querySelector('.result-formula').textContent = cumulativeFormula;
  previewSlots(section.querySelector('.collapsed-result-preview'), cumulative, previous);
  previewSlots(section.querySelector('.result-preview'), cumulative, previous);
  section.querySelector('.source-formula').textContent = sourceFormula(pattern);
  previewSlots(section.querySelector('.source-preview'), renderPatternTrack([{ pattern }], totalSlots()));
  for (const field of ['pulses', 'steps', 'rotation']) {
    const input = section.querySelector(`[data-field="${field}"]`);
    input.value = pattern[field];
    if (field === 'pulses') input.max = pattern.steps;
    if (field === 'rotation') input.max = pattern.steps - 1;
    section.querySelector(`[data-output="${field}"]`).textContent = pattern[field];
  }
}

function makePatternSection(track, index) {
  const section = document.querySelector('#pattern-template').content.firstElementChild.cloneNode(true);
  section.dataset.clause = index;
  updatePatternSection(track, index, section);
  return section;
}

function populateInstrumentSelect(select, selected = '') {
  const none = new Option('None selected', '');
  select.replaceChildren(none, ...[...instrumentGroups()].map(([name, instruments]) => {
    const group = document.createElement('optgroup');
    group.label = name;
    instruments.forEach(instrument => group.append(new Option(`${instrument.name} · MIDI ${instrument.midi}`, instrument.id)));
    return group;
  }));
  select.value = findInstrument(selected) ? selected : '';
}

function updateTrackFeelControls(track, card) {
  const overridden = track.swing !== null;
  const swing = effectiveTrackSwing(track);
  const overrideInput = card.querySelector('.track-swing-override');
  const swingInput = card.querySelector('.track-swing');
  const swingOutput = card.querySelector('.track-swing-output');
  const timingInput = card.querySelector('.track-timing');
  const timingOutput = card.querySelector('.track-timing-output');
  overrideInput.checked = overridden;
  swingInput.disabled = !overridden;
  swingInput.value = swing;
  swingInput.setAttribute('aria-valuetext', `${swingAriaLabel(swing)}${overridden ? '' : ', following global swing'}`);
  swingOutput.textContent = swingLabel(swing);
  timingInput.value = track.timingOffsetMs;
  timingInput.setAttribute('aria-valuetext', timingLabel(track.timingOffsetMs));
  timingOutput.textContent = timingLabel(track.timingOffsetMs);
}

function updateTrackCard(track, card) {
  const instrument = findInstrument(track.instrument);
  card.classList.toggle('is-collapsed', track.collapsed);
  card.classList.toggle('is-muted', track.muted);
  card.querySelector('.track-disclosure').setAttribute('aria-expanded', String(!track.collapsed));
  card.querySelector('.track-disclosure').title = track.collapsed ? 'Expand track' : 'Collapse track';
  const instrumentSelect = card.querySelector('.track-instrument');
  instrumentSelect.value = instrument?.id || '';
  instrumentSelect.title = instrument ? `MIDI note ${instrument.midi}${instrument.mapping === 'toontrack' ? ' (Toontrack-oriented mapping)' : ''}` : 'Choose an instrument for this track';
  card.querySelector('.track-expression').textContent = formatPatternExpression(track.clauses);
  card.querySelector('.track-level').value = track.level;
  card.querySelector('.track-level-output').textContent = track.level;
  updateTrackFeelControls(track, card);
  const mute = card.querySelector('.track-mute');
  mute.textContent = track.muted ? '🔇' : '🔊';
  mute.title = track.muted ? 'Unmute track' : 'Mute track';
  mute.setAttribute('aria-pressed', String(track.muted));
  const finalResult = renderPatternTrack(track.clauses, totalSlots());
  previewSlots(card.querySelector('.track-preview'), finalResult);
  card.querySelectorAll('.pattern-clause').forEach((section, index) => updatePatternSection(track, index, section));
}

function makeTrackCard(track) {
  const card = document.querySelector('#track-template').content.firstElementChild.cloneNode(true);
  card.dataset.trackId = track.id;
  populateInstrumentSelect(card.querySelector('.track-instrument'), track.instrument);
  card.querySelector('.pattern-list').replaceChildren(...track.clauses.map((_, index) => makePatternSection(track, index)));
  updateTrackCard(track, card);
  return card;
}

function renderTracks() {
  elements.emptyState.hidden = state.tracks.length > 0;
  elements.trackBank.replaceChildren(...state.tracks.map(makeTrackCard));
  renderPhraseSummary();
}

function trackForCard(card) { return state.tracks.find(track => track.id === card?.dataset.trackId); }

function initializeControls() {
  elements.tempo.value = state.tempo;
  elements.meter.value = state.meter;
  elements.subdivision.value = state.subdivision;
  elements.bars.value = state.bars;
  elements.swingUnit.value = state.swingUnit;
  updateGlobalSwingControl();
  elements.mute.textContent = state.muted ? '🔇' : '🔊';
  elements.mute.title = state.muted ? 'Unmute audio' : 'Mute audio';
  elements.midiChannel.value = state.midiChannel;
  elements.midiClock.checked = state.midiClock;
}

function addTrack() {
  state.tracks.push({
    id: makeId(),
    instrument: '',
    clauses: [makeClause(makePattern([3, 8, 0]))],
    muted: false,
    level: 82,
    swing: null,
    timingOffsetMs: 0,
    collapsed: false
  });
  renderTracks();
  saveSoon();
  elements.trackBank.lastElementChild?.querySelector('.track-instrument')?.focus();
}

document.querySelector('#add-track').addEventListener('click', addTrack);

elements.trackBank.addEventListener('click', event => {
  const card = event.target.closest('.track-card');
  const track = trackForCard(card);
  if (!track) return;
  if (event.target.closest('.track-disclosure')) {
    track.collapsed = !track.collapsed;
    updateTrackCard(track, card);
  } else if (event.target.closest('.track-mute')) {
    track.muted = !track.muted;
    updateTrackCard(track, card);
  } else if (event.target.closest('.remove-track')) {
    state.tracks = state.tracks.filter(item => item.id !== track.id);
    renderTracks();
  } else if (event.target.closest('.add-operation')) {
    track.clauses.push(makeClause(makePattern([1, 8, 0]), 'union'));
    track.collapsed = false;
    const replacement = makeTrackCard(track);
    card.replaceWith(replacement);
    replacement.querySelector('.pattern-clause:last-child .pattern-disclosure')?.focus();
    renderPhraseSummary();
  } else if (event.target.closest('.pattern-disclosure')) {
    const section = event.target.closest('.pattern-clause');
    const clause = track.clauses[Number(section.dataset.clause)];
    clause.collapsed = !clause.collapsed;
    updatePatternSection(track, Number(section.dataset.clause), section);
  } else if (event.target.closest('.remove-pattern')) {
    const index = Number(event.target.closest('.pattern-clause').dataset.clause);
    if (index > 0) {
      track.clauses.splice(index, 1);
      card.replaceWith(makeTrackCard(track));
      renderPhraseSummary();
    }
  } else return;
  saveSoon();
});

elements.trackBank.addEventListener('change', event => {
  const card = event.target.closest('.track-card');
  const track = trackForCard(card);
  if (!track) return;
  if (event.target.matches('.track-instrument')) {
    track.instrument = findInstrument(event.target.value)?.id || '';
    updateTrackCard(track, card);
    saveSoon();
  } else if (event.target.matches('.track-swing-override')) {
    track.swing = event.target.checked ? effectiveTrackSwing(track) : null;
    updateTrackFeelControls(track, card);
    saveSoon();
  } else if (event.target.matches('.pattern-operation')) {
    const index = Number(event.target.closest('.pattern-clause').dataset.clause);
    if (index > 0) track.clauses[index].operation = event.target.value;
    updateTrackCard(track, card);
    renderPhraseSummary();
    saveSoon();
  }
});

elements.trackBank.addEventListener('input', event => {
  const card = event.target.closest('.track-card');
  const track = trackForCard(card);
  if (!track) return;
  if (event.target.matches('.track-level')) {
    track.level = Number(event.target.value);
    card.querySelector('.track-level-output').textContent = track.level;
  } else if (event.target.matches('.track-swing')) {
    snapFeelRangeInput(event.target);
    track.swing = clampSwing(event.target.value);
    updateTrackFeelControls(track, card);
  } else if (event.target.matches('.track-timing')) {
    snapFeelRangeInput(event.target);
    track.timingOffsetMs = clampTrackTiming(event.target.value);
    updateTrackFeelControls(track, card);
  } else if (event.target.matches('[data-field]')) {
    const index = Number(event.target.closest('.pattern-clause').dataset.clause);
    const pattern = track.clauses[index].pattern;
    const field = event.target.dataset.field;
    if (field === 'steps') {
      pattern.steps = Math.max(1, Math.min(32, Math.round(event.target.value)));
      pattern.pulses = Math.min(pattern.pulses, pattern.steps);
      pattern.rotation %= pattern.steps;
    } else if (field === 'pulses') pattern.pulses = Math.max(0, Math.min(pattern.steps, Math.round(event.target.value)));
    else pattern.rotation = Math.max(0, Math.min(pattern.steps - 1, Math.round(event.target.value)));
    updateTrackCard(track, card);
    renderPhraseSummary();
  } else return;
  saveSoon();
});

for (const [element, key, numeric] of [
  [elements.tempo, 'tempo', true],
  [elements.meter, 'meter', false],
  [elements.subdivision, 'subdivision', true],
  [elements.bars, 'bars', true],
  [elements.swingUnit, 'swingUnit', true]
]) {
  element.addEventListener('change', () => {
    state[key] = numeric ? Number(element.value) : element.value;
    renderTracks();
    saveSoon();
  });
}

elements.globalSwing.addEventListener('input', () => {
  snapFeelRangeInput(elements.globalSwing);
  state.swing = clampSwing(elements.globalSwing.value);
  updateGlobalSwingControl();
  state.tracks.forEach(track => {
    if (track.swing !== null) return;
    const card = [...elements.trackBank.querySelectorAll('.track-card')].find(candidate => candidate.dataset.trackId === track.id);
    if (card) updateTrackFeelControls(track, card);
  });
  saveSoon();
});

document.addEventListener('pointerdown', event => {
  const input = event.target.closest('.feel-range input');
  if (input && !input.disabled) activeFeelRange = input;
});

window.addEventListener('pointerup', () => {
  const input = activeFeelRange;
  if (input && snapFeelRangeInput(input)) input.dispatchEvent(new Event('input', { bubbles: true }));
  activeFeelRange = null;
});

window.addEventListener('pointercancel', () => { activeFeelRange = null; });

document.querySelector('#reset-all').addEventListener('click', () => {
  stop();
  state.tracks = [];
  renderTracks();
  saveSoon();
});

document.querySelector('#theme-toggle').addEventListener('click', event => {
  const next = document.documentElement.dataset.theme === 'light' ? 'dark' : 'light';
  document.documentElement.dataset.theme = next;
  try { localStorage.setItem('personal-wiki-theme', next); } catch (error) {}
  event.currentTarget.textContent = next === 'dark' ? '☀' : '☾';
  event.currentTarget.title = `Switch to ${next === 'dark' ? 'light' : 'dark'} mode`;
  event.currentTarget.setAttribute('aria-label', event.currentTarget.title);
});

function refreshMidiOutputs() {
  const outputs = midiAccess ? [...midiAccess.outputs.values()].filter(output => output.state === 'connected') : [];
  const preferredId = pendingMidiOutputId || midiOutput?.id || outputs[0]?.id || '';
  elements.midiOutput.replaceChildren(new Option('Off', ''));
  outputs.forEach(output => elements.midiOutput.add(new Option(output.name || output.manufacturer || 'MIDI output', output.id)));
  elements.midiOutput.disabled = false;
  elements.midiOutput.value = outputs.some(output => output.id === preferredId) ? preferredId : '';
  midiOutput = elements.midiOutput.value ? midiAccess.outputs.get(elements.midiOutput.value) : null;
  if (midiOutput) pendingMidiOutputId = elements.midiOutput.value;
  state.midiOutputId = pendingMidiOutputId;
  if (midiOutput) elements.status.textContent = `MIDI: ${midiOutput.name}`;
}

async function enableMidi() {
  if (midiAccess) return;
  if (!navigator.requestMIDIAccess) throw new Error('Web MIDI is not supported by this browser');
  elements.midiEnable.disabled = true;
  elements.midiEnable.textContent = 'Connecting…';
  try {
    midiAccess = await navigator.requestMIDIAccess({ sysex: false });
    midiAccess.onstatechange = refreshMidiOutputs;
    refreshMidiOutputs();
    elements.midiEnable.disabled = false;
    elements.midiEnable.textContent = 'Disable MIDI';
    elements.status.textContent = midiOutput ? `MIDI: ${midiOutput.name}` : 'MIDI enabled; no output found';
    saveSoon();
  } catch (error) {
    midiAccess = null;
    midiOutput = null;
    elements.midiEnable.disabled = false;
    elements.midiEnable.textContent = 'Enable MIDI';
    throw error;
  }
}

function disableMidi() {
  clearMidiOutput();
  midiAccess?.outputs.forEach(output => output.close?.());
  if (midiAccess) midiAccess.onstatechange = null;
  midiAccess = null;
  midiOutput = null;
  elements.midiOutput.disabled = true;
  elements.midiEnable.disabled = false;
  elements.midiEnable.textContent = 'Enable MIDI';
  elements.status.textContent = 'MIDI disabled';
}

function toggleMidi() {
  if (midiAccess) disableMidi();
  else enableMidi().catch(error => { elements.status.textContent = `MIDI unavailable: ${error.message || error}`; });
}

function midiTimestamp(time) {
  return performance.now() + Math.max(0, time - audioContext.currentTime) * 1000;
}

function sendMidiTransport(message, time = null) {
  if (!midiOutput || !state.midiClock) return;
  try {
    if (time === null) midiOutput.send([message]);
    else midiOutput.send([message], midiTimestamp(time));
  } catch (error) {
    elements.status.textContent = `MIDI clock error: ${error.message || error}`;
  }
}

function scheduleMidiClock(time) {
  if (!midiOutput || !state.midiClock) return;
  const pulses = Math.max(1, Math.round(24 * (4 / meterParts().denominator) / state.subdivision));
  const duration = secondsPerSlot();
  try {
    for (let pulse = 0; pulse < pulses; pulse += 1) {
      midiOutput.send([0xF8], midiTimestamp(time + duration * pulse / pulses));
    }
  } catch (error) {
    elements.status.textContent = `MIDI clock error: ${error.message || error}`;
  }
}

function scheduleMidiInstrument(instrument, time, velocity) {
  if (!midiOutput) return;
  const channel = Math.max(0, Math.min(15, state.midiChannel - 1));
  const timestamp = midiTimestamp(time);
  try {
    if (Number.isFinite(instrument.openness)) {
      midiOutput.send([0xB0 | channel, 4, Math.max(0, Math.min(127, instrument.openness))], Math.max(performance.now(), timestamp - 1));
    }
    midiOutput.send([0x90 | channel, instrument.midi, Math.max(1, Math.min(127, Math.round(velocity)))], timestamp);
    midiOutput.send([0x80 | channel, instrument.midi, 0], timestamp + 70);
  } catch (error) {
    elements.status.textContent = `MIDI error: ${error.message || error}`;
  }
}

function clearMidiOutput() {
  if (!midiOutput) return;
  try {
    midiOutput.clear?.();
    if (midiClockRunning) midiOutput.send([0xFC]);
    const channel = Math.max(0, Math.min(15, state.midiChannel - 1));
    midiOutput.send([0xB0 | channel, 120, 0]);
    midiOutput.send([0xB0 | channel, 123, 0]);
  } catch (error) { /* disconnected outputs are refreshed by the state-change event */ }
  midiClockRunning = false;
}

elements.midiControls.addEventListener('toggle', () => {
  if (elements.midiControls.open && !midiAccess) {
    enableMidi().catch(error => { elements.status.textContent = `MIDI unavailable: ${error.message || error}`; });
  }
});
elements.midiEnable.addEventListener('click', toggleMidi);

elements.midiOutput.addEventListener('change', () => {
  const restart = playing;
  if (restart) stop();
  midiOutput = elements.midiOutput.value && midiAccess ? midiAccess.outputs.get(elements.midiOutput.value) : null;
  pendingMidiOutputId = elements.midiOutput.value;
  state.midiOutputId = pendingMidiOutputId;
  elements.status.textContent = midiOutput ? `MIDI: ${midiOutput.name}` : 'MIDI output off';
  saveSoon();
  if (restart) start().catch(error => { elements.status.textContent = error.message; });
});

elements.midiChannel.addEventListener('change', () => {
  state.midiChannel = Number(elements.midiChannel.value);
  saveSoon();
});

elements.midiClock.addEventListener('change', () => {
  const restart = playing;
  if (restart) stop();
  state.midiClock = elements.midiClock.checked;
  saveSoon();
  if (restart) start().catch(error => { elements.status.textContent = error.message; });
});

document.addEventListener('click', event => {
  const panel = document.querySelector('.midi-controls');
  if (panel.open && !panel.contains(event.target)) panel.open = false;
});

document.addEventListener('keydown', event => {
  if (event.key === 'Escape') document.querySelector('.midi-controls').open = false;
});

function noiseBuffer(duration = .18) {
  const frames = Math.max(1, Math.floor(audioContext.sampleRate * duration));
  const buffer = audioContext.createBuffer(1, frames, audioContext.sampleRate);
  const data = buffer.getChannelData(0);
  for (let index = 0; index < frames; index += 1) data[index] = Math.random() * 2 - 1;
  return buffer;
}

function envelope(node, time, peak, duration) {
  node.gain.setValueAtTime(.0001, time);
  node.gain.exponentialRampToValueAtTime(Math.max(.0002, peak), time + .003);
  node.gain.exponentialRampToValueAtTime(.0001, time + duration);
}

function oscillatorHit(time, frequency, level, duration, type = 'sine', fall = .55) {
  const oscillator = audioContext.createOscillator();
  const gain = audioContext.createGain();
  oscillator.type = type;
  oscillator.frequency.setValueAtTime(frequency, time);
  oscillator.frequency.exponentialRampToValueAtTime(Math.max(20, frequency * fall), time + duration);
  envelope(gain, time, level, duration);
  oscillator.connect(gain).connect(masterGain);
  activeAudioNodes.add(oscillator);
  oscillator.addEventListener('ended', () => activeAudioNodes.delete(oscillator), { once: true });
  oscillator.start(time);
  oscillator.stop(time + duration + .02);
}

function noiseHit(time, level, duration, highpass, lowpass = 18000) {
  const source = audioContext.createBufferSource();
  const high = audioContext.createBiquadFilter();
  const low = audioContext.createBiquadFilter();
  const gain = audioContext.createGain();
  source.buffer = noiseBuffer(duration + .03);
  high.type = 'highpass'; high.frequency.value = highpass;
  low.type = 'lowpass'; low.frequency.value = lowpass;
  envelope(gain, time, level, duration);
  source.connect(high).connect(low).connect(gain).connect(masterGain);
  activeAudioNodes.add(source);
  source.addEventListener('ended', () => activeAudioNodes.delete(source), { once: true });
  source.start(time);
}

function scheduleSound(instrument, time, velocity) {
  const level = Math.max(.03, Math.min(1, velocity / 127));
  const frequency = instrument.frequency || 180;
  if (instrument.sound === 'kick') oscillatorHit(time, frequency, level * .9, .18, 'sine', .28);
  else if (instrument.sound === 'snare') { noiseHit(time, level * .5, .13, 900, 10000); oscillatorHit(time, 190, level * .24, .09, 'triangle', .75); }
  else if (instrument.sound === 'rimshot') { noiseHit(time, level * .34, .055, 1500, 12000); oscillatorHit(time, frequency || 310, level * .38, .07, 'triangle', .8); }
  else if (instrument.sound === 'clap') { noiseHit(time, level * .24, .075, 700, 9500); noiseHit(time + .012, level * .2, .065, 800, 10000); noiseHit(time + .024, level * .18, .055, 900, 11000); }
  else if (instrument.sound === 'hat') noiseHit(time, level * .19, .045, 6000);
  else if (instrument.sound === 'openHat') noiseHit(time, level * .16, .28, 5200);
  else if (instrument.sound === 'crash') noiseHit(time, level * .17, .75, 2800);
  else if (instrument.sound === 'ride') { noiseHit(time, level * .12, .3, 3800); oscillatorHit(time, 520, level * .08, .24, 'square', .96); }
  else if (instrument.sound === 'tom') oscillatorHit(time, frequency, level * .6, .21, 'sine', .52);
  else if (instrument.sound === 'handDrum') oscillatorHit(time, frequency, level * .48, .14, 'triangle', .72);
  else if (instrument.sound === 'cowbell') { oscillatorHit(time, 540, level * .2, .14, 'square', .98); oscillatorHit(time, 800, level * .13, .11, 'square', .98); }
  else if (instrument.sound === 'bell') oscillatorHit(time, frequency || 920, level * .22, .34, 'sine', .99);
  else if (instrument.sound === 'click') oscillatorHit(time, frequency || 1000, level * .25, .045, 'triangle', .92);
  else if (instrument.sound === 'whistle') oscillatorHit(time, frequency, level * .16, .24, 'sine', .99);
  else noiseHit(time, level * .14, .085, 3200, 14000);
}

function clearHighlight() {
  document.querySelectorAll('.preview-slot.is-current').forEach(cell => cell.classList.remove('is-current'));
}

function trackCardById(trackId) {
  return [...elements.trackBank.querySelectorAll('.track-card')].find(card => card.dataset.trackId === trackId) || null;
}

function highlightTrackStep(trackId, slot) {
  const card = trackCardById(trackId);
  if (!card) return;
  card.querySelectorAll('.preview-slot.is-current').forEach(cell => cell.classList.remove('is-current'));
  card.querySelectorAll(`.preview-slot[data-slot="${slot}"]`).forEach(cell => cell.classList.add('is-current'));
}

function scheduleTrackVisual(trackId, slot, time) {
  const delay = Math.max(0, (time - audioContext.currentTime) * 1000);
  const timer = setTimeout(() => { visualTimers.delete(timer); if (playing) highlightTrackStep(trackId, slot); }, delay);
  visualTimers.add(timer);
}

function scheduleStep(slot, time) {
  scheduleMidiClock(time);
  for (const track of state.tracks) {
    const eventTime = time + trackTimingOffsetSeconds(slot, secondsPerSlot(), effectiveTrackSwing(track), track.timingOffsetMs, slotsPerSwingUnit());
    scheduleTrackVisual(track.id, slot, eventTime);
    if (track.muted || !evaluatePatternClauses(track.clauses, slot)) continue;
    const instrument = findInstrument(track.instrument);
    if (!instrument) continue;
    if (midiOutput) scheduleMidiInstrument(instrument, eventTime, track.level);
    else scheduleSound(instrument, eventTime, track.level);
  }
}

function scheduler() {
  const horizon = audioContext.currentTime + .1;
  while (nextStepTime < horizon) {
    nextStep %= totalSlots();
    scheduleStep(nextStep, nextStepTime);
    nextStep = (nextStep + 1) % totalSlots();
    nextStepTime += secondsPerSlot();
  }
}

async function start() {
  if (playing) return;
  audioContext ||= new AudioContext();
  await audioContext.resume();
  if (!masterGain) {
    masterGain = audioContext.createGain();
    masterGain.connect(audioContext.destination);
  }
  masterGain.gain.setValueAtTime(state.muted ? 0 : .72, audioContext.currentTime);
  playing = true;
  nextStep = 0;
  nextStepTime = audioContext.currentTime + .06;
  sendMidiTransport(0xFA, nextStepTime);
  midiClockRunning = Boolean(midiOutput && state.midiClock);
  scheduler();
  schedulerTimer = setInterval(scheduler, 25);
  elements.play.textContent = '■ Stop';
}

function stop() {
  playing = false;
  clearInterval(schedulerTimer);
  schedulerTimer = 0;
  visualTimers.forEach(clearTimeout);
  visualTimers.clear();
  activeAudioNodes.forEach(node => { try { node.stop(); } catch (error) {} });
  activeAudioNodes.clear();
  clearMidiOutput();
  clearHighlight();
  elements.play.textContent = '▶ Play';
}

elements.play.addEventListener('click', () => playing ? stop() : start().catch(error => {
  stop();
  elements.status.textContent = error.message;
}));

elements.mute.addEventListener('click', () => {
  state.muted = !state.muted;
  if (masterGain && audioContext) masterGain.gain.setTargetAtTime(state.muted ? 0 : .72, audioContext.currentTime, .01);
  elements.mute.textContent = state.muted ? '🔇' : '🔊';
  elements.mute.title = state.muted ? 'Unmute audio' : 'Mute audio';
  elements.mute.setAttribute('aria-label', elements.mute.title);
  saveSoon();
});

window.addEventListener('pagehide', stop);

initializeControls();
renderTracks();
const themeToggle = document.querySelector('#theme-toggle');
themeToggle.textContent = document.documentElement.dataset.theme === 'dark' ? '☀' : '☾';
