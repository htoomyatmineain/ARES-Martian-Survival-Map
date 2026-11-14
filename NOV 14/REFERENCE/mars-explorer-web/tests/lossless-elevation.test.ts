import { test } from 'node:test';
import assert from 'node:assert/strict';
import { deflateSync } from 'node:zlib';
import { decodeLosslessElevation } from '../src/losslessElevation.ts';
test('browser elevation decoder preserves float32 samples including nodata and signed zero', async () => {
  const original = new Float32Array([-2520.46826171875, -2523.12451171875, -3.4028226550889045e38, -0, 0, 1.125]);
  const bytes = new Uint8Array(original.buffer), shuffled = new Uint8Array(bytes.length);
  for (let lane = 0; lane < 4; lane++) for (let i = 0; i < original.length; i++) shuffled[lane * original.length + i] = bytes[i * 4 + lane];
  const result = await decodeLosslessElevation(deflateSync(shuffled), 3, 2);
  assert.deepEqual(new Uint8Array(result.buffer), bytes);
  await assert.rejects(decodeLosslessElevation(deflateSync(shuffled), 2, 2), /size mismatch/);
  await assert.rejects(decodeLosslessElevation(deflateSync(shuffled), 0, 2), /dimensions/);
});
