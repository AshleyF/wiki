export function clamp(value, minimum, maximum) {
  return Math.max(minimum, Math.min(maximum, Number(value) || 0));
}

export function midiName(midi) {
  const names = ['C', 'C♯', 'D', 'E♭', 'E', 'F', 'F♯', 'G', 'A♭', 'A', 'B♭', 'B'];
  const note = Math.round(Number(midi) || 0);
  return `${names[((note % 12) + 12) % 12]}${Math.floor(note / 12) - 1}`;
}

export function midiToVexKey(midi) {
  const names = ['c', 'c#', 'd', 'eb', 'e', 'f', 'f#', 'g', 'ab', 'a', 'bb', 'b'];
  const note = Math.round(Number(midi) || 0);
  return `${names[((note % 12) + 12) % 12]}/${Math.floor(note / 12) - 1}`;
}

export function vexAccidentalForKey(key) {
  const pitch = String(key).split('/')[0];
  if (pitch.endsWith('#')) return '#';
  if (pitch.length > 1 && pitch.endsWith('b')) return 'b';
  return null;
}

export function samePitchSet(played, expected) {
  const left = [...new Set(Array.isArray(played) ? played : [played])].map(Number).sort((a, b) => a - b);
  const right = [...new Set(Array.isArray(expected) ? expected : [expected])].map(Number).sort((a, b) => a - b);
  return left.length === right.length && left.every((note, index) => note === right[index]);
}

export function classifyAttempt({ played, expected, now, due, tolerance }) {
  const window = clamp(tolerance, 20, 500);
  if (now < due - window) return { result: 'early', difference: now - due };
  if (now > due + window) return { result: 'late', difference: now - due };
  if (!samePitchSet(played, expected)) return { result: 'wrong', difference: now - due };
  return { result: 'correct', difference: now - due };
}

export function classifyMidiPress({ played, expected, now, due, tolerance, holdAllowance }) {
  const attempt = classifyAttempt({ played, expected, now, due, tolerance });
  const allowance = clamp(holdAllowance, 0, 1000);
  const window = clamp(tolerance, 20, 500);
  if (
    attempt.result === 'early'
    && samePitchSet(played, expected)
    && now >= due - window - allowance
  ) return { ...attempt, result: 'held' };
  return attempt;
}

export function heldPressReady({ candidateIndex, currentIndex, candidateNotes, heldNotes, now, due, tolerance }) {
  const notes = Array.isArray(candidateNotes) ? candidateNotes : [candidateNotes];
  const held = new Set(Array.isArray(heldNotes) ? heldNotes : [...heldNotes]);
  return candidateIndex === currentIndex
    && notes.length > 0
    && notes.every(note => held.has(note))
    && now >= due - clamp(tolerance, 20, 500);
}

export function cursorXAt(time, startTime, beatMs, noteXs) {
  if (!noteXs.length) return 0;
  const firstApproach = noteXs[0] - 54;
  if (time <= startTime) {
    const phase = clamp((time - (startTime - beatMs)) / beatMs, 0, 1);
    return firstApproach + (noteXs[0] - firstApproach) * phase;
  }
  const position = (time - startTime) / beatMs;
  const index = Math.floor(position);
  if (index >= noteXs.length - 1) return noteXs[noteXs.length - 1];
  const phase = clamp(position - index, 0, 1);
  return noteXs[index] + (noteXs[index + 1] - noteXs[index]) * phase;
}

export function cursorXAtTimeline(time, startTime, beatMs, beatOffsets, noteXs) {
  if (!noteXs.length) return 0;
  if (time <= startTime) return cursorXAt(time, startTime, beatMs, noteXs.slice(0, 2));
  const beat = (time - startTime) / beatMs;
  let index = beatOffsets.findIndex((offset, candidate) => candidate > 0 && offset > beat);
  if (index === -1) return noteXs[noteXs.length - 1];
  index -= 1;
  const fromBeat = beatOffsets[index];
  const toBeat = beatOffsets[index + 1];
  const phase = clamp((beat - fromBeat) / Math.max(Number.EPSILON, toBeat - fromBeat), 0, 1);
  return noteXs[index] + (noteXs[index + 1] - noteXs[index]) * phase;
}
