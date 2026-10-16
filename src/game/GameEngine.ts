import { AbilityId, EnemyType, GameState, GuardianId, PowerUpType, RunMode, WorldId } from '../types/game.ts';
import type {
  BossKind,
  ElementId,
  EnemyType as EnemyTypeT,
  GameSettings,
  GameSnapshot,
  GameState as GameStateT,
  PowerUpType as PowerUpTypeT,
  RunMode as RunModeT,
  RunResult,
} from '../types/game.ts';
import {
  BOSS_WARNING_TIME,
  DIFFICULTY_MODS,
  LOGICAL_WIDTH,
  PLAYER,
  RAID_SECONDS,
  WEAPON_NAMES,
} from './constants.ts';
import { chance, pick, randInt, randRange } from '../utils/random.ts';
import { AudioManager } from './AudioManager.ts';
import { Asteroid } from './Asteroid.ts';
import { Hailstone } from './Hailstone.ts';
import { Boss } from './Boss.ts';
import { Bullet } from './Bullet.ts';
import { Coin } from './Coin.ts';
import { CollisionSystem } from './CollisionSystem.ts';
import { Enemy } from './Enemy.ts';
import { EnemyProjectile } from './EnemyProjectile.ts';
import type { MuzzleCue } from './EnemyProjectile.ts';
import { InputManager } from './InputManager.ts';
import { ObjectPool } from './ObjectPool.ts';
import { ParticleSystem } from './Particle.ts';
import { Player } from './Player.ts';
import { PowerUp } from './PowerUp.ts';
import { ScoreSystem } from './ScoreSystem.ts';
import { ScreenShake } from './ScreenShake.ts';
import { Sidekick } from './Sidekick.ts';
import { Starfield } from './Starfield.ts';
import { WaveManager } from './WaveManager.ts';
import { WeaponSystem } from './WeaponSystem.ts';
import { FloatText } from './FloatText.ts';
import { RunDirector } from './RunDirector.ts';
import { GameSession, companionHas } from '../services/GameSession.ts';
import { GUARDIAN_META, guardianStatScale } from './content/guardians.ts';
import { BOSS_META } from './content/bosses.ts';
import { WORLDS } from './content/worlds.ts';
import { EMBER_ASTEROID, FROST_HAIL, WORLD_HAZARD_RATE } from './content/hazards.ts';
import { PICKUP_FLASH, pickupStyle } from './content/pickups.ts';
import type { WavePiece } from './content/formations.ts';
import { SPECIES_META } from './content/aetherlings.ts';
import { foeAura } from './content/foeArt.ts';
import { elementMult, weaknessOf } from './content/elements.ts';
import { SKY, skyShell } from './content/skies.ts';
import { VFXManager } from './vfx/VFXManager.ts';
import { guardianShotStyle } from './vfx/projectileStyle.ts';
import { EggTier } from '../types/game.ts';
import { assets } from '../assets/AssetLoader.ts';
import { combatPackUrls, guardianPath, speciesAssetUrls, worldAssetUrls } from '../assets/assetManifest.ts';
import type { AetherlingSpecies } from '../types/game.ts';

/** Seconds a coin pickup streak survives without another grab. */
const COIN_STREAK_HOLD = 1.1;

export class GameEngine {
  state: GameStateT = GameState.MENU;
  mode: RunModeT = RunMode.NORMAL;
  readonly player = new Player();
  readonly input = new InputManager();
  readonly audio = new AudioManager();
  readonly particles = new ParticleSystem();
  readonly vfx = new VFXManager(this.particles, () => this.settings.particlesEnabled);
  readonly starfield = new Starfield();
  readonly shake = new ScreenShake();
  readonly score = new ScoreSystem();
  readonly waves = new WaveManager();
  readonly weapons = new WeaponSystem();
  readonly collision = new CollisionSystem();
  readonly floats = new FloatText();
  readonly director = new RunDirector();
  readonly wingLeft = new Sidekick();
  readonly wingRight = new Sidekick();
  readonly wingCloneA = new Sidekick();
  readonly wingCloneB = new Sidekick();
  readonly session: GameSession;
  ignorePause = false;

  readonly bullets: Bullet[] = [];
  readonly enemyShots: EnemyProjectile[] = [];
  readonly enemies: Enemy[] = [];
  readonly asteroids: Asteroid[] = [];
  readonly hailstones: Hailstone[] = [];
  readonly powerUps: PowerUp[] = [];
  readonly coins: Coin[] = [];
  boss: Boss | null = null;
  // Headroom covers a full four-sidekick formation of spells alongside a maxed hero
  // volley; without it the tail of the hero's fan gets dropped.
  private readonly bulletPool = new ObjectPool(() => new Bullet(), (b) => b.reset(), 160);
  /** Scratch target handed to homing shots, see nearestTo. */
  private readonly aim = { x: 0, y: 0 };
  /** Bound once: enemies fire every frame, so an inline closure would churn. */
  private readonly muzzleCue: MuzzleCue = (x, y, vx, vy, element) =>
    this.vfx.monsterMuzzle(x, y, vx, vy, element);
  private readonly shotPool = new ObjectPool(() => new EnemyProjectile(), (p) => p.reset(), 160);
  private readonly enemyPool = new ObjectPool(() => new Enemy(), () => undefined, 140);
  private readonly asteroidPool = new ObjectPool(() => new Asteroid(), () => undefined, 90);
  private readonly hailPool = new ObjectPool(() => new Hailstone(), () => undefined, 50);
  private readonly powerPool = new ObjectPool(() => new PowerUp(), () => undefined, 16);
  private readonly coinPool = new ObjectPool(() => new Coin(), () => undefined, 80);
  private countdown = 0;
  private countdownMark = 4;
  private warningTimer = 0;
  private deathTimer = 0;
  private raidTimer = 0;
  private banner = '';
  private bannerLife = 0;
  private stormTimer = 0;
  private asteroidTimer = 0;
  private hailTimer = 1.2;
  private pausedFrom: GameStateT = GameState.PLAYING;
  private isNewHighScore = false;
  private runCoins = 0;
  private runCrystals = 0;
  private runTrophies = 0;
  private runEssence = 0;
  private runEggs: Partial<Record<EggTier, number>> = {};
  private runShards: Partial<Record<ElementId, number>> = {};
  private lastComboMult = 1;
  private lastBossDamage = 0;
  private coinStreak = 0;
  private coinStreakTimer = 0;
  private wakeCd = 0;
  private readonly snap = emptySnapshot();

  constructor(session?: GameSession) {
    this.session = session ?? new GameSession();
    this.syncSettings();
    this.starfield.setWorld(WorldId.MEADOWS);
  }

  get settings(): GameSettings {
    return this.session.data.settings;
  }

  destroy(): void {
    this.audio.destroy();
    this.input.releaseAll();
  }

  setIgnorePause(value: boolean): void {
    this.ignorePause = value;
  }

  applySettings(next: Partial<GameSettings>): void {
    this.session.applySettings(next);
    this.syncSettings();
  }

  startGame(mode: RunModeT = RunMode.NORMAL, raidKind?: BossKind): void {
    this.audio.unlock();
    this.audio.setBed('flight');
    this.mode = mode;
    this.resetRun(raidKind);
    this.state = GameState.COUNTDOWN;
    this.countdown = 0.85;
    this.countdownMark = 4;
  }

  restart(): void {
    this.startGame(this.mode, this.director.raidKind ?? undefined);
  }

  goToMenu(): void {
    this.clearWorld();
    this.state = GameState.MENU;
    this.audio.setBed('hangar');
    this.player.reset();
    this.starfield.setWorld(WorldId.MEADOWS);
  }

  pause(): void {
    if (
      this.state === GameState.PLAYING ||
      this.state === GameState.BOSS_FIGHT ||
      this.state === GameState.COUNTDOWN ||
      this.state === GameState.BOSS_WARNING
    ) {
      this.pausedFrom = this.state;
      this.state = GameState.PAUSED;
    }
  }

  resume(): void {
    if (this.state === GameState.PAUSED) this.state = this.pausedFrom;
  }

  bannerInfo(): { text: string; life: number } {
    return { text: this.banner, life: this.bannerLife };
  }

  getSnapshot(): GameSnapshot {
    const world = this.director.world();
    const s = this.snap;
    const g = GUARDIAN_META[this.session.data.equippedGuardian];
    s.state = this.state;
    s.mode = this.mode;
    s.score = this.score.score;
    s.highScore = Math.max(this.settings.highScore, this.score.score);
    s.level = Math.max(1, 1 + this.director.ramp);
    s.sectorName = world.name;
    const shell = skyShell(this.starfield.palette());
    s.skyTop = shell.top;
    s.skyGlow = shell.glow;
    s.skyMid = shell.mid;
    s.skyGround = shell.ground;
    s.stageTitle = this.mode === RunMode.RAID ? 'BOSS RAID' : this.mode === RunMode.TRAINING ? 'TRAINING' : this.director.recovery > 0 ? 'COLLECT YOUR TREASURE' : `REALM ${this.director.stage} · ${this.boss ? 'BOSS BATTLE' : `BOSS IN ${Math.ceil(Math.max(0, this.director.bossCd))}s`}`;
    s.health = this.player.health;
    s.maxHealth = this.player.maxHealth;
    s.shield = this.player.shield;
    s.maxShield = this.player.maxShield;
    s.weaponLevel = this.player.weaponLevel;
    s.weaponName = WEAPON_NAMES[this.player.weaponLevel - 1] ?? 'BOLT I';
    s.combo = this.score.combo;
    s.comboMultiplier = this.score.multiplier();
    s.specialEnergy = this.player.specialEnergy;
    s.specialReady = this.player.canSpecial();
    s.countdownLabel = this.countdownLabel();
    const bossDef = this.boss ? BOSS_META[this.boss.kind] : null;
    s.bossName = this.boss?.name ?? '';
    s.bossHealth = this.boss?.health ?? 0;
    s.bossMaxHealth = this.boss?.maxHealth ?? 1;
    s.bossElement = bossDef?.element ?? '';
    s.bossWeak = bossDef ? weaknessOf(bossDef.element) ?? 'NONE' : '';
    // Includes the warning so the bar slides in alongside the entrance instead of
    // snapping on at the moment the fight starts.
    s.showBossBar =
      (this.state === GameState.BOSS_FIGHT ||
        this.state === GameState.BOSS_WARNING ||
        this.mode === RunMode.RAID) &&
      this.boss !== null;
    s.isNewHighScore = this.isNewHighScore;
    s.finalScore = this.score.score;
    s.enemiesDestroyed = this.score.enemiesDestroyed;
    s.bossesDefeated = this.score.bossesDefeated;
    s.bestCombo = this.score.bestCombo;
    s.accuracy = this.score.accuracy();
    s.levelScore = this.score.levelScore;
    s.levelKills = this.score.levelKills;
    s.levelBonus = 0;
    s.magnetTime = this.player.magnetTime;
    s.rushTime = this.player.rushTime;
    s.doubleShotTime = this.player.doubleShotTime;
    s.freezeTime = this.player.freezeTime;
    s.guardianName = g.name;
    s.runCoins = this.runCoins;
    s.runCrystals = this.runCrystals;
    s.bankCoins = this.session.data.profile.coins;
    s.bankCrystals = this.session.data.profile.crystals;
    s.trophies = this.session.data.profile.trophies;
    s.bossEnergy = this.session.data.profile.bossEnergy;
    s.raidTimer = this.raidTimer;
    s.raidDamage = this.boss?.damageTaken ?? 0;
    s.puzzleHint = '';
    s.clearRank = '';
    s.clearLine = '';
    s.nextLevel = 0;
    s.nextSectorName = '';
    s.nextStageTitle = '';
    s.resupplyLine = '';
    s.warpIn = 0;
    return s;
  }

  update(dt: number): void {
    if (this.input.consumePause()) {
      if (!this.ignorePause) {
        if (this.state === GameState.PAUSED) this.resume();
        else this.pause();
      }
    }
    this.audio.setBed(this.musicBedForState());
    if (this.state === GameState.PAUSED) return;
    if (this.state === GameState.GAME_OVER || this.state === GameState.VICTORY) {
      this.starfield.update(dt * 0.25);
      this.particles.update(dt);
      this.floats.update(dt);
      return;
    }

    this.audio.update(dt);
    this.shake.update(dt);
    const rush = this.player.alive && this.player.rushTime > 0 ? 1.7 : 1;
    this.starfield.update(dt, rush);

    if (this.state === GameState.MENU) {
      this.particles.update(dt);
      return;
    }

    const axis = this.input.axis();
    this.player.update(dt, axis.x, axis.y, this.input.pointerAim, this.input.pointerX, this.input.pointerY, this.particles);
    this.puffWake(dt);

    if (this.state === GameState.COUNTDOWN) {
      this.countdown -= dt;
      const label = this.countdownLabel();
      const mark = label === 'GO!' ? 0 : 1;
      if (mark < this.countdownMark) {
        this.countdownMark = mark;
        this.audio.play(label === 'GO!' ? 'go' : 'countdown');
      }
      if (this.countdown <= 0) this.state = GameState.PLAYING;
      this.particles.update(dt);
      return;
    }

    // The warning runs *over* live play rather than freezing it: the boss is
    // already gliding down out of frame while the banner sweeps past, and its own
    // intro window keeps it from firing until it has settled.
    if (this.state === GameState.BOSS_WARNING) {
      this.warningTimer -= dt;
      if (this.warningTimer <= 0) this.engageBoss();
    }

    if (!this.player.alive) {
      this.deathTimer -= dt;
      this.updateWorld(dt, false);
      if (this.deathTimer <= 0) {
        this.state = GameState.GAME_OVER;
        this.finishRun(false);
      }
      return;
    }

    if (
      this.state === GameState.PLAYING ||
      this.state === GameState.BOSS_FIGHT ||
      this.state === GameState.BOSS_WARNING
    ) {
      this.updateCombat(dt);
      this.updateWorld(dt, true);
      if (this.mode === RunMode.RAID && this.state === GameState.BOSS_FIGHT) {
        this.raidTimer -= dt;
        if (this.raidTimer <= 0) {
          this.state = GameState.VICTORY;
          this.finishRun(true);
        }
      }
    }
  }

  render(ctx: CanvasRenderingContext2D): void {
    const shake = this.shake.offset();
    ctx.save();
    ctx.translate(shake.x, shake.y);
    this.starfield.render(ctx);
    for (const rock of this.asteroids) rock.render(ctx);
    for (const hail of this.hailstones) hail.render(ctx);
    for (const enemy of this.enemies) enemy.render(ctx);
    this.boss?.render(ctx);
    for (const shot of this.enemyShots) shot.render(ctx);
    for (const bullet of this.bullets) bullet.render(ctx);
    for (const item of this.powerUps) item.render(ctx);
    for (const coin of this.coins) coin.render(ctx);
    if (this.state !== GameState.MENU) {
      this.wingLeft.render(ctx);
      this.wingRight.render(ctx);
      if (this.player.hexCloneTime > 0) {
        this.wingCloneA.render(ctx);
        this.wingCloneB.render(ctx);
      }
      this.player.render(ctx);
    }
    this.particles.render(ctx);
    this.floats.render(ctx);
    this.drawBanner(ctx);
    ctx.restore();
  }

  private resetRun(raidKind?: BossKind): void {
    this.score.resetRun();
    this.player.maxHealth = PLAYER.maxHealth;
    this.player.maxShield = PLAYER.maxShield;
    this.player.reset();
    this.applyLoadout();
    this.clearWorld();
    this.isNewHighScore = false;
    this.deathTimer = 0;
    this.runCoins = 0;
    this.runCrystals = 0;
    this.runTrophies = 0;
    this.runEssence = 0;
    this.runEggs = {};
    this.runShards = {};
    this.lastComboMult = 1;
    this.lastBossDamage = 0;
    this.coinStreak = 0;
    this.coinStreakTimer = 0;
    this.director.start(this.mode, raidKind);
    this.starfield.setWorld(this.director.world().id);
    const gid = this.session.data.equippedGuardian;
    void assets.load(combatPackUrls());
    void assets.load(worldAssetUrls(this.director.world().id));
    void assets.load([guardianPath(gid, 'idle'), guardianPath(gid, 'hit'), guardianPath(gid, 'ability')]);
    for (const u of this.session.equippedUnits()) {
      if (u) void assets.load(speciesAssetUrls(u.species as AetherlingSpecies));
    }
    this.raidTimer = this.mode === RunMode.RAID ? RAID_SECONDS : 0;
    this.warningTimer = 0;
    this.banner = this.mode === RunMode.RAID ? 'RAID' : this.mode === RunMode.TRAINING ? 'TRAINING YARD' : 'TAKE FLIGHT';
    this.bannerLife = 1.6;
    this.asteroidTimer = 1.2;
    this.hailTimer = 1.4;
    this.stormTimer = 0;
  }

  private applyLoadout(): void {
    const id = this.session.data.equippedGuardian;
    const def = GUARDIAN_META[id];
    const owned = this.session.data.guardians[id];
    const scale = guardianStatScale(owned.level);
    const units = this.session.equippedUnits();
    this.player.guardian = id;
    this.player.baseFireRate = def.fireRate * (id === GuardianId.KAIRO ? 1.08 : 1);
    this.player.fireRate = this.player.baseFireRate;
    this.player.damageMult = def.damage * scale * (id === GuardianId.AURELIA ? 1.08 : 1);
    this.player.critChance = def.crit + (owned.level >= 20 ? 0.04 : 0);
    this.player.critMult = id === GuardianId.NYXARA ? 2.2 : 1.8;
    this.player.energyMult = id === GuardianId.ORION ? 1.8 : 1;
    this.player.coinMult = id === GuardianId.VESPER ? 1.25 : 1;
    this.player.bloomMagnet = id === GuardianId.ELARA || companionHas(units, AbilityId.TREASURE_MAGNET);
    this.player.maxHealth = Math.round(PLAYER.maxHealth * (id === GuardianId.VESPER ? 0.9 : 1));
    this.player.health = this.player.maxHealth;
    this.player.weaponLevel = 1;
    this.player.reviveLeft = 0;
    if (companionHas(units, AbilityId.TREASURE_MAGNET)) this.player.bloomMagnet = true;
    this.wingLeft.bind(units[0], 0, this.player);
    this.wingRight.bind(units[1], 1, this.player);
    this.wingCloneA.bind(units[0], 2, this.player);
    this.wingCloneB.bind(units[1], 3, this.player);
  }

  private updateCombat(dt: number): void {
    if (this.player.tryFire()) {
      const fired = this.weapons.fire(this.player, this.bullets, this.bulletPool, this.vfx, this.audio);
      this.score.shotsFired += fired;
    }
    const left = this.wingLeft.update(dt, this.player, this.bullets, this.bulletPool, this.vfx);
    const right = this.wingRight.update(dt, this.player, this.bullets, this.bulletPool, this.vfx);
    let extra = 0;
    if (this.player.hexCloneTime > 0) {
      extra += this.wingCloneA.update(dt, this.player, this.bullets, this.bulletPool, this.vfx);
      extra += this.wingCloneB.update(dt, this.player, this.bullets, this.bulletPool, this.vfx);
    }
    this.score.shotsFired += left + right + extra;
    if (this.input.consumeSpecial()) this.triggerSpecial();

    // Counts the warning too, so the director holds its waves the moment a boss
    // is inbound instead of stacking trash on top of the entrance.
    const fighting =
      (this.state === GameState.BOSS_FIGHT || this.state === GameState.BOSS_WARNING) && !!this.boss?.alive;
    for (const ev of this.director.update(dt, fighting)) {
      if (ev.banner) {
        // A boss event raises its own warning banner over the HUD, so skip the
        // canvas one rather than stacking two headlines on top of each other.
        if (!ev.boss) {
          this.banner = ev.banner;
          this.bannerLife = 1.8;
        }
        this.starfield.setWorld(ev.worldId);
        void assets.load(worldAssetUrls(ev.worldId));
      }
      if (ev.spawn) this.spawnPack(ev.spawn.type, ev.spawn.count, WORLDS[ev.worldId].element);
      if (ev.form) this.spawnWave(ev.form, WORLDS[ev.worldId].element);
      if (ev.boss) {
        this.state = GameState.BOSS_WARNING;
        this.warningTimer = BOSS_WARNING_TIME;
        this.audio.play('warning');
        this.summonBoss(ev.boss);
      }
    }
    if (this.state === GameState.PLAYING && this.director.recovery <= 0 && this.director.time > 6) this.spawnHazards(dt);
  }

  private spawnPack(type: EnemyTypeT, count: number, element: ElementId): void {
    const mods = this.mods();
    this.waves.spawnGroup(
      type,
      count,
      this.enemies,
      this.enemyPool,
      mods.health * this.director.hpScale(),
      mods.speed * this.director.speedScale(),
    );
    for (let i = this.enemies.length - count; i < this.enemies.length; i++) {
      const e = this.enemies[i];
      if (e) e.element = element;
    }
  }

  private spawnWave(piece: WavePiece, element: ElementId): void {
    const mods = this.mods();
    const n = this.waves.spawnFormation(
      piece.kind,
      piece.type,
      piece.count,
      this.enemies,
      this.enemyPool,
      mods.health * this.director.hpScale(),
      mods.speed * this.director.speedScale(),
    );
    for (let i = this.enemies.length - n; i < this.enemies.length; i++) {
      const e = this.enemies[i];
      if (e) e.element = element;
    }
  }

  /** Puts the boss on the field above the top edge so it can descend on cue. */
  private summonBoss(kind: BossKind): void {
    const boss = new Boss();
    boss.spawn(kind, this.mods().boss * this.director.hpScale(), this.mode === RunMode.RAID);
    this.boss = boss;
  }

  /** Hands control to the boss once it has flown into place. */
  private engageBoss(): void {
    this.state = GameState.BOSS_FIGHT;
    const boss = this.boss;
    if (!boss) return;
    // Called on arrival rather than on spawn, so the tag reads under the boss
    // where the player is looking instead of off the top of the screen.
    this.floats.spawn(boss.x, boss.y + 70, `WEAK TO ${weaknessOf(BOSS_META[boss.kind].element) ?? 'NONE'}`, '#ffe08a', 18, true);
  }

  private updateWorld(dt: number, collide: boolean): void {
    const mods = this.mods();
    for (let i = this.bullets.length - 1; i >= 0; i--) {
      const b = this.bullets[i]!;
      // Each guided shot picks its own nearest foe, so a volley fans out over the
      // field instead of every spell piling onto the one target closest to the hero.
      const aim = b.homing ? this.nearestTo(b.x, b.y) : null;
      if (!b.update(dt, aim?.x, aim?.y)) this.releaseBullet(i);
    }
    for (let i = this.enemyShots.length - 1; i >= 0; i--) {
      if (!this.enemyShots[i]!.update(dt, this.player.x, this.player.y)) this.releaseShot(i);
    }
    for (let i = this.enemies.length - 1; i >= 0; i--) {
      const alive = this.enemies[i]!.update(
        dt,
        this.player,
        this.enemyShots,
        this.shotPool,
        mods.projectileSpeed,
        this.muzzleCue,
      );
      if (!alive) this.releaseEnemy(i);
    }
    if (this.boss?.alive) {
      this.boss.update(
        dt,
        this.player,
        this.enemyShots,
        this.shotPool,
        (type) => this.spawnPack(type, 1, BOSS_META[this.boss!.kind].element),
        mods.projectileSpeed,
        () => this.audio.play('bossAttack'),
        (line) => this.floats.spawn(this.boss!.x, this.boss!.y + 50, line, '#ffe08a', 18, true),
        this.muzzleCue,
      );
    }
    for (let i = this.asteroids.length - 1; i >= 0; i--) {
      if (!this.asteroids[i]!.update(dt)) this.releaseAsteroid(i);
    }
    for (let i = this.hailstones.length - 1; i >= 0; i--) {
      if (!this.hailstones[i]!.update(dt)) this.releaseHail(i);
    }
    for (let i = this.powerUps.length - 1; i >= 0; i--) {
      if (!this.powerUps[i]!.update(dt, this.player)) this.releasePower(i);
    }
    for (let i = this.coins.length - 1; i >= 0; i--) {
      if (!this.coins[i]!.update(dt, this.player)) this.releaseCoin(i);
    }
    this.coinStreakTimer = Math.max(0, this.coinStreakTimer - dt);
    if (this.coinStreakTimer === 0) this.coinStreak = 0;
    this.particles.update(dt);
    this.floats.update(dt);
    this.bannerLife = Math.max(0, this.bannerLife - dt);
    this.stormTimer = Math.max(0, this.stormTimer - dt);
    if (collide && this.player.alive) this.resolveCollisions();
  }

  /**
   * Closest live target to a point. Reuses one scratch object because this runs per
   * homing shot per frame and must not litter the heap.
   */
  private nearestTo(x: number, y: number): { x: number; y: number } | null {
    let near = Infinity;
    let nx = 0;
    let ny = 0;
    for (const e of this.enemies) {
      const d = (e.x - x) ** 2 + (e.y - y) ** 2;
      if (d < near) {
        near = d;
        nx = e.x;
        ny = e.y;
      }
    }
    if (this.boss?.alive) {
      const d = (this.boss.x - x) ** 2 + (this.boss.y - y) ** 2;
      if (d < near) {
        near = d;
        nx = this.boss.x;
        ny = this.boss.y;
      }
    }
    if (near === Infinity) return null;
    this.aim.x = nx;
    this.aim.y = ny;
    return this.aim;
  }

  private resolveCollisions(): void {
    for (let i = this.bullets.length - 1; i >= 0; i--) {
      const b = this.bullets[i]!;
      let hit = false;
      let hitBoss = false;
      for (let j = this.enemies.length - 1; j >= 0; j--) {
        const e = this.enemies[j]!;
        if (!this.collision.bulletHitsEnemy(b, e)) continue;
        hit = true;
        this.score.shotsHit += 1;
        const from = this.shotElement();
        const dmg = b.damage * elementMult(from, e.element);
        const killed = e.hurt(dmg);
        this.floats.spawn(e.x, e.y - 8, `${Math.round(dmg)}`, dmg > b.damage * 1.2 ? '#ffd24a' : '#fff', dmg > b.damage * 1.2 ? 18 : 13);
        this.audio.play('hit');
        if (killed) this.killEnemy(j);
        break;
      }
      if (!hit && this.boss?.alive && this.collision.bulletHitsBoss(b, this.boss)) {
        hit = true;
        hitBoss = true;
        this.score.shotsHit += 1;
        const from = this.shotElement();
        const dmg = b.damage * elementMult(from, BOSS_META[this.boss.kind].element);
        const slain = this.boss.hurt(dmg);
        this.floats.spawn(b.x, b.y, `${Math.round(dmg)}`, '#ffe08a', 16);
        this.audio.play('hit');
        if (slain) this.killBoss();
      }
      if (hit) {
        this.vfx.impact(b.x, b.y, b.style, { crit: b.crit, boss: hitBoss });
        if (b.pierce > 0) b.pierce -= 1;
        else this.releaseBullet(i);
      }
    }

    for (let i = this.enemyShots.length - 1; i >= 0; i--) {
      const s = this.enemyShots[i]!;
      if (!this.collision.projectileHitsPlayer(s, this.player)) continue;
      this.vfx.monsterImpact(s.x, s.y, s.element);
      this.hurtPlayer(s.damage);
      this.releaseShot(i);
    }
    for (let i = this.enemies.length - 1; i >= 0; i--) {
      const e = this.enemies[i]!;
      if (!this.collision.bodyHitsPlayer(e.x, e.y, e.radius, this.player)) continue;
      if (this.player.rushTime > 0) {
        this.killEnemy(i);
        continue;
      }
      this.hurtPlayer(e.type === EnemyType.KAMIKAZE ? 32 : 16);
      if (e.type === EnemyType.KAMIKAZE || e.type === EnemyType.LOOT_CRATE) this.killEnemy(i);
    }
    for (let i = this.asteroids.length - 1; i >= 0; i--) {
      const rock = this.asteroids[i]!;
      if (!this.collision.bodyHitsPlayer(rock.x, rock.y, rock.radius * 0.85, this.player)) continue;
      if (this.player.rushTime <= 0) this.hurtPlayer(14);
      this.breakAsteroid(i);
    }
    for (let i = this.hailstones.length - 1; i >= 0; i--) {
      const hail = this.hailstones[i]!;
      if (!this.collision.bodyHitsPlayer(hail.x, hail.y, hail.radius, this.player)) continue;
      if (this.player.rushTime <= 0) this.hurtPlayer(20);
      this.shatterHail(i);
    }
    if (this.boss?.alive && this.collision.bodyHitsPlayer(this.boss.x, this.boss.y, this.boss.radius * 0.7, this.player)) {
      if (this.player.rushTime > 0) {
        if (this.boss.hurt(24)) this.killBoss();
      } else this.hurtPlayer(20);
    }
    for (let i = this.powerUps.length - 1; i >= 0; i--) {
      const item = this.powerUps[i]!;
      if (!this.collision.powerUpHitsPlayer(item, this.player)) continue;
      this.collectPower(item.type, item.x, item.y);
      this.releasePower(i);
    }
    for (let i = this.coins.length - 1; i >= 0; i--) {
      const coin = this.coins[i]!;
      if (!this.collision.coinHitsPlayer(coin, this.player)) continue;
      const units = this.session.equippedUnits();
      const find = companionHas(units, AbilityId.COIN_FIND) ? 1.2 : 1;
      const gain = Math.round(coin.value * this.player.coinMult * find);
      this.runCoins += gain;
      // The streak only drives feedback: it climbs the pickup chime and swells
      // the burst, and never touches the payout above.
      this.coinStreak += 1;
      this.coinStreakTimer = COIN_STREAK_HOLD;
      const hot = this.coinStreak >= 5;
      this.floats.spawn(
        coin.x,
        coin.y - 10,
        `+${gain}`,
        hot ? '#fff6c8' : '#ffd24a',
        14 + Math.min(this.coinStreak, 8),
      );
      this.vfx.coinCollect(coin.x, coin.y, coin.tier, this.coinStreak);
      this.audio.coin(this.coinStreak);
      this.releaseCoin(i);
    }
  }

  private shotElement(): ElementId {
    const unit = this.session.equippedUnits()[0];
    return unit ? SPECIES_META[unit.species].element : WORLDS[this.director.world().id].element;
  }

  private hurtPlayer(amount: number): void {
    const units = this.session.equippedUnits();
    if (companionHas(units, AbilityId.THORNS)) {
      for (const e of this.enemies) {
        if (Math.hypot(e.x - this.player.x, e.y - this.player.y) < 80) e.hurt(8);
      }
    }
    const result = this.player.damage(amount);
    if (result === 'ignored') return;
    this.score.resetCombo();
    this.lastComboMult = 1;
    this.player.reactHit();
    this.shake.trigger(0.32);
    this.audio.play(result === 'shield' ? 'shield' : 'playerHit');
    if (result === 'dead') {
      this.particles.burstStars(this.player.x, this.player.y, 28, [255, 200, 120]);
      this.particles.puff(this.player.x, this.player.y, [255, 160, 60]);
      this.audio.play('explode');
      this.deathTimer = 1.1;
    }
  }

  private killEnemy(index: number): void {
    const e = this.enemies[index]!;
    this.score.registerKill();
    this.score.add(e.score, 1);
    this.player.addEnergy(PLAYER.energyPerKill);
    this.player.reactGrin();
    this.audio.play('explode');
    this.dropCoins(e.x, e.y, e.type === EnemyType.LOOT_CRATE ? 8 : e.type === EnemyType.ELITE ? 5 : 2);
    if (e.type === EnemyType.LOOT_CRATE) {
      this.runCrystals += randInt(2, 6);
      this.runEssence += chance(0.4) ? 1 : 0;
      this.addShard(e.element, 1);
      this.floats.spawn(e.x, e.y + 14, 'CHEST', '#7ee8ff', 14);
    }
    if (this.settings.particlesEnabled) {
      const aura = foeAura(e.type);
      this.particles.puff(e.x, e.y, aura);
      this.particles.burstStars(e.x, e.y, 8, aura);
      // A white shockwave from the body's edge outward: the "pop" that tells
      // you a foe is gone even when the screen is busy.
      ringTo(this.particles, e.x, e.y, [255, 255, 250], e.radius * 1.3, e.radius * 3.4, 0.26);
      ringTo(this.particles, e.x, e.y, aura, e.radius * 1.0, e.radius * 2.6, 0.34);
    }
    if (chance(e.type === EnemyType.ELITE || e.type === EnemyType.MINI_BOSS ? 0.5 : 0.18)) this.dropPower(e.x, e.y);
    this.addShard(e.element, chance(0.25) ? 1 : 0);
    const mult = this.score.multiplier();
    if (mult > this.lastComboMult) {
      this.lastComboMult = mult;
      this.floats.spawn(e.x, e.y - 28, `x${mult}`, '#ffd24a', 20);
    }
    this.releaseEnemy(index);
  }

  private killBoss(): void {
    if (!this.boss) return;
    const def = BOSS_META[this.boss.kind];
    this.score.registerKill();
    this.score.bossesDefeated += 1;
    this.score.add(4000, 1);
    this.runCoins += def.coins;
    this.runCrystals += def.crystals;
    this.runTrophies += def.trophies;
    this.runEssence += 1;
    if (chance(0.35)) this.runEggs.BASIC = (this.runEggs.BASIC ?? 0) + 1;
    this.dropCoins(this.boss.x, this.boss.y, 12);
    this.dropPower(this.boss.x, this.boss.y);
    this.lastBossDamage = this.boss.damageTaken;
    this.audio.play('bossExplode');
    this.floats.spawn(this.boss.x, this.boss.y, 'FELLED', '#ffd24a', 26);
    this.boss = null;
    if (this.mode === RunMode.RAID) {
      this.state = GameState.VICTORY;
      this.finishRun(true);
    } else {
      this.state = GameState.PLAYING;
      this.director.bossDefeated();
      this.shotPool.releaseAll(this.enemyShots);
      this.enemyPool.releaseAll(this.enemies);
      this.asteroidPool.releaseAll(this.asteroids);
      this.hailPool.releaseAll(this.hailstones);
      this.player.magnetTime = Math.max(this.player.magnetTime, 4);
      this.banner = 'BOSS CLEARED · TREASURE RUSH';
      this.bannerLife = 2;
    }
  }

  private collectPower(type: PowerUpTypeT, x: number, y: number): void {
    this.audio.play('powerup');
    const style = pickupStyle(type);
    this.vfx.pickupCollect(x, y, style);
    this.player.pickupFlash = PICKUP_FLASH;
    this.player.pickupType = type;
    let label = style.label;
    if (type === PowerUpType.CLOVER) {
      if (this.player.weaponLevel >= 12) {
        this.score.add(300, 1);
        label = '+300';
      } else this.player.upgradeWeapon();
    } else if (type === PowerUpType.MAGNET) this.player.magnetTime = 6.5;
    else if (type === PowerUpType.DOUBLE) this.player.doubleShotTime = 6;
    else if (type === PowerUpType.RUSH) {
      this.player.rushTime = 4;
      this.player.invuln = Math.max(this.player.invuln, 4);
    } else if (type === PowerUpType.HEART) {
      this.player.heal(30);
      this.player.addShield(12);
    } else if (type === PowerUpType.FREEZE) this.player.freezeTime = 4;
    else if (type === PowerUpType.BLAST) this.detonate(x, y);
    this.floats.spawn(x, y - 26, label, style.ring, 18);
  }

  private dropPower(x: number, y: number): void {
    if (this.mode === RunMode.TRAINING) return;
    const item = this.powerPool.acquire();
    if (!item) return;
    item.spawn(
      pick([
        PowerUpType.CLOVER,
        PowerUpType.MAGNET,
        PowerUpType.DOUBLE,
        PowerUpType.RUSH,
        PowerUpType.HEART,
        PowerUpType.FREEZE,
        PowerUpType.BLAST,
      ]),
      x,
      y,
    );
    this.powerUps.push(item);
  }

  private dropCoins(x: number, y: number, count: number): void {
    if (this.mode === RunMode.TRAINING) return;
    for (let i = 0; i < count; i++) {
      const coin = this.coinPool.acquire();
      if (!coin) return;
      const roll = Math.random();
      const tier = roll > 0.82 ? 'gem' : roll > 0.5 ? 'star' : 'plain';
      coin.spawn(x + randRange(-16, 16), y + randRange(-10, 10), tier === 'gem' ? 40 : tier === 'star' ? 20 : 10, tier);
      this.coins.push(coin);
    }
  }

  private addShard(el: ElementId, n: number): void {
    if (n <= 0 || this.mode === RunMode.TRAINING) return;
    this.runShards[el] = (this.runShards[el] ?? 0) + n;
  }

  private detonate(x: number, y: number): void {
    this.shake.trigger(0.4);
    this.particles.burstStars(x, y, 36, [255, 90, 200]);
    for (let i = this.enemies.length - 1; i >= 0; i--) {
      const e = this.enemies[i]!;
      if (Math.hypot(e.x - x, e.y - y) < 210 && e.hurt(70)) this.killEnemy(i);
    }
    if (this.boss?.alive && Math.hypot(this.boss.x - x, this.boss.y - y) < 230) {
      if (this.boss.hurt(90)) this.killBoss();
    }
  }

  private triggerSpecial(): void {
    if (!this.player.canSpecial()) return;
    this.player.consumeSpecial();
    this.audio.play('special');
    this.shake.trigger(0.7);
    const radius = this.player.guardian === GuardianId.ORION ? 260 : PLAYER.specialRadius;
    const dmg = this.player.guardian === GuardianId.ORION ? 130 : PLAYER.specialDamage;
    const style = guardianShotStyle(this.player.guardian);
    if (this.settings.particlesEnabled) {
      this.particles.burstStars(this.player.x, this.player.y, 40, style.particleColor);
      this.particles.puff(this.player.x, this.player.y, style.trailColor);
      // Ends exactly on the blast radius, so the ring shows what it reached.
      ringTo(this.particles, this.player.x, this.player.y, style.particleColor, 24, radius, 0.42);
      ringTo(this.particles, this.player.x, this.player.y, [255, 255, 250], 16, radius * 0.82, 0.32);
    }
    for (let i = this.enemies.length - 1; i >= 0; i--) {
      const e = this.enemies[i]!;
      if (Math.hypot(e.x - this.player.x, e.y - this.player.y) <= radius && e.hurt(dmg)) this.killEnemy(i);
    }
    if (this.boss?.alive && Math.hypot(this.boss.x - this.player.x, this.boss.y - this.player.y) <= radius + this.boss.radius) {
      if (this.boss.hurt(dmg)) this.killBoss();
    }
  }

  private spawnHazards(dt: number): void {
    if (this.mode === RunMode.RAID) return;
    const mix = WORLD_HAZARD_RATE[this.director.world().id];
    this.asteroidTimer -= dt * this.mods().spawn;
    if (this.asteroidTimer <= 0) {
      this.asteroidTimer = this.stormTimer > 0 ? 0.35 : 2.1 * mix.rock;
      const rock = this.asteroidPool.acquire();
      if (rock) {
        rock.spawn(chance(0.3) ? 2 : 1);
        this.asteroids.push(rock);
      }
    }
    this.hailTimer -= dt * this.mods().spawn;
    if (this.hailTimer <= 0) {
      this.hailTimer = 2.2 * mix.hail;
      const hail = this.hailPool.acquire();
      if (hail) {
        hail.spawn();
        this.hailstones.push(hail);
      }
    }
  }

  private breakAsteroid(index: number): void {
    const rock = this.asteroids[index]!;
    this.score.add(rock.score(), 1);
    this.audio.play('explode');
    this.vfx.hazardBurst(rock.x, rock.y, EMBER_ASTEROID);
    this.dropCoins(rock.x, rock.y, 1);
    this.releaseAsteroid(index);
  }

  private shatterHail(index: number): void {
    const hail = this.hailstones[index]!;
    this.score.add(80, 1);
    this.audio.play('explode');
    this.vfx.hazardBurst(hail.x, hail.y, FROST_HAIL);
    this.releaseHail(index);
  }

  private finishRun(survived: boolean): void {
    if (this.mode === RunMode.TRAINING) return;
    const result: RunResult = {
      mode: this.mode,
      score: this.score.score,
      coins: this.runCoins,
      crystals: this.runCrystals,
      trophies: this.runTrophies + (survived && this.mode === RunMode.RAID ? 10 : 0),
      essence: this.runEssence,
      shards: this.runShards,
      eggs: this.runEggs,
      kills: this.score.enemiesDestroyed,
      bosses: this.score.bossesDefeated,
      bossDamage: this.boss?.damageTaken ?? this.lastBossDamage,
      usedAbility: this.player.usedAbility,
      survived,
    };
    this.session.applyRun(result);
    this.isNewHighScore = this.score.score >= this.settings.highScore;
    this.audio.play(survived ? 'clear' : 'explode');
  }

  private mods() {
    return DIFFICULTY_MODS[this.settings.difficulty];
  }

  private syncSettings(): void {
    this.audio.setSound(this.settings.soundEnabled);
    this.audio.setMusic(this.settings.musicEnabled);
    this.shake.enabled = this.settings.screenShakeEnabled;
  }

  private musicBedForState(): 'hangar' | 'flight' {
    if (
      this.state === GameState.PLAYING ||
      this.state === GameState.BOSS_FIGHT ||
      this.state === GameState.BOSS_WARNING ||
      this.state === GameState.COUNTDOWN ||
      this.state === GameState.PAUSED
    ) {
      return 'flight';
    }
    return 'hangar';
  }

  private puffWake(dt: number): void {
    if (!this.player.alive || !this.settings.particlesEnabled) return;
    this.wakeCd -= dt;
    if (this.wakeCd > 0) return;
    this.wakeCd = this.player.rushTime > 0 ? 0.045 : 0.1;
    const drift = (Math.random() - 0.5) * 28;
    this.particles.emit(
      this.player.x + (Math.random() - 0.5) * 18,
      this.player.y + 24,
      drift,
      36 + Math.random() * 28,
      this.player.rushTime > 0 ? [255, 214, 120] : [255, 232, 206],
      0.38,
      this.player.rushTime > 0 ? 4 : 2.8,
    );
  }

  private countdownLabel(): string {
    if (this.state !== GameState.COUNTDOWN) return '';
    if (this.countdown > 0.35) return 'READY';
    return 'GO!';
  }

  private drawBanner(ctx: CanvasRenderingContext2D): void {
    if (this.bannerLife <= 0 || !this.banner) return;
    ctx.save();
    ctx.globalAlpha = Math.min(1, this.bannerLife);
    ctx.font = '900 26px Cinzel, Palatino, serif';
    ctx.textAlign = 'center';
    ctx.strokeStyle = '#1a1020';
    ctx.lineWidth = 6;
    ctx.strokeText(this.banner, LOGICAL_WIDTH * 0.5, 120);
    ctx.fillStyle = '#ffd24a';
    ctx.fillText(this.banner, LOGICAL_WIDTH * 0.5, 120);
    ctx.restore();
  }

  private clearWorld(): void {
    this.bulletPool.releaseAll(this.bullets);
    this.shotPool.releaseAll(this.enemyShots);
    this.enemyPool.releaseAll(this.enemies);
    this.asteroidPool.releaseAll(this.asteroids);
    this.hailPool.releaseAll(this.hailstones);
    this.powerPool.releaseAll(this.powerUps);
    this.coinPool.releaseAll(this.coins);
    this.particles.clear();
    this.floats.clear();
    this.boss = null;
    this.shake.reset();
    this.player.x = PLAYER.startX;
    this.player.y = PLAYER.startY;
  }

  private releaseBullet(i: number): void {
    const item = this.bullets[i]!;
    this.bullets[i] = this.bullets[this.bullets.length - 1]!;
    this.bullets.pop();
    this.bulletPool.release(item);
  }
  private releaseShot(i: number): void {
    const item = this.enemyShots[i]!;
    this.enemyShots[i] = this.enemyShots[this.enemyShots.length - 1]!;
    this.enemyShots.pop();
    this.shotPool.release(item);
  }
  private releaseEnemy(i: number): void {
    const item = this.enemies[i]!;
    this.enemies[i] = this.enemies[this.enemies.length - 1]!;
    this.enemies.pop();
    this.enemyPool.release(item);
  }
  private releaseAsteroid(i: number): void {
    const item = this.asteroids[i]!;
    this.asteroids[i] = this.asteroids[this.asteroids.length - 1]!;
    this.asteroids.pop();
    this.asteroidPool.release(item);
  }
  private releaseHail(i: number): void {
    const item = this.hailstones[i]!;
    this.hailstones[i] = this.hailstones[this.hailstones.length - 1]!;
    this.hailstones.pop();
    this.hailPool.release(item);
  }
  private releasePower(i: number): void {
    const item = this.powerUps[i]!;
    this.powerUps[i] = this.powerUps[this.powerUps.length - 1]!;
    this.powerUps.pop();
    this.powerPool.release(item);
  }
  private releaseCoin(i: number): void {
    const item = this.coins[i]!;
    this.coins[i] = this.coins[this.coins.length - 1]!;
    this.coins.pop();
    this.coinPool.release(item);
  }
}

const meadow = skyShell(SKY[WorldId.MEADOWS]);

function emptySnapshot(): GameSnapshot {
  return {
    state: GameState.MENU,
    mode: RunMode.NORMAL,
    score: 0,
    highScore: 0,
    level: 1,
    sectorName: 'AETHER MEADOWS',
    skyTop: meadow.top,
    skyGlow: meadow.glow,
    skyMid: meadow.mid,
    skyGround: meadow.ground,
    stageTitle: '',
    health: 100,
    maxHealth: 100,
    shield: 60,
    maxShield: 60,
    weaponLevel: 1,
    weaponName: 'BOLT I',
    combo: 0,
    comboMultiplier: 1,
    specialEnergy: 0,
    specialReady: false,
    countdownLabel: '',
    bossName: '',
    bossHealth: 0,
    bossMaxHealth: 1,
    bossElement: '',
    bossWeak: '',
    showBossBar: false,
    isNewHighScore: false,
    finalScore: 0,
    enemiesDestroyed: 0,
    bossesDefeated: 0,
    bestCombo: 0,
    accuracy: 0,
    levelScore: 0,
    levelKills: 0,
    levelBonus: 0,
    magnetTime: 0,
    rushTime: 0,
    doubleShotTime: 0,
    freezeTime: 0,
    guardianName: 'AURELIA',
    runCoins: 0,
    runCrystals: 0,
    bankCoins: 0,
    bankCrystals: 0,
    trophies: 0,
    bossEnergy: 0,
    raidTimer: 0,
    raidDamage: 0,
    puzzleHint: '',
    clearRank: '',
    clearLine: '',
    nextLevel: 0,
    nextSectorName: '',
    nextStageTitle: '',
    resupplyLine: '',
    warpIn: 0,
  };
}

/**
 * Screen radius of the baked ring per unit of particle size: the texture's ring
 * sits at 28/80 of a canvas drawn at size * 3.8 * (80 / 57) (see TextureBank).
 */
const RING_PER_SIZE = 3.8 * (80 / 57) * (28 / 80);

/** Shockwave ring that grows from radius `from` to `to` (px) over `life` s. */
function ringTo(
  particles: ParticleSystem,
  x: number,
  y: number,
  color: readonly [number, number, number],
  from: number,
  to: number,
  life: number,
): void {
  const s0 = from / RING_PER_SIZE;
  particles.ringFlash(x, y, color, s0, (to / RING_PER_SIZE - s0) / life, life);
}
