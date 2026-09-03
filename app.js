import { DrumSampleLibrary, pushOrderedVelocities, velocityFromStrengthProfile } from './projects/rhythm-explorer/drum-sample-kit.js?v=20260818-velocity-slider';
import { midiName, midiToVexKey, samePitchSet, vexAccidentalForKey } from './projects/piano/trainer-core.js?v=20260903-wiki-score';

const content = document.querySelector('#content');
const sidebar = document.querySelector('#sidebar');
const menuButton = document.querySelector('.menu-button');
const sidebarCollapseButton = document.querySelector('.sidebar-collapse');
const themeToggle = document.querySelector('.theme-toggle');
const currentPathLabel = document.querySelector('#current-path');
let strudelReady;
let abcBlockId = 0;
let drumBlockId = 0;
let cubeBlockId = 0;
let pianoScoreBlockId = 0;
let abcAudioContext;
let activeAbcSynth = null;
let activeAbcTiming = null;
let activeAbcStopTimer = null;
let drumAudioContext;
let activeDrumNodes = [];
let activeDrumStopTimer = null;
let activeDrumHighlightTimers = [];
let activeDrumMidiTimer = null;
let drumMidiStartNotBefore = 0;
let activeDrumSwingSlider = null;
let drumMidiAccess = null;
let drumMidiEnabled = false;
let drumMidiOutputId = '';
const DRUM_MIDI_LOOKAHEAD_SECONDS = 0.1;
const DRUM_MIDI_SCHEDULER_INTERVAL_MS = 30;
const DRUM_AUDIO_LOOKAHEAD_SECONDS = 0.1;
const DRUM_AUDIO_SCHEDULER_INTERVAL_MS = 30;
const DRUM_MIDI_MIN_SWITCH_GAP_MS = 160;
const DRUM_TRIPLET_SWING_PERCENT = 200 / 3;
const DRUM_SWING_SNAP_THRESHOLD = 1.25;
const DEFAULT_WIKI_SNARE_KIT_ID = 'ludwig-black-beauty-snare-center';
const wikiDrumSampleLibrary = new DrumSampleLibrary(
  new URL('./projects/rhythm-explorer/assets/drums/library.json', import.meta.url)
);
let wikiSnareKitId = DEFAULT_WIKI_SNARE_KIT_ID;
let wikiSnareSampleKit = null;
let wikiSnareSampleKitPromise = null;
let drumSampleWarningShown = false;
let pianoScoreAudioContext;
let activePianoScore = null;
let pianoScoreMidiAccess = null;
let pianoScoreMidiInput = null;
let pianoScoreMidiInputId = '';
let sidebarCollapsed = false;
let pianoScoreResizeTimer = null;
const pianoScoreHeldNotes = new Set();

try {
  pianoScoreMidiInputId = localStorage.getItem('piano-reading-trainer-midi-input') || '';
  sidebarCollapsed = localStorage.getItem('personal-wiki-sidebar-collapsed') === 'true';
} catch {
  // MIDI preferences remain session-only when browser storage is unavailable.
}

try {
  drumMidiEnabled = localStorage.getItem('personal-wiki-drum-midi-enabled') === 'true';
  drumMidiOutputId = localStorage.getItem('personal-wiki-drum-midi-output') || '';
  wikiSnareKitId = localStorage.getItem('personal-wiki-drum-snare-kit') || DEFAULT_WIKI_SNARE_KIT_ID;
} catch {
  // MIDI preferences remain session-only when browser storage is unavailable.
}

const escapeHtml = (value) => value
  .replaceAll('&', '&amp;')
  .replaceAll('<', '&lt;')
  .replaceAll('>', '&gt;')
  .replaceAll('"', '&quot;')
  .replaceAll("'", '&#039;');

function currentTheme() {
  return document.documentElement.dataset.theme === 'light' ? 'light' : 'dark';
}

function setTheme(theme) {
  const nextTheme = theme === 'light' ? 'light' : 'dark';
  document.documentElement.dataset.theme = nextTheme;
  try {
    localStorage.setItem('personal-wiki-theme', nextTheme);
  } catch (error) {
    // Theme still applies for this page load if storage is unavailable.
  }
  if (!themeToggle) return;
  const isDark = nextTheme === 'dark';
  themeToggle.textContent = isDark ? '☀' : '☾';
  themeToggle.setAttribute('aria-label', `Switch to ${isDark ? 'light' : 'dark'} mode`);
  themeToggle.setAttribute('title', `Switch to ${isDark ? 'light' : 'dark'} mode`);
}

function setSidebarCollapsed(collapsed) {
  sidebarCollapsed = Boolean(collapsed);
  document.body.classList.toggle('sidebar-collapsed', sidebarCollapsed);
  if (sidebarCollapseButton) {
    sidebarCollapseButton.textContent = sidebarCollapsed ? '›' : '‹';
    sidebarCollapseButton.setAttribute('aria-expanded', String(!sidebarCollapsed));
    sidebarCollapseButton.setAttribute('aria-label', sidebarCollapsed ? 'Expand table of contents' : 'Collapse table of contents');
    sidebarCollapseButton.setAttribute('title', sidebarCollapsed ? 'Expand table of contents' : 'Collapse table of contents');
  }
  try { localStorage.setItem('personal-wiki-sidebar-collapsed', String(sidebarCollapsed)); } catch { /* Ignore storage failures. */ }
  if (document.querySelector('.piano-score-block')) requestAnimationFrame(renderPianoScoreBlocks);
}

const slugify = (text) => text.toLowerCase().replace(/[^a-z0-9\s-]/g, '').trim().replace(/\s+/g, '-');

function parseFenceOptions(text = '') {
  const options = {};
  if (!text.trim()) return options;
  text.trim().split(/\s+/).forEach((part) => {
    const match = part.match(/^([a-z][a-z0-9-]*)=(\S+)$/i);
    if (!match) throw new Error(`Invalid fence option "${part}". Use name=value.`);
    options[match[1].toLowerCase()] = match[2];
  });
  return options;
}

function inline(text) {
  let result = escapeHtml(text);
  result = result.replace(/`([^`]+)`/g, '<code>$1</code>');
  result = result.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
  result = result.replace(/(^|[^\w])__([^_\n]+?)__(?=[^\w]|$)/g, '$1<strong>$2</strong>');
  result = result.replace(/\*([^*]+)\*/g, '<em>$1</em>');
  result = result.replace(/(^|[^\w])_([^_\n]+?)_(?=[^\w]|$)/g, '$1<em>$2</em>');
  result = result.replace(/\[([^\]]+)\]\(([^)]+)\)/g, (_, label, href) => {
    const projectLink = /^projects\/[a-z0-9][a-z0-9/-]*\/?$/.test(href);
    const safeHref = /^(https?:|mailto:|#)/.test(href) || projectLink ? href : '#';
    const external = /^https?:/.test(safeHref) || projectLink ? ' target="_blank" rel="noopener noreferrer"' : '';
    return `<a href="${escapeHtml(safeHref)}"${external}>${label}</a>`;
  });
  return result;
}

const fenceRenderers = {
  'piano-score'(source) {
    const encodedSource = encodeURIComponent(source);
    const targetId = `piano-score-${pianoScoreBlockId += 1}`;
    return `<section class="piano-score-block" data-piano-score-source="${encodedSource}" data-playing="false" data-following="false">
      <div class="piano-score-render" id="${targetId}" aria-label="Rendered piano score"></div>
      <div class="piano-score-controls">
        <button class="piano-score-play" type="button" aria-label="Play this piano score">▶ Play</button>
        <button class="piano-score-follow" type="button" aria-label="Follow this score from a MIDI keyboard">♫ Follow MIDI</button>
        <select class="piano-score-midi-input" aria-label="Piano MIDI input" disabled>
          <option value="">Choose MIDI input</option>
        </select>
        <span class="piano-score-status" role="status" aria-live="polite"></span>
      </div>
      <details class="piano-score-source">
        <summary>Source</summary>
        <pre><code>${escapeHtml(source)}</code></pre>
      </details>
    </section>`;
  },
  abc(source) {
    const encodedSource = encodeURIComponent(source);
    const targetId = `abc-notation-${abcBlockId += 1}`;
    return `<section class="abc-block" data-abc-source="${encodedSource}" data-playing="false">
      <div class="abc-render" id="${targetId}" aria-label="Rendered music notation"></div>
      <div class="abc-controls">
        <button class="abc-toggle" type="button" aria-label="Play this ABC notation">▶ Play</button>
      </div>
      <details class="abc-source">
        <summary>Source</summary>
        <pre><code>${escapeHtml(source)}</code></pre>
      </details>
    </section>`;
  },
  drums(source) {
    const encodedSource = encodeURIComponent(source);
    const targetId = `drum-notation-${drumBlockId += 1}`;
    const tempo = source.match(/^tempo\s+([0-9.]+)/im)?.[1] || '120';
    const requestedSwing = Number(source.match(/^swing\s+([0-9.]+)/im)?.[1] || 50);
    const swing = Math.max(50, Math.min(83.333, Number.isFinite(requestedSwing) ? requestedSwing : 50));
    const swingValue = String(Math.round(swing * 1000) / 1000);
    const swingLabel = `${swing.toFixed(1).replace(/\.0$/, '')}%`;
    const swingAria = Math.abs(swing - DRUM_TRIPLET_SWING_PERCENT) < 0.01
      ? `${swingLabel}, triplet swing`
      : swing === 50 ? `${swingLabel}, straight` : swingLabel;
    return `<section class="drum-block" data-drum-source="${encodedSource}" data-playing="false">
      <div class="drum-render" id="${targetId}" aria-label="Rendered drum notation"></div>
      <div class="drum-controls">
        <button class="drum-toggle" type="button" aria-label="Play this drum notation">▶ Play</button>
        <label class="drum-tempo-control">
          <span>Tempo</span>
          <button class="drum-tempo-step" type="button" data-tempo-step="-10" aria-label="Decrease tempo by 10">−</button>
          <input class="drum-tempo" type="number" min="20" max="400" step="1" value="${escapeHtml(tempo)}" aria-label="Drum playback tempo">
          <button class="drum-tempo-step" type="button" data-tempo-step="10" aria-label="Increase tempo by 10">+</button>
        </label>
        <label class="drum-swing-control" title="50% is straight, 66.7% is triplet swing, and 83.3% is the maximum delay.">
          <span>Swing</span>
          <span class="drum-swing-track">
            <input class="drum-swing" type="range" min="50" max="83.333" step="0.001" value="${swingValue}" aria-label="Drum playback swing" aria-valuetext="${swingAria}">
            <span class="drum-swing-triplet-mark" aria-hidden="true" title="Triplet swing: 66.7%"></span>
          </span>
          <output class="drum-swing-output">${swingLabel}</output>
        </label>
        <div class="drum-velocity-control" role="group" aria-label="Drum velocities" title="Set ghost, normal, and accented hit velocities. Moving one handle through another pushes the neighboring velocity.">
          <span>Velocity</span>
          <span class="drum-velocity-track">
            <span class="drum-velocity-rail" aria-hidden="true"></span>
            <input class="drum-velocity drum-velocity-ghost" data-velocity-role="ghost" type="range" min="1" max="127" step="1" value="16" aria-label="Ghost-note velocity" aria-valuetext="16, ghost note">
            <input class="drum-velocity drum-velocity-normal" data-velocity-role="normal" type="range" min="1" max="127" step="1" value="64" aria-label="Normal-note velocity" aria-valuetext="64, normal note">
            <input class="drum-velocity drum-velocity-accent" data-velocity-role="accent" type="range" min="1" max="127" step="1" value="111" aria-label="Accent velocity" aria-valuetext="111, accent">
          </span>
          <output class="drum-velocity-output" title="Ghost · Normal · Accent">G16 N64 A111</output>
        </div>
        <label class="drum-midi-control" title="Send drums on MIDI channel 10 and mute the built-in sounds. Snare sticking uses Superior Drummer center (R) and off-center (L) articulations.">
          <input class="drum-midi-enabled" type="checkbox"${drumMidiEnabled ? ' checked' : ''}>
          <span>MIDI</span>
        </label>
        <select class="drum-midi-output" aria-label="Drum MIDI output" disabled>
          <option value="">${drumMidiEnabled ? 'Connect on Play' : 'MIDI off'}</option>
        </select>
        <label class="drum-kit-control" title="Select the sampled sound used for the snare part in built-in browser audio. MIDI output uses the kit configured in the receiving application.">
          <span>Sound</span>
          <select class="drum-kit-select" aria-label="Drum sample sound" disabled>
            <option value="">Loading kits…</option>
          </select>
        </label>
        <span class="drum-midi-status" role="status" aria-live="polite"></span>
      </div>
      <details class="drum-source">
        <summary>Source</summary>
        <pre><code>${escapeHtml(source)}</code></pre>
      </details>
    </section>`;
  },
  'cube-cmll'(source, language, optionText) {
    const algorithm = source.trim().replace(/\s+/g, ' ');
    const targetId = `cube-notation-${cubeBlockId += 1}`;
    return `<section class="cube-block" data-cube-source="${encodeURIComponent(algorithm)}" data-cube-options="${encodeURIComponent(optionText || '')}">
      <div class="cube-render" id="${targetId}"></div>
      <p class="cube-algorithm"><code>${escapeHtml(algorithm)}</code></p>
    </section>`;
  },
  strudel(source) {
    const encodedSource = encodeURIComponent(source);
    return `<section class="strudel-block" data-strudel-source="${encodedSource}" data-playing="false">
      <div class="strudel-controls">
        <button class="strudel-toggle" type="button" aria-label="Play this Strudel sketch">▶ Play</button>
      </div>
      <details class="strudel-source">
        <summary>Source</summary>
        <pre><code>${escapeHtml(source)}</code></pre>
      </details>
    </section>`;
  },
  default(source, language) {
    return `<pre class="code-block" data-language="${escapeHtml(language || 'text')}"><code>${escapeHtml(source)}</code></pre>`;
  }
};

function renderMarkdown(markdown) {
  const lines = markdown.replace(/\r\n?/g, '\n').split('\n');
  const output = [];
  let paragraph = [];
  let listType = null;
  const sectionStack = [];
  const usedHeadingIds = new Map();
  let sectionId = 0;

  const flushParagraph = () => {
    if (paragraph.length) {
      const html = paragraph.map((part) => `${inline(part.text)}${part.forcedBreak ? '<br>' : ''}`).join('');
      output.push(`<p>${html}</p>`);
    }
    paragraph = [];
  };
  const addParagraphLine = (text) => {
    const forcedBreak = /\\\s*$/.test(text);
    const cleanText = forcedBreak ? text.replace(/\\\s*$/, '') : text;
    if (paragraph.length && !paragraph.at(-1).forcedBreak) paragraph.at(-1).text += ' ';
    paragraph.push({ text: cleanText, forcedBreak });
  };
  const closeList = () => {
    if (listType) output.push(`</${listType}>`);
    listType = null;
  };
  const uniqueHeadingId = (text) => {
    const base = slugify(text) || 'section';
    const count = usedHeadingIds.get(base) || 0;
    usedHeadingIds.set(base, count + 1);
    return count ? `${base}-${count + 1}` : base;
  };
  const closeSections = (level = 0) => {
    while (sectionStack.length && sectionStack.at(-1) >= level) {
      output.push('</div></section>');
      sectionStack.pop();
    }
  };

  for (let index = 0; index < lines.length; index += 1) {
    const line = lines[index];
    const fence = line.match(/^```([\w-]*)(?:\s+(.+?))?\s*$/);
    if (fence) {
      flushParagraph(); closeList();
      const language = fence[1].toLowerCase();
      const body = [];
      index += 1;
      while (index < lines.length && !/^```\s*$/.test(lines[index])) body.push(lines[index++]);
      const renderer = fenceRenderers[language] || fenceRenderers.default;
      output.push(renderer(body.join('\n'), language, fence[2] || ''));
      continue;
    }

    const heading = line.match(/^(#{1,6})\s+(.+)$/);
    const horizontalRule = line.match(/^\s*-{4,}\s*$/);
    const unordered = line.match(/^[-*]\s+(.+)$/);
    const ordered = line.match(/^\d+\.\s+(.+)$/);
    const quote = line.match(/^>\s?(.*)$/);

    if (heading) {
      flushParagraph(); closeList();
      const level = heading[1].length;
      closeSections(level);
      const headingId = uniqueHeadingId(heading[2]);
      const bodyId = `section-body-${sectionId += 1}`;
      const expanded = level === 1;
      output.push(`<section class="wiki-section wiki-section-level-${level} ${expanded ? 'is-expanded' : 'is-collapsed'}">`);
      if (level === 1) {
        output.push(`<h1 id="${headingId}"><span class="wiki-section-title">${inline(heading[2])}</span></h1>`);
      } else {
        output.push(`<h${level} id="${headingId}"><button class="wiki-section-toggle" type="button" aria-expanded="${String(expanded)}" aria-controls="${bodyId}" title="Click to expand or collapse. Shift-click cycles descendants."><span class="wiki-section-arrow" aria-hidden="true">▸</span><span class="wiki-section-title">${inline(heading[2])}</span></button></h${level}>`);
      }
      output.push(`<div class="wiki-section-body" id="${bodyId}" aria-hidden="${String(!expanded)}">`);
      sectionStack.push(level);
    } else if (horizontalRule) {
      flushParagraph(); closeList();
      output.push('<hr>');
    } else if (unordered || ordered) {
      flushParagraph();
      const nextType = unordered ? 'ul' : 'ol';
      if (listType !== nextType) { closeList(); output.push(`<${nextType}>`); listType = nextType; }
      output.push(`<li>${inline((unordered || ordered)[1])}</li>`);
    } else if (quote) {
      flushParagraph(); closeList();
      output.push(`<blockquote><p>${inline(quote[1])}</p></blockquote>`);
    } else if (!line.trim()) {
      flushParagraph(); closeList();
    } else {
      addParagraphLine(line.trim());
    }
  }

  flushParagraph(); closeList();
  closeSections();
  return output.join('\n');
}

async function prepareStrudel() {
  if (!strudelReady) {
    strudelReady = Promise.resolve().then(async () => {
      if (typeof window.initStrudel !== 'function') {
        throw new Error('The Strudel runtime could not be loaded. Check your connection and reload the page.');
      }
      await window.initStrudel();
      await waitForStrudelDsl();
    });
  }

  try {
    return await strudelReady;
  } catch (error) {
    strudelReady = null;
    throw error;
  }
}

function strudelDslReady() {
  try {
    return (0, eval)('typeof note === "function" && typeof sine !== "undefined"');
  } catch {
    return false;
  }
}

function waitForStrudelDsl(timeoutMs = 3000) {
  const started = performance.now();

  return new Promise((resolve, reject) => {
    const check = () => {
      if (strudelDslReady()) {
        resolve();
      } else if (performance.now() - started > timeoutMs) {
        reject(new Error('The Strudel runtime loaded, but its pattern functions were not ready. Try again.'));
      } else {
        setTimeout(check, 25);
      }
    };

    check();
  });
}

function setSectionExpanded(section, expanded) {
  const toggle = section?.querySelector(':scope > h1 .wiki-section-toggle, :scope > h2 .wiki-section-toggle, :scope > h3 .wiki-section-toggle, :scope > h4 .wiki-section-toggle, :scope > h5 .wiki-section-toggle, :scope > h6 .wiki-section-toggle');
  const body = toggle ? document.getElementById(toggle.getAttribute('aria-controls')) : null;
  if (!toggle) return;
  toggle?.setAttribute('aria-expanded', String(expanded));
  section?.classList.toggle('is-collapsed', !expanded);
  section?.classList.toggle('is-expanded', expanded);
  body?.setAttribute('aria-hidden', String(!expanded));
}

function sectionHasExpandedDescendants(section) {
  return Boolean(section?.querySelector(':scope > .wiki-section-body .wiki-section .wiki-section-toggle[aria-expanded="true"]'));
}

function setDescendantSectionsExpanded(section, expanded) {
  section?.querySelectorAll(':scope > .wiki-section-body .wiki-section').forEach((child) => {
    setSectionExpanded(child, expanded);
  });
}

function setStrudelButton(block, state = 'play') {
  const button = block.querySelector('.strudel-toggle');
  block.dataset.playing = state === 'playing' ? 'true' : 'false';
  button.dataset.state = state === 'play' ? '' : state;

  if (state === 'playing') {
    button.textContent = '■ Stop';
    button.setAttribute('aria-label', 'Stop Strudel playback');
  } else if (state === 'loading') {
    button.textContent = 'Starting…';
    button.setAttribute('aria-label', 'Starting Strudel playback');
  } else if (state === 'error') {
    button.textContent = 'Error — retry';
    button.setAttribute('aria-label', 'Strudel failed; retry playback');
  } else {
    button.textContent = '▶ Play';
    button.setAttribute('aria-label', 'Play this Strudel sketch');
  }
}

function stopStrudelBlocks() {
  if (typeof window.hush === 'function') window.hush();
  document.querySelectorAll('.strudel-block').forEach((block) => setStrudelButton(block));
}

function setAbcButton(block, state = 'play') {
  const button = block.querySelector('.abc-toggle');
  block.dataset.playing = state === 'playing' ? 'true' : 'false';
  button.dataset.state = state === 'play' ? '' : state;

  if (state === 'playing') {
    button.textContent = '■ Stop';
    button.setAttribute('aria-label', 'Stop ABC playback');
  } else if (state === 'loading') {
    button.textContent = 'Loading…';
    button.setAttribute('aria-label', 'Loading ABC playback');
  } else if (state === 'error') {
    button.textContent = 'Error — retry';
    button.setAttribute('aria-label', 'ABC playback failed; retry');
  } else {
    button.textContent = '▶ Play';
    button.setAttribute('aria-label', 'Play this ABC notation');
  }
}

function stopAbcBlocks() {
  if (activeAbcStopTimer) {
    clearTimeout(activeAbcStopTimer);
    activeAbcStopTimer = null;
  }

  const timing = activeAbcTiming;
  activeAbcTiming = null;
  if (timing && typeof timing.stop === 'function') {
    timing.stop();
  }

  if (activeAbcSynth && typeof activeAbcSynth.stop === 'function') {
    activeAbcSynth.stop();
  }

  activeAbcSynth = null;
  clearAbcHighlight();
  document.querySelectorAll('.abc-block').forEach((block) => setAbcButton(block));
}

function clearAbcHighlight(scope = document) {
  scope.querySelectorAll('.abc-current-note').forEach((element) => {
    element.classList.remove('abc-current-note');
  });
}

function markAbcElement(element) {
  if (Array.isArray(element)) {
    element.forEach(markAbcElement);
  } else if (element?.classList) {
    element.classList.add('abc-current-note');
  }
}

function highlightAbcEvent(block, event) {
  clearAbcHighlight(block);

  if (!event) {
    return;
  }

  event.elements?.forEach(markAbcElement);
}

async function restartAbcBlock(block, synth) {
  if (activeAbcSynth !== synth || block.dataset.playing !== 'true' || !document.body.contains(block)) return;

  if (activeAbcStopTimer) {
    clearTimeout(activeAbcStopTimer);
    activeAbcStopTimer = null;
  }

  const timing = activeAbcTiming;
  activeAbcTiming = null;
  if (timing && typeof timing.stop === 'function') timing.stop();
  if (activeAbcSynth && typeof activeAbcSynth.stop === 'function') activeAbcSynth.stop();
  activeAbcSynth = null;
  clearAbcHighlight(block);

  try {
    await playAbcBlock(block);
  } catch (error) {
    console.error(error);
    stopAbcBlocks();
    setAbcButton(block, 'error');
  }
}

function abcPlaybackOptions(source) {
  const isPercussion = /\bclef\s*=\s*(perc|percussion)\b/i.test(source)
    || /^%%MIDI\s+drum(on)?\b/im.test(source);

  if (isPercussion) {
    return { channel: 10 };
  }

  return { program: 0 };
}

async function playAbcBlock(block) {
  if (!window.ABCJS?.synth?.supportsAudio?.()) {
    throw new Error('ABC playback is not supported in this browser.');
  }

  if (!block.abcVisualObj) {
    throw new Error('This ABC block has not rendered yet.');
  }

  const AudioContextConstructor = window.AudioContext || window.webkitAudioContext;
  if (!AudioContextConstructor) {
    throw new Error('This browser does not support Web Audio.');
  }

  if (!abcAudioContext) {
    abcAudioContext = new AudioContextConstructor();
  }
  if (abcAudioContext.state === 'suspended') {
    await abcAudioContext.resume();
  }

  const source = decodeURIComponent(block.dataset.abcSource || '');
  const synth = new window.ABCJS.synth.CreateSynth();
  await synth.init({
    audioContext: abcAudioContext,
    visualObj: block.abcVisualObj,
    options: abcPlaybackOptions(source)
  });
  const primeResult = await synth.prime();
  const timing = typeof window.ABCJS.TimingCallbacks === 'function'
    ? new window.ABCJS.TimingCallbacks(block.abcVisualObj, {
      eventCallback(event) {
        if (activeAbcTiming !== timing) return;
        highlightAbcEvent(block, event);
        if (!event && !activeAbcStopTimer) restartAbcBlock(block, synth);
      }
    })
    : null;

  activeAbcSynth = synth;
  activeAbcTiming = timing;
  synth.start();
  if (timing) timing.start();
  setAbcButton(block, 'playing');

  const duration = Number(primeResult?.duration);
  if (duration > 0) {
    activeAbcStopTimer = setTimeout(() => {
      restartAbcBlock(block, synth);
    }, (duration * 1000) + 250);
  }
}

function renderAbcBlocks() {
  document.querySelectorAll('.abc-block').forEach((block) => {
    const target = block.querySelector('.abc-render');
    const source = decodeURIComponent(block.dataset.abcSource || '');

    if (!window.ABCJS || typeof window.ABCJS.renderAbc !== 'function') {
      target.innerHTML = '<p class="abc-error">Could not load the notation renderer. Open Source below to read the ABC text.</p>';
      return;
    }

    try {
      const rendered = window.ABCJS.renderAbc(target, source, {
        add_classes: true,
        responsive: 'resize'
      });
      block.abcVisualObj = rendered[0];
    } catch (error) {
      console.error(error);
      target.innerHTML = '<p class="abc-error">Could not render this notation. Open Source below to read the ABC text.</p>';
    }
  });
}

const pianoScoreDurationBeats = { w: 4, h: 2, q: 1, e: 0.5, s: 0.25 };
const pianoScoreVexDurations = { w: 'w', h: 'h', q: 'q', e: '8', s: '16' };

function pianoPitchToMidi(pitch) {
  const match = String(pitch).match(/^([A-Ga-g])([#b]?)(-?\d+)$/);
  if (!match) throw new Error(`Invalid pitch "${pitch}". Use a pitch such as C4, F#4, or Bb3.`);
  const semitones = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 };
  const accidental = match[2] === '#' ? 1 : match[2] === 'b' ? -1 : 0;
  return ((Number(match[3]) + 1) * 12) + semitones[match[1].toUpperCase()] + accidental;
}

function parsePianoScoreToken(rawToken) {
  const match = rawToken.match(/^(r|[A-Ga-g][#b]?-?\d+|\[(?:[A-Ga-g][#b]?-?\d+,?)+\]):([whqes])(\.)?$/);
  if (!match) {
    throw new Error(`Invalid score token "${rawToken}". Use C4:q, r:e, or [C4,E4,G4]:h.`);
  }
  const dotted = Boolean(match[3]);
  const notes = match[1] === 'r'
    ? []
    : (match[1].startsWith('[') ? match[1].slice(1, -1).split(',') : [match[1]]).map(pianoPitchToMidi);
  return {
    raw: rawToken,
    notes,
    rest: notes.length === 0,
    duration: match[2],
    dotted,
    beats: pianoScoreDurationBeats[match[2]] * (dotted ? 1.5 : 1)
  };
}

function parsePianoScore(source) {
  const score = { title: '', tempo: 92, meter: '4/4', clef: 'treble', measures: [], events: [] };
  const musicLines = [];
  let readingNotes = false;
  String(source).replace(/\r\n?/g, '\n').split('\n').forEach((rawLine) => {
    const line = rawLine.trim();
    if (!line || line.startsWith('//')) return;
    if (readingNotes) {
      musicLines.push(line);
      return;
    }
    const directive = line.match(/^(title|tempo|meter|clef|notes)\b\s*:?[ \t]*(.*)$/i);
    if (!directive) throw new Error(`Unknown piano-score line "${line}".`);
    const name = directive[1].toLowerCase();
    const value = directive[2].trim();
    if (name === 'notes') {
      readingNotes = true;
      if (value) musicLines.push(value);
    } else if (name === 'title') score.title = value;
    else if (name === 'tempo') score.tempo = Math.max(20, Math.min(300, Number(value) || 92));
    else if (name === 'meter') score.meter = value;
    else if (name === 'clef') score.clef = value.toLowerCase();
  });

  const meterMatch = score.meter.match(/^(\d+)\/(1|2|4|8|16)$/);
  if (!meterMatch) throw new Error('Meter must look like 4/4, 3/4, or 6/8.');
  score.numBeats = Number(meterMatch[1]);
  score.beatValue = Number(meterMatch[2]);
  score.measureBeats = score.numBeats * (4 / score.beatValue);
  if (!['treble', 'bass'].includes(score.clef)) throw new Error('Clef must be treble or bass.');

  const normalized = musicLines.join(' ').replace(/\|\|/g, '|').trim();
  const measureSources = normalized.split('|').map(part => part.trim()).filter(Boolean);
  if (!measureSources.length) throw new Error('The score needs notes after the notes: directive.');
  score.measures = measureSources.map((measureSource, measureIndex) => {
    const events = measureSource.split(/\s+/).filter(Boolean).map(parsePianoScoreToken);
    const beats = events.reduce((sum, scoreEvent) => sum + scoreEvent.beats, 0);
    if (Math.abs(beats - score.measureBeats) > 0.0001) {
      throw new Error(`Measure ${measureIndex + 1} contains ${beats} quarter-note beats; ${score.meter} needs ${score.measureBeats}.`);
    }
    events.forEach((scoreEvent) => {
      scoreEvent.index = score.events.length;
      scoreEvent.measureIndex = measureIndex;
      score.events.push(scoreEvent);
    });
    return events;
  });
  return score;
}

function makePianoScoreVexNote(Flow, scoreEvent, clef) {
  const duration = `${pianoScoreVexDurations[scoreEvent.duration]}${scoreEvent.dotted ? 'd' : ''}${scoreEvent.rest ? 'r' : ''}`;
  const keys = scoreEvent.rest ? [clef === 'bass' ? 'd/3' : 'b/4'] : scoreEvent.notes.map(midiToVexKey);
  const note = new Flow.StaveNote({ clef, keys, duration });
  if (!scoreEvent.rest) {
    keys.forEach((key, index) => {
      const accidental = vexAccidentalForKey(key);
      if (accidental) note.addModifier(new Flow.Accidental(accidental), index);
    });
  }
  if (scoreEvent.dotted) Flow.Dot.buildAndAttach([note], { all: true });
  return note;
}

function renderPianoScoreBlock(block) {
  const target = block.querySelector('.piano-score-render');
  if (!window.Vex?.Flow) {
    target.innerHTML = '<p class="piano-score-error">Could not load VexFlow. Open Source below to read the score.</p>';
    return;
  }
  try {
    const Flow = window.Vex.Flow;
    const score = parsePianoScore(decodeURIComponent(block.dataset.pianoScoreSource || ''));
    const measuresPerSystem = 4;
    const systemCount = Math.ceil(score.measures.length / measuresPerSystem);
    const width = Math.max(820, target.clientWidth - 32);
    const height = systemCount * 132 + 20;
    target.innerHTML = '';
    const renderer = new Flow.Renderer(target, Flow.Renderer.Backends.SVG);
    renderer.resize(width, height);
    const context = renderer.getContext();
    block.pianoScoreElements = [];
    block.pianoScore = score;

    for (let system = 0; system < systemCount; system += 1) {
      const firstMeasure = system * measuresPerSystem;
      const count = Math.min(measuresPerSystem, score.measures.length - firstMeasure);
      const staveWidth = (width - 28) / count;
      for (let offset = 0; offset < count; offset += 1) {
        const measureIndex = firstMeasure + offset;
        const stave = new Flow.Stave(14 + offset * staveWidth, 24 + system * 132, staveWidth);
        if (offset === 0) stave.addClef(score.clef);
        if (measureIndex === 0) stave.addTimeSignature(score.meter);
        stave.setContext(context).draw();
        const scoreEvents = score.measures[measureIndex];
        const notes = scoreEvents.map(scoreEvent => makePianoScoreVexNote(Flow, scoreEvent, score.clef));
        const voice = new Flow.Voice({ num_beats: score.numBeats, beat_value: score.beatValue });
        voice.addTickables(notes);
        const beams = Flow.Beam.generateBeams(notes);
        new Flow.Formatter().joinVoices([voice]).formatToStave([voice], stave, { align_rests: true });
        voice.draw(context, stave);
        beams.forEach(beam => beam.setContext(context).draw());
        notes.forEach((note, index) => {
          const element = note.getSVGElement?.();
          if (element) {
            element.classList.add('piano-score-note');
            const stem = note.getStem?.()?.getSVGElement?.();
            block.pianoScoreElements[scoreEvents[index].index] = stem && !element.contains(stem)
              ? [element, stem]
              : [element];
          }
        });
      }
    }
  } catch (error) {
    console.error(error);
    target.innerHTML = `<p class="piano-score-error">${escapeHtml(error.message || 'Could not render this score.')}</p>`;
  }
}

function renderPianoScoreBlocks() {
  document.querySelectorAll('.piano-score-block').forEach(renderPianoScoreBlock);
  syncPianoScoreMidiInputs();
}

function setPianoScoreStatus(block, message = '', error = false) {
  const status = block?.querySelector('.piano-score-status');
  if (!status) return;
  status.textContent = message;
  status.classList.toggle('is-error', error);
}

function setPianoScoreButtons(block, mode = 'idle') {
  if (!block) return;
  const play = block.querySelector('.piano-score-play');
  const follow = block.querySelector('.piano-score-follow');
  block.dataset.playing = String(mode === 'playing');
  block.dataset.following = String(mode === 'following');
  play.textContent = mode === 'playing' ? '■ Stop' : '▶ Play';
  follow.textContent = mode === 'following' ? '■ Stop following' : mode === 'connecting' ? 'Connecting…' : '♫ Follow MIDI';
  play.setAttribute('aria-label', mode === 'playing' ? 'Stop this piano score' : 'Play this piano score');
  follow.setAttribute('aria-label', mode === 'following' ? 'Stop following this piano score' : 'Follow this score from a MIDI keyboard');
  play.dataset.state = mode === 'playing' ? 'playing' : '';
  follow.dataset.state = mode === 'following' ? 'playing' : '';
}

function clearPianoScoreHighlight(block = document) {
  block.querySelectorAll?.('.piano-score-current, .piano-score-wrong').forEach((element) => {
    element.classList.remove('piano-score-current', 'piano-score-wrong');
  });
}

function pianoScoreEventElements(value) {
  return (Array.isArray(value) ? value : [value]).filter(Boolean);
}

function followPianoScoreElement(block, eventElements) {
  const elements = pianoScoreEventElements(eventElements);
  const element = elements[0];
  if (!element) return;
  clearPianoScoreHighlight(block);
  elements.forEach(item => item.classList.add('piano-score-current'));
  const scroller = block.querySelector('.piano-score-render');
  const elementBox = element.getBoundingClientRect();
  const scrollerBox = scroller.getBoundingClientRect();
  const centerOffset = elementBox.left + elementBox.width / 2 - (scrollerBox.left + scrollerBox.width / 2);
  scroller.scrollTo({ left: Math.max(0, scroller.scrollLeft + centerOffset), behavior: 'smooth' });

  const headerBottom = document.querySelector('.site-header')?.getBoundingClientRect().bottom || 0;
  const usableViewportCenter = headerBottom + ((window.innerHeight - headerBottom) / 2);
  const noteCenter = elementBox.top + (elementBox.height / 2);
  const verticalOffset = noteCenter - usableViewportCenter;
  if (Math.abs(verticalOffset) > 24) {
    window.scrollTo({ top: Math.max(0, window.scrollY + verticalOffset), behavior: 'smooth' });
  }
}

function stopPianoScoreBlocks() {
  if (activePianoScore) {
    activePianoScore.timers?.forEach(clearTimeout);
    activePianoScore.nodes?.forEach((node) => {
      try { node.stop(); } catch { /* The node may already have ended. */ }
    });
  }
  activePianoScore = null;
  pianoScoreHeldNotes.clear();
  clearPianoScoreHighlight(document);
  document.querySelectorAll('.piano-score-block').forEach((block) => {
    setPianoScoreButtons(block);
    setPianoScoreStatus(block);
  });
}

function schedulePianoScoreTone(context, midi, startTime, duration, nodes) {
  const frequency = 440 * (2 ** ((midi - 69) / 12));
  const gain = context.createGain();
  gain.gain.setValueAtTime(0.0001, startTime);
  gain.gain.exponentialRampToValueAtTime(0.18, startTime + 0.012);
  gain.gain.exponentialRampToValueAtTime(0.0001, startTime + Math.max(0.09, duration));
  gain.connect(context.destination);
  [
    { type: 'triangle', ratio: 1, level: 1 },
    { type: 'sine', ratio: 2, level: 0.16 }
  ].forEach((partial) => {
    const oscillator = context.createOscillator();
    const partialGain = context.createGain();
    oscillator.type = partial.type;
    oscillator.frequency.value = frequency * partial.ratio;
    partialGain.gain.value = partial.level;
    oscillator.connect(partialGain).connect(gain);
    oscillator.start(startTime);
    oscillator.stop(startTime + Math.max(0.1, duration) + 0.03);
    nodes.push(oscillator);
  });
}

async function playPianoScoreBlock(block) {
  const AudioContextConstructor = window.AudioContext || window.webkitAudioContext;
  if (!AudioContextConstructor) throw new Error('This browser does not support Web Audio.');
  if (!block.pianoScore) throw new Error('This score did not render.');
  if (!pianoScoreAudioContext) pianoScoreAudioContext = new AudioContextConstructor();
  if (pianoScoreAudioContext.state === 'suspended') await pianoScoreAudioContext.resume();
  const score = block.pianoScore;
  const secondsPerBeat = 60 / score.tempo;
  const startTime = pianoScoreAudioContext.currentTime + 0.08;
  const playback = { block, mode: 'playback', timers: [], nodes: [] };
  activePianoScore = playback;
  setPianoScoreButtons(block, 'playing');
  let beat = 0;
  score.events.forEach((scoreEvent) => {
    const eventTime = startTime + beat * secondsPerBeat;
    scoreEvent.notes.forEach(midi => schedulePianoScoreTone(
      pianoScoreAudioContext,
      midi,
      eventTime,
      Math.max(0.12, scoreEvent.beats * secondsPerBeat * 0.82),
      playback.nodes
    ));
    playback.timers.push(setTimeout(() => {
      if (activePianoScore !== playback) return;
      followPianoScoreElement(block, block.pianoScoreElements[scoreEvent.index]);
    }, Math.max(0, (eventTime - pianoScoreAudioContext.currentTime) * 1000)));
    beat += scoreEvent.beats;
  });
  playback.timers.push(setTimeout(() => {
    if (activePianoScore === playback) stopPianoScoreBlocks();
  }, ((startTime - pianoScoreAudioContext.currentTime) + beat * secondsPerBeat + 0.2) * 1000));
}

function syncPianoScoreMidiInputs() {
  const inputs = pianoScoreMidiAccess ? [...pianoScoreMidiAccess.inputs.values()] : [];
  document.querySelectorAll('.piano-score-midi-input').forEach((select) => {
    const selected = pianoScoreMidiInputId;
    select.innerHTML = inputs.length
      ? inputs.map(input => `<option value="${escapeHtml(input.id)}">${escapeHtml(input.name || 'MIDI input')}</option>`).join('')
      : '<option value="">No MIDI inputs found</option>';
    select.disabled = inputs.length === 0;
    if (inputs.some(input => input.id === selected)) select.value = selected;
    else if (inputs[0]) select.value = inputs[0].id;
  });
}

function selectPianoScoreMidiInput(inputId) {
  if (pianoScoreMidiInput) pianoScoreMidiInput.onmidimessage = null;
  const inputs = pianoScoreMidiAccess ? [...pianoScoreMidiAccess.inputs.values()] : [];
  pianoScoreMidiInput = inputs.find(input => input.id === inputId) || inputs[0] || null;
  pianoScoreMidiInputId = pianoScoreMidiInput?.id || '';
  if (pianoScoreMidiInput) pianoScoreMidiInput.onmidimessage = handlePianoScoreMidiMessage;
  try { localStorage.setItem('piano-reading-trainer-midi-input', pianoScoreMidiInputId); } catch { /* Ignore storage failures. */ }
  syncPianoScoreMidiInputs();
}

async function preparePianoScoreMidi() {
  if (!navigator.requestMIDIAccess) throw new Error('Web MIDI is unavailable. Use Chrome or Edge on localhost or HTTPS.');
  if (!pianoScoreMidiAccess) {
    pianoScoreMidiAccess = await navigator.requestMIDIAccess();
    pianoScoreMidiAccess.addEventListener?.('statechange', () => {
      syncPianoScoreMidiInputs();
      if (!pianoScoreMidiAccess.inputs.has(pianoScoreMidiInputId)) selectPianoScoreMidiInput('');
    });
  }
  const inputs = [...pianoScoreMidiAccess.inputs.values()];
  if (!inputs.length) throw new Error('No MIDI input is available. Connect a keyboard and try again.');
  selectPianoScoreMidiInput(pianoScoreMidiInputId);
  return pianoScoreMidiInput;
}

function nextPianoScorePlayableEvent(score, fromIndex) {
  for (let index = fromIndex; index < score.events.length; index += 1) {
    if (score.events[index].notes.length) return index;
  }
  return -1;
}

function updatePianoScoreFollowPrompt(follow) {
  const scoreEvent = follow.block.pianoScore.events[follow.index];
  followPianoScoreElement(follow.block, follow.block.pianoScoreElements[follow.index]);
  setPianoScoreStatus(follow.block, `Play ${scoreEvent.notes.map(midiName).join(' + ')}`);
}

function handlePianoScoreMidiMessage(message) {
  const [status, note, velocity = 0] = message.data;
  const command = status & 0xf0;
  if (command === 0x80 || (command === 0x90 && velocity === 0)) {
    pianoScoreHeldNotes.delete(note);
    return;
  }
  if (command !== 0x90) return;
  pianoScoreHeldNotes.add(note);
  const follow = activePianoScore?.mode === 'follow' ? activePianoScore : null;
  if (!follow) return;
  const scoreEvent = follow.block.pianoScore.events[follow.index];
  const played = scoreEvent.notes.length === 1 ? [note] : [...pianoScoreHeldNotes];
  if (!samePitchSet(played, scoreEvent.notes)) {
    const elements = pianoScoreEventElements(follow.block.pianoScoreElements[follow.index]);
    elements.forEach(element => element.classList.add('piano-score-wrong'));
    setPianoScoreStatus(follow.block, `Try ${scoreEvent.notes.map(midiName).join(' + ')}`, true);
    clearTimeout(follow.wrongTimer);
    follow.wrongTimer = setTimeout(() => {
      elements.forEach(element => element.classList.remove('piano-score-wrong'));
      if (activePianoScore === follow) setPianoScoreStatus(follow.block, `Play ${scoreEvent.notes.map(midiName).join(' + ')}`);
    }, 350);
    return;
  }
  const next = nextPianoScorePlayableEvent(follow.block.pianoScore, follow.index + 1);
  if (next < 0) {
    clearPianoScoreHighlight(follow.block);
    setPianoScoreStatus(follow.block, 'Complete');
    activePianoScore = null;
    setPianoScoreButtons(follow.block);
    return;
  }
  follow.index = next;
  updatePianoScoreFollowPrompt(follow);
}

async function followPianoScoreBlock(block) {
  setPianoScoreButtons(block, 'connecting');
  await preparePianoScoreMidi();
  const index = nextPianoScorePlayableEvent(block.pianoScore, 0);
  if (index < 0) throw new Error('This score has no playable notes.');
  const follow = { block, mode: 'follow', index, timers: [], nodes: [] };
  activePianoScore = follow;
  pianoScoreHeldNotes.clear();
  setPianoScoreButtons(block, 'following');
  updatePianoScoreFollowPrompt(follow);
}

const drumRows = {
  cr: { key: 'a/5/X2' },
  wb: { key: 'g/5/X2' },
  rd: { key: 'g/5/X2' },
  hh: { key: 'f/5/X2' },
  ht: { key: 'e/5' },
  mt: { key: 'd/5' },
  sn: { key: 'c/5' },
  ft: { key: 'a/4' },
  bd: { key: 'f/4' },
  ph: { key: 'd/4/X2' }
};

function parseDrumToken(rawToken) {
  if (rawToken === '.') return { hit: false, visible: false, kind: '.', accent: false, ghost: false, tremolo: 0 };
  if (rawToken === '_') return { hit: true, visible: false, kind: 'x', accent: false, ghost: true, tremolo: 0 };
  if (rawToken === '~' || rawToken === '~>') {
    return { hit: true, visible: false, kind: 'x', accent: rawToken.endsWith('>'), ghost: false, tremolo: 0 };
  }
  let token = rawToken;
  let ghost = false;
  if (token.startsWith('(') && token.endsWith(')')) {
    ghost = true;
    token = token.slice(1, -1);
  }
  const accent = token.endsWith('>');
  if (accent) token = token.slice(0, -1);
  const tremoloMatch = token.match(/\/+$/);
  const tremolo = tremoloMatch ? tremoloMatch[0].length : 0;
  if (tremolo > 3) throw new Error(`Too many tremolo slashes in "${rawToken}". Use x/, x//, or x///.`);
  if (tremolo) token = token.slice(0, -tremolo);
  if (!['x', 'o', 'f', 'd'].includes(token)) {
    throw new Error(`Unknown drum hit "${rawToken}". Use x, o, x>, (x), x/, x//, x///, f, d, _, ~, ~>, or .`);
  }
  return { hit: true, visible: true, kind: token, accent, ghost, tremolo };
}

function parseDrumPattern(source) {
  const pattern = {
    meter: '4/4',
    division: 8,
    tempo: null,
    swing: 50,
    voices: 'auto',
    sticking: null,
    rows: {}
  };

  source.split('\n').forEach((line) => {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) return;

    const directive = trimmed.match(/^(tempo|meter|division|swing|voices)\s+(.+)$/i);
    if (directive) {
      const name = directive[1].toLowerCase();
      const value = directive[2].trim();
      pattern[name] = ['division', 'swing'].includes(name) ? Number(value) : value;
      return;
    }

    const row = trimmed.match(/^([a-z]+)\s*:\s*(.+)$/i);
    if (row) {
      const name = row[1].toLowerCase();
      if (name === 'stick') {
        pattern.sticking = row[2].replaceAll('|', ' ').trim().split(/\s+/);
        return;
      }
      if (!drumRows[name]) throw new Error(`Unknown drum row "${name}". Use cr, rd, hh, sn, ht, mt, ft, bd, ph, or wb.`);
      pattern.rows[name] = row[2].replaceAll('|', ' ').trim().split(/\s+/);
    }
  });

  const lengths = Object.values(pattern.rows).map((tokens) => tokens.length);
  if (!lengths.length) throw new Error('Add at least one drum row such as "hh: x x x x x x x x".');
  const steps = Math.max(...lengths);
  if (![8, 12, 16, 24].includes(pattern.division)) throw new Error('Drum division must be 8, 12, 16, or 24.');
  if (!Number.isFinite(pattern.swing) || pattern.swing < 50 || pattern.swing > 83.333) {
    throw new Error('Drum swing must be between 50 and 83.333 percent.');
  }
  pattern.voices = String(pattern.voices).toLowerCase();
  if (!['auto', 'single', 'split'].includes(pattern.voices)) throw new Error('Drum voices must be auto, single, or split.');
  if (steps % pattern.division !== 0) throw new Error(`Division ${pattern.division} expects a whole-bar multiple of ${pattern.division} slots.`);
  pattern.steps = steps;
  pattern.bars = steps / pattern.division;

  Object.keys(drumRows).forEach((name) => {
    pattern.rows[name] = pattern.rows[name] || Array.from({ length: steps }, () => '.');
    if (pattern.rows[name].length !== steps) throw new Error(`Drum row "${name}" must have ${steps} slots.`);
    pattern.rows[name].forEach(parseDrumToken);
  });

  pattern.sticking = pattern.sticking || Array.from({ length: steps }, () => '.');
  if (pattern.sticking.length !== steps) throw new Error(`The stick row must have ${steps} slots.`);
  pattern.sticking = pattern.sticking.map((token) => {
    const normalized = token.toUpperCase();
    if (!['R', 'L', 'RL', 'LR', '.'].includes(normalized)) {
      throw new Error(`Unknown sticking "${token}". Use R, L, RL, LR, or .`);
    }
    return normalized;
  });

  return pattern;
}

function drumVexDuration(pattern) {
  if (pattern.division === 12) return 8;
  if (pattern.division === 24) return 16;
  return drumDurationForSlots(pattern, 1) || pattern.division;
}

function drumTupletSpec(pattern) {
  if (pattern.division === 12) return { size: 3, notesOccupied: 2 };
  if (pattern.division === 24) return { size: 6, notesOccupied: 4 };
  return null;
}

function drumMeter(pattern) {
  const match = String(pattern.meter).match(/^(\d+)\/(\d+)$/);
  if (!match) return { beats: 4, value: 4 };
  return { beats: Number(match[1]), value: Number(match[2]) };
}

function drumVoiceOptions(pattern) {
  const meter = drumMeter(pattern);
  return { num_beats: meter.beats * (pattern.bars || 1), beat_value: meter.value };
}

function drumSlotsPerQuarter(pattern) {
  const meter = drumMeter(pattern);
  const quarterNotesPerBar = meter.beats * (4 / meter.value);
  const slots = pattern.division / quarterNotesPerBar;
  return Number.isInteger(slots) ? slots : null;
}

function drumStepDuration(pattern, tempo) {
  const meter = drumMeter(pattern);
  return (60 / tempo) * meter.beats * (4 / meter.value) / pattern.division;
}

function drumSwingRatio(block) {
  const percent = Number(block?.querySelector('.drum-swing')?.value) || 50;
  return Math.max(0.5, Math.min(5 / 6, percent / 100));
}

function drumSwungStepDuration(step, stepDuration, swingRatio) {
  return stepDuration * 2 * (step % 2 ? 1 - swingRatio : swingRatio);
}

function updateDrumSwingOutput(block) {
  const input = block?.querySelector('.drum-swing');
  const output = block?.querySelector('.drum-swing-output');
  if (!input || !output) return;
  const value = Number(input.value);
  const label = `${value.toFixed(1).replace(/\.0$/, '')}%`;
  const isTriplet = Math.abs(value - DRUM_TRIPLET_SWING_PERCENT) < 0.01;
  input.classList.toggle('is-triplet', isTriplet);
  input.setAttribute('aria-valuetext', isTriplet ? `${label}, triplet swing` : value === 50 ? `${label}, straight` : label);
  output.textContent = label;
}

function snapDrumSwingInput(input) {
  if (input !== activeDrumSwingSlider) return;
  if (Math.abs(Number(input.value) - DRUM_TRIPLET_SWING_PERCENT) <= DRUM_SWING_SNAP_THRESHOLD) {
    input.value = DRUM_TRIPLET_SWING_PERCENT.toFixed(3);
  }
}

const DRUM_VELOCITY_ROLES = ['ghost', 'normal', 'accent'];

function drumVelocityInputs(block) {
  return DRUM_VELOCITY_ROLES.map(role => block?.querySelector(`.drum-velocity[data-velocity-role="${role}"]`));
}

function drumVelocityProfile(block) {
  const inputs = drumVelocityInputs(block);
  return {
    ghost: Number(inputs[0]?.value) || 16,
    normal: Number(inputs[1]?.value) || 64,
    accent: Number(inputs[2]?.value) || 111
  };
}

function updateDrumVelocityControl(block) {
  const inputs = drumVelocityInputs(block);
  if (inputs.some(input => !input)) return;
  const values = inputs.map(input => Number(input.value));
  inputs.forEach((input, index) => {
    input.setAttribute('aria-valuetext', `${values[index]}, ${DRUM_VELOCITY_ROLES[index]} note`);
  });
  const output = block.querySelector('.drum-velocity-output');
  if (output) output.textContent = `G${values[0]} N${values[1]} A${values[2]}`;
}

function setDrumVelocityFromInput(input) {
  const block = input.closest('.drum-block');
  const inputs = drumVelocityInputs(block);
  const changedIndex = inputs.indexOf(input);
  if (changedIndex < 0 || inputs.some(candidate => !candidate)) return;
  const values = pushOrderedVelocities(inputs.map(candidate => Number(candidate.value)), changedIndex, Number(input.value));
  inputs.forEach((candidate, index) => { candidate.value = String(values[index]); });
  updateDrumVelocityControl(block);
}

function makeDrumRestNote(duration = 8, visible = false) {
  const Flow = window.Vex.Flow;
  const vexDuration = String(duration);
  if (!visible && typeof Flow.GhostNote === 'function') {
    const note = new Flow.GhostNote(vexDuration);
    note.isWikiGhostNote = true;
    note.isWikiVisibleRest = false;
    return note;
  }

  const rest = new Flow.StaveNote({ keys: ['b/4'], duration: `${vexDuration}r` });
  if (vexDuration.endsWith('d') && typeof Flow.Dot?.buildAndAttach === 'function') {
    Flow.Dot.buildAndAttach([rest], { all: true });
  }
  if (!visible) rest.setStyle?.({ fillStyle: 'transparent', strokeStyle: 'transparent' });
  rest.isWikiGhostNote = true;
  rest.isWikiVisibleRest = visible;
  return rest;
}

function makeDrumHiddenHitNote(pattern, index, rowNames, duration, stemDirection) {
  const Flow = window.Vex.Flow;
  const row = rowNames.find((name) => {
    const token = parseDrumToken(pattern.rows[name][index]);
    return token.hit && !token.visible;
  }) || 'sn';
  const note = new Flow.StaveNote({
    keys: [drumRows[row].key],
    duration: String(duration),
    stem_direction: stemDirection
  });
  note.setStyle?.({ fillStyle: 'transparent', strokeStyle: 'transparent' });
  note.isWikiGhostNote = true;
  note.isWikiHiddenPlaybackNote = true;
  return note;
}

function drumActiveRowsAt(pattern, index, rowNames = Object.keys(drumRows)) {
  return rowNames
    .filter((row) => {
      const token = parseDrumToken(pattern.rows[row][index]);
      return token.hit && token.visible;
    });
}

function drumStepIsSilent(pattern, index, rowNames = Object.keys(drumRows)) {
  return !drumActiveRowsAt(pattern, index, rowNames).length;
}

function drumStepHasHiddenHits(pattern, index, rowNames = Object.keys(drumRows)) {
  return rowNames.some((row) => {
    const token = parseDrumToken(pattern.rows[row][index]);
    return token.hit && !token.visible;
  });
}

function renderedDrumSticking(sticking, tokens) {
  if (['R', 'L'].includes(sticking)
    && tokens.some((token) => token.tremolo === 1)) {
    return `${sticking}${sticking}`;
  }
  return sticking;
}

function drumDurationForSlots(pattern, slots) {
  if (![1, 2, 4, 8, 16].includes(slots)) return null;
  const meter = drumMeter(pattern);
  const duration = (pattern.division * meter.value) / (meter.beats * slots);
  return Number.isInteger(duration) ? duration : null;
}

function makeDrumHit(rows, index, pattern, duration = drumVexDuration(pattern), stemDirection = window.Vex.Flow.StaveNote.STEM_UP) {
  const Flow = window.Vex.Flow;
  const keys = rows.map((row) => drumRows[row].key);
  const tokens = rows.map((row) => parseDrumToken(pattern.rows[row][index]));
  const note = new Flow.StaveNote({
    keys,
    duration: String(duration),
    stem_direction: stemDirection
  });
  note.isWikiGhostNote = false;
  note.wikiStep = index;
  if (String(duration).endsWith('d') && typeof Flow.Dot?.buildAndAttach === 'function') {
    Flow.Dot.buildAndAttach([note], { all: true });
  }

  rows.forEach((row, keyIndex) => {
    const token = tokens[keyIndex];
    if (token.ghost && typeof Flow.Parenthesis === 'function') {
      note.addModifier(new Flow.Parenthesis(Flow.Modifier.Position.LEFT), keyIndex);
      note.addModifier(new Flow.Parenthesis(Flow.Modifier.Position.RIGHT), keyIndex);
    }
  });

  const isAccented = tokens.some((token) => token.accent);
  if (isAccented && typeof Flow.Articulation === 'function') {
    const accent = new Flow.Articulation('a>')
      .setPosition(Flow.Modifier.Position.ABOVE);
    note.wikiAccent = accent;
    note.addModifier(accent, 0);
  }

  const tremolo = Math.max(...tokens.map((token) => token.tremolo));
  if (tremolo
    && typeof Flow.Tremolo === 'function') {
    note.addModifier(new Flow.Tremolo(tremolo), 0);
  }

  const graceRow = rows.find((row) => ['f', 'd'].includes(parseDrumToken(pattern.rows[row][index]).kind));
  if (graceRow && typeof Flow.GraceNote === 'function' && typeof Flow.GraceNoteGroup === 'function') {
    const kind = parseDrumToken(pattern.rows[graceRow][index]).kind;
    const graceSticking = oppositeDrumSticking(pattern.sticking[index]);
    const graceNotes = Array.from({ length: kind === 'd' ? 2 : 1 }, () => new Flow.GraceNote({
      keys: [drumRows[graceRow].key],
      duration: '16',
      slash: kind === 'f',
      stem_direction: stemDirection
    }));
    if (graceSticking !== '.' && typeof Flow.Annotation === 'function') {
      graceNotes.forEach((graceNote) => {
        const label = new Flow.Annotation(graceSticking)
          .setFont('Arial', 7, 'normal')
          .setVerticalJustification(Flow.Annotation.VerticalJustify.BOTTOM);
        graceNote.addModifier(label, 0);
      });
    }
    const graceGroup = new Flow.GraceNoteGroup(graceNotes, false);
    if (graceNotes.length > 1) graceGroup.beamNotes();
    note.addModifier(graceGroup, rows.indexOf(graceRow));
  }
  const sticking = pattern.sticking[index];
  if (sticking !== '.' && typeof Flow.Annotation === 'function') {
    const label = new Flow.Annotation(renderedDrumSticking(sticking, tokens))
      .setFont('Arial', 10, isAccented ? 'bold' : 'normal')
      .setVerticalJustification(Flow.Annotation.VerticalJustify.BOTTOM);
    note.addModifier(label, 0);
  }
  return note;
}

const drumSixteenthBeatSpellings = {
  '0000': [{ rest: true, step: 0, slots: 4, duration: '4' }],
  '0001': [{ rest: true, step: 0, slots: 3, duration: '8d' }, { step: 3, slots: 1, duration: '16' }],
  '0010': [{ rest: true, step: 0, slots: 2, duration: '8' }, { step: 2, slots: 2, duration: '8' }],
  '0011': [{ rest: true, step: 0, slots: 2, duration: '8' }, { step: 2, slots: 1, duration: '16' }, { step: 3, slots: 1, duration: '16' }],
  '0100': [{ rest: true, step: 0, slots: 1, duration: '16' }, { step: 1, slots: 3, duration: '8d' }],
  '0101': [{ rest: true, step: 0, slots: 1, duration: '16' }, { step: 1, slots: 2, duration: '8' }, { step: 3, slots: 1, duration: '16' }],
  '0110': [{ rest: true, step: 0, slots: 1, duration: '16' }, { step: 1, slots: 1, duration: '16' }, { step: 2, slots: 2, duration: '8' }],
  '0111': [{ rest: true, step: 0, slots: 1, duration: '16' }, { step: 1, slots: 1, duration: '16' }, { step: 2, slots: 1, duration: '16' }, { step: 3, slots: 1, duration: '16' }],
  '1000': [{ step: 0, slots: 4, duration: '4' }],
  '1001': [{ step: 0, slots: 3, duration: '8d' }, { step: 3, slots: 1, duration: '16' }],
  '1010': [{ step: 0, slots: 2, duration: '8' }, { step: 2, slots: 2, duration: '8' }],
  '1011': [{ step: 0, slots: 2, duration: '8' }, { step: 2, slots: 1, duration: '16' }, { step: 3, slots: 1, duration: '16' }],
  '1100': [{ step: 0, slots: 1, duration: '16' }, { step: 1, slots: 1, duration: '16' }, { rest: true, step: 2, slots: 2, duration: '8' }],
  '1101': [{ step: 0, slots: 1, duration: '16' }, { step: 1, slots: 2, duration: '8' }, { step: 3, slots: 1, duration: '16' }],
  '1110': [{ step: 0, slots: 1, duration: '16' }, { step: 1, slots: 1, duration: '16' }, { step: 2, slots: 2, duration: '8' }],
  '1111': [{ step: 0, slots: 1, duration: '16' }, { step: 1, slots: 1, duration: '16' }, { step: 2, slots: 1, duration: '16' }, { step: 3, slots: 1, duration: '16' }]
};

const drumHiddenTripletSpellings = {
  '000': { tuplet: false, events: [{ rest: true, step: 0, slots: 3, duration: '4' }] },
  '001': { tuplet: true, events: [{ rest: true, step: 0, slots: 2, duration: '4' }, { step: 2, slots: 1, duration: '8' }] },
  '010': { tuplet: true, events: [{ rest: true, step: 0, slots: 1, duration: '8' }, { step: 1, slots: 2, duration: '4' }] },
  '011': { tuplet: true, events: [{ rest: true, step: 0, slots: 1, duration: '8' }, { step: 1, slots: 1, duration: '8' }, { step: 2, slots: 1, duration: '8' }] },
  '100': { tuplet: false, events: [{ step: 0, slots: 3, duration: '4' }] },
  '101': { tuplet: true, events: [{ step: 0, slots: 2, duration: '4' }, { step: 2, slots: 1, duration: '8' }] },
  '110': { tuplet: true, events: [{ step: 0, slots: 1, duration: '8' }, { step: 1, slots: 1, duration: '8' }, { rest: true, step: 2, slots: 1, duration: '8' }] },
  '111': { tuplet: true, events: [{ step: 0, slots: 1, duration: '8' }, { step: 1, slots: 1, duration: '8' }, { step: 2, slots: 1, duration: '8' }] }
};

function usesCanonicalDrumSixteenths(pattern) {
  const meter = drumMeter(pattern);
  return pattern.division === 16 && meter.beats === 4 && meter.value === 4;
}

function makeCanonicalDrumSixteenthVoice(pattern, rowNames = Object.keys(drumRows), stemDirection = window.Vex.Flow.StaveNote.STEM_UP) {
  const Flow = window.Vex.Flow;
  const notes = [];

  for (let groupStart = 0; groupStart < pattern.steps; groupStart += 4) {
    const mask = Array.from({ length: 4 }, (_, offset) => Number(!drumStepIsSilent(pattern, groupStart + offset, rowNames))).join('');
    drumSixteenthBeatSpellings[mask].forEach((event) => {
      const step = groupStart + event.step;
      const note = event.rest
        ? makeDrumRestNote(event.duration, true)
        : makeDrumHit(drumActiveRowsAt(pattern, step, rowNames), step, pattern, event.duration, stemDirection);
      note.wikiStep = step;
      note.wikiConsumedSlots = event.slots;
      if (!event.rest) note.wikiBeamGroup = groupStart;
      notes.push(note);
    });
  }

  const voice = new Flow.Voice(drumVoiceOptions(pattern));
  voice.addTickables(notes);
  return { voice, notes, tuplets: [] };
}

function makeHiddenTripletGroup(pattern, groupStart, rowNames, stemDirection) {
  const Flow = window.Vex.Flow;
  const mask = Array.from({ length: 3 }, (_, offset) => Number(!drumStepIsSilent(pattern, groupStart + offset, rowNames))).join('');
  const spelling = drumHiddenTripletSpellings[mask];
  const groupNotes = spelling.events.map((event) => {
    const step = groupStart + event.step;
    const note = event.rest
      ? makeDrumRestNote(event.duration, true)
      : makeDrumHit(drumActiveRowsAt(pattern, step, rowNames), step, pattern, event.duration, stemDirection);
    note.wikiStep = step;
    note.wikiConsumedSlots = event.slots;
    note.wikiTupletGroup = groupStart;
    if (event.duration === '4') note.wikiCollapsedToBeat = true;
    return note;
  });
  const tuplet = spelling.tuplet && typeof Flow.Tuplet === 'function'
    ? new Flow.Tuplet(groupNotes, {
      num_notes: 3,
      notes_occupied: 2,
      bracketed: true,
      ratioed: false
    })
    : null;
  if (tuplet) {
    tuplet.isWikiVisible = true;
    // VexFlow brackets tuplets from the first event position to the last
    // event's onset. For B-A-B, the final engraved quarter note occupies the
    // middle and final triplet slots, so its duration must extend the bracket.
    tuplet.wikiExtendThroughLastDuration = mask === '010';
    tuplet.wikiSpellingNotes = groupNotes;
  }
  return { notes: groupNotes, tuplet };
}

function makeDrumVoice(pattern, rowNames = Object.keys(drumRows), stemDirection = window.Vex.Flow.StaveNote.STEM_UP) {
  const Flow = window.Vex.Flow;
  const duration = drumVexDuration(pattern);
  const tupletSpec = drumTupletSpec(pattern);

  if (usesCanonicalDrumSixteenths(pattern)) {
    return makeCanonicalDrumSixteenthVoice(pattern, rowNames, stemDirection);
  }

  if (tupletSpec) {
    const notes = [];
    const tuplets = [];

    for (let groupStart = 0; groupStart < pattern.steps; groupStart += tupletSpec.size) {
      const groupSteps = Array.from({ length: tupletSpec.size }, (_, offset) => groupStart + offset);
      if (tupletSpec.size === 3 && groupSteps.some((step) => drumStepHasHiddenHits(pattern, step, rowNames))) {
        const hiddenGroup = makeHiddenTripletGroup(pattern, groupStart, rowNames, stemDirection);
        notes.push(...hiddenGroup.notes);
        if (hiddenGroup.tuplet) tuplets.push(hiddenGroup.tuplet);
        continue;
      }
      const activeSteps = groupSteps.filter((step) => !drumStepIsSilent(pattern, step, rowNames));
      const shouldCollapseToBeat = activeSteps.length === 1
        && activeSteps[0] === groupStart
        && groupSteps.slice(1).every((step) => (
          drumStepIsSilent(pattern, step, rowNames)
          && !drumStepHasHiddenHits(pattern, step, rowNames)
        ));

      if (shouldCollapseToBeat) {
        const note = makeDrumHit(drumActiveRowsAt(pattern, groupStart, rowNames), groupStart, pattern, 4, stemDirection);
        note.wikiCollapsedToBeat = true;
        note.wikiConsumedSlots = tupletSpec.size;
        notes.push(note);
        continue;
      }

      if (!activeSteps.length) {
        const rest = makeDrumRestNote(4, false);
        rest.wikiStep = groupStart;
        notes.push(rest);
        continue;
      }

      const groupNotes = groupSteps.map((index) => {
        const activeRows = drumActiveRowsAt(pattern, index, rowNames);
        const hiddenHit = drumStepHasHiddenHits(pattern, index, rowNames);
        const note = activeRows.length
          ? makeDrumHit(activeRows, index, pattern, duration, stemDirection)
          : hiddenHit
            ? makeDrumHiddenHitNote(pattern, index, rowNames, duration, stemDirection)
            : makeDrumRestNote(duration, true);
        note.wikiStep = index;
        note.wikiTupletGroup = groupStart;
        return note;
      });
      notes.push(...groupNotes);

      if (typeof Flow.Tuplet === 'function') {
        const tuplet = new Flow.Tuplet(groupNotes, {
          num_notes: tupletSpec.size,
          notes_occupied: tupletSpec.notesOccupied,
          bracketed: true,
          ratioed: false
        });
        tuplet.isWikiVisible = groupNotes.filter((note) => !note.isWikiGhostNote).length > 1
          || groupSteps.some((step) => drumStepHasHiddenHits(pattern, step, rowNames));
        tuplets.push(tuplet);
      }
    }

    const voice = new Flow.Voice(drumVoiceOptions(pattern));
    voice.addTickables(notes);
    return { voice, notes, tuplets };
  }

  const notes = [];
  const quarterSlots = drumSlotsPerQuarter(pattern);
  for (let index = 0; index < pattern.steps; index += 1) {
    const step = index;
    const activeRows = drumActiveRowsAt(pattern, index, rowNames);
    let note;
    if (activeRows.length) {
      let availableSlots = 1;
      const groupEnd = quarterSlots
        ? Math.min(pattern.steps, index + quarterSlots - (index % quarterSlots))
        : pattern.steps;
      while (
        index + availableSlots < groupEnd
        && drumStepIsSilent(pattern, index + availableSlots, rowNames)
      ) {
        availableSlots += 1;
      }
      let consumedSlots = 1;
      for (let candidateSlots = 2; candidateSlots <= availableSlots; candidateSlots += 1) {
        if (drumDurationForSlots(pattern, candidateSlots)) consumedSlots = candidateSlots;
      }
      const collapsedDuration = drumDurationForSlots(pattern, consumedSlots) || duration;
      note = makeDrumHit(activeRows, index, pattern, collapsedDuration, stemDirection);
      note.wikiConsumedSlots = consumedSlots;
      if (consumedSlots > 1 && collapsedDuration < 8) note.wikiCollapsedToBeat = true;
      if (quarterSlots) note.wikiBeamGroup = Math.floor(step / quarterSlots);
      index += consumedSlots - 1;
    } else {
      note = makeDrumRestNote(duration, false);
    }
    note.wikiStep = step;
    notes.push(note);
  }

  const voice = new Flow.Voice(drumVoiceOptions(pattern));
  voice.addTickables(notes);
  return { voice, notes, tuplets: [] };
}

const drumUpperVoiceRows = ['cr', 'rd', 'hh', 'wb'];
const drumLowerVoiceRows = ['ht', 'mt', 'sn', 'ft', 'bd', 'ph'];

function drumRowsContainHits(pattern, rowNames) {
  return rowNames.some((row) => pattern.rows[row].some((token) => parseDrumToken(token).hit));
}

function hasSteadyDrumTimekeeping(pattern) {
  const quarterSlots = drumSlotsPerQuarter(pattern);
  return ['hh', 'rd'].some((row) => {
    const hits = pattern.rows[row].map((token) => parseDrumToken(token).hit);
    if (hits.filter(Boolean).length < pattern.steps / 2) return false;
    if (!quarterSlots) return true;
    for (let start = 0; start < pattern.steps; start += quarterSlots) {
      if (!hits.slice(start, start + quarterSlots).some(Boolean)) return false;
    }
    return true;
  });
}

function shouldSplitDrumVoices(pattern) {
  if (pattern.voices === 'single') return false;
  if (!drumRowsContainHits(pattern, drumUpperVoiceRows)
    || !drumRowsContainHits(pattern, drumLowerVoiceRows)) return false;
  return pattern.voices === 'split' || hasSteadyDrumTimekeeping(pattern);
}

function makeDrumVoiceParts(pattern) {
  const Flow = window.Vex.Flow;
  if (!shouldSplitDrumVoices(pattern)) {
    return [makeDrumVoice(pattern)];
  }
  return [
    makeDrumVoice(pattern, drumUpperVoiceRows, Flow.StaveNote.STEM_UP),
    makeDrumVoice(pattern, drumLowerVoiceRows, Flow.StaveNote.STEM_DOWN)
  ];
}

function makeDrumBeams(notes, pattern) {
  const Flow = window.Vex.Flow;
  if (typeof Flow.Beam !== 'function') return [];

  const beams = [];
  let run = [];
  let runGroup = null;
  notes.forEach((note) => {
    if (note.isWikiGhostNote || note.wikiCollapsedToBeat) {
      if (run.length > 1) beams.push(new Flow.Beam(run));
      run = [];
      runGroup = null;
      return;
    }

    const noteGroup = note.wikiTupletGroup ?? note.wikiBeamGroup ?? null;
    if (run.length && noteGroup !== runGroup) {
      if (run.length > 1) beams.push(new Flow.Beam(run));
      run = [];
    }

    run.push(note);
    runGroup = noteGroup;
  });
  if (run.length > 1) beams.push(new Flow.Beam(run));

  return beams;
}

function addDrumStepElement(stepElements, step, element) {
  if (!element || stepElements[step].includes(element)) return;
  stepElements[step].push(element);
}

function renderedDrumStems(target) {
  return Array.from(target.querySelectorAll('.vf-stem')).map((stemGroup) => {
    const path = stemGroup.querySelector('path');
    const coordinates = path?.getAttribute('d')?.match(/-?\d+(?:\.\d+)?/g)?.map(Number) || [];
    return {
      element: stemGroup,
      x: coordinates[0],
      direction: coordinates.length >= 4
        ? (coordinates[3] < coordinates[1] ? window.Vex.Flow.StaveNote.STEM_UP : window.Vex.Flow.StaveNote.STEM_DOWN)
        : null
    };
  }).filter((stem) => Number.isFinite(stem.x));
}

function renderedStemForNote(stems, note) {
  if (typeof note.getStemX !== 'function') return null;

  const stemX = note.getStemX();
  if (!Number.isFinite(stemX)) return null;
  const stemDirection = note.getStemDirection?.();

  return stems.find((stem) => (
    Math.abs(stem.x - stemX) < 0.75
    && (!Number.isFinite(stemDirection) || stem.direction === stemDirection)
  ))?.element || null;
}

function setDrumRepeatBarlines(stave, Flow) {
  const repeatBegin = Flow.Barline?.type?.REPEAT_BEGIN;
  const repeatEnd = Flow.Barline?.type?.REPEAT_END;
  if (repeatBegin && typeof stave.setBegBarType === 'function') stave.setBegBarType(repeatBegin);
  if (repeatEnd && typeof stave.setEndBarType === 'function') stave.setEndBarType(repeatEnd);
}

function drumBeamTopAtX(element, x, fallbackBox) {
  const pathData = element.querySelector('path')?.getAttribute('d') || '';
  const coordinates = pathData.match(/-?\d+(?:\.\d+)?/g)?.map(Number) || [];
  if (coordinates.length < 8) return fallbackBox.y;

  const leftX = coordinates[0];
  const leftTop = Math.min(coordinates[1], coordinates[3]);
  const rightX = coordinates[4];
  const rightTop = Math.min(coordinates[5], coordinates[7]);
  if (rightX === leftX) return Math.min(leftTop, rightTop);
  const ratio = Math.max(0, Math.min(1, (x - leftX) / (rightX - leftX)));
  return leftTop + ((rightTop - leftTop) * ratio);
}

function positionDrumAccents(target, notes) {
  const beamBoxes = Array.from(target.querySelectorAll('.vf-beam')).map((element) => ({
    element,
    box: element.getBBox()
  }));
  if (!beamBoxes.length) return;

  notes.forEach((note) => {
    if (!note.wikiAccent) return;
    const noteGroup = note.getSVGElement?.();
    const firstNotehead = noteGroup?.querySelector('.vf-notehead');
    const noteheadPaths = firstNotehead
      ? Array.from(firstNotehead.children).filter(
        (child) => child.tagName.toLowerCase() === 'path'
      )
      : [];
    // VexFlow 4.2.2 draws an Articulation into the first notehead group but
    // does not retain an SVG element on the Articulation object. The notehead
    // glyph is the first path and the accent glyph is the second. Flam grace
    // notes may append their slash as a later path in this same outer group.
    const accentElement = noteheadPaths.length > 1 ? noteheadPaths[1] : null;
    if (!accentElement) return;
    const accentBox = accentElement.getBBox();
    const overlappingBeams = beamBoxes.filter(({ box }) => (
      accentBox.x + accentBox.width >= box.x
      && accentBox.x <= box.x + box.width
    ));
    if (!overlappingBeams.length) return;

    const accentCenterX = accentBox.x + (accentBox.width / 2);
    const beamTop = Math.min(...overlappingBeams.map(({ element, box }) => (
      drumBeamTopAtX(element, accentCenterX, box)
    )));
    const desiredAccentBottom = beamTop - 6;
    const shift = Math.min(0, desiredAccentBottom - (accentBox.y + accentBox.height));
    accentElement.classList.add('drum-accent');
    accentElement.dataset.drumAccentShift = String(shift);
    if (shift) {
      const existingTransform = accentElement.getAttribute('transform');
      accentElement.setAttribute(
        'transform',
        `${existingTransform ? `${existingTransform} ` : ''}translate(0 ${shift})`
      );
    }
  });
}

function extendHiddenTripletBracket(group, tuplet) {
  if (!group || !tuplet.wikiExtendThroughLastDuration) return;
  const [firstNote, lastNote] = tuplet.wikiSpellingNotes || [];
  const firstX = Number(firstNote?.getAbsoluteX?.());
  const lastX = Number(lastNote?.getAbsoluteX?.());
  // A full onset-to-onset extension reaches into the following beat because
  // VexFlow also pads each bracket beyond its outer events. Half that spacing
  // gives the sustained quarter note a clear visual tail without crowding the
  // next triplet bracket.
  const extension = (lastX - firstX) / 2;
  if (!Number.isFinite(extension) || extension <= 0) return;

  const rects = Array.from(group.children).filter((element) => element.tagName === 'rect');
  const glyph = Array.from(group.children).find((element) => element.tagName === 'path');
  if (rects.length < 4) return;

  const [leftRule, rightRule, , rightHook] = rects;
  const halfExtension = extension / 2;
  const values = [
    Number(leftRule.getAttribute('width')),
    Number(rightRule.getAttribute('x')),
    Number(rightRule.getAttribute('width')),
    Number(rightHook.getAttribute('x'))
  ];
  if (!values.every(Number.isFinite)) return;

  leftRule.setAttribute('width', String(values[0] + halfExtension));
  rightRule.setAttribute('x', String(values[1] + halfExtension));
  rightRule.setAttribute('width', String(values[2] + halfExtension));
  rightHook.setAttribute('x', String(values[3] + extension));
  if (glyph) {
    const existingTransform = glyph.getAttribute('transform');
    glyph.setAttribute(
      'transform',
      `${existingTransform ? `${existingTransform} ` : ''}translate(${halfExtension} 0)`
    );
  }
  group.classList.add('drum-tuplet-duration-extended');
}

function renderDrumNotation(target, pattern) {
  const Flow = window.Vex.Flow;
  target.innerHTML = '';

  const minWidth = pattern.steps > 8 ? 820 : 620;
  const width = Math.max(target.clientWidth || minWidth, minWidth);
  const height = 175;
  const renderer = new Flow.Renderer(target, Flow.Renderer.Backends.SVG);
  renderer.resize(width, height);

  const context = renderer.getContext();
  context.setFont('Arial', 10);

  const stave = new Flow.Stave(16, 28, width - 32);
  setDrumRepeatBarlines(stave, Flow);
  stave.addClef('percussion').addTimeSignature(pattern.meter);
  stave.setContext(context).draw();

  const drumParts = makeDrumVoiceParts(pattern);
  const voices = drumParts.map((part) => part.voice);
  const notes = drumParts.flatMap((part) => part.notes);
  const beams = drumParts.flatMap((part) => makeDrumBeams(part.notes, pattern));
  new Flow.Formatter()
    .joinVoices(voices)
    .format(voices, width - 150);

  voices.forEach((voice) => voice.draw(context, stave));
  beams.forEach((beam) => beam.setContext(context).draw());
  positionDrumAccents(target, notes);
  drumParts.flatMap((part) => part.tuplets).filter((tuplet) => tuplet.isWikiVisible).forEach((tuplet) => {
    const groupCount = target.querySelectorAll('.vf-tuplet').length;
    const openedGroup = typeof context.openGroup === 'function' ? context.openGroup('tuplet') : null;
    tuplet.setContext(context).draw();
    if (typeof context.closeGroup === 'function') context.closeGroup();
    const renderedGroup = target.querySelectorAll('.vf-tuplet')[groupCount] || openedGroup;
    extendHiddenTripletBracket(renderedGroup, tuplet);
  });

  const stepElements = Array.from({ length: pattern.steps }, () => []);
  const stems = renderedDrumStems(target);
  notes.forEach((note) => {
    if (note.isWikiHiddenPlaybackNote) {
      note.getSVGElement?.()?.classList.add('drum-hidden-playback-note');
      return;
    }
    if (note.isWikiGhostNote && !note.isWikiVisibleRest) return;
    const step = note.wikiStep;
    if (!Number.isInteger(step)) return;
    const coveredSteps = Array.from(
      { length: Math.max(1, Number(note.wikiConsumedSlots) || 1) },
      (_, offset) => step + offset
    ).filter((coveredStep) => coveredStep < stepElements.length);
    const group = note.getSVGElement?.();
    if (!group) return;
    group.classList.add('drum-step');
    group.dataset.drumStep = String(step);

    if (parseDrumToken(pattern.rows.hh[step]).kind === 'o') {
      const hiHatHead = group.querySelector('.vf-notehead');
      if (hiHatHead) {
        const box = hiHatHead.getBBox();
        const marker = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
        marker.setAttribute('class', 'drum-open-hat');
        marker.setAttribute('cx', String(box.x + (box.width / 2)));
        marker.setAttribute('cy', String(box.y - 5.5));
        marker.setAttribute('r', '3.2');
        group.append(marker);
      }
    }
    coveredSteps.forEach((coveredStep) => addDrumStepElement(stepElements, coveredStep, group));
    group.querySelectorAll('.vf-stavenote .vf-stem, .vf-stavenote path[fill="none"], :scope > path[fill="none"]').forEach((element) => {
      element.classList.add('drum-step-grace');
      element.dataset.drumStep = String(step);
      coveredSteps.forEach((coveredStep) => addDrumStepElement(stepElements, coveredStep, element));
    });
    const stem = renderedStemForNote(stems, note);
    if (stem) {
      stem.classList.add('drum-step-stem');
      stem.dataset.drumStep = String(step);
      coveredSteps.forEach((coveredStep) => addDrumStepElement(stepElements, coveredStep, stem));
    }
  });

  target.closest('.drum-block').drumStepElements = stepElements;
}

function renderDrumBlocks() {
  document.querySelectorAll('.drum-block').forEach((block) => {
    const target = block.querySelector('.drum-render');
    const source = decodeURIComponent(block.dataset.drumSource || '');

    if (!window.Vex?.Flow) {
      target.innerHTML = '<p class="drum-error">Could not load the drum notation renderer. Open Source below to read the drum pattern.</p>';
      return;
    }

    try {
      renderDrumNotation(target, parseDrumPattern(source));
    } catch (error) {
      console.error(error);
      target.innerHTML = `<p class="drum-error">${escapeHtml(error.message || 'Could not render this drum pattern.')}</p>`;
    }
  });
  syncDrumMidiControls();
  syncDrumSampleKitControls();
  document.querySelectorAll('.drum-block').forEach(updateDrumSwingOutput);
  document.querySelectorAll('.drum-block').forEach(updateDrumVelocityControl);
}

function drumKitLabel(definition) {
  return [definition.drum.manufacturer, definition.drum.model, definition.name !== 'center' ? definition.name : '']
    .filter(Boolean)
    .join(' ');
}

function saveDrumSampleKitPreference() {
  try {
    localStorage.setItem('personal-wiki-drum-snare-kit', wikiSnareKitId);
  } catch {
    // The selected kit remains session-only when browser storage is unavailable.
  }
}

async function syncDrumSampleKitControls() {
  const selects = [...document.querySelectorAll('.drum-kit-select')];
  if (!selects.length) return;
  try {
    const definitions = await wikiDrumSampleLibrary.listKits({ midiNote: 38 });
    if (!definitions.some(definition => definition.kit_id === wikiSnareKitId)) {
      wikiSnareKitId = definitions.some(definition => definition.kit_id === DEFAULT_WIKI_SNARE_KIT_ID)
        ? DEFAULT_WIKI_SNARE_KIT_ID
        : definitions[0]?.kit_id || '';
      saveDrumSampleKitPreference();
    }
    selects.forEach(select => {
      select.replaceChildren(...definitions.map(definition => new Option(drumKitLabel(definition), definition.kit_id)));
      select.value = wikiSnareKitId;
      select.disabled = definitions.length === 0;
    });
  } catch (error) {
    console.warn('Could not populate drum sample kits.', error);
    selects.forEach(select => {
      select.replaceChildren(new Option('Samples unavailable', ''));
      select.disabled = true;
    });
  }
}

function saveDrumMidiPreferences() {
  try {
    localStorage.setItem('personal-wiki-drum-midi-enabled', String(drumMidiEnabled));
    localStorage.setItem('personal-wiki-drum-midi-output', drumMidiOutputId);
  } catch {
    // MIDI preferences remain session-only when browser storage is unavailable.
  }
}

function setDrumMidiStatus(message = '') {
  document.querySelectorAll('.drum-midi-status').forEach((status) => {
    status.textContent = message;
  });
}

function availableDrumMidiOutputs() {
  return drumMidiAccess ? [...drumMidiAccess.outputs.values()].filter((output) => output.state !== 'disconnected') : [];
}

function syncDrumMidiControls() {
  const outputs = availableDrumMidiOutputs();
  if (outputs.length && !outputs.some((output) => output.id === drumMidiOutputId)) {
    drumMidiOutputId = outputs[0].id;
    saveDrumMidiPreferences();
  }

  document.querySelectorAll('.drum-block').forEach((block) => {
    const enabled = block.querySelector('.drum-midi-enabled');
    const select = block.querySelector('.drum-midi-output');
    if (!enabled || !select) return;
    enabled.checked = drumMidiEnabled;
    select.replaceChildren();

    if (!drumMidiEnabled) {
      select.append(new Option('MIDI off', ''));
      select.disabled = true;
      return;
    }
    if (!drumMidiAccess) {
      select.append(new Option('Connect on Play', ''));
      select.disabled = true;
      return;
    }
    if (!outputs.length) {
      select.append(new Option('No MIDI outputs', ''));
      select.disabled = true;
      return;
    }

    outputs.forEach((output) => select.append(new Option(output.name || 'MIDI output', output.id)));
    select.value = drumMidiOutputId;
    select.disabled = false;
  });
}

async function prepareDrumMidi() {
  if (!navigator.requestMIDIAccess) throw new Error('This browser does not support Web MIDI.');
  if (!drumMidiAccess) {
    drumMidiAccess = await navigator.requestMIDIAccess();
    drumMidiAccess.addEventListener?.('statechange', syncDrumMidiControls);
  }
  syncDrumMidiControls();
  const output = availableDrumMidiOutputs().find((candidate) => candidate.id === drumMidiOutputId);
  if (!output) throw new Error('No MIDI output is available. Connect or enable a MIDI device, then retry.');
  setDrumMidiStatus();
  return output;
}

function renderCubeBlocks() {
  document.querySelectorAll('.cube-block').forEach((block) => {
    const target = block.querySelector('.cube-render');
    const source = decodeURIComponent(block.dataset.cubeSource || '');
    try {
      if (!window.CubeNotation?.renderCmll) throw new Error('The cube renderer did not load.');
      const options = parseFenceOptions(decodeURIComponent(block.dataset.cubeOptions || ''));
      const allowed = new Set(['edges', 'center', 'auf', 'rotation']);
      Object.keys(options).forEach((key) => {
        if (!allowed.has(key)) throw new Error(`Unknown CMLL option "${key}".`);
      });
      ['edges', 'center'].forEach((key) => {
        if (options[key] && !['show', 'hide'].includes(options[key])) {
          throw new Error(`${key} must be show or hide.`);
        }
      });
      target.innerHTML = window.CubeNotation.renderCmll(source, options);
    } catch (error) {
      console.error(error);
      target.innerHTML = `<p class="cube-error">${escapeHtml(error.message || 'Could not render this cube algorithm.')}</p>`;
    }
  });
}

function setDrumButton(block, state = 'play') {
  const button = block.querySelector('.drum-toggle');
  block.dataset.playing = state === 'playing' ? 'true' : 'false';
  block.dataset.loading = state === 'loading' ? 'true' : 'false';
  button.dataset.state = state === 'play' ? '' : state;
  button.disabled = state === 'loading';

  if (state === 'playing') {
    button.textContent = '■ Stop';
    button.setAttribute('aria-label', 'Stop drum playback');
  } else if (state === 'loading') {
    button.textContent = 'Loading…';
    button.setAttribute('aria-label', 'Loading drum samples');
  } else if (state === 'error') {
    button.textContent = 'Error — retry';
    button.setAttribute('aria-label', 'Drum playback failed; retry');
  } else {
    button.textContent = '▶ Play';
    button.setAttribute('aria-label', 'Play this drum notation');
  }
}

function prepareDrumButton(block, showLoading = false) {
  const button = block.querySelector('.drum-toggle');
  block.dataset.playing = 'false';
  block.dataset.loading = 'true';
  button.disabled = true;
  if (showLoading) {
    button.dataset.state = 'loading';
    button.textContent = 'Loading…';
    button.setAttribute('aria-label', 'Loading drum samples');
  }
}

function stopDrumBlocks() {
  if (activeDrumStopTimer) clearTimeout(activeDrumStopTimer);
  activeDrumStopTimer = null;
  if (activeDrumMidiTimer) clearTimeout(activeDrumMidiTimer);
  activeDrumMidiTimer = null;
  activeDrumHighlightTimers.forEach(clearTimeout);
  activeDrumHighlightTimers = [];
  activeDrumNodes.forEach((node) => {
    try { node.stop(); } catch { /* The source may have already ended. */ }
  });
  activeDrumNodes = [];
  document.querySelectorAll('.drum-current-note').forEach((element) => {
    element.classList.remove('drum-current-note');
  });
  let midiHandoffGap = 0;
  document.querySelectorAll('.drum-block').forEach((block) => {
    if (block.drumVelocityPrepareTimer) clearTimeout(block.drumVelocityPrepareTimer);
    block.drumVelocityPrepareTimer = null;
    block.drumVelocityPendingProfile = null;
    block.drumVelocityPrepareVersion = (block.drumVelocityPrepareVersion || 0) + 1;
    block.drumActiveVelocityProfile = null;
    if (block.drumMidiOutput) {
      const handoffGap = Math.max(DRUM_MIDI_MIN_SWITCH_GAP_MS, block.drumMidiTailMs || 0);
      midiHandoffGap = Math.max(midiHandoffGap, handoffGap);
      try {
        const now = performance.now();
        block.drumMidiOutput.clear?.();
        block.drumMidiOutput.send([0xB9, 120, 0]);
        block.drumMidiOutput.send([0xB9, 123, 0]);
        block.drumMidiOutput.send([0xB9, 120, 0], now + handoffGap - 20);
        block.drumMidiOutput.send([0xB9, 123, 0], now + handoffGap - 20);
      } catch {
        // The output may have disconnected while playback was active.
      }
      block.drumMidiOutput = null;
    }
    setDrumButton(block);
  });
  if (midiHandoffGap) drumMidiStartNotBefore = performance.now() + midiHandoffGap;
}

function trackDrumNode(node) {
  activeDrumNodes.push(node);
  node.addEventListener?.('ended', () => {
    activeDrumNodes = activeDrumNodes.filter((activeNode) => activeNode !== node);
  }, { once: true });
}

function drumPanForSticking(sticking) {
  // Keep the hands distinguishable without making one snare sound like two
  // instruments placed at opposite sides of the listener.
  if (sticking === 'R') return 0.22;
  if (sticking === 'L') return -0.22;
  return 0;
}

function oppositeDrumSticking(sticking) {
  if (sticking === 'R') return 'L';
  if (sticking === 'L') return 'R';
  return '.';
}

function connectDrumOutput(context, node, pan = 0) {
  if (pan && typeof context.createStereoPanner === 'function') {
    const panner = context.createStereoPanner();
    panner.pan.setValueAtTime(Math.max(-1, Math.min(1, pan)), context.currentTime);
    node.connect(panner).connect(context.destination);
    return;
  }
  node.connect(context.destination);
}

function highlightDrumStep(block, step) {
  block.querySelectorAll('.drum-current-note').forEach((element) => {
    element.classList.remove('drum-current-note');
  });
  block.querySelectorAll(`.drum-step-stem[data-drum-step="${step}"]`).forEach((element) => {
    element.classList.add('drum-current-note');
  });
  block.querySelectorAll(`.drum-step-grace[data-drum-step="${step}"]`).forEach((element) => {
    element.classList.add('drum-current-note');
    element.querySelectorAll?.('path').forEach((path) => {
      path.classList.add('drum-current-note');
    });
  });
  block.drumStepElements?.[step]?.forEach((element) => {
    element.classList.add('drum-current-note');
    if (element.classList.contains('drum-step-grace')) {
      element.querySelectorAll?.('path').forEach((path) => {
        path.classList.add('drum-current-note');
      });
    }
  });
}

function drumNoise(context, time, duration, filterFrequency, volume, pan = 0) {
  const frameCount = Math.ceil(context.sampleRate * duration);
  const buffer = context.createBuffer(1, frameCount, context.sampleRate);
  const data = buffer.getChannelData(0);
  for (let index = 0; index < frameCount; index += 1) data[index] = (Math.random() * 2) - 1;

  const source = context.createBufferSource();
  const filter = context.createBiquadFilter();
  const gain = context.createGain();
  source.buffer = buffer;
  filter.type = 'highpass';
  filter.frequency.value = filterFrequency;
  gain.gain.setValueAtTime(volume, time);
  gain.gain.exponentialRampToValueAtTime(0.001, time + duration);
  source.connect(filter).connect(gain);
  connectDrumOutput(context, gain, pan);
  source.start(time);
  source.stop(time + duration);
  trackDrumNode(source);
}

function drumTone(context, time, frequency, duration, volume, type = 'sine', endFrequency = frequency, pan = 0) {
  const oscillator = context.createOscillator();
  const gain = context.createGain();
  oscillator.type = type;
  oscillator.frequency.setValueAtTime(frequency, time);
  oscillator.frequency.exponentialRampToValueAtTime(endFrequency, time + duration);
  gain.gain.setValueAtTime(volume, time);
  gain.gain.exponentialRampToValueAtTime(0.001, time + duration);
  oscillator.connect(gain);
  connectDrumOutput(context, gain, pan);
  oscillator.start(time);
  oscillator.stop(time + duration);
  trackDrumNode(oscillator);
}

function scheduleDrumSound(context, instrument, token, time, strength = 1, pan = 0, velocityProfile) {
  const velocity = velocityFromStrengthProfile(strength, velocityProfile);
  const adjustedStrength = velocity / 82;
  if (instrument === 'bd') drumTone(context, time, 145, 0.18, 0.8 * adjustedStrength, 'sine', 48, pan);
  if (instrument === 'sn') {
    const sampleSource = wikiSnareSampleKit?.schedule(context, {
      velocity,
      time,
      pan
    });
    if (sampleSource) {
      trackDrumNode(sampleSource);
      return;
    }
    drumNoise(context, time, 0.13, 900, 0.38 * adjustedStrength, pan);
    drumTone(context, time, 180, 0.08, 0.18 * adjustedStrength, 'triangle', 120, pan);
  }
  if (['hh', 'ph'].includes(instrument)) {
    drumNoise(context, time, token.kind === 'o' ? 0.32 : 0.055, 6500, 0.18 * adjustedStrength, pan);
  }
  if (instrument === 'cr') drumNoise(context, time, 0.65, 3500, 0.22 * adjustedStrength, pan);
  if (instrument === 'rd') drumNoise(context, time, 0.16, 5200, 0.14 * adjustedStrength, pan);
  if (instrument === 'ht') drumTone(context, time, 220, 0.17, 0.42 * adjustedStrength, 'sine', 150, pan);
  if (instrument === 'mt') drumTone(context, time, 175, 0.19, 0.44 * adjustedStrength, 'sine', 115, pan);
  if (instrument === 'ft') drumTone(context, time, 125, 0.22, 0.48 * adjustedStrength, 'sine', 78, pan);
  if (instrument === 'wb') drumTone(context, time, 920, 0.07, 0.24 * adjustedStrength, 'square', 720, pan);
}

function drumMidiNote(instrument, token, sticking = '.') {
  if (instrument === 'hh') return token.kind === 'o' ? 46 : 42;
  if (instrument === 'sn') return sticking === 'L' ? 125 : 38;
  return {
    bd: 36,
    ph: 44,
    ft: 43,
    mt: 47,
    // Toontrack Standard uses note 50 for a muted crash, even though General
    // MIDI calls it a high tom. Racktom 1 center is note 48 in Superior Drummer.
    ht: 48,
    cr: 49,
    rd: 51,
    wb: 76
  }[instrument];
}

function scheduleDrumMidiSound(context, output, instrument, token, time, strength = 1, sticking = '.', velocityProfile) {
  const note = drumMidiNote(instrument, token, sticking);
  if (note === undefined) return;
  const channel = 9;
  const velocity = velocityFromStrengthProfile(strength, velocityProfile);
  const timestamp = performance.now() + Math.max(0, time - context.currentTime) * 1000;
  output.send([0x90 | channel, note, velocity], timestamp);
  output.send([0x80 | channel, note, 0], timestamp + 60);
}

function drumStrengthsForToken(rawToken) {
  const token = parseDrumToken(rawToken);
  if (!token.hit) return [];
  const strength = (token.accent ? 3 : 1) * (token.ghost ? 0.35 : 1);
  const graceStrength = token.ghost ? 0.35 : 1;
  const strengths = [];
  if (token.kind === 'f') strengths.push(graceStrength * 0.55);
  if (token.kind === 'd') strengths.push(graceStrength * 0.45, graceStrength * 0.55);
  strengths.push(strength);
  if (token.tremolo === 1) strengths.push(strength);
  if (token.tremolo > 1) {
    const bounceCount = token.tremolo === 2 ? 3 : 5;
    for (let bounce = 1; bounce <= bounceCount; bounce += 1) {
      strengths.push(strength * Math.max(0.25, 0.7 - (bounce * 0.08)));
    }
  }
  return strengths;
}

function drumSnareVelocities(pattern, block) {
  const velocityProfile = drumVelocityProfile(block);
  return (pattern.rows.sn || [])
    .flatMap(drumStrengthsForToken)
    .map(strength => velocityFromStrengthProfile(strength, velocityProfile));
}

async function prepareWikiSnareSamples(context, pattern, block) {
  const velocities = drumSnareVelocities(pattern, block);
  if (!velocities.length) return;
  try {
    if (!wikiSnareSampleKitPromise) {
      prepareDrumButton(block, true);
      wikiSnareSampleKitPromise = wikiDrumSampleLibrary.getKit({ kitId: wikiSnareKitId })
        .then(kit => {
          wikiSnareSampleKit = kit;
          return kit;
        })
        .catch(error => {
          wikiSnareSampleKitPromise = null;
          throw error;
        });
    }
    const kit = await wikiSnareSampleKitPromise;
    await kit.prepare(context, velocities, { onLoadStart: () => prepareDrumButton(block, true) });
  } catch (error) {
    if (!drumSampleWarningShown) {
      console.warn('Snare samples could not be prepared; using the synthesized fallback.', error);
      drumSampleWarningShown = true;
    }
  }
}

function prepareLiveDrumVelocitySamples(block) {
  if (block.dataset.playing !== 'true' || block.drumMidiOutput || !drumAudioContext || !wikiSnareSampleKit) return;
  block.drumVelocityPendingProfile = drumVelocityProfile(block);
  if (block.drumVelocityPrepareTimer || block.drumVelocityPrepareInFlight) return;

  const prepareNextProfile = async () => {
    block.drumVelocityPrepareTimer = null;
    if (block.dataset.playing !== 'true' || block.drumMidiOutput || !document.body.contains(block)) {
      block.drumVelocityPendingProfile = null;
      return;
    }
    const requestedProfile = block.drumVelocityPendingProfile;
    block.drumVelocityPendingProfile = null;
    if (!requestedProfile) return;
    const prepareVersion = block.drumVelocityPrepareVersion || 0;
    block.drumVelocityPrepareInFlight = true;
    try {
      const pattern = parseDrumPattern(decodeURIComponent(block.dataset.drumSource || ''));
      const velocities = (pattern.rows.sn || [])
        .flatMap(drumStrengthsForToken)
        .map(strength => velocityFromStrengthProfile(strength, requestedProfile));
      await wikiSnareSampleKit.prepare(drumAudioContext, velocities);
      if (
        block.dataset.playing === 'true'
        && !block.drumMidiOutput
        && document.body.contains(block)
        && block.drumVelocityPrepareVersion === prepareVersion
      ) {
        block.drumActiveVelocityProfile = requestedProfile;
      }
    } catch (error) {
      console.warn('Updated drum velocities could not be prepared.', error);
    } finally {
      block.drumVelocityPrepareInFlight = false;
      if (
        block.drumVelocityPendingProfile
        && block.dataset.playing === 'true'
        && !block.drumMidiOutput
        && document.body.contains(block)
      ) {
        block.drumVelocityPrepareTimer = setTimeout(prepareNextProfile, 50);
      }
    }
  };

  // Sample the newest slider position at a bounded rate. Preparation remains
  // serialized, and playback keeps its previous fully loaded profile until the
  // replacement is ready, avoiding transient synthesized fallback clicks.
  block.drumVelocityPrepareTimer = setTimeout(prepareNextProfile, 50);
}

function scheduleDrumMidiHit(context, output, instrument, rawToken, time, stepDuration, sticking = '.', velocityProfile) {
  const token = parseDrumToken(rawToken);
  const strength = (token.accent ? 3 : 1) * (token.ghost ? 0.35 : 1);
  const graceStrength = token.ghost ? 0.35 : 1;
  const flamOffset = Math.min(0.045, stepDuration * 0.18);
  const dragOffset = Math.min(0.075, stepDuration * 0.3);
  const graceSticking = oppositeDrumSticking(sticking);

  if (token.kind === 'f') scheduleDrumMidiSound(context, output, instrument, token, time - flamOffset, graceStrength * 0.55, graceSticking, velocityProfile);
  if (token.kind === 'd') {
    scheduleDrumMidiSound(context, output, instrument, token, time - dragOffset, graceStrength * 0.45, graceSticking, velocityProfile);
    scheduleDrumMidiSound(context, output, instrument, token, time - (dragOffset * 0.5), graceStrength * 0.55, graceSticking, velocityProfile);
  }
  scheduleDrumMidiSound(context, output, instrument, token, time, strength, sticking, velocityProfile);
  if (token.tremolo === 1) scheduleDrumMidiSound(context, output, instrument, token, time + (stepDuration / 2), strength, sticking, velocityProfile);
  if (token.tremolo > 1) {
    const bounceCount = token.tremolo === 2 ? 3 : 5;
    for (let bounce = 1; bounce <= bounceCount; bounce += 1) {
      const bounceTime = time + ((stepDuration * 0.72 * bounce) / (bounceCount + 1));
      scheduleDrumMidiSound(context, output, instrument, token, bounceTime, strength * Math.max(0.25, 0.7 - (bounce * 0.08)), sticking, velocityProfile);
    }
  }
}

function scheduleDrumHit(context, instrument, rawToken, time, stepDuration, sticking = '.', velocityProfile) {
  const token = parseDrumToken(rawToken);
  const strength = (token.accent ? 3 : 1) * (token.ghost ? 0.35 : 1);
  const graceStrength = token.ghost ? 0.35 : 1;
  const flamOffset = Math.min(0.045, stepDuration * 0.18);
  const dragOffset = Math.min(0.075, stepDuration * 0.3);
  const mainPan = drumPanForSticking(sticking);
  const gracePan = drumPanForSticking(oppositeDrumSticking(sticking));

  if (token.kind === 'f') scheduleDrumSound(context, instrument, token, time - flamOffset, graceStrength * 0.55, gracePan, velocityProfile);
  if (token.kind === 'd') {
    scheduleDrumSound(context, instrument, token, time - dragOffset, graceStrength * 0.45, gracePan, velocityProfile);
    scheduleDrumSound(context, instrument, token, time - (dragOffset * 0.5), graceStrength * 0.55, gracePan, velocityProfile);
  }
  scheduleDrumSound(context, instrument, token, time, strength, mainPan, velocityProfile);
  if (token.tremolo === 1) scheduleDrumSound(context, instrument, token, time + (stepDuration / 2), strength, mainPan, velocityProfile);
  if (token.tremolo > 1) {
    const bounceCount = token.tremolo === 2 ? 3 : 5;
    for (let bounce = 1; bounce <= bounceCount; bounce += 1) {
      const bounceTime = time + ((stepDuration * 0.72 * bounce) / (bounceCount + 1));
      scheduleDrumSound(context, instrument, token, bounceTime, strength * Math.max(0.25, 0.7 - (bounce * 0.08)), mainPan, velocityProfile);
    }
  }
}

function drumMidiTailMilliseconds(pattern, stepDuration) {
  let longestOffset = 0;
  Object.values(pattern.rows).forEach((tokens) => tokens.forEach((rawToken) => {
    const token = parseDrumToken(rawToken);
    if (token.tremolo === 1) longestOffset = Math.max(longestOffset, stepDuration / 2);
    if (token.tremolo > 1) {
      const bounceCount = token.tremolo === 2 ? 3 : 5;
      longestOffset = Math.max(longestOffset, stepDuration * 0.72 * bounceCount / (bounceCount + 1));
    }
  }));
  return Math.ceil((DRUM_MIDI_LOOKAHEAD_SECONDS + longestOffset + 0.06) * 1000);
}

function scheduleDrumMidiPattern(block, pattern, startTime, stepDuration) {
  activeDrumHighlightTimers.forEach(clearTimeout);
  activeDrumHighlightTimers = [];
  block.drumMidiNextStep = 0;
  block.drumMidiNextTime = startTime;
  block.drumMidiSwingRatio = drumSwingRatio(block);
  block.drumMidiTailMs = drumMidiTailMilliseconds(pattern, drumSwungStepDuration(0, stepDuration, block.drumMidiSwingRatio));
  setDrumButton(block, 'playing');

  const scheduleAhead = () => {
    activeDrumMidiTimer = null;
    if (block.dataset.playing !== 'true' || !block.drumMidiOutput || !document.body.contains(block)) return;

    const horizon = drumAudioContext.currentTime + DRUM_MIDI_LOOKAHEAD_SECONDS;
    while (block.drumMidiNextTime < horizon) {
      const step = block.drumMidiNextStep;
      const time = block.drumMidiNextTime;
      // Latch swing for each two-slot pair so moving the slider cannot change
      // only half of a pair and cause a one-off jump in the pulse.
      if (step % 2 === 0) block.drumMidiSwingRatio = drumSwingRatio(block);
      const swungDuration = drumSwungStepDuration(step, stepDuration, block.drumMidiSwingRatio);
      const velocityProfile = drumVelocityProfile(block);
      Object.entries(pattern.rows).forEach(([instrument, tokens]) => {
        const token = tokens[step];
        if (parseDrumToken(token).hit) {
          scheduleDrumMidiHit(drumAudioContext, block.drumMidiOutput, instrument, token, time, swungDuration, pattern.sticking[step], velocityProfile);
        }
      });

      const delay = Math.max(0, (time - drumAudioContext.currentTime) * 1000);
      activeDrumHighlightTimers.push(setTimeout(() => highlightDrumStep(block, step), delay));
      block.drumMidiNextStep = (step + 1) % pattern.steps;
      block.drumMidiNextTime = time + swungDuration;
    }

    activeDrumMidiTimer = setTimeout(scheduleAhead, DRUM_MIDI_SCHEDULER_INTERVAL_MS);
  };

  scheduleAhead();
}

function scheduleDrumPattern(block, pattern, startTime, stepDuration) {
  if (block.drumMidiOutput) {
    scheduleDrumMidiPattern(block, pattern, startTime, stepDuration);
    return;
  }
  activeDrumHighlightTimers.forEach(clearTimeout);
  activeDrumHighlightTimers = [];
  block.drumAudioNextStep = 0;
  block.drumAudioNextTime = startTime;
  block.drumAudioSwingRatio = drumSwingRatio(block);
  setDrumButton(block, 'playing');

  const scheduleAhead = () => {
    activeDrumStopTimer = null;
    if (block.dataset.playing !== 'true' || !document.body.contains(block)) return;

    const horizon = drumAudioContext.currentTime + DRUM_AUDIO_LOOKAHEAD_SECONDS;
    while (block.drumAudioNextTime < horizon) {
      const step = block.drumAudioNextStep;
      const time = block.drumAudioNextTime;
      // Keep each pair internally consistent while allowing live swing changes
      // to take effect at the next pair rather than restarting the sequence.
      if (step % 2 === 0) block.drumAudioSwingRatio = drumSwingRatio(block);
      const swungDuration = drumSwungStepDuration(step, stepDuration, block.drumAudioSwingRatio);
      const velocityProfile = block.drumActiveVelocityProfile || drumVelocityProfile(block);
      Object.entries(pattern.rows).forEach(([instrument, tokens]) => {
        const token = tokens[step];
        if (parseDrumToken(token).hit) {
          scheduleDrumHit(drumAudioContext, instrument, token, time, swungDuration, pattern.sticking[step], velocityProfile);
        }
      });

      const delay = Math.max(0, (time - drumAudioContext.currentTime) * 1000);
      activeDrumHighlightTimers.push(setTimeout(() => highlightDrumStep(block, step), delay));
      block.drumAudioNextStep = (step + 1) % pattern.steps;
      block.drumAudioNextTime = time + swungDuration;
    }

    activeDrumStopTimer = setTimeout(scheduleAhead, DRUM_AUDIO_SCHEDULER_INTERVAL_MS);
  };

  scheduleAhead();
}

async function playDrumBlock(block) {
  const AudioContextConstructor = window.AudioContext || window.webkitAudioContext;
  if (!AudioContextConstructor) throw new Error('This browser does not support Web Audio.');
  if (!drumAudioContext) drumAudioContext = new AudioContextConstructor();
  if (drumAudioContext.state === 'suspended') await drumAudioContext.resume();
  block.drumMidiOutput = drumMidiEnabled ? await prepareDrumMidi() : null;

  const pattern = parseDrumPattern(decodeURIComponent(block.dataset.drumSource || ''));
  if (!block.drumMidiOutput) {
    await prepareWikiSnareSamples(drumAudioContext, pattern, block);
    block.drumActiveVelocityProfile = drumVelocityProfile(block);
  }
  // Sample and MIDI setup can finish after the user has switched tabs. Do not
  // let that stale async work restart playback after visibility handling stops it.
  if (document.hidden || block.dataset.loading !== 'true') return;
  const tempoInput = block.querySelector('.drum-tempo');
  const tempo = Number(tempoInput?.value) || Number(pattern.tempo) || 120;
  const stepDuration = drumStepDuration(pattern, tempo);
  const handoffDelay = block.drumMidiOutput
    ? Math.max(0, (drumMidiStartNotBefore - performance.now()) / 1000)
    : 0;
  const startTime = drumAudioContext.currentTime + Math.max(0.1, handoffDelay);
  scheduleDrumPattern(block, pattern, startTime, stepDuration);
}

async function restartDrumBlockIfPlaying(block) {
  if (block?.dataset.playing !== 'true') return;
  try {
    stopDrumBlocks();
    prepareDrumButton(block);
    await playDrumBlock(block);
  } catch (error) {
    console.error(error);
    stopDrumBlocks();
    if (drumMidiEnabled) setDrumMidiStatus(error.message || 'MIDI playback failed.');
    setDrumButton(block, 'error');
  }
}

content.addEventListener('click', async (event) => {
  const sectionToggle = event.target.closest('.wiki-section-toggle');
  if (sectionToggle) {
    const section = sectionToggle.closest('.wiki-section');
    const expanded = sectionToggle.getAttribute('aria-expanded') === 'true';
    const deepToggle = event.shiftKey;
    if (deepToggle) {
      if (!expanded) {
        setSectionExpanded(section, true);
      } else if (!sectionHasExpandedDescendants(section)) {
        setDescendantSectionsExpanded(section, true);
      } else {
        setDescendantSectionsExpanded(section, false);
        setSectionExpanded(section, false);
      }
    } else {
      setSectionExpanded(section, !expanded);
    }
    return;
  }

  const pianoScorePlay = event.target.closest('.piano-score-play');
  if (pianoScorePlay) {
    const block = pianoScorePlay.closest('.piano-score-block');
    if (block.dataset.playing === 'true') {
      stopPianoScoreBlocks();
      return;
    }
    try {
      stopStrudelBlocks();
      stopAbcBlocks();
      stopDrumBlocks();
      stopPianoScoreBlocks();
      await playPianoScoreBlock(block);
    } catch (error) {
      console.error(error);
      stopPianoScoreBlocks();
      setPianoScoreStatus(block, error.message || 'Could not play this score.', true);
    }
    return;
  }

  const pianoScoreFollow = event.target.closest('.piano-score-follow');
  if (pianoScoreFollow) {
    const block = pianoScoreFollow.closest('.piano-score-block');
    if (block.dataset.following === 'true') {
      stopPianoScoreBlocks();
      return;
    }
    try {
      stopStrudelBlocks();
      stopAbcBlocks();
      stopDrumBlocks();
      stopPianoScoreBlocks();
      await followPianoScoreBlock(block);
    } catch (error) {
      console.error(error);
      stopPianoScoreBlocks();
      setPianoScoreStatus(block, error.message || 'Could not connect to MIDI.', true);
    }
    return;
  }

  const abcButton = event.target.closest('.abc-toggle');
  if (abcButton) {
    const block = event.target.closest('.abc-block');
    if (block.dataset.playing === 'true') {
      stopAbcBlocks();
      return;
    }

    setAbcButton(block, 'loading');

    try {
      stopStrudelBlocks();
      stopAbcBlocks();
      stopDrumBlocks();
      stopPianoScoreBlocks();
      setAbcButton(block, 'loading');
      await playAbcBlock(block);
    } catch (error) {
      console.error(error);
      stopAbcBlocks();
      setAbcButton(block, 'error');
    }
    return;
  }

  const tempoButton = event.target.closest('.drum-tempo-step');
  if (tempoButton) {
    const block = event.target.closest('.drum-block');
    const input = block?.querySelector('.drum-tempo');
    const step = Number(tempoButton.dataset.tempoStep) || 0;
    const current = Number(input?.value) || 120;
    const next = Math.max(20, Math.min(400, Math.round(current + step)));
    if (input) input.value = String(next);
    await restartDrumBlockIfPlaying(block);
    return;
  }

  const drumButton = event.target.closest('.drum-toggle');
  if (drumButton) {
    const block = event.target.closest('.drum-block');
    if (block.dataset.playing === 'true') {
      stopDrumBlocks();
      return;
    }

    try {
      stopStrudelBlocks();
      stopAbcBlocks();
      stopDrumBlocks();
      stopPianoScoreBlocks();
      prepareDrumButton(block);
      await playDrumBlock(block);
    } catch (error) {
      console.error(error);
      stopDrumBlocks();
      if (drumMidiEnabled) setDrumMidiStatus(error.message || 'MIDI playback failed.');
      setDrumButton(block, 'error');
    }
    return;
  }

  const toggleButton = event.target.closest('.strudel-toggle');
  if (!toggleButton) return;

  const block = event.target.closest('.strudel-block');
  if (block.dataset.playing === 'true') {
    stopStrudelBlocks();
    return;
  }

  setStrudelButton(block, 'loading');

  try {
    await prepareStrudel();

    stopAbcBlocks();
    stopDrumBlocks();
    stopPianoScoreBlocks();
    stopStrudelBlocks();
    setStrudelButton(block, 'loading');
    const source = decodeURIComponent(block.dataset.strudelSource);
    const pattern = (0, eval)(source);
    if (!pattern || typeof pattern.play !== 'function') {
      throw new Error('This block must evaluate to a playable Strudel pattern.');
    }
    pattern.play();
    setStrudelButton(block, 'playing');
  } catch (error) {
    console.error(error);
    stopStrudelBlocks();
    setStrudelButton(block, 'error');
  }
});

content.addEventListener('dblclick', (event) => {
  if (!event.target.closest('.drum-tempo-step')) return;
  event.preventDefault();
  event.stopPropagation();
});

content.addEventListener('pointerdown', (event) => {
  const swingInput = event.target.closest('.drum-swing');
  if (swingInput) activeDrumSwingSlider = swingInput;
});

window.addEventListener('pointerup', () => {
  if (activeDrumSwingSlider) {
    snapDrumSwingInput(activeDrumSwingSlider);
    updateDrumSwingOutput(activeDrumSwingSlider.closest('.drum-block'));
  }
  activeDrumSwingSlider = null;
});

window.addEventListener('pointercancel', () => {
  activeDrumSwingSlider = null;
});

content.addEventListener('input', (event) => {
  const velocityInput = event.target.closest('.drum-velocity');
  if (velocityInput) {
    setDrumVelocityFromInput(velocityInput);
    prepareLiveDrumVelocitySamples(velocityInput.closest('.drum-block'));
    return;
  }
  const swingInput = event.target.closest('.drum-swing');
  if (swingInput) {
    snapDrumSwingInput(swingInput);
    updateDrumSwingOutput(swingInput.closest('.drum-block'));
  }
});

content.addEventListener('change', async (event) => {
  const pianoMidiInput = event.target.closest('.piano-score-midi-input');
  if (pianoMidiInput) {
    const wasFollowing = pianoMidiInput.closest('.piano-score-block')?.dataset.following === 'true';
    selectPianoScoreMidiInput(pianoMidiInput.value);
    if (wasFollowing) {
      const block = pianoMidiInput.closest('.piano-score-block');
      stopPianoScoreBlocks();
      await followPianoScoreBlock(block);
    }
    return;
  }

  const velocityInput = event.target.closest('.drum-velocity');
  if (velocityInput) {
    prepareLiveDrumVelocitySamples(velocityInput.closest('.drum-block'));
    return;
  }

  const kitSelect = event.target.closest('.drum-kit-select');
  if (kitSelect) {
    const block = kitSelect.closest('.drum-block');
    const wasPlaying = block?.dataset.playing === 'true';
    wikiSnareKitId = kitSelect.value || DEFAULT_WIKI_SNARE_KIT_ID;
    wikiSnareSampleKit = null;
    wikiSnareSampleKitPromise = null;
    drumSampleWarningShown = false;
    saveDrumSampleKitPreference();
    await syncDrumSampleKitControls();
    if (wasPlaying) await restartDrumBlockIfPlaying(block);
    return;
  }

  const midiToggle = event.target.closest('.drum-midi-enabled');
  if (midiToggle) {
    const block = midiToggle.closest('.drum-block');
    const wasPlaying = block?.dataset.playing === 'true';
    drumMidiEnabled = midiToggle.checked;
    saveDrumMidiPreferences();
    syncDrumMidiControls();
    try {
      if (drumMidiEnabled) await prepareDrumMidi();
      else setDrumMidiStatus();
      if (wasPlaying) await restartDrumBlockIfPlaying(block);
    } catch (error) {
      console.error(error);
      setDrumMidiStatus(error.message || 'Could not enable MIDI.');
      if (wasPlaying) {
        stopDrumBlocks();
        setDrumButton(block, 'error');
      }
    }
    return;
  }

  const midiSelect = event.target.closest('.drum-midi-output');
  if (midiSelect) {
    const block = midiSelect.closest('.drum-block');
    drumMidiOutputId = midiSelect.value;
    saveDrumMidiPreferences();
    syncDrumMidiControls();
    setDrumMidiStatus();
    await restartDrumBlockIfPlaying(block);
    return;
  }

  const swingInput = event.target.closest('.drum-swing');
  if (swingInput) {
    updateDrumSwingOutput(swingInput.closest('.drum-block'));
    return;
  }

  const input = event.target.closest('.drum-tempo');
  if (!input) return;
  const block = input.closest('.drum-block');
  const tempo = Math.max(20, Math.min(400, Number(input.value) || 120));
  input.value = String(Math.round(tempo));
  await restartDrumBlockIfPlaying(block);
});

function currentPage() {
  const candidate = location.hash.match(/^#\/([a-z0-9-]+(?:\/[a-z0-9-]+)*)$/)?.[1] || 'home';
  return candidate;
}

function pagePath(page) {
  if (page === 'music' || page === 'cubing' || page === 'microblog') return `pages/${page}/index.md`;
  return `pages/${page}.md`;
}

function renderCurrentPath(page) {
  if (!currentPathLabel) return;
  const parts = page.split('/');
  const links = parts.map((part, index) => {
    const path = parts.slice(0, index + 1).join('/');
    return `<a href="#/${escapeHtml(path)}">${escapeHtml(part)}</a>`;
  });
  currentPathLabel.innerHTML = `(/${links.join('/')})`;
}

async function loadPage() {
  const page = currentPage();
  document.body.classList.toggle('wide-score-page', page === 'music/sheet-music');
  renderCurrentPath(page);
  stopStrudelBlocks();
  stopAbcBlocks();
  stopDrumBlocks();
  stopPianoScoreBlocks();
  content.innerHTML = '<p class="loading">Loading…</p>';
  document.querySelectorAll('.sidebar a').forEach((link) => {
    const hrefPage = link.getAttribute('href')?.replace(/^#\//, '');
    link.toggleAttribute('aria-current', hrefPage === page || page.startsWith(`${hrefPage}/`));
  });

  try {
    const response = await fetch(pagePath(page), { cache: 'no-store' });
    if (!response.ok) throw new Error(`Page returned ${response.status}`);
    content.innerHTML = renderMarkdown(await response.text());
    renderPianoScoreBlocks();
    renderAbcBlocks();
    renderDrumBlocks();
    renderCubeBlocks();
    document.title = `${content.querySelector('h1')?.textContent || 'Wiki'} — Personal Wiki`;
  } catch (error) {
    content.innerHTML = `<div class="error"><h1>Page not found</h1><p>There is no page named <code>${escapeHtml(page)}</code>. <a href="#/home">Return home</a>.</p></div>`;
    document.title = 'Page not found — Personal Wiki';
  }

  sidebar.classList.remove('open');
  menuButton.setAttribute('aria-expanded', 'false');
  window.scrollTo(0, 0);
  content.focus({ preventScroll: true });
}

menuButton.addEventListener('click', () => {
  const open = sidebar.classList.toggle('open');
  menuButton.setAttribute('aria-expanded', String(open));
  if (open) {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }
});
setSidebarCollapsed(sidebarCollapsed);
sidebarCollapseButton?.addEventListener('click', () => setSidebarCollapsed(!sidebarCollapsed));
setTheme(currentTheme());
themeToggle?.addEventListener('click', () => {
  setTheme(currentTheme() === 'dark' ? 'light' : 'dark');
});
window.addEventListener('hashchange', loadPage);
window.addEventListener('resize', () => {
  clearTimeout(pianoScoreResizeTimer);
  pianoScoreResizeTimer = setTimeout(() => {
    if (document.querySelector('.piano-score-block')) renderPianoScoreBlocks();
  }, 120);
});
function stopPlaybackForInactivePage() {
  stopStrudelBlocks();
  stopAbcBlocks();
  stopDrumBlocks();
  stopPianoScoreBlocks();
}
document.addEventListener('visibilitychange', () => {
  if (document.hidden) stopPlaybackForInactivePage();
});
window.addEventListener('blur', stopPlaybackForInactivePage);
if (!location.hash) location.replace('#/home');
else loadPage();
