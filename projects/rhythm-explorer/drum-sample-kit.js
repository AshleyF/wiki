const clampVelocity = value => Math.max(1, Math.min(127, Math.round(Number(value) || 1)));

export function velocityFromStrength(strength, referenceVelocity = 82) {
  return clampVelocity(referenceVelocity * Math.max(0, Number(strength) || 0));
}

export function chooseWeightedVariant(variants, previousSampleId = '', random = Math.random) {
  if (!Array.isArray(variants) || variants.length === 0) return null;
  const choices = variants.length > 1
    ? variants.filter(variant => variant.sample_id !== previousSampleId)
    : variants;
  const available = choices.length ? choices : variants;
  const totalWeight = available.reduce((sum, variant) => sum + Math.max(0, Number(variant.weight) || 0), 0);
  if (totalWeight <= 0) return available[Math.min(available.length - 1, Math.floor(random() * available.length))];

  let cursor = random() * totalWeight;
  for (const variant of available) {
    cursor -= Math.max(0, Number(variant.weight) || 0);
    if (cursor <= 0) return variant;
  }
  return available[available.length - 1];
}

export class DrumSampleKit {
  constructor(manifestUrl, { random = Math.random } = {}) {
    this.manifestUrl = new URL(manifestUrl, import.meta.url);
    this.random = random;
    this.manifestPromise = null;
    this.sampleById = new Map();
    this.variantsByVelocity = new Map();
    this.bufferPromises = new Map();
    this.buffers = new Map();
    this.previousSampleId = '';
  }

  async loadManifest() {
    if (!this.manifestPromise) {
      this.manifestPromise = fetch(this.manifestUrl)
        .then(response => {
          if (!response.ok) throw new Error(`Could not load drum sample manifest (${response.status}).`);
          return response.json();
        })
        .then(manifest => {
          if (manifest?.schema !== 'drum-sample-kit/1' || !Array.isArray(manifest.samples) || !Array.isArray(manifest.velocities)) {
            throw new Error('Unsupported drum sample manifest.');
          }
          this.sampleById = new Map(manifest.samples.map(sample => [sample.id, sample]));
          this.variantsByVelocity = new Map(manifest.velocities.map(entry => [clampVelocity(entry.velocity), entry.variants || []]));
          return manifest;
        })
        .catch(error => {
          this.manifestPromise = null;
          throw error;
        });
    }
    return this.manifestPromise;
  }

  async loadBuffer(context, sampleId) {
    if (this.buffers.has(sampleId)) return this.buffers.get(sampleId);
    if (!this.bufferPromises.has(sampleId)) {
      const sample = this.sampleById.get(sampleId);
      if (!sample?.file) throw new Error(`Unknown drum sample ${sampleId}.`);
      const sampleUrl = new URL(sample.file, this.manifestUrl);
      const promise = fetch(sampleUrl)
        .then(response => {
          if (!response.ok) throw new Error(`Could not load drum sample ${sampleId} (${response.status}).`);
          return response.arrayBuffer();
        })
        .then(data => context.decodeAudioData(data))
        .then(buffer => {
          this.buffers.set(sampleId, buffer);
          return buffer;
        })
        .catch(error => {
          this.bufferPromises.delete(sampleId);
          throw error;
        });
      this.bufferPromises.set(sampleId, promise);
    }
    return this.bufferPromises.get(sampleId);
  }

  async prepare(context, velocities) {
    await this.loadManifest();
    const requested = [...new Set(velocities.map(clampVelocity))];
    const sampleIds = new Set();
    requested.forEach(velocity => {
      const variants = this.variantsByVelocity.get(velocity);
      if (!variants?.length) throw new Error(`The drum sample kit has no mapping for velocity ${velocity}.`);
      variants.forEach(variant => sampleIds.add(variant.sample_id));
    });
    await Promise.all([...sampleIds].map(sampleId => this.loadBuffer(context, sampleId)));
  }

  schedule(context, { velocity, time, pan = 0, destination = context.destination } = {}) {
    const variants = this.variantsByVelocity.get(clampVelocity(velocity));
    const readyVariants = variants?.filter(variant => this.buffers.has(variant.sample_id)) || [];
    const variant = chooseWeightedVariant(readyVariants, this.previousSampleId, this.random);
    if (!variant) return null;

    const source = context.createBufferSource();
    const gain = context.createGain();
    source.buffer = this.buffers.get(variant.sample_id);
    gain.gain.setValueAtTime(Math.max(0, Number(variant.gain_linear) || 0), time);
    source.connect(gain);

    if (pan && typeof context.createStereoPanner === 'function') {
      const panner = context.createStereoPanner();
      panner.pan.setValueAtTime(Math.max(-1, Math.min(1, pan)), time);
      gain.connect(panner).connect(destination);
    } else {
      gain.connect(destination);
    }

    this.previousSampleId = variant.sample_id;
    source.start(time);
    return source;
  }
}
