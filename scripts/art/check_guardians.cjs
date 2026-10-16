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
      if (response.url().includes('/guardians/v2/') && response.status() >= 400) errors.push(`${response.status()} ${response.url()}`);
    });
    await page.goto('http://127.0.0.1:5174/#play');
    await page.getByRole('button', { name: 'NEXT', exact: true }).waitFor();
    for (let i = 0; i < 3; i++) await page.getByRole('button', { name: 'NEXT', exact: true }).click();
    await page.getByRole('button', { name: 'TAKE FLIGHT', exact: true }).click();
    await mkdir('docs/art', { recursive: true });
    await page.locator('.countdown').waitFor({ state: 'hidden', timeout: 60000 });
    await page.waitForTimeout(1500);
    await page.screenshot({ path: 'docs/art/guardians-v2-gameplay.png' });
    await page.reload();
    await page.getByRole('button', { name: 'TAKE FLIGHT', exact: true }).waitFor();
    await page.waitForTimeout(1500);
    await page.screenshot({ path: 'docs/art/guardians-v2-menu.png' });
    await page.getByRole('button', { name: 'Change guardian', exact: true }).click();
    await page.getByRole('heading', { name: 'GUARDIANS', exact: true }).waitFor();
    await page.screenshot({ path: 'docs/art/guardians-v2-hall.png' });
    if (errors.length) throw new Error(errors.join('\n'));
    console.log('Guardian menu and gameplay smoke check passed.');
  } finally {
    if (browser) await browser.close();
    server.kill();
  }
})().catch(error => { console.error(error); process.exitCode = 1; });
