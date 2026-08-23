import { classifyAttempt, cursorXAt, midiName, midiToVexKey } from './trainer-core.js';

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
  keyboard: document.querySelector('#test-keyboard')
};

let drill = DRILLS[0];
let noteXs = [];
let noteElements = [];
let running = false;
let paused = false;
let currentIndex = 0;
let startTime = 0;
let animationFrame = 0;
let midiAccess = null;
let selectedMidiInput = null;

function beatMs() { return 60000 / Math.max(30, Math.min(180, Number(elements.tempo.value) || 72)); }
function toleranceMs() { return Math.max(40, Math.min(350, Number(elements.tolerance.value) || 160)); }
function dueTime(index) { return startTime + index * beatMs(); }

function setStatus(message) { elements.status.textContent = message; }

function updateProgress() {
  elements.progress.textContent = `${Math.min(currentIndex, drill.notes.length)} / ${drill.notes.length}`;
}

function markCurrent() {
  noteElements.forEach((element, index) => element?.classList.toggle('is-current', (running || paused) && index === currentIndex));
}

function stop(message = 'Stopped.') {
  running = false;
  paused = false;
  cancelAnimationFrame(animationFrame);
  elements.start.textContent = currentIndex ? 'Try again' : 'Start';
  elements.cursor.hidden = currentIndex === 0;
  markCurrent();
  setStatus(message);
}

function fail(kind, played = null) {
  const expected = drill.notes[currentIndex];
  noteElements[currentIndex]?.classList.add('is-wrong');
  const messages = {
    early: `${played === null ? 'Note' : midiName(played)} was early. Play ${midiName(expected)} again to continue.`,
    late: `Missed ${midiName(expected)}. Play ${midiName(expected)} to continue.`,
    wrong: `Expected ${midiName(expected)}, heard ${midiName(played)}. Play ${midiName(expected)} to continue.`
  };
  running = false;
  paused = true;
  cancelAnimationFrame(animationFrame);
  elements.cursor.hidden = false;
  elements.cursor.style.left = `${noteXs[currentIndex]}px`;
  elements.start.textContent = 'Restart';
  markCurrent();
  setStatus(messages[kind]);
}

function complete() {
  running = false;
  paused = false;
  cancelAnimationFrame(animationFrame);
  elements.cursor.hidden = false;
  elements.start.textContent = 'Again';
  markCurrent();
  setStatus('Drill complete.');
}

function positionCursor(now) {
  const x = cursorXAt(now, startTime, beatMs(), noteXs);
  elements.cursor.style.left = `${x}px`;
  const desired = Math.max(0, x - elements.scoreScroll.clientWidth / 2);
  elements.scoreScroll.scrollLeft = Math.min(desired, elements.scoreScroll.scrollWidth - elements.scoreScroll.clientWidth);
}

function tick(now) {
  if (!running) return;
  positionCursor(now);
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
  window.setTimeout(() => { if (running && currentIndex === 0) setStatus(`Play ${midiName(drill.notes[0])}.`); }, beatMs());
}

function handleNote(midi, velocity = 100) {
  if (velocity <= 0 || currentIndex >= drill.notes.length || (!running && !paused)) return;
  const now = performance.now();
  if (paused) {
    const expected = drill.notes[currentIndex];
    if (Number(midi) !== expected) {
      fail('wrong', midi);
      return;
    }
    noteElements[currentIndex]?.classList.remove('is-current', 'is-wrong');
    noteElements[currentIndex]?.classList.add('is-correct');
    currentIndex += 1;
    updateProgress();
    if (currentIndex >= drill.notes.length) {
      complete();
      return;
    }
    paused = false;
    running = true;
    startTime = now - (currentIndex - 1) * beatMs();
    elements.start.textContent = 'Stop';
    markCurrent();
    setStatus(`Continue · next ${midiName(drill.notes[currentIndex])}`);
    animationFrame = requestAnimationFrame(tick);
    return;
  }
  const result = classifyAttempt({
    played: midi,
    expected: drill.notes[currentIndex],
    now,
    due: dueTime(currentIndex),
    tolerance: toleranceMs()
  });
  if (result.result !== 'correct') {
    fail(result.result, midi);
    return;
  }
  noteElements[currentIndex]?.classList.remove('is-current');
  noteElements[currentIndex]?.classList.add('is-correct');
  currentIndex += 1;
  updateProgress();
  if (currentIndex >= drill.notes.length) {
    complete();
    return;
  }
  markCurrent();
  setStatus(`${result.difference >= 0 ? '+' : '−'}${Math.abs(Math.round(result.difference))} ms · next ${midiName(drill.notes[currentIndex])}`);
}

function makeVexNote(Flow, midi, clef) {
  const key = midiToVexKey(midi);
  const note = new Flow.StaveNote({ clef, keys: [key], duration: 'q' });
  if (key.includes('#')) note.addModifier(new Flow.Accidental('#'), 0);
  else if (key.includes('b')) note.addModifier(new Flow.Accidental('b'), 0);
  return note;
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

  const measureWidth = 285;
  const measures = Math.ceil(drill.notes.length / 4);
  const width = measures * measureWidth + 18;
  const height = 235;
  elements.score.style.width = `${width}px`;
  elements.scoreStage.style.width = `${width}px`;
  const renderer = new Flow.Renderer(elements.score, Flow.Renderer.Backends.SVG);
  renderer.resize(width, height);
  const context = renderer.getContext();
  context.setFont('Arial', 10);

  for (let measure = 0; measure < measures; measure += 1) {
    const x = 8 + measure * measureWidth;
    const stave = new Flow.Stave(x, 56, measureWidth);
    if (measure === 0) stave.addClef(drill.clef).addTimeSignature('4/4');
    stave.setContext(context).draw();
    const source = drill.notes.slice(measure * 4, measure * 4 + 4);
    const notes = source.map(midi => makeVexNote(Flow, midi, drill.clef));
    const voice = new Flow.Voice({ num_beats: source.length, beat_value: 4 });
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
  drill = DRILLS.find(candidate => candidate.id === elements.drill.value) || DRILLS[0];
  renderScore();
}

function onMidiMessage(event) {
  const [status, note, velocity = 0] = event.data;
  if ((status & 0xf0) === 0x90 && velocity > 0) handleNote(note, velocity);
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
  const whiteKeyWidth = 52;
  const blackKeyWidth = 34;
  let whiteIndex = 0;
  for (let midi = 48; midi <= 72; midi += 1) {
    const black = [1, 3, 6, 8, 10].includes(midi % 12);
    const button = document.createElement('button');
    button.className = `piano-key${black ? ' is-black' : ''}`;
    button.type = 'button';
    button.textContent = midiName(midi);
    button.setAttribute('aria-label', midiName(midi));
    if (black) button.style.left = `${whiteIndex * whiteKeyWidth - blackKeyWidth / 2}px`;
    else {
      button.style.left = `${whiteIndex * whiteKeyWidth}px`;
      whiteIndex += 1;
    }
    button.addEventListener('click', () => handleNote(midi));
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
