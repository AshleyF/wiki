const content = document.querySelector('#content');
const sidebar = document.querySelector('#sidebar');
const menuButton = document.querySelector('.menu-button');
let strudelReady;
let abcBlockId = 0;
let drumBlockId = 0;
let cubeBlockId = 0;
let abcAudioContext;
let activeAbcSynth = null;
let activeAbcTiming = null;
let activeAbcStopTimer = null;
let drumAudioContext;
let activeDrumNodes = [];
let activeDrumStopTimer = null;
let activeDrumHighlightTimers = [];

const escapeHtml = (value) => value
  .replaceAll('&', '&amp;')
  .replaceAll('<', '&lt;')
  .replaceAll('>', '&gt;')
  .replaceAll('"', '&quot;')
  .replaceAll("'", '&#039;');

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
  result = result.replace(/\*([^*]+)\*/g, '<em>$1</em>');
  result = result.replace(/\[([^\]]+)\]\(([^)]+)\)/g, (_, label, href) => {
    const safeHref = /^(https?:|mailto:|#)/.test(href) ? href : '#';
    const external = /^https?:/.test(safeHref) ? ' target="_blank" rel="noreferrer"' : '';
    return `<a href="${safeHref}"${external}>${label}</a>`;
  });
  return result;
}

const fenceRenderers = {
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
    return `<section class="drum-block" data-drum-source="${encodedSource}" data-playing="false">
      <div class="drum-render" id="${targetId}" aria-label="Rendered drum notation"></div>
      <div class="drum-controls">
        <button class="drum-toggle" type="button" aria-label="Play this drum notation">▶ Play</button>
      </div>
      <p class="drum-legend">Rows: cr crash, rd ride, hh hi-hat, sn snare, ht/mt/ft toms, bd kick, ph pedal hi-hat, wb woodblock, stick sticking. Hits: <code>x</code> normal, <code>o</code> open, <code>x&gt;</code> accent, <code>(x)</code> ghost, <code>x/</code> double, <code>f</code> flam, <code>d</code> drag, <code>.</code> rest.</p>
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

  const flushParagraph = () => {
    if (paragraph.length) output.push(`<p>${inline(paragraph.join(' '))}</p>`);
    paragraph = [];
  };
  const closeList = () => {
    if (listType) output.push(`</${listType}>`);
    listType = null;
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

    const heading = line.match(/^(#{1,3})\s+(.+)$/);
    const unordered = line.match(/^[-*]\s+(.+)$/);
    const ordered = line.match(/^\d+\.\s+(.+)$/);
    const quote = line.match(/^>\s?(.*)$/);

    if (heading) {
      flushParagraph(); closeList();
      const level = heading[1].length;
      output.push(`<h${level} id="${slugify(heading[2])}">${inline(heading[2])}</h${level}>`);
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
      paragraph.push(line.trim());
    }
  }

  flushParagraph(); closeList();
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
    stopAbcBlocks();
    return;
  }

  event.elements?.forEach(markAbcElement);
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
        if (activeAbcTiming === timing) highlightAbcEvent(block, event);
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
      if (activeAbcSynth === synth) stopAbcBlocks();
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
  if (rawToken === '.') return { hit: false, kind: '.', accent: false, ghost: false, double: false };
  let token = rawToken;
  let ghost = false;
  if (token.startsWith('(') && token.endsWith(')')) {
    ghost = true;
    token = token.slice(1, -1);
  }
  const accent = token.endsWith('>');
  if (accent) token = token.slice(0, -1);
  const double = token.endsWith('/');
  if (double) token = token.slice(0, -1);
  if (!['x', 'o', 'f', 'd'].includes(token)) {
    throw new Error(`Unknown drum hit "${rawToken}". Use x, o, x>, (x), x/, f, d, or .`);
  }
  return { hit: true, kind: token, accent, ghost, double };
}

function parseDrumPattern(source) {
  const pattern = {
    meter: '4/4',
    tempo: null,
    sticking: null,
    rows: {}
  };

  source.split('\n').forEach((line) => {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) return;

    const directive = trimmed.match(/^(tempo|meter)\s+(.+)$/i);
    if (directive) {
      pattern[directive[1].toLowerCase()] = directive[2].trim();
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
  if (steps !== 8) throw new Error('This first drum renderer expects exactly eight eighth-note slots.');

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

function makeDrumGhostNote() {
  const Flow = window.Vex.Flow;
  if (typeof Flow.GhostNote === 'function') {
    const note = new Flow.GhostNote('8');
    note.isWikiGhostNote = true;
    return note;
  }

  const rest = new Flow.StaveNote({ keys: ['b/4'], duration: '8r' });
  rest.setStyle?.({ fillStyle: 'transparent', strokeStyle: 'transparent' });
  rest.isWikiGhostNote = true;
  return rest;
}

function makeDrumHit(rows, index, pattern) {
  const Flow = window.Vex.Flow;
  const keys = rows.map((row) => drumRows[row].key);
  const note = new Flow.StaveNote({
    keys,
    duration: '8',
    stem_direction: Flow.StaveNote.STEM_UP
  });
  note.isWikiGhostNote = false;

  rows.forEach((row, keyIndex) => {
    const token = parseDrumToken(pattern.rows[row][index]);
    if (token.ghost && typeof Flow.Parenthesis === 'function') {
      note.addModifier(new Flow.Parenthesis(Flow.Modifier.Position.LEFT), keyIndex);
      note.addModifier(new Flow.Parenthesis(Flow.Modifier.Position.RIGHT), keyIndex);
    }
  });

  if (rows.some((row) => parseDrumToken(pattern.rows[row][index]).accent)
    && typeof Flow.Articulation === 'function') {
    const accent = new Flow.Articulation('a>')
      .setPosition(Flow.Modifier.Position.ABOVE);
    note.addModifier(accent, 0);
  }

  if (rows.some((row) => parseDrumToken(pattern.rows[row][index]).double)
    && typeof Flow.Tremolo === 'function') {
    note.addModifier(new Flow.Tremolo(1), 0);
  }

  const graceRow = rows.find((row) => ['f', 'd'].includes(parseDrumToken(pattern.rows[row][index]).kind));
  if (graceRow && typeof Flow.GraceNote === 'function' && typeof Flow.GraceNoteGroup === 'function') {
    const kind = parseDrumToken(pattern.rows[graceRow][index]).kind;
    const graceNotes = Array.from({ length: kind === 'd' ? 2 : 1 }, () => new Flow.GraceNote({
      keys: [drumRows[graceRow].key],
      duration: '16',
      slash: kind === 'f',
      stem_direction: Flow.StaveNote.STEM_UP
    }));
    const graceGroup = new Flow.GraceNoteGroup(graceNotes, false);
    if (graceNotes.length > 1) graceGroup.beamNotes();
    note.addModifier(graceGroup, rows.indexOf(graceRow));
  }
  const sticking = pattern.sticking[index];
  if (sticking !== '.' && typeof Flow.Annotation === 'function') {
    const label = new Flow.Annotation(sticking)
      .setFont('Arial', 10, 'bold')
      .setVerticalJustification(Flow.Annotation.VerticalJustify.BOTTOM);
    note.addModifier(label, 0);
  }
  return note;
}

function makeDrumVoice(pattern) {
  const Flow = window.Vex.Flow;
  const notes = Array.from({ length: 8 }, (_, index) => {
    const activeRows = Object.keys(drumRows)
      .filter((row) => parseDrumToken(pattern.rows[row][index]).hit);
    if (!activeRows.length) return makeDrumGhostNote();
    return makeDrumHit(activeRows, index, pattern);
  });

  const voice = new Flow.Voice({ num_beats: 4, beat_value: 4 });
  voice.addTickables(notes);
  return { voice, notes };
}

function makeDrumBeams(notes) {
  const Flow = window.Vex.Flow;
  if (typeof Flow.Beam !== 'function') return [];

  const beams = [];
  let run = [];
  notes.forEach((note) => {
    if (note.isWikiGhostNote) {
      if (run.length > 1) beams.push(new Flow.Beam(run));
      run = [];
      return;
    }

    run.push(note);
  });
  if (run.length > 1) beams.push(new Flow.Beam(run));

  return beams;
}

function renderDrumNotation(target, pattern) {
  const Flow = window.Vex.Flow;
  target.innerHTML = '';

  const width = Math.max(target.clientWidth || 620, 620);
  const height = 175;
  const renderer = new Flow.Renderer(target, Flow.Renderer.Backends.SVG);
  renderer.resize(width, height);

  const context = renderer.getContext();
  context.setFont('Arial', 10);

  const stave = new Flow.Stave(16, 28, width - 32);
  stave.addClef('percussion').addTimeSignature(pattern.meter);
  stave.setContext(context).draw();

  const drums = makeDrumVoice(pattern);
  const beams = makeDrumBeams(drums.notes);
  new Flow.Formatter()
    .joinVoices([drums.voice])
    .format([drums.voice], width - 150);

  drums.voice.draw(context, stave);
  beams.forEach((beam) => beam.setContext(context).draw());

  const stepElements = Array(8).fill(null);
  drums.notes.forEach((note, step) => {
    if (note.isWikiGhostNote) return;
    const group = note.getSVGElement?.();
    if (!group) return;
    group.classList.add('drum-step');
    group.dataset.drumStep = String(step);
    stepElements[step] = group;

    if (parseDrumToken(pattern.rows.hh[step]).kind !== 'o') return;
    const hiHatHead = group.querySelector('.vf-notehead');
    if (!hiHatHead) return;
    const box = hiHatHead.getBBox();
    const marker = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
    marker.setAttribute('class', 'drum-open-hat');
    marker.setAttribute('cx', String(box.x + (box.width / 2)));
    marker.setAttribute('cy', String(box.y - 5.5));
    marker.setAttribute('r', '3.2');
    group.append(marker);
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
  button.dataset.state = state === 'play' ? '' : state;

  if (state === 'playing') {
    button.textContent = '■ Stop';
    button.setAttribute('aria-label', 'Stop drum playback');
  } else if (state === 'error') {
    button.textContent = 'Error — retry';
    button.setAttribute('aria-label', 'Drum playback failed; retry');
  } else {
    button.textContent = '▶ Play';
    button.setAttribute('aria-label', 'Play this drum notation');
  }
}

function stopDrumBlocks() {
  if (activeDrumStopTimer) clearTimeout(activeDrumStopTimer);
  activeDrumStopTimer = null;
  activeDrumHighlightTimers.forEach(clearTimeout);
  activeDrumHighlightTimers = [];
  activeDrumNodes.forEach((node) => {
    try { node.stop(); } catch { /* The source may have already ended. */ }
  });
  activeDrumNodes = [];
  document.querySelectorAll('.drum-current-note').forEach((element) => {
    element.classList.remove('drum-current-note');
  });
  document.querySelectorAll('.drum-block').forEach((block) => setDrumButton(block));
}

function highlightDrumStep(block, step) {
  block.querySelectorAll('.drum-current-note').forEach((element) => {
    element.classList.remove('drum-current-note');
  });
  block.drumStepElements?.[step]?.classList.add('drum-current-note');
}

function drumNoise(context, time, duration, filterFrequency, volume) {
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
  source.connect(filter).connect(gain).connect(context.destination);
  source.start(time);
  source.stop(time + duration);
  activeDrumNodes.push(source);
}

function drumTone(context, time, frequency, duration, volume, type = 'sine', endFrequency = frequency) {
  const oscillator = context.createOscillator();
  const gain = context.createGain();
  oscillator.type = type;
  oscillator.frequency.setValueAtTime(frequency, time);
  oscillator.frequency.exponentialRampToValueAtTime(endFrequency, time + duration);
  gain.gain.setValueAtTime(volume, time);
  gain.gain.exponentialRampToValueAtTime(0.001, time + duration);
  oscillator.connect(gain).connect(context.destination);
  oscillator.start(time);
  oscillator.stop(time + duration);
  activeDrumNodes.push(oscillator);
}

function scheduleDrumSound(context, instrument, token, time, strength = 1) {
  if (instrument === 'bd') drumTone(context, time, 145, 0.18, 0.8 * strength, 'sine', 48);
  if (instrument === 'sn') {
    drumNoise(context, time, 0.13, 900, 0.38 * strength);
    drumTone(context, time, 180, 0.08, 0.18 * strength, 'triangle', 120);
  }
  if (['hh', 'ph'].includes(instrument)) {
    drumNoise(context, time, token.kind === 'o' ? 0.32 : 0.055, 6500, 0.18 * strength);
  }
  if (instrument === 'cr') drumNoise(context, time, 0.65, 3500, 0.22 * strength);
  if (instrument === 'rd') drumNoise(context, time, 0.16, 5200, 0.14 * strength);
  if (instrument === 'ht') drumTone(context, time, 220, 0.17, 0.42 * strength, 'sine', 150);
  if (instrument === 'mt') drumTone(context, time, 175, 0.19, 0.44 * strength, 'sine', 115);
  if (instrument === 'ft') drumTone(context, time, 125, 0.22, 0.48 * strength, 'sine', 78);
  if (instrument === 'wb') drumTone(context, time, 920, 0.07, 0.24 * strength, 'square', 720);
}

function scheduleDrumHit(context, instrument, rawToken, time, stepDuration) {
  const token = parseDrumToken(rawToken);
  const strength = (token.accent ? 1.3 : 1) * (token.ghost ? 0.35 : 1);
  if (token.kind === 'f') scheduleDrumSound(context, instrument, token, time - 0.045, strength * 0.55);
  if (token.kind === 'd') {
    scheduleDrumSound(context, instrument, token, time - 0.075, strength * 0.45);
    scheduleDrumSound(context, instrument, token, time - 0.038, strength * 0.55);
  }
  scheduleDrumSound(context, instrument, token, time, strength);
  if (token.double) scheduleDrumSound(context, instrument, token, time + (stepDuration / 2), strength * 0.9);
}

async function playDrumBlock(block) {
  const AudioContextConstructor = window.AudioContext || window.webkitAudioContext;
  if (!AudioContextConstructor) throw new Error('This browser does not support Web Audio.');
  if (!drumAudioContext) drumAudioContext = new AudioContextConstructor();
  if (drumAudioContext.state === 'suspended') await drumAudioContext.resume();

  const pattern = parseDrumPattern(decodeURIComponent(block.dataset.drumSource || ''));
  const tempo = Number(pattern.tempo) || 120;
  const stepDuration = 30 / tempo;
  const startTime = drumAudioContext.currentTime + 0.1;

  Object.entries(pattern.rows).forEach(([instrument, tokens]) => {
    tokens.forEach((token, index) => {
      if (parseDrumToken(token).hit) scheduleDrumHit(drumAudioContext, instrument, token, startTime + (index * stepDuration), stepDuration);
    });
  });

  Array.from({ length: 8 }, (_, step) => {
    const delay = Math.max(0, (startTime - drumAudioContext.currentTime + (step * stepDuration)) * 1000);
    activeDrumHighlightTimers.push(setTimeout(() => highlightDrumStep(block, step), delay));
  });

  setDrumButton(block, 'playing');
  activeDrumStopTimer = setTimeout(stopDrumBlocks, ((stepDuration * 8) + 0.35) * 1000);
}

content.addEventListener('click', async (event) => {
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
      setAbcButton(block, 'loading');
      await playAbcBlock(block);
    } catch (error) {
      console.error(error);
      stopAbcBlocks();
      setAbcButton(block, 'error');
    }
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
      await playDrumBlock(block);
    } catch (error) {
      console.error(error);
      stopDrumBlocks();
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

function currentPage() {
  const candidate = location.hash.match(/^#\/([a-z0-9-]+)$/)?.[1] || 'home';
  return candidate;
}

async function loadPage() {
  const page = currentPage();
  stopStrudelBlocks();
  stopAbcBlocks();
  stopDrumBlocks();
  content.innerHTML = '<p class="loading">Loading…</p>';
  document.querySelectorAll('.sidebar a').forEach((link) => {
    link.toggleAttribute('aria-current', link.getAttribute('href') === `#/${page}`);
  });

  try {
    const response = await fetch(`pages/${page}.md`, { cache: 'no-store' });
    if (!response.ok) throw new Error(`Page returned ${response.status}`);
    content.innerHTML = renderMarkdown(await response.text());
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
});
window.addEventListener('hashchange', loadPage);
if (!location.hash) location.replace('#/home');
else loadPage();
