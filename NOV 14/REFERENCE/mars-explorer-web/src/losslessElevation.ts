// Decode the storage package without rounding any elevation samples.
export async function decodeLosslessElevation(bytes: Uint8Array, width: number, height: number) {
  if (!Number.isSafeInteger(width) || !Number.isSafeInteger(height) || width < 1 || height < 1) throw Error('Invalid tile dimensions');
  const stream = new Blob([new Uint8Array(bytes)]).stream().pipeThrough(new DecompressionStream('deflate'));
  const shuffled = new Uint8Array(await new Response(stream).arrayBuffer());
  const count = width * height;
  if (shuffled.length !== count * 4) throw Error('Elevation tile size mismatch');
  const restored = new Uint8Array(shuffled.length);
  for (let lane = 0; lane < 4; lane++) for (let i = 0; i < count; i++) restored[i * 4 + lane] = shuffled[lane * count + i];
  const view = new DataView(restored.buffer), values = new Float32Array(count);
  for (let i = 0; i < count; i++) values[i] = view.getFloat32(i * 4, true);
  return values;
}
