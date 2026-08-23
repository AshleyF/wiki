import assert from 'node:assert/strict';
import { classifyAttempt, cursorXAt, midiName, midiToVexKey } from './trainer-core.js';

assert.equal(midiName(60), 'C4');
assert.equal(midiName(70), 'B♭4');
assert.equal(midiToVexKey(61), 'c#/4');
assert.equal(classifyAttempt({ played: 60, expected: 60, now: 1000, due: 1000, tolerance: 100 }).result, 'correct');
assert.equal(classifyAttempt({ played: 60, expected: 60, now: 899, due: 1000, tolerance: 100 }).result, 'early');
assert.equal(classifyAttempt({ played: 61, expected: 60, now: 1000, due: 1000, tolerance: 100 }).result, 'wrong');
assert.equal(classifyAttempt({ played: 60, expected: 60, now: 1101, due: 1000, tolerance: 100 }).result, 'late');
assert.equal(cursorXAt(1000, 1000, 500, [100, 200]), 100);
assert.equal(cursorXAt(1250, 1000, 500, [100, 200]), 150);

console.log('piano trainer core tests passed');
