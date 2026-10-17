import Phaser from 'phaser';
import { GameState, ProjectileKind } from '../../types/game.ts';
import type { Pose } from '../../assets/assetManifest.ts';
import { hoverDrift, leanTilt, squashScale, wingBeat } from '../cartoon.ts';
import type { Bullet } from '../Bullet.ts';
import { SIDEKICK_FLARE } from '../Sidekick.ts';
import { BODY } from '../constants.ts';
import { EMBER_ASTEROID, FROST_HAIL } from '../content/hazards.ts';
import type { HazardStyle } from '../content/hazards.ts';
import { PICKUP_FLASH, pickupStyle } from '../content/pickups.ts';
import { ELEMENT_COLOR } from '../content/elements.ts';
import { SPECIES_META } from '../content/aetherlings.ts';
import { BOSS_META } from '../content/bosses.ts';
import { GUARDIAN_COLORS, guardianShotSpins, monsterShotSpins, spellSpins } from '../fantasyDraw.ts';
import type { GameEngine } from '../GameEngine.ts';
import type { TextureBank } from './TextureBank.ts';
import { hexToTint, monsterRgb } from '../vfx/projectileStyle.ts';

/** On-screen body size. Hitboxes stay on GameEngine radii. */
const VIEW = {
  player: BODY.player,
  wing: BODY.wing,
  wingClone: BODY.wingClone,
  enemy: 7.0,
  boss: 4.7,
  bossMax: 290,
  rock: 3.8,
  hail: 4.2,
  pickup: 58,
  token: 78,
  coin: 6.3,
  playerShot: 28,
  enemyShot: 28,
  particle: 3.8,
};

/** Seconds a foe takes to pop in, and the wind-up window before it fires. */
const SPAWN_POP = 0.24;
const WINDUP = 0.34;
/** Bosses wind up longer so a signature move is readable before it lands. */
const BOSS_WINDUP = 0.6;
/** Soft radial bloom laid additively under every shot. */
const GLOW_KEY = 'fx-glow';

function ensureGlow(scene: Phaser.Scene): void {
  if (scene.textures.exists(GLOW_KEY)) return;
  const size = 64;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');
  if (ctx) {
    const g = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
    g.addColorStop(0, 'rgba(255,255,255,1)');
    g.addColorStop(0.25, 'rgba(255,255,255,0.55)');
    g.addColorStop(0.6, 'rgba(255,255,255,0.14)');
    g.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, size, size);
  }
  scene.textures.addCanvas(GLOW_KEY, canvas);
}

function rgbTint(rgb: readonly [number, number, number]): number {
  return (rgb[0] << 16) | (rgb[1] << 8) | rgb[2];
}

function glow(img: Phaser.GameObjects.Image, x: number, y: number, size: number, tint: number, alpha: number): void {
  img.setVisible(true);
  img.setPosition(x, y);
  img.setDisplaySize(size, size);
  img.setTint(tint);
  img.setAlpha(alpha);
}
/** hitFlash runs 0.08s per hit; only its first frames flash white. */
const HIT_WHITE = 0.05;

function popIn(t: number): number {
  // easeOutBack: overshoots to ~1.1 then settles.
  const c = 1.9;
  const u = t - 1;
  return Math.max(0.2, 1 + (c + 1) * u * u * u + c * u * u);
}

const DEPTH = {
  wake: 8,
  shade: 9,
  rock: 10,
  hail: 11,
  enemy: 20,
  boss: 25,
  flutter: 49,
  eWake: 29,
  eShot: 30,
  exhaust: 34,
  bullet: 35,
  token: 39,
  pickup: 40,
  coin: 41,
  wing: 50,
  player: 55,
  aura: 56,
  part: 70,
  float: 80,
  banner: 90,
};

export class SpriteSync {
  private readonly engine: GameEngine;
  private readonly bank: TextureBank;
  private readonly shades: ImagePool;
  private readonly casts: { x: number; y: number; size: number; alpha?: number }[] = [];
  /** Flight cues gathered each frame, drawn behind every flyer in one pass. */
  private readonly beats: {
    key: string;
    x: number;
    y: number;
    span: number;
    sx: number;
    sy: number;
    alpha: number;
    tint: number;
  }[] = [];
  private readonly flutters: ImagePool;
  private readonly fireWakes: ImagePool;
  private readonly frostWakes: ImagePool;
  private readonly rocks: ImagePool;
  private readonly hailstones: ImagePool;
  private readonly foes: ImagePool;
  private readonly eWakes: ImagePool;
  private readonly shots: ImagePool;
  private readonly exhausts: ImagePool;
  private readonly bullets: ImagePool;
  private readonly bulletGlows: ImagePool;
  private readonly shotGlows: ImagePool;
  private readonly tokens: ImagePool;
  private readonly pickups: ImagePool;
  private readonly coins: ImagePool;
  private readonly parts: ImagePool;
  private readonly floats: TextPool;
  private readonly player: Phaser.GameObjects.Image;
  private readonly aura: Phaser.GameObjects.Graphics;
  private readonly threatCues: Phaser.GameObjects.Graphics;
  private readonly wingL: Phaser.GameObjects.Image;
  private readonly wingR: Phaser.GameObjects.Image;
  private readonly cloneA: Phaser.GameObjects.Image;
  private readonly cloneB: Phaser.GameObjects.Image;
  private readonly boss: Phaser.GameObjects.Image;
  private readonly banner: Phaser.GameObjects.Text;

  constructor(scene: Phaser.Scene, engine: GameEngine, bank: TextureBank) {
    this.engine = engine;
    this.bank = bank;
    this.shades = new ImagePool(scene, DEPTH.shade);
    this.flutters = new ImagePool(scene, DEPTH.flutter);
    this.fireWakes = new ImagePool(scene, DEPTH.wake);
    this.frostWakes = new ImagePool(scene, DEPTH.wake);
    this.rocks = new ImagePool(scene, DEPTH.rock);
    this.hailstones = new ImagePool(scene, DEPTH.hail);
    this.foes = new ImagePool(scene, DEPTH.enemy);
    this.eWakes = new ImagePool(scene, DEPTH.eWake);
    this.shots = new ImagePool(scene, DEPTH.eShot);
    this.exhausts = new ImagePool(scene, DEPTH.exhaust);
    this.bullets = new ImagePool(scene, DEPTH.bullet);
    ensureGlow(scene);
    this.bulletGlows = new ImagePool(scene, DEPTH.exhaust - 0.5, true);
    this.shotGlows = new ImagePool(scene, DEPTH.eWake - 0.5, true);
    this.tokens = new ImagePool(scene, DEPTH.token);
    this.pickups = new ImagePool(scene, DEPTH.pickup);
    this.coins = new ImagePool(scene, DEPTH.coin);
    this.parts = new ImagePool(scene, DEPTH.part);
    this.floats = new TextPool(scene, DEPTH.float);
    this.player = scene.add.image(0, 0, 'dot').setDepth(DEPTH.player).setVisible(false);
    this.aura = scene.add.graphics().setDepth(DEPTH.aura);
    this.threatCues = scene.add.graphics().setDepth(DEPTH.boss + 1);
    this.wingL = scene.add.image(0, 0, 'dot').setDepth(DEPTH.wing).setVisible(false);
    this.wingR = scene.add.image(0, 0, 'dot').setDepth(DEPTH.wing).setVisible(false);
    this.cloneA = scene.add.image(0, 0, 'dot').setDepth(DEPTH.wing).setVisible(false);
    this.cloneB = scene.add.image(0, 0, 'dot').setDepth(DEPTH.wing).setVisible(false);
    this.boss = scene.add.image(0, 0, 'dot').setDepth(DEPTH.boss).setVisible(false);
    this.banner = scene.add
      .text(270, 280, '', {
        fontFamily: "Cinzel, Palatino, serif",
        fontSize: '26px',
        fontStyle: '900',
        color: '#ffd24a',
        stroke: '#1a1020',
        strokeThickness: 6,
      })
      .setOrigin(0.5)
      .setDepth(DEPTH.banner)
      .setVisible(false);
  }

  sync(): void {
    const e = this.engine;
    this.casts.length = 0;
    this.beats.length = 0;
    this.threatCues.clear();
    this.fireWakes.sync(e.asteroids, (img, rock) => {
      placeWake(img, this.bank, 'fire', rock, rock.radius, rock.age, EMBER_ASTEROID);
    });
    this.frostWakes.sync(e.hailstones, (img, hail) => {
      placeWake(img, this.bank, 'frost', hail, hail.radius, hail.age, FROST_HAIL);
    });
    this.rocks.sync(e.asteroids, (img, rock, i) => {
      place(img, this.bank, this.bank.asteroid(rock.size), rock.x, rock.y, rock.radius * VIEW.rock, { rot: rock.rotation });
      if (e.state !== GameState.PAUSED) e.vfx.hazardTrail(rock.x, rock.y, rock.vx, rock.vy, rock.age, i, EMBER_ASTEROID, rock.size + 1);
    });
    this.hailstones.sync(e.hailstones, (img, hail, i) => {
      place(img, this.bank, this.bank.hail(hail.variant), hail.x, hail.y, hail.radius * VIEW.hail, {
        rot: hail.age * hail.spin,
      });
      if (e.state !== GameState.PAUSED) e.vfx.hazardTrail(hail.x, hail.y, hail.vx, hail.vy, hail.age, i, FROST_HAIL, 2);
    });
    this.foes.sync(e.enemies, (img, foe) => {
      const bob = Math.sin(foe.age * 8 + foe.phase) * 5;
      const flap = 1 + Math.sin(foe.age * 12 + foe.phase) * 0.045;
      const breathe = 1 + Math.sin(foe.age * 5 + foe.phase) * 0.025;
      const tilt = Math.sin(foe.age * 2.4 + foe.phase) * 0.055;
      const scale = squashScale(foe.hitFlash, foe.vx);
      // Pop in on spawn with a little overshoot rather than appearing whole.
      const pop = foe.age < SPAWN_POP ? popIn(foe.age / SPAWN_POP) : 1;
      // Wind-up: a small swell and an independent warning at the muzzle.
      // Keeping the warning separate lets it survive the white hit flash.
      const windup = !foe.ally && foe.fireCd > 0 && foe.fireCd < WINDUP ? 1 - foe.fireCd / WINDUP : 0;
      const swell = 1 + windup * 0.12;
      const size = foe.radius * VIEW.enemy;
      const key = windup > 0 ? this.bank.enemyWindup(foe.type) : this.bank.enemy(foe.type);
      place(img, this.bank, key, foe.x, foe.y + bob, size * pop * swell, {
        rot: tilt,
        sx: scale.sx * breathe,
        sy: scale.sy * flap,
        alpha: Math.min(1, foe.age / (SPAWN_POP * 0.6)),
        // A crisp white flash on the first frames of each hit.
        fill: foe.hitFlash > HIT_WHITE ? 0xffffff : undefined,
      });
      if (windup > 0) chargeCue(this.threatCues, foe.x, foe.y + bob + size * 0.32, windup, 10);
      this.casts.push({ x: foe.x, y: foe.y + bob + size * 0.38, size });
    });
    if (e.boss) {
      const b = e.boss;
      const scale = squashScale(b.hitFlash, b.vy);
      const bob = Math.sin(b.age * 4) * 5;
      const pulse = 1 + Math.sin(b.age * 6) * 0.025;
      const tilt = Math.sin(b.age * 1.6) * 0.035;
      const attacking = b.casting() || b.fireCd < 0.2;
      const pose: Pose = !b.alive ? 'death' : b.hitFlash > 0 ? 'hit' : attacking ? 'attack' : 'idle';
      const size = Math.min(VIEW.bossMax, b.radius * VIEW.boss);
      // Gentle hit tint preserves the boss silhouette during sustained fire;
      // the separate charge marker stays visible above it.
      const shown: Pose = pose === 'hit' ? (attacking ? 'attack' : 'idle') : pose;
      place(this.boss, this.bank, this.bank.boss(b.kind, shown), b.x, b.y + bob, size, {
        rot: tilt,
        sx: scale.sx * pulse,
        sy: scale.sy * pulse,
        tint: b.hitFlash > HIT_WHITE ? 0xffe2e2 : undefined,
      });
      const charge = b.alive && b.intro <= 0 && !b.casting() && b.fireCd > 0 && b.fireCd < BOSS_WINDUP ? 1 - b.fireCd / BOSS_WINDUP : 0;
      if (charge > 0) {
        // A widening element-coloured aura gathers around the boss as it charges.
        const el = monsterRgb(BOSS_META[b.kind].element).rim;
        this.threatCues.lineStyle(4, rgbTint(el), 0.25 + charge * 0.55);
        this.threatCues.strokeCircle(b.x, b.y + bob, size * (0.62 - charge * 0.14));
        this.threatCues.lineStyle(2, 0xffffff, charge * 0.6);
        this.threatCues.strokeCircle(b.x, b.y + bob, size * (0.5 - charge * 0.1));
        chargeCue(this.threatCues, b.x, b.y + bob + size * 0.3, charge, 22);
      }
      this.casts.push({ x: b.x, y: b.y + bob + size * 0.36, size });
    } else {
      this.boss.setVisible(false);
    }
    // Torn wake dragged behind monster fire, laid along the reverse of travel so
    // a shot tells you where it came from as well as where it is headed.
    this.shotGlows.sync(e.enemyShots, (img, shot) => {
      const flicker = 0.85 + Math.sin(shot.life * 30) * 0.15;
      glow(img, shot.x, shot.y, enemyShotSize(shot) * 2.2, rgbTint(monsterRgb(shot.element).rim), 0.5 * flicker);
    });
    this.eWakes.sync(e.enemyShots, (img, shot) => {
      const back = Math.atan2(-shot.vy, -shot.vx);
      const len = enemyShotSize(shot) * 1.65;
      const key = this.bank.monsterWake(shot.element);
      place(img, this.bank, key, shot.x + Math.cos(back) * len * 0.5, shot.y + Math.sin(back) * len * 0.5, len, {
        rot: back,
        sx: 1 + Math.sin(shot.life * 36) * 0.12,
        sy: 0.5 + Math.sin(shot.life * 27 + 0.7) * 0.09,
        alpha: 0.5 + Math.sin(shot.life * 44) * 0.16,
      });
    });
    this.shots.sync(e.enemyShots, (img, shot, i) => {
      const facing = Math.atan2(shot.vy, shot.vx) + Math.PI / 2;
      const pulse = 1 + Math.sin(shot.life * 14) * 0.12;
      // The pointed kinds hold their heading and no longer wobble, now that each
      // one carries its own silhouette. The eye tracks upright so it reads as
      // watching the player it chases; only the plasma sphere spins.
      const round = shot.kind === ProjectileKind.HOMING || shot.kind === ProjectileKind.PLASMA;
      const spin = monsterShotSpins(shot.kind);
      place(img, this.bank, this.bank.monsterShot(shot.kind, shot.element), shot.x, shot.y, enemyShotSize(shot), {
        rot: spin ? facing + shot.life * 5.2 : facing,
        sx: round ? pulse : 1,
        sy: round ? pulse : 1.04 * pulse,
      });
      this.trailPuff(i, shot.x, shot.y, shot.vx, shot.vy, shot.life, monsterRgb(shot.element).rim);
    });
    // Streak behind each signature shot, laid along the reverse of travel. The
    // hero's is kept shorter and fainter than a companion's, because at high
    // weapon levels a dozen full-length comet tails turn the screen to soup.
    this.bulletGlows.sync(e.bullets, (img, bullet) => {
      const hero = bullet.source === 'player';
      const flicker = 0.88 + Math.sin(bullet.life * 34) * 0.12;
      const base = hero ? (bullet.crit ? 0.6 : 0.38) : 0.36;
      glow(img, bullet.x, bullet.y, bulletSize(bullet) * (bullet.crit ? 1.9 : 1.55), hexToTint(bullet.style.glowColor), base * flicker);
    });
    this.exhausts.sync(e.bullets, (img, bullet) => {
      const spell = bullet.kind === 'spell';
      if (!spell && !bullet.guardian) {
        img.setVisible(false);
        return;
      }
      const back = Math.atan2(-bullet.vy, -bullet.vx);
      const len = bulletSize(bullet) * (spell ? 2 : 1.65);
      const key = spell ? this.bank.spellWake(bullet.element) : this.bank.guardianWake(bullet.guardian!);
      place(img, this.bank, key, bullet.x + Math.cos(back) * len * 0.5, bullet.y + Math.sin(back) * len * 0.5, len, {
        rot: back,
        sx: 1 + Math.sin(bullet.life * 40) * 0.1,
        sy: (spell ? 0.38 : 0.24) + Math.sin(bullet.life * 29 + 1.1) * 0.04,
        alpha: (spell ? 0.72 : 0.6) + Math.sin(bullet.life * 47) * 0.08,
      });
    });
    this.bullets.sync(e.bullets, (img, bullet, i) => {
      const facing = Math.atan2(bullet.vy, bullet.vx) + Math.PI / 2;
      const pulse = 1 + Math.sin(bullet.life * 16) * 0.1;
      const wobble = Math.sin(bullet.life * 20) * 0.1;
      const orb = bullet.kind === 'plasma' && !bullet.guardian;
      // Signature shots wear their own baked colours, so no tint. Radial ones spin
      // in place; the pointed ones hold their heading, and none of them wobble.
      const spell = bullet.kind === 'spell';
      const sig = spell || bullet.guardian !== null;
      const spin = spell
        ? spellSpins(bullet.element)
        : bullet.guardian !== null && guardianShotSpins(bullet.guardian);
      const key = spell
        ? this.bank.spellShot(bullet.element)
        : bullet.guardian
          ? this.bank.guardianShot(bullet.guardian)
          : this.bank.playerShot(bullet.kind);
      place(img, this.bank, key, bullet.x, bullet.y, bulletSize(bullet), {
        rot: spin ? bullet.life * 7 : orb ? facing + bullet.life * 6 : sig ? facing : facing + wobble,
        sx: orb || spin ? pulse : sig ? 0.98 : bullet.kind === 'cannon' ? 0.85 * pulse : 0.68 * pulse,
        sy: orb || spin ? pulse : sig ? 1.06 * pulse : bullet.kind === 'cannon' ? 1.25 * pulse : 1.45,
        tint: sig ? 0xffffff : hexToTint(bullet.style.coreColor),
      });
      this.engine.vfx.trail(bullet, i);
    });
    this.tokens.sync(e.powerUps, (img, item, i) => {
      const scale = item.pulse();
      place(img, this.bank, this.bank.token(item.type), item.x, item.y, VIEW.token, {
        rot: -item.age * 0.8,
        sx: scale,
        sy: scale,
        alpha: item.fade(),
      });
      e.vfx.pickupAura(item.x, item.y, item.age, i, pickupStyle(item.type));
    });
    this.pickups.sync(e.powerUps, (img, item) => {
      const bounce = 1 + Math.sin(item.age * 8) * 0.08;
      place(img, this.bank, this.bank.pickup(item.type), item.x, item.y, VIEW.pickup, {
        rot: item.rot * 0.15 + item.age * 1.15,
        sx: bounce,
        sy: bounce,
        alpha: item.fade(),
      });
    });
    this.coins.sync(e.coins, (img, coin, i) => {
      // Coins flip about their vertical axis, showing the struck face at the
      // wide points and a sliver of edge as they pass through side-on.
      const t = coin.spinPhase + coin.age * coin.spinRate;
      const flip = Math.cos(t);
      const edgeOn = Math.abs(flip) < 0.22;
      const key = edgeOn ? this.bank.coinEdge(coin.tier) : this.bank.coin(coin.tier);
      place(img, this.bank, key, coin.x, coin.y, coin.radius * VIEW.coin, {
        rot: Math.sin(t * 0.5) * 0.12,
        sx: edgeOn ? 1 : Math.max(0.14, Math.abs(flip)),
        sy: 1 + Math.sin(coin.age * 9) * 0.05,
      });
      e.vfx.coinTrail(coin.x, coin.y, coin.vx, coin.vy, coin.age, i);
    });

    const inRun = e.state !== GameState.MENU;
    this.syncWing(this.wingL, e.wingLeft, inRun, 1);
    this.syncWing(this.wingR, e.wingRight, inRun, 1);
    this.syncWing(this.cloneA, e.wingCloneA, inRun && e.player.hexCloneTime > 0, 0.55);
    this.syncWing(this.cloneB, e.wingCloneB, inRun && e.player.hexCloneTime > 0, 0.55);
    this.syncPlayer(inRun);
    this.shades.sync(this.casts, (img, cast) => {
      place(img, this.bank, this.bank.shadow(), cast.x, cast.y, cast.size * 0.72, {
        sx: 1.2,
        sy: 0.32,
        alpha: cast.alpha ?? 0.22,
      });
    });
    this.flutters.sync(this.beats, (img, f) => {
      place(img, this.bank, f.key, f.x, f.y, f.span, { sx: f.sx, sy: f.sy, alpha: f.alpha, tint: f.tint });
    });
    this.syncParticles();
    this.syncFloats();
    this.syncBanner();
  }

  private syncWing(
    img: Phaser.GameObjects.Image,
    wing: {
      unit: { species: string } | null;
      x: number;
      y: number;
      vx: number;
      slot: number;
      age: number;
      fireFlash: number;
    },
    show: boolean,
    alpha: number,
  ): void {
    if (!show || !wing.unit) {
      img.setVisible(false);
      return;
    }
    const size = wing.slot >= 2 ? VIEW.wingClone : VIEW.wing;
    // Offset the wingbeats so a pair feels like two independently flying pets.
    const pump = wingBeat(wing.age + wing.slot * 0.37, 6.2 + wing.slot * 0.4);
    const drift = hoverDrift(wing.age, wing.slot * 1.9);
    const sway = drift.x * 3.2;
    const bob = drift.y * 3.6 - pump * 1.6;
    const element = SPECIES_META[wing.unit.species as keyof typeof SPECIES_META]?.element;
    const tint = hexToTint(element ? ELEMENT_COLOR[element] : '#ffffff');
    const flare = wing.fireFlash / SIDEKICK_FLARE;
    this.beats.push({
      key: this.bank.wingBlur(),
      x: wing.x + sway,
      y: wing.y + bob - size * 0.08,
      span: size * (1.08 + flare * 0.12),
      sx: 1 - pump * 0.08,
      sy: 0.45 + pump * 0.55,
      alpha: (0.12 + pump * 0.14 + flare * 0.3) * alpha,
      tint,
    });
    // Each shot flares the companion in its element glow with a small kick,
    // so you can see who fired what without reading the projectiles.
    const key = flare > 0 ? this.bank.aetherCast(wing.unit.species) : this.bank.aether(wing.unit.species);
    place(img, this.bank, key, wing.x + sway, wing.y + bob + flare * 3, size * (1 + flare * 0.06), {
      rot: leanTilt(wing.vx) + drift.x * 0.1,
      sx: 1 + pump * 0.025,
      sy: 1 + pump * 0.025 - flare * 0.025,
      alpha,
    });
    // Same reasoning as the hero: the shadow sits far below on the clouds.
    const alt = (pump * 1.6 - drift.y * 3.6 + 5.2) / 10.4;
    this.casts.push({
      x: wing.x + sway * 0.35,
      y: wing.y + size * 0.86,
      size: size * (0.74 - alt * 0.14),
      alpha: (0.12 - alt * 0.04) * alpha,
    });
  }

  private syncPlayer(inRun: boolean): void {
    const p = this.engine.player;
    this.aura.clear();
    if (!inRun || !p.alive) {
      this.player.setVisible(false);
      return;
    }
    // Hovering flight: a figure-eight drift so she wanders rather than sliding
    // along a rail, plus a wing beat that lifts her on the downstroke.
    const beat = wingBeat(p.age, 7.6);
    const drift = hoverDrift(p.age);
    const sway = drift.x * 1.9;
    const bob = drift.y * 2.2 - beat * 2.6;
    const scale = squashScale(p.hitFlash, p.vx);
    const sinceShot = 1 / p.currentFireRate() - p.fireCooldown;
    const cast = p.fireCooldown > 0 ? Math.max(0, 1 - sinceShot / 0.085) : 0;
    const pose: Pose = p.hitFlash > 0 ? 'hit' : p.rushTime > 0 ? 'ability' : 'idle';
    const blink = p.invuln > 0 && Math.floor(p.invuln * 16) % 2 === 0;
    const paint = GUARDIAN_COLORS[p.guardian];
    // Squashing the smear on the downstroke and letting it swell back is the
    // whole trick behind the beat: the character sprite itself never changes.
    this.beats.push({
      key: this.bank.wingBlur(),
      x: p.x + sway,
      y: p.y + bob - VIEW.player * 0.12,
      span: VIEW.player * 1.2,
      sx: 1 - beat * 0.12,
      sy: 0.4 + beat * 0.78,
      alpha: 0.26 + beat * 0.34,
      tint: hexToTint(paint.wing),
    });
    place(this.player, this.bank, this.bank.guardian(p.guardian, pose), p.x + sway, p.y + bob + cast * 1.8, VIEW.player, {
      rot: leanTilt(p.vx) + drift.x * 0.024,
      sx: scale.sx * (1 + beat * 0.018),
      sy: scale.sy * (1 + beat * 0.025 - cast * 0.018),
      alpha: blink ? 0.45 : 1,
      fill: p.hitFlash > 0.12 ? 0xfff2d9 : undefined,
    });
    // Her shadow belongs on the clouds well below her, not under her feet. A
    // contact shadow at the hem is what made her read as standing on a floor.
    // It also holds its ground and shrinks as she climbs, so the bob reads as
    // altitude rather than the whole scene sliding with her.
    const lift = (beat * 2.6 - drift.y * 2.2 + 4.8) / 9.6;
    this.casts.push({
      x: p.x + sway * 0.45,
      y: p.y + VIEW.player * 0.82,
      size: VIEW.player * (0.78 - lift * 0.14),
      alpha: 0.13 - lift * 0.04,
    });
    this.aura.setPosition(p.x + sway, p.y + bob);
    if (p.rushTime > 0) ring(this.aura, VIEW.player * 0.52, 0xffd24a, 0.8, 4);
    if (p.shadeTime > 0) ring(this.aura, VIEW.player * 0.46, 0x8a7dff, 0.7, 3);
    if (p.shield > 0) ring(this.aura, VIEW.player * 0.4, 0x7ec8ff, 0.55, 3);
    if (p.pickupFlash > 0) {
      const t = 1 - p.pickupFlash / PICKUP_FLASH;
      const style = pickupStyle(p.pickupType);
      ring(this.aura, VIEW.player * (0.34 + t * 0.44), hexToTint(style.ring), 1 - t, 6 - t * 4);
      ring(this.aura, VIEW.player * (0.3 + t * 0.3), hexToTint(style.core), (1 - t) * 0.7, 2);
    }
  }

  private trailPuff(
    i: number,
    x: number,
    y: number,
    vx: number,
    vy: number,
    life: number,
    color: readonly [number, number, number],
  ): void {
    if (!this.engine.settings.particlesEnabled) return;
    const tick = Math.floor(life * 9);
    if ((i + tick) % 7 !== 0 || life * 9 - tick > 0.18) return;
    this.engine.particles.emit(x - vx * 0.018, y - vy * 0.018, vx * -0.12, vy * -0.12, color, 0.2, 2.2);
  }

  private syncParticles(): void {
    if (!this.engine.settings.particlesEnabled) {
      this.parts.sync([], () => undefined);
      return;
    }
    this.parts.sync(this.engine.particles.items, (img, part) => {
      const alpha = part.fade ? Math.max(0, part.life / part.maxLife) : 1;
      const tint = (part.r << 16) | (part.g << 8) | part.b;
      place(img, this.bank, this.bank.particle(part.shape), part.x, part.y, part.size * VIEW.particle, {
        rot: part.rotation,
        alpha,
        tint,
      });
    });
  }

  private syncFloats(): void {
    this.floats.sync(this.engine.floats.list(), (txt, item) => {
      const alpha = Math.max(0, item.life / item.maxLife);
      txt.setVisible(true);
      txt.setText(item.text);
      txt.setPosition(item.x, item.y);
      txt.setFontSize(item.size);
      txt.setAlpha(alpha);
      if (item.bubble) {
        txt.setColor('#1a1020');
        txt.setBackgroundColor('#fffef6');
        txt.setStroke('#1a1020', 2);
        txt.setPadding(8, 4, 8, 4);
      } else {
        txt.setColor(item.color);
        txt.setBackgroundColor('transparent');
        txt.setStroke('#1a1020', 4);
        txt.setPadding(0, 0, 0, 0);
      }
    });
  }

  private syncBanner(): void {
    const info = this.engine.bannerInfo();
    if (info.life <= 0 || !info.text) {
      this.banner.setVisible(false);
      return;
    }
    this.banner.setVisible(true);
    this.banner.setText(info.text);
    this.banner.setAlpha(Math.min(1, info.life));
  }
}

class ImagePool {
  private readonly scene: Phaser.Scene;
  private readonly depth: number;
  private readonly additive: boolean;
  private readonly sprites: Phaser.GameObjects.Image[] = [];

  constructor(scene: Phaser.Scene, depth: number, additive = false) {
    this.scene = scene;
    this.depth = depth;
    this.additive = additive;
  }

  sync<T>(items: readonly T[], apply: (img: Phaser.GameObjects.Image, item: T, i: number) => void): void {
    while (this.sprites.length < items.length) {
      const img = this.scene.add.image(0, 0, this.additive ? GLOW_KEY : 'dot').setDepth(this.depth).setVisible(false);
      if (this.additive) img.setBlendMode(Phaser.BlendModes.ADD);
      this.sprites.push(img);
    }
    for (let i = 0; i < this.sprites.length; i++) {
      const img = this.sprites[i]!;
      if (i < items.length) apply(img, items[i]!, i);
      else img.setVisible(false);
    }
  }
}

class TextPool {
  private readonly scene: Phaser.Scene;
  private readonly depth: number;
  private readonly nodes: Phaser.GameObjects.Text[] = [];

  constructor(scene: Phaser.Scene, depth: number) {
    this.scene = scene;
    this.depth = depth;
  }

  sync<T>(items: readonly T[], apply: (txt: Phaser.GameObjects.Text, item: T, i: number) => void): void {
    while (this.nodes.length < items.length) {
      this.nodes.push(
        this.scene.add
          .text(0, 0, '', {
            fontFamily: "Cinzel, Palatino, serif",
            fontStyle: '900',
            color: '#fff',
          })
          .setOrigin(0.5)
          .setDepth(this.depth)
          .setVisible(false),
      );
    }
    for (let i = 0; i < this.nodes.length; i++) {
      const txt = this.nodes[i]!;
      if (i < items.length) apply(txt, items[i]!, i);
      else txt.setVisible(false);
    }
  }
}

function place(
  img: Phaser.GameObjects.Image,
  bank: TextureBank,
  key: string,
  x: number,
  y: number,
  size: number,
  opts: { rot?: number; alpha?: number; tint?: number; fill?: number; sx?: number; sy?: number } = {},
): void {
  img.setVisible(true);
  if (img.texture.key !== key) img.setTexture(key);
  img.setPosition(x, y);
  const frame = bank.frame(key, size);
  img.setDisplaySize(frame * (opts.sx ?? 1), frame * (opts.sy ?? 1));
  img.setRotation(opts.rot ?? 0);
  img.setAlpha(opts.alpha ?? 1);
  if (opts.fill !== undefined) img.setTintFill(opts.fill);
  else if (opts.tint !== undefined) img.setTint(opts.tint);
  else img.clearTint();
}

/**
 * Lays a baked plume behind a falling hazard. The texture runs base-to-tip
 * left-to-right, so rotating to the reverse of travel and shifting half a
 * length puts the base on the body and the tail downwind.
 */
function placeWake(
  img: Phaser.GameObjects.Image,
  bank: TextureBank,
  kind: 'fire' | 'frost',
  body: { x: number; y: number; vx: number; vy: number },
  radius: number,
  age: number,
  style: HazardStyle,
): void {
  const len = radius * style.plume;
  const back = Math.atan2(-body.vy, -body.vx);
  const fire = kind === 'fire';
  place(
    img,
    bank,
    bank.plume(kind),
    body.x + Math.cos(back) * len * 0.5,
    body.y + Math.sin(back) * len * 0.5,
    len,
    {
      rot: back,
      sx: 1 + Math.sin(age * (fire ? 26 : 14)) * (fire ? 0.09 : 0.06),
      sy: (fire ? 0.92 : 0.9) + Math.sin(age * (fire ? 19 : 11) + 1.1) * (fire ? 0.14 : 0.1),
      alpha: (fire ? 0.88 : 0.66) + Math.sin(age * (fire ? 31 : 17)) * 0.12,
    },
  );
}

function bulletSize(bullet: Bullet): number {
  // Signature shots get extra room: their detail only reads once the sprite is
  // bigger than the plain bolt that shares its hitbox.
  const reach = bullet.guardian ? 10.2 : bullet.kind === 'spell' ? 9.8 : 7.2;
  return Math.max(VIEW.playerShot, bullet.radius * reach) * bullet.style.coreScale;
}

function enemyShotSize(shot: { radius: number }): number {
  return Math.max(VIEW.enemyShot, shot.radius * 5.4);
}

function ring(g: Phaser.GameObjects.Graphics, radius: number, color: number, alpha: number, width: number): void {
  g.lineStyle(width, color, alpha);
  g.strokeCircle(0, 0, radius);
}

/** Shrinking coral target and downward chevron announce an imminent shot. */
function chargeCue(g: Phaser.GameObjects.Graphics, x: number, y: number, charge: number, size: number): void {
  const radius = size * (1.5 - charge * 0.55);
  g.lineStyle(2.5, 0xff5367, 0.55 + charge * 0.45);
  g.strokeCircle(x, y, radius);
  g.lineStyle(1.5, 0xffe3b5, charge);
  g.strokeCircle(x, y, radius * 0.55);
  g.fillStyle(0xff5367, 0.65 + charge * 0.35);
  g.fillTriangle(x - 4, y + radius + 3, x + 4, y + radius + 3, x, y + radius + 9);
}
