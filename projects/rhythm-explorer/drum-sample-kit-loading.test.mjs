import test from 'node:test';
import assert from 'node:assert/strict';
import { DrumSampleKit } from './drum-sample-kit.js';

function testKit() {
  const kit = new DrumSampleKit(new URL('file:///test-kit.json'));
  kit.manifest = {
    schema: 'drum-sample-kit/1',
    samples: ['a', 'b', 'c', 'd'].map(id => ({ id, file:`${id}.wav` })),
    velocities: []
  };
  kit.sampleById = new Map(kit.manifest.samples.map(sample => [sample.id,sample]));
  kit.variantsByVelocity = new Map([
    [64, [{ sample_id:'a' }, { sample_id:'b' }]],
    [65, [{ sample_id:'b' }, { sample_id:'c' }]]
  ]);
  kit.loadManifest = async () => kit.manifest;
  const loaded = [];
  kit.loadBuffer = async (_context,sampleId) => {
    if (!kit.buffers.has(sampleId)) {
      loaded.push(sampleId);
      kit.buffers.set(sampleId,{ sampleId });
    }
    return kit.buffers.get(sampleId);
  };
  return { kit,loaded };
}

test('prepare loads only variants mapped to requested velocities and reuses cached samples', async () => {
  const { kit,loaded } = testKit();
  let loadStarts = 0;
  await kit.prepare({},[64,64],{ onLoadStart:() => { loadStarts += 1; } });
  assert.deepEqual(loaded,['a','b']);
  assert.equal(loadStarts,1);

  await kit.prepare({},[64],{ onLoadStart:() => { loadStarts += 1; } });
  assert.deepEqual(loaded,['a','b']);
  assert.equal(loadStarts,1);

  await kit.prepare({},[65],{ onLoadStart:() => { loadStarts += 1; } });
  assert.deepEqual(loaded,['a','b','c']);
  assert.equal(loadStarts,2);
});

test('prepareAll explicitly fills the rest of a kit cache', async () => {
  const { kit,loaded } = testKit();
  await kit.prepare({},[64]);
  let loadStarts = 0;
  await kit.prepareAll({}, { onLoadStart:() => { loadStarts += 1; } });
  assert.deepEqual(loaded,['a','b','c','d']);
  assert.equal(loadStarts,1);

  await kit.prepareAll({}, { onLoadStart:() => { loadStarts += 1; } });
  assert.deepEqual(loaded,['a','b','c','d']);
  assert.equal(loadStarts,1);
});
