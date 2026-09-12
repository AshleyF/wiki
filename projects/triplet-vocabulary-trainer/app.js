import { DrumSampleLibrary, pushOrderedVelocities } from '../rhythm-explorer/drum-sample-kit.js?v=20260911-pad-dynamics-1';
import { addDrumStepElement, renderedDrumStems, renderedStemForNote } from '../rhythm-explorer/drum-notation-core.js?v=20260908-single-line-2';
import { renderReducedTripletSequence } from '../rhythm-explorer/reduced-triplet-renderer.js?v=20260908-single-line-2';
import { boostedAudioOutput } from '../shared/audio-output.js?v=20260910-2';
import { createScreenWakeLock } from '../shared/screen-wake-lock.js?v=20260911-1';
import { EXTENDED_PATTERNS, TRIPLET_MASKS, commitPracticeMisses, createPracticeScore, expirePracticeHits, expirePracticeTargets, midiPracticeHitAccepted, practiceAccuracy, practiceTimingWindows, practiceTouchExceededThreshold, randomChoiceWithEmphasis, randomExtendedPatternPair, randomTripletMasks, recoveryPulseRoles, rolesForExtendedBar, rolesForTripletMasks, scorePracticeTap, shouldQueueRecovery } from './trainer-core.js?v=20260910-scoring-cutoff-1';

const MELODIES = [
  ['A','B','B','A','B','B'], ['A','B','A','A','B','B'], ['A','A','B','A','B','B'],
  ['A','B','B','A','B','A'], ['A','B','A','A','B','A'], ['A','A','B','A','B','A'],
  ['A','B','A','B','A','B'], ['A','B','B','A','A','B'], ['A','A','B','A','A','B']
];
const $ = selector => document.querySelector(selector);
const cards = [...document.querySelectorAll('.melody-card')];
const selectors = cards.map(card => card.querySelector('.card-pattern-first'));
const extendedSecondSelectors = cards.map(card => card.querySelector('.card-pattern-second'));
const sampleLibrary = new DrumSampleLibrary('../rhythm-explorer/assets/drums/library.json');
const DEFAULT_SAMPLE_KIT_ID = 'ludwig-black-beauty-snare-center';
const ENABLED_MELODIES_KEY = 'triplet-vocabulary-enabled-melodies';
const ENABLED_TRIPLETS_KEY = 'triplet-vocabulary-enabled-triplets';
const ENABLED_EXTENDED_KEY = 'triplet-vocabulary-enabled-extended';
const EMPHASIS_KEY = 'triplet-vocabulary-emphasis';
const TRAINER_MODE_KEY = 'triplet-vocabulary-trainer-mode';
const AUTO_SHUFFLE_KEY = 'triplet-vocabulary-auto-shuffle';
const METRONOME_KEY = 'triplet-vocabulary-metronome';
const SHOW_COUNTING_KEY = 'triplet-vocabulary-show-counting';
const FOLLOW_HIGHLIGHTING_KEY = 'triplet-vocabulary-follow-highlighting';
const IGNORE_FEET_KEY = 'triplet-vocabulary-ignore-feet';
const IGNORE_GHOSTS_KEY = 'triplet-vocabulary-ignore-ghosts';
const TEMPO_KEY = 'triplet-vocabulary-tempo';
const VELOCITIES_KEY = 'triplet-vocabulary-velocities';
const DEFAULT_VELOCITIES = Object.freeze([16,64,111]);
const ALL_MELODY_INDEXES = MELODIES.map((_, index) => index);
const ALL_EXTENDED_INDEXES = EXTENDED_PATTERNS.map((_,index) => index);
let sampleKit = null;
let sampleKitId = DEFAULT_SAMPLE_KIT_ID;
try { sampleKitId = localStorage.getItem('personal-wiki-drum-snare-kit') || DEFAULT_SAMPLE_KIT_ID; } catch {}
let trainerMode = loadTrainerMode();
let enabledMelodies = loadEnabledMelodies();
let enabledTriplets = loadEnabledTriplets();
let enabledExtended = loadEnabledExtended();
let emphasisByMode = loadEmphasis();
let tripletCards = Array.from({ length:3 },() => ['100','100','100','100']);
let extendedCards = Array.from({ length:3 },() => [0,3]);
let audioContext = null;
let midiAccess = null;
let midiInput = null;
let midiOutput = null;
let playing = false;
let scheduler = null;
let nextEventTime = 0;
let eventNumber = 0;
let activeSlot = 0;
let queuedRandomize = false;
let activeVelocities = { ghost:DEFAULT_VELOCITIES[0],normal:DEFAULT_VELOCITIES[1],accent:DEFAULT_VELOCITIES[2] };
let practiceScore = createPracticeScore();
let expectedPracticeHits = [];
let deferredPracticeMisses = 0;
let midiActivityTimer = null;
let practiceTouch = null;
let countInBeatsRemaining = 0;
let countInBeat = 0;
let phraseStartTime = null;
const scheduledSources = new Set();
const visualTimers = new Set();
const RECOVERY_HIT_TARGET = 2;
let practiceHasStarted = false;
let lastPracticeInputTime = null;
let recoveryMode = false;
let recoveryExitQueued = false;
let recoveryCards = [false,false,false];
let recoveryScore = createPracticeScore();
let recoveryExpectedHits = [];
const screenWakeLock = createScreenWakeLock();

function melodyLabel(index) { return `${index + 1} · ${MELODIES[index].slice(0,3).join('')}-${MELODIES[index].slice(3).join('')}`; }
function extendedLabel(index) {
  const printRole = role => role === 'R' ? '–' : role;
  return `${index + 1} · ${EXTENDED_PATTERNS[index].slice(0,3).map(printRole).join('')}-${EXTENDED_PATTERNS[index].slice(3).map(printRole).join('')}`;
}
function loadTrainerMode() {
  try {
    const saved = localStorage.getItem(TRAINER_MODE_KEY);
    return ['vocabulary','extended','triplets'].includes(saved) ? saved : 'vocabulary';
  } catch { return 'vocabulary'; }
}
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
function loadEnabledTriplets() {
  try {
    const saved = JSON.parse(localStorage.getItem(ENABLED_TRIPLETS_KEY) || 'null');
    const valid = Array.isArray(saved) ? saved.filter(mask => TRIPLET_MASKS.includes(mask)) : [];
    if (valid.length) return new Set(valid);
  } catch {}
  return new Set(TRIPLET_MASKS);
}
function loadEnabledExtended() {
  try {
    const saved = JSON.parse(localStorage.getItem(ENABLED_EXTENDED_KEY) || 'null');
    const valid = Array.isArray(saved)
      ? saved.filter(index => Number.isInteger(index) && index >= 0 && index < EXTENDED_PATTERNS.length)
      : [];
    const hasFirst = valid.some(index => index < 3);
    const hasSecond = valid.some(index => index >= 3);
    if (hasFirst && hasSecond) return new Set(valid);
  } catch {}
  return new Set(ALL_EXTENDED_INDEXES);
}
function saveEnabledMelodies() {
  try { localStorage.setItem(ENABLED_MELODIES_KEY, JSON.stringify(enabledMelodyIndexes())); } catch {}
}
function saveEnabledTriplets() {
  try { localStorage.setItem(ENABLED_TRIPLETS_KEY,JSON.stringify(enabledTripletMasks())); } catch {}
}
function saveEnabledExtended() {
  try { localStorage.setItem(ENABLED_EXTENDED_KEY,JSON.stringify(enabledExtendedIndexes())); } catch {}
}
function loadEmphasis() {
  try {
    const saved = JSON.parse(localStorage.getItem(EMPHASIS_KEY) || '{}');
    return saved && typeof saved === 'object' ? saved : {};
  } catch { return {}; }
}
function saveEmphasis() {
  try { localStorage.setItem(EMPHASIS_KEY,JSON.stringify(emphasisByMode)); } catch {}
}
function setTempo(value, { persist = true } = {}) {
  const tempo = Math.max(20,Math.min(400,Math.round(Number(value) || 100)));
  $('#tempo').value = String(tempo);
  if (persist) {
    try { localStorage.setItem(TEMPO_KEY,String(tempo)); } catch {}
  }
  return tempo;
}
function initializeTempo() {
  let saved = 100;
  try { saved = localStorage.getItem(TEMPO_KEY) || 100; } catch {}
  setTempo(saved,{ persist:false });
}
function persistTempoInput(value) {
  const tempo = Number(value);
  if (!Number.isFinite(tempo) || tempo < 20 || tempo > 400) return;
  try { localStorage.setItem(TEMPO_KEY,String(Math.round(tempo))); } catch {}
}
function enabledMelodyIndexes() { return ALL_MELODY_INDEXES.filter(index => enabledMelodies.has(index)); }
function enabledTripletMasks() { return TRIPLET_MASKS.filter(mask => enabledTriplets.has(mask)); }
function enabledExtendedIndexes() { return ALL_EXTENDED_INDEXES.filter(index => enabledExtended.has(index)); }
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
function populateExtendedSelectors() {
  const firstChoices = enabledExtendedIndexes().filter(index => index < 3);
  const secondChoices = enabledExtendedIndexes().filter(index => index >= 3);
  selectors.forEach((firstSelect,slot) => {
    const secondSelect = extendedSecondSelectors[slot];
    const preferred = extendedCards[slot] || [];
    const first = firstChoices.includes(preferred[0]) ? preferred[0] : firstChoices[0];
    const second = secondChoices.includes(preferred[1]) ? preferred[1] : secondChoices[0];
    extendedCards[slot] = [first,second];
    firstSelect.replaceChildren(...firstChoices.map(index => new Option(extendedLabel(index),String(index))));
    secondSelect.replaceChildren(...secondChoices.map(index => new Option(extendedLabel(index),String(index))));
    firstSelect.value = String(first);
    secondSelect.value = String(second);
    firstSelect.disabled = false;
    secondSelect.disabled = false;
  });
}
function renderTripletFilterNotations() {
  const VF = vexflow();
  if (!VF) return;
  document.querySelectorAll('.triplet-filter-notation').forEach(target => {
    renderReducedTripletSequence({
      Flow:VF,
      target,
      masks:[target.dataset.mask],
      width:82,
      height:100,
      staveY:20,
      gridLeft:7,
      gridRight:75
    });
    const svg = target.querySelector('svg');
    svg?.setAttribute('viewBox','0 0 82 100');
    svg?.setAttribute('preserveAspectRatio','xMidYMid meet');
  });
}
function patternFilterOption(value,labelText,checked,tripletMask = '',displayText = labelText) {
  const label = document.createElement('label');
  label.title = labelText;
  const input = document.createElement('input');
  input.type = 'checkbox';
  input.value = String(value);
  input.checked = checked;
  input.setAttribute('aria-label',`Include ${labelText}`);
  label.append(input);
  if (tripletMask) {
    label.classList.add('triplet-filter-option');
    const notation = document.createElement('span');
    notation.className = 'triplet-filter-notation drum-render';
    notation.dataset.mask = tripletMask;
    notation.setAttribute('aria-hidden','true');
    const accessible = document.createElement('span');
    accessible.className = 'visually-hidden';
    accessible.textContent = labelText;
    label.append(notation,accessible);
  } else {
    const text = document.createElement('span');
    text.textContent = displayText;
    label.append(text);
  }
  return label;
}
function initializePatternFilter() {
  const container = $('#melody-filter-options');
  const isTriplets = trainerMode === 'triplets';
  const isExtended = trainerMode === 'extended';
  $('.melody-filter-label').textContent = isTriplets ? 'Triplets' : isExtended ? 'Patterns' : 'Melodies';
  container.setAttribute('aria-label',isTriplets ? 'Enabled triplet cells' : isExtended ? 'Enabled extended patterns' : 'Enabled triplet melodies');
  const options = isTriplets
    ? TRIPLET_MASKS.map(mask => patternFilterOption(mask,`triplet ${mask.split('').join(' ')}`,enabledTriplets.has(mask),mask))
    : isExtended
      ? ALL_EXTENDED_INDEXES.map(index => patternFilterOption(index,extendedLabel(index),enabledExtended.has(index),'',String(index+1)))
      : ALL_MELODY_INDEXES.map(index => patternFilterOption(index,melodyLabel(index),enabledMelodies.has(index),'',String(index+1)));
  if (isExtended) {
    const divider = document.createElement('span');
    divider.className = 'pattern-group-divider';
    divider.setAttribute('aria-hidden','true');
    options.splice(3,0,divider);
  }
  container.replaceChildren(...options);
  if (isTriplets) renderTripletFilterNotations();
  populateEmphasis();
}
function emphasisChoices() {
  if (trainerMode === 'triplets') return enabledTripletMasks().map(value => ({
    value,
    label:`${value} · ${[...value].map(bit => bit === '1' ? 'A' : 'B').join('')}`
  }));
  if (trainerMode === 'extended') return enabledExtendedIndexes().map(value => ({ value:String(value),label:extendedLabel(value) }));
  return enabledMelodyIndexes().map(value => ({ value:String(value),label:melodyLabel(value) }));
}
function currentEmphasis() {
  const saved = emphasisByMode[trainerMode];
  const choices = emphasisChoices();
  const match = choices.find(choice => choice.value === String(saved));
  if (!match) return null;
  return trainerMode === 'triplets' ? match.value : Number(match.value);
}
function populateEmphasis() {
  const select = $('#emphasis');
  const emphasis = currentEmphasis();
  if (emphasis === null && emphasisByMode[trainerMode] !== undefined && emphasisByMode[trainerMode] !== '') {
    emphasisByMode[trainerMode] = '';
    saveEmphasis();
  }
  select.replaceChildren(new Option('None',''),...emphasisChoices().map(choice => new Option(choice.label,choice.value)));
  select.value = emphasis === null ? '' : String(emphasis);
}
function changeEnabledPatterns(event) {
  const input = event.target.closest('input[type="checkbox"]');
  if (!input) return;
  const enabled = trainerMode === 'triplets' ? enabledTriplets : trainerMode === 'extended' ? enabledExtended : enabledMelodies;
  const extendedGroupWouldBeEmpty = trainerMode === 'extended' && !input.checked &&
    enabledExtendedIndexes().filter(index => Number(input.value) < 3 ? index < 3 : index >= 3).length === 1;
  if ((!input.checked && enabled.size === 1) || extendedGroupWouldBeEmpty) {
    input.checked = true;
    setStatus(`Keep at least one ${trainerMode === 'triplets' ? 'triplet' : trainerMode === 'extended' ? 'pattern in each group' : 'melody'} enabled.`);
    return;
  }
  if (playing) stop();
  if (trainerMode === 'triplets') {
    if (input.checked) enabledTriplets.add(input.value); else enabledTriplets.delete(input.value);
    saveEnabledTriplets();
    randomizeAll();
  } else if (trainerMode === 'extended') {
    const index = Number(input.value);
    if (input.checked) enabledExtended.add(index); else enabledExtended.delete(index);
    saveEnabledExtended();
    populateExtendedSelectors();
    randomizeAll();
  } else {
    const index = Number(input.value);
    if (input.checked) enabledMelodies.add(index); else enabledMelodies.delete(index);
    saveEnabledMelodies();
    selectors.forEach(select => populateSelector(select,Number(select.value)));
    renderAll();
  }
  populateEmphasis();
  setStatus('');
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
  $('#show-counting').checked = loadBooleanPreference(SHOW_COUNTING_KEY,false);
  $('#follow-highlighting').checked = loadBooleanPreference(FOLLOW_HIGHLIGHTING_KEY);
  $('#metronome').checked = loadBooleanPreference(METRONOME_KEY,false);
  $('#ignore-feet').checked = loadBooleanPreference(IGNORE_FEET_KEY,true);
  $('#ignore-ghosts').checked = loadBooleanPreference(IGNORE_GHOSTS_KEY,true);
}
function selectedPattern(slot) {
  if (recoveryCards[slot]) return recoveryPulseRoles(stepsPerCard());
  if (trainerMode === 'triplets') return rolesForTripletMasks(tripletCards[slot]);
  if (trainerMode === 'extended') return rolesForExtendedBar(extendedCards[slot]);
  return MELODIES[Number(selectors[slot].value)] || MELODIES[0];
}
function selectedMasks(slot) {
  if (trainerMode === 'triplets') return tripletCards[slot];
  const melody = selectedPattern(slot);
  return Array.from({ length:melody.length/3 },(_,group) => melody.slice(group*3,group*3+3).map(role => role === 'A' ? '1' : '0').join(''));
}
function activeCardCount() { return 3; }
function stepsPerCard() { return trainerMode === 'vocabulary' ? 6 : 12; }
function tripletCountForStep(step) {
  return step%3 === 0 ? String(Math.floor(step/3)+1) : step%3 === 1 ? '&' : 'a';
}
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
  const masks = selectedMasks(slot);
  const fourTripletBar = trainerMode !== 'vocabulary';
  const cellGap = fourTripletBar ? 8 : 12;
  const desiredGridWidth = fourTripletBar ? 520 : 308;
  const availableLeft = 14;
  const availableRight = width-10;
  const gridWidth = Math.min(desiredGridWidth,availableRight-availableLeft);
  const gridLeft = (width-gridWidth)/2;
  const rendered = renderReducedTripletSequence({
    Flow:VF,
    target,
    masks,
    width,
    height:90,
    staveY:20,
    gridLeft,
    gridRight:gridLeft+gridWidth,
    cellGap,
    annotationForStep:$('#show-counting').checked ? tripletCountForStep : null
  });
  const notes = rendered.notes;
  const stepCount = masks.length*3;
  const stepElements = Array.from({ length:stepCount }, () => []);
  const stems = renderedDrumStems(target,VF.StaveNote.STEM_UP,VF.StaveNote.STEM_DOWN);
  notes.forEach(note => {
    note.trainerEvent = note.reducedTripletEvent;
    note.trainerStep = note.reducedTripletStep;
    const element = note.getSVGElement?.();
    const coveredSteps = Array.from({ length:note.trainerEvent.slots },(_,offset) => note.trainerStep+offset).filter(step => step < stepCount);
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
  cards.forEach((card,slot) => {
    if (slot < activeCardCount()) renderCard(slot);
    else {
      card.querySelector('.notation').replaceChildren();
      card.stepElements = [];
    }
  });
  updatePositions(activeSlot);
}
function updateModeUI({ randomizeTriplets = false } = {}) {
  document.body.dataset.trainerMode = trainerMode;
  $('#trainer-mode').value = trainerMode;
  cards.forEach((card,slot) => {
    card.hidden = slot >= activeCardCount();
    card.querySelector('.card-kind').textContent = trainerMode === 'triplets'
      ? `Bar ${slot+1}`
      : trainerMode === 'extended' ? `Bar ${slot+1}` : 'Melody';
  });
  if (trainerMode === 'extended') populateExtendedSelectors();
  else if (trainerMode === 'vocabulary') selectors.forEach(select => {
    select.disabled = false;
    populateSelector(select,Number(select.value));
  });
  else selectors.forEach(select => { select.disabled = false; });
  activeSlot = Math.min(activeSlot,activeCardCount()-1);
  initializePatternFilter();
  if (trainerMode === 'triplets' && randomizeTriplets) randomizeTripletCards();
  requestAnimationFrame(renderAll);
}
function updatePositions(slot) {
  activeSlot = slot;
  cards.forEach((card, index) => {
    card.classList.toggle('is-current', index === slot);
  });
}
function randomMelody() {
  return randomChoiceWithEmphasis(enabledMelodyIndexes(),currentEmphasis());
}
function randomizeTripletCards() {
  const twelveTriplets = randomTripletMasks(enabledTripletMasks(),12,Math.random,currentEmphasis());
  tripletCards = Array.from({ length:3 },(_,slot) => twelveTriplets.slice(slot*4,slot*4+4));
}
function randomizeExtendedCards() {
  extendedCards = Array.from({ length:3 },() => randomExtendedPatternPair(enabledExtendedIndexes(),Math.random,currentEmphasis()));
  populateExtendedSelectors();
}
function randomizeSlot(slot) {
  if (trainerMode === 'triplets') tripletCards[slot] = randomTripletMasks(enabledTripletMasks(),4,Math.random,currentEmphasis());
  else if (trainerMode === 'extended') {
    extendedCards[slot] = randomExtendedPatternPair(enabledExtendedIndexes(),Math.random,currentEmphasis());
    populateExtendedSelectors();
  }
  else selectors[slot].value = String(randomMelody());
  renderCard(slot);
}
function randomizeAll() {
  if (trainerMode === 'extended') {
    randomizeExtendedCards();
    renderAll();
    return;
  }
  cards.slice(0,activeCardCount()).forEach((_,slot) => randomizeSlot(slot));
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
function quarterDuration() { return eventDuration()*3; }
function updatePracticeScore() {
  const attempts = practiceScore.hits+practiceScore.misses;
  $('#score-accuracy').textContent = attempts
    ? `${practiceAccuracy(practiceScore).toFixed(1).replace('.0','')}%`
    : '—';
  $('#score-streak').textContent = String(practiceScore.streak);
  $('#score-best').textContent = String(practiceScore.bestStreak);
  $('#score-hits').textContent = String(practiceScore.hits);
  $('#score-misses').textContent = String(practiceScore.misses);
}
function resetPracticeSession() {
  practiceScore = createPracticeScore();
  expectedPracticeHits = [];
  deferredPracticeMisses = 0;
  phraseStartTime = null;
  updatePracticeScore();
}
function resetRecoveryState() {
  recoveryMode = false;
  recoveryExitQueued = false;
  recoveryCards = [false,false,false];
  recoveryScore = createPracticeScore();
  recoveryExpectedHits = [];
  practiceHasStarted = false;
  lastPracticeInputTime = null;
}
function queueNotationRender() {
  const timer = setTimeout(() => {
    visualTimers.delete(timer);
    renderAll();
  },0);
  visualTimers.add(timer);
}
function queueCardRender(slot) {
  const timer = setTimeout(() => {
    visualTimers.delete(timer);
    renderCard(slot);
  },0);
  visualTimers.add(timer);
}
function enterRecovery(currentSlot = activeSlot) {
  recoveryMode = true;
  recoveryExitQueued = false;
  recoveryCards = recoveryCards.map((_,slot) => slot !== currentSlot);
  recoveryScore = createPracticeScore();
  recoveryExpectedHits = [];
  deferredPracticeMisses = 0;
  expectedPracticeHits = [];
  queueNotationRender();
}
function beginRecoveryExit(currentSlot) {
  if (recoveryExitQueued) return;
  recoveryExitQueued = true;
  practiceScore = createPracticeScore();
  expectedPracticeHits = [];
  deferredPracticeMisses = 0;
  updatePracticeScore();
  const previousSlot = (currentSlot+activeCardCount()-1)%activeCardCount();
  recoveryCards[previousSlot] = false;
  randomizeSlot(previousSlot);
}
function leaveRecovery() {
  recoveryMode = false;
  recoveryExitQueued = false;
  recoveryCards = [false,false,false];
  recoveryScore = createPracticeScore();
  recoveryExpectedHits = [];
  practiceHasStarted = false;
  lastPracticeInputTime = null;
  resetPracticeSession();
  queueNotationRender();
}
function expirePracticeScore(now = audioContext?.currentTime ?? 0) {
  if (recoveryMode) {
    expirePracticeHits(recoveryScore,recoveryExpectedHits,now,practiceTimingWindows(eventDuration()));
    recoveryExpectedHits = recoveryExpectedHits.filter(expected => !expected.expired && (!expected.matched || now < expected.time+1));
    return;
  }
  deferredPracticeMisses += expirePracticeTargets(expectedPracticeHits,now,practiceTimingWindows(eventDuration()));
  expectedPracticeHits = expectedPracticeHits.filter(expected => !expected.expired && (!expected.matched || now < expected.time+1));
  if (practiceHasStarted && lastPracticeInputTime !== null && shouldQueueRecovery(lastPracticeInputTime,now,quarterDuration())) {
    enterRecovery(activeSlot);
  }
}
function registerPracticeHit(source = 'tap',hitTime = null) {
  if (!playing || !audioContext || phraseStartTime === null) return;
  const time = hitTime ?? audioContext.currentTime;
  const windowSeconds = practiceTimingWindows(eventDuration());
  if (time < phraseStartTime-windowSeconds.early) return;
  practiceHasStarted = true;
  lastPracticeInputTime = time;
  expirePracticeScore(time);
  if (recoveryMode) {
    const result = scorePracticeTap(recoveryScore,recoveryExpectedHits,time,windowSeconds);
    if (result.kind === 'hit' && recoveryScore.streak >= RECOVERY_HIT_TARGET) beginRecoveryExit(result.expected.slot);
    return;
  }
  commitPracticeMisses(practiceScore,deferredPracticeMisses);
  deferredPracticeMisses = 0;
  const result = scorePracticeTap(practiceScore,expectedPracticeHits,time,windowSeconds);
  updatePracticeScore();
}
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
  if (recoveryMode) {
    if (recoveryExitQueued) {
      if (recoveryCards[previousSlot]) {
        recoveryCards[previousSlot] = false;
        const timer = setTimeout(() => {
          visualTimers.delete(timer);
          randomizeSlot(previousSlot);
        },0);
        visualTimers.add(timer);
      }
      if (!recoveryCards.some(Boolean)) leaveRecovery();
    } else if (!recoveryCards[previousSlot]) {
      recoveryCards[previousSlot] = true;
      queueCardRender(previousSlot);
    }
    return;
  }
  if (practiceHasStarted && lastPracticeInputTime !== null && shouldQueueRecovery(lastPracticeInputTime,nextEventTime,quarterDuration())) {
    enterRecovery(previousSlot);
    return;
  }
  if (previousSlot === activeCardCount()-1 && queuedRandomize) {
    queuedRandomize = false; $('#randomize').textContent = 'Shuffle'; randomizeAll();
  } else if ($('#auto-randomize').checked) {
    const nextPattern = trainerMode === 'triplets'
      ? randomTripletMasks(enabledTripletMasks(),4,Math.random,currentEmphasis())
      : trainerMode === 'extended'
        ? randomExtendedPatternPair(enabledExtendedIndexes(),Math.random,currentEmphasis())
        : String(randomMelody());
    const delay = Math.max(0, (nextEventTime-audioContext.currentTime)*1000);
    const timer = setTimeout(() => {
      visualTimers.delete(timer);
      if (trainerMode === 'triplets') tripletCards[previousSlot] = nextPattern;
      else if (trainerMode === 'extended') {
        extendedCards[previousSlot] = nextPattern;
        populateExtendedSelectors();
      }
      else selectors[previousSlot].value = nextPattern;
      renderCard(previousSlot);
    }, delay);
    visualTimers.add(timer);
  }
}
function scheduleCountInBeat() {
  const currentVelocities = velocityValues();
  const beat = countInBeat+1;
  scheduleHat(nextEventTime,beat === 1 ? currentVelocities[2] : currentVelocities[1]);
  nextEventTime += quarterDuration();
  countInBeat += 1;
  countInBeatsRemaining -= 1;
}
function scheduleEvent() {
  if (countInBeatsRemaining > 0) {
    scheduleCountInBeat();
    return;
  }
  const cardSteps = stepsPerCard();
  const cardCount = activeCardCount();
  const step = eventNumber%cardSteps;
  const slot = Math.floor(eventNumber/cardSteps)%cardCount;
  if (eventNumber > 0 && step === 0) crossMelodyBoundary((slot+cardCount-1)%cardCount,slot);
  const role = selectedPattern(slot)[step];
  const currentVelocities = velocityValues();
  const velocity = midiOutput
    ? currentVelocities[role === 'A' ? 1 : 0]
    : activeVelocities[role === 'A' ? 'normal' : 'ghost'];
  if (phraseStartTime === null) {
    phraseStartTime = nextEventTime;
  }
  if (role === 'A') {
    const expected = { time:nextEventTime,slot,step,matched:false,expired:false };
    if (recoveryCards[slot]) recoveryExpectedHits.push(expected);
    else expectedPracticeHits.push(expected);
  }
  if (role !== 'R') scheduleSnare(nextEventTime, velocity);
  if ($('#metronome').checked && step%3 === 0) {
    const quarterBeat = Math.floor(eventNumber/3);
    scheduleHat(nextEventTime,quarterBeat%4 === 0 ? currentVelocities[2] : currentVelocities[1]);
  }
  showStep(slot, step, nextEventTime);
  nextEventTime += eventDuration(eventNumber); eventNumber += 1;
}
function schedulerTick() {
  if (!playing) return;
  expirePracticeScore();
  while (nextEventTime < audioContext.currentTime+.11) scheduleEvent();
}
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
function setTransportState(state) {
  const loading = state === 'loading';
  const active = state === 'stop';
  $('#play').textContent = loading ? 'Loading…' : active ? '■ Stop' : '▶ Play';
  const compact = $('#play-compact');
  compact.textContent = loading ? '…' : active ? '■' : '▶';
  compact.disabled = loading;
  compact.setAttribute('aria-label',loading ? 'Loading' : active ? 'Stop' : 'Play');
  compact.title = loading ? 'Loading' : active ? 'Stop' : 'Play';
}
function setTapMode(enabled) {
  const panel = $('#practice-pad');
  panel.classList.toggle('is-tap-mode',enabled);
  $('#dedicated-tap-pad').setAttribute('aria-hidden',String(!enabled));
}
function scrollToTapPad() {
  requestAnimationFrame(() => window.scrollTo({ top:document.scrollingElement.scrollHeight,behavior:'auto' }));
}
async function start({ tapMode = false } = {}) {
  if (playing) { stop(); return; }
  setTapMode(tapMode);
  if (tapMode) scrollToTapPad();
  setTransportState('loading');
  try {
    await prepareAudio();
    if (document.hidden) throw new Error('Return to this tab before starting playback.');
    const withMetronome = $('#metronome').checked;
    resetRecoveryState();
    resetPracticeSession();
    playing = true; eventNumber = 0; activeSlot = 0; countInBeat = 0; countInBeatsRemaining = withMetronome ? 4 : 0; nextEventTime = audioContext.currentTime+.08;
    void screenWakeLock.setActive(true);
    setTransportState('stop'); updatePositions(0); setStatus('');
    scheduler = setInterval(schedulerTick, 25); schedulerTick();
  } catch (error) { setTapMode(false); setTransportState('play'); setStatus(error.message || 'Could not start playback'); }
}
function stop() {
  playing = false; clearInterval(scheduler); scheduler = null;
  void screenWakeLock.setActive(false);
  visualTimers.forEach(clearTimeout); visualTimers.clear();
  scheduledSources.forEach(source => { try { source.stop(); } catch {} }); scheduledSources.clear();
  cards.forEach(card => card.stepElements?.flat().forEach(element => element?.classList.remove('drum-current-note')));
  expectedPracticeHits = [];
  phraseStartTime = null;
  const wasRecovering = recoveryMode;
  resetRecoveryState();
  if (wasRecovering) queueNotationRender();
  setTapMode(false);
  if (midiOutput) { try { midiOutput.clear?.(); } catch {} midiOutput.send([0xb9,120,0]); midiOutput.send([0xb9,123,0]); }
  setTransportState('play'); setStatus('');
}

function attachMidiInput(nextInput) {
  if (midiInput) midiInput.onmidimessage = null;
  midiInput = nextInput || null;
  if (!midiInput) return;
  midiInput.onmidimessage = event => {
    const [status,note,velocity = 0] = event.data || [];
    if ((status&0xf0) !== 0x90 || velocity <= 0) return;
    const [ghostVelocity,normalVelocity] = velocityValues();
    const accepted = midiPracticeHitAccepted(note,velocity,{
      ignoreFeet:$('#ignore-feet').checked,
      ignoreGhosts:$('#ignore-ghosts').checked,
      ghostVelocity,
      normalVelocity
    });
    if (!accepted) return;
    showMidiActivity();
    registerPracticeHit('midi');
  };
}
function showMidiActivity() {
  const indicator = $('#midi-activity');
  clearTimeout(midiActivityTimer);
  indicator.classList.add('is-active');
  midiActivityTimer = setTimeout(() => indicator.classList.remove('is-active'),90);
}
function refreshMidiPorts() {
  const outputSelect = $('#midi-output');
  const inputSelect = $('#midi-input');
  let rememberedOutput = '';
  let rememberedInput = '';
  try {
    rememberedOutput = localStorage.getItem('triplet-vocabulary-midi-output') || '';
    rememberedInput = localStorage.getItem('triplet-vocabulary-midi-input') || '';
  } catch {}
  const outputs = midiAccess ? [...midiAccess.outputs.values()] : [];
  const inputs = midiAccess ? [...midiAccess.inputs.values()] : [];
  const currentOutput = outputSelect.value;
  outputSelect.replaceChildren(new Option('None',''));
  outputs.forEach(output => outputSelect.add(new Option(output.name || output.manufacturer || 'MIDI output',output.id)));
  outputSelect.disabled = false;
  outputSelect.value = outputs.some(output => output.id === rememberedOutput)
    ? rememberedOutput
    : (outputs.some(output => output.id === currentOutput) ? currentOutput : '');
  midiOutput = outputs.find(output => output.id === outputSelect.value) || null;

  const currentInput = inputSelect.value;
  inputSelect.replaceChildren(new Option('None',''));
  inputs.forEach(input => inputSelect.add(new Option(input.name || input.manufacturer || 'MIDI input',input.id)));
  inputSelect.disabled = false;
  inputSelect.value = inputs.some(input => input.id === rememberedInput)
    ? rememberedInput
    : (inputs.some(input => input.id === currentInput) ? currentInput : '');
  attachMidiInput(inputs.find(input => input.id === inputSelect.value));
}
async function enableMidi() {
  if (!navigator.requestMIDIAccess) { setStatus('MIDI unavailable'); return; }
  try {
    midiAccess ||= await navigator.requestMIDIAccess({ sysex:false });
    midiAccess.onstatechange = refreshMidiPorts; refreshMidiPorts();
    setStatus(midiAccess.inputs.size || midiAccess.outputs.size ? '' : 'No MIDI devices');
  } catch { setStatus('MIDI unavailable'); }
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
initializeAutoShuffle();
initializeDisplayOptions();
initializeSelectors();
initializeTempo();
initializeVelocities();
randomizeTripletCards();
updateModeUI();
$('#melody-filter-options').addEventListener('change',changeEnabledPatterns);
$('#emphasis').addEventListener('change',event => {
  emphasisByMode[trainerMode] = event.target.value;
  saveEmphasis();
});
selectors.forEach((select,slot) => select.addEventListener('change', () => {
  if (trainerMode === 'extended') extendedCards[slot][0] = Number(select.value);
  if (trainerMode !== 'triplets') renderCard(slot);
}));
extendedSecondSelectors.forEach((select,slot) => select.addEventListener('change',() => {
  if (trainerMode !== 'extended') return;
  extendedCards[slot][1] = Number(select.value);
  renderCard(slot);
}));
$('#trainer-mode').addEventListener('change',event => {
  if (playing) stop();
  trainerMode = ['vocabulary','extended','triplets'].includes(event.target.value) ? event.target.value : 'vocabulary';
  try { localStorage.setItem(TRAINER_MODE_KEY,trainerMode); } catch {}
  if (trainerMode === 'extended') randomizeExtendedCards();
  updateModeUI({ randomizeTriplets:trainerMode === 'triplets' });
  setStatus('');
});
$('#play').addEventListener('click',event => {
  event.currentTarget.blur();
  start();
});
$('#play-compact').addEventListener('click',event => {
  event.currentTarget.blur();
  start({ tapMode:true });
});
$('#randomize').addEventListener('click', requestRandomize);
$('#auto-randomize').addEventListener('change', event => {
  try { localStorage.setItem(AUTO_SHUFFLE_KEY, String(event.target.checked)); } catch {}
});
$('#metronome').addEventListener('change',event => {
  try { localStorage.setItem(METRONOME_KEY,String(event.target.checked)); } catch {}
  if (playing) { stop(); start(); }
});
[$('#ignore-feet'),$('#ignore-ghosts')].forEach(input => input.addEventListener('change',event => {
  const key = event.target.id === 'ignore-feet' ? IGNORE_FEET_KEY : IGNORE_GHOSTS_KEY;
  try { localStorage.setItem(key,String(event.target.checked)); } catch {}
}));
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
  setTempo((Number($('#tempo').value) || 100)+Number(button.dataset.tempoStep));
}));
$('#tempo').addEventListener('change',event => setTempo(event.target.value));
$('#tempo').addEventListener('input',event => persistTempoInput(event.target.value));
function velocityInputs() { return [...document.querySelectorAll('.velocity')]; }
function velocityValues() { return velocityInputs().map(input => Number(input.value)); }
function validVelocityValues(values) {
  return Array.isArray(values) && values.length === 3 &&
    values.every(value => Number.isInteger(value) && value >= 1 && value <= 127) &&
    values[0] < values[1] && values[1] < values[2];
}
function saveVelocities() {
  try { localStorage.setItem(VELOCITIES_KEY,JSON.stringify(velocityValues())); } catch {}
}
function initializeVelocities() {
  let values = DEFAULT_VELOCITIES;
  try {
    const saved = JSON.parse(localStorage.getItem(VELOCITIES_KEY) || 'null');
    if (validVelocityValues(saved)) values = saved;
  } catch {}
  const roles = ['Ghost','Normal','Accent'];
  velocityInputs().forEach((input,index) => {
    input.value = String(values[index]);
    input.title = `${roles[index]}: ${values[index]}`;
    input.setAttribute('aria-valuetext',`${values[index]}, ${roles[index].toLowerCase()} note`);
  });
  activeVelocities = { ghost:values[0],normal:values[1],accent:values[2] };
}
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
  saveVelocities();
}
velocityInputs().forEach(input => {
  input.addEventListener('input', () => updateVelocity(input));
  input.addEventListener('change', prepareChangedVelocities);
});
[$('#midi-input'), $('#midi-output')].forEach(select => {
  select.addEventListener('focus', () => { if (!midiAccess) enableMidi(); }, { once:false });
});
$('#midi-input').addEventListener('change', event => {
  const input = midiAccess ? [...midiAccess.inputs.values()].find(candidate => candidate.id === event.target.value) : null;
  attachMidiInput(input);
  try { localStorage.setItem('triplet-vocabulary-midi-input',event.target.value); } catch {}
  setStatus('');
});
$('#midi-output').addEventListener('change', event => {
  const wasPlaying = playing;
  if (wasPlaying) stop();
  midiOutput = midiAccess ? [...midiAccess.outputs.values()].find(output => output.id === event.target.value) || null : null;
  try { localStorage.setItem('triplet-vocabulary-midi-output',event.target.value); } catch {}
  setStatus('');
  if (wasPlaying) start();
});
const practicePad = $('#practice-pad');
function isTrainerControl(target) {
  return Boolean(target.closest?.('button,input,select,textarea,a,summary,label,[role="button"],[contenteditable="true"]'));
}
document.addEventListener('pointerdown',event => {
  if (!playing || !event.target.closest?.('main')) return;
  if (isTrainerControl(event.target)) return;
  if (event.pointerType === 'touch') return;
  if (event.button !== undefined && event.button !== 0) return;
  event.preventDefault();
  registerPracticeHit('tap');
});
document.addEventListener('dblclick',event => {
  if (!event.target.closest?.('main')) return;
  if (isTrainerControl(event.target)) return;
  event.preventDefault();
});
function gestureTouch(event) {
  if (!practiceTouch) return null;
  return [...event.changedTouches,...event.touches].find(touch => touch.identifier === practiceTouch.identifier) || null;
}
document.addEventListener('touchstart',event => {
  if (event.touches.length !== 1 || !event.target.closest?.('main') || isTrainerControl(event.target)) return;
  const touch = event.touches[0];
  practiceTouch = {
    identifier:touch.identifier,
    startX:touch.clientX,
    startY:touch.clientY,
    hitTime:audioContext?.currentTime ?? null,
    moved:false
  };
},{ passive:true });
document.addEventListener('touchmove',event => {
  const touch = gestureTouch(event);
  if (!touch) return;
  if (!practiceTouch.moved && practiceTouchExceededThreshold(
    practiceTouch.startX,practiceTouch.startY,touch.clientX,touch.clientY
  )) practiceTouch.moved = true;
},{ passive:true });
document.addEventListener('touchend',event => {
  const touch = gestureTouch(event);
  if (!touch) return;
  const completedTouch = practiceTouch;
  practiceTouch = null;
  if (!completedTouch.moved) registerPracticeHit('tap',completedTouch.hitTime);
},{ passive:true });
document.addEventListener('touchcancel',() => { practiceTouch = null; },{ passive:true });
const dedicatedTapPad = $('#dedicated-tap-pad');
dedicatedTapPad.addEventListener('pointerdown',event => {
  if (event.button !== undefined && event.button !== 0) return;
  event.preventDefault();
  event.stopPropagation();
  registerPracticeHit('tap');
});
document.addEventListener('keydown',event => {
  if (event.code !== 'Space' || event.repeat) return;
  if (!playing) return;
  const editingControl = event.target.closest?.('input,select,textarea,a,[contenteditable="true"]');
  if (editingControl && event.target !== practicePad) return;
  event.preventDefault();
  registerPracticeHit('space');
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
