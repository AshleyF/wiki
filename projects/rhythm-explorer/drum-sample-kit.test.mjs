import assert from 'node:assert/strict';
import { access, readFile } from 'node:fs/promises';
import { chooseWeightedVariant, findKitDefinition, listKitDefinitions, velocityFromStrength } from './drum-sample-kit.js';

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

const libraryUrl = new URL('./assets/drums/library.json', import.meta.url);
const library = JSON.parse(await readFile(libraryUrl, 'utf8'));
assert.equal(library.schema, 'drum-sample-library/1');
const blackBeauty = findKitDefinition(library, { kitId: 'ludwig-black-beauty-snare-center' });
assert.equal(blackBeauty.drum.manufacturer, 'Ludwig');
assert.equal(blackBeauty.drum.model, 'Black Beauty');
assert.equal(blackBeauty.name, 'center');
assert.equal(findKitDefinition(library, { kitId: 'missing-kit' }), null);
assert.deepEqual(
  listKitDefinitions(library, { instrument: 'snare', articulation: 'center' }).map(entry => entry.kit_id),
  ['ludwig-black-beauty-snare-center', 'slingerland-snare-center']
);

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
