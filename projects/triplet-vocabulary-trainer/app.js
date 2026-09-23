import { DrumSampleLibrary, pushOrderedVelocities } from '../rhythm-explorer/drum-sample-kit.js?v=20260911-pad-dynamics-1';
import { DRUM_HIDDEN_TRIPLET_SPELLINGS, addDrumStepElement, renderedDrumStems, renderedStemForNote } from '../rhythm-explorer/drum-notation-core.js?v=20260908-single-line-2';
import { renderReducedTripletSequence } from '../rhythm-explorer/reduced-triplet-renderer.js?v=20260908-single-line-2';
import { boostedAudioOutput } from '../shared/audio-output.js?v=20260910-2';
import { createScreenWakeLock } from '../shared/screen-wake-lock.js?v=20260911-1';
import { FIXED_DRUM_SAMPLE_KIT_IDS, alternatingClosedHiHatArticulation, closedHiHatMidiNote } from '../shared/drum-sample-orchestration.js?v=20260916-1';
import { EXTENDED_PATTERNS, TRIPLET_MASKS, calibratedVisualTime, calibrationOffsetSeconds, commitPracticeMisses, consistentCalibrationOffset, createPracticeScore, expirePracticeHits, expirePracticeTargets, midiPracticeHitAccepted, practiceAccuracy, practiceTimingWindows, practiceTouchExceededThreshold, randomChoiceWithEmphasis, randomExtendedPatternPair, randomTripletMasks, recoveryHitTarget, recoveryPulseRoles, rolesForExtendedBar, rolesForKickVocabulary, rolesForKickVocabulary2, rolesForTripletMasks, scorePracticeTap, trainerPlaybackPlan, tripletMasksForRoles, updateAuditionQueue } from './trainer-core.js?v=20260923-calibrated-visuals';

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
const DRUMS_KEY = 'triplet-vocabulary-drums';
const SHOW_COUNTING_KEY = 'triplet-vocabulary-show-counting';
const FOLLOW_HIGHLIGHTING_KEY = 'triplet-vocabulary-follow-highlighting';
const IGNORE_FEET_KEY = 'triplet-vocabulary-ignore-feet';
const IGNORE_GHOSTS_KEY = 'triplet-vocabulary-ignore-ghosts';
const TEMPO_KEY = 'triplet-vocabulary-tempo';
const VELOCITIES_KEY = 'triplet-vocabulary-velocities';
const LATENCY_COMPENSATION_KEY = 'triplet-vocabulary-latency-compensation';
const DEFAULT_VELOCITIES = Object.freeze([16,64,111]);
const ALL_MELODY_INDEXES = MELODIES.map((_, index) => index);
const ALL_EXTENDED_INDEXES = EXTENDED_PATTERNS.map((_,index) => index);
let sampleKit = null;
let kickSampleKit = null;
let closedHatTipSampleKit = null;
let closedHatEdgeSampleKit = null;
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
let playbackScope = null;
let auditionSlot = null;
let auditionQueue = [];
let auditionEndTimer = null;
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
const calibrationSources = new Set();
const visualTimers = new Set();
let practiceHasStarted = false;
let consecutiveExpiredTargets = 0;
let recoveryMode = false;
let recoveryExitQueued = false;
let recoveryCards = [false,false,false];
let recoveryScore = createPracticeScore();
let recoveryExpectedHits = [];
let recoveryCalibration = [];
let latencyCompensation = loadLatencyCompensation();
let calibrationRun = null;
let patternPaint = null;
let suppressPatternClick = false;
const screenWakeLock = createScreenWakeLock();

function loadLatencyCompensation() {
  try {
    const saved = Number(localStorage.getItem(LATENCY_COMPENSATION_KEY));
    return Number.isFinite(saved) ? Math.max(0,Math.min(.5,saved)) : 0;
  } catch { return 0; }
}
function saveLatencyCompensation(value) {
  latencyCompensation = Math.max(0,Math.min(.5,Number(value) || 0));
  try { localStorage.setItem(LATENCY_COMPENSATION_KEY,String(latencyCompensation)); } catch {}
  updateCalibrationLabel();
}
function updateCalibrationLabel() {
  const milliseconds = Math.round(latencyCompensation*1000);
  $('#calibrate').title = milliseconds
    ? `Calibrate audio, visuals, and input latency (currently ${milliseconds} ms)`
    : 'Calibrate audio, visuals, and input latency';
}

function melodyLabel(index) { return `${index + 1} · ${MELODIES[index].slice(0,3).join('')}-${MELODIES[index].slice(3).join('')}`; }
function extendedLabel(index) {
  const printRole = role => role === 'R' ? '–' : role;
  return `${index + 1} · ${EXTENDED_PATTERNS[index].slice(0,3).map(printRole).join('')}-${EXTENDED_PATTERNS[index].slice(3).map(printRole).join('')}`;
}
function loadTrainerMode() {
  try {
    const saved = localStorage.getItem(TRAINER_MODE_KEY);
    return ['vocabulary','extended','triplets','kick','kick2'].includes(saved) ? saved : 'vocabulary';
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
function beginPatternPaint(event) {
  if (!event.isPrimary || (event.button !== undefined && event.button !== 0)) return;
  const input = event.target.closest('label')?.querySelector('input[type="checkbox"]');
  if (!input || !$('#melody-filter-options').contains(input)) return;
  event.preventDefault();
  suppressPatternClick = true;
  patternPaint = { pointerId:event.pointerId, checked:!input.checked, visited:new Set() };
  $('#melody-filter-options').setPointerCapture?.(event.pointerId);
  paintPatternInput(input);
}
function paintPatternInput(input) {
  if (!patternPaint || !input || patternPaint.visited.has(input)) return;
  patternPaint.visited.add(input);
  if (input.checked === patternPaint.checked) return;
  input.checked = patternPaint.checked;
  changeEnabledPatterns({ target:input });
}
function continuePatternPaint(event) {
  if (!patternPaint || event.pointerId !== patternPaint.pointerId) return;
  event.preventDefault();
  const target = document.elementFromPoint(event.clientX,event.clientY);
  const input = target?.closest?.('label')?.querySelector('input[type="checkbox"]');
  if (input && $('#melody-filter-options').contains(input)) paintPatternInput(input);
}
function endPatternPaint(event) {
  if (!patternPaint || event.pointerId !== patternPaint.pointerId) {
    if (event.type === 'pointercancel') suppressPatternClick = false;
    return;
  }
  patternPaint = null;
  if (event.type === 'pointercancel') suppressPatternClick = false;
  else {
    // Touch browsers may dispatch the compatibility click well after pointerup.
    // Keep it suppressed long enough that it cannot toggle the checkbox back to
    // its original value after pointer painting handled the tap.
    setTimeout(() => { suppressPatternClick = false; },700);
  }
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
  $('#drums').checked = loadBooleanPreference(DRUMS_KEY,true);
  $('#ignore-feet').checked = loadBooleanPreference(IGNORE_FEET_KEY,true);
  $('#ignore-ghosts').checked = loadBooleanPreference(IGNORE_GHOSTS_KEY,true);
}
function selectedPattern(slot) {
  if (recoveryCards[slot]) return recoveryPulseRoles(stepsPerCard());
  if (trainerMode === 'triplets') return rolesForTripletMasks(tripletCards[slot]);
  if (trainerMode === 'extended') return rolesForExtendedBar(extendedCards[slot]);
  const melody = MELODIES[Number(selectors[slot].value)] || MELODIES[0];
  if (trainerMode === 'kick') return rolesForKickVocabulary(melody);
  if (trainerMode === 'kick2') return rolesForKickVocabulary2(melody);
  return melody;
}
function selectedMasks(slot) {
  return tripletMasksForRoles(selectedPattern(slot));
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
function beamVerticalEdgeAtX(element,x,edge) {
  const box = element.getBBox();
  const coordinates = (element.querySelector('path')?.getAttribute('d') || '')
    .match(/-?\d+(?:\.\d+)?/g)?.map(Number) || [];
  if (coordinates.length < 8) return edge === 'bottom' ? box.y+box.height : box.y;
  const leftX = coordinates[0];
  const leftY = edge === 'bottom'
    ? Math.max(coordinates[1],coordinates[3])
    : Math.min(coordinates[1],coordinates[3]);
  const rightX = coordinates[4];
  const rightY = edge === 'bottom'
    ? Math.max(coordinates[5],coordinates[7])
    : Math.min(coordinates[5],coordinates[7]);
  if (rightX === leftX) return edge === 'bottom' ? Math.max(leftY,rightY) : Math.min(leftY,rightY);
  const ratio = Math.max(0,Math.min(1,(x-leftX)/(rightX-leftX)));
  return leftY+(rightY-leftY)*ratio;
}
function positionKick2SnareAccents(target,notes) {
  const beams = [...target.querySelectorAll('.vf-beam')].map(element => ({ element,box:element.getBBox() }));
  if (!beams.length) return;
  notes.filter(note => note.trainerPatternAccent).forEach(note => {
    const notehead = note.getSVGElement?.()?.querySelector('.vf-notehead');
    const paths = notehead
      ? [...notehead.children].filter(child => child.tagName.toLowerCase() === 'path')
      : [];
    const accent = paths[1];
    if (!accent) return;
    const accentBox = accent.getBBox();
    const overlapping = beams.filter(({ box }) => (
      accentBox.x+accentBox.width >= box.x && accentBox.x <= box.x+box.width
    ));
    if (!overlapping.length) return;
    const centerX = accentBox.x+accentBox.width/2;
    const beamBottom = Math.max(...overlapping.map(({ element }) => (
      beamVerticalEdgeAtX(element,centerX,'bottom')
    )));
    const shift = Math.max(0,beamBottom+5-accentBox.y);
    if (shift) accent.setAttribute('transform',`translate(0 ${shift})`);
  });
}
function renderKickCard(slot,target,width) {
  const VF = vexflow();
  const height = $('#show-counting').checked ? 168 : 148;
  const renderer = new VF.Renderer(target,VF.Renderer.Backends.SVG);
  renderer.resize(width,height);
  const context = renderer.getContext();
  const stave = new VF.Stave(8,20,width-16);
  stave.addClef('percussion').addTimeSignature('4/4');
  stave.setContext(context).draw();
  if (slot > 0) {
    target.querySelectorAll('.vf-clef,.vf-timesignature').forEach(element => {
      element.style.visibility = 'hidden';
    });
  }

  const roles = selectedPattern(slot);
  const recovering = recoveryCards[slot];
  const kick2 = trainerMode === 'kick2' && !recovering;
  const patternStartStep = kick2 ? 6 : 0;
  const patternRoles = kick2 ? roles.slice(6,12) : roles.slice(0,6);
  const masks = Array.from({ length:2 },(_,group) => patternRoles
    .slice(group*3,group*3+3)
    .map(role => role === 'A' || (kick2 && role === 'S') ? '1' : '0')
    .join(''));
  const patternGroups = masks.map((mask,beat) => {
    const spelling = DRUM_HIDDEN_TRIPLET_SPELLINGS[mask];
    const notes = spelling.events.map(event => {
      const step = patternStartStep+beat*3+event.step;
      const patternSnare = kick2 && step === 6 && !event.rest;
      const note = new VF.StaveNote({
        clef:'percussion',
        keys:[event.rest ? 'b/4' : recovering || patternSnare ? 'c/5' : 'f/4'],
        duration:`${event.duration}${event.rest ? 'r' : ''}`,
        stem_direction:VF.Stem.DOWN
      });
      note.trainerStep = step;
      note.trainerSlots = event.slots;
      note.trainerCount = event.rest ? '' : tripletCountForStep(step);
      if (patternSnare) {
        note.addModifier(new VF.Articulation('a>').setPosition(VF.Modifier.Position.BELOW),0);
        note.trainerPatternAccent = true;
      }
      return note;
    });
    const beamable = notes.filter((note,index) => !spelling.events[index].rest && spelling.events[index].duration === '8');
    return {
      notes,
      beam:beamable.length > 1 ? new VF.Beam(beamable) : null,
      tuplet:spelling.tuplet ? new VF.Tuplet(notes,{
        num_notes:3,
        notes_occupied:2,
        bracketed:true,
        ratioed:false,
        location:VF.Tuplet.LOCATION_BOTTOM
      }) : null
    };
  });
  const patternPaddingNotes = kick2
    ? Array.from({ length:2 },(_,beat) => {
      const kick = beat === 0;
      const note = new VF.StaveNote({
        clef:'percussion',keys:[kick ? 'f/4' : 'b/4'],duration:`4${kick ? '' : 'r'}`,stem_direction:VF.Stem.DOWN
      });
      note.trainerStep = beat*3;
      note.trainerSlots = 3;
      note.trainerHidden = !kick;
      note.trainerCount = kick ? '1' : '';
      return note;
    })
    : Array.from({ length:2 },(_,index) => {
      const note = new VF.StaveNote({
        clef:'percussion',keys:['b/4'],duration:'4r',stem_direction:VF.Stem.DOWN
      });
      note.trainerStep = 6+index*3;
      note.trainerSlots = 3;
      note.trainerHidden = true;
      return note;
    });
  const patternNotes = kick2
    ? [...patternPaddingNotes,...patternGroups.flatMap(group => group.notes)]
    : [...patternGroups.flatMap(group => group.notes),...patternPaddingNotes];
  const grooveNotes = Array.from({ length:4 },(_,beat) => {
    const landing = recovering ? beat >= 2 : beat === 2;
    const silent = recovering && beat < 2;
    const keys = silent
      ? ['b/4']
      : recovering
        ? ['c/5']
        : landing && !kick2 ? ['c/5','f/5/x2'] : ['f/5/x2'];
    const note = new VF.StaveNote({
      clef:'percussion',keys,duration:silent ? '4r' : '4',stem_direction:VF.Stem.UP
    });
    note.trainerStep = beat*3;
    note.trainerSlots = 3;
    note.trainerHidden = recovering && silent;
    if (!recovering && landing && !kick2) {
      const accent = new VF.Articulation('a>').setPosition(VF.Modifier.Position.ABOVE);
      note.addModifier(accent,0);
      note.trainerCount = '3';
    } else if (recovering && landing) {
      note.trainerCount = String(beat+1);
    }
    return note;
  });
  const patternVoice = new VF.Voice({ num_beats:4,beat_value:4 }).setMode(VF.Voice.Mode.SOFT);
  const grooveVoice = new VF.Voice({ num_beats:4,beat_value:4 }).setMode(VF.Voice.Mode.SOFT);
  patternVoice.addTickables(patternNotes);
  grooveVoice.addTickables(grooveNotes);
  const voices = [patternVoice,grooveVoice];
  new VF.Formatter().joinVoices(voices).format(voices,Math.max(150,width-112));
  voices.forEach(voice => voice.draw(context,stave));
  patternGroups.forEach(group => group.beam?.setContext(context).draw());
  positionKick2SnareAccents(target,patternNotes);
  patternGroups.forEach(group => {
    if (!group.tuplet) return;
    if (typeof context.openGroup === 'function') context.openGroup('tuplet');
    group.tuplet.setContext(context).draw();
    if (typeof context.closeGroup === 'function') context.closeGroup();
  });
  if ($('#show-counting').checked) {
    const svg = target.querySelector('svg');
    [...patternNotes,...grooveNotes].filter(note => note.trainerCount).forEach(note => {
      const annotation = document.createElementNS('http://www.w3.org/2000/svg','text');
      annotation.classList.add('reduced-triplet-annotation');
      annotation.setAttribute('x',String(note.getAbsoluteX()));
      annotation.setAttribute('y',String(height-8));
      annotation.setAttribute('text-anchor','middle');
      annotation.setAttribute('font-family','Arial, sans-serif');
      annotation.setAttribute('font-size','9');
      annotation.textContent = note.trainerCount;
      svg.append(annotation);
    });
  }

  const stepElements = Array.from({ length:roles.length },() => []);
  const stems = renderedDrumStems(target,VF.StaveNote.STEM_UP,VF.StaveNote.STEM_DOWN);
  [...patternNotes,...grooveNotes].forEach(note => {
    const element = note.getSVGElement?.();
    if (note.trainerHidden) {
      element?.classList.add('drum-hidden-playback-note');
      return;
    }
    element?.classList.add('drum-step');
    const coveredSteps = Array.from({ length:note.trainerSlots || 1 },(_,offset) => note.trainerStep+offset)
      .filter(step => step < stepElements.length);
    coveredSteps.forEach(step => addDrumStepElement(stepElements,step,element));
    const stem = renderedStemForNote(stems,note);
    if (stem) {
      stem.classList.add('drum-step-stem');
      coveredSteps.forEach(step => addDrumStepElement(stepElements,step,stem));
    }
  });
  cards[slot].stepElements = stepElements;
}
function renderCard(slot) {
  const VF = vexflow();
  const target = cards[slot].querySelector('.notation');
  target.replaceChildren();
  if (!VF) { target.textContent = 'Notation could not load.'; return; }
  const width = Math.max(290, Math.floor(target.clientWidth || 360));
  if (trainerMode === 'kick' || trainerMode === 'kick2') {
    renderKickCard(slot,target,width);
    return;
  }
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
  const ignoreFeet = $('#ignore-feet');
  if (trainerMode === 'kick' || trainerMode === 'kick2') {
    ignoreFeet.checked = false;
    ignoreFeet.disabled = true;
    ignoreFeet.closest('label').title = 'Kick strokes are scoring input in Kick mode';
  } else {
    ignoreFeet.checked = loadBooleanPreference(IGNORE_FEET_KEY,true);
    ignoreFeet.disabled = false;
    ignoreFeet.closest('label').title = 'Ignore incoming kick and pedal-hi-hat MIDI notes when scoring';
  }
  cards.forEach((card,slot) => {
    card.hidden = slot >= activeCardCount();
    card.querySelector('.card-kind').textContent = trainerMode === 'triplets'
      ? `Bar ${slot+1}`
      : trainerMode === 'extended' ? `Bar ${slot+1}` : 'Melody';
  });
  if (trainerMode === 'extended') populateExtendedSelectors();
  else if (trainerMode === 'vocabulary' || trainerMode === 'kick' || trainerMode === 'kick2') selectors.forEach(select => {
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
    $('#randomize').textContent = 'Scramble queued';
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
  consecutiveExpiredTargets = 0;
  phraseStartTime = null;
  updatePracticeScore();
}
function resetRecoveryState() {
  recoveryMode = false;
  recoveryExitQueued = false;
  recoveryCards = [false,false,false];
  recoveryScore = createPracticeScore();
  recoveryExpectedHits = [];
  recoveryCalibration = [];
  practiceHasStarted = false;
  consecutiveExpiredTargets = 0;
}
function queueNotationRender() {
  const timer = setTimeout(() => {
    visualTimers.delete(timer);
    renderAll();
  },0);
  visualTimers.add(timer);
}
function queueCardRender(slot, time = null) {
  const delay = time === null || !audioContext
    ? 0
    : Math.max(0,(calibratedVisualTime(time,latencyCompensation)-audioContext.currentTime)*1000);
  const timer = setTimeout(() => {
    visualTimers.delete(timer);
    renderCard(slot);
  },delay);
  visualTimers.add(timer);
}
function enterRecovery(currentSlot = activeSlot) {
  recoveryMode = true;
  recoveryExitQueued = false;
  recoveryCards = recoveryCards.map((_,slot) => slot !== currentSlot);
  recoveryScore = createPracticeScore();
  recoveryExpectedHits = [];
  recoveryCalibration = [];
  deferredPracticeMisses = 0;
  consecutiveExpiredTargets = 0;
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
  const nextSlot = (currentSlot+1)%activeCardCount();
  recoveryCards[previousSlot] = false;
  randomizeSlot(previousSlot);
  recoveryCards[nextSlot] = false;
  randomizeSlot(nextSlot);
}
function leaveRecovery() {
  recoveryMode = false;
  recoveryExitQueued = false;
  recoveryCards = [false,false,false];
  recoveryScore = createPracticeScore();
  recoveryExpectedHits = [];
  recoveryCalibration = [];
  practiceHasStarted = false;
  consecutiveExpiredTargets = 0;
  resetPracticeSession();
  queueNotationRender();
}
function observeRecoveryCalibration(rawTime) {
  const observedTargets = new Set(recoveryCalibration.map(observation => observation.expected));
  const candidate = recoveryExpectedHits
    .filter(expected => !expected.matched && !expected.expired && !observedTargets.has(expected))
    .map(expected => ({ expected,offset:rawTime-expected.time }))
    .filter(observation => observation.offset >= 0 && observation.offset <= .65)
    .sort((a,b) => a.offset-b.offset)[0];
  if (!candidate) return false;

  const previous = recoveryCalibration.at(-1);
  if (previous && Math.abs((candidate.expected.time-previous.expected.time)-quarterDuration()) > quarterDuration()*.25) {
    recoveryCalibration = [];
  }
  recoveryCalibration.push({ ...candidate,rawTime });
  recoveryCalibration = recoveryCalibration.slice(-4);
  const tolerance = Math.max(.035,Math.min(.07,quarterDuration()*.18));
  const learnedOffset = consistentCalibrationOffset(recoveryCalibration.map(observation => observation.offset),tolerance,3);
  if (learnedOffset === null) return false;

  saveLatencyCompensation(learnedOffset);
  const accepted = recoveryCalibration.slice(-3);
  const firstAcceptedTime = accepted[0].expected.time;
  recoveryExpectedHits = recoveryExpectedHits.filter(expected => expected.time >= firstAcceptedTime);
  recoveryScore = createPracticeScore();
  accepted.forEach(({ expected,rawTime:observedTime }) => {
    if (expected.matched) return;
    expected.matched = true;
    recoveryScore.hits += 1;
    recoveryScore.streak += 1;
    recoveryScore.bestStreak = Math.max(recoveryScore.bestStreak,recoveryScore.streak);
    recoveryScore.totalAbsoluteError += Math.abs((observedTime-learnedOffset)-expected.time);
  });
  recoveryCalibration = [];
  setStatus(`Latency adjusted to ${Math.round(learnedOffset*1000)} ms`);
  const lastAccepted = accepted.at(-1)?.expected;
  if (lastAccepted && recoveryScore.streak >= recoveryHitTarget(stepsPerCard())) beginRecoveryExit(lastAccepted.slot);
  return true;
}
function expirePracticeScore(now = audioContext?.currentTime ?? 0) {
  if (recoveryMode) {
    const windows = practiceTimingWindows(eventDuration());
    expirePracticeHits(recoveryScore,recoveryExpectedHits,now,{ early:windows.early,late:Math.max(.7,windows.late) });
    recoveryExpectedHits = recoveryExpectedHits.filter(expected => !expected.expired && (!expected.matched || now < expected.time+1));
    return;
  }
  const expiredTargets = expirePracticeTargets(expectedPracticeHits,now,practiceTimingWindows(eventDuration()));
  deferredPracticeMisses += expiredTargets;
  if (practiceHasStarted) consecutiveExpiredTargets += expiredTargets;
  expectedPracticeHits = expectedPracticeHits.filter(expected => !expected.expired && (!expected.matched || now < expected.time+1));
  if (practiceHasStarted && consecutiveExpiredTargets >= 4) {
    enterRecovery(activeSlot);
  }
}
function registerPracticeHit(source = 'tap',hitTime = null) {
  if (!playing || !audioContext || phraseStartTime === null) return;
  const rawTime = hitTime ?? audioContext.currentTime;
  const time = rawTime-latencyCompensation;
  const windowSeconds = practiceTimingWindows(eventDuration());
  if (time < phraseStartTime-windowSeconds.early) return;
  practiceHasStarted = true;
  if (recoveryMode) {
    const result = scorePracticeTap(recoveryScore,recoveryExpectedHits,time,windowSeconds);
    if (result.kind === 'hit') {
      recoveryCalibration = [];
      if (recoveryScore.streak >= recoveryHitTarget(stepsPerCard())) beginRecoveryExit(result.expected.slot);
    } else {
      observeRecoveryCalibration(rawTime);
    }
    expirePracticeScore(time);
    return;
  }
  expirePracticeScore(time);
  commitPracticeMisses(practiceScore,deferredPracticeMisses);
  deferredPracticeMisses = 0;
  const result = scorePracticeTap(practiceScore,expectedPracticeHits,time,windowSeconds);
  if (result.kind === 'hit') consecutiveExpiredTargets = 0;
  updatePracticeScore();
}
function midiTimestamp(time) { return performance.now() + Math.max(0, time - audioContext.currentTime) * 1000; }
function scheduleMidi(note, velocity, time, duration = .06) {
  if (!midiOutput || velocity <= 0) return;
  const stamp = midiTimestamp(time);
  midiOutput.send([0x99,note,velocity], stamp);
  midiOutput.send([0x89,note,0], stamp + duration * 1000);
}
function scheduleFallbackSnare(time, velocity) {
  if (velocity <= 0) return;
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
function scheduleCalibrationClick(time) {
  const oscillator = audioContext.createOscillator();
  const gain = audioContext.createGain();
  oscillator.type = 'sine';
  oscillator.frequency.setValueAtTime(880,time);
  gain.gain.setValueAtTime(.0001,time);
  gain.gain.exponentialRampToValueAtTime(.24,time+.004);
  gain.gain.exponentialRampToValueAtTime(.0001,time+.055);
  oscillator.connect(gain).connect(boostedAudioOutput(audioContext));
  oscillator.start(time);
  oscillator.stop(time+.06);
  oscillator.onended = () => calibrationSources.delete(oscillator);
  calibrationSources.add(oscillator);
}
function trackScheduledSource(source) {
  if (!source) return false;
  scheduledSources.add(source);
  source.onended = () => scheduledSources.delete(source);
  return true;
}
function scheduleHat(time, velocity, midiNote = 44, acousticKit = null) {
  if (velocity <= 0) return;
  if (midiOutput) { scheduleMidi(midiNote, velocity, time, .045); return; }
  if (trackScheduledSource(acousticKit?.schedule(audioContext, {
    velocity,
    time,
    destination:boostedAudioOutput(audioContext)
  }))) return;
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
function scheduleKick(time,velocity) {
  if (velocity <= 0) return;
  if (midiOutput) { scheduleMidi(36,velocity,time,.08); return; }
  if (trackScheduledSource(kickSampleKit?.schedule(audioContext, {
    velocity,
    time,
    destination:boostedAudioOutput(audioContext)
  }))) return;
  const oscillator = audioContext.createOscillator();
  const gain = audioContext.createGain();
  oscillator.type = 'sine';
  oscillator.frequency.setValueAtTime(115,time);
  oscillator.frequency.exponentialRampToValueAtTime(48,time+.09);
  gain.gain.setValueAtTime(Math.max(.025,velocity/127*.7),time);
  gain.gain.exponentialRampToValueAtTime(.001,time+.16);
  oscillator.connect(gain).connect(boostedAudioOutput(audioContext));
  oscillator.start(time);
  oscillator.stop(time+.17);
  oscillator.onended = () => scheduledSources.delete(oscillator);
  scheduledSources.add(oscillator);
}
function scheduleSnare(time, velocity) {
  if (velocity <= 0) return;
  if (midiOutput) scheduleMidi(38, velocity, time);
  else {
    const source = sampleKit?.schedule(audioContext, { velocity, time, destination: boostedAudioOutput(audioContext) });
    if (!trackScheduledSource(source)) scheduleFallbackSnare(time, velocity);
  }
}
function showStep(slot, step, time) {
  const visualTime = calibratedVisualTime(time,latencyCompensation);
  const delay = Math.max(0, (visualTime-audioContext.currentTime)*1000);
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
      queueCardRender(previousSlot,nextEventTime);
    }
    return;
  }
  if (previousSlot === activeCardCount()-1 && queuedRandomize) {
    queuedRandomize = false; $('#randomize').textContent = 'Scramble'; randomizeAll();
  } else if ($('#auto-randomize').checked) {
    const nextPattern = trainerMode === 'triplets'
      ? randomTripletMasks(enabledTripletMasks(),4,Math.random,currentEmphasis())
      : trainerMode === 'extended'
        ? randomExtendedPatternPair(enabledExtendedIndexes(),Math.random,currentEmphasis())
        : String(randomMelody());
    const visualTime = calibratedVisualTime(nextEventTime,latencyCompensation);
    const delay = Math.max(0, (visualTime-audioContext.currentTime)*1000);
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
    return true;
  }
  const cardSteps = stepsPerCard();
  const cardCount = activeCardCount();
  if (playbackScope === 'card' && eventNumber >= cardSteps) {
    clearInterval(scheduler);
    scheduler = null;
    const delay = Math.max(0,(nextEventTime-audioContext.currentTime)*1000);
    clearTimeout(auditionEndTimer);
    auditionEndTimer = setTimeout(finishAudition,delay);
    return false;
  }
  const step = eventNumber%cardSteps;
  const slot = playbackScope === 'card'
    ? auditionSlot
    : Math.floor(eventNumber/cardSteps)%cardCount;
  if (playbackScope === 'session' && eventNumber > 0 && step === 0) {
    crossMelodyBoundary((slot+cardCount-1)%cardCount,slot);
  }
  const role = selectedPattern(slot)[step];
  const currentVelocities = velocityValues();
  const ordinaryKick = role === 'A' || role === 'K';
  const velocity = midiOutput
    ? currentVelocities[role === 'S' ? 2 : ordinaryKick ? 1 : 0]
    : activeVelocities[role === 'S' ? 'accent' : ordinaryKick ? 'normal' : 'ghost'];
  if (playbackScope === 'session' && phraseStartTime === null) {
    phraseStartTime = nextEventTime;
  }
  if (playbackScope === 'session' && (role === 'A' || role === 'K' || role === 'S')) {
    const expected = { time:nextEventTime,slot,step,matched:false,expired:false };
    if (recoveryCards[slot]) recoveryExpectedHits.push(expected);
    else expectedPracticeHits.push(expected);
  }
  const kickVocabulary = (trainerMode === 'kick' || trainerMode === 'kick2') && !recoveryCards[slot];
  const playbackPlan = trainerPlaybackPlan({
    role,
    step,
    kickVocabulary,
    drumsEnabled:$('#drums').checked,
    metronomeEnabled:$('#metronome').checked
  });
  if (playbackPlan.pattern) {
    if (kickVocabulary && (role === 'A' || role === 'K')) scheduleKick(nextEventTime,velocity);
    else scheduleSnare(nextEventTime,velocity);
  }
  if (playbackPlan.grooveHat) {
    const articulation = alternatingClosedHiHatArticulation(Math.floor(eventNumber/3));
    scheduleHat(
      nextEventTime,
      midiOutput ? currentVelocities[1] : activeVelocities.normal,
      closedHiHatMidiNote(articulation),
      articulation === 'closed-edge' ? closedHatEdgeSampleKit : closedHatTipSampleKit
    );
  }
  if (playbackPlan.metronome) {
    const quarterBeat = Math.floor(eventNumber/3);
    scheduleHat(nextEventTime,quarterBeat%4 === 0 ? currentVelocities[2] : currentVelocities[1]);
  }
  showStep(slot, step, nextEventTime);
  nextEventTime += eventDuration(eventNumber); eventNumber += 1;
  return true;
}
function schedulerTick() {
  if (!playing) return;
  if (playbackScope === 'session') expirePracticeScore((audioContext?.currentTime ?? 0)-latencyCompensation);
  while (nextEventTime < audioContext.currentTime+.11) {
    if (!scheduleEvent()) break;
  }
}
async function prepareKickModeSamples(normalVelocity) {
  if (midiOutput || (trainerMode !== 'kick' && trainerMode !== 'kick2')) return;
  try {
    kickSampleKit ||= await sampleLibrary.getKit({ kitId:FIXED_DRUM_SAMPLE_KIT_IDS.kickCenter });
    await kickSampleKit.prepare(audioContext,[normalVelocity]);
  } catch (error) {
    kickSampleKit = null;
    console.warn('Using synthesized kick fallback.',error);
  }
  try {
    closedHatTipSampleKit ||= await sampleLibrary.getKit({ kitId:FIXED_DRUM_SAMPLE_KIT_IDS.closedHiHatTip });
    await closedHatTipSampleKit.prepare(audioContext,[normalVelocity]);
  } catch (error) {
    closedHatTipSampleKit = null;
    console.warn('Using synthesized hi-hat tip fallback.',error);
  }
  try {
    closedHatEdgeSampleKit ||= await sampleLibrary.getKit({ kitId:FIXED_DRUM_SAMPLE_KIT_IDS.closedHiHatEdge });
    await closedHatEdgeSampleKit.prepare(audioContext,[normalVelocity]);
  } catch (error) {
    closedHatEdgeSampleKit = null;
    console.warn('Using synthesized hi-hat edge fallback.',error);
  }
}
async function prepareAudio() {
  const AudioContextClass = window.AudioContext || window.webkitAudioContext;
  if (!AudioContextClass) throw new Error('Web Audio is unavailable in this browser.');
  audioContext ||= new AudioContextClass({ latencyHint:'interactive' });
  await audioContext.resume();
  if (midiOutput) return;
  const [ghost, normal, accent] = velocityValues();
  const requested = { ghost, normal, accent };
  if (!$('#drums').checked) {
    activeVelocities = requested;
    return;
  }
  try {
    sampleKit ||= await sampleLibrary.getKit({ kitId:sampleKitId });
    await sampleKit.prepare(audioContext, [ghost, normal, accent].filter(velocity => velocity > 0));
  } catch (error) { console.warn('Using synthesized snare fallback.', error); }
  await prepareKickModeSamples(normal);
  activeVelocities = requested;
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
function setCardAuditionState(state = 'idle',slot = null) {
  cards.forEach((card,index) => {
    const button = card.querySelector('.card-audition');
    const active = index === slot && state === 'playing';
    const loading = index === slot && state === 'loading';
    const queuedIndex = state === 'playing' ? auditionQueue.indexOf(index) : -1;
    const queued = queuedIndex >= 0;
    button.textContent = loading ? '…' : active ? '■' : queued ? String(queuedIndex+2) : '▶';
    button.classList.toggle('is-playing',active);
    button.classList.toggle('is-queued',queued);
    button.disabled = loading;
    button.setAttribute('aria-label',loading ? `Loading card ${index+1}` : active ? `Stop all card playback` : queued ? `Remove card ${index+1} from queue position ${queuedIndex+2}` : `Play card ${index+1}`);
    button.title = loading ? 'Loading' : active ? 'Stop all' : queued ? `Queued ${queuedIndex+2}` : 'Play this card';
  });
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
  if (playing) {
    stop();
    return;
  }
  setTapMode(tapMode);
  if (tapMode) scrollToTapPad();
  setTransportState('loading');
  try {
    await prepareAudio();
    if (document.hidden) throw new Error('Return to this tab before starting playback.');
    const withMetronome = $('#metronome').checked;
    resetRecoveryState();
    resetPracticeSession();
    playing = true; playbackScope = 'session'; auditionSlot = null; auditionQueue = []; eventNumber = 0; activeSlot = 0; countInBeat = 0; countInBeatsRemaining = withMetronome ? 4 : 0; nextEventTime = audioContext.currentTime+.08;
    void screenWakeLock.setActive(true);
    setTransportState('stop'); updatePositions(0); setStatus('');
    scheduler = setInterval(schedulerTick, 25); schedulerTick();
  } catch (error) { setTapMode(false); setTransportState('play'); setStatus(error.message || 'Could not start playback'); }
}
async function auditionCard(slot) {
  if (playing && playbackScope === 'card') {
    const update = updateAuditionQueue(auditionQueue,{ activeSlot:auditionSlot,slot,maxPatterns:3 });
    if (update.action === 'stop') {
      stop();
      return;
    }
    auditionQueue = update.queue;
    setCardAuditionState('playing',auditionSlot);
    setStatus(update.action === 'full' ? 'The audition queue holds three patterns.' : '');
    return;
  }
  if (playing) {
    stop();
  }
  setTapMode(false);
  setCardAuditionState('loading',slot);
  try {
    await prepareAudio();
    if (document.hidden) throw new Error('Return to this tab before starting playback.');
    resetRecoveryState();
    expectedPracticeHits = [];
    playbackScope = 'card';
    auditionSlot = slot;
    auditionQueue = [];
    playing = true;
    eventNumber = 0;
    countInBeat = 0;
    countInBeatsRemaining = 0;
    nextEventTime = audioContext.currentTime+.08;
    void screenWakeLock.setActive(true);
    setTransportState('stop');
    setCardAuditionState('playing',slot);
    updatePositions(slot);
    setStatus('');
    scheduler = setInterval(schedulerTick,25);
    schedulerTick();
  } catch (error) {
    playbackScope = null;
    auditionSlot = null;
    setCardAuditionState();
    setStatus(error.message || 'Could not play this card');
  }
}
function finishAudition() {
  if (playbackScope !== 'card') return;
  clearInterval(scheduler);
  scheduler = null;
  clearTimeout(auditionEndTimer);
  auditionEndTimer = null;
  if (auditionQueue.length) {
    auditionSlot = auditionQueue.shift();
    eventNumber = 0;
    countInBeat = 0;
    countInBeatsRemaining = 0;
    nextEventTime = Math.max(nextEventTime,audioContext.currentTime+.005);
    setCardAuditionState('playing',auditionSlot);
    updatePositions(auditionSlot);
    scheduler = setInterval(schedulerTick,25);
    schedulerTick();
    return;
  }
  playing = false;
  playbackScope = null;
  auditionSlot = null;
  auditionQueue = [];
  void screenWakeLock.setActive(false);
  cards.forEach(card => card.stepElements?.flat().forEach(element => element?.classList.remove('drum-current-note')));
  setTransportState('play');
  setCardAuditionState();
}
function stop() {
  playing = false; clearInterval(scheduler); scheduler = null;
  clearTimeout(auditionEndTimer); auditionEndTimer = null;
  playbackScope = null;
  auditionSlot = null;
  auditionQueue = [];
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
  setTransportState('play'); setCardAuditionState(); setStatus('');
}

function attachMidiInput(nextInput) {
  if (midiInput) midiInput.onmidimessage = null;
  midiInput = nextInput || null;
  if (!midiInput) return;
  midiInput.onmidimessage = event => {
    const [status,note,velocity = 0] = event.data || [];
    if ((status&0xf0) !== 0x90 || velocity <= 0) return;
    if ((trainerMode === 'kick' || trainerMode === 'kick2') && [42,44,46].includes(Number(note))) return;
    const [ghostVelocity,normalVelocity] = velocityValues();
    const accepted = midiPracticeHitAccepted(note,velocity,{
      ignoreFeet:$('#ignore-feet').checked,
      ignoreGhosts:$('#ignore-ghosts').checked,
      ghostVelocity,
      normalVelocity
    });
    if (!accepted) return;
    showMidiActivity();
    if (calibrationRun) { recordCalibrationTap(); return; }
    registerPracticeHit('midi');
  };
}
function showMidiActivity() {
  const indicator = $('#midi-activity');
  clearTimeout(midiActivityTimer);
  indicator.classList.add('is-active');
  midiActivityTimer = setTimeout(() => indicator.classList.remove('is-active'),90);
}
function calibrationStatus(message) { $('#calibration-status').textContent = message; }
function cancelCalibrationRun() {
  if (!calibrationRun) return;
  clearTimeout(calibrationRun.finishTimer);
  calibrationSources.forEach(source => { try { source.stop(); } catch {} });
  calibrationSources.clear();
  calibrationRun = null;
  $('#calibration-tap').classList.remove('is-listening');
  $('#calibration-start').textContent = 'Start';
}
async function startCalibration() {
  cancelCalibrationRun();
  if (playing) stop();
  try {
    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    if (!AudioContextClass) throw new Error('Web Audio is unavailable in this browser.');
    audioContext ||= new AudioContextClass({ latencyHint:'interactive' });
    await audioContext.resume();
    const interval = .8;
    const firstTime = audioContext.currentTime+.45;
    const clickTimes = Array.from({ length:10 },(_,index) => firstTime+index*interval);
    clickTimes.forEach(scheduleCalibrationClick);
    calibrationRun = { clickTimes, used:new Set(), offsets:[], finishTimer:null };
    calibrationRun.finishTimer = setTimeout(finishCalibration,Math.ceil((clickTimes.at(-1)-audioContext.currentTime+.75)*1000));
    $('#calibration-tap').classList.add('is-listening');
    $('#calibration-start').textContent = 'Restart';
    calibrationStatus('Listen, then tap with each click');
  } catch (error) { calibrationStatus(error.message || 'Calibration could not start'); }
}
function recordCalibrationTap(time = audioContext?.currentTime) {
  if (!calibrationRun || !Number.isFinite(time)) return;
  const candidates = calibrationRun.clickTimes
    .map((clickTime,index) => ({ index,difference:time-clickTime }))
    .filter(candidate => !calibrationRun.used.has(candidate.index) && candidate.difference >= -.2 && candidate.difference <= .65)
    .sort((a,b) => Math.abs(a.difference)-Math.abs(b.difference));
  const match = candidates[0];
  if (!match) return;
  calibrationRun.used.add(match.index);
  if (match.index < 2) {
    calibrationStatus('Get ready…');
    return;
  }
  calibrationRun.offsets.push(match.difference);
  calibrationStatus(`${calibrationRun.offsets.length} of 8 taps captured`);
  if (calibrationRun.offsets.length === 8) finishCalibration();
}
function finishCalibration() {
  if (!calibrationRun) return;
  const offsets = calibrationRun.offsets;
  cancelCalibrationRun();
  if (offsets.length < 5) {
    calibrationStatus('Not enough taps — try again');
    return;
  }
  const offset = calibrationOffsetSeconds(offsets);
  saveLatencyCompensation(offset);
  calibrationStatus(`Saved ${Math.round(offset*1000)} ms`);
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
  if (!audioContext || midiOutput) return;
  const [ghost, normal, accent] = velocityValues();
  const requested = { ghost, normal, accent };
  try {
    sampleKit ||= await sampleLibrary.getKit({ kitId:sampleKitId });
    await sampleKit.prepare(audioContext, [ghost, normal, accent].filter(velocity => velocity > 0));
    await prepareKickModeSamples(normal);
    activeVelocities = requested;
    setStatus('');
  } catch { setStatus('Velocity samples unavailable'); }
}
initializeAutoShuffle();
initializeDisplayOptions();
initializeSelectors();
initializeTempo();
initializeVelocities();
updateCalibrationLabel();
randomizeTripletCards();
updateModeUI();
$('#melody-filter-options').addEventListener('change',changeEnabledPatterns);
$('#melody-filter-options').addEventListener('pointerdown',beginPatternPaint);
$('#melody-filter-options').addEventListener('pointermove',continuePatternPaint);
$('#melody-filter-options').addEventListener('pointerup',endPatternPaint);
$('#melody-filter-options').addEventListener('pointercancel',endPatternPaint);
$('#melody-filter-options').addEventListener('lostpointercapture',() => { patternPaint = null; });
$('#melody-filter-options').addEventListener('click',event => {
  if (!suppressPatternClick || !event.target.closest('label')) return;
  event.preventDefault();
  suppressPatternClick = false;
});
$('#melody-filter-options').addEventListener('keydown',event => {
  if (!['Space','Enter'].includes(event.code) || !event.target.matches('input[type="checkbox"]')) return;
  event.preventDefault();
  event.target.checked = !event.target.checked;
  changeEnabledPatterns({ target:event.target });
});
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
  trainerMode = ['vocabulary','extended','triplets','kick','kick2'].includes(event.target.value) ? event.target.value : 'vocabulary';
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
document.querySelectorAll('.card-audition').forEach(button => button.addEventListener('click',event => {
  event.stopPropagation();
  event.currentTarget.blur();
  auditionCard(Number(event.currentTarget.dataset.slot));
}));
$('#randomize').addEventListener('click', requestRandomize);
$('#calibrate').addEventListener('click',() => {
  if (playing) stop();
  calibrationStatus(latencyCompensation ? `Current: ${Math.round(latencyCompensation*1000)} ms` : 'Ready');
  $('#calibration-dialog').showModal();
});
$('#calibration-start').addEventListener('click',startCalibration);
$('#calibration-tap').addEventListener('pointerdown',event => {
  event.preventDefault();
  recordCalibrationTap();
});
$('#calibration-clear').addEventListener('click',() => {
  cancelCalibrationRun();
  saveLatencyCompensation(0);
  calibrationStatus('Calibration cleared');
});
$('#calibration-close').addEventListener('click',() => $('#calibration-dialog').close());
$('#calibration-dialog').addEventListener('close',cancelCalibrationRun);
$('#auto-randomize').addEventListener('change', event => {
  try { localStorage.setItem(AUTO_SHUFFLE_KEY, String(event.target.checked)); } catch {}
});
$('#metronome').addEventListener('change',event => {
  try { localStorage.setItem(METRONOME_KEY,String(event.target.checked)); } catch {}
  if (playing) { stop(); start(); }
});
$('#drums').addEventListener('change',event => {
  try { localStorage.setItem(DRUMS_KEY,String(event.target.checked)); } catch {}
  if (!event.target.checked && !$('#metronome').checked) {
    $('#metronome').checked = true;
    try { localStorage.setItem(METRONOME_KEY,'true'); } catch {}
  }
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
    values.every(value => Number.isInteger(value) && value >= 0 && value <= 127) &&
    values[1] >= 1 && values[2] >= 1 &&
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
  const values = pushOrderedVelocities(velocityValues(), index, Number(input.value), { minimum:0 });
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
  if (calibrationRun) {
    event.preventDefault();
    recordCalibrationTap();
    return;
  }
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
document.addEventListener('visibilitychange', () => {
  if (!document.hidden) return;
  if (playing) stop();
  cancelCalibrationRun();
});
window.addEventListener('blur', () => {
  if (playing) stop();
  cancelCalibrationRun();
});
populateSampleKits();
