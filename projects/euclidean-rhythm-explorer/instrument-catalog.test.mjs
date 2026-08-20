import assert from 'node:assert/strict';
import { INSTRUMENTS, instrumentById, instrumentGroups } from './instrument-catalog.js';

assert.equal(new Set(INSTRUMENTS.map(instrument => instrument.id)).size, INSTRUMENTS.length);
assert.ok(INSTRUMENTS.length >= 45);
INSTRUMENTS.forEach(instrument => {
  assert.ok(Number.isInteger(instrument.midi) && instrument.midi >= 0 && instrument.midi <= 127);
  assert.equal(instrument.pattern.length, 3);
});
assert.equal(instrumentById('kick').midi, 36);
assert.equal(instrumentById('snare').midi, 38);
assert.equal(instrumentById('cross-stick').midi, 37);
assert.equal(instrumentById('snare-rimshot').midi, 40);
assert.equal(instrumentById('brush-swirl-backward').midi, 66);
assert.equal(instrumentById('brush-swirl-forward').midi, 67);
assert.equal(instrumentById('hat-closed').midi, 42);
assert.equal(instrumentById('hat-open').midi, 46);
assert.equal(instrumentById('ride-bell').midi, 53);
assert.equal(instrumentById('cowbell').midi, 56);
assert.ok(instrumentGroups().has('Toms'));
assert.ok(instrumentGroups().has('Brushes'));

console.log('instrument-catalog tests passed');
