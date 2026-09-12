import assert from 'node:assert/strict';
import { GRAND_STAFF_NOTES, LETTER_NOTES, PIANO_NOTES, accuracy, addRandomNotes, addSpreadNotes, chooseNextNote, letterPrompt, normalizeSelectedNotes, noteRange, notesForMode, notesForSettings, removeRandomNotes, spreadSample } from './flashcard-core.js';

assert.deepEqual(notesForMode('letter'), LETTER_NOTES);
assert.deepEqual(notesForMode('staff'), GRAND_STAFF_NOTES);
assert.equal(PIANO_NOTES.length, 88);
assert.deepEqual([PIANO_NOTES[0], PIANO_NOTES.at(-1)], [21, 108]);
assert.equal(GRAND_STAFF_NOTES[0], 36);
assert.equal(GRAND_STAFF_NOTES.at(-1), 84);
assert.deepEqual(notesForSettings({ mode: 'staff', range: 'middle', includeAccidentals: false }), LETTER_NOTES);
assert.deepEqual(notesForSettings({ mode: 'staff', range: 'middle', includeAccidentals: true }), Array.from({ length: 12 }, (_, index) => 60 + index));
assert.ok(notesForSettings({ mode: 'staff', range: 'grand', includeAccidentals: false }).every(note => [0, 2, 4, 5, 7, 9, 11].includes(note % 12)));
assert.ok(notesForSettings({ mode: 'staff', range: 'middle', includeAccidentals: false }).every(note => note >= 60 && note <= 71));
assert.equal(notesForSettings({ mode: 'ear', range: 'two', includeAccidentals: false })[0], 48);
assert.equal(notesForSettings({ mode: 'ear', range: 'two', includeAccidentals: false }).at(-1), 72);
assert.equal(notesForSettings({ mode: 'staff', range: 'bass', includeAccidentals: false })[0], 36);
assert.equal(notesForSettings({ mode: 'staff', range: 'bass', includeAccidentals: false }).at(-1), 59);
assert.equal(notesForSettings({ mode: 'staff', range: 'treble', includeAccidentals: false })[0], 60);
assert.equal(notesForSettings({ mode: 'staff', range: 'treble', includeAccidentals: false }).at(-1), 84);
assert.deepEqual(
  ['octave1', 'octave6', 'octave7'].map(range => notesForSettings({ mode: 'staff', range, includeAccidentals: false }).length),
  [7, 7, 7]
);
assert.deepEqual(
  ['low', 'lowerMiddle', 'middle', 'upper'].map(range => notesForSettings({ mode: 'staff', range, includeAccidentals: true }).length),
  [12, 12, 12, 12]
);
assert.equal(noteRange('bass').staff, 'bass');
assert.equal(noteRange('treble').staff, 'treble');
assert.equal(noteRange('unknown').staff, 'grand');
assert.deepEqual(normalizeSelectedNotes([108, 60, 60, 20, 109, 64]), [60, 64, 108]);
assert.deepEqual(notesForSettings({ mode: 'staff', selectedNotes: [61, 72, 48] }), [48, 61, 72]);
assert.deepEqual(spreadSample([36, 40, 44, 48, 52, 56, 60, 64], 4, () => 0), [36, 44, 52, 60]);
assert.deepEqual(addSpreadNotes([48, 60], [36, 42, 48, 54, 60, 66, 72], 2, () => 0), [36, 48, 60, 72]);
assert.deepEqual(addRandomNotes([48], [36, 42, 48, 54], 2, () => 0), [36, 42, 48]);
assert.deepEqual(removeRandomNotes([36, 42, 48], 1, () => 0), [42, 48]);
assert.equal(chooseNextNote([60, 62], 60, () => 0), 62);
assert.equal(chooseNextNote([60], 60, () => 0.9), 60);
assert.equal(letterPrompt(60), 'C');
assert.equal(letterPrompt(70), 'B♭');
assert.equal(accuracy(3, 1), 75);
assert.equal(accuracy(0, 0), null);

console.log('piano flashcard core tests passed');
