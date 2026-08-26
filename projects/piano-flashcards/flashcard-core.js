const NATURAL_PITCH_CLASSES = new Set([0, 2, 4, 5, 7, 9, 11]);

export const LETTER_NOTES = Object.freeze([60, 62, 64, 65, 67, 69, 71]);
export const GRAND_STAFF_NOTES = Object.freeze(
  Array.from({ length: 49 }, (_, index) => 36 + index)
);

export const NOTE_RANGES = Object.freeze({
  middle: Object.freeze({ minimum: 60, maximum: 71 }),
  two: Object.freeze({ minimum: 48, maximum: 72 }),
  grand: Object.freeze({ minimum: 36, maximum: 84 })
});

export function notesForSettings({ mode = 'letter', range = null, includeAccidentals = false } = {}) {
  const defaultRange = mode === 'letter' ? 'middle' : 'grand';
  const selected = NOTE_RANGES[range] || NOTE_RANGES[defaultRange];
  return GRAND_STAFF_NOTES.filter(note => (
    note >= selected.minimum
    && note <= selected.maximum
    && (includeAccidentals || isNaturalNote(note))
  ));
}

export function notesForMode(mode) {
  return notesForSettings({ mode, includeAccidentals: mode !== 'letter' });
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
