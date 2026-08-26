const NATURAL_PITCH_CLASSES = new Set([0, 2, 4, 5, 7, 9, 11]);

export const LETTER_NOTES = Object.freeze([60, 62, 64, 65, 67, 69, 71]);
export const GRAND_STAFF_NOTES = Object.freeze(
  Array.from({ length: 49 }, (_, index) => 36 + index)
);

export function notesForMode(mode) {
  return mode === 'letter' ? [...LETTER_NOTES] : [...GRAND_STAFF_NOTES];
}

export function chooseNextNote(pool, previous = null, random = Math.random) {
  const notes = [...new Set(pool)].filter(note => Number.isInteger(note) && note >= 0 && note <= 127);
  if (!notes.length) throw new Error('The flashcard note pool is empty.');
  if (notes.length === 1) return notes[0];
  const candidates = notes.filter(note => note !== previous);
  const index = Math.min(candidates.length - 1, Math.floor(Math.max(0, Math.min(0.999999, random())) * candidates.length));
  return candidates[index];
}

export function isNaturalNote(midi) {
  return NATURAL_PITCH_CLASSES.has(((Number(midi) % 12) + 12) % 12);
}

export function letterPrompt(midi) {
  const names = ['C', 'C♯', 'D', 'E♭', 'E', 'F', 'F♯', 'G', 'A♭', 'A', 'B♭', 'B'];
  return names[((Number(midi) % 12) + 12) % 12];
}

export function accuracy(correct, missed) {
  const total = Math.max(0, Number(correct) || 0) + Math.max(0, Number(missed) || 0);
  return total ? Math.round((Math.max(0, Number(correct) || 0) / total) * 100) : null;
}
