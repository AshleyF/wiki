import assert from 'node:assert/strict';
import { GRAND_STAFF_NOTES, LETTER_NOTES, accuracy, chooseNextNote, letterPrompt, notesForMode } from './flashcard-core.js';

assert.deepEqual(notesForMode('letter'), LETTER_NOTES);
assert.deepEqual(notesForMode('staff'), GRAND_STAFF_NOTES);
assert.equal(GRAND_STAFF_NOTES[0], 36);
assert.equal(GRAND_STAFF_NOTES.at(-1), 84);
assert.equal(chooseNextNote([60, 62], 60, () => 0), 62);
assert.equal(chooseNextNote([60], 60, () => 0.9), 60);
assert.equal(letterPrompt(60), 'C');
assert.equal(letterPrompt(70), 'B♭');
assert.equal(accuracy(3, 1), 75);
assert.equal(accuracy(0, 0), null);

console.log('piano flashcard core tests passed');
