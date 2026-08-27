import { compileRhythmSource, serializeRhythmPattern } from './rhythm-language.js';

const $ = (selector) => document.querySelector(selector);

const THEME_KEY = 'personal-wiki-theme';
const PATTERN_KEY = 'drum-groove-explorer-pattern-v1';
const SETTINGS_KEY = 'drum-groove-explorer-settings-v1';
const VIEW_KEY = 'drum-groove-explorer-view-v1';
const SCENE_SCHEMA = 4;
const sceneIds = ['verse-1', 'verse-2', 'chorus-1', 'chorus-2', 'bridge-1', 'bridge-2'];

const instruments = [
  { id: 'cr2', label: 'Crash 2', key: 'c/6/X2', family: 'cymbal', midi: 57, pan: .55, states: ['off', 'hit', 'accent'] },
  { id: 'cr1', label: 'Crash 1', key: 'b/5/X2', family: 'cymbal', midi: 49, pan: -.45, states: ['off', 'hit', 'accent'] },
  { id: 'china', label: 'China', key: 'a/5/X2', family: 'cymbal', midi: 52, pan: .35, states: ['off', 'hit', 'accent'] },
  { id: 'ride', label: 'Ride', key: 'g/5/X2', family: 'ride', midi: 51, pan: .45, states: ['off', 'hit', 'accent'] },
  { id: 'cowbell', label: 'Cowbell', key: 'f/5/X2', family: 'cowbell', midi: 56, pan: .2, states: ['off', 'hit', 'accent'] },
  { id: 'hh', label: 'Hi-hat', key: 'f/5/X2', family: 'hat', midi: 42, pan: -.35, states: ['off', 'closed', 'open', 'bark', 'accent'] },
  { id: 'ph', label: 'Pedal hi-hat', key: 'd/4/X2', family: 'pedal-hat', midi: 44, pan: -.35, states: ['off', 'chick', 'splash', 'accent'] },
  { id: 'ht', label: 'High tom', key: 'e/5', family: 'tom', midi: 48, pitch: 190, pan: -.35, states: ['off', 'hit', 'ghost', 'flam', 'drag', 'accent'] },
  { id: 'mt', label: 'Mid tom', key: 'd/5', family: 'tom', midi: 47, pitch: 145, pan: .05, states: ['off', 'hit', 'ghost', 'flam', 'drag', 'accent'] },
  { id: 'lt', label: 'Low tom', key: 'b/4', family: 'tom', midi: 45, pitch: 112, pan: .28, states: ['off', 'hit', 'ghost', 'flam', 'drag', 'accent'] },
  { id: 'ft', label: 'Floor tom', key: 'a/4', family: 'tom', midi: 43, pitch: 82, pan: .48, states: ['off', 'hit', 'ghost', 'flam', 'drag', 'accent'] },
  { id: 'sn', label: 'Snare', key: 'c/5', family: 'snare', midi: 38, pan: .08, states: ['off', 'hit', 'ghost', 'cross-stick', 'flam', 'drag', 'accent'] },
  { id: 'bd', label: 'Kick', key: 'f/4', family: 'kick', midi: 36, pan: 0, states: ['off', 'hit', 'accent'] }
];

const meters = {
  '4/4': { numerator: 4, denominator: 4, slots: 16, groups: [0, 4, 8, 12], backbeats: [4, 12], anchors: [0, 8], beams: [[1, 4]] },
  '3/4': { numerator: 3, denominator: 4, slots: 12, groups: [0, 4, 8], backbeats: [4], anchors: [0, 8], beams: [[1, 4]] },
  '5/4': { numerator: 5, denominator: 4, slots: 20, groups: [0, 4, 8, 12, 16], backbeats: [4, 12], anchors: [0, 8, 16], beams: [[1, 4]] },
  '6/8': { numerator: 6, denominator: 8, slots: 12, groups: [0, 6], backbeats: [6], anchors: [0, 6], beams: [[3, 8]] },
  '7/8': { numerator: 7, denominator: 8, slots: 14, groups: [0, 4, 8], backbeats: [4, 8], anchors: [0, 8], beams: [[2, 8], [2, 8], [3, 8]] }
};

const refs = {
  play: $('#play-toggle'), mute: $('#mute-toggle'), volume: $('#master-volume'), volumeOutput: $('#master-volume-output'),
  midiEnable: $('#enable-midi'), midiOutput: $('#midi-output'), midiChannel: $('#midi-channel'), midiClock: $('#midi-clock'),
  liveDrummer: $('#live-drummer'), coreLoopBars: $('#core-loop-bars'), liveEvolution: $('#live-evolution'), liveEvolutionOutput: $('#live-evolution-output'),
  embellishment: $('#embellishment'), embellishmentOutput: $('#embellishment-output'),
  punctuationEvery: $('#punctuation-every'), punctuationChance: $('#punctuation-chance'), punctuationChanceOutput: $('#punctuation-chance-output'),
  scenePhraseBars: $('#scene-phrase-bars'), sceneTransition: $('#scene-transition'), currentScene: $('#current-scene'), queuedScene: $('#queued-scene'),
  sceneButtons: [...document.querySelectorAll('[data-scene]')], cancelScene: $('#cancel-scene'), sceneSelector: $('#scene-selector'),
  sceneContextLabel: $('#scene-context-label'), sceneContextQueued: $('#scene-context-queued'),
  liveCutChance: $('#live-cut-chance'), liveCutChanceOutput: $('#live-cut-chance-output'),
  interjectionBoundary: $('#interjection-boundary'), liveFillLength: $('#live-fill-length'), liveFillStyle: $('#live-fill-style'),
  liveFillActivity: $('#live-fill-activity'), liveFillActivityOutput: $('#live-fill-activity-output'), liveFillLanding: $('#live-fill-landing'),
  liveCutLength: $('#live-cut-length'),
  queueFill: $('#queue-fill'), cancelFill: $('#cancel-fill'), queueCut: $('#queue-cut'), cancelCut: $('#cancel-cut'), liveStatus: $('#live-status'),
  tempo: $('#tempo'), meter: $('#meter'), length: $('#length'), clear: $('#clear-pattern'), copy: $('#copy-source'),
  status: $('#save-status'), preset: $('#preset'), density: $('#kick-density'), syncopation: $('#syncopation'),
  surprise: $('#surprise'), orchestration: $('#orchestration'), linearity: $('#linearity'), backbeat: $('#keep-backbeat'),
  pulseDensity: $('#pulse-density'), timekeeper: $('#timekeeper'), swing: $('#swing'), humanization: $('#humanization'),
  kickIndependence: $('#kick-independence'), beatDisplacement: $('#beat-displacement'), backbeatStrength: $('#backbeat-strength'),
  backbeatDisplacement: $('#backbeat-displacement'), ghostDensity: $('#ghost-density'), dynamicRange: $('#dynamic-range'),
  articulationComplexity: $('#articulation-complexity'), cymbalPunctuation: $('#cymbal-punctuation'),
  fillProbability: $('#fill-probability'), fillLength: $('#fill-length'), registerMovement: $('#register-movement'),
  eventSpacing: $('#event-spacing'), repetition: $('#repetition'), period: $('#period'), phraseContour: $('#phrase-contour'),
  generate: $('#generate-pattern'), resetEverything: $('#reset-everything'), muteAllTracks: $('#mute-all-tracks'), unmuteAllTracks: $('#unmute-all-tracks'),
  mutationMode: $('#mutation-mode'), mutate: $('#mutate-pattern'), grid: $('#step-grid'), notation: $('#notation-target'),
  source: $('#pattern-source'), sourceApply: $('#apply-source'), sourceRevert: $('#revert-source'), sourceStatus: $('#source-status'),
  tags: $('#character-tags'), theme: $('.theme-toggle')
};

const controlHelp = {
  '#play-toggle': 'Starts or stops the current section. Playback loops and follows queued section changes, fills, and cuts.',
  '#master-volume': 'Controls the built-in drum sounds. It does not change MIDI output volume.',
  '#tempo': 'Sets playback speed in beats per minute.',
  '#meter': 'Sets the number and grouping of beats in each bar.',
  '#length': 'Sets how many bars each editable section contains.',
  '#clear-pattern': 'Removes every note from the current section.',
  '#copy-source': 'Copies the current rhythm as plain-text drum notation.',
  '#midi-output': 'Chooses the MIDI destination that receives the drum performance.',
  '#midi-channel': 'Chooses the MIDI channel. Channel 10 is the standard drum channel.',
  '#midi-clock': 'Sends MIDI timing clock at 24 pulses per quarter note, plus Start and Stop, so connected software or hardware can follow Rhythm Explorer’s tempo.',
  '#scene-selector': 'Chooses the complete drum-machine section configured by every tab and by tempo, meter, and length. Selecting here while playing stops playback; use the Live section buttons to queue a musical transition.',
  '#live-drummer': 'Allows the selected section to change between bars while it plays. Turn this off to keep playback fixed while editing.',
  '#core-loop-bars': 'The stable repeating foundation inside each section. Later bars borrow from this one-, two-, or four-bar core.',
  '#scene-phrase-bars': 'The musical span used for major boundaries. Queued sections and automatic phrase events wait for the end of this many bars.',
  '#scene-transition': 'Chooses what happens at the boundary where a queued section becomes active.',
  '#live-evolution': 'Higher values preserve the established groove. Lower values allow more bar-to-bar rhythmic movement.',
  '#embellishment': 'Controls small details layered over the core, such as ghost notes and occasional open hi-hats.',
  '#punctuation-every': 'Sets how often the drummer gets an opportunity to add a structural cymbal accent.',
  '#punctuation-chance': 'Sets the probability that a scheduled punctuation point actually receives a crash.',
  '#live-cut-chance': 'Sets the probability of an automatic brief silence at a phrase ending.',
  '#interjection-boundary': 'Sets the landing boundary for a manual fill or the starting boundary for a cut. A long fill uses the first matching boundary with enough lead-in.',
  '#live-fill-length': 'Sets how much time immediately before the selected boundary is replaced by the fill, from one beat through eight bars.',
  '#live-fill-style': 'Chooses the instruments and motion used by manually queued and section-transition fills.',
  '#live-fill-activity': 'Controls how many available subdivisions in a fill contain strokes.',
  '#live-fill-landing': 'Chooses the accent that marks the return to the groove after a fill.',
  '#live-cut-length': 'Sets how long a manually queued cut remains silent before the groove returns.',
  '#preset': 'Loads a coordinated starting character for all generation controls.',
  '#mutation-mode': 'Chooses whether mutation changes note timing, instrument assignment, or both.',
  '#mutate-pattern': 'Makes a related variation of the selected section using the chosen mutation mode.'
};

function installControlHelp() {
  document.querySelectorAll('.help-tip').forEach(tip => {
    const description = tip.dataset.tooltip || tip.getAttribute('aria-label');
    const label = tip.closest('label');
    const control = label?.querySelector('input, select');
    if (description && label) label.title = description;
    if (description && control) {
      control.title = description;
      control.setAttribute('aria-description', description);
      if (!control.hasAttribute('aria-label')) {
        const labelFragment = [...tip.parentElement.childNodes]
          .filter(node => node !== tip)
          .map(node => node.textContent || '')
          .join('')
          .trim();
        if (labelFragment) control.setAttribute('aria-label', labelFragment);
      }
    }
    tip.remove();
  });

  Object.entries(controlHelp).forEach(([selector, description]) => {
    const control = $(selector);
    if (!control) return;
    control.title = description;
    control.setAttribute('aria-description', description);
    const label = control.closest('label');
    if (!label) return;
    label.title = description;
    const labelText = label.querySelector(':scope > span:first-child');
    if (!control.hasAttribute('aria-label')) {
      const accessibleName = selector === '#scene-selector' ? 'Section' : labelText?.textContent.trim() || (selector === '#live-drummer' ? 'Auto-evolve' : '');
      if (accessibleName) control.setAttribute('aria-label', accessibleName);
    }
  });

  const titledControls = {
    '.view-tabs [data-view="play"]': 'Perform sections and queue live changes.',
    '.view-tabs [data-view="shape"]': 'Generate and mutate the selected section.',
    '.view-tabs [data-view="edit"]': 'Edit the selected section as compact rhythm source or as an instrument grid.',
    '.view-tabs [data-view="inspect"]': 'View notation, analysis details, MIDI setup, and plain-text source.',
    '.scene-button': 'Choose this section now, or queue it for the next phrase boundary during playback.',
    '#cancel-scene': 'Cancel the pending section change.',
    '#queue-fill': 'Queue a fill at the selected boundary.',
    '#cancel-fill': 'Cancel the pending fill.',
    '#queue-cut': 'Queue a brief silence at the selected boundary.',
    '#cancel-cut': 'Cancel the pending cut.',
    '#reset-everything': 'Restore the complete Pocket Rock starting state.',
    '#generate-pattern': 'Create a new version of the selected section from the Shape controls.',
    '#mute-all-tracks': 'Silence every instrument without deleting its notes.',
    '#unmute-all-tracks': 'Restore playback for every instrument.',
    '.transport-more > summary': 'Open pattern, source, and MIDI actions.',
    '.live-options > summary': 'Adjust the shape, duration, activity, and landing of fills and cuts.',
    '.midi-help > summary': 'Show MIDI routing instructions and the drum-note map.',
    '.source-panel > summary': 'Edit the selected section in the compact rhythm language.',
    '#apply-source': 'Compile the source into the selected section. Command-Enter or Control-Enter does the same thing.',
    '#revert-source': 'Discard unapplied source edits and regenerate the shortest source for the current grid.'
  };
  Object.entries(titledControls).forEach(([selector, description]) => {
    document.querySelectorAll(selector).forEach(control => {
      control.title = description;
      control.setAttribute('aria-description', description);
    });
  });

  const metricHelp = {
    'Written attacks': 'The total number of instrument strokes, counting simultaneous instruments separately.',
    'Occupied steps': 'The number of grid positions containing at least one stroke.',
    'Layered steps': 'The number of grid positions where multiple instruments strike together.',
    'Offbeat attacks': 'Attacks outside the meter’s primary beat-group anchors.',
    'Pattern period': 'The shortest number of steps after which the complete pattern repeats exactly.',
    'Articulations': 'The number of accents, ghost notes, flams, drags, open hats, and other special strokes.'
  };
  document.querySelectorAll('.metrics dt').forEach(term => {
    const description = metricHelp[term.textContent.trim()];
    if (description) {
      term.title = description;
      term.setAttribute('aria-description', description);
    }
  });

}

installControlHelp();

const viewButtons = [...document.querySelectorAll('.view-tabs [data-view]')];
const viewPanels = [...document.querySelectorAll('[data-view-panel]')];

function selectView(view, { persist = true } = {}) {
  const selected = viewButtons.some(button => button.dataset.view === view) ? view : 'play';
  viewButtons.forEach(button => {
    button.setAttribute('aria-pressed', String(button.dataset.view === selected));
  });
  viewPanels.forEach(panel => {
    panel.hidden = panel.dataset.viewPanel !== selected;
  });
  if (selected === 'inspect') renderNotation();
  refs.sceneContextLabel.textContent = 'Section';
  if (persist) {
    try { localStorage.setItem(VIEW_KEY, selected); } catch (error) { /* The view can remain session-only. */ }
  }
}

const controlKeys = [
  'density', 'syncopation', 'surprise', 'orchestration', 'linearity', 'pulseDensity', 'swing', 'humanization',
  'kickIndependence', 'beatDisplacement', 'backbeatStrength', 'backbeatDisplacement', 'ghostDensity',
  'dynamicRange', 'articulationComplexity', 'cymbalPunctuation', 'fillProbability', 'fillLength',
  'registerMovement', 'eventSpacing', 'repetition', 'timekeeper', 'period', 'phraseContour'
];

function profile(overrides = {}) {
  return {
    meter: '4/4', bars: 4, tempo: 100, backbeat: true,
    density: 35, syncopation: 40, surprise: 30, orchestration: 25, linearity: 25,
    pulseDensity: 55, timekeeper: 'hh', swing: 0, humanization: 8, kickIndependence: 35, beatDisplacement: 0,
    backbeatStrength: 80, backbeatDisplacement: 0, ghostDensity: 12, dynamicRange: 60,
    articulationComplexity: 15, cymbalPunctuation: 25, fillProbability: 18, fillLength: 30,
    registerMovement: 55, eventSpacing: 50, repetition: 65, period: 'auto', phraseContour: 'flat',
    ...overrides
  };
}

const presetProfiles = {
  pocket: profile({ tempo: 96, density: 32, syncopation: 28, surprise: 18, orchestration: 18, pulseDensity: 52, repetition: 82, humanization: 12 }),
  'linear-funk': profile({ tempo: 104, density: 48, syncopation: 78, surprise: 48, orchestration: 48, linearity: 92, pulseDensity: 92, ghostDensity: 52, articulationComplexity: 38, eventSpacing: 38, repetition: 55 }),
  halftime: profile({ tempo: 84, density: 24, syncopation: 42, pulseDensity: 45, backbeatStrength: 95, repetition: 78, period: 'bar' }),
  'boom-bap': profile({ tempo: 88, density: 38, syncopation: 62, swing: 35, humanization: 28, ghostDensity: 25, dynamicRange: 78, repetition: 65 }),
  disco: profile({ tempo: 118, density: 50, syncopation: 20, orchestration: 32, pulseDensity: 62, timekeeper: 'hh', cymbalPunctuation: 42, repetition: 90, kickIndependence: 5 }),
  shuffle: profile({ tempo: 108, density: 34, syncopation: 55, swing: 82, pulseDensity: 68, ghostDensity: 24, repetition: 72 }),
  'jazz-ride': profile({ tempo: 128, density: 14, syncopation: 58, orchestration: 35, pulseDensity: 70, timekeeper: 'ride', swing: 100, humanization: 30, backbeat: false, ghostDensity: 20, dynamicRange: 72, cymbalPunctuation: 18 }),
  'ballad-68': profile({ meter: '6/8', tempo: 72, density: 28, syncopation: 25, pulseDensity: 60, humanization: 18, backbeatStrength: 82, repetition: 78, period: 'bar' }),
  motorik: profile({ tempo: 122, density: 50, syncopation: 5, surprise: 5, orchestration: 10, pulseDensity: 58, humanization: 2, kickIndependence: 0, repetition: 100, fillProbability: 2, period: 'bar' }),
  breakbeat: profile({ tempo: 102, bars: 4, density: 42, syncopation: 78, surprise: 72, orchestration: 38, swing: 18, ghostDensity: 48, articulationComplexity: 32, repetition: 38, period: 'phrase' }),
  dnb: profile({ tempo: 174, bars: 4, density: 28, syncopation: 82, surprise: 65, pulseDensity: 96, ghostDensity: 36, cymbalPunctuation: 22, fillProbability: 32, repetition: 42, period: 'phrase' }),
  metal: profile({ tempo: 150, density: 88, syncopation: 22, orchestration: 55, linearity: 4, pulseDensity: 82, humanization: 4, dynamicRange: 82, cymbalPunctuation: 72, fillProbability: 38, fillLength: 55, eventSpacing: 15 }),
  'tom-ostinato': profile({ tempo: 106, bars: 4, density: 24, syncopation: 45, orchestration: 90, pulseDensity: 25, timekeeper: 'none', backbeat: false, fillProbability: 100, fillLength: 100, registerMovement: 78, repetition: 84, period: 'bar' }),
  'cymbal-wash': profile({ tempo: 92, density: 20, orchestration: 86, linearity: 5, pulseDensity: 82, timekeeper: 'ride', cymbalPunctuation: 95, fillProbability: 10, dynamicRange: 42 }),
  sparse: profile({ tempo: 68, bars: 4, density: 8, syncopation: 58, surprise: 72, orchestration: 32, pulseDensity: 10, timekeeper: 'none', humanization: 32, articulationComplexity: 55, cymbalPunctuation: 30, eventSpacing: 95, repetition: 30, period: 'phrase' }),
  'odd-anchor': profile({ meter: '7/8', tempo: 108, bars: 4, density: 38, syncopation: 25, surprise: 28, pulseDensity: 58, kickIndependence: 12, backbeatStrength: 90, repetition: 76, period: 'bar' }),
  polyrhythmic: profile({ meter: '5/4', tempo: 112, bars: 4, density: 36, syncopation: 72, surprise: 58, orchestration: 58, pulseDensity: 65, timekeeper: 'cowbell', kickIndependence: 88, repetition: 68, period: 'phrase' }),
  interlocking: profile({ density: 32, syncopation: 62, linearity: 84, kickIndependence: 68 }),
  grounded: profile({ density: 32, syncopation: 25, kickIndependence: 12, repetition: 78 }),
  funk: profile({ tempo: 104, density: 48, syncopation: 78, pulseDensity: 95, ghostDensity: 48, articulationComplexity: 30 }),
  hiphop: profile({ tempo: 86, density: 32, syncopation: 58, swing: 28, humanization: 25, ghostDensity: 28 }),
  dance: profile({ tempo: 124, density: 50, syncopation: 12, pulseDensity: 70, kickIndependence: 0, cymbalPunctuation: 45, repetition: 92 }),
  toms: profile({ tempo: 105, orchestration: 88, pulseDensity: 38, fillProbability: 88, fillLength: 75, registerMovement: 80 }),
  open: profile({ backbeat: false, density: 20, syncopation: 50, surprise: 50, orchestration: 20, pulseDensity: 25, timekeeper: 'none', repetition: 45, period: 'auto' })
};

let pattern = createPattern('4/4', 4, 100);
let notationElements = [];
let audioContext = null;
let noiseBuffer = null;
let masterGain = null;
let muted = false;
let mutedInstruments = new Set();
let midiAccess = null;
let midiOutput = null;
let midiClockRunning = false;
let pendingMidiOutputId = null;
let playing = false;
let schedulerTimer = null;
let nextStep = 0;
let nextStepTime = 0;
let scheduledNodes = [];
let highlightTimers = [];
let resizeTimer = null;
let generationTimer = null;
let scheduledStepCount = 0;
let visualRefreshTimer = null;
let performanceTemplateTracks = null;
let scenes = [];
let activeSceneId = 'verse-1';
let queuedSceneId = null;
let restoredSceneState = null;
let sceneBar = 1;
let totalBarsStarted = 1;
let queuedCuts = [];
let queuedFills = [];
let queuedLandings = [];
let activeFill = null;
let rhythmSourceDirty = false;

const sectionSettingKeys = [
  'preset', 'backbeat', ...controlKeys,
  'liveDrummer',
  'coreLoopBars', 'liveEvolution', 'embellishment', 'punctuationEvery', 'punctuationChance',
  'scenePhraseBars', 'sceneTransition', 'liveCutChance', 'interjectionBoundary', 'liveFillLength', 'liveFillStyle',
  'liveFillActivity', 'liveFillLanding', 'liveCutLength', 'mutationMode'
];

function captureSectionSettings() {
  return {
    ...Object.fromEntries(sectionSettingKeys.map(key => [key, refs[key]?.type === 'checkbox' ? refs[key].checked : refs[key]?.value])),
    mutedInstruments: [...mutedInstruments]
  };
}

function applySectionSettings(settings) {
  if (!settings) return;
  sectionSettingKeys.forEach(key => {
    const ref = refs[key];
    if (!ref || settings[key] === undefined) return;
    if (ref.type === 'checkbox') ref.checked = Boolean(settings[key]);
    else ref.value = settings[key];
  });
  if (Array.isArray(settings.mutedInstruments)) {
    mutedInstruments = new Set(settings.mutedInstruments.filter(id => instruments.some(item => item.id === id)));
  }
  updateOutputs();
  updateLiveOutputs();
}

function storeActiveSectionState() {
  const scene = scenes.find(item => item.id === activeSceneId);
  if (!scene) return;
  scene.settings = captureSectionSettings();
  scene.pattern = sanitizePattern({
    ...pattern,
    tracks: performanceTemplateTracks || pattern.tracks
  });
}

function meterConfig(meter = pattern?.meter || '4/4') {
  return meters[meter] || meters['4/4'];
}

function createPattern(meter, bars, tempo) {
  const safeMeter = meters[meter] ? meter : '4/4';
  const safeBars = [1, 2, 4, 8].includes(Number(bars)) ? Number(bars) : 1;
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

function cloneTracks(tracks) {
  return Object.fromEntries(instruments.map(({ id }) => [id, [...tracks[id]]]));
}

function sceneName(id) {
  return ({
    'verse-1': 'Verse 1', 'verse-2': 'Verse 2',
    'chorus-1': 'Chorus 1', 'chorus-2': 'Chorus 2',
    'bridge-1': 'Bridge 1', 'bridge-2': 'Bridge 2'
  })[id] || id;
}

function buildScenesFromPattern() {
  const base = cloneTracks(pattern.tracks);
  const settings = captureSectionSettings();
  const previousSettings = new Map(scenes.map(scene => [scene.id, scene.settings]));
  const previousPatterns = new Map(scenes.map(scene => [scene.id, scene.pattern]));
  if (scenes.length) previousSettings.set(activeSceneId, settings);
  if (scenes.length) previousPatterns.set(activeSceneId, sanitizePattern(pattern));
  const verse2 = cloneTracks(base);
  const chorus1 = cloneTracks(base);
  const chorus2 = cloneTracks(base);
  const bridge1 = cloneTracks(base);
  const bridge2 = cloneTracks(base);
  const config = meterConfig();
  for (let bar = 0; bar < pattern.bars; bar += 1) {
    const offset = bar * config.slots;
    config.backbeats.forEach(local => {
      if (chorus1.sn[offset + local] !== 'off') chorus1.sn[offset + local] = 'accent';
      if (chorus2.sn[offset + local] !== 'off') chorus2.sn[offset + local] = 'accent';
    });
    config.groups.forEach((local, index) => {
      const step = offset + local;
      if (chorus1.hh[step] === 'closed') chorus1.hh[step] = 'accent';
      if (chorus2.hh[step] === 'closed') chorus2.hh[step] = 'accent';
      if (chorus2.ride[step] === 'off') chorus2.ride[step] = index % 2 ? 'accent' : 'hit';
      if (bridge1.hh[step] !== 'off') bridge1.hh[step] = 'off';
      if (bridge1.ride[step] === 'off') bridge1.ride[step] = 'hit';
      bridge2.hh[step] = 'off';
      bridge2[index % 2 ? 'ft' : 'mt'][step] = index === config.groups.length - 1 ? 'accent' : 'hit';
    });
    for (let local = 1; local < config.slots; local += 2) {
      if (chorus1.hh[offset + local] === 'off') chorus1.hh[offset + local] = 'closed';
      if (chorus2.hh[offset + local] === 'off') chorus2.hh[offset + local] = 'closed';
    }
    const midpoint = offset + Math.floor(config.slots / 2);
    const anticipation = offset + config.slots - 3;
    if (verse2.bd[anticipation] === 'off') verse2.bd[anticipation] = 'hit';
    verse2.hh[offset + config.slots - 2] = 'open';
    if (chorus1.bd[midpoint] === 'off') chorus1.bd[midpoint] = 'hit';
    if (chorus1.bd[anticipation] === 'off') chorus1.bd[anticipation] = 'hit';
    if (chorus2.bd[midpoint] === 'off') chorus2.bd[midpoint] = 'accent';
    chorus1.hh[offset + config.slots - 2] = 'open';
    chorus2.hh[offset + config.slots - 2] = 'open';
    bridge1.ft[offset] = 'hit';
    if (config.groups[2] !== undefined) bridge1.mt[offset + config.groups[2]] = 'hit';
  }
  const scenePattern = (id, tracks) => previousPatterns.get(id) || sanitizePattern({ ...pattern, tracks });
  scenes = [
    { id: 'verse-1', name: sceneName('verse-1'), pattern: scenePattern('verse-1', base), settings: { ...(previousSettings.get('verse-1') || settings) } },
    { id: 'verse-2', name: sceneName('verse-2'), pattern: scenePattern('verse-2', verse2), settings: { ...(previousSettings.get('verse-2') || settings) } },
    { id: 'chorus-1', name: sceneName('chorus-1'), pattern: scenePattern('chorus-1', chorus1), settings: { ...(previousSettings.get('chorus-1') || settings) } },
    { id: 'chorus-2', name: sceneName('chorus-2'), pattern: scenePattern('chorus-2', chorus2), settings: { ...(previousSettings.get('chorus-2') || settings) } },
    { id: 'bridge-1', name: sceneName('bridge-1'), pattern: scenePattern('bridge-1', bridge1), settings: { ...(previousSettings.get('bridge-1') || settings) } },
    { id: 'bridge-2', name: sceneName('bridge-2'), pattern: scenePattern('bridge-2', bridge2), settings: { ...(previousSettings.get('bridge-2') || settings) } }
  ];
  activeSceneId = 'verse-1';
  queuedSceneId = null;
  sceneBar = 1;
  totalBarsStarted = 1;
}

function applyRestoredSceneState() {
  if (!restoredSceneState) return;
  const restored = restoredSceneState.scenes.map(scene => {
    const restoredPattern = scene.pattern || { ...pattern, tracks: scene.tracks };
    return { id: scene.id, name: sceneName(scene.id), pattern: sanitizePattern(restoredPattern), settings: scene.settings || captureSectionSettings() };
  }).filter(scene => sceneIds.includes(scene.id));
  if (restored.length === sceneIds.length) scenes = restored;
  const requested = restoredSceneState.activeSceneId;
  activeSceneId = scenes.some(scene => scene.id === requested) ? requested : 'verse-1';
  const activeScene = scenes.find(scene => scene.id === activeSceneId);
  if (activeScene) {
    pattern = sanitizePattern(activeScene.pattern);
    performanceTemplateTracks = cloneTracks(pattern.tracks);
    applySectionSettings(activeScene.settings);
    refs.tempo.value = pattern.tempo;
    refs.meter.value = pattern.meter;
    refs.length.value = String(pattern.bars);
  }
  restoredSceneState = null;
}

function renderSceneState() {
  refs.currentScene.textContent = sceneName(activeSceneId);
  refs.queuedScene.textContent = queuedSceneId ? sceneName(queuedSceneId) : 'None';
  refs.sceneSelector.value = activeSceneId;
  refs.sceneContextQueued.textContent = queuedSceneId ? sceneName(queuedSceneId) : 'None';
  refs.cancelScene.disabled = !queuedSceneId;
  refs.sceneButtons.forEach(button => {
    const active = button.dataset.scene === activeSceneId;
    button.setAttribute('aria-pressed', String(active));
    button.classList.toggle('is-queued', button.dataset.scene === queuedSceneId);
  });
}

function syncCueButtons() {
  const fillQueued = queuedFills.length > 0 || Boolean(activeFill);
  const cutQueued = queuedCuts.length > 0;
  refs.queueFill.classList.toggle('is-queued', fillQueued);
  refs.queueFill.setAttribute('aria-pressed', String(fillQueued));
  refs.cancelFill.disabled = !fillQueued;
  refs.queueCut.classList.toggle('is-queued', cutQueued);
  refs.queueCut.setAttribute('aria-pressed', String(cutQueued));
  refs.cancelCut.disabled = !cutQueued;
}

function sanitizePattern(value) {
  const meter = meters[value?.meter] ? value.meter : '4/4';
  const inferredBars = Number(value?.bars) || Math.round((Number(value?.steps) || meterConfig(meter).slots) / meterConfig(meter).slots);
  const next = createPattern(meter, [1, 2, 4, 8].includes(inferredBars) ? inferredBars : 1, Math.min(300, Math.max(30, Number(value?.tempo) || 100)));
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
    pattern = saved ? sanitizePattern(saved) : moneyBeat('4/4', 4);
    if (saved?.sceneState?.version >= 2 && Array.isArray(saved.sceneState.scenes)) restoredSceneState = saved.sceneState;
    const settings = JSON.parse(localStorage.getItem(SETTINGS_KEY));
    if (settings) {
      if (settings.preset !== undefined && presetProfiles[settings.preset]) refs.preset.value = settings.preset;
      controlKeys.forEach(key => { if (settings[key] !== undefined && refs[key]) refs[key].value = settings[key]; });
      refs.backbeat.checked = settings.backbeat ?? true;
      refs.volume.value = settings.volume ?? 70;
      muted = settings.muted ?? false;
      refs.midiChannel.value = settings.midiChannel ?? '10';
      refs.midiClock.checked = settings.midiClock ?? false;
      mutedInstruments = new Set(Array.isArray(settings.mutedInstruments) ? settings.mutedInstruments.filter(id => instruments.some(item => item.id === id)) : []);
      pendingMidiOutputId = settings.midiOutputId === undefined ? null : settings.midiOutputId;
      refs.liveDrummer.checked = settings.liveDrummer ?? true;
      refs.coreLoopBars.value = settings.coreLoopBars ?? '2';
      refs.liveEvolution.value = settings.stability ?? 90;
      refs.embellishment.value = settings.embellishment ?? 12;
      refs.punctuationEvery.value = settings.punctuationEvery ?? '4';
      refs.punctuationChance.value = settings.punctuationChance ?? 65;
      refs.scenePhraseBars.value = settings.scenePhraseBars ?? '4';
      refs.sceneTransition.value = settings.sceneTransition ?? 'fill-crash';
      refs.liveCutChance.value = settings.liveCutChance ?? 6;
      refs.interjectionBoundary.value = settings.interjectionBoundary ?? 'bar';
      refs.liveFillLength.value = settings.liveFillLength ?? 'half';
      refs.liveFillStyle.value = settings.liveFillStyle ?? 'tom-sweep';
      refs.liveFillActivity.value = settings.liveFillActivity ?? 85;
      refs.liveFillLanding.value = settings.liveFillLanding ?? 'kick-crash';
      refs.liveCutLength.value = settings.liveCutLength ?? 'beat';
      refs.mutationMode.value = settings.mutationMode ?? 'both';
    }
  } catch (error) {
    pattern = moneyBeat('4/4', 4);
  }
  refs.tempo.value = pattern.tempo;
  refs.meter.value = pattern.meter;
  refs.length.value = pattern.bars;
}

function saveState() {
  try {
    storeActiveSectionState();
    localStorage.setItem(PATTERN_KEY, JSON.stringify({
      ...pattern,
      sceneState: {
        version: SCENE_SCHEMA,
        activeSceneId,
        scenes: scenes.map(scene => ({ id: scene.id, name: scene.name, pattern: scene.pattern, settings: scene.settings }))
      }
    }));
    localStorage.setItem(SETTINGS_KEY, JSON.stringify({ preset: refs.preset.value, backbeat: refs.backbeat.checked,
      volume: refs.volume.value, muted, midiChannel: refs.midiChannel.value, midiClock: refs.midiClock.checked,
      mutedInstruments: [...mutedInstruments],
      midiOutputId: midiOutput?.id || pendingMidiOutputId,
      liveDrummer: refs.liveDrummer.checked, coreLoopBars: refs.coreLoopBars.value, stability: refs.liveEvolution.value,
      embellishment: refs.embellishment.value, punctuationEvery: refs.punctuationEvery.value,
      punctuationChance: refs.punctuationChance.value, scenePhraseBars: refs.scenePhraseBars.value,
      sceneTransition: refs.sceneTransition.value,
      liveCutChance: refs.liveCutChance.value,
      interjectionBoundary: refs.interjectionBoundary.value,
      liveFillLength: refs.liveFillLength.value, liveFillStyle: refs.liveFillStyle.value,
      liveFillActivity: refs.liveFillActivity.value, liveFillLanding: refs.liveFillLanding.value,
      liveCutLength: refs.liveCutLength.value, mutationMode: refs.mutationMode.value,
      ...Object.fromEntries(controlKeys.map(key => [key, refs[key].value])) }));
  } catch (error) {
    refs.status.textContent = 'Save unavailable';
  }
}

function sourceText() {
  return serializeRhythmPattern(pattern, instruments);
}

function setRhythmSourceStatus(message = '', state = '') {
  refs.sourceStatus.textContent = message;
  refs.sourceStatus.dataset.state = state;
  refs.source.toggleAttribute('aria-invalid', state === 'error');
}

function revertRhythmSource() {
  rhythmSourceDirty = false;
  refs.source.value = sourceText();
  setRhythmSourceStatus('Reverted', 'success');
}

async function applyRhythmSource() {
  let nextPattern;
  try {
    nextPattern = compileRhythmSource(refs.source.value, { currentPattern: pattern, instruments, meters });
  } catch (error) {
    setRhythmSourceStatus(error.message || String(error), 'error');
    return;
  }

  const wasPlaying = playing;
  if (wasPlaying) stopPlayback();
  pattern = nextPattern;
  refs.tempo.value = String(pattern.tempo);
  refs.meter.value = pattern.meter;
  refs.length.value = String(pattern.bars);
  rhythmSourceDirty = false;
  capturePerformanceTemplate();
  updateAll();
  setRhythmSourceStatus('Applied', 'success');
  if (wasPlaying) {
    try {
      await startPlayback();
    } catch (error) {
      stopPlayback();
      setRhythmSourceStatus(`Applied; playback failed: ${error.message || error}`, 'error');
    }
  }
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
    const isMuted = mutedInstruments.has(instrument.id);
    const cells = pattern.tracks[instrument.id].map((state, step) => `<button class="step-cell${isGroupStart(step) ? ' is-beat' : ''}" type="button" data-instrument="${instrument.id}" data-step="${step}" data-state="${state}" aria-label="${instrument.label}, ${stepDescription(step)}: ${state}" title="${instrument.label} · ${stepDescription(step)} · ${state}"></button>`).join('');
    return `<div class="grid-row${isMuted ? ' is-muted' : ''}"><span class="grid-label track-label"><span>${instrument.label}</span><button class="track-mute" type="button" data-mute-instrument="${instrument.id}" aria-label="${isMuted ? 'Unmute' : 'Mute'} ${instrument.label}" aria-pressed="${isMuted}" title="${isMuted ? 'Unmute' : 'Mute'} ${instrument.label}">M</button></span>${cells}</div>`;
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
  const signatures = Array.from({ length: pattern.steps }, (_, step) => instruments.map(instrument => pattern.tracks[instrument.id][step]).join('|'));
  const voicesPerStep = Array.from({ length: pattern.steps }, (_, step) => instruments.filter(instrument => active(pattern.tracks[instrument.id][step])).length);
  const events = voicesPerStep.reduce((sum, voices) => sum + voices, 0);
  const occupied = voicesPerStep.filter(Boolean).length;
  const layers = voicesPerStep.filter(voices => voices > 1).length;
  const offbeats = voicesPerStep.reduce((sum, voices, step) => sum + (!config.groups.includes(step % config.slots) ? voices : 0), 0);
  const period = smallestPeriod(signatures);
  const articulatedStates = new Set(['accent', 'ghost', 'cross-stick', 'flam', 'drag', 'open', 'bark']);
  const articulations = instruments.reduce((sum, instrument) => sum + pattern.tracks[instrument.id].filter(state => articulatedStates.has(state)).length, 0);
  $('#metric-events').textContent = events;
  $('#metric-occupied').textContent = occupied;
  $('#metric-layers').textContent = layers;
  $('#metric-offbeats').textContent = offbeats;
  $('#metric-period').textContent = `${period} step${period === 1 ? '' : 's'}`;
  $('#metric-articulations').textContent = articulations;
  const tags = [];
  if (!layers && events) tags.push('strictly linear');
  else if (layers <= Math.max(1, pattern.steps * .12) && events) tags.push('interlocking');
  else if (layers >= pattern.steps * .35) tags.push('layered');
  if (offbeats >= Math.max(2, events * .45)) tags.push('syncopated');
  if (period === pattern.steps && events) tags.push('developing');
  if (period <= config.groups[1] - config.groups[0] && events) tags.push('short cell');
  else if (period <= config.slots && pattern.bars > 1) tags.push('bar-repeating');
  if (events >= pattern.steps * 1.1) tags.push('dense');
  if (events && events <= pattern.steps * .35) tags.push('sparse');
  if (articulations >= Math.max(2, events * .3)) tags.push('highly articulated');
  if (Number(refs.swing.value) >= 35) tags.push('swung');
  if (Number(refs.humanization.value) >= 35) tags.push('loose');
  if (!tags.length) tags.push('open texture');
  refs.tags.innerHTML = tags.map(tag => `<span class="character-tag">${tag}</span>`).join('');
}

function updateOutputs() {
  const percentOutputs = {
    density: 'kick-density', syncopation: 'syncopation', surprise: 'surprise', orchestration: 'orchestration', linearity: 'linearity',
    pulseDensity: 'pulse-density', swing: 'swing', humanization: 'humanization', kickIndependence: 'kick-independence',
    backbeatStrength: 'backbeat-strength', backbeatDisplacement: 'backbeat-displacement', ghostDensity: 'ghost-density',
    dynamicRange: 'dynamic-range', articulationComplexity: 'articulation-complexity', cymbalPunctuation: 'cymbal-punctuation',
    fillProbability: 'fill-probability', fillLength: 'fill-length', registerMovement: 'register-movement',
    eventSpacing: 'event-spacing', repetition: 'repetition'
  };
  Object.entries(percentOutputs).forEach(([key, id]) => { $(`#${id}-output`).textContent = `${refs[key].value}%`; });
  $('#beat-displacement-output').textContent = Number(refs.beatDisplacement.value) > 0 ? `+${refs.beatDisplacement.value}` : refs.beatDisplacement.value;
}

function updateAll({ save = true } = {}) {
  pattern.tempo = Math.min(300, Math.max(30, Number(refs.tempo.value) || 100));
  refs.meter.value = pattern.meter;
  refs.length.value = String(pattern.bars);
  renderGrid();
  renderNotation();
  updateAnalysis();
  if (scenes.length) renderSceneState();
  if (!rhythmSourceDirty) refs.source.value = sourceText();
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

function contourWeight(step) {
  const progress = pattern.steps <= 1 ? 0 : step / (pattern.steps - 1);
  switch (refs.phraseContour.value) {
    case 'build': return .55 + progress * .9;
    case 'fade': return 1.45 - progress * .9;
    case 'arch': return .55 + Math.sin(progress * Math.PI) * .9;
    case 'ending': return progress > .72 ? 1.45 : .72;
    default: return 1;
  }
}

function generateKickBar(offset, target, sync, config, independence, spacing) {
  const chosen = new Set();
  if (['disco', 'dance', 'motorik'].includes(refs.preset.value)) config.groups.forEach(local => chosen.add(offset + local));
  if (['pocket', 'grounded', 'hiphop', 'halftime'].includes(refs.preset.value)) config.anchors.forEach(local => chosen.add(offset + local));
  config.anchors.forEach(local => { if (Math.random() > independence) chosen.add(offset + local); });
  while (chosen.size < target) {
    const candidates = [];
    for (let local = 0; local < config.slots; local += 1) {
      const index = offset + local;
      if (chosen.has(index)) continue;
      const structural = config.groups.includes(local) ? 1.8 : local % 2 === 0 ? .85 : .25;
      const independent = config.groups.includes(local) ? .3 : local % 2 === 0 ? 1 : 1.45;
      let weight = structural * (1 - independence) + independent * independence;
      weight *= config.groups.includes(local) ? 1.25 - sync * .65 : .6 + sync * 1.25;
      if (config.groups.map(group => (group - 1 + config.slots) % config.slots).includes(local)) weight *= 1 + sync;
      if (chosen.has(index - 1) || chosen.has(index + 1)) weight *= 1 - spacing * .88;
      weight *= contourWeight(index);
      candidates.push({ index, weight: Math.max(.01, weight) });
    }
    const pick = weightedPick(candidates);
    if (pick === undefined) break;
    chosen.add(pick);
  }
  chosen.forEach(index => { pattern.tracks.bd[index] = Math.random() < .13 ? 'accent' : 'hit'; });
}

function pulseInstrument() {
  if (refs.timekeeper.value !== 'auto') return refs.timekeeper.value;
  return ['jazz-ride', 'cymbal-wash'].includes(refs.preset.value) ? 'ride' : 'hh';
}

function generatePulseBar(offset, config, density) {
  const instrument = pulseInstrument();
  if (instrument === 'none') return;
  for (let local = 0; local < config.slots; local += 1) {
    const structural = config.groups.includes(local);
    const eighth = local % 2 === 0;
    let chance = structural ? .95 : eighth ? .15 + density * .85 : Math.max(0, (density - .42) * 1.55);
    if (refs.preset.value === 'polyrhythmic') chance = local % 3 === 0 ? .95 : .05;
    if (refs.preset.value === 'jazz-ride') chance = local % 8 === 0 || local % 8 === 4 || local % 8 === 6 ? .98 : .03;
    if (Math.random() < chance) pattern.tracks[instrument][offset + local] = instrument === 'hh' ? 'closed' : 'hit';
  }
}

function applyRepetition(amount, surprise) {
  if (pattern.bars < 2) return;
  const config = meterConfig();
  const coreBars = Math.max(1, Math.min(pattern.bars, Number(refs.coreLoopBars.value) || 2));
  const copyChance = Math.max(.62, Math.min(.98, .68 + amount * .3 - surprise * .08));
  const coreIds = ['bd', 'sn', 'hh', 'ride', 'cowbell'];
  for (let bar = coreBars; bar < pattern.bars; bar += 1) {
    const sourceBar = bar % coreBars;
    coreIds.forEach(id => {
      for (let local = 0; local < config.slots; local += 1) {
        if (Math.random() < copyChance) pattern.tracks[id][bar * config.slots + local] = pattern.tracks[id][sourceBar * config.slots + local];
      }
    });
  }
}

function capturePerformanceTemplate(rebuildScenes = false) {
  performanceTemplateTracks = Object.fromEntries(instruments.map(({ id }) => [id, [...pattern.tracks[id]]]));
  if (rebuildScenes || !scenes.length) buildScenesFromPattern();
  else {
    const activeScene = scenes.find(scene => scene.id === activeSceneId);
    if (activeScene) {
      activeScene.pattern = sanitizePattern({ ...pattern, tracks: performanceTemplateTracks });
      activeScene.settings = captureSectionSettings();
    }
  }
  queuedCuts = [];
  queuedFills = [];
  queuedLandings = [];
  activeFill = null;
  syncCueButtons();
}

function applyPreferredPeriod() {
  const config = meterConfig();
  let period = null;
  if (refs.period.value === 'beat') period = config.groups[1] - config.groups[0];
  if (refs.period.value === 'half') period = Math.max(1, Math.floor(config.slots / 2));
  if (refs.period.value === 'bar') period = config.slots;
  if (!period || refs.period.value === 'phrase') return;
  instruments.forEach(({ id }) => {
    for (let step = period; step < pattern.steps; step += 1) pattern.tracks[id][step] = pattern.tracks[id][step % period];
  });
}

function applyEventSpacing(amount) {
  const keeper = pulseInstrument();
  instruments.forEach(({ id }) => {
    if (id === keeper) return;
    for (let step = 1; step < pattern.steps; step += 1) {
      if (active(pattern.tracks[id][step]) && active(pattern.tracks[id][step - 1]) && Math.random() < amount * .88) pattern.tracks[id][step] = 'off';
    }
  });
}

function applyArticulations(amount) {
  const snareChoices = ['ghost', 'cross-stick', 'flam', 'drag', 'accent'];
  const tomChoices = ['flam', 'drag', 'accent'];
  instruments.forEach(instrument => {
    for (let step = 0; step < pattern.steps; step += 1) {
      const state = pattern.tracks[instrument.id][step];
      if (instrument.id === 'sn' && state === 'hit' && Math.random() < amount * .42) pattern.tracks.sn[step] = snareChoices[Math.floor(Math.random() * snareChoices.length)];
      if (instrument.family === 'tom' && state === 'hit' && Math.random() < amount * .36) pattern.tracks[instrument.id][step] = tomChoices[Math.floor(Math.random() * tomChoices.length)];
      if (instrument.id === 'hh' && state === 'closed' && Math.random() < amount * .22) pattern.tracks.hh[step] = Math.random() < .72 ? 'open' : 'bark';
      if (instrument.family === 'cymbal' && state === 'hit' && Math.random() < amount * .25) pattern.tracks[instrument.id][step] = 'accent';
    }
  });
}

function applyDisplacement(steps) {
  if (!steps) return;
  instruments.forEach(({ id }) => {
    const source = [...pattern.tracks[id]];
    pattern.tracks[id] = Array(pattern.steps).fill('off');
    source.forEach((state, index) => { pattern.tracks[id][(index + steps + pattern.steps) % pattern.steps] = state; });
  });
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

function enforcePresetOstinato() {
  if (refs.preset.value !== 'jazz-ride') return;
  const config = meterConfig();
  if (config.denominator !== 4) return;
  for (let bar = 0; bar < pattern.bars; bar += 1) {
    const offset = bar * config.slots;
    for (let local = 0; local < config.slots; local += 1) pattern.tracks.ride[offset + local] = 'off';
    for (let local = 0; local < config.slots; local += 1) pattern.tracks.ph[offset + local] = 'off';
    for (let local = 0; local < config.slots; local += 1) pattern.tracks.cowbell[offset + local] = 'off';
    config.groups.forEach((beat, index) => {
      pattern.tracks.ride[offset + beat] = 'hit';
      if (index % 2 === 1 && beat + 2 < config.slots) pattern.tracks.ride[offset + beat + 2] = 'hit';
      if (index % 2 === 1) pattern.tracks.ph[offset + beat] = 'chick';
    });
  }
}

function generatedSnareState(strength, ghostDensity) {
  const roll = Math.random();
  const accentChance = .08 + strength * .52;
  const ghostChance = .08 + (1 - strength) * .22 + ghostDensity * .12;
  if (roll < accentChance) return 'accent';
  if (roll < accentChance + ghostChance) return 'ghost';
  return 'hit';
}

function generateSnareBar(offset, config, { preset, density, sync, surprise, strength, displacement, ghostDensity, articulation }) {
  const structural = ['halftime', 'dnb'].includes(preset) && pattern.meter === '4/4' ? [8] : config.backbeats;
  const occupied = new Set();
  if (refs.backbeat.checked) {
    const anchorChance = Math.min(.78, .28 + strength * .45 - surprise * .1);
    structural.forEach(local => {
      if (Math.random() > anchorChance) return;
      const shifted = Math.random() < displacement ? (Math.random() < .5 ? -1 : 1) : 0;
      const anchor = (local + shifted + config.slots) % config.slots;
      pattern.tracks.sn[offset + anchor] = generatedSnareState(strength, ghostDensity);
      occupied.add(anchor);

      const doubleChance = .08 + surprise * .18 + articulation * .2;
      if (Math.random() < doubleChance) {
        const neighbor = (anchor + (Math.random() < .78 ? 1 : -1) + config.slots) % config.slots;
        if (!occupied.has(neighbor)) {
          pattern.tracks.sn[offset + neighbor] = Math.random() < ghostDensity * .6 ? 'ghost' : 'hit';
          occupied.add(neighbor);
        }
      }
    });
  }

  const freeHitTarget = (refs.backbeat.checked
    ? surprise * .7 + articulation * .5 + density * .3
    : .7 + density * 1.3 + surprise * 1.2) * Math.max(1, config.slots / 16);
  const freeHitCount = Math.floor(freeHitTarget) + (Math.random() < freeHitTarget % 1 ? 1 : 0);
  for (let hit = 0; hit < freeHitCount; hit += 1) {
    const candidates = Array.from({ length: config.slots }, (_, local) => local)
      .filter(local => !occupied.has(local) && pattern.tracks.sn[offset + local] === 'off');
    if (!candidates.length) break;
    const weighted = candidates.map(local => {
      const structuralDistance = Math.min(...structural.map(anchor => Math.abs(anchor - local)));
      const onGrid = config.groups.includes(local);
      const structuralWeight = refs.backbeat.checked ? Math.max(.15, 1 - structuralDistance * .22) : .45;
      const syncWeight = onGrid ? 1 - sync * .72 : .35 + sync * .9;
      return { local, weight: Math.max(.05, structuralWeight * syncWeight) };
    });
    let pick = Math.random() * weighted.reduce((sum, item) => sum + item.weight, 0);
    const chosen = weighted.find(item => (pick -= item.weight) <= 0) || weighted[weighted.length - 1];
    pattern.tracks.sn[offset + chosen.local] = Math.random() < ghostDensity * .45 ? 'ghost' : generatedSnareState(strength * .72, ghostDensity);
    occupied.add(chosen.local);
  }
}

function generatePattern({ rebuildScenes = false } = {}) {
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
  const pulseDensity = Number(refs.pulseDensity.value) / 100;
  const kickIndependence = Number(refs.kickIndependence.value) / 100;
  const backbeatStrength = Number(refs.backbeatStrength.value) / 100;
  const backbeatDisplacement = Number(refs.backbeatDisplacement.value) / 100;
  const ghostDensity = Number(refs.ghostDensity.value) / 100;
  const articulation = Number(refs.articulationComplexity.value) / 100;
  const eventSpacing = Number(refs.eventSpacing.value) / 100;
  const repetition = Number(refs.repetition.value) / 100;
  for (let bar = 0; bar < pattern.bars; bar += 1) {
    const offset = bar * config.slots;
    generatePulseBar(offset, config, pulseDensity);
    generateSnareBar(offset, config, { preset, density, sync, surprise, strength: backbeatStrength, displacement: backbeatDisplacement, ghostDensity, articulation });
    const target = Math.max(1, Math.round((1 + density * 8 * config.slots / 16) * contourWeight(offset + config.slots / 2)));
    generateKickBar(offset, Math.min(config.slots - 1, target), sync, config, kickIndependence, eventSpacing);
    for (let local = 0; local < config.slots; local += 1) {
      const step = offset + local;
      if (pattern.tracks.sn[step] === 'off' && Math.random() < ghostDensity * .24 * contourWeight(step)) pattern.tracks.sn[step] = 'ghost';
      if (Math.random() < orchestration * .055 * contourWeight(step)) pattern.tracks.cowbell[step] = 'hit';
      if (pulseInstrument() !== 'ride' && Math.random() < orchestration * .045 * contourWeight(step)) pattern.tracks.ride[step] = 'hit';
    }
    // Crashes and fills belong to phrase-level performance layers, not the stable scene core.
  }
  applyRepetition(repetition, surprise);
  applyPreferredPeriod();
  applyEventSpacing(eventSpacing);
  applyArticulations(articulation);
  applyDisplacement(Number(refs.beatDisplacement.value));
  applyLinearity(linearity);
  enforcePresetOstinato();
  capturePerformanceTemplate(rebuildScenes);
  updateAll();
  refs.liveStatus.textContent = '';
}

function mutatePattern() {
  const mode = refs.mutationMode.value;
  if (mode === 'rhythm' || mode === 'both') {
    const amount = Math.max(1, Math.round(pattern.steps * (Number(refs.surprise.value) / 100) * .35));
    const preferred = instruments.filter(item => ['bd', 'sn', 'hh', 'ht', 'mt', 'lt', 'ft', 'ride'].includes(item.id));
    for (let i = 0; i < amount; i += 1) {
      const instrument = preferred[Math.floor(Math.random() * preferred.length)];
      const step = Math.floor(Math.random() * pattern.steps);
      const defaultState = instrument.id === 'hh' ? 'closed' : instrument.states.includes('hit') ? 'hit' : instrument.states[1];
      pattern.tracks[instrument.id][step] = pattern.tracks[instrument.id][step] === 'off'
        ? defaultState
        : 'off';
    }
  }
  if (mode === 'orchestration' || mode === 'both') reorchestrateRange(0, pattern.steps, 'full');
  capturePerformanceTemplate();
  updateAll();
  refs.liveStatus.textContent = `${sceneName(activeSceneId)} section mutated: ${mode === 'both' ? 'rhythm and orchestration' : mode}.`;
}

function wrappedStep(step) {
  return (step % pattern.steps + pattern.steps) % pattern.steps;
}

function closestHalfBarBoundary(config = meterConfig()) {
  const midpoint = config.slots / 2;
  return config.groups.reduce((best, group) => Math.abs(group - midpoint) < Math.abs(best - midpoint) ? group : best, config.groups[0]);
}

function clearStepRange(start, length) {
  for (let offset = 0; offset < length; offset += 1) {
    const step = wrappedStep(start + offset);
    instruments.forEach(({ id }) => { pattern.tracks[id][step] = 'off'; });
  }
}

function cueLength(type, config = meterConfig()) {
  const choice = type === 'fill' ? refs.liveFillLength.value : refs.liveCutLength.value;
  const multiBar = choice.match(/^(\d+)-bars$/);
  if (multiBar) return Number(multiBar[1]) * config.slots;
  if (choice === 'bar') return config.slots;
  if (choice === 'half') return closestHalfBarBoundary(config) || Math.max(1, Math.round(config.slots / 2));
  return config.groups[1] || Math.max(1, Math.round(config.slots / config.numerator));
}

function cueLengthLabel(type) {
  const select = type === 'fill' ? refs.liveFillLength : refs.liveCutLength;
  const label = select.options[select.selectedIndex]?.textContent.toLowerCase() || 'one beat';
  if (label === '1 beat') return 'one-beat';
  if (label === 'half bar') return 'half-bar';
  return label.replace(/^(\d+) bars?$/, '$1-bar');
}

function applyFillLanding(step, landingStyle = refs.liveFillLanding.value) {
  if (landingStyle === 'kick-crash' || landingStyle === 'kick') pattern.tracks.bd[step] = 'accent';
  if (landingStyle === 'kick-crash' || landingStyle === 'crash') pattern.tracks.cr1[step] = 'accent';
}

function createFillState() {
  const toms = ['ht', 'mt', 'lt', 'ft'];
  return {
    toms,
    fixedTom: toms[Math.floor(Math.random() * toms.length)],
    registerMovement: Number(refs.registerMovement.value) / 100,
    activity: Number(refs.liveFillActivity.value) / 100,
    style: refs.liveFillStyle.value,
    landingStyle: refs.liveFillLanding.value
  };
}

function writeFillStep(step, offset, length, fillState) {
  const { toms, fixedTom, registerMovement, activity, style } = fillState;
  instruments.forEach(({ id }) => { pattern.tracks[id][step] = 'off'; });
  if (offset !== length - 1 && Math.random() > activity) return;
  const progress = offset / Math.max(1, length - 1);
  if (style === 'buildup') {
    const state = progress < .34 ? 'ghost' : progress < .72 ? 'hit' : 'accent';
    pattern.tracks[offset % 2 ? 'ft' : 'sn'][step] = state;
    if (offset === length - 1) {
      pattern.tracks.sn[step] = 'accent';
      pattern.tracks.ft[step] = 'accent';
    }
    return;
  }
  const tomIndex = Math.min(toms.length - 1, Math.floor(progress * toms.length));
  let instrument = Math.random() < registerMovement ? toms[tomIndex] : fixedTom;
  if (style === 'snare-toms') instrument = progress < .38 ? 'sn' : toms[Math.min(toms.length - 1, Math.floor(((progress - .38) / .62) * toms.length))];
  if (style === 'snare-roll') instrument = 'sn';
  if (style === 'around-kit') instrument = ['sn', 'ht', 'sn', 'mt', 'sn', 'lt', 'ft'][offset % 7];
  if (style === 'cymbal-punches') instrument = offset % 2 ? toms[tomIndex] : 'sn';
  pattern.tracks[instrument][step] = offset === length - 1 || (style === 'snare-roll' && offset % 4 === 0) ? 'accent' : 'hit';
  if (style === 'cymbal-punches' && offset % 4 === 0) pattern.tracks[offset % 8 === 0 ? 'cr1' : 'china'][step] = 'accent';
}

function insertFillEndingAt(boundary, trackLanding = false, requestedLength = null) {
  const config = meterConfig();
  const maxLength = Math.max(3, Math.min(8, Math.floor(config.slots / 2)));
  const length = requestedLength || Math.max(3, Math.round(3 + (Number(refs.fillLength.value) / 100) * (maxLength - 3)));
  const start = boundary - length;
  const fillState = createFillState();
  for (let offset = 0; offset < length; offset += 1) writeFillStep(wrappedStep(start + offset), offset, length, fillState);
  const landing = wrappedStep(boundary);
  applyFillLanding(landing, fillState.landingStyle);
  if (trackLanding && !queuedLandings.some(item => item.step === landing && item.type === 'fill')) queuedLandings.push({ step: landing, type: 'fill' });
}

function insertCutAt(boundary, requestedLength = null) {
  const config = meterConfig();
  const length = requestedLength || config.groups[1] || Math.max(2, Math.round(config.slots / config.numerator));
  clearStepRange(boundary, length);
  const landing = wrappedStep(boundary + length);
  pattern.tracks.bd[landing] = 'accent';
  pattern.tracks.cr1[landing] = 'accent';
}

function boundaryPositions(mode) {
  const config = meterConfig();
  const positions = [];
  const half = closestHalfBarBoundary(config);
  for (let bar = 0; bar < pattern.bars; bar += 1) {
    positions.push(bar * config.slots);
    if (mode === 'half' && half > 0) positions.push(bar * config.slots + half);
  }
  return new Set(positions);
}

function nextCueTarget(mode, minimumDistance) {
  const cursor = playing ? nextStep : 0;
  const baseCount = playing ? scheduledStepCount : 0;
  const bars = Number(mode);
  if (Number.isFinite(bars) && bars >= 2) {
    const slots = meterConfig().slots;
    const local = cursor % slots;
    let distance = (slots - local) % slots;
    while (distance < Math.max(1, minimumDistance)) distance += slots;
    distance += (bars - 1) * slots;
    return { boundary: wrappedStep(cursor + distance), atCount: baseCount + distance, distance };
  }
  const positions = boundaryPositions(mode);
  for (let distance = Math.max(1, minimumDistance); distance <= pattern.steps + minimumDistance; distance += 1) {
    const step = wrappedStep(cursor + distance);
    if (positions.has(step)) return { boundary: step, atCount: baseCount + distance, distance };
  }
  return { boundary: 0, atCount: baseCount + pattern.steps, distance: pattern.steps };
}

function queueInterjection(type) {
  const config = meterConfig();
  const length = cueLength(type, config);
  const safety = type === 'fill' ? length + 1 : 3;
  const target = nextCueTarget(refs.interjectionBoundary.value, safety);
  if (type === 'fill') {
    queuedFills = [{ boundary: target.boundary, atCount: target.atCount, startAtCount: target.atCount - length, length }];
  }
  else {
    queuedCuts = [{ boundary: target.boundary, atCount: target.atCount, length }];
  }
  syncCueButtons();
  const location = refs.interjectionBoundary.options[refs.interjectionBoundary.selectedIndex]?.textContent.toLowerCase() || 'selected boundary';
  const boundaryLabel = location.replace(/^next /, '').replace(/^(\d+) bars$/, '$1-bar phrase');
  refs.liveStatus.textContent = type === 'fill'
    ? `${cueLengthLabel('fill')} fill queued for the first available ${boundaryLabel} boundary.`
    : `${cueLengthLabel('cut')} cut queued for ${location}.`;
}

function cancelInterjection(type) {
  if (type === 'fill') {
    queuedFills = [];
    queuedLandings = queuedLandings.filter(item => item.type !== 'fill');
    if (activeFill && performanceTemplateTracks) {
      pattern.tracks = cloneTracks(performanceTemplateTracks);
      updateAll();
    }
    activeFill = null;
  } else queuedCuts = [];
  syncCueButtons();
  refs.liveStatus.textContent = `${type === 'fill' ? 'Fill' : 'Cut'} queue cancelled.`;
}

function stateForInstrument(state, instrument) {
  if (instrument.states.includes(state)) return state;
  if (state === 'accent' && instrument.states.includes('accent')) return 'accent';
  if (instrument.family === 'hat') return state === 'accent' ? 'accent' : 'closed';
  if (instrument.states.includes('hit')) return 'hit';
  return instrument.states[1] || 'off';
}

function reorchestrateRange(start, length, layer) {
  const config = meterConfig();
  const grooveIds = ['bd', 'sn', 'ht', 'mt', 'lt', 'ft'];
  const detailIds = ['sn', 'hh', 'ride', 'ht', 'mt', 'lt', 'ft'];
  const fullIds = ['bd', 'sn', 'hh', 'ph', 'ride', 'cowbell', 'ht', 'mt', 'lt', 'ft'];
  const detailStates = new Set(['ghost', 'flam', 'drag', 'open', 'bark']);
  const sourceIds = layer === 'details' ? detailIds : layer === 'full' ? fullIds : grooveIds;
  const targetIds = sourceIds;
  for (let offset = 0; offset < length; offset += 1) {
    const step = wrappedStep(start + offset);
    const local = step % config.slots;
    const events = sourceIds.map(id => ({ id, state: pattern.tracks[id][step] }))
      .filter(event => event.state !== 'off' && (layer !== 'details' || detailStates.has(event.state)));
    if (!events.length) continue;
    const locked = events.filter(event => event.id === 'sn' && refs.backbeat.checked && config.backbeats.includes(local)
      && Math.random() < .25 + Number(refs.backbeatStrength.value) / 200);
    const movable = events.filter(event => !locked.includes(event));
    movable.forEach(event => { pattern.tracks[event.id][step] = 'off'; });
    const occupied = new Set(locked.map(event => event.id));
    movable.forEach(event => {
      const alternatives = targetIds.filter(id => !occupied.has(id) && id !== event.id);
      const fallback = targetIds.filter(id => !occupied.has(id));
      const choices = alternatives.length ? alternatives : fallback;
      const targetId = choices[Math.floor(Math.random() * choices.length)] || event.id;
      const instrument = instruments.find(item => item.id === targetId);
      pattern.tracks[targetId][step] = stateForInstrument(event.state, instrument);
      occupied.add(targetId);
    });
  }
}

function activateScene(id, { refresh = true } = {}) {
  const scene = scenes.find(item => item.id === id);
  if (!scene) return false;
  storeActiveSectionState();
  activeSceneId = id;
  queuedSceneId = null;
  pattern = sanitizePattern(scene.pattern);
  rhythmSourceDirty = false;
  performanceTemplateTracks = cloneTracks(pattern.tracks);
  applySectionSettings(scene.settings);
  refs.tempo.value = pattern.tempo;
  refs.meter.value = pattern.meter;
  refs.length.value = String(pattern.bars);
  queuedCuts = [];
  queuedFills = [];
  queuedLandings = [];
  activeFill = null;
  sceneBar = 1;
  syncCueButtons();
  renderSceneState();
  if (refresh) updateAll();
  return true;
}

function chooseScene(id) {
  if (!scenes.some(scene => scene.id === id)) return;
  if (!playing) {
    queuedCuts = [];
    queuedFills = [];
    queuedLandings = [];
    activeFill = null;
    syncCueButtons();
    activateScene(id);
    refs.liveStatus.textContent = `${sceneName(id)} selected.`;
    return;
  }
  if (id === activeSceneId) {
    queuedSceneId = null;
    renderSceneState();
    refs.liveStatus.textContent = `${sceneName(id)} remains active.`;
    return;
  }
  queuedSceneId = id;
  renderSceneState();
  const transition = refs.sceneTransition.options[refs.sceneTransition.selectedIndex]?.textContent || 'selected transition';
  refs.liveStatus.textContent = `${sceneName(id)} queued for the next ${refs.scenePhraseBars.value}-bar boundary with ${transition.toLowerCase()}.`;
}

function selectSceneForEditing(id) {
  if (!scenes.some(scene => scene.id === id) || id === activeSceneId) return;
  const wasPlaying = playing;
  if (wasPlaying) stopPlayback();
  activateScene(id);
  refs.liveStatus.textContent = wasPlaying
    ? `${sceneName(id)} selected; playback stopped.`
    : `${sceneName(id)} selected.`;
}

function cancelQueuedScene() {
  queuedSceneId = null;
  renderSceneState();
  refs.liveStatus.textContent = `${sceneName(activeSceneId)} continues; the section change was cancelled.`;
}

function advancePerformanceBar(step) {
  const phraseBars = Math.max(1, Number(refs.scenePhraseBars.value) || 4);
  totalBarsStarted += 1;
  let switched = false;
  if (queuedSceneId && sceneBar >= phraseBars) {
    const nextScene = queuedSceneId;
    switched = activateScene(nextScene, { refresh: false });
  } else {
    sceneBar = sceneBar >= phraseBars ? 1 : sceneBar + 1;
  }
  const barStart = switched ? 0 : step;
  if (refs.liveDrummer.checked) evolveBar(barStart, switched);
  else if (switched && refs.sceneTransition.value !== 'clean') {
    pattern.tracks.cr1[barStart] = 'accent';
    if (refs.sceneTransition.value === 'fill-crash') pattern.tracks.bd[barStart] = 'accent';
    updateAll();
  }
  renderSceneState();
  return switched;
}

function evolveBar(barStart, sceneSwitched = false) {
  const instability = 1 - Number(refs.liveEvolution.value) / 100;
  const config = meterConfig();
  if (!performanceTemplateTracks) capturePerformanceTemplate();
  instruments.forEach(({ id }) => {
    for (let local = 0; local < config.slots; local += 1) {
      const step = wrappedStep(barStart + local);
      pattern.tracks[id][step] = performanceTemplateTracks[id][step];
    }
  });

  const mutable = instruments.filter(({ id }) => ['bd', 'sn', 'hh', 'ride', 'cowbell', 'ht', 'mt', 'lt', 'ft'].includes(id)
    && !(refs.preset.value === 'jazz-ride' && ['ride', 'cowbell'].includes(id)));
  for (let mutation = 0; mutation < 4; mutation += 1) {
    if (Math.random() >= instability) continue;
    const instrument = mutable[Math.floor(Math.random() * mutable.length)];
    const local = Math.floor(Math.random() * config.slots);
    const step = wrappedStep(barStart + local);
    const current = pattern.tracks[instrument.id][step];
    if (current === 'off') {
      pattern.tracks[instrument.id][step] = instrument.id === 'sn' && Math.random() < .7 ? 'ghost' : instrument.states[1];
    } else if (instrument.id === 'hh' && current === 'closed' && Math.random() < .55) {
      pattern.tracks.hh[step] = 'open';
    } else if (Math.random() < .72) {
      pattern.tracks[instrument.id][step] = 'off';
    } else {
      const available = instrument.states.slice(1);
      pattern.tracks[instrument.id][step] = available[Math.floor(Math.random() * available.length)];
    }
  }

  if (refs.backbeat.checked) {
    const strength = Number(refs.backbeatStrength.value) / 100;
    const ghostDensity = Number(refs.ghostDensity.value) / 100;
    config.backbeats.forEach(local => {
      const step = wrappedStep(barStart + local);
      if (pattern.tracks.sn[step] === 'off' && Math.random() < instability * (.12 + strength * .28)) {
        pattern.tracks.sn[step] = generatedSnareState(strength, ghostDensity);
      }
    });
  }

  const embellishment = Number(refs.embellishment.value) / 100;
  const embellishmentCount = Math.round(embellishment * 4);
  for (let detail = 0; detail < embellishmentCount; detail += 1) {
    const local = Math.floor(Math.random() * config.slots);
    const step = wrappedStep(barStart + local);
    if (detail % 2 === 0 && pattern.tracks.sn[step] === 'off' && !config.backbeats.includes(local)) pattern.tracks.sn[step] = 'ghost';
    else if (pattern.tracks.hh[step] === 'closed') pattern.tracks.hh[step] = Math.random() < .72 ? 'open' : 'bark';
  }

  const phraseEnding = sceneBar === Math.max(1, Number(refs.scenePhraseBars.value) || 4);
  const sceneTransitionFill = phraseEnding && queuedSceneId && refs.sceneTransition.value === 'fill-crash';
  const addedFill = phraseEnding && !sceneTransitionFill && Math.random() < Number(refs.fillProbability.value) / 100;
  const addedCut = phraseEnding && Math.random() < Number(refs.liveCutChance.value) / 100;
  if (sceneTransitionFill) insertFillEndingAt(barStart + config.slots, true, cueLength('fill', config));
  if (addedFill) insertFillEndingAt(barStart + config.slots, true);
  if (addedCut) {
    const boundary = wrappedStep(barStart + config.slots);
    const length = cueLength('cut', config);
    insertCutAt(boundary, length);
    const landing = wrappedStep(boundary + length);
    if (!queuedLandings.some(item => item.step === landing && item.type === 'cut')) queuedLandings.push({ step: landing, type: 'cut' });
  }
  const punctuationEvery = Number(refs.punctuationEvery.value);
  const punctuated = punctuationEvery > 0 && totalBarsStarted > 1 && (totalBarsStarted - 1) % punctuationEvery === 0
    && Math.random() < Number(refs.punctuationChance.value) / 100;
  if (punctuated) {
    const palette = Number(refs.cymbalPunctuation.value) / 100;
    const cymbal = Math.random() < palette * .25 ? 'china' : Math.random() < palette * .4 ? 'cr2' : 'cr1';
    pattern.tracks[cymbal][wrappedStep(barStart)] = 'accent';
  }
  if (sceneSwitched && refs.sceneTransition.value !== 'clean') {
    pattern.tracks.cr1[wrappedStep(barStart)] = 'accent';
    if (refs.sceneTransition.value === 'fill-crash') pattern.tracks.bd[wrappedStep(barStart)] = 'accent';
  }
  if (sceneSwitched) refs.liveStatus.textContent = `${sceneName(activeSceneId)} active.`;

  window.clearTimeout(visualRefreshTimer);
  visualRefreshTimer = window.setTimeout(() => updateAll(), 20);
}

function updateLiveOutputs() {
  refs.liveEvolutionOutput.value = `${refs.liveEvolution.value}%`;
  refs.embellishmentOutput.value = `${refs.embellishment.value}%`;
  refs.punctuationChanceOutput.value = `${refs.punctuationChance.value}%`;
  refs.liveCutChanceOutput.value = `${refs.liveCutChance.value}%`;
  refs.liveFillActivityOutput.value = `${refs.liveFillActivity.value}%`;
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

function syncAudioControls() {
  const volume = Number(refs.volume.value) / 100;
  refs.volumeOutput.value = `${refs.volume.value}%`;
  refs.mute.textContent = muted || volume === 0 ? '🔇' : '🔊';
  refs.mute.setAttribute('aria-pressed', String(muted));
  refs.mute.setAttribute('aria-label', muted ? 'Unmute browser audio' : 'Mute browser audio');
  refs.mute.title = refs.mute.getAttribute('aria-label');
  if (masterGain && audioContext) {
    masterGain.gain.cancelScheduledValues(audioContext.currentTime);
    masterGain.gain.setTargetAtTime(muted ? 0 : volume, audioContext.currentTime, .012);
  }
}

function refreshMidiOutputs() {
  const outputs = midiAccess ? [...midiAccess.outputs.values()].filter(output => output.state === 'connected') : [];
  const preferredId = pendingMidiOutputId !== null ? pendingMidiOutputId : midiOutput?.id || outputs[0]?.id || '';
  refs.midiOutput.replaceChildren(new Option('Off', ''));
  outputs.forEach(output => refs.midiOutput.add(new Option(output.name || output.manufacturer || 'MIDI output', output.id)));
  refs.midiOutput.disabled = false;
  refs.midiOutput.value = outputs.some(output => output.id === preferredId) ? preferredId : '';
  midiOutput = refs.midiOutput.value ? midiAccess.outputs.get(refs.midiOutput.value) : null;
  if (midiOutput) pendingMidiOutputId = refs.midiOutput.value;
  if (midiOutput) refs.status.textContent = `MIDI: ${midiOutput.name}`;
}

async function enableMidi() {
  if (midiAccess) return;
  if (!navigator.requestMIDIAccess) throw new Error('Web MIDI is not supported by this browser');
  const restartForClock = playing && refs.midiClock.checked;
  refs.midiEnable.disabled = true;
  refs.midiEnable.textContent = 'Connecting…';
  try {
    midiAccess = await navigator.requestMIDIAccess({ sysex: false });
    midiAccess.onstatechange = refreshMidiOutputs;
    refreshMidiOutputs();
    refs.midiEnable.disabled = false;
    refs.midiEnable.textContent = 'Disable MIDI';
    refs.status.textContent = midiOutput ? `MIDI: ${midiOutput.name}` : 'MIDI enabled; no output found';
    saveState();
    if (restartForClock && midiOutput) {
      stopPlayback();
      startPlayback();
    }
  } catch (error) {
    midiAccess = null;
    midiOutput = null;
    refs.midiEnable.disabled = false;
    refs.midiEnable.textContent = 'Enable MIDI';
    throw error;
  }
}

function disableMidi() {
  if (midiOutput) {
    try {
      midiOutput.clear?.();
      if (midiClockRunning) midiOutput.send([0xFC]);
      const channel = Math.max(0, Math.min(15, Number(refs.midiChannel.value) - 1));
      midiOutput.send([0xB0 | channel, 120, 0]);
      midiOutput.send([0xB0 | channel, 123, 0]);
    } catch (error) { /* The port may already be disconnected. */ }
  }
  midiClockRunning = false;
  midiAccess?.outputs.forEach(output => output.close?.());
  if (midiAccess) midiAccess.onstatechange = null;
  midiAccess = null;
  midiOutput = null;
  refs.midiOutput.disabled = true;
  refs.midiEnable.disabled = false;
  refs.midiEnable.textContent = 'Enable MIDI';
  refs.status.textContent = 'MIDI disabled';
}

function toggleMidi() {
  if (midiAccess) disableMidi();
  else enableMidi().catch(error => { refs.status.textContent = `MIDI unavailable: ${error.message || error}`; });
}

function ensureAudio() {
  if (!audioContext) {
    audioContext = new (window.AudioContext || window.webkitAudioContext)();
    masterGain = audioContext.createGain();
    masterGain.connect(audioContext.destination);
    noiseBuffer = audioContext.createBuffer(1, audioContext.sampleRate * 2, audioContext.sampleRate);
    const data = noiseBuffer.getChannelData(0);
    for (let i = 0; i < data.length; i += 1) data[i] = Math.random() * 2 - 1;
    syncAudioControls();
  }
  return audioContext.resume();
}

function outputNode(time, duration, volume, pan = 0) {
  const gain = audioContext.createGain();
  gain.gain.setValueAtTime(Math.max(.0001, volume), time);
  gain.gain.exponentialRampToValueAtTime(.0001, time + duration);
  const panner = audioContext.createStereoPanner ? audioContext.createStereoPanner() : null;
  if (panner) { panner.pan.value = pan; gain.connect(panner).connect(masterGain); }
  else gain.connect(masterGain);
  return gain;
}

function scheduleMidiInstrument(instrument, state, time, strength) {
  if (!midiOutput || !audioContext) return;
  const channel = Math.max(0, Math.min(15, Number(refs.midiChannel.value) - 1));
  const note = instrument.id === 'hh' && ['open', 'bark'].includes(state) ? 46
    : instrument.id === 'sn' && state === 'cross-stick' ? 37 : instrument.midi;
  const velocity = Math.max(1, Math.min(127, Math.round(82 * strength)));
  const timestamp = performance.now() + Math.max(0, time - audioContext.currentTime) * 1000;
  try {
    // Superior Drummer's e-drum mapping can derive hi-hat openness from pedal CC4
    // even when it also receives the General MIDI closed/open note numbers.
    if (instrument.id === 'hh') {
      const openness = ['open', 'bark'].includes(state) ? 0 : 127;
      midiOutput.send([0xB0 | channel, 4, openness], Math.max(performance.now(), timestamp - 1));
    } else if (instrument.id === 'ph') {
      midiOutput.send([0xB0 | channel, 4, 127], Math.max(performance.now(), timestamp - 1));
      if (state === 'splash') midiOutput.send([0xB0 | channel, 4, 0], timestamp + 35);
    }
    midiOutput.send([0x90 | channel, note, velocity], timestamp);
    midiOutput.send([0x80 | channel, note, 0], timestamp + 70);
  } catch (error) {
    refs.status.textContent = `MIDI error: ${error.message || error}`;
  }
}

function midiTimestamp(time) {
  return performance.now() + Math.max(0, time - audioContext.currentTime) * 1000;
}

function sendMidiTransport(message, time = null) {
  if (!midiOutput || !refs.midiClock.checked) return;
  try {
    if (time === null) midiOutput.send([message]);
    else midiOutput.send([message], midiTimestamp(time));
  } catch (error) {
    refs.status.textContent = `MIDI clock error: ${error.message || error}`;
  }
}

function scheduleMidiClock(stepTime) {
  if (!midiOutput || !refs.midiClock.checked || !audioContext) return;
  const pulseDuration = 60 / pattern.tempo / 24;
  try {
    for (let pulse = 0; pulse < 6; pulse += 1) {
      midiOutput.send([0xF8], midiTimestamp(stepTime + pulse * pulseDuration));
    }
  } catch (error) {
    refs.status.textContent = `MIDI clock error: ${error.message || error}`;
  }
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
  const range = Number(refs.dynamicRange.value) / 100;
  const human = Number(refs.humanization.value) / 100;
  const velocityJitter = 1 + (Math.random() - .5) * human * .38;
  const strength = (state === 'accent' ? 1 + range * 2
    : state === 'ghost' ? Math.max(.12, 1 - range * .82)
      : state === 'bark' ? 1 + range * .55 : 1) * velocityJitter;
  scheduleMidiInstrument(instrument, state, time, strength);
  const pan = instrument.pan;
  switch (instrument.family) {
    case 'kick': oscillator('sine', 145, time, .2, .55 * strength, pan, 48); break;
    case 'snare':
      if (state === 'cross-stick') oscillator('square', 850, time, .045, .12 * strength, pan, 430);
      else { noise(time, .13, .21 * strength, pan, 1050); oscillator('triangle', 185, time, .08, .12 * strength, pan, 150); }
      break;
    case 'hat': noise(time, state === 'open' || state === 'bark' ? .42 : .055, .075 * strength, pan, 6500); break;
    case 'pedal-hat':
      noise(time, state === 'splash' ? .38 : .065, (state === 'splash' ? .11 : .09) * strength, pan, 7200);
      if (state !== 'splash') oscillator('square', 2100, time, .035, .025 * strength, pan, 1650);
      break;
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

function followHorizontal(container, element, leadingInset = 16) {
  if (!container || !element || container.offsetWidth === 0) return;
  const containerRect = container.getBoundingClientRect();
  const elementRect = element.getBoundingClientRect();
  const elementCenter = container.scrollLeft + elementRect.left - containerRect.left + elementRect.width / 2;
  const visibleCenter = leadingInset + (container.clientWidth - leadingInset) / 2;
  const maximum = Math.max(0, container.scrollWidth - container.clientWidth);
  container.scrollLeft = Math.max(0, Math.min(maximum, elementCenter - visibleCenter));
}

function followPlaybackStep(step) {
  const gridMarker = refs.grid.querySelector(`.grid-header .step-number:nth-child(${step + 2})`);
  const gridLabel = refs.grid.querySelector('.grid-label');
  followHorizontal(refs.grid, gridMarker, (gridLabel?.offsetWidth || 0) + 12);
  followHorizontal(refs.notation, notationElements[step]);
}

function applyPendingInterjections(step) {
  const fill = queuedFills.find(cue => cue.startAtCount === scheduledStepCount);
  if (fill) {
    activeFill = { ...fill, fillState: createFillState() };
    queuedFills = queuedFills.filter(cue => cue !== fill);
    queuedLandings.push({ step: fill.boundary, atCount: fill.atCount, type: 'fill', landingStyle: activeFill.fillState.landingStyle });
    syncCueButtons();
    refs.liveStatus.textContent = 'Fill playing now; the groove lands at the selected boundary.';
    window.clearTimeout(visualRefreshTimer);
    visualRefreshTimer = window.setTimeout(() => updateAll(), 20);
  }
  if (activeFill && scheduledStepCount >= activeFill.startAtCount && scheduledStepCount < activeFill.atCount) {
    writeFillStep(step, scheduledStepCount - activeFill.startAtCount, activeFill.length, activeFill.fillState);
  }
  const cut = queuedCuts.find(cue => cue.atCount === scheduledStepCount);
  if (cut) {
    insertCutAt(step, cut.length);
    queuedCuts = queuedCuts.filter(cue => cue !== cut);
    const landing = wrappedStep(step + cut.length);
    if (!queuedLandings.some(item => item.step === landing && item.type === 'cut')) queuedLandings.push({ step: landing, type: 'cut' });
    syncCueButtons();
    refs.liveStatus.textContent = 'Cut playing now; the groove returns on the next beat.';
    window.clearTimeout(visualRefreshTimer);
    visualRefreshTimer = window.setTimeout(() => updateAll(), 20);
  }
  const landings = queuedLandings.filter(item => item.atCount === undefined ? item.step === step : item.atCount === scheduledStepCount);
  landings.forEach(item => {
    if (item.type === 'fill') {
      applyFillLanding(step, item.landingStyle);
      activeFill = null;
      syncCueButtons();
    }
    else {
      pattern.tracks.bd[step] = 'accent';
      pattern.tracks.cr1[step] = 'accent';
    }
  });
  if (landings.length) {
    queuedLandings = queuedLandings.filter(item => !landings.includes(item));
  }
}

function highlightStep(step, atTime) {
  const delay = Math.max(0, (atTime - audioContext.currentTime) * 1000);
  const timer = window.setTimeout(() => {
    clearHighlight();
    refs.grid.querySelectorAll(`[data-step="${step}"]`).forEach(element => element.classList.add('is-current'));
    notationElements[step]?.classList.add('current-note');
    followPlaybackStep(step);
  }, delay);
  highlightTimers.push(timer);
}

function scheduleStep(step, time) {
  let config = meterConfig();
  const switched = scheduledStepCount > 0 && step % config.slots === 0 && advancePerformanceBar(step);
  if (switched) {
    step = 0;
    nextStep = 0;
    config = meterConfig();
  }
  applyPendingInterjections(step);
  scheduleMidiClock(time);
  const stepDuration = 60 / pattern.tempo / 4;
  const swingDelay = step % config.slots % 4 === 2 ? stepDuration * (Number(refs.swing.value) / 100) * (2 / 3) : 0;
  const timingJitter = (Math.random() - .5) * stepDuration * (Number(refs.humanization.value) / 100) * .22;
  const performedTime = Math.max(audioContext.currentTime + .003, time + swingDelay + timingJitter);
  for (const instrument of instruments) {
    const state = pattern.tracks[instrument.id][step];
    if (state !== 'off' && !mutedInstruments.has(instrument.id)) scheduleInstrument(instrument, state, performedTime);
  }
  highlightStep(step, performedTime);
  scheduledStepCount += 1;
  return stepDuration;
}

function scheduler() {
  // Keep enough audio/MIDI queued to absorb an occasional long VexFlow refresh as a live bar evolves.
  while (nextStepTime < audioContext.currentTime + .4) {
    const stepDuration = scheduleStep(nextStep, nextStepTime);
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
  scheduledStepCount = 0;
  sceneBar = 1;
  totalBarsStarted = 1;
  playing = true;
  refs.play.textContent = '■ Stop';
  refs.play.dataset.playing = 'true';
  refs.play.setAttribute('aria-label', 'Stop groove');
  sendMidiTransport(0xFA, nextStepTime);
  midiClockRunning = Boolean(midiOutput && refs.midiClock.checked);
  scheduler();
  schedulerTimer = window.setInterval(scheduler, 40);
}

function stopPlayback() {
  const wasPlaying = playing;
  playing = false;
  scheduledStepCount = 0;
  if (schedulerTimer) window.clearInterval(schedulerTimer);
  schedulerTimer = null;
  highlightTimers.forEach(timer => window.clearTimeout(timer)); highlightTimers = [];
  scheduledNodes.forEach(node => { try { node.stop(); } catch (error) { /* already ended */ } }); scheduledNodes = [];
  if (midiOutput) {
    try {
      midiOutput.clear?.();
      if (midiClockRunning) midiOutput.send([0xFC]);
      const channel = Math.max(0, Math.min(15, Number(refs.midiChannel.value) - 1));
      midiOutput.send([0xB0 | channel, 123, 0]);
    } catch (error) { /* disconnected outputs are refreshed through MIDI state changes */ }
  }
  midiClockRunning = false;
  clearHighlight();
  if (wasPlaying && performanceTemplateTracks) {
    queuedCuts = [];
    queuedFills = [];
    queuedLandings = [];
    activeFill = null;
    syncCueButtons();
    pattern.tracks = cloneTracks(performanceTemplateTracks);
    updateAll();
  }
  refs.play.textContent = '▶ Play';
  refs.play.dataset.playing = 'false';
  refs.play.setAttribute('aria-label', 'Play groove');
}

refs.grid.addEventListener('click', event => {
  const muteButton = event.target.closest('.track-mute');
  if (muteButton) {
    const instrumentId = muteButton.dataset.muteInstrument;
    if (mutedInstruments.has(instrumentId)) mutedInstruments.delete(instrumentId);
    else mutedInstruments.add(instrumentId);
    renderGrid();
    saveState();
    return;
  }
  const cell = event.target.closest('.step-cell');
  if (!cell) return;
  const instrument = instruments.find(item => item.id === cell.dataset.instrument);
  const states = instrument.states;
  const step = Number(cell.dataset.step);
  const current = pattern.tracks[instrument.id][step];
  pattern.tracks[instrument.id][step] = states[(states.indexOf(current) + 1) % states.length];
  capturePerformanceTemplate();
  updateAll();
});

refs.play.addEventListener('click', () => playing ? stopPlayback() : startPlayback().catch(error => {
  stopPlayback(); refs.status.textContent = `Audio error: ${error.message || error}`;
}));
refs.mute.addEventListener('click', () => {
  if (muted || Number(refs.volume.value) === 0) {
    muted = false;
    if (Number(refs.volume.value) === 0) refs.volume.value = 70;
  } else {
    muted = true;
  }
  syncAudioControls();
  saveState();
});
refs.volume.addEventListener('input', () => {
  muted = Number(refs.volume.value) === 0;
  syncAudioControls();
  saveState();
});
refs.midiEnable.addEventListener('click', toggleMidi);
refs.midiOutput.addEventListener('change', () => {
  const restart = playing;
  if (restart) stopPlayback();
  midiOutput = refs.midiOutput.value && midiAccess ? midiAccess.outputs.get(refs.midiOutput.value) : null;
  pendingMidiOutputId = refs.midiOutput.value;
  refs.status.textContent = midiOutput ? `MIDI: ${midiOutput.name}` : 'MIDI output off';
  saveState();
  if (restart) startPlayback();
});
refs.midiChannel.addEventListener('change', saveState);
refs.midiClock.addEventListener('change', () => {
  const restart = playing;
  if (restart) stopPlayback();
  saveState();
  if (restart) startPlayback();
});
refs.liveDrummer.addEventListener('change', () => {
  refs.liveStatus.textContent = '';
  refs.status.textContent = refs.liveDrummer.checked ? 'Auto-evolve on' : 'Auto-evolve off';
  saveState();
});
refs.coreLoopBars.addEventListener('change', generatePattern);
for (const ref of [refs.liveEvolution, refs.embellishment, refs.punctuationChance, refs.liveCutChance, refs.liveFillActivity]) ref.addEventListener('input', () => {
  updateLiveOutputs();
  saveState();
});
for (const ref of [refs.scenePhraseBars, refs.sceneTransition, refs.punctuationEvery, refs.interjectionBoundary, refs.liveFillLength, refs.liveFillStyle, refs.liveFillLanding, refs.liveCutLength]) ref.addEventListener('change', saveState);
refs.mutationMode.addEventListener('change', saveState);
refs.sceneButtons.forEach(button => button.addEventListener('click', () => chooseScene(button.dataset.scene)));
refs.sceneSelector.addEventListener('change', () => selectSceneForEditing(refs.sceneSelector.value));
refs.cancelScene.addEventListener('click', cancelQueuedScene);
refs.queueFill.addEventListener('click', () => queueInterjection('fill'));
refs.cancelFill.addEventListener('click', () => cancelInterjection('fill'));
refs.queueCut.addEventListener('click', () => queueInterjection('cut'));
refs.cancelCut.addEventListener('click', () => cancelInterjection('cut'));
refs.generate.addEventListener('click', generatePattern);
refs.mutate.addEventListener('click', mutatePattern);
refs.clear.addEventListener('click', () => { pattern = createPattern(pattern.meter, pattern.bars, pattern.tempo); capturePerformanceTemplate(); updateAll(); });
refs.muteAllTracks.addEventListener('click', () => { mutedInstruments = new Set(instruments.map(({ id }) => id)); renderGrid(); saveState(); });
refs.unmuteAllTracks.addEventListener('click', () => { mutedInstruments.clear(); renderGrid(); saveState(); });
refs.source.addEventListener('input', () => {
  rhythmSourceDirty = true;
  setRhythmSourceStatus('Unapplied changes');
});
refs.source.addEventListener('keydown', event => {
  if (event.key !== 'Enter' || (!event.metaKey && !event.ctrlKey)) return;
  event.preventDefault();
  applyRhythmSource();
});
refs.sourceApply.addEventListener('click', applyRhythmSource);
refs.sourceRevert.addEventListener('click', revertRhythmSource);
refs.copy.addEventListener('click', async () => {
  const text = rhythmSourceDirty ? refs.source.value : sourceText();
  try { await navigator.clipboard.writeText(text); refs.status.textContent = 'Source copied'; }
  catch (error) { refs.source.focus(); refs.source.select(); refs.status.textContent = 'Source selected'; }
});
refs.tempo.addEventListener('input', () => {
  pattern.tempo = Math.min(300, Math.max(30, Number(refs.tempo.value) || 100));
  saveState();
});
refs.tempo.addEventListener('change', () => {
  const restart = playing;
  stopPlayback();
  updateAll();
  if (restart) startPlayback();
});

function applyPresetSelection({ rebuildScenes = false } = {}) {
  const selected = presetProfiles[refs.preset.value] || presetProfiles.open;
  refs.meter.value = selected.meter;
  refs.length.value = String(selected.bars);
  refs.tempo.value = selected.tempo;
  refs.backbeat.checked = selected.backbeat;
  controlKeys.forEach(key => {
    if (selected[key] !== undefined && refs[key]) refs[key].value = selected[key];
  });
  updateOutputs();
  generatePattern({ rebuildScenes });
}

function resetEverything() {
  stopPlayback();
  scenes = [];
  activeSceneId = 'verse-1';
  refs.preset.value = 'pocket';
  refs.liveDrummer.checked = true;
  refs.coreLoopBars.value = '2';
  refs.liveEvolution.value = 90;
  refs.embellishment.value = 12;
  refs.punctuationEvery.value = '4';
  refs.punctuationChance.value = 65;
  refs.scenePhraseBars.value = '4';
  refs.sceneTransition.value = 'fill-crash';
  refs.liveCutChance.value = 6;
  refs.interjectionBoundary.value = 'bar';
  refs.liveFillLength.value = 'half';
  refs.liveFillStyle.value = 'tom-sweep';
  refs.liveFillActivity.value = 85;
  refs.liveFillLanding.value = 'kick-crash';
  refs.liveCutLength.value = 'beat';
  refs.mutationMode.value = 'both';
  refs.volume.value = 70;
  refs.midiChannel.value = '10';
  refs.midiClock.checked = false;
  mutedInstruments.clear();
  muted = false;
  syncAudioControls();
  updateLiveOutputs();
  applyPresetSelection({ rebuildScenes: true });
  refs.liveStatus.textContent = '';
  refs.status.textContent = 'Reset to Pocket Rock defaults';
}

function regenerateStructure() {
  const restart = playing;
  stopPlayback();
  generatePattern();
  if (restart) startPlayback();
}

refs.meter.addEventListener('change', regenerateStructure);
refs.length.addEventListener('change', regenerateStructure);
const playbackOnlyKeys = new Set(['swing', 'humanization', 'dynamicRange', 'cymbalPunctuation', 'fillProbability', 'fillLength', 'registerMovement']);
controlKeys.filter(key => refs[key]?.type === 'range').forEach(key => refs[key].addEventListener('input', () => {
  updateOutputs();
  if (playbackOnlyKeys.has(key)) {
    saveState();
    return;
  }
  window.clearTimeout(generationTimer);
  generationTimer = window.setTimeout(generatePattern, 120);
}));
for (const ref of [refs.timekeeper, refs.period, refs.phraseContour, refs.backbeat]) ref.addEventListener('change', generatePattern);
refs.preset.addEventListener('change', () => applyPresetSelection());
refs.resetEverything.addEventListener('click', resetEverything);
refs.theme.addEventListener('click', () => setTheme(document.documentElement.dataset.theme === 'dark' ? 'light' : 'dark'));
viewButtons.forEach(button => button.addEventListener('click', () => selectView(button.dataset.view)));
window.addEventListener('resize', () => { window.clearTimeout(resizeTimer); resizeTimer = window.setTimeout(renderNotation, 150); });
window.addEventListener('pagehide', stopPlayback);

loadState();
enforcePresetOstinato();
capturePerformanceTemplate();
applyRestoredSceneState();
syncAudioControls();
updateLiveOutputs();
setTheme(document.documentElement.dataset.theme === 'light' ? 'light' : 'dark');
updateAll({ save: false });
let initialView = 'play';
try { initialView = localStorage.getItem(VIEW_KEY) || 'play'; } catch (error) { /* Use the default view. */ }
selectView(initialView, { persist: false });
