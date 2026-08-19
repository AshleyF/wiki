import assert from 'node:assert/strict';
import {
  euclideanPattern,
  evaluateClauses,
  expressionPeriod,
  formatExpression,
  formatPatternExpression,
  patternExpressionPeriod,
  renderPatternTrack,
  renderTrack
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

console.log('euclidean-core tests passed');
