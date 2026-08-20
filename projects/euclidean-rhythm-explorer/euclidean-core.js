export const OPERATIONS = Object.freeze({
  union: (left, right) => left || right,
  difference: (left, right) => left && !right,
  intersection: (left, right) => left && right,
  xor: (left, right) => Boolean(left) !== Boolean(right)
});

export function clampInteger(value, minimum, maximum) {
  return Math.max(minimum, Math.min(maximum, Math.round(Number(value) || 0)));
}

export function euclideanPattern(pulses, steps, rotation = 0) {
  const length = clampInteger(steps, 1, 64);
  const hits = clampInteger(pulses, 0, length);
  const phase = ((Math.round(Number(rotation) || 0) % length) + length) % length;
  if (hits === 0) return Array(length).fill(false);
  if (hits === length) return Array(length).fill(true);

  const canonical = Array.from({ length }, (_, index) => ((index * hits) % length) < hits);
  return Array.from({ length }, (_, index) => canonical[(index - phase + length) % length]);
}

export function generatorValue(generator, slot) {
  if (!generator || generator.enabled === false) return false;
  const pattern = euclideanPattern(generator.pulses, generator.steps, generator.rotation);
  return pattern[((slot % pattern.length) + pattern.length) % pattern.length];
}

export function evaluatePatternClauses(clauses, slot) {
  if (!Array.isArray(clauses) || clauses.length === 0) return false;
  let value = generatorValue(clauses[0].pattern, slot);
  for (const clause of clauses.slice(1)) {
    const operation = OPERATIONS[clause.operation] || OPERATIONS.union;
    value = operation(value, generatorValue(clause.pattern, slot));
  }
  return value;
}

export function renderPatternTrack(clauses, totalSlots) {
  return Array.from({ length: Math.max(0, Math.round(totalSlots) || 0) }, (_, slot) => (
    evaluatePatternClauses(clauses, slot)
  ));
}

export function trackTimingOffsetSeconds(slot, secondsPerSlot, swingPercent = 50, timingOffsetMs = 0, slotsPerSwingUnit = 1) {
  const step = Math.max(0, Number(secondsPerSlot) || 0);
  const swing = Math.max(50, Math.min(83.333, Number(swingPercent) || 50)) / 100;
  const unitSlots = Math.max(Number.EPSILON, Number(slotsPerSwingUnit) || 1);
  const unitIndex = (Number(slot) || 0) / unitSlots;
  const wholeUnitIndex = Math.round(unitIndex);
  const isUnitBoundary = Math.abs(unitIndex - wholeUnitIndex) < 0.000001;
  const isOffbeat = isUnitBoundary && Math.abs(wholeUnitIndex) % 2 === 1;
  const swingDelay = isOffbeat ? step * unitSlots * 2 * (swing - 0.5) : 0;
  const placement = Math.max(-80, Math.min(80, Number(timingOffsetMs) || 0)) / 1000;
  return swingDelay + placement;
}

export function snapRangeValue(value, center, threshold) {
  const amount = Number(value) || 0;
  const midpoint = Number(center) || 0;
  const radius = Math.max(0, Number(threshold) || 0);
  return Math.abs(amount - midpoint) <= radius ? midpoint : amount;
}

export function evaluateClauses(clauses, generators, slot) {
  if (!Array.isArray(clauses) || clauses.length === 0) return false;
  let value = generatorValue(generators[clauses[0].generator], slot);
  for (const clause of clauses.slice(1)) {
    const operation = OPERATIONS[clause.operation] || OPERATIONS.union;
    value = operation(value, generatorValue(generators[clause.generator], slot));
  }
  return value;
}

export function renderTrack(clauses, generators, totalSlots) {
  return Array.from({ length: Math.max(0, Math.round(totalSlots) || 0) }, (_, slot) => (
    evaluateClauses(clauses, generators, slot)
  ));
}

export function greatestCommonDivisor(a, b) {
  let left = Math.abs(Math.round(a));
  let right = Math.abs(Math.round(b));
  while (right) [left, right] = [right, left % right];
  return left || 1;
}

export function leastCommonMultiple(a, b) {
  const left = Math.max(1, Math.abs(Math.round(a)));
  const right = Math.max(1, Math.abs(Math.round(b)));
  return left / greatestCommonDivisor(left, right) * right;
}

export function expressionPeriod(clauses, generators, limit = 100000) {
  let period = 1;
  const names = new Set((clauses || []).map(clause => clause.generator));
  for (const name of names) {
    const generator = generators[name];
    if (!generator || generator.enabled === false) continue;
    period = leastCommonMultiple(period, generator.steps);
    if (period > limit) return null;
  }
  return period;
}

export function patternExpressionPeriod(clauses, limit = 100000) {
  let period = 1;
  for (const clause of clauses || []) {
    if (!clause.pattern || clause.pattern.enabled === false) continue;
    period = leastCommonMultiple(period, clause.pattern.steps);
    if (period > limit) return null;
  }
  return period;
}

export function formatExpression(clauses) {
  if (!clauses?.length) return '—';
  const symbols = { union: '∪', difference: '−', intersection: '∩', xor: '⊕' };
  return clauses.map((clause, index) => (
    index === 0 ? clause.generator : `${symbols[clause.operation] || '∪'} ${clause.generator}`
  )).join(' ');
}

export function formatPatternExpression(clauses) {
  if (!clauses?.length) return '—';
  const symbols = { union: '∪', difference: '−', intersection: '∩', xor: '⊕' };
  return clauses.map((clause, index) => {
    const pattern = clause.pattern || {};
    const term = `E(${pattern.pulses ?? 0},${pattern.steps ?? 1})${pattern.rotation ? ` r${pattern.rotation}` : ''}`;
    return index === 0 ? term : `${symbols[clause.operation] || '∪'} ${term}`;
  }).join(' ');
}
