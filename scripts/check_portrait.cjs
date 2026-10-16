const { chromium } = require('playwright');
const { spawn } = require('node:child_process');
const assert = require('node:assert/strict');
(async () => {
  const server = spawn(process.execPath, ['node_modules/vite/bin/vite.js', '--host', '127.0.0.1', '--port', '5180', '--strictPort'], { windowsHide: true });
  let browser;
  try {
    await new Promise((resolve, reject) => { server.stdout.on('data', d => { if (d.toString().includes('Local:')) resolve(); }); server.on('error', reject); });
    browser = await chromium.launch({ channel: 'msedge', headless: true });
    const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
    const errors = [];
    page.on('pageerror', e => errors.push(e.message));
    await page.goto('http://127.0.0.1:5180/');
    await page.evaluate(async () => { const { GameSession } = await import('/src/services/GameSession.ts'); new GameSession().finishTutorial(); });
    await page.goto('http://127.0.0.1:5180/#play');
    await page.reload();
    await page.locator('.aether-loading').waitFor();
    const loadingStarted = Date.now();
    await page.waitForTimeout(700);
    assert.equal(await page.locator('.aether-loading').count(), 1);
    await page.screenshot({ path: 'docs/art/loading-desktop.png' });
    await page.getByRole('button', { name: 'TAKE FLIGHT', exact: true }).waitFor({ timeout: 60000 });
    assert.ok(Date.now() - loadingStarted >= 2300, 'Menu appeared before minimum loading presentation');
    await page.waitForFunction(() => [...document.querySelectorAll('.home-party-art,.home-chip img')].every(i => i.complete && i.naturalWidth > 0));
    for (const viewport of [{ width: 1440, height: 900 }, { width: 1920, height: 1080 }, { width: 390, height: 844 }, { width: 800, height: 450 }]) {
      await page.setViewportSize(viewport);
      const box = await page.locator('.app-shell').boundingBox();
      assert.ok(Math.abs(box.width / box.height - 9 / 16) < .002, JSON.stringify(box));
      assert.ok(box.width <= 540 && box.height <= viewport.height);
      assert.ok(Math.abs(box.x - (viewport.width - box.width) / 2) < 1);
      await page.getByRole('button', { name: 'Add companion', exact: true }).click();
      await page.getByRole('heading', { name: 'AETHERLINGS', exact: true }).waitFor();
      if (viewport.width === 1440) await page.screenshot({ path: 'docs/art/theme-companions.png' });
      const panel = await page.locator('.hangar-panel').boundingBox();
      assert.ok(panel.x >= box.x - 1 && panel.width <= box.width + 1);
      await page.getByRole('button', { name: 'BACK', exact: true }).click();
    }
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.screenshot({ path: 'docs/art/portrait-desktop.png' });
    await page.evaluate(async () => {
      const { GameEngine } = await import('/src/game/GameEngine.ts');
      const start = GameEngine.prototype.startGame;
      GameEngine.prototype.startGame = function (...args) { window.testEngine = this; return start.apply(this, args); };
      const { ParticleSystem } = await import('/src/game/Particle.ts');
      const { VFXManager } = await import('/src/game/vfx/VFXManager.ts');
      const { DEFAULT_SHOT_STYLE } = await import('/src/game/vfx/projectileStyle.ts');
      const p = new ParticleSystem();
      let enabled = true;
      const vfx = new VFXManager(p, () => enabled);
      for (const source of ['player', 'sidekick']) {
        p.clear(); vfx.muzzle(10, 20, DEFAULT_SHOT_STYLE, source);
        if (!p.items.some(p => p.shape === 'ring') || !p.items.some(p => p.shape === 'streak')) throw new Error('Missing firing layers');
      }
      p.clear(); vfx.impact(10, 20, DEFAULT_SHOT_STYLE, { crit: true });
      if (!p.items.some(p => p.shape === 'ring')) throw new Error('Missing impact ring');
      vfx.monsterMuzzle(10, 20, 0, 100, 'FIRE'); vfx.monsterImpact(10, 20, 'FIRE');
      if (p.items.some(p => !Number.isFinite(p.vx + p.vy + p.size))) throw new Error('Invalid effects');
      p.update(1);
      if (p.items.length) throw new Error('Effects did not expire');
      enabled = false;
      vfx.muzzle(10, 20, DEFAULT_SHOT_STYLE); vfx.monsterImpact(10, 20, 'FIRE');
      if (p.items.length) throw new Error('Disabled particles emitted');
    });
    await page.getByRole('button', { name: 'TAKE FLIGHT', exact: true }).click();
    await page.waitForSelector('.hud-compact');
    await page.waitForTimeout(1200);
    assert.equal(await page.getByRole('button', { name: 'Pause', exact: true }).count(), 1);
    await page.getByRole('button', { name: 'Special', exact: true }).waitFor();
    await page.getByRole('button', { name: 'Pause', exact: true }).click();
    await page.getByRole('heading', { name: 'PAUSED', exact: true }).waitFor();
    await page.getByRole('button', { name: 'RESUME', exact: true }).click();
    await page.evaluate(() => { window.testEngine.player.specialEnergy = 100; window.testEngine.player.invuln = 100; });
    await page.waitForFunction(() => document.querySelector('.bar-sp .bar-readout')?.textContent === 'READY');
    for (const viewport of [{ width: 1440, height: 900 }, { width: 390, height: 844 }, { width: 320, height: 568 }]) {
      await page.setViewportSize(viewport);
      const pause = await page.getByRole('button', { name: 'Pause', exact: true }).boundingBox();
      for (const meter of await page.locator('.bar-readout').all()) {
        const box = await meter.boundingBox();
        assert.ok(box.x + box.width < pause.x, 'Meter overlaps pause lane');
      }
    }
    await page.setViewportSize({ width: 390, height: 844 });
    await page.screenshot({ path: 'docs/art/combat-hud-mobile.png' });
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.keyboard.press('p');
    await page.getByRole('heading', { name: 'PAUSED', exact: true }).waitFor();
    await page.getByRole('button', { name: 'RESUME', exact: true }).click();
    await page.screenshot({ path: 'docs/art/portrait-gameplay-desktop.png' });
    assert.deepEqual(errors, []);
    console.log('Portrait frame, centered desktop layout, compact HUD, submenu bounds, artwork and mouse/keyboard pause passed at four viewport sizes.');
  } finally { await browser?.close(); server.kill(); }
})().catch(e => { console.error(e); process.exitCode = 1; });
