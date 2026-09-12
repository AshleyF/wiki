import { LETTER_NOTES, NOTE_RANGES, PIANO_NOTES, accuracy, addRandomNotes, chooseNextNote, letterPrompt, normalizeSelectedNotes, notesForSettings, removeRandomNotes, spreadSample } from './flashcard-core.js?v=20260911-note-focus-1';
import { midiName, midiToVexKey, vexAccidentalForKey } from '../piano/trainer-core.js?v=20260827-accidentals-1';
import { boostedAudioOutput } from '../shared/audio-output.js?v=20260910-2';
import { createScreenWakeLock } from '../shared/screen-wake-lock.js?v=20260911-1';

const KEYBOARD_FIRST_NOTE = 21;
const KEYBOARD_LAST_NOTE = 108;
const MODE_LABELS = { letter: 'Letter', staff: 'Grand staff', ear: 'Ear' };
const SETTINGS_KEY = 'piano-flashcard-settings';
const MODE_SETTINGS_KEY = 'piano-flashcard-prompt-modes';
const KEYBOARD_SCROLL_KEY = 'piano-flashcard-keyboard-scroll';
const MIDI_SETTINGS_KEY = 'piano-flashcard-midi-settings';
const CORRECT_FEEDBACK_DELAY_MS = 650;
const MINIMUM_KEY_NOTE_MS = 850;
const HELD_KEY_RELEASE_SECONDS = .16;

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
  settingsControls: document.querySelector('.settings-controls'),
  notePreset: document.querySelector('#note-preset'),
  notePicker: document.querySelector('#note-picker'),
  noteSelectionCount: document.querySelector('#note-selection-count'),
  randomFour: document.querySelector('#random-four'),
  removeOne: document.querySelector('#remove-one'),
  addOne: document.querySelector('#add-one'),
  selectAllNotes: document.querySelector('#select-all-notes'),
  resetNotes: document.querySelector('#reset-notes'),
  midiControls: document.querySelector('.midi-controls'),
  midiInput: document.querySelector('#midi-input'),
  midiOutput: document.querySelector('#midi-output'),
  theme: document.querySelector('#theme-toggle')
};

let modes = loadModes();
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
let hasSavedNoteSelection = false;
let settings = loadSettings();
let keyboardScrollOverride = loadKeyboardScrollOverride();
let programmedKeyboardScrollLeft = null;
let keyboardScrollSaveTimer = 0;
const screenWakeLock = createScreenWakeLock();
const heldNotes = new Map();

function loadModes() {
  try {
    const stored = JSON.parse(localStorage.getItem(MODE_SETTINGS_KEY) || '[]');
    const valid = Array.isArray(stored) ? stored.filter(mode => Object.hasOwn(MODE_LABELS, mode)) : [];
    if (valid.length) return new Set(valid);
  } catch (error) {}
  return new Set(['letter']);
}

function saveModes() {
  try { localStorage.setItem(MODE_SETTINGS_KEY, JSON.stringify([...modes])); } catch (error) {}
}

function hasMode(mode) {
  return modes.has(mode);
}

const naturalPreset = range => notesForSettings({ mode: 'staff', range, includeAccidentals: false });
const NOTE_PRESETS = Object.freeze({
  bass: naturalPreset('bass'),
  treble: naturalPreset('treble'),
  grand: naturalPreset('grand'),
  octave1: naturalPreset('octave1'),
  low: naturalPreset('low'),
  lowerMiddle: naturalPreset('lowerMiddle'),
  middle: LETTER_NOTES,
  upper: naturalPreset('upper'),
  octave6: naturalPreset('octave6'),
  octave7: naturalPreset('octave7'),
  two: naturalPreset('two'),
  piano: PIANO_NOTES
});

try {
  const midiSettings = JSON.parse(localStorage.getItem(MIDI_SETTINGS_KEY) || '{}');
  preferredMidiInputId = typeof midiSettings.inputId === 'string' ? midiSettings.inputId : '';
  preferredMidiOutputId = typeof midiSettings.outputId === 'string' ? midiSettings.outputId : '';
} catch (error) {}

function loadSettings() {
  let stored = {};
  try {
    const source = localStorage.getItem(SETTINGS_KEY);
    hasSavedNoteSelection = Boolean(source);
    stored = JSON.parse(source || '{}');
  } catch (error) {}
  // Older builds stored one setting per mode. Prefer the staff setting during
  // migration because that is where range and accidental selection matter most.
  const candidate = stored?.global || stored?.staff || stored;
  if (Array.isArray(candidate?.selectedNotes)) {
    let selectedNotes = normalizeSelectedNotes(candidate.selectedNotes);
    const expansionPool = Array.isArray(candidate.expansionPool)
      ? normalizeSelectedNotes(candidate.expansionPool)
      : selectedNotes;
    if (!selectedNotes.length && expansionPool.length) selectedNotes = expansionPool;
    if (!selectedNotes.length) return { selectedNotes: [...LETTER_NOTES], expansionPool: [...LETTER_NOTES] };
    return {
      selectedNotes,
      expansionPool: expansionPool.length ? expansionPool : selectedNotes
    };
  }
  const range = Object.hasOwn(NOTE_RANGES, candidate?.range) ? candidate.range : 'middle';
  const selectedNotes = notesForSettings({
    mode: 'staff',
    range,
    includeAccidentals: typeof candidate?.includeAccidentals === 'boolean' && candidate.includeAccidentals
  });
  return {
    selectedNotes,
    expansionPool: selectedNotes
  };
}

function saveSettings() {
  try { localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings)); } catch (error) {}
}

function loadKeyboardScrollOverride() {
  try {
    const source = localStorage.getItem(KEYBOARD_SCROLL_KEY);
    if (source === null) return null;
    const value = Number(source);
    return Number.isFinite(value) && value >= 0 ? value : null;
  } catch (error) {
    return null;
  }
}

function clearKeyboardScrollOverride() {
  keyboardScrollOverride = null;
  try { localStorage.removeItem(KEYBOARD_SCROLL_KEY); } catch (error) {}
}

function setKeyboardScroll(left) {
  const scroller = elements.keyboard.parentElement;
  if (!scroller) return;
  const target = Math.max(0, Math.min(scroller.scrollWidth - scroller.clientWidth, left));
  programmedKeyboardScrollLeft = target;
  scroller.scrollLeft = target;
  window.requestAnimationFrame(() => window.requestAnimationFrame(() => {
    if (programmedKeyboardScrollLeft === target) programmedKeyboardScrollLeft = null;
  }));
}

function restoreKeyboardScrollOverride() {
  if (keyboardScrollOverride === null) return false;
  setKeyboardScroll(keyboardScrollOverride);
  return true;
}

function sameNotes(left, right) {
  return left.length === right.length && left.every((note, index) => note === right[index]);
}

function matchingPreset(notes) {
  return Object.entries(NOTE_PRESETS).find(([, preset]) => sameNotes(notes, preset))?.[0] || '';
}

function syncSettingsControls() {
  const selected = new Set(settings.selectedNotes);
  const range = new Set(settings.expansionPool);
  elements.notePicker.querySelectorAll('[data-note-option]').forEach(key => {
    const note = Number(key.dataset.noteOption);
    const pressed = selected.has(note);
    key.classList.toggle('is-in-range', range.has(note));
    key.classList.toggle('is-selected', pressed);
    key.setAttribute('aria-pressed', String(pressed));
  });
  elements.notePreset.value = matchingPreset(settings.expansionPool);
  elements.noteSelectionCount.textContent = `${settings.selectedNotes.length} of ${settings.expansionPool.length}`;
  elements.randomFour.disabled = settings.expansionPool.length <= 4;
  elements.removeOne.disabled = settings.selectedNotes.length <= 1;
  elements.addOne.disabled = !settings.expansionPool.some(note => !selected.has(note));
  elements.selectAllNotes.disabled = sameNotes(settings.selectedNotes, settings.expansionPool);
  elements.resetNotes.disabled = sameNotes(settings.selectedNotes, LETTER_NOTES)
    && sameNotes(settings.expansionPool, LETTER_NOTES);
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

function staffModeForSelection(notes = settings.selectedNotes) {
  if (notes.length && notes.every(note => note < 60)) return 'bass';
  if (notes.length && notes.every(note => note >= 60)) return 'treble';
  return 'grand';
}

function renderStaff(note) {
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
  const renderer = new Flow.Renderer(elements.staffPrompt, Flow.Renderer.Backends.SVG);
  renderer.resize(width, height);
  const context = renderer.getContext();
  context.setFont('Arial', 10);

  const staffMode = staffModeForSelection();
  const clef = staffMode === 'grand' ? (note >= 60 ? 'treble' : 'bass') : staffMode;
  let stave;
  if (staffMode === 'grand') {
    const trebleY = compact ? -8 : 18;
    const bassY = compact ? Math.max(44, height - 81) : 108;
    const treble = new Flow.Stave(x, trebleY, staveWidth).addClef('treble');
    const bass = new Flow.Stave(x, bassY, staveWidth).addClef('bass');
    treble.setContext(context).draw();
    bass.setContext(context).draw();
    [Flow.StaveConnector.type.BRACE, Flow.StaveConnector.type.SINGLE_LEFT, Flow.StaveConnector.type.SINGLE_RIGHT]
      .forEach(type => new Flow.StaveConnector(treble, bass).setType(type).setContext(context).draw());
    stave = clef === 'treble' ? treble : bass;
  } else {
    const staveY = Math.round((height - 88) / 2);
    stave = new Flow.Stave(x, staveY, staveWidth).addClef(clef);
    stave.setContext(context).draw();
  }
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
  if (left < visibleLeft) setKeyboardScroll(Math.max(0, left - margin));
  else if (right > visibleRight) {
    setKeyboardScroll(Math.min(
      scroller.scrollWidth - scroller.clientWidth,
      right - scroller.clientWidth + margin
    ));
  }
}

function centerKeyboardOnNotes(notes, fallbackNote = 60) {
  const range = normalizeSelectedNotes(notes);
  const firstNote = range[0] ?? fallbackNote;
  const lastNote = range.at(-1) ?? fallbackNote;
  const firstKey = elements.keyboard.querySelector(`[data-midi="${firstNote}"]`);
  const lastKey = elements.keyboard.querySelector(`[data-midi="${lastNote}"]`);
  const scroller = elements.keyboard.parentElement;
  if (!firstKey || !lastKey || !scroller || scroller.scrollWidth <= scroller.clientWidth) return;
  const rangeCenter = (firstKey.offsetLeft + lastKey.offsetLeft + lastKey.offsetWidth) / 2;
  setKeyboardScroll(Math.max(0, Math.min(
    scroller.scrollWidth - scroller.clientWidth,
    rangeCenter - (scroller.clientWidth / 2)
  )));
}

function renderPrompt({ playEar = false } = {}) {
  elements.modeButtons.forEach(button => button.setAttribute('aria-pressed', String(hasMode(button.dataset.mode))));
  const staffMode = staffModeForSelection();
  const staffLabel = { bass: 'Bass clef', treble: 'Treble clef', grand: 'Grand staff' }[staffMode];
  elements.modeLabel.textContent = ['letter', 'staff', 'ear']
    .filter(hasMode)
    .map(mode => mode === 'staff' ? staffLabel : MODE_LABELS[mode])
    .join(' + ');
  const hasVisualPrompt = hasMode('letter') || hasMode('staff');
  elements.replay.hidden = !hasMode('ear');
  elements.letterPrompt.hidden = !hasMode('letter');
  elements.staffPrompt.hidden = !hasMode('staff');
  elements.earPrompt.hidden = !hasMode('ear') || hasVisualPrompt;
  elements.promptPanel.querySelector('.prompt').classList.toggle('has-letter', hasMode('letter'));
  elements.promptPanel.querySelector('.prompt').classList.toggle('has-staff', hasMode('staff'));

  if (!Number.isInteger(currentNote)) {
    elements.letterPrompt.textContent = '—';
    elements.staffPrompt.replaceChildren();
    return;
  }

  if (hasMode('letter')) {
    elements.letterPrompt.textContent = settings.selectedNotes.every(note => note >= 60 && note <= 71)
      ? letterPrompt(currentNote)
      : midiName(currentNote);
  }
  if (hasMode('staff')) renderStaff(currentNote);
  if (hasMode('ear') && playEar) playQuestion().catch(error => {
    console.warn('Could not play the ear-training question.', error);
    setStatus('Could not play this note. Try Hear again.');
  });
}

function nextQuestion({ playEar = hasMode('ear') } = {}) {
  window.clearTimeout(advanceTimer);
  questionLocked = false;
  clearKeyFeedback();
  previousNote = currentNote;
  const pool = notesForSettings({ selectedNotes: settings.selectedNotes });
  if (!pool.length) {
    currentNote = null;
    setStatus('Select at least one note.');
    renderPrompt({ playEar: false });
    return;
  }
  currentNote = chooseNextNote(pool, previousNote);
  setStatus(hasMode('ear') && !hasMode('letter') && !hasMode('staff') ? 'Play the note you hear.' : 'Play the matching key.');
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
  envelope.connect(boostedAudioOutput(audioContext));

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

function midiHeldNote(note, velocity = 92) {
  if (!selectedMidiOutput) return null;
  const output = selectedMidiOutput;
  try {
    output.send([0x90, note, velocity]);
    let stopped = false;
    return (releaseDelayMs = 0) => {
      if (stopped) return;
      stopped = true;
      try { output.send([0x80, note, 0], performance.now() + Math.max(0, releaseDelayMs)); } catch (error) {}
    };
  } catch (error) {
    console.warn('Could not send held MIDI note.', error);
    return null;
  }
}

async function synthesizeHeldNote(note) {
  audioContext ||= new AudioContext();
  await audioContext.resume();
  const now = audioContext.currentTime;
  const frequency = 440 * (2 ** ((note - 69) / 12));
  const envelope = audioContext.createGain();
  envelope.gain.setValueAtTime(.0001, now);
  envelope.gain.exponentialRampToValueAtTime(.24, now + .008);
  envelope.gain.exponentialRampToValueAtTime(.075, now + .18);
  envelope.connect(boostedAudioOutput(audioContext));

  const oscillators = [['triangle', 1, .7], ['sine', 2, .21], ['sine', 3, .09]].map(([type, multiple, level]) => {
    const oscillator = audioContext.createOscillator();
    const partial = audioContext.createGain();
    oscillator.type = type;
    oscillator.frequency.setValueAtTime(frequency * multiple, now);
    partial.gain.setValueAtTime(level, now);
    oscillator.connect(partial).connect(envelope);
    oscillator.start(now);
    return oscillator;
  });

  let stopped = false;
  return (releaseDelayMs = 0) => {
    if (stopped) return;
    stopped = true;
    const releaseTime = audioContext.currentTime;
    const releaseSeconds = Math.max(HELD_KEY_RELEASE_SECONDS, Math.max(0, releaseDelayMs) / 1000);
    if (typeof envelope.gain.cancelAndHoldAtTime === 'function') {
      envelope.gain.cancelAndHoldAtTime(releaseTime);
    } else {
      envelope.gain.cancelScheduledValues(releaseTime);
      envelope.gain.setValueAtTime(Math.max(.0001, envelope.gain.value), releaseTime);
    }
    envelope.gain.exponentialRampToValueAtTime(.0001, releaseTime + releaseSeconds);
    oscillators.forEach(oscillator => oscillator.stop(releaseTime + releaseSeconds + .02));
  };
}

function beginHeldNote(token, note) {
  endHeldNote(token, { immediate: true });
  const state = {
    startedAt: performance.now(),
    releaseRequested: false,
    forceStop: false,
    stop: null
  };
  heldNotes.set(token, state);
  const midiStop = midiHeldNote(note);
  const stopPromise = midiStop ? Promise.resolve(midiStop) : synthesizeHeldNote(note);
  stopPromise.then(stop => {
    state.stop = stop;
    if (state.forceStop) finishHeldNote(token, state);
    else if (state.releaseRequested) finishHeldNote(token, state, remainingMinimumNoteTime(state));
  }).catch(error => {
    if (heldNotes.get(token) === state) heldNotes.delete(token);
    console.warn('Could not play held key.', error);
  });
}

function remainingMinimumNoteTime(state) {
  return Math.max(0, MINIMUM_KEY_NOTE_MS - (performance.now() - state.startedAt));
}

function finishHeldNote(token, state, releaseDelayMs = 0) {
  state.stop?.(releaseDelayMs);
  if (heldNotes.get(token) === state) heldNotes.delete(token);
}

function endHeldNote(token, { immediate = false } = {}) {
  const state = heldNotes.get(token);
  if (!state) return;
  state.releaseRequested = true;
  if (immediate) {
    state.forceStop = true;
    if (state.stop) finishHeldNote(token, state);
  } else if (state.stop) finishHeldNote(token, state, remainingMinimumNoteTime(state));
}

function endAllHeldNotes() {
  [...heldNotes.keys()].forEach(token => endHeldNote(token, { immediate: true }));
}

async function playNote(note, { duration = 650 } = {}) {
  if (!midiOutputNote(note, 92, duration)) await synthesizeNote(note, duration);
}

async function playQuestion() {
  if (!hasMode('ear') || currentNote === null) return;
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
    const advanceDelay = hasMode('ear')
      ? Math.max(CORRECT_FEEDBACK_DELAY_MS, MINIMUM_KEY_NOTE_MS + 50)
      : CORRECT_FEEDBACK_DELAY_MS;
    advanceTimer = window.setTimeout(() => nextQuestion(), advanceDelay);
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
    key.addEventListener('pointerdown', event => {
      event.preventDefault();
      const token = `pointer:${event.pointerId}`;
      key.setPointerCapture?.(event.pointerId);
      answer(note, { sound: false });
      beginHeldNote(token, note);
    });
    ['pointerup', 'pointercancel', 'lostpointercapture'].forEach(type => {
      key.addEventListener(type, event => endHeldNote(`pointer:${event.pointerId}`));
    });
    key.addEventListener('keydown', event => {
      if ((event.key !== ' ' && event.key !== 'Enter') || event.repeat) return;
      event.preventDefault();
      const token = `key:${note}`;
      answer(note, { sound: false });
      beginHeldNote(token, note);
    });
    key.addEventListener('keyup', event => {
      if (event.key !== ' ' && event.key !== 'Enter') return;
      event.preventDefault();
      endHeldNote(`key:${note}`);
    });
    elements.keyboard.append(key);
  }
  elements.keyboard.style.width = `${whiteCount * whiteWidth}px`;
}

function isBlackKey(note) {
  return [1, 3, 6, 8, 10].includes(note % 12);
}

function renderNotePicker() {
  const notes = Array.from(
    { length: KEYBOARD_LAST_NOTE - KEYBOARD_FIRST_NOTE + 1 },
    (_, index) => KEYBOARD_FIRST_NOTE + index
  );
  const whiteCount = notes.filter(note => !isBlackKey(note)).length;
  const whiteWidth = 100 / whiteCount;
  const blackWidth = whiteWidth * .62;
  let whiteIndex = 0;
  elements.notePicker.replaceChildren();

  notes.forEach(note => {
    const black = isBlackKey(note);
    const key = document.createElement('button');
    key.type = 'button';
    key.className = `note-picker-key${black ? ' is-black' : ''}`;
    key.dataset.noteOption = String(note);
    key.setAttribute('aria-label', midiName(note));
    key.setAttribute('aria-pressed', 'false');
    key.addEventListener('click', event => {
      if (event.detail !== 0) return;
      const selected = new Set(settings.selectedNotes);
      if (selected.has(note)) selected.delete(note);
      else selected.add(note);
      applyNoteSelection([...selected], { expansionPool: [...selected] });
    });
    key.style.width = `${black ? blackWidth : whiteWidth}%`;
    if (black) {
      key.style.left = `${(whiteIndex * whiteWidth) - (blackWidth / 2)}%`;
    } else {
      key.style.left = `${whiteIndex * whiteWidth}%`;
      whiteIndex += 1;
    }
    elements.notePicker.append(key);
  });
}

function applyNoteSelection(notes, { expansionPool = notes, askQuestion = true, forceRangeCenter = false } = {}) {
  let selectedNotes = normalizeSelectedNotes(notes);
  let nextRange = normalizeSelectedNotes(expansionPool);
  if (!selectedNotes.length && nextRange.length) selectedNotes = [nextRange[0]];
  if (!selectedNotes.length) {
    selectedNotes = [...LETTER_NOTES];
    nextRange = [...LETTER_NOTES];
  }
  const rangeChanged = forceRangeCenter || !sameNotes(nextRange, settings.expansionPool);
  settings = {
    selectedNotes,
    expansionPool: nextRange
  };
  saveSettings();
  syncSettingsControls();
  if (rangeChanged) {
    clearKeyboardScrollOverride();
    centerKeyboardOnNotes(settings.expansionPool);
  }
  if (askQuestion) nextQuestion({ playEar: hasMode('ear') });
}

let pickerGesture = null;

function pickerKeyAtPoint(clientX, clientY) {
  return document.elementFromPoint(clientX, clientY)?.closest?.('[data-note-option]') || null;
}

function paintPickerKey(key) {
  if (!pickerGesture || !key) return;
  const note = Number(key.dataset.noteOption);
  if (isBlackKey(note) !== pickerGesture.black || pickerGesture.visited.has(note)) return;
  pickerGesture.visited.add(note);
  if (pickerGesture.selecting) {
    pickerGesture.notes.add(note);
    if (pickerGesture.editRange || !pickerGesture.range.has(note)) pickerGesture.range.add(note);
  } else {
    if (pickerGesture.notes.size > 1) {
      pickerGesture.notes.delete(note);
      if (pickerGesture.editRange) pickerGesture.range.delete(note);
    }
  }
  const notes = normalizeSelectedNotes([...pickerGesture.notes]);
  const range = normalizeSelectedNotes([...pickerGesture.range]);
  const selected = new Set(notes);
  const inRange = new Set(range);
  elements.notePicker.querySelectorAll('[data-note-option]').forEach(option => {
    const optionNote = Number(option.dataset.noteOption);
    const pressed = selected.has(optionNote);
    option.classList.toggle('is-in-range', inRange.has(optionNote));
    option.classList.toggle('is-selected', pressed);
    option.setAttribute('aria-pressed', String(pressed));
  });
  elements.notePreset.value = matchingPreset(range);
  elements.noteSelectionCount.textContent = `${notes.length} of ${range.length}`;
}

function finishPickerGesture(event) {
  if (!pickerGesture || (event.pointerId !== undefined && event.pointerId !== pickerGesture.pointerId)) return;
  const notes = normalizeSelectedNotes([...pickerGesture.notes]);
  const range = normalizeSelectedNotes([...pickerGesture.range]);
  pickerGesture = null;
  applyNoteSelection(notes, { expansionPool: range });
}

elements.notePicker.addEventListener('pointerdown', event => {
  const key = event.target.closest('[data-note-option]');
  if (!key) return;
  event.preventDefault();
  const note = Number(key.dataset.noteOption);
  pickerGesture = {
    pointerId: event.pointerId,
    black: isBlackKey(note),
    selecting: !settings.selectedNotes.includes(note),
    editRange: sameNotes(settings.selectedNotes, settings.expansionPool),
    notes: new Set(settings.selectedNotes),
    range: new Set(settings.expansionPool),
    visited: new Set()
  };
  elements.notePicker.setPointerCapture?.(event.pointerId);
  paintPickerKey(key);
});

elements.notePicker.addEventListener('pointermove', event => {
  if (!pickerGesture || event.pointerId !== pickerGesture.pointerId) return;
  event.preventDefault();
  paintPickerKey(pickerKeyAtPoint(event.clientX, event.clientY));
});
elements.notePicker.addEventListener('pointerup', finishPickerGesture);
elements.notePicker.addEventListener('pointercancel', finishPickerGesture);

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
  endAllHeldNotes();
  if (selectedMidiInput) selectedMidiInput.onmidimessage = null;
  selectedMidiInput = midiAccess?.inputs.get(elements.midiInput.value) || null;
  selectedMidiOutput = midiAccess?.outputs.get(elements.midiOutput.value) || null;
  if (selectedMidiInput) selectedMidiInput.onmidimessage = onMidiMessage;
  void screenWakeLock.setActive(Boolean(selectedMidiInput || selectedMidiOutput));
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
  elements.midiInput.replaceChildren(new Option('None', ''), ...inputs.map(port => new Option(port.name || 'MIDI input', port.id)));
  elements.midiOutput.replaceChildren(new Option('None', ''), ...outputs.map(port => new Option(port.name || 'MIDI output', port.id)));
  elements.midiInput.disabled = false;
  elements.midiOutput.disabled = false;
  elements.midiInput.value = inputs.some(port => port.id === preferredMidiInputId)
    ? preferredMidiInputId
    : (inputs.some(port => port.id === previousInput) ? previousInput : '');
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
  try {
    midiAccess = await navigator.requestMIDIAccess({ sysex: false });
    midiAccess.onstatechange = refreshMidiPorts;
    refreshMidiPorts();
    setStatus(selectedMidiInput ? `MIDI input: ${selectedMidiInput.name}` : 'MIDI enabled.');
  } catch (error) {
    midiAccess = null;
    selectedMidiInput = null;
    selectedMidiOutput = null;
    setStatus(`Could not enable MIDI: ${error.message || error}`);
  }
}

function toggleMode(nextMode) {
  if (!MODE_LABELS[nextMode]) return;
  if (hasMode(nextMode)) {
    if (modes.size === 1) return;
    modes.delete(nextMode);
  } else {
    modes.add(nextMode);
  }
  saveModes();
  renderPrompt({ playEar: nextMode === 'ear' && hasMode('ear') });
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

elements.modeButtons.forEach(button => button.addEventListener('click', () => toggleMode(button.dataset.mode)));
elements.replay.addEventListener('click', () => playQuestion().catch(error => console.warn('Could not replay note.', error)));
elements.resetStats.addEventListener('click', resetStats);
elements.notePreset.addEventListener('change', () => {
  const preset = NOTE_PRESETS[elements.notePreset.value];
  if (preset) applyNoteSelection(preset, { expansionPool: preset, forceRangeCenter: true });
});
elements.randomFour.addEventListener('click', () => {
  const pool = settings.expansionPool;
  if (!pool.length) return;
  applyNoteSelection(spreadSample(pool, 4), { expansionPool: pool });
});
elements.removeOne.addEventListener('click', () => {
  if (settings.selectedNotes.length <= 1) return;
  applyNoteSelection(removeRandomNotes(settings.selectedNotes, 1), {
    expansionPool: settings.expansionPool
  });
});
elements.addOne.addEventListener('click', () => {
  applyNoteSelection(addRandomNotes(settings.selectedNotes, settings.expansionPool, 1), {
    expansionPool: settings.expansionPool
  });
});
elements.selectAllNotes.addEventListener('click', () => {
  applyNoteSelection(settings.expansionPool, { expansionPool: settings.expansionPool });
});
elements.resetNotes.addEventListener('click', () => {
  applyNoteSelection(LETTER_NOTES, { expansionPool: LETTER_NOTES, forceRangeCenter: true });
});
elements.midiControls.addEventListener('toggle', () => {
  if (elements.midiControls.open && !midiAccess) {
    enableMidi().catch(error => setStatus(`Could not enable MIDI: ${error.message || error}`));
  }
});

[elements.settingsControls, elements.midiControls].forEach(disclosure => {
  disclosure.addEventListener('toggle', () => {
    if (!disclosure.open) return;
    [elements.settingsControls, elements.midiControls].forEach(other => {
      if (other !== disclosure) other.open = false;
    });
  });
});

document.addEventListener('pointerdown', event => {
  [elements.settingsControls, elements.midiControls].forEach(disclosure => {
    if (disclosure.open && !disclosure.contains(event.target)) disclosure.open = false;
  });
}, true);
document.addEventListener('keydown', event => {
  if (event.key === 'Escape') {
    elements.settingsControls.open = false;
    elements.midiControls.open = false;
  }
});
elements.midiInput.addEventListener('change', selectMidiPorts);
elements.midiOutput.addEventListener('change', selectMidiPorts);
elements.theme.addEventListener('click', () => {
  const next = document.documentElement.dataset.theme === 'light' ? 'dark' : 'light';
  document.documentElement.dataset.theme = next;
  try { localStorage.setItem('personal-wiki-theme', next); } catch (error) {}
  syncThemeButton();
});

elements.keyboard.parentElement.addEventListener('scroll', () => {
  const manualScrollLeft = elements.keyboard.parentElement.scrollLeft;
  if (programmedKeyboardScrollLeft !== null && Math.abs(manualScrollLeft - programmedKeyboardScrollLeft) < 1) return;
  window.clearTimeout(keyboardScrollSaveTimer);
  keyboardScrollSaveTimer = window.setTimeout(() => {
    keyboardScrollOverride = manualScrollLeft;
    try { localStorage.setItem(KEYBOARD_SCROLL_KEY, String(keyboardScrollOverride)); } catch (error) {}
  }, 120);
}, { passive: true });

let resizeTimer = 0;
window.addEventListener('resize', () => {
  window.clearTimeout(resizeTimer);
  resizeTimer = window.setTimeout(() => {
    endAllHeldNotes();
    renderKeyboard();
    if (hasMode('staff')) renderStaff(currentNote);
    if (!restoreKeyboardScrollOverride()) centerKeyboardOnNotes(settings.expansionPool);
    ensureTargetVisible();
  }, 100);
});
window.addEventListener('blur', endAllHeldNotes);
document.addEventListener('visibilitychange', () => {
  if (document.hidden) endAllHeldNotes();
});

renderKeyboard();
renderNotePicker();
syncThemeButton();
syncSettingsControls();
if (!restoreKeyboardScrollOverride()) {
  centerKeyboardOnNotes(hasSavedNoteSelection ? settings.expansionPool : [60]);
}
nextQuestion({ playEar: false });
