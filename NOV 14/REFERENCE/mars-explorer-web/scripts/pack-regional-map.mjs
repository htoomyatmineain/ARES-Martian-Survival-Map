// Offline lossless packaging. Originals and the running map are never modified.
import { mkdir, readFile, writeFile, stat } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { deflateSync, inflateSync } from 'node:zlib';
import path from 'node:path';
import { fromFile } from 'geotiff';
import sharp from 'sharp';

sharp.concurrency(1);
if (new Uint8Array(new Uint32Array([1]).buffer)[0] !== 1) throw Error('Packager requires little-endian hardware');
const source = path.resolve('source-data/Western-Jezero-10km-HiRISE');
const output = path.resolve('source-data/Western-Jezero-Web-Lossless');
const manifest = JSON.parse(await readFile(path.join(source, 'download-manifest.json'), 'utf8'));
if (manifest.status !== 'complete') throw Error('Source dataset is incomplete');
await mkdir(output, { recursive: true });
await writeFile(path.join(output, '.gitignore'), '*\n!.gitignore\n!package-manifest.json\n');
const hash = bytes => createHash('sha256').update(bytes).digest('hex');
const report = { version: 1, generatedAt: new Date().toISOString(), zone: manifest.zone,
  status: 'building', lossless: true, products: {},
  limitations: ['Native projections retained; layers have not been registered to a common display grid.',
    'This is an offline storage package, not an integrated browser tile layer.',
    'Source latitude convention and vertical datum compatibility remain provisional.'] };
for (const kind of ['elevation', 'imagery']) {
  const product = manifest.products[kind];
  const packed = { ...product, tiles: [], sourceBytes: 0, packedBytes: 0 };
  report.products[kind] = packed;
  for (const tile of product.tiles) {
    const filename = path.join(source, tile.file);
    const tiff = await fromFile(filename);
    let pixels, width, height, nodata;
    try {
      const image = await tiff.getImage();
      width = image.getWidth(); height = image.getHeight(); nodata = image.getGDALNoData();
      pixels = await image.readRasters({ samples: [0], interleave: true });
    } finally { await tiff.close(); }
    const raw = Buffer.from(pixels.buffer, pixels.byteOffset, pixels.byteLength);
    let bytes, extension, encoding;
    if (kind === 'elevation') {
      if (!(pixels instanceof Float32Array)) throw Error('Expected Float32 elevation');
      const shuffled = Buffer.allocUnsafe(raw.length), n = pixels.length;
      for (let lane = 0; lane < 4; lane++) for (let i = 0; i < n; i++) shuffled[lane * n + i] = raw[i * 4 + lane];
      extension = '.f32-shuffle.deflate'; encoding = 'zlib-deflate-byte-shuffled-float32-little-endian';
      const previous = path.join(output, tile.file.replace(/\.tif$/, extension));
      try { bytes = await readFile(previous); } catch (error) { if (error.code !== 'ENOENT') throw error; }
      bytes ??= deflateSync(shuffled, { level: 9 });
      const inflated = inflateSync(bytes), restored = Buffer.allocUnsafe(raw.length);
      for (let lane = 0; lane < 4; lane++) for (let i = 0; i < n; i++) restored[i * 4 + lane] = inflated[lane * n + i];
      if (!restored.equals(raw)) throw Error(`Elevation roundtrip failed: ${tile.file}`);
    } else {
      if (!(pixels instanceof Uint8Array)) throw Error('Expected uint8 imagery');
      extension = '.webp'; encoding = 'webp-lossless-uint8';
      const previous = path.join(output, tile.file.replace(/\.tif$/, extension));
      try { bytes = await readFile(previous); } catch (error) { if (error.code !== 'ENOENT') throw error; }
      bytes ??= await sharp(raw, { raw: { width, height, channels: 1 } }).webp({ lossless: true, effort: 4 }).toBuffer();
      const restored = await sharp(bytes).greyscale().raw().toBuffer();
      if (!restored.equals(raw)) throw Error(`Imagery roundtrip failed: ${tile.file}`);
    }
    const file = tile.file.replace(/\.tif$/, extension);
    await writeFile(path.join(output, file), bytes);
    const sourceBytes = (await stat(filename)).size;
    packed.sourceBytes += sourceBytes; packed.packedBytes += bytes.length;
    packed.tiles.push({ file, sourceFile: tile.file, sourceWindow: tile.sourceWindow, width, height,
      nodata, encoding, bytes: bytes.length, sha256: hash(bytes), decodedSha256: hash(raw), verifiedExact: true });
    console.log(`${kind} ${packed.tiles.length}/${product.tiles.length}: ${file} ${(bytes.length / 1e6).toFixed(2)} MB; exact pixels verified`);
  }
}
report.status = 'complete';
report.sourceBytes = Object.values(report.products).reduce((sum, p) => sum + p.sourceBytes, 0);
report.packedBytes = Object.values(report.products).reduce((sum, p) => sum + p.packedBytes, 0);
report.fitsStorageBudget700MB = report.packedBytes < 700_000_000;
await writeFile(path.join(output, 'package-manifest.json'), JSON.stringify(report, null, 2));
console.log(JSON.stringify({ sourceBytes: report.sourceBytes, packedBytes: report.packedBytes, fitsStorageBudget700MB: report.fitsStorageBudget700MB }));
