import assert from 'node:assert/strict';
import { classifyAttempt, cursorXAt, cursorXAtTimeline, midiName, midiToVexKey, samePitchSet } from './trainer-core.js';

assert.equal(midiName(60), 'C4');
assert.equal(midiName(70), 'B♭4');
assert.equal(midiToVexKey(61), 'c#/4');
assert.equal(classifyAttempt({ played: 60, expected: 60, now: 1000, due: 1000, tolerance: 100 }).result, 'correct');
assert.equal(classifyAttempt({ played: 60, expected: 60, now: 899, due: 1000, tolerance: 100 }).result, 'early');
assert.equal(classifyAttempt({ played: 61, expected: 60, now: 1000, due: 1000, tolerance: 100 }).result, 'wrong');
assert.equal(classifyAttempt({ played: 60, expected: 60, now: 1101, due: 1000, tolerance: 100 }).result, 'late');
assert.equal(classifyAttempt({ played: [67, 60, 64], expected: [60, 64, 67], now: 1000, due: 1000, tolerance: 100 }).result, 'correct');
assert.equal(classifyAttempt({ played: [60, 64], expected: [60, 64, 67], now: 1000, due: 1000, tolerance: 100 }).result, 'wrong');
assert.equal(samePitchSet([60, 64, 67, 60], [67, 64, 60]), true);
assert.equal(cursorXAt(1000, 1000, 500, [100, 200]), 100);
assert.equal(cursorXAt(1250, 1000, 500, [100, 200]), 150);
assert.equal(cursorXAtTimeline(1500, 1000, 500, [0, 2, 3], [100, 200, 300]), 150);

console.log('piano trainer core tests passed');
