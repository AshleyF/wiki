import assert from 'node:assert/strict';
import test from 'node:test';
import { reducedTripletGridGeometry } from './reduced-triplet-renderer.js';

test('reduced triplet cells have identical widths and exact thirds', () => {
  const cells = reducedTripletGridGeometry(14,310,2);
  assert.deepEqual(cells.map((cell) => cell.right-cell.left),[148,148]);
  cells.forEach((cell) => cell.slotCenters.forEach((center,index) => {
    const expected = cell.left+((index+.5)*(148/3));
    assert.ok(Math.abs(center-expected) < Number.EPSILON*256);
  }));
});

test('a cell gutter does not compress the requested triplet cells', () => {
  const cells = reducedTripletGridGeometry(68,376,2,12);
  assert.deepEqual(cells.map(cell => cell.right-cell.left),[148,148]);
  assert.equal(cells[1].left-cells[0].right,12);
});
