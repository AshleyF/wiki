export const INSTRUMENTS = Object.freeze([
  { id: 'kick-acoustic', name: 'Acoustic kick', group: 'Kicks', midi: 35, sound: 'kick', frequency: 125, level: 102, pattern: [3, 8, 0] },
  { id: 'kick', name: 'Kick', group: 'Kicks', midi: 36, sound: 'kick', frequency: 145, level: 102, pattern: [3, 8, 0] },

  { id: 'cross-stick', name: 'Snare cross-stick', group: 'Snare', midi: 37, sound: 'click', level: 84, pattern: [2, 8, 2] },
  { id: 'snare', name: 'Snare center', group: 'Snare', midi: 38, sound: 'snare', level: 92, pattern: [2, 8, 2] },
  { id: 'hand-clap', name: 'Hand clap', group: 'Snare', midi: 39, sound: 'clap', level: 88, pattern: [2, 8, 2] },
  { id: 'snare-rimshot', name: 'Snare rimshot / alternate', group: 'Snare', midi: 40, sound: 'rimshot', level: 108, pattern: [2, 8, 2] },
  { id: 'snare-off-center', name: 'Snare off-center (Toontrack)', group: 'Snare', midi: 125, sound: 'snare', level: 88, pattern: [2, 8, 2], mapping: 'toontrack' },

  { id: 'floor-tom-low', name: 'Floor tom, low', group: 'Toms', midi: 41, sound: 'tom', frequency: 74, level: 86, pattern: [2, 9, 4] },
  { id: 'floor-tom-high', name: 'Floor tom, high', group: 'Toms', midi: 43, sound: 'tom', frequency: 88, level: 86, pattern: [2, 9, 4] },
  { id: 'tom-low', name: 'Low tom', group: 'Toms', midi: 45, sound: 'tom', frequency: 108, level: 84, pattern: [2, 9, 3] },
  { id: 'tom-low-mid', name: 'Low-mid tom', group: 'Toms', midi: 47, sound: 'tom', frequency: 132, level: 82, pattern: [3, 7, 2] },
  { id: 'tom-high-mid', name: 'High-mid tom', group: 'Toms', midi: 48, sound: 'tom', frequency: 158, level: 80, pattern: [3, 7, 2] },
  { id: 'tom-high', name: 'High tom', group: 'Toms', midi: 50, sound: 'tom', frequency: 194, level: 80, pattern: [3, 7, 2] },

  { id: 'hat-closed', name: 'Hi-hat, closed tip', group: 'Hi-hat', midi: 42, sound: 'hat', openness: 127, level: 64, pattern: [7, 8, 0] },
  { id: 'hat-closed-edge', name: 'Hi-hat, closed edge', group: 'Hi-hat', midi: 42, sound: 'hat', openness: 110, level: 68, pattern: [7, 8, 0] },
  { id: 'hat-pedal', name: 'Hi-hat, pedal/chick', group: 'Hi-hat', midi: 44, sound: 'hat', openness: 127, level: 66, pattern: [2, 8, 2] },
  { id: 'hat-half-open', name: 'Hi-hat, half-open', group: 'Hi-hat', midi: 46, sound: 'openHat', openness: 64, level: 68, pattern: [1, 8, 7] },
  { id: 'hat-open', name: 'Hi-hat, open', group: 'Hi-hat', midi: 46, sound: 'openHat', openness: 0, level: 70, pattern: [1, 8, 7] },
  { id: 'hat-bark', name: 'Hi-hat, bark', group: 'Hi-hat', midi: 46, sound: 'openHat', openness: 24, level: 92, pattern: [1, 8, 7] },
  { id: 'hat-foot-splash', name: 'Hi-hat, foot splash', group: 'Hi-hat', midi: 44, sound: 'openHat', openness: 0, level: 78, pattern: [1, 8, 7] },

  { id: 'crash-1', name: 'Crash 1', group: 'Cymbals', midi: 49, sound: 'crash', level: 92, pattern: [1, 16, 0] },
  { id: 'ride-1', name: 'Ride bow 1', group: 'Cymbals', midi: 51, sound: 'ride', level: 72, pattern: [5, 8, 0] },
  { id: 'china', name: 'China cymbal', group: 'Cymbals', midi: 52, sound: 'crash', level: 90, pattern: [1, 16, 12] },
  { id: 'ride-bell', name: 'Ride bell', group: 'Cymbals', midi: 53, sound: 'bell', level: 82, pattern: [2, 8, 0] },
  { id: 'splash', name: 'Splash cymbal', group: 'Cymbals', midi: 55, sound: 'crash', level: 82, pattern: [1, 16, 8] },
  { id: 'crash-2', name: 'Crash 2', group: 'Cymbals', midi: 57, sound: 'crash', level: 92, pattern: [1, 16, 8] },
  { id: 'ride-2', name: 'Ride bow 2', group: 'Cymbals', midi: 59, sound: 'ride', level: 72, pattern: [5, 8, 0] },

  { id: 'tambourine', name: 'Tambourine', group: 'Hand percussion', midi: 54, sound: 'shaker', level: 76, pattern: [4, 8, 0] },
  { id: 'cowbell', name: 'Cowbell', group: 'Hand percussion', midi: 56, sound: 'cowbell', level: 82, pattern: [3, 8, 0] },
  { id: 'vibraslap', name: 'Vibraslap', group: 'Hand percussion', midi: 58, sound: 'shaker', level: 78, pattern: [1, 16, 0] },
  { id: 'bongo-high', name: 'Bongo, high', group: 'Hand percussion', midi: 60, sound: 'handDrum', frequency: 310, level: 82, pattern: [3, 8, 0] },
  { id: 'bongo-low', name: 'Bongo, low', group: 'Hand percussion', midi: 61, sound: 'handDrum', frequency: 245, level: 82, pattern: [3, 8, 2] },
  { id: 'conga-mute', name: 'Conga, high mute', group: 'Hand percussion', midi: 62, sound: 'click', level: 78, pattern: [3, 8, 0] },
  { id: 'conga-high', name: 'Conga, high open', group: 'Hand percussion', midi: 63, sound: 'handDrum', frequency: 210, level: 84, pattern: [3, 8, 0] },
  { id: 'conga-low', name: 'Conga, low', group: 'Hand percussion', midi: 64, sound: 'handDrum', frequency: 165, level: 84, pattern: [3, 8, 2] },
  { id: 'timbale-high', name: 'Timbale, high', group: 'Hand percussion', midi: 65, sound: 'rimshot', frequency: 260, level: 86, pattern: [3, 8, 0] },
  { id: 'timbale-low', name: 'Timbale, low', group: 'Hand percussion', midi: 66, sound: 'rimshot', frequency: 205, level: 86, pattern: [3, 8, 2] },
  { id: 'agogo-high', name: 'Agogo, high', group: 'Hand percussion', midi: 67, sound: 'bell', frequency: 760, level: 78, pattern: [3, 8, 0] },
  { id: 'agogo-low', name: 'Agogo, low', group: 'Hand percussion', midi: 68, sound: 'bell', frequency: 590, level: 78, pattern: [3, 8, 2] },
  { id: 'cabasa', name: 'Cabasa', group: 'Hand percussion', midi: 69, sound: 'shaker', level: 68, pattern: [7, 8, 0] },
  { id: 'maracas', name: 'Maracas', group: 'Hand percussion', midi: 70, sound: 'shaker', level: 68, pattern: [7, 8, 0] },
  { id: 'whistle-short', name: 'Whistle, short', group: 'Hand percussion', midi: 71, sound: 'whistle', frequency: 1500, level: 72, pattern: [1, 16, 0] },
  { id: 'whistle-long', name: 'Whistle, long', group: 'Hand percussion', midi: 72, sound: 'whistle', frequency: 1200, level: 72, pattern: [1, 16, 8] },
  { id: 'guiro-short', name: 'Guiro, short', group: 'Hand percussion', midi: 73, sound: 'shaker', level: 70, pattern: [3, 8, 0] },
  { id: 'guiro-long', name: 'Guiro, long', group: 'Hand percussion', midi: 74, sound: 'shaker', level: 70, pattern: [3, 8, 2] },
  { id: 'claves', name: 'Claves', group: 'Hand percussion', midi: 75, sound: 'click', frequency: 1250, level: 80, pattern: [3, 8, 0] },
  { id: 'woodblock-high', name: 'Woodblock, high', group: 'Hand percussion', midi: 76, sound: 'click', frequency: 1050, level: 80, pattern: [3, 8, 0] },
  { id: 'woodblock-low', name: 'Woodblock, low', group: 'Hand percussion', midi: 77, sound: 'click', frequency: 780, level: 80, pattern: [3, 8, 2] },
  { id: 'cuica-mute', name: 'Cuíca, mute', group: 'Hand percussion', midi: 78, sound: 'handDrum', frequency: 340, level: 76, pattern: [2, 8, 0] },
  { id: 'cuica-open', name: 'Cuíca, open', group: 'Hand percussion', midi: 79, sound: 'handDrum', frequency: 430, level: 76, pattern: [2, 8, 2] },
  { id: 'triangle-mute', name: 'Triangle, mute', group: 'Hand percussion', midi: 80, sound: 'bell', frequency: 1450, level: 72, pattern: [2, 8, 0] },
  { id: 'triangle-open', name: 'Triangle, open', group: 'Hand percussion', midi: 81, sound: 'bell', frequency: 1250, level: 72, pattern: [2, 8, 2] }
]);

export function instrumentById(id) {
  return INSTRUMENTS.find(instrument => instrument.id === id) || INSTRUMENTS[0];
}

export function instrumentGroups() {
  const groups = new Map();
  for (const instrument of INSTRUMENTS) {
    if (!groups.has(instrument.group)) groups.set(instrument.group, []);
    groups.get(instrument.group).push(instrument);
  }
  return groups;
}
