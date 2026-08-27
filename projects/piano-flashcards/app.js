import { accuracy, chooseNextNote, letterPrompt, notesForSettings } from './flashcard-core.js?v=20260826-3';
import { midiName, midiToVexKey, vexAccidentalForKey } from '../piano/trainer-core.js?v=20260827-accidentals-1';

const KEYBOARD_FIRST_NOTE = 36;
const KEYBOARD_LAST_NOTE = 84;
const MODE_LABELS = { letter: 'Letter', staff: 'Grand staff', ear: 'Ear' };
const DEFAULT_SETTINGS = Object.freeze({ range: 'middle', includeAccidentals: false });
const SETTINGS_KEY = 'piano-flashcard-settings';
const MIDI_SETTINGS_KEY = 'piano-flashcard-midi-settings';
const CORRECT_FEEDBACK_DELAY_MS = 650;

const elements = {
  modeButtons: [...document.querySelectorAll('[data-mode]')],
  replay: document.querySelector('#replay'),
  promptPanel: document.querySelector('.prompt-panel'),
  modeLabel: document.querySelector('#mode-label'),
  status: document.querySelector('#status'),
  letterPrompt: document.querySelector('#letter-prompt'),
  staffPrompt: document.querySelector('#staff-prompt'),
  earPrompt: document.querySelector('#ear-prompt'),
  keyboard: document.querySelector('#keyboard'),
  correct: document.querySelector('#correct-count'),
  missed: document.querySelector('#miss-count'),
  streak: document.querySelector('#streak-count'),
  accuracy: document.querySelector('#accuracy'),
  resetStats: document.querySelector('#reset-stats'),
  noteRange: document.querySelector('#note-range'),
  includeAccidentals: document.querySelector('#include-accidentals'),
  enableMidi: document.querySelector('#enable-midi'),
  midiControls: document.querySelector('.midi-controls'),
  midiInput: document.querySelector('#midi-input'),
  midiOutput: document.querySelector('#midi-output'),
  theme: document.querySelector('#theme-toggle')
};

let mode = 'letter';
let currentNote = null;
let previousNote = null;
let correctCount = 0;
let missedCount = 0;
let streakCount = 0;
let advanceTimer = 0;
let audioContext = null;
let midiAccess = null;
let selectedMidiInput = null;
let selectedMidiOutput = null;
let preferredMidiInputId = '';
let preferredMidiOutputId = '';
let questionLocked = false;
let settings = loadSettings();

try {
  const midiSettings = JSON.parse(localStorage.getItem(MIDI_SETTINGS_KEY) || '{}');
  preferredMidiInputId = typeof midiSettings.inputId === 'string' ? midiSettings.inputId : '';
  preferredMidiOutputId = typeof midiSettings.outputId === 'string' ? midiSettings.outputId : '';
} catch (error) {}

function loadSettings() {
  let stored = {};
  try { stored = JSON.parse(localStorage.getItem(SETTINGS_KEY) || '{}'); } catch (error) {}
  // Older builds stored one setting per mode. Prefer the staff setting during
  // migration because that is where range and accidental selection matter most.
  const candidate = stored?.global || stored?.staff || stored;
  return {
    range: ['middle', 'two', 'grand'].includes(candidate?.range) ? candidate.range : DEFAULT_SETTINGS.range,
    includeAccidentals: typeof candidate?.includeAccidentals === 'boolean'
      ? candidate.includeAccidentals
      : DEFAULT_SETTINGS.includeAccidentals
  };
}

function saveSettings() {
  try { localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings)); } catch (error) {}
}

function currentSettings() {
  return settings;
}

function syncSettingsControls() {
  const settings = currentSettings();
  elements.noteRange.value = settings.range;
  elements.includeAccidentals.checked = settings.includeAccidentals;
}

function setStatus(message) {
  elements.status.textContent = message;
}

function clearKeyFeedback() {
  elements.promptPanel.classList.remove('is-correct', 'is-wrong');
  elements.keyboard.querySelectorAll('.is-correct, .is-wrong, .is-answer').forEach(key => {
    key.classList.remove('is-correct', 'is-wrong', 'is-answer');
  });
}

function updateStats() {
  elements.correct.textContent = String(correctCount);
  elements.missed.textContent = String(missedCount);
  elements.streak.textContent = String(streakCount);
  const percent = accuracy(correctCount, missedCount);
  elements.accuracy.textContent = percent === null ? '—' : `${percent}%`;
}

function renderGrandStaff(note) {
  const Flow = window.Vex?.Flow;
  elements.staffPrompt.replaceChildren();
  if (!Flow) {
    setStatus('Notation library unavailable.');
    return;
  }

  const compact = window.matchMedia('(max-width: 900px) and (orientation: landscape)').matches;
  const width = Math.max(320, Math.floor(elements.staffPrompt.clientWidth || 620));
  const availableHeight = Math.floor(elements.staffPrompt.clientHeight || (compact ? 126 : 218));
  const height = compact ? Math.max(112, Math.min(132, availableHeight)) : 218;
  const staveWidth = Math.min(width - 24, compact ? 520 : 640);
  const x = Math.max(8, Math.round((width - staveWidth) / 2));
  const trebleY = compact ? -8 : 18;
  const bassY = compact ? Math.max(44, height - 81) : 108;
  const renderer = new Flow.Renderer(elements.staffPrompt, Flow.Renderer.Backends.SVG);
  renderer.resize(width, height);
  const context = renderer.getContext();
  context.setFont('Arial', 10);

  const treble = new Flow.Stave(x, trebleY, staveWidth).addClef('treble');
  const bass = new Flow.Stave(x, bassY, staveWidth).addClef('bass');
  treble.setContext(context).draw();
  bass.setContext(context).draw();
  new Flow.StaveConnector(treble, bass)
    .setType(Flow.StaveConnector.type.BRACE)
    .setContext(context)
    .draw();
  new Flow.StaveConnector(treble, bass)
    .setType(Flow.StaveConnector.type.SINGLE_LEFT)
    .setContext(context)
    .draw();
  new Flow.StaveConnector(treble, bass)
    .setType(Flow.StaveConnector.type.SINGLE_RIGHT)
    .setContext(context)
    .draw();

  const clef = note >= 60 ? 'treble' : 'bass';
  const stave = clef === 'treble' ? treble : bass;
  const key = midiToVexKey(note);
  const vexNote = new Flow.StaveNote({ clef, keys: [key], duration: 'w' });
  const accidental = vexAccidentalForKey(key);
  if (accidental) vexNote.addModifier(new Flow.Accidental(accidental), 0);
  const voice = new Flow.Voice({ num_beats: 4, beat_value: 4 }).addTickables([vexNote]);
  new Flow.Formatter().joinVoices([voice]).formatToStave([voice], stave);
  voice.draw(context, stave);
  const noteGroup = vexNote.getSVGElement?.();
  const desiredX = x + (staveWidth / 2);
  const shiftX = desiredX - vexNote.getAbsoluteX();
  if (noteGroup && Number.isFinite(shiftX)) {
    const existingTransform = noteGroup.getAttribute('transform');
    noteGroup.setAttribute('transform', `${existingTransform ? `${existingTransform} ` : ''}translate(${shiftX} 0)`);
  }
  noteGroup?.classList.add('flashcard-note');
}

function ensureTargetVisible(note = currentNote) {
  const key = elements.keyboard.querySelector(`[data-midi="${note}"]`);
  const scroller = elements.keyboard.parentElement;
  if (!key || !scroller || scroller.scrollWidth <= scroller.clientWidth) return;
  const margin = Math.min(42, scroller.clientWidth * 0.12);
  const left = key.offsetLeft;
  const right = left + key.offsetWidth;
  const visibleLeft = scroller.scrollLeft + margin;
  const visibleRight = scroller.scrollLeft + scroller.clientWidth - margin;
  if (left < visibleLeft) scroller.scrollLeft = Math.max(0, left - margin);
  else if (right > visibleRight) {
    scroller.scrollLeft = Math.min(
      scroller.scrollWidth - scroller.clientWidth,
      right - scroller.clientWidth + margin
    );
  }
}

function renderPrompt({ playEar = false } = {}) {
  elements.modeButtons.forEach(button => button.setAttribute('aria-pressed', String(button.dataset.mode === mode)));
  elements.modeLabel.textContent = MODE_LABELS[mode];
  elements.replay.hidden = mode !== 'ear';
  elements.letterPrompt.hidden = mode !== 'letter';
  elements.staffPrompt.hidden = mode !== 'staff';
  elements.earPrompt.hidden = mode !== 'ear';

  if (mode === 'letter') {
    elements.letterPrompt.textContent = currentSettings().range === 'middle'
      ? letterPrompt(currentNote)
      : midiName(currentNote);
  }
  if (mode === 'staff') renderGrandStaff(currentNote);
  if (mode === 'ear' && playEar) playQuestion().catch(error => {
    console.warn('Could not play the ear-training question.', error);
    setStatus('Could not play this note. Try Hear again.');
  });
}

function nextQuestion({ playEar = mode === 'ear' } = {}) {
  window.clearTimeout(advanceTimer);
  questionLocked = false;
  clearKeyFeedback();
  previousNote = currentNote;
  currentNote = chooseNextNote(notesForSettings({ mode, ...currentSettings() }), previousNote);
  setStatus(mode === 'ear' ? 'Play the note you hear.' : 'Play the matching key.');
  renderPrompt({ playEar });
  ensureTargetVisible();
}

function midiOutputNote(note, velocity = 92, duration = 650) {
  if (!selectedMidiOutput) return false;
  const now = performance.now();
  try {
    selectedMidiOutput.send([0x90, note, velocity], now);
    selectedMidiOutput.send([0x80, note, 0], now + duration);
    return true;
  } catch (error) {
    console.warn('Could not send MIDI note.', error);
    return false;
  }
}

async function synthesizeNote(note, duration = 700) {
  audioContext ||= new AudioContext();
  await audioContext.resume();
  const now = audioContext.currentTime;
  const seconds = Math.max(0.18, duration / 1000);
  const frequency = 440 * (2 ** ((note - 69) / 12));
  const envelope = audioContext.createGain();
  envelope.gain.setValueAtTime(0.0001, now);
  envelope.gain.exponentialRampToValueAtTime(0.24, now + 0.008);
  envelope.gain.exponentialRampToValueAtTime(0.075, now + Math.min(0.18, seconds * 0.35));
  envelope.gain.exponentialRampToValueAtTime(0.0001, now + seconds);
  envelope.connect(audioContext.destination);

  [['triangle', 1, 0.7], ['sine', 2, 0.21], ['sine', 3, 0.09]].forEach(([type, multiple, level]) => {
    const oscillator = audioContext.createOscillator();
    const partial = audioContext.createGain();
    oscillator.type = type;
    oscillator.frequency.setValueAtTime(frequency * multiple, now);
    partial.gain.setValueAtTime(level, now);
    oscillator.connect(partial).connect(envelope);
    oscillator.start(now);
    oscillator.stop(now + seconds + 0.02);
  });
}

async function playNote(note, { duration = 650 } = {}) {
  if (!midiOutputNote(note, 92, duration)) await synthesizeNote(note, duration);
}

async function playQuestion() {
  if (mode !== 'ear' || currentNote === null) return;
  await playNote(currentNote, { duration: 850 });
}

function answer(note, { sound = true } = {}) {
  if (!Number.isInteger(note) || currentNote === null || questionLocked) return;
  if (sound) playNote(note, { duration: 360 }).catch(error => console.warn('Could not play key.', error));
  const key = elements.keyboard.querySelector(`[data-midi="${note}"]`);
  if (note === currentNote) {
    questionLocked = true;
    correctCount += 1;
    streakCount += 1;
    key?.classList.add('is-correct');
    elements.promptPanel.classList.add('is-correct');
    setStatus(`${midiName(note)} · correct`);
    updateStats();
    advanceTimer = window.setTimeout(() => nextQuestion(), CORRECT_FEEDBACK_DELAY_MS);
    return;
  }

  missedCount += 1;
  streakCount = 0;
  key?.classList.add('is-wrong');
  elements.keyboard.querySelector(`[data-midi="${currentNote}"]`)?.classList.add('is-answer');
  elements.promptPanel.classList.remove('is-correct');
  elements.promptPanel.classList.add('is-wrong');
  ensureTargetVisible();
  setStatus(`${midiName(note)} is not it. Try the highlighted key.`);
  updateStats();
}

function keyGeometry() {
  const whiteCount = Array.from({ length: KEYBOARD_LAST_NOTE - KEYBOARD_FIRST_NOTE + 1 }, (_, index) => KEYBOARD_FIRST_NOTE + index)
    .filter(note => ![1, 3, 6, 8, 10].includes(note % 12)).length;
  const available = Math.max(300, elements.keyboard.parentElement?.clientWidth || window.innerWidth);
  const compact = window.matchMedia('(max-width: 900px) and (orientation: landscape)').matches;
  const whiteWidth = Math.max(compact ? 24 : 32, Math.min(compact ? 32 : 48, Math.floor((available - 2) / whiteCount)));
  return { whiteCount, whiteWidth, blackWidth: Math.round(whiteWidth * 0.64) };
}

function renderKeyboard() {
  const { whiteCount, whiteWidth, blackWidth } = keyGeometry();
  elements.keyboard.replaceChildren();
  let whiteIndex = 0;
  for (let note = KEYBOARD_FIRST_NOTE; note <= KEYBOARD_LAST_NOTE; note += 1) {
    const black = [1, 3, 6, 8, 10].includes(note % 12);
    const key = document.createElement('button');
    key.className = `piano-key${black ? ' is-black' : ''}`;
    key.type = 'button';
    key.dataset.midi = String(note);
    key.setAttribute('aria-label', midiName(note));
    key.style.width = `${black ? blackWidth : whiteWidth}px`;
    key.textContent = note % 12 === 0 ? midiName(note) : '';
    if (black) key.style.left = `${whiteIndex * whiteWidth - (blackWidth / 2)}px`;
    else {
      key.style.left = `${whiteIndex * whiteWidth}px`;
      whiteIndex += 1;
    }
    key.addEventListener('click', () => answer(note));
    elements.keyboard.append(key);
  }
  elements.keyboard.style.width = `${whiteCount * whiteWidth}px`;
}

function onMidiMessage(event) {
  const [status, note, velocity = 0] = event.data;
  const command = status & 0xf0;
  if (command !== 0x90 || velocity <= 0) return;
  answer(note, { sound: false });
}

function saveMidiSettings() {
  try {
    localStorage.setItem(MIDI_SETTINGS_KEY, JSON.stringify({
      inputId: preferredMidiInputId,
      outputId: preferredMidiOutputId
    }));
  } catch (error) {}
}

function selectMidiPorts({ persist = true } = {}) {
  if (selectedMidiInput) selectedMidiInput.onmidimessage = null;
  selectedMidiInput = midiAccess?.inputs.get(elements.midiInput.value) || null;
  selectedMidiOutput = midiAccess?.outputs.get(elements.midiOutput.value) || null;
  if (selectedMidiInput) selectedMidiInput.onmidimessage = onMidiMessage;
  if (persist) {
    preferredMidiInputId = elements.midiInput.value;
    preferredMidiOutputId = elements.midiOutput.value;
    saveMidiSettings();
  }
}

function refreshMidiPorts() {
  const inputs = midiAccess ? [...midiAccess.inputs.values()].filter(port => port.state !== 'disconnected') : [];
  const outputs = midiAccess ? [...midiAccess.outputs.values()].filter(port => port.state !== 'disconnected') : [];
  const previousInput = elements.midiInput.value;
  const previousOutput = elements.midiOutput.value;
  elements.midiInput.replaceChildren(new Option(inputs.length ? 'Choose input' : 'No input found', ''), ...inputs.map(port => new Option(port.name || 'MIDI input', port.id)));
  elements.midiOutput.replaceChildren(new Option('Browser sound', ''), ...outputs.map(port => new Option(port.name || 'MIDI output', port.id)));
  elements.midiInput.disabled = inputs.length === 0;
  elements.midiOutput.disabled = outputs.length === 0;
  elements.midiInput.value = inputs.some(port => port.id === preferredMidiInputId)
    ? preferredMidiInputId
    : (inputs.some(port => port.id === previousInput) ? previousInput : (inputs[0]?.id || ''));
  elements.midiOutput.value = outputs.some(port => port.id === preferredMidiOutputId)
    ? preferredMidiOutputId
    : (outputs.some(port => port.id === previousOutput) ? previousOutput : '');
  selectMidiPorts({ persist: false });
}

async function enableMidi() {
  if (midiAccess) return;
  if (!navigator.requestMIDIAccess) {
    setStatus('Web MIDI is unavailable in this browser.');
    return;
  }
  elements.enableMidi.disabled = true;
  elements.enableMidi.textContent = 'Connecting…';
  try {
    midiAccess = await navigator.requestMIDIAccess({ sysex: false });
    midiAccess.onstatechange = refreshMidiPorts;
    refreshMidiPorts();
    elements.enableMidi.disabled = false;
    elements.enableMidi.textContent = 'Disable MIDI';
    setStatus(selectedMidiInput ? `MIDI input: ${selectedMidiInput.name}` : 'MIDI enabled.');
  } catch (error) {
    midiAccess = null;
    selectedMidiInput = null;
    selectedMidiOutput = null;
    elements.enableMidi.disabled = false;
    elements.enableMidi.textContent = 'Enable MIDI';
    setStatus(`Could not enable MIDI: ${error.message || error}`);
  }
}

function disableMidi() {
  if (selectedMidiInput) selectedMidiInput.onmidimessage = null;
  midiAccess?.inputs.forEach(port => port.close?.());
  midiAccess?.outputs.forEach(port => port.close?.());
  if (midiAccess) midiAccess.onstatechange = null;
  midiAccess = null;
  selectedMidiInput = null;
  selectedMidiOutput = null;
  elements.midiInput.disabled = true;
  elements.midiOutput.disabled = true;
  elements.enableMidi.disabled = false;
  elements.enableMidi.textContent = 'Enable MIDI';
  setStatus('MIDI disabled.');
}

function toggleMidi() {
  if (midiAccess) disableMidi();
  else enableMidi().catch(error => setStatus(`Could not enable MIDI: ${error.message || error}`));
}

function setMode(nextMode) {
  if (!MODE_LABELS[nextMode] || nextMode === mode) return;
  mode = nextMode;
  nextQuestion({ playEar: mode === 'ear' });
}

function updateSettings() {
  settings = {
    range: elements.noteRange.value,
    includeAccidentals: elements.includeAccidentals.checked
  };
  saveSettings();
  nextQuestion({ playEar: mode === 'ear' });
}

function resetStats() {
  correctCount = 0;
  missedCount = 0;
  streakCount = 0;
  updateStats();
  setStatus('Session statistics reset.');
}

function syncThemeButton() {
  const dark = document.documentElement.dataset.theme !== 'light';
  elements.theme.textContent = dark ? '☀' : '☾';
  elements.theme.title = dark ? 'Switch to light mode' : 'Switch to dark mode';
  elements.theme.setAttribute('aria-label', elements.theme.title);
}

elements.modeButtons.forEach(button => button.addEventListener('click', () => setMode(button.dataset.mode)));
elements.replay.addEventListener('click', () => playQuestion().catch(error => console.warn('Could not replay note.', error)));
elements.resetStats.addEventListener('click', resetStats);
elements.noteRange.addEventListener('change', updateSettings);
elements.includeAccidentals.addEventListener('change', updateSettings);
elements.midiControls.addEventListener('toggle', () => {
  if (elements.midiControls.open && !midiAccess) {
    enableMidi().catch(error => setStatus(`Could not enable MIDI: ${error.message || error}`));
  }
});
elements.enableMidi.addEventListener('click', toggleMidi);
elements.midiInput.addEventListener('change', selectMidiPorts);
elements.midiOutput.addEventListener('change', selectMidiPorts);
elements.theme.addEventListener('click', () => {
  const next = document.documentElement.dataset.theme === 'light' ? 'dark' : 'light';
  document.documentElement.dataset.theme = next;
  try { localStorage.setItem('personal-wiki-theme', next); } catch (error) {}
  syncThemeButton();
});

let resizeTimer = 0;
window.addEventListener('resize', () => {
  window.clearTimeout(resizeTimer);
  resizeTimer = window.setTimeout(() => {
    renderKeyboard();
    if (mode === 'staff') renderGrandStaff(currentNote);
    ensureTargetVisible();
  }, 100);
});

renderKeyboard();
syncThemeButton();
syncSettingsControls();
nextQuestion({ playEar: false });
