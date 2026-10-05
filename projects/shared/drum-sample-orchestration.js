export const FIXED_DRUM_SAMPLE_KIT_IDS = Object.freeze({
  kickCenter: 'superior-drummer-current-kick-center',
  closedHiHatTip: 'superior-drummer-current-hihat-closed-tip',
  closedHiHatEdge: 'superior-drummer-current-hihat-closed-edge',
  openHiHatTip: 'superior-drummer-current-hihat-open-tip',
  pedalHiHatChick: 'superior-drummer-current-hihat-pedal-chick',
  crashBow: 'crash-cymbal-bow',
  crashChoke: 'crash-cymbal-choke',
  highTomCenter: 'high-tom-center',
  midTomCenter: 'mid-tom-center',
  floorTomCenter: 'floor-tom-center'
});

export function alternatingClosedHiHatArticulation(strokeIndex) {
  const index = Math.max(0, Math.floor(Number(strokeIndex) || 0));
  return index % 2 === 0 ? 'closed-edge' : 'closed-tip';
}

export function closedHiHatMidiNote(articulation) {
  return articulation === 'closed-edge' ? 22 : 42;
}
