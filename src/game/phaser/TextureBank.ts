import type Phaser from 'phaser';
import { PowerUpType, ProjectileKind } from '../../types/game.ts';
import type {
  AetherlingSpecies,
  BossKind,
  EnemyType,
  GuardianId as GID,
  WorldId,
} from '../../types/game.ts';
import { assets } from '../../assets/AssetLoader.ts';
import {
  aetherPath,
  bossPath,
  enemyPath,
  envPath,
  guardianPath,
  hazardPath,
  powerUpAssets,
  uiAssets,
} from '../../assets/assetManifest.ts';
import type { Pose as PoseT } from '../../assets/assetManifest.ts';
import type { CoinFace } from '../fantasyDraw.ts';
import {
  drawBurningAsteroid,
  drawCoinEdge,
  drawFlamePlume,
  drawFrostWind,
  drawHangarBird,
  drawHangarCloud,
  drawHangarIsle,
  drawHangarLantern,
  drawHailstone,
  drawMonsterShot,
  drawMonsterWake,
  drawPickupToken,
  drawPlayerShot,
  drawElementShot,
  drawGoldCoin,
  drawGuardianShot,
  drawGuardianWake,
  drawHoverLift,
  drawSpellWake,
  drawWingBlur,
} from '../fantasyDraw.ts';
import { ELEMENT_LIST } from '../content/elements.ts';
import { GUARDIAN_LIST } from '../content/guardians.ts';
import { pickupStyle } from '../content/pickups.ts';
import { EMBER_ASTEROID, FROST_HAIL } from '../content/hazards.ts';
import {
  drawAetherSprite,
  drawBossSprite,
  drawFoeSprite,
  drawGuardianSprite,
  drawPickupSprite,
} from '../../assets/drawEntity.ts';
import { getSkyCurtain, getSkyPlate } from './SkyPlates.ts';

/** Struck radius per coin tier; the bigger the coin, the richer the strike. */
const COIN_TIER: Record<CoinFace, number> = { plain: 14, star: 16, gem: 19 };

type BakeFn = () => void;

export class TextureBank {
  private readonly textures: Phaser.Textures.TextureManager;
  private readonly fromPng = new Set<string>();
  private readonly pad = new Map<string, number>();
  private readonly wanted = new Map<string, string>();
  private readonly queue: { key: string; bake: BakeFn }[] = [];
  private readonly queued = new Set<string>();
  private readonly requested = new Set<string>();
  private lastProgress = -1;
  private shared = false;

  constructor(textures: Phaser.Textures.TextureManager) {
    this.textures = textures;
  }

  boot(): void {
    this.bakeShared();
  }

  warm(guardian: GID, species: readonly string[]): void {
    this.ensureGuardian(guardian, 'idle');
    this.ensureGuardian(guardian, 'hit');
    this.ensureGuardian(guardian, 'ability');
    for (const id of species) this.ensureAether(id);
    this.flush(6);
    this.pullWanted();
  }

  tick(): void {
    this.flush(2);
    if (this.lastProgress === assets.progress) return;
    this.lastProgress = assets.progress;
    this.pullWanted();
  }

  guardian(id: GID, pose: PoseT): string {
    this.ensureGuardian(id, pose);
    if (pose !== 'idle') this.ensureGuardian(id, 'idle');
    return this.best(`g:${id}:${pose}`, `g:${id}:idle`);
  }

  aether(id: string): string {
    this.ensureAether(id);
    return this.best(`a:${id}`, 'dot');
  }

  /** Casting uses the same art; SpriteSync supplies the elemental flare. */
  aetherCast(id: string): string {
    return this.aether(id);
  }

  enemy(id: string): string {
    this.ensureEnemy(id);
    return this.best(`e:${id}`, 'dot');
  }

  /** Wind-up keeps the body art stable while SpriteSync draws its charge cue. */
  enemyWindup(id: string): string {
    // The charge marker is drawn at runtime so hits cannot hide its warning.
    return this.enemy(id);
  }

  boss(id: string, pose: PoseT): string {
    this.ensureBoss(id, pose);
    if (pose !== 'idle') this.ensureBoss(id, 'idle');
    return this.best(`b:${id}:${pose}`, `b:${id}:idle`);
  }

  pickup(id: string): string {
    this.ensurePickup(id);
    return this.best(`p:${id}`, 'dot');
  }

  /** Collectible backdrop behind a power-up icon. */
  token(id: string): string {
    return this.best(`pu:${id}:v1`, 'dot');
  }

  playerShot(kind: string): string {
    return this.best(`ps:${kind}:v2`, 'dot');
  }

  /** Elemental companion shot, baked in its own colours rather than tinted. */
  spellShot(element: string): string {
    return this.best(`sp:${element}:v1`, 'dot');
  }

  /** Streak that trails an elemental shot, drawn behind it. */
  spellWake(element: string): string {
    return this.best(`sw:${element}:v1`, 'dot');
  }

  /** A guardian's signature shot, likewise baked in its own colours. */
  guardianShot(id: string): string {
    return this.best(`gs:${id}:v1`, 'dot');
  }

  guardianWake(id: string): string {
    return this.best(`gw:${id}:v1`, 'dot');
  }

  /** Monster fire, baked per kind and element in the hostile palette. */
  monsterShot(kind: string, element: string): string {
    return this.best(`ms:${kind}:${element}:v1`, 'dot');
  }

  /** Torn streak dragged behind monster fire. */
  monsterWake(element: string): string {
    return this.best(`mw:${element}:v1`, 'dot');
  }

  asteroid(size: 1 | 2 | 3 = 2): string {
    const key = `hazard:magma:${size}`;
    const url = hazardPath('magma', (size - 1) as 0 | 1 | 2);
    this.request(url);
    this.wantPng(key, url);
    return this.best(key, 'rock:burn:v1');
  }

  hail(variant: 0 | 1 | 2 = 0): string {
    const key = `hazard:ice:${variant}`;
    const url = hazardPath('ice', variant);
    this.request(url);
    this.wantPng(key, url);
    return this.best(key, 'hail:v1');
  }

  /** Motion smear laid behind a flyer's wings, tinted by the caller. */
  wingBlur(): string {
    return this.best('flutter:v1', 'dot');
  }

  /** Cushion of lift under a hovering body, tinted by the caller. */
  hoverLift(): string {
    return this.best('lift:v1', 'dot');
  }

  /** Wake that streams off a falling hazard, drawn behind it. */
  plume(kind: 'fire' | 'frost'): string {
    return this.best(`plume:${kind}:v1`, 'dot');
  }

  coin(tier: string): string {
    return this.best(`c:${tier}:v3`, 'c:plain:v3');
  }

  /** The coin caught edge-on at the thin point of its flip. */
  coinEdge(tier: string): string {
    return this.best(`ce:${tier}:v3`, 'ce:plain:v3');
  }

  particle(shape: string): string {
    return this.best(`pt:${shape}`, 'pt:puff');
  }

  shadow(): string {
    return this.best('shadow', 'dot');
  }

  hangar(kind: 'isle' | 'cloud' | 'bird' | 'lantern'): string {
    return this.best(`hangar:${kind}`, 'dot');
  }

  /** Painted menu cloud; the procedural one stands in until it loads. */
  paintedCloud(which: 'a' | 'b'): string {
    const url = which === 'a' ? uiAssets.cloudA : uiAssets.cloudB;
    this.request(url);
    this.wantPng(`cloud:${which}`, url);
    return this.pick(`cloud:${which}`) ?? this.hangar('cloud');
  }

  env(world: string, layer: 'bg' | 'mid' | 'fg'): string | null {
    const url = envPath(world as WorldId, layer);
    this.request(url);
    this.wantPng(`env:${world}:${layer}`, url);
    return this.pick(`env:${world}:${layer}`);
  }

  /** Kick off a load for art the scene wants but nobody has asked for yet. */
  private request(url: string): void {
    if (this.requested.has(url)) return;
    this.requested.add(url);
    if (!assets.has(url)) void assets.load([url]);
  }

  plate(world: string): string {
    const key = `plate:${world}:v3`;
    if (!this.textures.exists(key)) this.textures.addCanvas(key, getSkyPlate(world));
    return key;
  }

  curtain(world: string): string {
    const key = `curtain:${world}`;
    if (!this.textures.exists(key)) this.textures.addCanvas(key, getSkyCurtain(world));
    return key;
  }

  frame(key: string, intended: number): number {
    if (key.startsWith('png:')) return intended;
    return intended * (this.pad.get(key) ?? 1.15);
  }

  private best(key: string, fallback: string): string {
    return this.pick(key) ?? this.pick(fallback) ?? 'dot';
  }

  private pick(key: string): string | null {
    const png = `png:${key}`;
    if (this.textures.exists(png)) return png;
    if (this.textures.exists(key)) return key;
    return null;
  }

  private ensureGuardian(id: GID, pose: PoseT): void {
    const key = `g:${id}:${pose}`;
    this.wantPng(key, guardianPath(id, pose));
    const spritePose = pose === 'icon' ? 'idle' : pose;
    this.enqueue(key, () => this.addCanvas(key, 160, (ctx) => drawGuardianSprite(ctx, id, 132, spritePose), 132));
  }

  private ensureAether(id: string): void {
    const key = `a:${id}`;
    this.wantPng(key, aetherPath(id as AetherlingSpecies, 'idle'));
    this.enqueue(key, () => this.addCanvas(key, 140, (ctx) => drawAetherSprite(ctx, id as AetherlingSpecies, 118, { pose: 'idle' }), 118));
  }

  private ensureEnemy(id: string): void {
    const key = `e:${id}`;
    this.wantPng(key, enemyPath(id as EnemyType, 'idle'));
    this.enqueue(key, () => this.addCanvas(key, 140, (ctx) => drawFoeSprite(ctx, id as EnemyType, 44, 0), 110));
  }

  private ensureBoss(id: string, pose: PoseT): void {
    const key = `b:${id}:${pose}`;
    this.wantPng(key, bossPath(id as BossKind, pose));
    this.enqueue(key, () => this.addCanvas(key, 256, (ctx) => drawBossSprite(ctx, id as BossKind, 96, 0, pose === 'attack' || pose === 'hit' || pose === 'death' ? pose : 'idle'), 210));
  }

  private ensurePickup(id: string): void {
    const key = `p:${id}`;
    if (id in powerUpAssets) this.wantPng(key, powerUpAssets[id as PowerUpType]);
    this.enqueue(key, () => this.addCanvas(key, 80, (ctx) => drawPickupSprite(ctx, id as PowerUpType), 36));
  }

  private enqueue(key: string, bake: BakeFn): void {
    if (this.pick(key) || this.queued.has(key)) return;
    this.queued.add(key);
    this.queue.push({ key, bake });
  }

  private flush(limit: number): void {
    let n = 0;
    while (n < limit && this.queue.length > 0) {
      const job = this.queue.shift()!;
      this.queued.delete(job.key);
      if (!this.pick(job.key)) job.bake();
      n += 1;
    }
  }

  private bakeShared(): void {
    if (this.shared) return;
    this.shared = true;
    this.addCanvas('dot', 16, (ctx) => {
      ctx.fillStyle = '#fffef6';
      ctx.beginPath();
      ctx.arc(0, 0, 5, 0, Math.PI * 2);
      ctx.fill();
    });
    this.addCanvas('shadow', 48, (ctx) => {
      ctx.fillStyle = 'rgba(40, 24, 48, 0.9)';
      ctx.beginPath();
      ctx.ellipse(0, 0, 20, 7, 0, 0, Math.PI * 2);
      ctx.fill();
    }, 40);
    for (const id of Object.values(PowerUpType)) {
      this.addCanvas(`p:${id}`, 80, (ctx) => drawPickupSprite(ctx, id), 36);
    }
    for (const kind of ['laser', 'cannon', 'plasma'] as const) {
      this.addCanvas(`ps:${kind}:v2`, 48, (ctx) => {
        ctx.scale(1.8, 1.8);
        drawPlayerShot(ctx, kind, '#fff8ee');
      }, 28);
    }
    // Canvases run well wider than the art itself: the padding argument fixes the
    // on-screen size, so the extra room only gives the glow somewhere to fall off.
    for (const el of ELEMENT_LIST) {
      this.addCanvas(`sp:${el}:v1`, 96, (ctx) => {
        ctx.scale(1.9, 1.9);
        drawElementShot(ctx, el);
      }, 34);
      this.addCanvas(`sw:${el}:v1`, 160, (ctx) => drawSpellWake(ctx, el, 122), 122);
    }
    for (const id of GUARDIAN_LIST) {
      this.addCanvas(`gs:${id}:v1`, 96, (ctx) => {
        ctx.scale(1.9, 1.9);
        drawGuardianShot(ctx, id);
      }, 36);
      this.addCanvas(`gw:${id}:v1`, 160, (ctx) => drawGuardianWake(ctx, id, 122), 122);
    }
    for (const el of ELEMENT_LIST) {
      for (const kind of Object.values(ProjectileKind)) {
        this.addCanvas(`ms:${kind}:${el}:v1`, 56, (ctx) => drawMonsterShot(ctx, kind, el, 11), 32);
      }
      this.addCanvas(`mw:${el}:v1`, 148, (ctx) => drawMonsterWake(ctx, el, 112), 112);
    }
    this.addCanvas(
      'rock:burn:v1',
      112,
      (ctx) => drawBurningAsteroid(ctx, 30, [1, 0.86, 1.1, 0.79, 1.02, 0.88, 1.12, 0.83, 0.97], 0),
      68,
    );
    this.addCanvas('hail:v1', 72, (ctx) => drawHailstone(ctx, 18, 0), 41);
    this.addCanvas('flutter:v1', 128, (ctx) => drawWingBlur(ctx, 118), 118);
    this.addCanvas('lift:v1', 128, (ctx) => drawHoverLift(ctx, 120), 120);
    for (const tier of Object.keys(COIN_TIER) as CoinFace[]) {
      const r = COIN_TIER[tier];
      this.addCanvas(`c:${tier}:v3`, 72, (ctx) => drawGoldCoin(ctx, r, tier), 40);
      this.addCanvas(`ce:${tier}:v3`, 72, (ctx) => drawCoinEdge(ctx, r, tier), 40);
    }
    // Particles are soft and glowing rather than flat discs: a bright core
    // that falls off to nothing, so bursts read as light, not confetti.
    this.addCanvas('pt:star', 48, (ctx) => drawSparkle(ctx, 20), 28);
    this.addCanvas('pt:puff', 40, (ctx) => drawMote(ctx, 17), 24);
    this.addCanvas('pt:ring', 80, (ctx) => drawGlowRing(ctx, 28), 57);
    this.addCanvas('pt:streak', 64, (ctx) => drawStreak(ctx, 28), 44);
    this.addCanvas('plume:fire:v1', 176, (ctx) => drawFlamePlume(ctx, 164, EMBER_ASTEROID), 164);
    this.addCanvas('plume:frost:v1', 176, (ctx) => drawFrostWind(ctx, 164, FROST_HAIL), 164);
    for (const id of Object.values(PowerUpType)) {
      this.addCanvas(`pu:${id}:v1`, 112, (ctx) => drawPickupToken(ctx, 40, pickupStyle(id)), 80);
    }
    this.addCanvas('hangar:isle', 160, (ctx) => drawHangarIsle(ctx), 118);
    this.addCanvas('hangar:cloud', 160, (ctx) => drawHangarCloud(ctx), 120);
    this.addCanvas('hangar:bird', 72, (ctx) => drawHangarBird(ctx), 48);
    this.addCanvas('hangar:lantern', 48, (ctx) => drawHangarLantern(ctx), 28);
  }

  private wantPng(key: string, url: string): void {
    this.wanted.set(key, url);
    this.tryPng(key, url);
  }

  private pullWanted(): void {
    for (const [key, url] of this.wanted) this.tryPng(key, url);
  }

  private tryPng(key: string, url: string): void {
    const png = `png:${key}`;
    if (this.fromPng.has(png)) return;
    const img = assets.get(url);
    if (!img) return;
    if (this.textures.exists(png)) {
      this.fromPng.add(png);
      return;
    }
    if (img instanceof HTMLCanvasElement) this.textures.addCanvas(png, img);
    else this.textures.addImage(png, img);
    this.fromPng.add(png);
  }

  private addCanvas(
    key: string,
    size: number,
    draw: (ctx: CanvasRenderingContext2D) => void,
    content = size * 0.82,
  ): void {
    if (this.textures.exists(key)) return;
    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.translate(size * 0.5, size * 0.5);
    draw(ctx);
    this.textures.addCanvas(key, canvas);
    this.pad.set(key, size / Math.max(8, content));
  }
}

function drawMote(ctx: CanvasRenderingContext2D, r: number): void {
  const g = ctx.createRadialGradient(0, 0, 0, 0, 0, r);
  g.addColorStop(0, 'rgba(255,255,255,1)');
  g.addColorStop(0.35, 'rgba(255,255,255,0.9)');
  g.addColorStop(0.7, 'rgba(255,255,255,0.32)');
  g.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.arc(0, 0, r, 0, Math.PI * 2);
  ctx.fill();
}

function drawSparkle(ctx: CanvasRenderingContext2D, r: number): void {
  drawMote(ctx, r * 0.55);
  ctx.fillStyle = '#ffffff';
  ctx.beginPath();
  for (let i = 0; i < 8; i++) {
    const a = (Math.PI / 4) * i - Math.PI / 2;
    const rr = i % 2 === 0 ? r : r * 0.18;
    const x = Math.cos(a) * rr;
    const y = Math.sin(a) * rr;
    if (i === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  }
  ctx.closePath();
  ctx.fill();
}

function drawGlowRing(ctx: CanvasRenderingContext2D, r: number): void {
  ctx.strokeStyle = 'rgba(255,255,255,0.35)';
  ctx.lineWidth = 9;
  ctx.beginPath();
  ctx.arc(0, 0, r, 0, Math.PI * 2);
  ctx.stroke();
  ctx.strokeStyle = '#ffffff';
  ctx.lineWidth = 3.5;
  ctx.beginPath();
  ctx.arc(0, 0, r, 0, Math.PI * 2);
  ctx.stroke();
}

function drawStreak(ctx: CanvasRenderingContext2D, len: number): void {
  const g = ctx.createLinearGradient(-len, 0, len, 0);
  g.addColorStop(0, 'rgba(255,255,255,0)');
  g.addColorStop(0.7, 'rgba(255,255,255,0.85)');
  g.addColorStop(1, 'rgba(255,255,255,1)');
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.ellipse(0, 0, len, 4.4, 0, 0, Math.PI * 2);
  ctx.fill();
}
