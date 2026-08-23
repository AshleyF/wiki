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

export function classifyAttempt({ played, expected, now, due, tolerance }) {
  const window = clamp(tolerance, 20, 500);
  if (now < due - window) return { result: 'early', difference: now - due };
  if (now > due + window) return { result: 'late', difference: now - due };
  if (Number(played) !== Number(expected)) return { result: 'wrong', difference: now - due };
  return { result: 'correct', difference: now - due };
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
