import assert from 'node:assert/strict';
import { access, readFile } from 'node:fs/promises';
import { chooseWeightedVariant, velocityFromStrength } from './drum-sample-kit.js';

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

const manifest = JSON.parse(await readFile(new URL('./assets/drums/snare-center/kit.json', import.meta.url), 'utf8'));
assert.equal(manifest.schema, 'drum-sample-kit/1');
assert.equal(manifest.velocities.length, 127);
assert.deepEqual(manifest.velocities.map(entry => entry.velocity), Array.from({ length: 127 }, (_, index) => index + 1));
const sampleIds = new Set(manifest.samples.map(sample => sample.id));
await Promise.all(manifest.samples.map(sample => access(new URL(`./assets/drums/snare-center/${sample.file}`, import.meta.url))));
manifest.velocities.forEach(entry => {
  assert.ok(entry.variants.length > 0, `velocity ${entry.velocity} has variants`);
  entry.variants.forEach(variant => {
    assert.ok(sampleIds.has(variant.sample_id), `${variant.sample_id} exists`);
    assert.ok(variant.gain_linear > 0, `${variant.sample_id} has positive gain`);
  });
});

console.log('drum-sample-kit tests passed');
