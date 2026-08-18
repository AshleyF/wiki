import assert from 'node:assert/strict';
import { compileRhythmSource, serializeRhythmPattern } from './rhythm-language.js';

const instruments = [
  { id: 'hh', states: ['off', 'closed', 'open', 'bark', 'accent'] },
  { id: 'ph', states: ['off', 'chick', 'splash', 'accent'] },
  { id: 'sn', states: ['off', 'hit', 'ghost', 'cross-stick', 'flam', 'drag', 'accent'] },
  { id: 'bd', states: ['off', 'hit', 'accent'] }
];
const meters = { '4/4': { slots: 16 }, '3/4': { slots: 12 } };

const pattern = {
  meter: '4/4', bars: 2, steps: 32, tempo: 96,
  tracks: {
    hh: Array.from({ length: 32 }, (_, step) => step % 2 ? 'off' : step % 4 ? 'closed' : 'accent'),
    ph: Array(32).fill('off'),
    sn: Array.from({ length: 32 }, (_, step) => step % 16 === 4 ? 'ghost' : step % 8 === 4 ? 'accent' : 'off'),
    bd: Array.from({ length: 32 }, (_, step) => step % 8 === 0 ? 'hit' : 'off')
  }
};

const source = serializeRhythmPattern(pattern, instruments);
assert.match(source, /^32 slots\n4\/4 meter\n96 bpm/m);
assert.match(source, /^hh ~\^\*\.\*\.$/m);
assert.match(source, /^kk ~\*\.\.\.\.\.\.\.$/m);
assert.deepEqual(compileRhythmSource(source, { currentPattern: pattern, instruments, meters }), pattern);

const algebra = compileRhythmSource(`16 slots
4/4 meter
120 bpm
A ~*...
sn A
hh ~* A -`, { currentPattern: pattern, instruments, meters });
assert.deepEqual(algebra.tracks.sn.slice(0, 8), ['hit', 'off', 'off', 'off', 'hit', 'off', 'off', 'off']);
assert.deepEqual(algebra.tracks.hh.slice(0, 8), ['off', 'closed', 'closed', 'closed', 'off', 'closed', 'closed', 'closed']);

const articulations = compileRhythmSource(`16 slots
4/4 meter
90 bpm
sn ~^*...g*...
sn.cross ~..*.....
hh.open ~......*.
ph.splash ~.......*`, { currentPattern: pattern, instruments, meters });
assert.equal(articulations.tracks.sn[0], 'accent');
assert.equal(articulations.tracks.sn[2], 'cross-stick');
assert.equal(articulations.tracks.sn[4], 'ghost');
assert.equal(articulations.tracks.hh[6], 'open');
assert.equal(articulations.tracks.ph[7], 'splash');

assert.throws(
  () => compileRhythmSource('16 slots\n4/4 meter\nsn ~*\nsn.cross ~*', { currentPattern: pattern, instruments, meters }),
  /collides/
);

console.log('rhythm-language tests passed');
