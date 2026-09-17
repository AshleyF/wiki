export const FIXED_DRUM_SAMPLE_KIT_IDS = Object.freeze({
  kickCenter: 'kick-center',
  closedHiHatTip: 'hi-hat-closed-tip',
  closedHiHatEdge: 'hi-hat-closed-edge'
});

export function alternatingClosedHiHatArticulation(strokeIndex) {
  const index = Math.max(0, Math.floor(Number(strokeIndex) || 0));
  return index % 2 === 0 ? 'closed-edge' : 'closed-tip';
}

export function closedHiHatMidiNote(articulation) {
  return articulation === 'closed-edge' ? 22 : 42;
}
