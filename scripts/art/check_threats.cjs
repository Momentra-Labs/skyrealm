const { chromium } = require('playwright');
const { spawn } = require('node:child_process');
const { mkdir } = require('node:fs/promises');

(async () => {
  const server = spawn(process.execPath, ['node_modules/vite/bin/vite.js', '--host', '127.0.0.1', '--port', '5175', '--strictPort'], { windowsHide: true });
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
      if (/\/assets\/(enemies|bosses|hazards)\//.test(response.url()) && response.status() >= 400) errors.push(`${response.status()} ${response.url()}`);
    });
    // A dedicated test document exercises the real renderer without production
    // debug hooks or editing any existing save. Pause physics for repeatable QA.
    await page.route('**/art-fixture', route => route.fulfill({ contentType: 'text/html', body: '<html><body style="margin:0;background:#241532"><div id="game" style="width:540px;height:960px"></div></body></html>' }));
    await page.goto('http://127.0.0.1:5175/art-fixture');
    const counts = await page.evaluate(async () => {
      const { assets } = await import('/src/assets/AssetLoader.ts');
      const paths = await import('/src/assets/assetManifest.ts');
      const types = await import('/src/types/game.ts');
      const { GameEngine } = await import('/src/game/GameEngine.ts');
      const { GameBridge } = await import('/src/game/phaser/GameBridge.ts');
      const { createPhaserGame } = await import('/src/game/phaser/PhaserGame.ts');
      const { Enemy } = await import('/src/game/Enemy.ts');
      const { Asteroid } = await import('/src/game/Asteroid.ts');
      const { Hailstone } = await import('/src/game/Hailstone.ts');
      const { Boss } = await import('/src/game/Boss.ts');
      const enemies = Object.values(types.EnemyType).map(id => paths.enemyPath(id));
      const bosses = Object.values(types.BossKind).map(id => paths.bossPath(id, 'idle'));
      const hazards = paths.hazardAssetUrls();
      const urls = [...enemies, ...bosses, ...hazards];
      await assets.load([...urls, ...paths.hangarBootUrls(), ...paths.worldAssetUrls(types.WorldId.MEADOWS)]);
      if (urls.some(url => !assets.has(url))) throw new Error('Missing threat assets');
      if (new Set(urls).size !== 36) throw new Error('Threat manifest is incomplete');
      const engine = new GameEngine();
      engine.state = types.GameState.PAUSED;
      engine.ignorePause = true;
      engine.player.reset();
      engine.player.age = 2;
      const selected = ['DRONE', 'TANK', 'MAGE', 'SWARM', 'VOID_BAT', 'CRYSTAL_GOLEM'];
      for (const [i, id] of selected.entries()) {
        const foe = new Enemy();
        foe.spawn(id, 90 + (i % 3) * 180, 1, 1);
        foe.y = 150 + Math.floor(i / 3) * 190;
        foe.age = 2;
        foe.phase = 0;
        foe.fireCd = i === 0 || i === 2 ? 0.1 : 1;
        if (i === 0) foe.hitFlash = 0.08; // warning must survive a hit flash
        engine.enemies.push(foe);
      }
      for (let i = 0; i < 3; i++) {
        const rock = new Asteroid(); rock.spawn(i + 1, 90 + i * 180, 530); rock.rotation = 0;
        engine.asteroids.push(rock);
        const ice = new Hailstone(); ice.spawn(90 + i * 180, 650); ice.variant = i;
        engine.hailstones.push(ice);
      }
      const game = createPhaserGame(document.querySelector('#game'), engine, new GameBridge(engine));
      window.threatFixture = { game, engine, Boss };
      return { enemies: enemies.length, bosses: bosses.length, hazards: hazards.length };
    });
    await page.waitForFunction(() => {
      const game = window.threatFixture?.game;
      return game && game.textures.exists('png:e:DRONE') && game.textures.exists('png:hazard:ice:2');
    });
    await mkdir('docs/art', { recursive: true });
    await page.evaluate(() => {
      const { game, engine } = window.threatFixture;
      const cues = game.scene.getScene('MainScene').children.list.find(item => item.type === 'Graphics' && item.depth === 26);
      if (!cues || cues.commandBuffer.length === 0) throw new Error('Charge cue missing during a hit');
      if (engine.particles.items.length !== 0) throw new Error('Hazard particles accumulated while paused');
    });
    await page.screenshot({ path: 'docs/art/threats-v2-hit-warning.png' });
    await page.evaluate(() => { window.threatFixture.engine.enemies[0].hitFlash = 0; });
    await page.waitForFunction(() => {
      const scene = window.threatFixture.game.scene.getScene('MainScene');
      return scene.children.list.some(item => item.texture?.key === 'png:e:DRONE' && !item.tintFill);
    });
    await page.screenshot({ path: 'docs/art/threats-v2-gameplay.png' });
    await page.evaluate(() => {
      const { engine, Boss } = window.threatFixture;
      engine.enemies.length = 0;
      const boss = new Boss(); boss.spawn('IRON_HYDRA', 1); boss.x = 270; boss.y = 230; boss.age = 2; boss.intro = 0; boss.fireCd = 0.1;
      engine.boss = boss;
    });
    await page.waitForFunction(() => window.threatFixture.game.textures.exists('png:b:IRON_HYDRA:attack'));
    await page.screenshot({ path: 'docs/art/threats-v2-boss.png' });
    await page.evaluate(() => window.threatFixture.game.destroy(true));
    if (errors.length) throw new Error(errors.join('\n'));
    console.log('Threat asset and renderer checks passed:', counts);
  } finally {
    if (browser) await browser.close();
    server.kill();
  }
})().catch(error => { console.error(error); process.exitCode = 1; });
