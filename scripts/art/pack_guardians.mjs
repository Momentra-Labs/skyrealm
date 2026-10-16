// Package the generated transparent 3 x 2 atlas without changing its artwork.
// Usage: node scripts/art/pack_guardians.mjs path/to/atlas.png
// Requires sharp (the bundled Codex Node runtime includes it).
import { createRequire } from 'node:module';
import { mkdir, copyFile } from 'node:fs/promises';
import { resolve } from 'node:path';

const require = createRequire(import.meta.url);
const sharp = require('sharp');
const source = process.argv[2];
if (!source) throw new Error('Pass the transparent guardian atlas PNG path.');
const ids = ['aurelia', 'kairo', 'nyxara', 'elara', 'orion', 'vesper'];
const meta = await sharp(source).metadata();
if (!meta.hasAlpha || meta.width % 3 || meta.height % 2) {
  throw new Error('Expected an RGBA atlas with three columns and two rows.');
}
const width = meta.width / 3;
const height = meta.height / 2;
const out = resolve('public/assets/guardians/v2');
await mkdir(out, { recursive: true });
for (const [i, id] of ids.entries()) {
  // A small overlap keeps feet/wing tips intact when generated rows drift.
  // Keep the main connected silhouette, excluding fragments of adjacent rows.
  const rowTop = i < 3 ? 0 : height - 16;
  const tileHeight = height + 16;
  const tile = await sharp(source).extract({
    left: (i % 3) * width, top: rowTop, width, height: tileHeight,
  }).ensureAlpha().raw().toBuffer();
  const seen = new Uint8Array(width * tileHeight);
  let main = [];
  for (let pixel = 0; pixel < seen.length; pixel++) {
    if (seen[pixel] || tile[pixel * 4 + 3] <= 8) continue;
    const group = [pixel];
    seen[pixel] = 1;
    for (let n = 0; n < group.length; n++) {
      const p = group[n], x = p % width;
      for (const q of [x > 0 ? p - 1 : -1, x < width - 1 ? p + 1 : -1, p - width, p + width]) {
        if (q < 0 || q >= seen.length || seen[q] || tile[q * 4 + 3] <= 8) continue;
        seen[q] = 1;
        group.push(q);
      }
    }
    if (group.length > main.length) main = group;
  }
  const keep = new Uint8Array(seen.length);
  for (const p of main) keep[p] = 1;
  for (let p = 0; p < keep.length; p++) if (!keep[p]) tile[p * 4 + 3] = 0;
  let left = width, top = tileHeight, right = -1, bottom = -1, transparent = 0;
  for (let y = 0; y < tileHeight; y++) {
    for (let x = 0; x < width; x++) {
      const a = tile[(y * width + x) * 4 + 3];
      if (a === 0) transparent++;
      if (a > 8) {
        left = Math.min(left, x); right = Math.max(right, x);
        top = Math.min(top, y); bottom = Math.max(bottom, y);
      }
    }
  }
  if (transparent < width * height * 0.12 || right < left) {
    throw new Error(`${id}: missing transparent background or empty character.`);
  }
  const crop = await sharp(tile, { raw: { width, height: tileHeight, channels: 4 } })
    .extract({ left, top, width: right - left + 1, height: bottom - top + 1 })
    .resize(338, 338, { fit: 'inside' }).png().toBuffer();
  await sharp({ create: { width: 384, height: 384, channels: 4, background: '#00000000' } })
    .composite([{ input: crop, gravity: 'centre' }])
    .webp({ quality: 90, alphaQuality: 100 }).toFile(resolve(out, `${id}.webp`));
  console.log(`${id}: packed with 88% fill, transparent pixels ${Math.round(100 * transparent / (width * height))}%`);
}
await mkdir('art/source/guardians/v2', { recursive: true });
await copyFile(source, 'art/source/guardians/v2/atlas.png');
