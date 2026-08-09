const $ = (selector) => document.querySelector(selector);

const THEME_KEY = 'personal-wiki-theme';
const PATTERN_KEY = 'drum-groove-explorer-pattern-v1';
const SETTINGS_KEY = 'drum-groove-explorer-settings-v1';

const instruments = [
  { id: 'cr2', label: 'Crash 2', key: 'c/6/X2', family: 'cymbal', midi: 57, pan: .55, states: ['off', 'hit', 'accent'] },
  { id: 'cr1', label: 'Crash 1', key: 'b/5/X2', family: 'cymbal', midi: 49, pan: -.45, states: ['off', 'hit', 'accent'] },
  { id: 'china', label: 'China', key: 'a/5/X2', family: 'cymbal', midi: 52, pan: .35, states: ['off', 'hit', 'accent'] },
  { id: 'ride', label: 'Ride', key: 'g/5/X2', family: 'ride', midi: 51, pan: .45, states: ['off', 'hit', 'accent'] },
  { id: 'cowbell', label: 'Cowbell', key: 'f/5/X2', family: 'cowbell', midi: 56, pan: .2, states: ['off', 'hit', 'accent'] },
  { id: 'hh', label: 'Hi-hat', key: 'f/5/X2', family: 'hat', midi: 42, pan: -.35, states: ['off', 'closed', 'open', 'bark', 'accent'] },
  { id: 'ph', label: 'Pedal hi-hat', key: 'd/4/X2', family: 'pedal-hat', midi: 44, pan: -.35, states: ['off', 'chick', 'splash', 'accent'] },
  { id: 'ht', label: 'High tom', key: 'e/5', family: 'tom', midi: 50, pitch: 190, pan: -.35, states: ['off', 'hit', 'flam', 'drag', 'accent'] },
  { id: 'mt', label: 'Mid tom', key: 'd/5', family: 'tom', midi: 47, pitch: 145, pan: .05, states: ['off', 'hit', 'flam', 'drag', 'accent'] },
  { id: 'lt', label: 'Low tom', key: 'b/4', family: 'tom', midi: 45, pitch: 112, pan: .28, states: ['off', 'hit', 'flam', 'drag', 'accent'] },
  { id: 'ft', label: 'Floor tom', key: 'a/4', family: 'tom', midi: 43, pitch: 82, pan: .48, states: ['off', 'hit', 'flam', 'drag', 'accent'] },
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
  midiEnable: $('#enable-midi'), midiOutput: $('#midi-output'), midiChannel: $('#midi-channel'),
  liveDrummer: $('#live-drummer'), coreLoopBars: $('#core-loop-bars'), liveEvolution: $('#live-evolution'), liveEvolutionOutput: $('#live-evolution-output'),
  liveCutChance: $('#live-cut-chance'), liveCutChanceOutput: $('#live-cut-chance-output'),
  interjectionBoundary: $('#interjection-boundary'), liveFillLength: $('#live-fill-length'), liveFillStyle: $('#live-fill-style'),
  liveFillActivity: $('#live-fill-activity'), liveFillActivityOutput: $('#live-fill-activity-output'), liveFillLanding: $('#live-fill-landing'),
  liveCutLength: $('#live-cut-length'),
  queueFill: $('#queue-fill'), queueCut: $('#queue-cut'), liveStatus: $('#live-status'),
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
  mutate: $('#mutate-pattern'), money: $('#money-beat'), grid: $('#step-grid'), notation: $('#notation-target'),
  source: $('#pattern-source'), tags: $('#character-tags'), note: $('#analysis-note'), theme: $('.theme-toggle')
};

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
let queuedCuts = [];
let queuedFills = [];
let queuedLandings = [];

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
    const settings = JSON.parse(localStorage.getItem(SETTINGS_KEY));
    if (settings) {
      if (settings.preset !== undefined && presetProfiles[settings.preset]) refs.preset.value = settings.preset;
      controlKeys.forEach(key => { if (settings[key] !== undefined && refs[key]) refs[key].value = settings[key]; });
      refs.backbeat.checked = settings.backbeat ?? true;
      refs.volume.value = settings.volume ?? 70;
      muted = settings.muted ?? false;
      refs.midiChannel.value = settings.midiChannel ?? '10';
      mutedInstruments = new Set(Array.isArray(settings.mutedInstruments) ? settings.mutedInstruments.filter(id => instruments.some(item => item.id === id)) : []);
      pendingMidiOutputId = settings.midiOutputId === undefined ? null : settings.midiOutputId;
      refs.liveDrummer.checked = settings.liveDrummer ?? true;
      refs.coreLoopBars.value = settings.coreLoopBars ?? '2';
      refs.liveEvolution.value = settings.liveEvolution ?? 24;
      refs.liveCutChance.value = settings.liveCutChance ?? 6;
      refs.interjectionBoundary.value = settings.interjectionBoundary ?? 'bar';
      refs.liveFillLength.value = settings.liveFillLength ?? 'half';
      refs.liveFillStyle.value = settings.liveFillStyle ?? 'tom-sweep';
      refs.liveFillActivity.value = settings.liveFillActivity ?? 85;
      refs.liveFillLanding.value = settings.liveFillLanding ?? 'kick-crash';
      refs.liveCutLength.value = settings.liveCutLength ?? 'beat';
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
    localStorage.setItem(PATTERN_KEY, JSON.stringify(pattern));
    localStorage.setItem(SETTINGS_KEY, JSON.stringify({ preset: refs.preset.value, backbeat: refs.backbeat.checked,
      volume: refs.volume.value, muted, midiChannel: refs.midiChannel.value,
      mutedInstruments: [...mutedInstruments],
      midiOutputId: midiOutput?.id || pendingMidiOutputId,
      liveDrummer: refs.liveDrummer.checked, coreLoopBars: refs.coreLoopBars.value, liveEvolution: refs.liveEvolution.value,
      liveCutChance: refs.liveCutChance.value,
      interjectionBoundary: refs.interjectionBoundary.value,
      liveFillLength: refs.liveFillLength.value, liveFillStyle: refs.liveFillStyle.value,
      liveFillActivity: refs.liveFillActivity.value, liveFillLanding: refs.liveFillLanding.value,
      liveCutLength: refs.liveCutLength.value,
      ...Object.fromEntries(controlKeys.map(key => [key, refs[key].value])) }));
    refs.status.textContent = 'Saved locally';
  } catch (error) {
    refs.status.textContent = 'Local save unavailable';
  }
}

function sourceToken(state) {
  return ({ off: '.', hit: 'x', closed: 'x', chick: 'p', splash: 's', accent: 'x>', ghost: '(x)', 'cross-stick': 'c', flam: 'f', drag: 'd', open: 'o', bark: '+' })[state] || '.';
}

function sourceText() {
  const lines = [
    `character ${refs.preset.value}`,
    `tempo ${pattern.tempo}`,
    `meter ${pattern.meter}`,
    `division 16`,
    `bars ${pattern.bars}`,
    `steps ${pattern.steps}`,
    `swing ${refs.swing.value}`,
    `humanization ${refs.humanization.value}`,
    `live ${refs.liveDrummer.checked ? 'on' : 'off'}`,
    `core-loop ${refs.coreLoopBars.value}`,
    `evolution ${refs.liveEvolution.value}`,
    `fill-probability ${refs.fillProbability.value}`,
    `live-cut-chance ${refs.liveCutChance.value}`,
    `live-fill-length ${refs.liveFillLength.value}`,
    `live-fill-style ${refs.liveFillStyle.value}`,
    `live-fill-activity ${refs.liveFillActivity.value}`,
    `live-fill-landing ${refs.liveFillLanding.value}`,
    `live-cut-length ${refs.liveCutLength.value}`
  ];
  if (mutedInstruments.size) lines.push(`muted ${[...mutedInstruments].join(' ')}`);
  for (const instrument of instruments) lines.push(`${instrument.id}: ${pattern.tracks[instrument.id].map(sourceToken).join(' ')}`);
  return lines.join('\n');
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
  refs.note.textContent = `This groove is ${tags.slice(0, -1).join(', ')}${tags.length > 1 ? ' and ' : ''}${tags.at(-1)}. ${layers ? `${layers} subdivision${layers === 1 ? '' : 's'} layer multiple instruments.` : 'Every occupied subdivision belongs to a single instrument.'}`;
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
  refs.source.value = sourceText();
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

function capturePerformanceTemplate() {
  performanceTemplateTracks = Object.fromEntries(instruments.map(({ id }) => [id, [...pattern.tracks[id]]]));
  queuedCuts = [];
  queuedFills = [];
  queuedLandings = [];
}

function liveReadyStatus() {
  const bars = Math.max(1, Number(refs.coreLoopBars.value) || 2);
  const fillStatus = Number(refs.fillProbability.value) === 0 ? ' Automatic fills are off; Queue fill remains manual.' : '';
  return refs.liveDrummer.checked
    ? `The ${bars}-bar core loop repeats while small variations play over it.${fillStatus}`
    : 'Continuous variation is frozen; the written phrase will loop unchanged.';
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

function generatePattern() {
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
  const cymbalPunctuation = Number(refs.cymbalPunctuation.value) / 100;
  const fillProbability = Number(refs.fillProbability.value) / 100;
  const fillLength = Number(refs.fillLength.value) / 100;
  const registerMovement = Number(refs.registerMovement.value) / 100;
  const eventSpacing = Number(refs.eventSpacing.value) / 100;
  const repetition = Number(refs.repetition.value) / 100;
  for (let bar = 0; bar < pattern.bars; bar += 1) {
    const offset = bar * config.slots;
    generatePulseBar(offset, config, pulseDensity);
    if (refs.backbeat.checked) {
      const backbeats = ['halftime', 'dnb'].includes(preset) && pattern.meter === '4/4' ? [8] : config.backbeats;
      backbeats.forEach(local => {
        const displaced = Math.random() < backbeatDisplacement ? (Math.random() < .5 ? -1 : 1) : 0;
        const step = offset + (local + displaced + config.slots) % config.slots;
        pattern.tracks.sn[step] = backbeatStrength < .25 ? 'ghost' : backbeatStrength < .7 ? 'hit' : 'accent';
      });
    }
    const target = Math.max(1, Math.round((1 + density * 8 * config.slots / 16) * contourWeight(offset + config.slots / 2)));
    generateKickBar(offset, Math.min(config.slots - 1, target), sync, config, kickIndependence, eventSpacing);
    for (let local = 0; local < config.slots; local += 1) {
      const step = offset + local;
      if (pattern.tracks.sn[step] === 'off' && Math.random() < ghostDensity * .24 * contourWeight(step)) pattern.tracks.sn[step] = 'ghost';
      if (Math.random() < orchestration * .055 * contourWeight(step)) pattern.tracks.cowbell[step] = 'hit';
      if (pulseInstrument() !== 'ride' && Math.random() < orchestration * .045 * contourWeight(step)) pattern.tracks.ride[step] = 'hit';
    }
    if (Math.random() < cymbalPunctuation) pattern.tracks.cr1[offset] = 'accent';
    if (Math.random() < cymbalPunctuation * .45) pattern.tracks.china[offset + config.groups[Math.floor(config.groups.length / 2)]] = 'accent';
    if (pattern.bars > 1 && bar === pattern.bars - 1 && Math.random() < cymbalPunctuation) pattern.tracks.cr2[offset] = 'accent';
    if (pulseInstrument() === 'hh' && Math.random() < cymbalPunctuation * .7) pattern.tracks.hh[offset + config.slots - 2] = 'open';
    if (Math.random() < fillProbability) {
      const maxLength = Math.max(1, Math.min(8, Math.floor(config.slots / 2)));
      const length = Math.max(1, Math.round(1 + fillLength * (maxLength - 1)));
      const start = offset + config.slots - length;
      const toms = ['ht', 'mt', 'lt', 'ft'];
      const fixedTom = toms[Math.floor(Math.random() * toms.length)];
      for (let i = 0; i < length; i += 1) {
        if (Math.random() > .3 + orchestration * .55) continue;
        const movingIndex = Math.min(toms.length - 1, Math.floor(i / Math.max(1, length / toms.length)));
        const id = Math.random() < registerMovement ? toms[movingIndex] : fixedTom;
        pattern.tracks[id][start + i] = i === length - 1 ? 'accent' : 'hit';
      }
    }
  }
  applyRepetition(repetition, surprise);
  applyPreferredPeriod();
  applyEventSpacing(eventSpacing);
  applyArticulations(articulation);
  applyDisplacement(Number(refs.beatDisplacement.value));
  applyLinearity(linearity);
  enforcePresetOstinato();
  capturePerformanceTemplate();
  updateAll();
  refs.liveStatus.textContent = liveReadyStatus();
}

function mutatePattern() {
  const amount = Math.max(1, Math.round(pattern.steps * (Number(refs.surprise.value) / 100) * .35));
  const preferred = instruments.filter(item => ['bd', 'sn', 'hh', 'ht', 'mt', 'lt', 'ft', 'ride'].includes(item.id));
  for (let i = 0; i < amount; i += 1) {
    const instrument = preferred[Math.floor(Math.random() * preferred.length)];
    const step = Math.floor(Math.random() * pattern.steps);
    const playableStates = instrument.states.slice(1);
    pattern.tracks[instrument.id][step] = pattern.tracks[instrument.id][step] === 'off'
      ? playableStates[Math.floor(Math.random() * playableStates.length)]
      : 'off';
  }
  capturePerformanceTemplate();
  updateAll();
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
  if (choice === 'bar') return config.slots;
  if (choice === 'half') return closestHalfBarBoundary(config) || Math.max(1, Math.round(config.slots / 2));
  return config.groups[1] || Math.max(1, Math.round(config.slots / config.numerator));
}

function cueLengthLabel(type) {
  const select = type === 'fill' ? refs.liveFillLength : refs.liveCutLength;
  return select.options[select.selectedIndex]?.textContent.toLowerCase() || 'one beat';
}

function applyFillLanding(step) {
  if (refs.liveFillLanding.value === 'kick-crash' || refs.liveFillLanding.value === 'kick') pattern.tracks.bd[step] = 'accent';
  if (refs.liveFillLanding.value === 'kick-crash' || refs.liveFillLanding.value === 'crash') pattern.tracks.cr1[step] = 'accent';
}

function insertFillEndingAt(boundary, trackLanding = false, requestedLength = null) {
  const config = meterConfig();
  const maxLength = Math.max(3, Math.min(8, Math.floor(config.slots / 2)));
  const length = requestedLength || Math.max(3, Math.round(3 + (Number(refs.fillLength.value) / 100) * (maxLength - 3)));
  const start = boundary - length;
  const toms = ['ht', 'mt', 'lt', 'ft'];
  const activity = Number(refs.liveFillActivity.value) / 100;
  for (let offset = 0; offset < length; offset += 1) {
    const step = wrappedStep(start + offset);
    instruments.forEach(({ id }) => { pattern.tracks[id][step] = 'off'; });
    if (offset !== length - 1 && Math.random() > activity) continue;
    const progress = offset / Math.max(1, length - 1);
    const tomIndex = Math.min(toms.length - 1, Math.floor(progress * toms.length));
    let instrument = toms[tomIndex];
    if (refs.liveFillStyle.value === 'snare-toms') instrument = progress < .38 ? 'sn' : toms[Math.min(toms.length - 1, Math.floor(((progress - .38) / .62) * toms.length))];
    if (refs.liveFillStyle.value === 'snare-roll') instrument = 'sn';
    if (refs.liveFillStyle.value === 'around-kit') instrument = ['sn', 'ht', 'sn', 'mt', 'sn', 'lt', 'ft'][offset % 7];
    if (refs.liveFillStyle.value === 'cymbal-punches') instrument = offset % 2 ? toms[tomIndex] : 'sn';
    const state = offset === length - 1 || (refs.liveFillStyle.value === 'snare-roll' && offset % 4 === 0) ? 'accent' : 'hit';
    pattern.tracks[instrument][step] = state;
    if (refs.liveFillStyle.value === 'cymbal-punches' && offset % 4 === 0) pattern.tracks[offset % 8 === 0 ? 'cr1' : 'china'][step] = 'accent';
  }
  const landing = wrappedStep(boundary);
  applyFillLanding(landing);
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

function nextBoundary(mode, minimumDistance) {
  const positions = boundaryPositions(mode);
  const cursor = playing ? nextStep : 0;
  for (let distance = Math.max(1, minimumDistance); distance <= pattern.steps + minimumDistance; distance += 1) {
    const step = wrappedStep(cursor + distance);
    if (positions.has(step)) return step;
  }
  return 0;
}

function queueInterjection(type) {
  const config = meterConfig();
  const length = cueLength(type, config);
  const safety = type === 'fill' ? length + 1 : 3;
  const boundary = nextBoundary(refs.interjectionBoundary.value, safety);
  if (type === 'fill') {
    insertFillEndingAt(boundary, true, length);
    if (!queuedFills.some(cue => cue.boundary === boundary)) queuedFills.push({ boundary, length });
  }
  else {
    insertCutAt(boundary, length);
    if (!queuedCuts.some(cue => cue.boundary === boundary)) queuedCuts.push({ boundary, length });
    const landing = wrappedStep(boundary + length);
    if (!queuedLandings.some(item => item.step === landing && item.type === 'cut')) queuedLandings.push({ step: landing, type: 'cut' });
  }
  updateAll();
  const bar = Math.floor(boundary / config.slots) + 1;
  const location = boundary % config.slots === 0 ? `bar ${bar}` : `the middle of bar ${bar}`;
  refs.liveStatus.textContent = type === 'fill'
    ? `${cueLengthLabel('fill')} fill placed immediately before ${location}.`
    : `${cueLengthLabel('cut')} cut queued at ${location}.`;
}

function evolveBar(barStart) {
  const amount = Number(refs.liveEvolution.value) / 100;
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
  const mutationCount = Math.round(amount * 4);
  for (let mutation = 0; mutation < mutationCount; mutation += 1) {
    const instrument = mutable[Math.floor(Math.random() * mutable.length)];
    const local = Math.floor(Math.random() * config.slots);
    if (instrument.id === 'sn' && refs.backbeat.checked && config.backbeats.includes(local)) continue;
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
    config.backbeats.forEach(local => {
      const step = wrappedStep(barStart + local);
      if (pattern.tracks.sn[step] === 'off') pattern.tracks.sn[step] = 'hit';
    });
  }
  const addedFill = Math.random() < Number(refs.fillProbability.value) / 100;
  const addedCut = Math.random() < Number(refs.liveCutChance.value) / 100;
  if (addedFill) insertFillEndingAt(barStart + config.slots, true, cueLength('fill', config));
  if (addedCut) {
    const boundary = wrappedStep(barStart + config.slots);
    const length = cueLength('cut', config);
    insertCutAt(boundary, length);
    if (!queuedCuts.some(cue => cue.boundary === boundary)) queuedCuts.push({ boundary, length });
    const landing = wrappedStep(boundary + length);
    if (!queuedLandings.some(item => item.step === landing && item.type === 'cut')) queuedLandings.push({ step: landing, type: 'cut' });
  }
  queuedFills.forEach(cue => {
    const fillBar = Math.floor(wrappedStep(cue.boundary - 1) / config.slots);
    if (fillBar === Math.floor(wrappedStep(barStart) / config.slots)) insertFillEndingAt(cue.boundary, true, cue.length);
  });
  const bar = Math.floor(barStart / config.slots) + 1;
  refs.liveStatus.textContent = `Bar ${bar} evolved${addedFill ? ' with a fill' : ''}${addedCut ? `${addedFill ? ' and' : ' with'} a cut` : ''}.`;

  window.clearTimeout(visualRefreshTimer);
  visualRefreshTimer = window.setTimeout(() => updateAll(), 20);
}

function updateLiveOutputs() {
  refs.liveEvolutionOutput.value = `${refs.liveEvolution.value}%`;
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
  pendingMidiOutputId = refs.midiOutput.value;
  if (midiOutput) refs.status.textContent = `MIDI: ${midiOutput.name}`;
}

async function enableMidi() {
  if (!navigator.requestMIDIAccess) throw new Error('Web MIDI is not supported by this browser');
  refs.midiEnable.disabled = true;
  refs.midiEnable.textContent = 'Connecting…';
  try {
    midiAccess = await navigator.requestMIDIAccess({ sysex: false });
    midiAccess.onstatechange = refreshMidiOutputs;
    refreshMidiOutputs();
    refs.midiEnable.textContent = 'MIDI enabled';
    refs.status.textContent = midiOutput ? `MIDI: ${midiOutput.name}` : 'MIDI enabled; no output found';
    saveState();
  } catch (error) {
    refs.midiEnable.disabled = false;
    refs.midiEnable.textContent = 'Enable MIDI';
    throw error;
  }
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

function applyPendingInterjections(step) {
  const cut = queuedCuts.find(cue => cue.boundary === step);
  if (cut) {
    insertCutAt(step, cut.length);
    queuedCuts = queuedCuts.filter(cue => cue.boundary !== step);
    refs.liveStatus.textContent = 'Cut playing now; the groove returns on the next beat.';
  }
  const landings = queuedLandings.filter(item => item.step === step);
  landings.forEach(item => {
    if (item.type === 'fill') applyFillLanding(step);
    else {
      pattern.tracks.bd[step] = 'accent';
      pattern.tracks.cr1[step] = 'accent';
    }
  });
  if (landings.length) {
    queuedLandings = queuedLandings.filter(item => item.step !== step);
  }
  queuedFills = queuedFills.filter(cue => cue.boundary !== step);
}

function highlightStep(step, atTime) {
  const delay = Math.max(0, (atTime - audioContext.currentTime) * 1000);
  const timer = window.setTimeout(() => {
    clearHighlight();
    refs.grid.querySelectorAll(`[data-step="${step}"]`).forEach(element => element.classList.add('is-current'));
    notationElements[step]?.classList.add('current-note');
  }, delay);
  highlightTimers.push(timer);
}

function scheduleStep(step, time) {
  const config = meterConfig();
  if (refs.liveDrummer.checked && scheduledStepCount > 0 && step % config.slots === 0) evolveBar(step);
  applyPendingInterjections(step);
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
}

function scheduler() {
  const stepDuration = 60 / pattern.tempo / 4;
  // Keep enough audio/MIDI queued to absorb an occasional long VexFlow refresh as a live bar evolves.
  while (nextStepTime < audioContext.currentTime + .4) {
    scheduleStep(nextStep, nextStepTime);
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
  playing = true;
  refs.play.textContent = '■ Stop';
  refs.play.dataset.playing = 'true';
  refs.play.setAttribute('aria-label', 'Stop groove');
  scheduler();
  schedulerTimer = window.setInterval(scheduler, 40);
}

function stopPlayback() {
  playing = false;
  scheduledStepCount = 0;
  if (schedulerTimer) window.clearInterval(schedulerTimer);
  schedulerTimer = null;
  highlightTimers.forEach(timer => window.clearTimeout(timer)); highlightTimers = [];
  scheduledNodes.forEach(node => { try { node.stop(); } catch (error) { /* already ended */ } }); scheduledNodes = [];
  if (midiOutput) {
    try {
      midiOutput.clear?.();
      const channel = Math.max(0, Math.min(15, Number(refs.midiChannel.value) - 1));
      midiOutput.send([0xB0 | channel, 123, 0]);
    } catch (error) { /* disconnected outputs are refreshed through MIDI state changes */ }
  }
  clearHighlight();
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
refs.midiEnable.addEventListener('click', () => enableMidi().catch(error => {
  refs.status.textContent = `MIDI unavailable: ${error.message || error}`;
}));
refs.midiOutput.addEventListener('change', () => {
  midiOutput = refs.midiOutput.value && midiAccess ? midiAccess.outputs.get(refs.midiOutput.value) : null;
  pendingMidiOutputId = refs.midiOutput.value;
  refs.status.textContent = midiOutput ? `MIDI: ${midiOutput.name}` : 'MIDI output off';
  saveState();
});
refs.midiChannel.addEventListener('change', saveState);
refs.liveDrummer.addEventListener('change', () => {
  refs.liveStatus.textContent = liveReadyStatus();
  saveState();
});
refs.coreLoopBars.addEventListener('change', generatePattern);
for (const ref of [refs.liveEvolution, refs.liveCutChance, refs.liveFillActivity]) ref.addEventListener('input', () => {
  updateLiveOutputs();
  saveState();
});
for (const ref of [refs.interjectionBoundary, refs.liveFillLength, refs.liveFillStyle, refs.liveFillLanding, refs.liveCutLength]) ref.addEventListener('change', saveState);
refs.queueFill.addEventListener('click', () => queueInterjection('fill'));
refs.queueCut.addEventListener('click', () => queueInterjection('cut'));
refs.generate.addEventListener('click', generatePattern);
refs.mutate.addEventListener('click', mutatePattern);
refs.money.addEventListener('click', () => { pattern = moneyBeat('4/4', 1); capturePerformanceTemplate(); updateAll(); });
refs.clear.addEventListener('click', () => { pattern = createPattern(pattern.meter, pattern.bars, pattern.tempo); capturePerformanceTemplate(); updateAll(); });
refs.muteAllTracks.addEventListener('click', () => { mutedInstruments = new Set(instruments.map(({ id }) => id)); renderGrid(); saveState(); });
refs.unmuteAllTracks.addEventListener('click', () => { mutedInstruments.clear(); renderGrid(); saveState(); });
refs.copy.addEventListener('click', async () => {
  try { await navigator.clipboard.writeText(sourceText()); refs.status.textContent = 'Source copied'; }
  catch (error) { refs.source.focus(); refs.source.select(); refs.status.textContent = 'Source selected'; }
});
refs.tempo.addEventListener('change', () => { pattern.tempo = Number(refs.tempo.value) || 100; const restart = playing; stopPlayback(); updateAll(); if (restart) startPlayback(); });

function applyPresetSelection() {
  const selected = presetProfiles[refs.preset.value] || presetProfiles.open;
  refs.meter.value = selected.meter;
  refs.length.value = String(selected.bars);
  refs.tempo.value = selected.tempo;
  refs.backbeat.checked = selected.backbeat;
  controlKeys.forEach(key => {
    if (selected[key] !== undefined && refs[key]) refs[key].value = selected[key];
  });
  updateOutputs();
  generatePattern();
}

function resetEverything() {
  stopPlayback();
  refs.preset.value = 'pocket';
  refs.liveDrummer.checked = true;
  refs.coreLoopBars.value = '2';
  refs.liveEvolution.value = 24;
  refs.liveCutChance.value = 6;
  refs.interjectionBoundary.value = 'bar';
  refs.liveFillLength.value = 'half';
  refs.liveFillStyle.value = 'tom-sweep';
  refs.liveFillActivity.value = 85;
  refs.liveFillLanding.value = 'kick-crash';
  refs.liveCutLength.value = 'beat';
  refs.volume.value = 70;
  refs.midiChannel.value = '10';
  mutedInstruments.clear();
  muted = false;
  syncAudioControls();
  updateLiveOutputs();
  applyPresetSelection();
  refs.liveStatus.textContent = liveReadyStatus();
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
const playbackOnlyKeys = new Set(['swing', 'humanization', 'dynamicRange']);
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
refs.preset.addEventListener('change', applyPresetSelection);
refs.resetEverything.addEventListener('click', resetEverything);
refs.theme.addEventListener('click', () => setTheme(document.documentElement.dataset.theme === 'dark' ? 'light' : 'dark'));
window.addEventListener('resize', () => { window.clearTimeout(resizeTimer); resizeTimer = window.setTimeout(renderNotation, 150); });
window.addEventListener('pagehide', stopPlayback);

loadState();
enforcePresetOstinato();
capturePerformanceTemplate();
syncAudioControls();
updateLiveOutputs();
setTheme(document.documentElement.dataset.theme === 'light' ? 'light' : 'dark');
updateAll({ save: false });
