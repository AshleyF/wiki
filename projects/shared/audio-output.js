const outputs = new WeakMap();

// A modest site-wide lift makes the browser instruments comparable to ordinary
// media playback. The compressor catches overlapping drum and chord peaks so
// the extra gain does not simply turn them into hard digital clipping.
export function boostedAudioOutput(context) {
  if (outputs.has(context)) return outputs.get(context);

  const input = context.createGain();
  const limiter = context.createDynamicsCompressor();
  input.gain.value = 1.8;
  limiter.threshold.value = -6;
  limiter.knee.value = 3;
  limiter.ratio.value = 12;
  limiter.attack.value = 0.003;
  limiter.release.value = 0.16;
  input.connect(limiter).connect(context.destination);
  outputs.set(context, input);
  return input;
}
