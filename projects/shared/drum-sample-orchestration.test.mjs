import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import {
  FIXED_DRUM_SAMPLE_KIT_IDS,
  alternatingClosedHiHatArticulation,
  closedHiHatMidiNote
} from './drum-sample-orchestration.js';

test('fixed acoustic drum kits use stable manifest IDs', () => {
  assert.deepEqual(FIXED_DRUM_SAMPLE_KIT_IDS, {
    kickCenter: 'kick-center',
    closedHiHatTip: 'hi-hat-closed-tip',
    closedHiHatEdge: 'hi-hat-closed-edge',
    crashBow: 'crash-cymbal-bow',
    highTomCenter: 'high-tom-center',
    midTomCenter: 'mid-tom-center',
    floorTomCenter: 'floor-tom-center'
  });
});

test('every fixed acoustic kit ID is discoverable in the drum library', async () => {
  const libraryUrl = new URL('../rhythm-explorer/assets/drums/library.json', import.meta.url);
  const library = JSON.parse(await readFile(libraryUrl, 'utf8'));
  const discoveredIds = new Set(
    library.drums.flatMap(drum => drum.articulations.map(articulation => articulation.kit_id))
  );

  Object.values(FIXED_DRUM_SAMPLE_KIT_IDS).forEach(kitId => {
    assert.ok(discoveredIds.has(kitId), `${kitId} is missing from the drum sample library`);
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
