import { DrumSampleLibrary, pushOrderedVelocities } from '../rhythm-explorer/drum-sample-kit.js';
import { DRUM_HIDDEN_TRIPLET_SPELLINGS, addDrumStepElement, extendHiddenTripletBracket, renderedDrumStems, renderedStemForNote } from '../rhythm-explorer/drum-notation-core.js';

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
let sampleKit = null;
let sampleKitId = DEFAULT_SAMPLE_KIT_ID;
try { sampleKitId = localStorage.getItem('personal-wiki-drum-snare-kit') || DEFAULT_SAMPLE_KIT_ID; } catch {}
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
function initializeSelectors() {
  selectors.forEach((select, slot) => {
    MELODIES.forEach((_, index) => select.add(new Option(melodyLabel(index), String(index))));
    select.value = String(slot);
  });
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
  const renderer = new VF.Renderer(target, VF.Renderer.Backends.SVG);
  renderer.resize(width, 145);
  const context = renderer.getContext();
  const stave = new VF.Stave(4, 20, width - 8);
  if (slot === 0) stave.addClef('percussion').addTimeSignature('2/4');
  stave.setContext(context).draw();
  const melody = selectedMelody(slot);
  const notes = [];
  const tuplets = [];
  const beams = [];
  const stepElements = Array.from({ length:6 }, () => []);
  for (let groupStart=0; groupStart<6; groupStart+=3) {
    const mask = melody.slice(groupStart,groupStart+3).map(role => role === 'A' ? '1' : '0').join('');
    const spelling = DRUM_HIDDEN_TRIPLET_SPELLINGS[mask];
    const groupNotes = spelling.events.map(event => {
      const note = new VF.StaveNote({
        clef:'percussion',
        keys:[event.rest ? 'b/4' : 'c/5'],
        duration:`${event.duration}${event.rest ? 'r' : ''}`,
        stem_direction:1
      });
      note.trainerEvent = event;
      note.trainerStep = groupStart + event.step;
      notes.push(note);
      return note;
    });
    if (spelling.tuplet) {
      const tuplet = new VF.Tuplet(groupNotes, { num_notes:3, notes_occupied:2, bracketed:true, ratioed:false });
      tuplet.wikiExtendThroughLastDuration = Boolean(spelling.extendThroughLastDuration);
      tuplet.wikiSpellingNotes = groupNotes;
      tuplets.push(tuplet);
    }
    const beamable = groupNotes.filter(note => !note.trainerEvent.rest && note.trainerEvent.duration === '8');
    if (beamable.length > 1) beams.push(new VF.Beam(beamable));
  }
  const voice = new VF.Voice({ num_beats:2, beat_value:4 }).setStrict(true).addTickables(notes);
  new VF.Formatter().joinVoices([voice]).format([voice], width - (slot === 0 ? 100 : 28));
  voice.draw(context, stave);
  beams.forEach(beam => beam.setContext(context).draw());
  tuplets.forEach(tuplet => {
    const groupCount = target.querySelectorAll('.vf-tuplet').length;
    const openedGroup = typeof context.openGroup === 'function' ? context.openGroup('tuplet') : null;
    tuplet.setContext(context).draw();
    if (typeof context.closeGroup === 'function') context.closeGroup();
    extendHiddenTripletBracket(target.querySelectorAll('.vf-tuplet')[groupCount] || openedGroup, tuplet);
  });
  const stems = renderedDrumStems(target,VF.StaveNote.STEM_UP,VF.StaveNote.STEM_DOWN);
  notes.forEach(note => {
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
function renderAll() { cards.forEach((_, slot) => renderCard(slot)); updatePositions(activeSlot); }
function updatePositions(slot) {
  activeSlot = slot;
  cards.forEach((card, index) => {
    card.classList.toggle('is-current', index === slot);
  });
}
function randomMelody(except = -1) {
  let index = Math.floor(Math.random() * MELODIES.length);
  if (MELODIES.length > 1 && index === except) index = (index + 1 + Math.floor(Math.random() * (MELODIES.length - 1))) % MELODIES.length;
  return index;
}
function randomizeAll() {
  selectors.forEach((select, slot) => { select.value = String(randomMelody(Number(select.value))); renderCard(slot); });
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
  source.connect(filter).connect(gain).connect(audioContext.destination); source.start(time);
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
  source.connect(filter).connect(gain).connect(audioContext.destination); source.start(time); source.stop(time+.055);
  source.onended = () => scheduledSources.delete(source); scheduledSources.add(source);
}
function scheduleSnare(time, velocity) {
  if (midiOutput) scheduleMidi(38, velocity, time);
  else {
    const source = sampleKit?.schedule(audioContext, { velocity, time });
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
    cards[slot].stepElements?.[step]?.forEach(element => element.classList.add('drum-current-note'));
  }, delay);
  visualTimers.add(timer);
}
function crossMelodyBoundary(previousSlot, nextSlot) {
  if (previousSlot === 2 && queuedRandomize) {
    queuedRandomize = false; $('#randomize').textContent = 'Shuffle'; randomizeAll();
  } else if ($('#auto-randomize').checked) {
    const select = selectors[previousSlot];
    const nextMelody = String(randomMelody(Number(select.value)));
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
initializeSelectors(); renderAll();
selectors.forEach((select,slot) => select.addEventListener('change', () => renderCard(slot)));
$('#play').addEventListener('click', start);
$('#randomize').addEventListener('click', requestRandomize);
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
