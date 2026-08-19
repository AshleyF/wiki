import assert from 'node:assert/strict';
import { access, readFile } from 'node:fs/promises';
import { chooseWeightedVariant, conformSampleBufferChannels, DrumSampleKit, findKitDefinition, listKitDefinitions, velocityFromStrength } from './drum-sample-kit.js';

assert.equal(velocityFromStrength(1), 82);
assert.equal(velocityFromStrength(0.35), 29);
assert.equal(velocityFromStrength(3), 127);
assert.equal(velocityFromStrength(0), 1);

const variants = [
  { sample_id: 'a', weight: 0.9 },
  { sample_id: 'b', weight: 0.1 }
];
assert.equal(chooseWeightedVariant(variants, '', () => 0).sample_id, 'a');
assert.equal(chooseWeightedVariant(variants, 'a', () => 0).sample_id, 'b');
assert.equal(chooseWeightedVariant([{ sample_id: 'a', weight: 1 }], 'a', () => 0).sample_id, 'a');

const quietChannel = new Float32Array([0, 0.01, 0]);
const signalChannel = new Float32Array([0.2, -0.5, 0.1]);
const stereoBuffer = {
  numberOfChannels: 2,
  length: signalChannel.length,
  sampleRate: 48000,
  getChannelData: channel => [quietChannel, signalChannel][channel]
};
let renderedMonoData;
const channelContext = {
  createBuffer(channels, length, sampleRate) {
    assert.deepEqual([channels, length, sampleRate], [1, signalChannel.length, 48000]);
    renderedMonoData = new Float32Array(length);
    return {
      numberOfChannels: channels,
      length,
      sampleRate,
      copyToChannel(data) { renderedMonoData.set(data); }
    };
  }
};
const conformedMono = conformSampleBufferChannels(channelContext, stereoBuffer, {
  channel_count: 1,
  channel_layout: 'mono'
});
assert.equal(conformedMono.numberOfChannels, 1);
assert.deepEqual([...renderedMonoData], [...signalChannel]);
assert.equal(conformSampleBufferChannels(channelContext, stereoBuffer, { channel_count: 2 }), stereoBuffer);

const timedKit = new DrumSampleKit(new URL('file:///timed-kit.json'), { random: () => 0 });
timedKit.sampleById.set('timed-sample', { playback_offset_seconds: 0.125 });
timedKit.variantsByVelocity.set(82, [{ sample_id: 'timed-sample', gain_linear: 0.75, weight: 1 }]);
timedKit.buffers.set('timed-sample', { duration: 1 });
let scheduledStart;
let scheduledGain;
const fakeSource = {
  connect() {},
  start(...args) { scheduledStart = args; }
};
const fakeGain = {
  gain: { setValueAtTime(...args) { scheduledGain = args; } },
  connect() { return this; }
};
const fakeContext = {
  destination: {},
  createBufferSource: () => fakeSource,
  createGain: () => fakeGain
};
timedKit.schedule(fakeContext, { velocity: 82, time: 2 });
assert.deepEqual(scheduledStart, [2, 0.125]);
assert.deepEqual(scheduledGain, [0.75, 2]);

const libraryUrl = new URL('./assets/drums/library.json', import.meta.url);
const library = JSON.parse(await readFile(libraryUrl, 'utf8'));
assert.equal(library.schema, 'drum-sample-library/1');
const blackBeauty = findKitDefinition(library, { kitId: 'ludwig-black-beauty-snare-center' });
assert.equal(blackBeauty.drum.manufacturer, 'Ludwig');
assert.equal(blackBeauty.drum.model, 'Black Beauty');
assert.equal(blackBeauty.name, 'center');
assert.equal(findKitDefinition(library, { kitId: 'missing-kit' }), null);
const centerSnareKits = listKitDefinitions(library, { instrument: 'snare', articulation: 'center' });
assert.equal(centerSnareKits.length, 2);
assert.ok(centerSnareKits.some(entry => entry.kit_id === 'ludwig-black-beauty-snare-center'));
const selectableSnareSounds = listKitDefinitions(library, { midiNote: 38 });
assert.ok(selectableSnareSounds.some(entry => entry.kit_id === 'evans-practice-pad-center'));

for (const drum of library.drums) {
  for (const articulation of drum.articulations) {
    const manifestUrl = new URL(articulation.manifest, libraryUrl);
    const manifest = JSON.parse(await readFile(manifestUrl, 'utf8'));
    assert.equal(manifest.schema, 'drum-sample-kit/1');
    assert.equal(manifest.kit_id, articulation.kit_id);
    assert.equal(manifest.velocities.length, 127);
    assert.deepEqual(manifest.velocities.map(entry => entry.velocity), Array.from({ length: 127 }, (_, index) => index + 1));
    const sampleIds = new Set(manifest.samples.map(sample => sample.id));
    await Promise.all(manifest.samples.map(sample => access(new URL(sample.file, manifestUrl))));
    manifest.samples.forEach(sample => {
      assert.ok(Number.isFinite(sample.playback_offset_seconds), `${sample.id} has a playback offset`);
      assert.ok(sample.playback_offset_seconds >= 0, `${sample.id} has a nonnegative playback offset`);
      assert.ok(Number.isFinite(sample.attack_peak_seconds), `${sample.id} has an attack peak`);
      assert.ok(sample.attack_peak_seconds >= sample.playback_offset_seconds, `${sample.id} peak follows its playback offset`);
      if (manifest.audio?.channel_count) {
        assert.equal(sample.channel_count, manifest.audio.channel_count, `${sample.id} matches the kit channel count`);
        assert.equal(sample.channel_layout, manifest.audio.channel_layout, `${sample.id} matches the kit channel layout`);
      }
    });
    manifest.velocities.forEach(entry => {
      assert.ok(entry.variants.length > 0, `${manifest.kit_id} velocity ${entry.velocity} has variants`);
      entry.variants.forEach(variant => {
        assert.ok(sampleIds.has(variant.sample_id), `${variant.sample_id} exists`);
        assert.ok(variant.gain_linear > 0, `${variant.sample_id} has positive gain`);
      });
    });
  }
}

console.log('drum-sample-kit tests passed');
