const VELOCITY = Object.freeze({ rest: 0, ghost: 1, hit: 2, accent: 3 });

const sourceInstrumentNames = Object.freeze({ bd: 'kk' });
const explorerInstrumentNames = Object.freeze({ kk: 'bd' });

const specialDestinations = Object.freeze({
  'hh.open': { instrument: 'hh', state: 'open' },
  'hh.bark': { instrument: 'hh', state: 'bark' },
  'ph.splash': { instrument: 'ph', state: 'splash' },
  'sn.cross': { instrument: 'sn', state: 'cross-stick' },
  'sn.flam': { instrument: 'sn', state: 'flam' },
  'sn.drag': { instrument: 'sn', state: 'drag' },
  'ht.flam': { instrument: 'ht', state: 'flam' },
  'ht.drag': { instrument: 'ht', state: 'drag' },
  'mt.flam': { instrument: 'mt', state: 'flam' },
  'mt.drag': { instrument: 'mt', state: 'drag' },
  'lt.flam': { instrument: 'lt', state: 'flam' },
  'lt.drag': { instrument: 'lt', state: 'drag' },
  'ft.flam': { instrument: 'ft', state: 'flam' },
  'ft.drag': { instrument: 'ft', state: 'drag' }
});

export class RhythmLanguageError extends Error {
  constructor(line, message) {
    super(`Line ${line}: ${message}`);
    this.name = 'RhythmLanguageError';
    this.line = line;
  }
}

function primaryState(instrument) {
  if (instrument.id === 'hh') return 'closed';
  if (instrument.id === 'ph') return 'chick';
  return 'hit';
}

function sourceName(instrumentId) {
  return sourceInstrumentNames[instrumentId] || instrumentId;
}

function explorerName(sourceId) {
  return explorerInstrumentNames[sourceId] || sourceId;
}

function smallestExactPeriod(values) {
  for (let period = 1; period <= values.length; period += 1) {
    if (values.length % period === 0
      && values.every((value, index) => value === values[index % period])) return period;
  }
  return values.length;
}

function encodePattern(values) {
  const period = smallestExactPeriod(values);
  return `~${values.slice(0, period).map(value => ({
    [VELOCITY.rest]: '.',
    [VELOCITY.ghost]: 'g*',
    [VELOCITY.hit]: '*',
    [VELOCITY.accent]: '^*'
  })[value]).join('')}`;
}

function baseVelocity(instrument, state) {
  if (state === primaryState(instrument)) return VELOCITY.hit;
  if (state === 'ghost') return VELOCITY.ghost;
  if (state === 'accent') return VELOCITY.accent;
  return VELOCITY.rest;
}

function specialEntriesForInstrument(instrumentId) {
  return Object.entries(specialDestinations)
    .filter(([, spec]) => spec.instrument === instrumentId);
}

export function serializeRhythmPattern(pattern, instruments) {
  const lines = [
    `${pattern.steps} slots`,
    `${pattern.meter} meter`,
    `${Number(pattern.tempo.toFixed?.(3) ?? pattern.tempo)} bpm`,
    ''
  ];

  instruments.forEach(instrument => {
    const base = pattern.tracks[instrument.id].map(state => baseVelocity(instrument, state));
    if (base.some(Boolean)) lines.push(`${sourceName(instrument.id)} ${encodePattern(base)}`);

    specialEntriesForInstrument(instrument.id).forEach(([destination, spec]) => {
      const events = pattern.tracks[instrument.id].map(state => state === spec.state ? VELOCITY.hit : VELOCITY.rest);
      if (events.some(Boolean)) lines.push(`${destination} ${encodePattern(events)}`);
    });
  });

  return lines.join('\n').trimEnd();
}

function parsePatternLiteral(token, line) {
  const body = token.slice(1);
  if (!body) throw new RhythmLanguageError(line, 'a pattern literal needs at least one hit or rest after ~.');
  const values = [];
  for (let index = 0; index < body.length; index += 1) {
    const character = body[index];
    if (character === '.') values.push(VELOCITY.rest);
    else if (character === '*') values.push(VELOCITY.hit);
    else if (character === '^' && body[index + 1] === '*') {
      values.push(VELOCITY.accent);
      index += 1;
    } else if (character === 'g' && body[index + 1] === '*') {
      values.push(VELOCITY.ghost);
      index += 1;
    } else {
      throw new RhythmLanguageError(line, `invalid pattern character near "${body.slice(index)}".`);
    }
  }
  return values;
}

function greatestCommonDivisor(left, right) {
  let a = left;
  let b = right;
  while (b) [a, b] = [b, a % b];
  return a;
}

function combinePatterns(left, right, operator, line) {
  const length = (left.length * right.length) / greatestCommonDivisor(left.length, right.length);
  if (length > 4096) throw new RhythmLanguageError(line, 'combined pattern period exceeds 4096 slots.');
  return Array.from({ length }, (_, index) => {
    const a = left[index % left.length];
    const b = right[index % right.length];
    return operator === '+' ? Math.max(a, b) : b === VELOCITY.rest ? a : VELOCITY.rest;
  });
}

function popPattern(stack, operator, line) {
  const value = stack.pop();
  if (!value || value.type !== 'pattern') {
    throw new RhythmLanguageError(line, `${operator} needs two pattern values.`);
  }
  return value.value;
}

function evaluateExpression(tokens, definitions, line) {
  const stack = [];
  tokens.forEach(token => {
    if (token.startsWith('~')) {
      stack.push({ type: 'pattern', value: parsePatternLiteral(token, line) });
      return;
    }
    if (/^-?\d+(?:\.\d+)?$/.test(token)) {
      stack.push({ type: 'number', value: Number(token) });
      return;
    }
    if (token === '+' || token === '-') {
      const right = popPattern(stack, token, line);
      const left = popPattern(stack, token, line);
      stack.push({ type: 'pattern', value: combinePatterns(left, right, token, line) });
      return;
    }
    if (definitions.has(token)) {
      stack.push({ type: 'pattern', value: definitions.get(token) });
      return;
    }
    throw new RhythmLanguageError(line, `unknown word or pattern name "${token}".`);
  });

  if (stack.length !== 1 || stack[0].type !== 'pattern') {
    throw new RhythmLanguageError(line, 'a definition must leave exactly one pattern on the stack.');
  }
  return stack[0].value;
}

function destinationSpec(destination, instruments, line) {
  if (specialDestinations[destination]) return specialDestinations[destination];
  const normalized = explorerName(destination);
  const instrument = instruments.find(item => item.id === normalized);
  if (instrument) return { instrument: instrument.id, state: 'primary', instrumentDefinition: instrument };
  if (destination.endsWith('.center')) {
    const instrumentId = explorerName(destination.slice(0, -'.center'.length));
    const centered = instruments.find(item => item.id === instrumentId);
    if (centered) return { instrument: centered.id, state: 'primary', instrumentDefinition: centered };
  }
  throw new RhythmLanguageError(line, `unknown instrument destination "${destination}".`);
}

function materializedState(spec, velocity, line) {
  if (spec.state !== 'primary') {
    if (velocity !== VELOCITY.hit) {
      throw new RhythmLanguageError(line, `${spec.instrument}.${spec.state} currently accepts ordinary * hits only.`);
    }
    return spec.state;
  }
  if (velocity === VELOCITY.accent) return 'accent';
  if (velocity === VELOCITY.ghost) {
    if (!spec.instrumentDefinition.states.includes('ghost')) {
      throw new RhythmLanguageError(line, `${spec.instrument} cannot represent ghost velocity in the current grid.`);
    }
    return 'ghost';
  }
  return primaryState(spec.instrumentDefinition);
}

function parseSetting(tokens, state, meters, line) {
  if (tokens.length !== 2) return false;
  const [value, word] = tokens;
  if (word === 'bpm') {
    const tempo = Number(value);
    if (!Number.isFinite(tempo) || tempo < 30 || tempo > 300) {
      throw new RhythmLanguageError(line, 'bpm must be between 30 and 300.');
    }
    state.tempo = tempo;
    return true;
  }
  if (word === 'slots') {
    const slots = Number(value);
    if (!Number.isInteger(slots) || slots < 1 || slots > 1024) {
      throw new RhythmLanguageError(line, 'slots must be an integer from 1 through 1024.');
    }
    state.slots = slots;
    return true;
  }
  if (word === 'meter') {
    if (!meters[value]) throw new RhythmLanguageError(line, `unsupported meter "${value}".`);
    state.meter = value;
    return true;
  }
  return false;
}

export function compileRhythmSource(source, { currentPattern, instruments, meters }) {
  const settings = {
    tempo: currentPattern.tempo,
    meter: currentPattern.meter,
    slots: currentPattern.steps
  };
  const definitions = new Map();
  const destinations = new Map();

  source.split(/\r?\n/).forEach((rawLine, index) => {
    const line = index + 1;
    const trimmed = rawLine.trim();
    if (!trimmed || trimmed.startsWith('#')) return;
    const tokens = trimmed.split(/\s+/);
    if (parseSetting(tokens, settings, meters, line)) return;

    const destination = tokens.shift();
    if (!/^[A-Za-z][A-Za-z0-9-]*(?:\.[a-z][a-z0-9-]*)?$/.test(destination)) {
      throw new RhythmLanguageError(line, `invalid destination "${destination}".`);
    }
    if (!tokens.length) throw new RhythmLanguageError(line, `"${destination}" needs an expression.`);
    const value = evaluateExpression(tokens, definitions, line);
    definitions.set(destination, value);
    if (/^[a-z]/.test(destination)) destinations.set(destination, { value, line });
  });

  const meter = meters[settings.meter];
  const bars = settings.slots / meter.slots;
  if (![1, 2, 4, 8].includes(bars)) {
    throw new RhythmLanguageError(1, `${settings.slots} slots does not make 1, 2, 4, or 8 complete bars of ${settings.meter}.`);
  }

  const tracks = Object.fromEntries(instruments.map(instrument => [instrument.id, Array(settings.slots).fill('off')]));
  destinations.forEach(({ value, line }, destination) => {
    const spec = destinationSpec(destination, instruments, line);
    for (let step = 0; step < settings.slots; step += 1) {
      const velocity = value[step % value.length];
      if (velocity === VELOCITY.rest) continue;
      if (tracks[spec.instrument][step] !== 'off') {
        throw new RhythmLanguageError(line, `${destination} collides with another ${spec.instrument} event at slot ${step + 1}.`);
      }
      tracks[spec.instrument][step] = materializedState(spec, velocity, line);
    }
  });

  return {
    meter: settings.meter,
    bars,
    steps: settings.slots,
    tempo: settings.tempo,
    tracks
  };
}
