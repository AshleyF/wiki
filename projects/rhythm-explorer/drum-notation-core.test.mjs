import assert from 'node:assert/strict';
import test from 'node:test';
import { DRUM_HIDDEN_TRIPLET_SPELLINGS } from './drum-notation-core.js';

test('reduced triplet spellings consume exactly three source slots', () => {
  for (const [mask,spelling] of Object.entries(DRUM_HIDDEN_TRIPLET_SPELLINGS)) {
    assert.equal(spelling.events.reduce((sum,event) => sum+event.slots,0),3,mask);
  }
});

test('core vocabulary cells retain the wiki engraving', () => {
  assert.deepEqual(DRUM_HIDDEN_TRIPLET_SPELLINGS['100'].events,[{ step:0,slots:3,duration:'4' }]);
  assert.deepEqual(DRUM_HIDDEN_TRIPLET_SPELLINGS['101'].events,[{ step:0,slots:2,duration:'4' },{ step:2,slots:1,duration:'8' }]);
  assert.equal(DRUM_HIDDEN_TRIPLET_SPELLINGS['010'].extendThroughLastDuration,true);
  assert.equal(DRUM_HIDDEN_TRIPLET_SPELLINGS['110'].events.at(-1).rest,true);
});
