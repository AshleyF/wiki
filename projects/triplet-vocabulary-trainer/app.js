import { DrumSampleLibrary, pushOrderedVelocities } from '../rhythm-explorer/drum-sample-kit.js';
import { addDrumStepElement, renderedDrumStems, renderedStemForNote } from '../rhythm-explorer/drum-notation-core.js';
import { renderReducedTripletSequence } from '../rhythm-explorer/reduced-triplet-renderer.js?v=20260908-shared-3';
import { boostedAudioOutput } from '../shared/audio-output.js?v=20260904-1';

const MELODIES = [
  ['A','B','B','A','B','B'], ['A','B','A','A','B','B'], ['A','A','B','A','B','B'],
  ['A','B','B','A','B','A'], ['A','B','A','A','B','A'], ['A','A','B','A','B','A'],
  ['A','B','A','B','A','B'], ['A','B','B','A','A','B'], ['A','A','B','A','A','B']
];
const $ = selector => document.querySelector(selector);
const cards = [...document.querySelectorAll('.melody-card')];
const selectors = cards.map(card => card.querySelector('select'));
const sampleLibrary = new DrumSampleLibrary('../rhythm-explorer/assets/drums/library.json');
const DEFAULT_SAMPLE_KIT_ID = 'ludwig-black-beauty-snare-center';
const ENABLED_MELODIES_KEY = 'triplet-vocabulary-enabled-melodies';
const AUTO_SHUFFLE_KEY = 'triplet-vocabulary-auto-shuffle';
const SHOW_COUNTING_KEY = 'triplet-vocabulary-show-counting';
const FOLLOW_HIGHLIGHTING_KEY = 'triplet-vocabulary-follow-highlighting';
const ALL_MELODY_INDEXES = MELODIES.map((_, index) => index);
const TRIPLET_COUNTS = ['1', '&', 'a', '2', '&', 'a'];
let sampleKit = null;
let sampleKitId = DEFAULT_SAMPLE_KIT_ID;
try { sampleKitId = localStorage.getItem('personal-wiki-drum-snare-kit') || DEFAULT_SAMPLE_KIT_ID; } catch {}
let enabledMelodies = loadEnabledMelodies();
let audioContext = null;
let midiAccess = null;
let midiOutput = null;
let playing = false;
let scheduler = null;
let nextEventTime = 0;
let eventNumber = 0;
let activeSlot = 0;
let queuedRandomize = false;
let activeVelocities = { ghost:16, normal:64, accent:111 };
const scheduledSources = new Set();
const visualTimers = new Set();

function melodyLabel(index) { return `${index + 1} · ${MELODIES[index].slice(0,3).join('')}-${MELODIES[index].slice(3).join('')}`; }
function loadEnabledMelodies() {
  try {
    const saved = JSON.parse(localStorage.getItem(ENABLED_MELODIES_KEY) || 'null');
    const valid = Array.isArray(saved)
      ? saved.filter(index => Number.isInteger(index) && index >= 0 && index < MELODIES.length)
      : [];
    if (valid.length) return new Set(valid);
  } catch {}
  return new Set(ALL_MELODY_INDEXES);
}
function saveEnabledMelodies() {
  try { localStorage.setItem(ENABLED_MELODIES_KEY, JSON.stringify(enabledMelodyIndexes())); } catch {}
}
function enabledMelodyIndexes() { return ALL_MELODY_INDEXES.filter(index => enabledMelodies.has(index)); }
function populateSelector(select, preferredIndex) {
  const choices = enabledMelodyIndexes();
  const selected = enabledMelodies.has(preferredIndex) ? preferredIndex : choices[0];
  select.replaceChildren(...choices.map(index => new Option(melodyLabel(index), String(index))));
  select.value = String(selected);
}
function initializeSelectors() {
  selectors.forEach((select, slot) => {
    populateSelector(select, enabledMelodies.has(slot) ? slot : enabledMelodyIndexes()[slot % enabledMelodies.size]);
  });
}
function initializeMelodyFilter() {
  const container = $('#melody-filter-options');
  container.replaceChildren(...ALL_MELODY_INDEXES.map(index => {
    const label = document.createElement('label');
    label.title = melodyLabel(index);
    const input = document.createElement('input');
    input.type = 'checkbox';
    input.value = String(index);
    input.checked = enabledMelodies.has(index);
    input.setAttribute('aria-label', `Include melody ${melodyLabel(index)}`);
    const text = document.createElement('span');
    text.textContent = melodyLabel(index);
    label.append(input, text);
    return label;
  }));
  container.addEventListener('change', event => {
    const input = event.target.closest('input[type="checkbox"]');
    if (!input) return;
    const index = Number(input.value);
    if (!input.checked && enabledMelodies.size === 1) {
      input.checked = true;
      setStatus('Keep at least one melody enabled.');
      return;
    }
    if (playing) stop();
    if (input.checked) enabledMelodies.add(index); else enabledMelodies.delete(index);
    saveEnabledMelodies();
    selectors.forEach(select => populateSelector(select, Number(select.value)));
    renderAll();
    setStatus('');
  });
}
function initializeAutoShuffle() {
  try {
    const saved = localStorage.getItem(AUTO_SHUFFLE_KEY);
    $('#auto-randomize').checked = saved === null ? true : saved === 'true';
  } catch {
    $('#auto-randomize').checked = true;
  }
}
function loadBooleanPreference(key, fallback = true) {
  try {
    const saved = localStorage.getItem(key);
    return saved === null ? fallback : saved === 'true';
  } catch {
    return fallback;
  }
}
function initializeDisplayOptions() {
  $('#show-counting').checked = loadBooleanPreference(SHOW_COUNTING_KEY);
  $('#follow-highlighting').checked = loadBooleanPreference(FOLLOW_HIGHLIGHTING_KEY);
}
function selectedMelody(slot) { return MELODIES[Number(selectors[slot].value)] || MELODIES[0]; }
function setStatus(message) { $('#status').textContent = message; }
function vexflow() { return window.Vex?.Flow || window.VexFlow; }
function sampleKitLabel(definition) {
  return [definition.drum.manufacturer,definition.drum.model,definition.name !== 'center' ? definition.name : ''].filter(Boolean).join(' ');
}
function saveSampleKit() { try { localStorage.setItem('personal-wiki-drum-snare-kit',sampleKitId); } catch {} }
async function populateSampleKits() {
  const select = $('#sound');
  try {
    const definitions = await sampleLibrary.listKits({ midiNote:38 });
    if (!definitions.some(definition => definition.kit_id === sampleKitId)) {
      sampleKitId = definitions.some(definition => definition.kit_id === DEFAULT_SAMPLE_KIT_ID)
        ? DEFAULT_SAMPLE_KIT_ID
        : definitions[0]?.kit_id || '';
    }
    select.replaceChildren(...definitions.map(definition => new Option(sampleKitLabel(definition),definition.kit_id)));
    select.value = sampleKitId;
    select.disabled = !definitions.length;
    if (sampleKitId) saveSampleKit();
  } catch (error) {
    console.warn('Could not load drum sample choices.',error);
    select.replaceChildren(new Option('Samples unavailable',''));
    select.disabled = true;
  }
}
function renderCard(slot) {
  const VF = vexflow();
  const target = cards[slot].querySelector('.notation');
  target.replaceChildren();
  if (!VF) { target.textContent = 'Notation could not load.'; return; }
  const width = Math.max(290, Math.floor(target.clientWidth || 360));
  const melody = selectedMelody(slot);
  const masks = [0,3].map(groupStart => melody.slice(groupStart,groupStart+3).map(role => role === 'A' ? '1' : '0').join(''));
  const cellGap = 12;
  const desiredGridWidth = 308;
  const availableLeft = slot === 0 ? 68 : 14;
  const availableRight = width-10;
  const gridWidth = Math.min(desiredGridWidth,availableRight-availableLeft);
  const gridLeft = slot === 0 ? availableLeft : (width-gridWidth)/2;
  const rendered = renderReducedTripletSequence({
    Flow:VF,
    target,
    masks,
    width,
    height:145,
    staveY:20,
    gridLeft,
    gridRight:gridLeft+gridWidth,
    cellGap,
    clef:slot === 0,
    timeSignature:slot === 0 ? '2/4' : '',
    annotationForStep:$('#show-counting').checked ? step => TRIPLET_COUNTS[step] : null
  });
  const notes = rendered.notes;
  const stepElements = Array.from({ length:6 }, () => []);
  const stems = renderedDrumStems(target,VF.StaveNote.STEM_UP,VF.StaveNote.STEM_DOWN);
  notes.forEach(note => {
    note.trainerEvent = note.reducedTripletEvent;
    note.trainerStep = note.reducedTripletStep;
    const element = note.getSVGElement?.();
    const coveredSteps = Array.from({ length:note.trainerEvent.slots },(_,offset) => note.trainerStep+offset).filter(step => step < 6);
    element?.classList.add('drum-step');
    coveredSteps.forEach(step => addDrumStepElement(stepElements,step,element));
    const stem = renderedStemForNote(stems,note);
    if (stem) {
      stem.classList.add('drum-step-stem');
      coveredSteps.forEach(step => addDrumStepElement(stepElements,step,stem));
    }
  });
  cards[slot].stepElements = stepElements;
}
function renderAll() {
  cards.forEach((_, slot) => renderCard(slot));
  updatePositions(activeSlot);
}
function updatePositions(slot) {
  activeSlot = slot;
  cards.forEach((card, index) => {
    card.classList.toggle('is-current', index === slot);
  });
}
function randomMelody() {
  const enabled = enabledMelodyIndexes();
  return enabled[Math.floor(Math.random() * enabled.length)];
}
function randomizeAll() {
  selectors.forEach((select, slot) => { select.value = String(randomMelody()); renderCard(slot); });
  updatePositions(activeSlot);
}
function requestRandomize() {
  if (playing) {
    queuedRandomize = true;
    $('#randomize').textContent = 'Shuffle queued';
    setStatus('');
  } else { randomizeAll(); setStatus(''); }
}

function eventDuration() { return 60 / Math.max(30,Number($('#tempo').value) || 100) / 3; }
function midiTimestamp(time) { return performance.now() + Math.max(0, time - audioContext.currentTime) * 1000; }
function scheduleMidi(note, velocity, time, duration = .06) {
  if (!midiOutput) return;
  const stamp = midiTimestamp(time);
  midiOutput.send([0x99,note,velocity], stamp);
  midiOutput.send([0x89,note,0], stamp + duration * 1000);
}
function scheduleFallbackSnare(time, velocity) {
  const length = Math.floor(audioContext.sampleRate * .09);
  const buffer = audioContext.createBuffer(1, length, audioContext.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i=0; i<length; i+=1) data[i] = (Math.random()*2-1) * Math.exp(-i/(audioContext.sampleRate*.018));
  const source = audioContext.createBufferSource();
  const filter = audioContext.createBiquadFilter();
  const gain = audioContext.createGain();
  source.buffer = buffer; filter.type = 'highpass'; filter.frequency.value = 1100;
  gain.gain.setValueAtTime(Math.max(.015, velocity/127*.32), time);
  source.connect(filter).connect(gain).connect(boostedAudioOutput(audioContext)); source.start(time);
  source.onended = () => scheduledSources.delete(source); scheduledSources.add(source);
}
function scheduleHat(time, velocity) {
  if (midiOutput) { scheduleMidi(44, velocity, time, .045); return; }
  const length = Math.ceil(audioContext.sampleRate*.055);
  const buffer = audioContext.createBuffer(1,length,audioContext.sampleRate);
  const data = buffer.getChannelData(0);
  for (let index=0; index<length; index+=1) data[index] = Math.random()*2-1;
  const source = audioContext.createBufferSource();
  const filter = audioContext.createBiquadFilter();
  const gain = audioContext.createGain();
  source.buffer = buffer; filter.type = 'highpass'; filter.frequency.value = 6500;
  gain.gain.setValueAtTime(Math.max(.008, velocity/82*.18),time);
  gain.gain.exponentialRampToValueAtTime(.001,time+.055);
  source.connect(filter).connect(gain).connect(boostedAudioOutput(audioContext)); source.start(time); source.stop(time+.055);
  source.onended = () => scheduledSources.delete(source); scheduledSources.add(source);
}
function scheduleSnare(time, velocity) {
  if (midiOutput) scheduleMidi(38, velocity, time);
  else {
    const source = sampleKit?.schedule(audioContext, { velocity, time, destination: boostedAudioOutput(audioContext) });
    if (source) {
      scheduledSources.add(source);
      source.onended = () => scheduledSources.delete(source);
    } else scheduleFallbackSnare(time, velocity);
  }
}
function showStep(slot, step, time) {
  const delay = Math.max(0, (time-audioContext.currentTime)*1000);
  const timer = setTimeout(() => {
    visualTimers.delete(timer);
    cards.forEach(card => card.stepElements?.flat().forEach(element => element?.classList.remove('drum-current-note')));
    updatePositions(slot);
    if ($('#follow-highlighting').checked) {
      cards[slot].stepElements?.[step]?.forEach(element => element.classList.add('drum-current-note'));
    }
  }, delay);
  visualTimers.add(timer);
}
function crossMelodyBoundary(previousSlot, nextSlot) {
  if (previousSlot === 2 && queuedRandomize) {
    queuedRandomize = false; $('#randomize').textContent = 'Shuffle'; randomizeAll();
  } else if ($('#auto-randomize').checked) {
    const select = selectors[previousSlot];
    const nextMelody = String(randomMelody());
    const delay = Math.max(0, (nextEventTime-audioContext.currentTime)*1000);
    const timer = setTimeout(() => {
      visualTimers.delete(timer);
      select.value = nextMelody;
      renderCard(previousSlot);
    }, delay);
    visualTimers.add(timer);
  }
}
function scheduleEvent() {
  const step = eventNumber % 6;
  const slot = Math.floor(eventNumber/6) % 3;
  if (eventNumber > 0 && step === 0) crossMelodyBoundary((slot+2)%3, slot);
  const role = selectedMelody(slot)[step];
  const currentVelocities = velocityValues();
  const velocity = midiOutput
    ? currentVelocities[role === 'A' ? 1 : 0]
    : activeVelocities[role === 'A' ? 'normal' : 'ghost'];
  scheduleSnare(nextEventTime, velocity);
  if (step === 0 || step === 3) scheduleHat(nextEventTime, currentVelocities[2]);
  showStep(slot, step, nextEventTime);
  nextEventTime += eventDuration(eventNumber); eventNumber += 1;
}
function schedulerTick() { if (playing) while (nextEventTime < audioContext.currentTime+.11) scheduleEvent(); }
async function prepareAudio() {
  const AudioContextClass = window.AudioContext || window.webkitAudioContext;
  if (!AudioContextClass) throw new Error('Web Audio is unavailable in this browser.');
  audioContext ||= new AudioContextClass({ latencyHint:'interactive' });
  await audioContext.resume();
  if (midiOutput) return;
  try {
    sampleKit ||= await sampleLibrary.getKit({ kitId:sampleKitId });
    const [ghost, normal, accent] = velocityValues();
    const requested = { ghost, normal, accent };
    await sampleKit.prepare(audioContext, [ghost, normal, accent]);
    activeVelocities = requested;
  } catch (error) { console.warn('Using synthesized snare fallback.', error); }
}
async function start() {
  if (playing) { stop(); return; }
  $('#play').textContent = 'Loading…';
  try {
    await prepareAudio();
    if (document.hidden) throw new Error('Return to this tab before starting playback.');
    playing = true; eventNumber = 0; activeSlot = 0; nextEventTime = audioContext.currentTime+.08;
    $('#play').textContent = '■ Stop'; updatePositions(0); setStatus('');
    scheduler = setInterval(schedulerTick, 25); schedulerTick();
  } catch (error) { $('#play').textContent = '▶ Play'; setStatus(error.message || 'Could not start playback'); }
}
function stop() {
  playing = false; clearInterval(scheduler); scheduler = null;
  visualTimers.forEach(clearTimeout); visualTimers.clear();
  scheduledSources.forEach(source => { try { source.stop(); } catch {} }); scheduledSources.clear();
  cards.forEach(card => card.stepElements?.flat().forEach(element => element?.classList.remove('drum-current-note')));
  if (midiOutput) { try { midiOutput.clear?.(); } catch {} midiOutput.send([0xb9,120,0]); midiOutput.send([0xb9,123,0]); }
  $('#play').textContent = '▶ Play'; setStatus('');
}

function refreshMidiOutputs() {
  const select = $('#midi-output');
  const remembered = localStorage.getItem('triplet-vocabulary-midi-output') || '';
  const outputs = midiAccess ? [...midiAccess.outputs.values()] : [];
  select.replaceChildren();
  if (!outputs.length) select.add(new Option('No MIDI outputs',''));
  else outputs.forEach(output => select.add(new Option(output.name || output.manufacturer || 'MIDI output', output.id)));
  select.disabled = !midiAccess || !outputs.length;
  if (outputs.length) select.value = outputs.some(output => output.id === remembered) ? remembered : outputs[0].id;
  midiOutput = outputs.find(output => output.id === select.value) || null;
}
async function enableMidi() {
  if (!navigator.requestMIDIAccess) { $('#midi-enabled').checked = false; setStatus('MIDI unavailable'); return; }
  try {
    midiAccess ||= await navigator.requestMIDIAccess({ sysex:false });
    midiAccess.onstatechange = refreshMidiOutputs; refreshMidiOutputs();
    setStatus(midiAccess.outputs.size ? '' : 'No MIDI outputs');
  } catch { $('#midi-enabled').checked = false; setStatus('MIDI unavailable'); }
}
function disableMidi() {
  if (playing) stop();
  midiOutput = null;
  if (midiAccess) midiAccess.onstatechange = null;
  midiAccess = null;
  $('#midi-output').replaceChildren(new Option('MIDI off',''));
  $('#midi-output').disabled = true;
  setStatus('');
}
async function prepareChangedVelocities() {
  if (!audioContext || !sampleKit || midiOutput) return;
  const [ghost, normal, accent] = velocityValues();
  const requested = { ghost, normal, accent };
  try {
    await sampleKit.prepare(audioContext, [ghost, normal, accent]);
    activeVelocities = requested;
    setStatus('');
  } catch { setStatus('Velocity samples unavailable'); }
}
initializeMelodyFilter(); initializeAutoShuffle(); initializeDisplayOptions(); initializeSelectors(); renderAll();
selectors.forEach((select,slot) => select.addEventListener('change', () => renderCard(slot)));
$('#play').addEventListener('click', start);
$('#randomize').addEventListener('click', requestRandomize);
$('#auto-randomize').addEventListener('change', event => {
  try { localStorage.setItem(AUTO_SHUFFLE_KEY, String(event.target.checked)); } catch {}
});
$('#show-counting').addEventListener('change', event => {
  try { localStorage.setItem(SHOW_COUNTING_KEY, String(event.target.checked)); } catch {}
  renderAll();
});
$('#follow-highlighting').addEventListener('change', event => {
  try { localStorage.setItem(FOLLOW_HIGHLIGHTING_KEY, String(event.target.checked)); } catch {}
  if (!event.target.checked) {
    cards.forEach(card => card.stepElements?.flat().forEach(element => element?.classList.remove('drum-current-note')));
  }
});
document.querySelectorAll('.tempo-step').forEach(button => button.addEventListener('click', () => {
  $('#tempo').value = String(Math.max(20, Math.min(400, (Number($('#tempo').value) || 100) + Number(button.dataset.tempoStep))));
}));
function velocityInputs() { return [...document.querySelectorAll('.velocity')]; }
function velocityValues() { return velocityInputs().map(input => Number(input.value)); }
function updateVelocity(input) {
  const inputs = velocityInputs();
  const index = inputs.indexOf(input);
  const values = pushOrderedVelocities(velocityValues(), index, Number(input.value));
  const roles = ['Ghost','Normal','Accent'];
  inputs.forEach((candidate, candidateIndex) => {
    candidate.value = String(values[candidateIndex]);
    candidate.title = `${roles[candidateIndex]}: ${values[candidateIndex]}`;
    candidate.setAttribute('aria-valuetext',`${values[candidateIndex]}, ${roles[candidateIndex].toLowerCase()} note`);
  });
}
velocityInputs().forEach(input => {
  input.addEventListener('input', () => updateVelocity(input));
  input.addEventListener('change', prepareChangedVelocities);
});
$('#midi-enabled').addEventListener('change', async event => {
  const wasPlaying = playing;
  if (wasPlaying) stop();
  if (event.target.checked) await enableMidi(); else disableMidi();
  if (wasPlaying && (!event.target.checked || midiOutput)) start();
});
$('#midi-output').addEventListener('change', event => {
  const wasPlaying = playing;
  if (wasPlaying) stop();
  midiOutput = midiAccess ? [...midiAccess.outputs.values()].find(output => output.id === event.target.value) || null : null;
  localStorage.setItem('triplet-vocabulary-midi-output', event.target.value);
  setStatus('');
  if (wasPlaying) start();
});
$('#sound').addEventListener('change', async event => {
  const wasPlaying = playing;
  if (wasPlaying) stop();
  sampleKitId = event.target.value || DEFAULT_SAMPLE_KIT_ID;
  sampleKit = null;
  saveSampleKit();
  if (wasPlaying) await start();
});
$('#theme-toggle').addEventListener('click', () => {
  const theme = document.documentElement.dataset.theme === 'light' ? 'dark' : 'light';
  document.documentElement.dataset.theme = theme; localStorage.setItem('personal-wiki-theme', theme); renderAll();
});
window.addEventListener('resize', () => { clearTimeout(window.tripletResizeTimer); window.tripletResizeTimer = setTimeout(renderAll,120); });
document.addEventListener('visibilitychange', () => { if (document.hidden && playing) stop(); });
window.addEventListener('blur', () => { if (playing) stop(); });
populateSampleKits();
