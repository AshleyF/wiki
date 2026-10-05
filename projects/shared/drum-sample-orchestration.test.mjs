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
    kickCenter: 'superior-drummer-current-kick-center',
    closedHiHatTip: 'superior-drummer-current-hihat-closed-tip',
    closedHiHatEdge: 'superior-drummer-current-hihat-closed-edge',
    openHiHatTip: 'superior-drummer-current-hihat-open-tip',
    pedalHiHatChick: 'superior-drummer-current-hihat-pedal-chick',
    crashBow: 'crash-cymbal-bow',
    crashChoke: 'crash-cymbal-choke',
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

test('pedal chick metadata keeps every attack aligned to its scheduled event', async () => {
  const manifestUrl = new URL(
    '../rhythm-explorer/assets/drums/hi-hats/superior-drummer-current/pedal-chick/kit.json',
    import.meta.url
  );
  const manifest = JSON.parse(await readFile(manifestUrl, 'utf8'));

  manifest.samples.forEach(sample => {
    assert.ok(sample.playback_offset_seconds > 0, `${sample.id} has a detected attack offset`);
    const peakAfterStart = sample.attack_peak_seconds - sample.playback_offset_seconds;
    assert.ok(peakAfterStart >= 0 && peakAfterStart <= .025, `${sample.id} starts within 25 ms of its attack peak`);
  });
});

test('exported open and pedal hi-hat kits include their measured playback gain', async () => {
  const openManifest = JSON.parse(await readFile(new URL(
    '../rhythm-explorer/assets/drums/hi-hats/superior-drummer-current/open-tip/kit.json',
    import.meta.url
  ), 'utf8'));
  const pedalManifest = JSON.parse(await readFile(new URL(
    '../rhythm-explorer/assets/drums/hi-hats/superior-drummer-current/pedal-chick/kit.json',
    import.meta.url
  ), 'utf8'));

  assert.equal(openManifest.gain.playback_gain_db, 20);
  assert.equal(pedalManifest.gain.playback_gain_db, 22);
});
