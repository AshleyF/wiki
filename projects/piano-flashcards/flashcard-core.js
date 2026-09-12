const NATURAL_PITCH_CLASSES = new Set([0, 2, 4, 5, 7, 9, 11]);

export const LETTER_NOTES = Object.freeze([60, 62, 64, 65, 67, 69, 71]);
export const GRAND_STAFF_NOTES = Object.freeze(
  Array.from({ length: 49 }, (_, index) => 36 + index)
);
export const PIANO_NOTES = Object.freeze(
  Array.from({ length: 88 }, (_, index) => 21 + index)
);

export function normalizeSelectedNotes(notes) {
  if (!Array.isArray(notes)) return [];
  return [...new Set(notes)]
    .filter(note => Number.isInteger(note) && note >= 21 && note <= 108)
    .sort((a, b) => a - b);
}

export const NOTE_RANGES = Object.freeze({
  bass: Object.freeze({ minimum: 36, maximum: 59, staff: 'bass' }),
  treble: Object.freeze({ minimum: 60, maximum: 84, staff: 'treble' }),
  octave1: Object.freeze({ minimum: 24, maximum: 35, staff: 'bass' }),
  low: Object.freeze({ minimum: 36, maximum: 47, staff: 'bass' }),
  lowerMiddle: Object.freeze({ minimum: 48, maximum: 59, staff: 'bass' }),
  middle: Object.freeze({ minimum: 60, maximum: 71, staff: 'treble' }),
  upper: Object.freeze({ minimum: 72, maximum: 83, staff: 'treble' }),
  octave6: Object.freeze({ minimum: 84, maximum: 95, staff: 'treble' }),
  octave7: Object.freeze({ minimum: 96, maximum: 107, staff: 'treble' }),
  two: Object.freeze({ minimum: 48, maximum: 72, staff: 'grand' }),
  grand: Object.freeze({ minimum: 36, maximum: 84, staff: 'grand' }),
  piano: Object.freeze({ minimum: 21, maximum: 108, staff: 'grand' })
});

export function noteRange(range, fallback = 'grand') {
  return NOTE_RANGES[range] || NOTE_RANGES[fallback] || NOTE_RANGES.grand;
}

export function notesForSettings({ mode = 'letter', range = null, includeAccidentals = false, selectedNotes = null } = {}) {
  if (Array.isArray(selectedNotes)) return normalizeSelectedNotes(selectedNotes);
  const defaultRange = mode === 'letter' ? 'middle' : 'grand';
  const selected = noteRange(range, defaultRange);
  return PIANO_NOTES.filter(note => (
    note >= selected.minimum
    && note <= selected.maximum
    && (includeAccidentals || isNaturalNote(note))
  ));
}

export function spreadSample(pool, count, random = Math.random) {
  const notes = normalizeSelectedNotes(pool);
  const size = Math.max(0, Math.min(notes.length, Math.floor(Number(count) || 0)));
  if (!size) return [];
  if (size === notes.length) return notes;
  return Array.from({ length: size }, (_, index) => {
    const start = Math.floor((index * notes.length) / size);
    const end = Math.max(start + 1, Math.floor(((index + 1) * notes.length) / size));
    const offset = Math.min(end - start - 1, Math.floor(Math.max(0, Math.min(.999999, random())) * (end - start)));
    return notes[start + offset];
  });
}

export function addSpreadNotes(selection, pool, count, random = Math.random) {
  const selected = normalizeSelectedNotes(selection);
  const candidates = normalizeSelectedNotes(pool).filter(note => !selected.includes(note));
  const additions = [];
  const size = Math.max(0, Math.min(candidates.length, Math.floor(Number(count) || 0)));
  while (additions.length < size) {
    const anchors = [...selected, ...additions];
    const distances = candidates.map(note => anchors.length
      ? Math.min(...anchors.map(anchor => Math.abs(note - anchor)))
      : Infinity);
    const maximum = Math.max(...distances);
    const best = candidates.filter((note, index) => distances[index] === maximum && !additions.includes(note));
    const available = best.length ? best : candidates.filter(note => !additions.includes(note));
    const index = Math.min(available.length - 1, Math.floor(Math.max(0, Math.min(.999999, random())) * available.length));
    additions.push(available[index]);
  }
  return normalizeSelectedNotes([...selected, ...additions]);
}

export function addRandomNotes(selection, pool, count, random = Math.random) {
  const selected = normalizeSelectedNotes(selection);
  const candidates = normalizeSelectedNotes(pool).filter(note => !selected.includes(note));
  const additions = [];
  const size = Math.max(0, Math.min(candidates.length, Math.floor(Number(count) || 0)));
  while (additions.length < size) {
    const available = candidates.filter(note => !additions.includes(note));
    const index = Math.min(available.length - 1, Math.floor(Math.max(0, Math.min(.999999, random())) * available.length));
    additions.push(available[index]);
  }
  return normalizeSelectedNotes([...selected, ...additions]);
}

export function removeRandomNotes(selection, count, random = Math.random) {
  const remaining = normalizeSelectedNotes(selection);
  const size = Math.max(0, Math.min(remaining.length, Math.floor(Number(count) || 0)));
  for (let index = 0; index < size; index += 1) {
    const removal = Math.min(remaining.length - 1, Math.floor(Math.max(0, Math.min(.999999, random())) * remaining.length));
    remaining.splice(removal, 1);
  }
  return remaining;
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
