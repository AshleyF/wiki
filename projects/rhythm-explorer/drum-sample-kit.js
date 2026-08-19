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

export function conformSampleBufferChannels(context, buffer, sample = {}) {
  const declaredMono = Number(sample.channel_count) === 1 || sample.channel_layout === 'mono';
  if (!declaredMono || buffer?.numberOfChannels === 1) return buffer;
  if (!buffer?.numberOfChannels || typeof buffer.getChannelData !== 'function' || typeof context.createBuffer !== 'function') {
    return buffer;
  }

  let selectedChannel = 0;
  let selectedEnergy = -1;
  for (let channel = 0; channel < buffer.numberOfChannels; channel += 1) {
    const data = buffer.getChannelData(channel);
    let energy = 0;
    for (let index = 0; index < data.length; index += 1) energy += data[index] * data[index];
    if (energy > selectedEnergy) {
      selectedChannel = channel;
      selectedEnergy = energy;
    }
  }

  const monoBuffer = context.createBuffer(1, buffer.length, buffer.sampleRate);
  const selectedData = buffer.getChannelData(selectedChannel);
  if (typeof monoBuffer.copyToChannel === 'function') monoBuffer.copyToChannel(selectedData, 0);
  else monoBuffer.getChannelData(0).set(selectedData);
  return monoBuffer;
}

export function listKitDefinitions(library, {
  kitId = '',
  instrument = '',
  manufacturer = '',
  model = '',
  articulation = '',
  midiNote = null
} = {}) {
  if (library?.schema !== 'drum-sample-library/1' || !Array.isArray(library.drums)) {
    throw new Error('Unsupported drum sample library manifest.');
  }
  const definitions = [];
  for (const drum of library.drums) {
    if (instrument && drum.instrument !== instrument) continue;
    if (manufacturer && drum.manufacturer !== manufacturer) continue;
    if (model && drum.model !== model) continue;
    for (const entry of drum.articulations || []) {
      if (kitId && entry.kit_id !== kitId) continue;
      if (articulation && entry.name !== articulation) continue;
      if (midiNote !== null && Number(entry.midi_note) !== Number(midiNote)) continue;
      definitions.push({ ...entry, drum });
    }
  }
  return definitions;
}

export function findKitDefinition(library, selector = {}) {
  return listKitDefinitions(library, selector)[0] || null;
}

export class DrumSampleLibrary {
  constructor(libraryUrl, { random = Math.random } = {}) {
    this.libraryUrl = new URL(libraryUrl, import.meta.url);
    this.random = random;
    this.libraryPromise = null;
    this.kits = new Map();
  }

  async load() {
    if (!this.libraryPromise) {
      this.libraryPromise = fetch(this.libraryUrl, { cache: 'no-cache' })
        .then(response => {
          if (!response.ok) throw new Error(`Could not load drum sample library (${response.status}).`);
          return response.json();
        })
        .then(library => {
          findKitDefinition(library);
          return library;
        })
        .catch(error => {
          this.libraryPromise = null;
          throw error;
        });
    }
    return this.libraryPromise;
  }

  async getKit(selector) {
    const library = await this.load();
    const definition = findKitDefinition(library, selector);
    if (!definition?.manifest) {
      const requested = selector?.kitId || [selector?.manufacturer, selector?.model, selector?.articulation].filter(Boolean).join(' ');
      throw new Error(`Drum sample kit not found${requested ? `: ${requested}` : '.'}`);
    }
    if (!this.kits.has(definition.kit_id)) {
      this.kits.set(definition.kit_id, new DrumSampleKit(
        new URL(definition.manifest, this.libraryUrl),
        { random: this.random }
      ));
    }
    return this.kits.get(definition.kit_id);
  }

  async listKits(selector = {}) {
    return listKitDefinitions(await this.load(), selector);
  }
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
      this.manifestPromise = fetch(this.manifestUrl, { cache: 'no-cache' })
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
      const promise = fetch(sampleUrl, { cache: 'no-cache' })
        .then(response => {
          if (!response.ok) throw new Error(`Could not load drum sample ${sampleId} (${response.status}).`);
          return response.arrayBuffer();
        })
        .then(data => context.decodeAudioData(data))
        .then(buffer => conformSampleBufferChannels(context, buffer, sample))
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

  async prepare(context, velocities, { onLoadStart } = {}) {
    await this.loadManifest();
    const requested = [...new Set(velocities.map(clampVelocity))];
    const sampleIds = new Set();
    requested.forEach(velocity => {
      const variants = this.variantsByVelocity.get(velocity);
      if (!variants?.length) throw new Error(`The drum sample kit has no mapping for velocity ${velocity}.`);
      variants.forEach(variant => sampleIds.add(variant.sample_id));
    });
    if ([...sampleIds].some(sampleId => !this.buffers.has(sampleId))) onLoadStart?.();
    await Promise.all([...sampleIds].map(sampleId => this.loadBuffer(context, sampleId)));
  }

  schedule(context, { velocity, time, pan = 0, destination = context.destination } = {}) {
    const variants = this.variantsByVelocity.get(clampVelocity(velocity));
    const readyVariants = variants?.filter(variant => this.buffers.has(variant.sample_id)) || [];
    const variant = chooseWeightedVariant(readyVariants, this.previousSampleId, this.random);
    if (!variant) return null;

    const source = context.createBufferSource();
    const gain = context.createGain();
    const sample = this.sampleById.get(variant.sample_id);
    const playbackOffset = Math.max(0, Number(sample?.playback_offset_seconds) || 0);
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
    source.start(time, playbackOffset);
    return source;
  }
}
