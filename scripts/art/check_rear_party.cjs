// Local visual smoke check. Requires the bundled playwright package and Edge.
const { chromium } = require('playwright');
const { spawn } = require('node:child_process');
const { mkdir } = require('node:fs/promises');

(async () => {
  const server = spawn(process.execPath, ['node_modules/vite/bin/vite.js', '--host', '127.0.0.1', '--port', '5174'], { windowsHide: true });
  let browser;
  try {
    await new Promise((resolve, reject) => {
      server.stdout.on('data', data => { if (data.toString().includes('Local:')) resolve(); });
      server.on('error', reject);
      server.on('exit', code => reject(new Error(`Vite exited: ${code}`)));
    });
    browser = await chromium.launch({ channel: 'msedge', headless: true });
    const page = await browser.newPage({ viewport: { width: 540, height: 960 } });
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    page.on('response', response => {
      if (/\/assets\/(guardians|aetherlings)\//.test(response.url()) && response.status() >= 400) errors.push(`${response.status()} ${response.url()}`);
    });
    await page.goto('http://127.0.0.1:5174/#play');
    // Seed only this disposable browser profile to inspect a full party.
    await page.evaluate(async () => {
      const { starterSave } = await import('/src/save/SaveManager.ts');
      const { BRAND } = await import('/src/brand.ts');
      const save = starterSave();
      const tide = { ...save.aetherlings[0], id: 'test-tide', species: 'TIDECURL', element: 'WATER' };
      save.aetherlings.push(tide);
      save.equipped[1] = tide.id;
      save.discovered.push(tide.species);
      localStorage.setItem(BRAND.storageKey, JSON.stringify(save));
    });
    await page.reload();
    await page.getByRole('button', { name: 'NEXT', exact: true }).waitFor();
    for (let i = 0; i < 3; i++) await page.getByRole('button', { name: 'NEXT', exact: true }).click();
    await page.getByRole('button', { name: 'TAKE FLIGHT', exact: true }).click();
    await mkdir('docs/art', { recursive: true });
    await page.locator('.countdown').waitFor({ state: 'hidden', timeout: 60000 });
    await page.waitForTimeout(1500);
    await page.screenshot({ path: 'docs/art/rear-party-gameplay.png' });
    await page.reload();
    await page.getByRole('button', { name: 'TAKE FLIGHT', exact: true }).waitFor();
    await page.waitForTimeout(1500);
    await page.screenshot({ path: 'docs/art/rear-party-menu.png' });
    await page.getByRole('button', { name: 'Change FLICKER', exact: true }).click();
    await page.getByRole('heading', { name: 'AETHERLINGS', exact: true }).waitFor();
    const loaded = await page.evaluate(async () => {
      const { assets } = await import('/src/assets/AssetLoader.ts');
      const { SPECIES_LIST } = await import('/src/game/content/aetherlings.ts');
      const { GUARDIAN_LIST } = await import('/src/game/content/guardians.ts');
      const { aetherPath, guardianPath } = await import('/src/assets/assetManifest.ts');
      const urls = [];
      for (const [ids, path] of [[SPECIES_LIST, aetherPath], [GUARDIAN_LIST, guardianPath]]) {
        for (const id of ids) {
          for (const pose of ['idle', 'attack', 'hit', 'ability', 'death', 'portrait', 'icon']) {
            const url = path(id, pose);
            const view = pose === 'portrait' || pose === 'icon' ? '/v2/' : '/rear/';
            if (!url.includes(view)) throw new Error(`Wrong view for ${id} ${pose}`);
            urls.push(url);
          }
        }
      }
      await assets.load(urls);
      return [...new Set(urls)].filter(url => assets.has(url)).length;
    });
    if (loaded !== 72) throw new Error(`Expected 72 front/rear party assets; loaded ${loaded}.`);
    if (await page.locator('.dex-card').count() !== 30) throw new Error('Missing collection cards.');
    await page.waitForTimeout(300);
    await page.screenshot({ path: 'docs/art/rear-party-hall.png' });
    if (errors.length) throw new Error(errors.join('\n'));
    console.log('Rear party gameplay, front portraits, pose routing and all 72 assets passed.');
  } finally {
    if (browser) await browser.close();
    server.kill();
  }
})().catch(error => { console.error(error); process.exitCode = 1; });


