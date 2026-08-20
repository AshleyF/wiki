import assert from 'node:assert/strict';
import {
  euclideanPattern,
  evaluateClauses,
  expressionPeriod,
  formatExpression,
  formatPatternExpression,
  patternExpressionPeriod,
  renderPatternTrack,
  renderTrack,
  snapRangeValue,
  trackTimingOffsetSeconds
} from './euclidean-core.js';

const bits = pattern => pattern.map(value => value ? 'x' : '.').join('');

assert.equal(bits(euclideanPattern(3, 8)), 'x..x..x.');
assert.equal(bits(euclideanPattern(3, 8, 1)), '.x..x..x');
assert.equal(bits(euclideanPattern(0, 8)), '........');
assert.equal(bits(euclideanPattern(8, 8)), 'xxxxxxxx');

const generators = {
  A: { pulses: 3, steps: 8, rotation: 0 },
  B: { pulses: 2, steps: 8, rotation: 2 }
};
assert.equal(bits(renderTrack([
  { generator: 'A' },
  { operation: 'union', generator: 'B' }
], generators, 8)), 'x.xx..x.');
assert.equal(bits(renderTrack([
  { generator: 'A' },
  { operation: 'difference', generator: 'B' }
], generators, 8)), 'x..x....');
assert.equal(evaluateClauses([{ generator: 'A' }], generators, 11), true);
assert.equal(expressionPeriod([{ generator: 'A' }, { generator: 'B' }], generators), 8);
assert.equal(expressionPeriod([{ generator: 'A' }, { generator: 'C' }], {
  ...generators,
  C: { pulses: 2, steps: 5, rotation: 0 }
}), 40);
assert.equal(formatExpression([
  { generator: 'A' },
  { operation: 'difference', generator: 'B' },
  { operation: 'xor', generator: 'C' }
]), 'A − B ⊕ C');

const inlineClauses = [
  { pattern: { pulses: 3, steps: 8, rotation: 0 } },
  { operation: 'difference', pattern: { pulses: 2, steps: 8, rotation: 2 } }
];
assert.equal(bits(renderPatternTrack(inlineClauses, 8)), 'x..x....');
assert.equal(patternExpressionPeriod(inlineClauses), 8);
assert.equal(formatPatternExpression(inlineClauses), 'E(3,8) − E(2,8) r2');

assert.equal(trackTimingOffsetSeconds(0, 0.125, 66.667, 0), 0);
assert.ok(Math.abs(trackTimingOffsetSeconds(1, 0.125, 66.667, 0) - (1 / 24)) < 0.00001);
assert.ok(Math.abs(trackTimingOffsetSeconds(1, 0.125, 50, -20) + 0.02) < 0.00001);
assert.ok(Math.abs(trackTimingOffsetSeconds(2, 0.125, 83.333, 80) - 0.08) < 0.00001);
assert.equal(trackTimingOffsetSeconds(1, 0.125, 66.667, 0, 2), 0);
assert.ok(Math.abs(trackTimingOffsetSeconds(2, 0.125, 66.667, 0, 2) - (1 / 12)) < 0.00001);
assert.equal(trackTimingOffsetSeconds(3, 0.125, 66.667, 0, 2), 0);
const eighthSwingAcrossSixteenthGrid = Array.from({ length: 16 }, (_, slot) => (
  trackTimingOffsetSeconds(slot, 0.125, 66.667, 0, 2)
));
for (const beatSlot of [0, 4, 8, 12]) assert.equal(eighthSwingAcrossSixteenthGrid[beatSlot], 0);
for (const andSlot of [2, 6, 10, 14]) assert.ok(Math.abs(eighthSwingAcrossSixteenthGrid[andSlot] - (1 / 12)) < 0.00001);
for (const innerSixteenth of [1, 3, 5, 7, 9, 11, 13, 15]) assert.equal(eighthSwingAcrossSixteenthGrid[innerSixteenth], 0);
assert.equal(snapRangeValue(66.2, 66.667, 0.6), 66.667);
assert.equal(snapRangeValue(65.9, 66.667, 0.6), 65.9);
assert.equal(snapRangeValue(-2, 0, 2), 0);
assert.equal(snapRangeValue(-3, 0, 2), -3);

console.log('euclidean-core tests passed');
