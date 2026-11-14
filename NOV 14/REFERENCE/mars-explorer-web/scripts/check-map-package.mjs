// Read-only preflight. No uploads, credentials or project changes.
import { readFile, stat } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import path from 'node:path';
const directory = path.resolve('source-data/Western-Jezero-Web-Lossless');
const manifest = JSON.parse(await readFile(path.join(directory, 'package-manifest.json'), 'utf8'));
if (manifest.status !== 'complete') throw Error('Package is incomplete');
let total = (await stat(path.join(directory, 'package-manifest.json'))).size, largest = 0, count = 0;
for (const tile of [...Object.values(manifest.products).flatMap(product => product.tiles), ...(manifest.assets ?? [])]) {
  if (path.basename(tile.file) !== tile.file) throw Error('Unexpected tile path');
  const bytes = await readFile(path.join(directory, tile.file));
  if (bytes.length !== tile.bytes || createHash('sha256').update(bytes).digest('hex') !== tile.sha256) throw Error(`Corrupt package tile: ${tile.file}`);
  if (tile.sourceWindow && !tile.verifiedExact) throw Error(`Unverified tile: ${tile.file}`);
  total += bytes.length; largest = Math.max(largest, bytes.length); count++;
}
console.log(JSON.stringify({ files: count + 1, totalBytes: total, largestFileBytes: largest,
  under700MBMapBudget: total <= 700_000_000, under1GBStorage: total <= 1_000_000_000,
  under50MBFileLimit: largest <= 50_000_000, note: 'Does not include current bucket usage, future layers, extra overview levels or download quotas.' }, null, 2));
