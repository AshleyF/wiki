import { classifyAttempt, classifyMidiPress, cursorXAtTimeline, heldPressReady, midiName, midiToVexKey, samePitchSet } from './trainer-core.js?v=20260822-held-midi-1';

const DRILLS = [
  {
    id: 'middle-c-and-d',
    level: 'Level 1 · First notes',
    title: 'Middle C and D',
    clef: 'treble',
    notes: [60, 62, 60, 62, 62, 60, 62, 60, 60, 60, 62, 62, 60, 62, 62, 60]
  },
  {
    id: 'middle-c-d-e',
    level: 'Level 1 · First notes',
    title: 'Middle C, D, and E',
    clef: 'treble',
    notes: [60, 62, 64, 62, 60, 64, 62, 60, 64, 60, 62, 64, 62, 64, 60, 60]
  },
  {
    id: 'treble-five-notes',
    level: 'Level 2 · Five-note position',
    title: 'C through G · stepwise',
    clef: 'treble',
    notes: [60, 62, 64, 65, 67, 65, 64, 62, 60, 64, 67, 62, 65, 64, 62, 60]
  },
  {
    id: 'treble-five-note-reading',
    level: 'Level 2 · Five-note position',
    title: 'C through G · mixed reading',
    clef: 'treble',
    notes: [60, 64, 62, 67, 65, 60, 67, 62, 64, 65, 62, 60, 64, 67, 65, 60]
  },
  {
    id: 'treble-octave',
    level: 'Level 3 · Natural-note octave',
    title: 'Treble clef · C through C',
    clef: 'treble',
    notes: [60, 62, 64, 65, 67, 69, 71, 72, 71, 69, 67, 65, 64, 62, 60, 60]
  },
  {
    id: 'treble-skips',
    level: 'Level 3 · Natural-note octave',
    title: 'Treble clef · lines and spaces',
    clef: 'treble',
    notes: [60, 64, 62, 65, 64, 67, 65, 69, 67, 71, 69, 72, 71, 67, 64, 60]
  },
  {
    id: 'bass-steps',
    level: 'Level 3 · Natural-note octave',
    title: 'Bass clef · C through middle C',
    clef: 'bass',
    notes: [48, 50, 52, 53, 55, 57, 59, 60, 59, 57, 55, 53, 52, 50, 48, 48]
  },
  {
    id: 'mary-little-lamb',
    level: 'Songs · Public domain',
    title: 'Mary Had a Little Lamb',
    clef: 'treble',
    events: [
      [64, 1], [62, 1], [60, 1], [62, 1], [64, 1], [64, 1], [64, 2],
      [62, 1], [62, 1], [62, 2], [64, 1], [67, 1], [67, 2],
      [64, 1], [62, 1], [60, 1], [62, 1], [64, 1], [64, 1], [64, 1], [64, 1],
      [62, 1], [62, 1], [64, 1], [62, 1], [60, 4]
    ]
  },
  {
    id: 'three-blind-mice',
    level: 'Songs · Public domain',
    title: 'Three Blind Mice',
    clef: 'treble',
    events: [
      [64, 1], [62, 1], [60, 2], [64, 1], [62, 1], [60, 2],
      [67, 1], [65, 1], [64, 2], [67, 1], [65, 1], [64, 2],
      [60, 1], [62, 1], [64, 1], [65, 1], [67, 2], [67, 2],
      [60, 1], [62, 1], [64, 1], [65, 1], [67, 4]
    ]
  },
  {
    id: 'twinkle',
    level: 'Songs · Public domain',
    title: 'Twinkle, Twinkle, Little Star',
    clef: 'treble',
    events: [
      [60, 1], [60, 1], [67, 1], [67, 1], [69, 1], [69, 1], [67, 2],
      [65, 1], [65, 1], [64, 1], [64, 1], [62, 1], [62, 1], [60, 2],
      [67, 1], [67, 1], [65, 1], [65, 1], [64, 1], [64, 1], [62, 2],
      [67, 1], [67, 1], [65, 1], [65, 1], [64, 1], [64, 1], [62, 2],
      [60, 1], [60, 1], [67, 1], [67, 1], [69, 1], [69, 1], [67, 2],
      [65, 1], [65, 1], [64, 1], [64, 1], [62, 1], [62, 1], [60, 2]
    ]
  },
  {
    id: 'ode-to-joy',
    level: 'Songs · Public domain',
    title: 'Ode to Joy',
    clef: 'treble',
    events: [
      [64, 1], [64, 1], [65, 1], [67, 1], [67, 1], [65, 1], [64, 1], [62, 1],
      [60, 1], [60, 1], [62, 1], [64, 1], [64, 2], [62, 1], [62, 1],
      [64, 1], [64, 1], [65, 1], [67, 1], [67, 1], [65, 1], [64, 1], [62, 1],
      [60, 1], [60, 1], [62, 1], [64, 1], [62, 2], [60, 2]
    ]
  },
  {
    id: 'thirds',
    level: 'Chords · Introduction',
    title: 'Two-note chords · thirds',
    clef: 'treble',
    events: [
      [[60, 64], 2], [[62, 65], 2], [[64, 67], 2], [[65, 69], 2],
      [[67, 71], 2], [[65, 69], 2], [[64, 67], 2], [[60, 64], 2]
    ]
  },
  {
    id: 'primary-triads',
    level: 'Chords · Introduction',
    title: 'C, F, and G major triads',
    clef: 'treble',
    events: [
      [[60, 64, 67], 2], [[60, 65, 69], 2], [[59, 62, 67], 2], [[60, 64, 67], 2],
      [[60, 65, 69], 2], [[60, 64, 67], 2], [[59, 62, 67], 2], [[60, 64, 67], 2]
    ]
  }
];

const elements = {
  start: document.querySelector('#start'),
  drill: document.querySelector('#drill'),
  tempo: document.querySelector('#tempo'),
  tolerance: document.querySelector('#tolerance'),
  toleranceOutput: document.querySelector('#tolerance-output'),
  drillTitle: document.querySelector('#drill-title'),
  progress: document.querySelector('#progress'),
  status: document.querySelector('#status'),
  score: document.querySelector('#score'),
  scoreStage: document.querySelector('#score-stage'),
  scoreScroll: document.querySelector('#score-scroll'),
  cursor: document.querySelector('#cursor'),
  enableMidi: document.querySelector('#enable-midi'),
  midiInput: document.querySelector('#midi-input'),
  theme: document.querySelector('#theme-toggle'),
  keyboardPanel: document.querySelector('.keyboard-panel'),
  keyboard: document.querySelector('#test-keyboard'),
  chordHold: document.querySelector('#chord-hold'),
  playChord: document.querySelector('#play-chord'),
  clearChord: document.querySelector('#clear-chord')
};

let drill = DRILLS[0];
let events = normalizeEvents(drill);
let beatOffsets = eventBeatOffsets(events);
let noteXs = [];
let noteElements = [];
let running = false;
let paused = false;
let currentIndex = 0;
let startTime = 0;
let animationFrame = 0;
let midiAccess = null;
let selectedMidiInput = null;
let keyboardAudioContext = null;
let pendingMidiChord = new Set();
let pendingMidiChordTimer = 0;
let heldMidiNotes = new Set();
let heldAttemptIndex = -1;
let heldAttemptNotes = [];
let keyboardChord = new Set();
let chordHold = false;

function normalizeEvents(source) {
  const rawEvents = Array.isArray(source?.events)
    ? source.events
    : Array.isArray(source?.notes)
      ? source.notes.map(note => [note, 1])
      : null;
  if (!rawEvents?.length) throw new Error(`The drill “${source?.title || 'Untitled'}” has no playable notes.`);

  return rawEvents.map((entry, index) => {
    if (!Array.isArray(entry)) throw new Error(`Event ${index + 1} in “${source.title}” is malformed.`);
    const [pitchOrChord, duration = 1] = entry;
    const notes = Array.isArray(pitchOrChord) ? pitchOrChord : [pitchOrChord];
    const beats = Number(duration);
    if (!notes.length || notes.some(note => !Number.isInteger(note) || note < 0 || note > 127)) {
      throw new Error(`Event ${index + 1} in “${source.title}” has an invalid MIDI note.`);
    }
    if (!Number.isFinite(beats) || beats <= 0) {
      throw new Error(`Event ${index + 1} in “${source.title}” has an invalid duration.`);
    }
    return { notes, beats };
  });
}

function eventBeatOffsets(source) {
  let beat = 0;
  return source.map(event => {
    const offset = beat;
    beat += event.beats;
    return offset;
  });
}

function expectedNotes(index = currentIndex) { return events[index]?.notes || []; }
function expectedLabel(index = currentIndex) { return expectedNotes(index).map(midiName).join(' + '); }

function beatMs() { return 60000 / Math.max(30, Math.min(180, Number(elements.tempo.value) || 72)); }
function toleranceMs() { return Math.max(40, Math.min(350, Number(elements.tolerance.value) || 160)); }
function earlyHoldAllowanceMs() { return Math.min(500, beatMs() / 2); }
function dueTime(index) { return startTime + (beatOffsets[index] || 0) * beatMs(); }

function setStatus(message) { elements.status.textContent = message; }

function clearKeyboardHint() {
  elements.keyboard.querySelectorAll('.piano-key.is-hint').forEach(key => key.classList.remove('is-hint'));
}

function updateChordControls() {
  elements.chordHold.setAttribute('aria-pressed', String(chordHold));
  elements.playChord.disabled = keyboardChord.size === 0;
  elements.clearChord.disabled = keyboardChord.size === 0;
  elements.keyboard.querySelectorAll('.piano-key').forEach(key => {
    key.classList.toggle('is-selected', keyboardChord.has(Number(key.dataset.midi)));
  });
}

function clearKeyboardChord() {
  keyboardChord.clear();
  updateChordControls();
}

function setChordHold(enabled) {
  chordHold = Boolean(enabled);
  if (!chordHold) clearKeyboardChord();
  else updateChordControls();
}

function showExpectedKey() {
  clearKeyboardHint();
  elements.keyboardPanel.open = true;
  const keys = expectedNotes().map(midi => elements.keyboard.querySelector(`[data-midi="${midi}"]`)).filter(Boolean);
  keys.forEach(key => key.classList.add('is-hint'));
  const scroller = elements.keyboard.parentElement;
  if (keys.length && scroller) {
    const center = (keys[0].offsetLeft + keys.at(-1).offsetLeft + keys.at(-1).offsetWidth) / 2;
    scroller.scrollLeft = Math.max(0, center - scroller.clientWidth / 2);
  }
}

function updateProgress() {
  elements.progress.textContent = `${Math.min(currentIndex, events.length)} / ${events.length}`;
}

function markCurrent() {
  noteElements.forEach((element, index) => element?.classList.toggle('is-current', (running || paused) && index === currentIndex));
}

function clearHeldAttempt() {
  heldAttemptIndex = -1;
  heldAttemptNotes = [];
}

function heldAttemptIsDown() {
  return heldAttemptIndex === currentIndex && heldAttemptNotes.every(note => heldMidiNotes.has(note));
}

function markCurrentCorrect() {
  clearHeldAttempt();
  noteElements[currentIndex]?.classList.remove('is-current', 'is-wrong');
  noteElements[currentIndex]?.classList.add('is-correct');
  currentIndex += 1;
  updateProgress();
}

function stop(message = 'Stopped.') {
  running = false;
  paused = false;
  clearKeyboardHint();
  cancelAnimationFrame(animationFrame);
  clearHeldAttempt();
  elements.start.textContent = currentIndex ? 'Try again' : 'Start';
  elements.cursor.hidden = currentIndex === 0;
  markCurrent();
  setStatus(message);
}

function fail(kind, played = null) {
  const expected = expectedNotes();
  const expectedName = expectedLabel();
  noteElements[currentIndex]?.classList.add('is-wrong');
  const messages = {
    early: `${played === null ? 'Note' : played.map(midiName).join(' + ')} was early. Play ${expectedName} again to continue.`,
    late: `Missed ${expectedName}. Play ${expectedName} to continue.`,
    wrong: `Expected ${expectedName}, heard ${played.map(midiName).join(' + ')}. Play ${expectedName} to continue.`
  };
  running = false;
  paused = true;
  clearHeldAttempt();
  cancelAnimationFrame(animationFrame);
  elements.cursor.hidden = false;
  elements.cursor.style.left = `${noteXs[currentIndex]}px`;
  elements.start.textContent = 'Restart';
  markCurrent();
  showExpectedKey();
  setStatus(messages[kind]);
}

function complete() {
  running = false;
  paused = false;
  clearKeyboardHint();
  cancelAnimationFrame(animationFrame);
  clearHeldAttempt();
  elements.cursor.hidden = false;
  elements.start.textContent = 'Again';
  markCurrent();
  setStatus('Drill complete.');
}

function positionCursor(now) {
  const x = cursorXAtTimeline(now, startTime, beatMs(), beatOffsets, noteXs);
  elements.cursor.style.left = `${x}px`;
  const desired = Math.max(0, x - elements.scoreScroll.clientWidth / 2);
  elements.scoreScroll.scrollLeft = Math.min(desired, elements.scoreScroll.scrollWidth - elements.scoreScroll.clientWidth);
}

function tick(now) {
  if (!running) return;
  positionCursor(now);
  if (heldPressReady({
    candidateIndex: heldAttemptIndex,
    currentIndex,
    candidateNotes: heldAttemptNotes,
    heldNotes: heldMidiNotes,
    now,
    due: dueTime(currentIndex),
    tolerance: toleranceMs()
  })) {
    const difference = now - dueTime(currentIndex);
    markCurrentCorrect();
    if (currentIndex >= events.length) {
      complete();
      return;
    }
    markCurrent();
    setStatus(`${difference >= 0 ? '+' : '−'}${Math.abs(Math.round(difference))} ms · next ${expectedLabel()}`);
  } else if (heldAttemptIndex === currentIndex && !heldAttemptIsDown()) {
    clearHeldAttempt();
  }
  if (now > dueTime(currentIndex) + toleranceMs()) {
    fail('late');
    return;
  }
  animationFrame = requestAnimationFrame(tick);
}

function start() {
  if (running) {
    stop();
    return;
  }
  currentIndex = 0;
  clearHeldAttempt();
  heldMidiNotes.clear();
  clearKeyboardHint();
  clearKeyboardChord();
  noteElements.forEach(element => element?.classList.remove('is-correct', 'is-wrong', 'is-current'));
  updateProgress();
  elements.scoreScroll.scrollLeft = 0;
  elements.cursor.hidden = false;
  running = true;
  paused = false;
  startTime = performance.now() + beatMs();
  elements.start.textContent = 'Stop';
  setStatus('Count in…');
  markCurrent();
  animationFrame = requestAnimationFrame(tick);
  window.setTimeout(() => { if (running && currentIndex === 0) setStatus(`Play ${expectedLabel(0)}.`); }, beatMs());
}

function handleInput(played, velocity = 100, { midi = false } = {}) {
  const playedNotes = Array.isArray(played) ? played : [played];
  if (velocity <= 0 || currentIndex >= events.length || (!running && !paused)) return;
  const now = performance.now();
  if (paused) {
    if (!samePitchSet(playedNotes, expectedNotes())) {
      fail('wrong', playedNotes);
      return;
    }
    clearKeyboardHint();
    const recoveredIndex = currentIndex;
    markCurrentCorrect();
    if (currentIndex >= events.length) {
      complete();
      return;
    }
    paused = false;
    running = true;
    startTime = now - beatOffsets[recoveredIndex] * beatMs();
    elements.start.textContent = 'Stop';
    markCurrent();
    setStatus(`Continue · next ${expectedLabel()}`);
    animationFrame = requestAnimationFrame(tick);
    return;
  }
  const result = midi ? classifyMidiPress({
    played: playedNotes,
    expected: expectedNotes(),
    now,
    due: dueTime(currentIndex),
    tolerance: toleranceMs(),
    holdAllowance: earlyHoldAllowanceMs()
  }) : classifyAttempt({
    played: playedNotes,
    expected: expectedNotes(),
    now,
    due: dueTime(currentIndex),
    tolerance: toleranceMs()
  });
  if (result.result === 'held') {
    heldAttemptIndex = currentIndex;
    heldAttemptNotes = [...playedNotes];
    setStatus(`Hold ${expectedLabel()} · a little early`);
    return;
  }
  if (result.result !== 'correct') {
    fail(result.result, playedNotes);
    return;
  }
  markCurrentCorrect();
  if (currentIndex >= events.length) {
    complete();
    return;
  }
  markCurrent();
  setStatus(`${result.difference >= 0 ? '+' : '−'}${Math.abs(Math.round(result.difference))} ms · next ${expectedLabel()}`);
}

async function playKeyboardNote(midi) {
  keyboardAudioContext ||= new AudioContext();
  await keyboardAudioContext.resume();
  const now = keyboardAudioContext.currentTime;
  const frequency = 440 * 2 ** ((midi - 69) / 12);
  const envelope = keyboardAudioContext.createGain();
  envelope.gain.setValueAtTime(0.0001, now);
  envelope.gain.exponentialRampToValueAtTime(0.22, now + 0.008);
  envelope.gain.exponentialRampToValueAtTime(0.075, now + 0.16);
  envelope.gain.exponentialRampToValueAtTime(0.0001, now + 1.15);
  envelope.connect(keyboardAudioContext.destination);

  [
    ['triangle', 1, 0.68],
    ['sine', 2, 0.22],
    ['sine', 3, 0.10]
  ].forEach(([type, multiple, level]) => {
    const oscillator = keyboardAudioContext.createOscillator();
    const partial = keyboardAudioContext.createGain();
    oscillator.type = type;
    oscillator.frequency.setValueAtTime(frequency * multiple, now);
    partial.gain.setValueAtTime(level, now);
    oscillator.connect(partial).connect(envelope);
    oscillator.start(now);
    oscillator.stop(now + 1.16);
  });
}

function makeVexNote(Flow, event, clef) {
  const keys = event.notes.map(midiToVexKey);
  const durations = { 1: 'q', 2: 'h', 4: 'w' };
  const note = new Flow.StaveNote({ clef, keys, duration: durations[event.beats] || 'q' });
  keys.forEach((key, index) => {
    if (key.includes('#')) note.addModifier(new Flow.Accidental('#'), index);
    else if (key.includes('b')) note.addModifier(new Flow.Accidental('b'), index);
  });
  return note;
}

function eventsByMeasure() {
  const measures = [];
  let measure = [];
  let beats = 0;
  events.forEach(event => {
    if (beats + event.beats > 4) throw new Error(`An event crosses a barline in ${drill.title}.`);
    measure.push(event);
    beats += event.beats;
    if (beats === 4) {
      measures.push(measure);
      measure = [];
      beats = 0;
    }
  });
  if (measure.length) throw new Error(`The final measure is incomplete in ${drill.title}.`);
  return measures;
}

function renderScore() {
  stop('Choose Start when ready.');
  const Flow = window.Vex?.Flow;
  elements.score.replaceChildren();
  noteXs = [];
  noteElements = [];
  elements.drillTitle.textContent = drill.title;
  currentIndex = 0;
  updateProgress();
  if (!Flow) {
    setStatus('Notation library unavailable.');
    return;
  }

  const measures = eventsByMeasure();
  if (!measures.length) throw new Error(`The drill “${drill.title}” has no complete measures.`);
  const compactLandscape = window.matchMedia('(max-width: 900px) and (orientation: landscape)').matches;
  const availableWidth = Math.floor(elements.scoreScroll.clientWidth || 0);
  const width = Math.max(compactLandscape ? 800 : 900, availableWidth, measures.length * (compactLandscape ? 200 : 225));
  const measureWidth = (width - 18) / measures.length;
  const height = compactLandscape ? 190 : 235;
  elements.score.style.width = `${width}px`;
  elements.scoreStage.style.width = `${width}px`;
  const renderer = new Flow.Renderer(elements.score, Flow.Renderer.Backends.SVG);
  renderer.resize(width, height);
  const context = renderer.getContext();
  context.setFont('Arial', 10);

  for (let measure = 0; measure < measures.length; measure += 1) {
    const x = 8 + measure * measureWidth;
    const stave = new Flow.Stave(x, compactLandscape ? 38 : 56, measureWidth);
    if (measure === 0) stave.addClef(drill.clef).addTimeSignature('4/4');
    stave.setContext(context).draw();
    const source = measures[measure];
    const notes = source.map(event => makeVexNote(Flow, event, drill.clef));
    const voice = new Flow.Voice({ num_beats: 4, beat_value: 4 });
    voice.addTickables(notes);
    new Flow.Formatter().joinVoices([voice]).format([voice], measureWidth - (measure === 0 ? 105 : 48));
    voice.draw(context, stave);
    notes.forEach(note => {
      noteXs.push(note.getAbsoluteX());
      const group = note.getSVGElement?.() || null;
      group?.classList.add('trainer-note');
      noteElements.push(group);
    });
  }
}

function chooseDrill() {
  try {
    drill = DRILLS.find(candidate => candidate.id === elements.drill.value) || DRILLS[0];
    events = normalizeEvents(drill);
    beatOffsets = eventBeatOffsets(events);
    clearTimeout(pendingMidiChordTimer);
    pendingMidiChord.clear();
    clearKeyboardChord();
    const chordDrill = events.some(event => event.notes.length > 1);
    setChordHold(chordDrill);
    if (chordDrill) elements.keyboardPanel.open = true;
    renderScore();
  } catch (error) {
    console.error('Unable to load piano drill:', error);
    stop('This drill could not be loaded.');
    elements.score.replaceChildren();
    elements.drillTitle.textContent = drill?.title || 'Unavailable drill';
    elements.progress.textContent = '0 / 0';
    setStatus(error instanceof Error ? error.message : 'This drill could not be loaded.');
  }
}

function submitPendingMidiChord(velocity = 100) {
  clearTimeout(pendingMidiChordTimer);
  if (!pendingMidiChord.size) return;
  const notes = [...pendingMidiChord];
  pendingMidiChord.clear();
  handleInput(notes, velocity, { midi: true });
}

function onMidiMessage(event) {
  const [status, note, velocity = 0] = event.data;
  const command = status & 0xf0;
  const noteOff = command === 0x80 || (command === 0x90 && velocity <= 0);
  if (noteOff) {
    heldMidiNotes.delete(note);
    pendingMidiChord.delete(note);
    if (heldAttemptNotes.includes(note)) clearHeldAttempt();
    return;
  }
  if (command !== 0x90) return;
  heldMidiNotes.add(note);
  if (expectedNotes().length <= 1) {
    pendingMidiChord.clear();
    handleInput([note], velocity, { midi: true });
    return;
  }
  pendingMidiChord.add(note);
  clearTimeout(pendingMidiChordTimer);
  if (pendingMidiChord.size >= expectedNotes().length) submitPendingMidiChord(velocity);
  else pendingMidiChordTimer = window.setTimeout(() => submitPendingMidiChord(velocity), 70);
}

function selectMidiInput() {
  if (selectedMidiInput) selectedMidiInput.onmidimessage = null;
  selectedMidiInput = midiAccess?.inputs.get(elements.midiInput.value) || null;
  if (selectedMidiInput) {
    selectedMidiInput.onmidimessage = onMidiMessage;
    setStatus(`MIDI input: ${selectedMidiInput.name}`);
  }
}

function refreshMidiInputs() {
  const inputs = midiAccess ? [...midiAccess.inputs.values()].filter(input => input.state !== 'disconnected') : [];
  const previous = elements.midiInput.value;
  elements.midiInput.replaceChildren(new Option(inputs.length ? 'Choose input' : 'No input found', ''), ...inputs.map(input => new Option(input.name || 'MIDI input', input.id)));
  elements.midiInput.disabled = inputs.length === 0;
  elements.midiInput.value = inputs.some(input => input.id === previous) ? previous : (inputs[0]?.id || '');
  selectMidiInput();
}

async function enableMidi() {
  if (!navigator.requestMIDIAccess) {
    setStatus('Web MIDI is not available in this browser.');
    return;
  }
  elements.enableMidi.disabled = true;
  elements.enableMidi.textContent = 'Connecting…';
  try {
    midiAccess = await navigator.requestMIDIAccess({ sysex: false });
    midiAccess.onstatechange = refreshMidiInputs;
    refreshMidiInputs();
    elements.enableMidi.textContent = 'MIDI enabled';
  } catch (error) {
    elements.enableMidi.disabled = false;
    elements.enableMidi.textContent = 'Enable MIDI';
    setStatus(`Could not enable MIDI: ${error.message || error}`);
  }
}

function renderKeyboard() {
  elements.keyboard.replaceChildren();
  const compactLandscape = window.matchMedia('(max-width: 900px) and (orientation: landscape)').matches;
  const whiteKeyWidth = compactLandscape ? 46 : 52;
  const blackKeyWidth = compactLandscape ? 30 : 34;
  let whiteIndex = 0;
  for (let midi = 48; midi <= 72; midi += 1) {
    const black = [1, 3, 6, 8, 10].includes(midi % 12);
    const button = document.createElement('button');
    button.className = `piano-key${black ? ' is-black' : ''}`;
    button.type = 'button';
    button.style.width = `${black ? blackKeyWidth : whiteKeyWidth}px`;
    button.textContent = midiName(midi);
    button.dataset.midi = String(midi);
    button.setAttribute('aria-label', midiName(midi));
    if (black) button.style.left = `${whiteIndex * whiteKeyWidth - blackKeyWidth / 2}px`;
    else {
      button.style.left = `${whiteIndex * whiteKeyWidth}px`;
      whiteIndex += 1;
    }
    button.addEventListener('click', () => {
      playKeyboardNote(midi).catch(error => console.warn('Could not play keyboard note.', error));
      if (chordHold) {
        if (keyboardChord.has(midi)) keyboardChord.delete(midi);
        else keyboardChord.add(midi);
        updateChordControls();
      } else handleInput([midi]);
    });
    elements.keyboard.append(button);
  }
  elements.keyboard.style.width = `${whiteIndex * whiteKeyWidth}px`;
}

function syncThemeButton() {
  const dark = document.documentElement.dataset.theme !== 'light';
  elements.theme.textContent = dark ? '☀' : '☾';
  elements.theme.title = dark ? 'Switch to light mode' : 'Switch to dark mode';
  elements.theme.setAttribute('aria-label', elements.theme.title);
}

elements.start.addEventListener('click', start);
elements.drill.addEventListener('change', chooseDrill);
elements.tempo.addEventListener('change', () => { if (running) stop('Tempo changed. Start again.'); });
elements.tolerance.addEventListener('input', () => { elements.toleranceOutput.textContent = `±${toleranceMs()} ms`; });
elements.enableMidi.addEventListener('click', enableMidi);
elements.midiInput.addEventListener('change', selectMidiInput);
elements.chordHold.addEventListener('click', () => setChordHold(!chordHold));
elements.clearChord.addEventListener('click', clearKeyboardChord);
elements.playChord.addEventListener('click', () => {
  if (!keyboardChord.size) return;
  const notes = [...keyboardChord];
  clearKeyboardChord();
  notes.forEach(note => playKeyboardNote(note).catch(error => console.warn('Could not play keyboard note.', error)));
  handleInput(notes);
});
elements.theme.addEventListener('click', () => {
  const next = document.documentElement.dataset.theme === 'light' ? 'dark' : 'light';
  document.documentElement.dataset.theme = next;
  try { localStorage.setItem('personal-wiki-theme', next); } catch (error) {}
  syncThemeButton();
});

const drillGroups = new Map();
DRILLS.forEach(item => {
  if (!drillGroups.has(item.level)) drillGroups.set(item.level, []);
  drillGroups.get(item.level).push(item);
});
elements.drill.replaceChildren(...[...drillGroups].map(([level, drills]) => {
  const group = document.createElement('optgroup');
  group.label = level;
  group.append(...drills.map(item => new Option(item.title, item.id)));
  return group;
}));
renderKeyboard();
syncThemeButton();
chooseDrill();
