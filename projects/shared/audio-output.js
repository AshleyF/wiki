const outputs = new WeakMap();

// A substantial site-wide lift makes the browser instruments comfortable for
// practice beside ordinary media. The compressor catches overlapping drum and
// chord peaks so the extra gain does not become hard digital clipping.
export function boostedAudioOutput(context) {
  if (outputs.has(context)) return outputs.get(context);

  const input = context.createGain();
  const limiter = context.createDynamicsCompressor();
  input.gain.value = 3;
  limiter.threshold.value = -2.5;
  limiter.knee.value = 3;
  limiter.ratio.value = 12;
  limiter.attack.value = 0.003;
  limiter.release.value = 0.16;
  input.connect(limiter).connect(context.destination);
  outputs.set(context, input);
  return input;
}
