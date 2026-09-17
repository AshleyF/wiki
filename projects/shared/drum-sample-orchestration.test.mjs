import test from 'node:test';
import assert from 'node:assert/strict';
import {
  FIXED_DRUM_SAMPLE_KIT_IDS,
  alternatingClosedHiHatArticulation,
  closedHiHatMidiNote
} from './drum-sample-orchestration.js';

test('fixed acoustic drum kits use stable manifest IDs', () => {
  assert.deepEqual(FIXED_DRUM_SAMPLE_KIT_IDS, {
    kickCenter: 'kick-center',
    closedHiHatTip: 'hi-hat-closed-tip',
    closedHiHatEdge: 'hi-hat-closed-edge'
  });
});

test('successive closed hi-hat strokes alternate edge and tip', () => {
  assert.deepEqual(
    Array.from({ length: 6 }, (_, index) => alternatingClosedHiHatArticulation(index)),
    ['closed-edge', 'closed-tip', 'closed-edge', 'closed-tip', 'closed-edge', 'closed-tip']
  );
  assert.equal(closedHiHatMidiNote('closed-edge'), 22);
  assert.equal(closedHiHatMidiNote('closed-tip'), 42);
});
