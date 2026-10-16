const { chromium } = require('playwright');
const { spawn } = require('node:child_process');
const assert = require('node:assert/strict');

(async () => {
  const server = spawn(process.execPath, ['node_modules/vite/bin/vite.js', '--host', '127.0.0.1', '--port', '5176', '--strictPort'], { windowsHide: true });
  let browser;
  try {
    await new Promise((resolve, reject) => {
      server.stdout.on('data', data => { if (data.toString().includes('Local:')) resolve(); });
      server.on('error', reject);
      server.on('exit', code => reject(new Error(`Vite exited: ${code}`)));
    });
    browser = await chromium.launch({ channel: 'msedge', headless: true });
    const page = await browser.newPage({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true });
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    await page.goto('http://127.0.0.1:5176/');
    // Capture the real engine through its prototype only inside this test page.
    await page.evaluate(async () => {
      const { GameEngine } = await import('/src/game/GameEngine.ts');
      const start = GameEngine.prototype.startGame;
      GameEngine.prototype.startGame = function (...args) { window.flowEngine = this; return start.apply(this, args); };
      const { RunDirector } = await import('/src/game/RunDirector.ts');
      const d = new RunDirector(); d.start('NORMAL');
      let bosses = 0;
      for (let i = 0; i < 450; i++) bosses += d.update(0.1, false).filter(e => e.boss).length;
      bosses += d.update(0.1, false).filter(e => e.boss).length;
      if (bosses !== 1) throw new Error('Expected first boss after 45 seconds');
      const world = d.world().id;
      for (let i = 0; i < 1000; i++) d.update(0.1, true);
      if (world !== d.world().id) throw new Error('Realm changed during boss');
      d.bossDefeated();
      for (let i = 0; i < 39; i++) if (d.update(0.1, false).some(e => e.spawn || e.form || e.boss)) throw new Error('Combat during treasure break');
      d.update(0.2, false);
      if (d.stage !== 2 || d.world().id === world || d.ramp !== 1) throw new Error('Realm did not advance');
      d.start('TRAINING');
      for (let i = 0; i < 1000; i++) if (d.update(0.1, false).some(e => e.boss)) throw new Error('Boss in training');
      d.start('RAID');
      if (!d.update(0.1, false).some(e => e.boss) || d.update(0.1, false).length) throw new Error('Raid start regression');
    });
    await page.goto('http://127.0.0.1:5176/#play');
    // Navigation may reload; install the capture before the launch click.
    await page.evaluate(async () => {
      const { GameEngine } = await import('/src/game/GameEngine.ts');
      const start = GameEngine.prototype.startGame;
      GameEngine.prototype.startGame = function (...args) { window.flowEngine = this; return start.apply(this, args); };
    });
    await page.getByRole('button', { name: 'TAKE FLIGHT', exact: true }).click({ timeout: 60000 });
    await page.waitForFunction(() => window.flowEngine?.state === 'PLAYING');
    assert.equal(await page.locator('.joy-pad').count(), 0);
    const touch = await page.context().newCDPSession(page);
    await touch.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: 300, y: 650 }] });
    await page.waitForFunction(() => window.flowEngine.input.pointerAim);
    await touch.send('Input.dispatchTouchEvent', { type: 'touchCancel', touchPoints: [] });
    assert.equal(await page.evaluate(() => window.flowEngine.input.pointerAim), false);
    await page.getByRole('button', { name: 'Pause', exact: true }).click();
    await page.waitForFunction(() => window.flowEngine.state === 'PAUSED');
    await page.getByRole('button', { name: 'RESUME', exact: true }).click();
    await page.waitForFunction(() => window.flowEngine.state === 'PLAYING');
    await page.evaluate(() => {
      const e = window.flowEngine;
      e.player.invuln = 100;
      e.director.bossCd = 0;
    });
    await page.waitForFunction(() => !!window.flowEngine.boss);
    await page.evaluate(() => {
      const e = window.flowEngine; e.killBoss();
      if (e.director.recovery !== 4 || e.enemyShots.length || e.enemies.length || e.asteroids.length || e.hailstones.length) throw new Error('Treasure break not safe');
      e.player.alive = false;
    });
    await page.getByRole('heading', { name: 'FLIGHT COMPLETE' }).waitFor();
    const before = await page.evaluate(() => { const e = window.flowEngine; return { level: e.session.data.guardians.AURELIA.level, coins: e.session.data.profile.coins, cost: e.session.guardianUpgradeCost(), damage: e.player.damageMult }; });
    await page.getByRole('button', { name: /UPGRADE GUARDIAN/ }).click();
    const after = await page.evaluate(() => { const s = window.flowEngine.session.data; return { level: s.guardians.AURELIA.level, coins: s.profile.coins }; });
    assert.equal(after.level, before.level + 1); assert.equal(after.coins, before.coins - before.cost);
    await page.screenshot({ path: 'docs/art/flow-results.png' });
    await page.getByRole('button', { name: 'FLY AGAIN' }).click();
    await page.waitForFunction(() => window.flowEngine.state === 'PLAYING');
    assert.ok(await page.evaluate(damage => window.flowEngine.player.damageMult > damage, before.damage));
    assert.equal(await page.evaluate(() => window.flowEngine.director.stage), 1);
    await page.screenshot({ path: 'docs/art/flow-gameplay.png' });
    await page.evaluate(async () => {
      const { GameSession } = await import('/src/services/GameSession.ts');
      const live = window.flowEngine.session;
      const restored = new GameSession();
      if (restored.data.guardians.AURELIA.level !== live.data.guardians.AURELIA.level) throw new Error('Upgrade not persisted');
      live.data.profile.coins = 0;
      const level = live.data.guardians.AURELIA.level;
      live.upgradeGuardian();
      if (live.data.guardians.AURELIA.level !== level) throw new Error('Unaffordable upgrade accepted');
    });
    assert.deepEqual(errors, []);
    console.log('Flow checks passed: onboarding, touch, pause, realm/boss pacing, treasure break, upgrade persistence, retry, training and raid.');
  } finally { await browser?.close(); server.kill(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
