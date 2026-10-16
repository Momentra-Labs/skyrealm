const sharp = require('sharp');
const { groups } = require('../../art/companion-atlases.json');
const { existsSync } = require('node:fs');

(async () => {
  const layers = [];
  for (const [i, id] of groups.flat().entries()) {
    const path = `public/assets/aetherlings/rear/${id}.webp`;
    if (!existsSync(path)) continue;
    const left = (i % 6) * 192, top = Math.floor(i / 6) * 216;
    layers.push({ input: await sharp(path).resize(192, 192).png().toBuffer(), left, top });
    const label = Buffer.from(`<svg width="192" height="24"><text x="96" y="16" text-anchor="middle" font-family="Arial" font-size="12" fill="#fff4dc">${id.toUpperCase()}</text></svg>`);
    layers.push({ input: label, left, top: top + 192 });
  }
  await sharp({ create: { width: 1152, height: 1080, channels: 4, background: '#241532' } })
    .composite(layers).png().toFile('docs/art/rear-companions-preview.png');
})().catch(error => { console.error(error); process.exitCode = 1; });

