import type { Bullet } from '../Bullet.ts';
import type { HazardStyle } from '../content/hazards.ts';
import type { PickupStyle } from '../content/pickups.ts';
import type { ParticleSystem } from '../Particle.ts';
import { spawnMuzzleFlash } from './MuzzleFlashVFX.ts';
import { spawnProjectileImpact } from './ProjectileImpactVFX.ts';
import { DEFAULT_SHOT_STYLE, monsterRgb } from './projectileStyle.ts';
import type { ProjectileStyle, ShotSource } from './projectileStyle.ts';
import type { CoinTier } from '../Coin.ts';

/** The struck-gold palette, matched to `drawGoldCoin`. */
const COIN_GOLD = {
  face: [255, 210, 74],
  shine: [255, 246, 200],
} as const;

export class VFXManager {
  private readonly particles: ParticleSystem;
  private readonly enabled: () => boolean;

  constructor(particles: ParticleSystem, enabled: () => boolean) {
    this.particles = particles;
    this.enabled = enabled;
  }

  muzzle(x: number, y: number, style: ProjectileStyle, source: ShotSource = 'player'): void {
    if (!this.enabled()) return;
    spawnMuzzleFlash(this.particles, x, y, style, source);
  }

  trail(bullet: Bullet, i: number): void {
    if (!this.enabled()) return;
    const style = bullet.style;
    // Spells shed motes densely: sampled more often and scattered off the line, so
    // the wake churns instead of reading as one flat colour smear.
    const spell = bullet.kind === 'spell';
    const rate = spell ? 20 : 9;
    const tick = Math.floor(bullet.life * rate);
    const stride = spell ? 2 : bullet.source === 'sidekick' || style.particleRate < 0.7 ? 9 : 7;
    if ((i + tick) % stride !== 0 || bullet.life * rate - tick > 0.18) return;
    const pull = spell ? 0.026 : 0.018 * style.trailLength;
    const spread = spell ? 46 : 0;
    this.particles.emit(
      bullet.x - bullet.vx * pull,
      bullet.y - bullet.vy * pull,
      bullet.vx * (spell ? -0.2 : -0.12) + (Math.random() - 0.5) * spread,
      bullet.vy * (spell ? -0.2 : -0.12) + (Math.random() - 0.5) * spread,
      spell ? style.particleColor : style.trailColor,
      spell ? 0.24 : 0.12 + 0.1 * style.trailOpacity,
      spell ? 2.6 : bullet.source === 'sidekick' ? 1.55 : 2.15,
    );
  }

  impact(x: number, y: number, style: ProjectileStyle = DEFAULT_SHOT_STYLE, opts: { crit?: boolean; boss?: boolean } = {}): void {
    if (!this.enabled()) return;
    spawnProjectileImpact(this.particles, x, y, style, opts);
  }

  /**
   * Flash at a monster's barrel. Runs tighter and darker than the player's:
   * a small ring, a few embers thrown along the shot, and no white core, so a
   * screen full of enemies never out-shouts the hero's own fire.
   */
  monsterMuzzle(x: number, y: number, vx: number, vy: number, element: string): void {
    if (!this.enabled()) return;
    const paint = monsterRgb(element);
    const len = Math.hypot(vx, vy) || 1;
    const nx = vx / len;
    const ny = vy / len;
    this.particles.streak(x, y, nx * 145, ny * 145, paint.edge, 0.13, 4);
    this.particles.ringFlash(x, y, paint.rim, 3, 30, 0.16);
    for (let i = 0; i < 4; i++) {
      const spread = (Math.random() - 0.5) * 1.1;
      const dx = nx * Math.cos(spread) - ny * Math.sin(spread);
      const dy = nx * Math.sin(spread) + ny * Math.cos(spread);
      this.particles.emit(
        x,
        y,
        dx * (50 + Math.random() * 70),
        dy * (50 + Math.random() * 70),
        i === 0 ? paint.edge : paint.rim,
        0.2,
        1.8 + Math.random() * 1.1,
      );
    }
  }

  /** Where monster fire lands: a splash of its element plus a hard shockwave. */
  monsterImpact(x: number, y: number, element: string): void {
    if (!this.enabled()) return;
    const paint = monsterRgb(element);
    this.particles.ringFlash(x, y, paint.edge, 5, 74, 0.24);
    for (let i = 0; i < 5; i++) {
      const angle = i * Math.PI * 2 / 5;
      this.particles.streak(x, y, Math.cos(angle) * 140, Math.sin(angle) * 140, paint.rim, 0.22, 2.8);
    }
    this.particles.burstStars(x, y, 7, paint.edge);
    this.particles.puff(x, y, paint.rim);
  }

  /**
   * Wake behind a falling hazard, thrown opposite travel so spin never drags
   * it. Emits in layers: a hot core at the body, the bulk of the wake behind
   * it, and haze that lingers furthest downwind.
   */
  hazardTrail(
    x: number,
    y: number,
    vx: number,
    vy: number,
    age: number,
    i: number,
    style: HazardStyle,
    count = 1,
  ): void {
    if (!this.enabled()) return;
    const tick = Math.floor(age * 9);
    if ((i + tick) % style.trailStride !== 0 || age * 9 - tick > 0.18) return;
    for (let n = 0; n < count; n++) {
      const hot = n === 0;
      const back = hot ? 0.015 : 0.03 + Math.random() * 0.05;
      const jitter = hot ? 2 : 8;
      this.particles.emit(
        x - vx * back + (Math.random() - 0.5) * jitter,
        y - vy * back + (Math.random() - 0.5) * jitter,
        -vx * 0.15 + (Math.random() - 0.5) * style.wind,
        -vy * 0.22 + (Math.random() - 0.5) * 18,
        hot ? style.spark : style.trail,
        hot ? 0.28 : 0.5,
        style.trailSize * (hot ? 0.6 : 0.8 + Math.random() * 0.55),
      );
    }
    if ((i + tick) % 2 !== 0) return;
    // Haze rides further out and fades slowly, giving the wake depth.
    this.particles.emit(
      x - vx * 0.08 + (Math.random() - 0.5) * 12,
      y - vy * 0.08 + (Math.random() - 0.5) * 12,
      -vx * 0.1 + (Math.random() - 0.5) * style.wind * 0.7,
      -vy * 0.12 - Math.random() * 14,
      style.haze,
      0.75,
      style.trailSize * (1.4 + Math.random() * 0.9),
    );
    // Wind-driven hazards throw dashes sideways out of the plume.
    if (style.wind > 60) {
      const side = Math.random() < 0.5 ? -1 : 1;
      this.particles.streak(
        x - vx * 0.05,
        y - vy * 0.05,
        -vx * 0.2 + side * style.wind * (0.5 + Math.random() * 0.7),
        -vy * 0.28 - Math.random() * 20,
        style.haze,
        0.4,
        style.trailSize * 1.5,
      );
    }
  }

  hazardBurst(x: number, y: number, style: HazardStyle): void {
    if (!this.enabled()) return;
    this.particles.puff(x, y, style.trail);
    this.particles.burstStars(x, y, 8, style.spark);
  }

  /** Motes lifting off a floating power-up so it never reads as scenery. */
  pickupAura(x: number, y: number, age: number, i: number, style: PickupStyle): void {
    if (!this.enabled()) return;
    const tick = Math.floor(age * 9);
    if ((i + tick) % 2 !== 0 || age * 9 - tick > 0.18) return;
    const a = Math.random() * Math.PI * 2;
    this.particles.emit(
      x + Math.cos(a) * 15,
      y + Math.sin(a) * 15,
      Math.cos(a) * -14,
      -34 - Math.random() * 26,
      style.mote,
      0.45,
      1.5 + Math.random() * 1.2,
    );
  }

  /** The grab: shockwave ring, star burst, and a soft bloom in the buff color. */
  pickupCollect(x: number, y: number, style: PickupStyle): void {
    if (!this.enabled()) return;
    this.particles.ringFlash(x, y, style.spark, 6, 62, 0.34);
    this.particles.ringFlash(x, y, style.mote, 3, 40, 0.24);
    this.particles.burstStars(x, y, 12, style.spark);
    this.particles.puff(x, y, style.mote);
  }

  /**
   * Gold shed by a coin the magnet has hold of, so the sweep towards the hero
   * leaves a visible line of treasure. Idle coins drift too slowly to qualify.
   */
  coinTrail(x: number, y: number, vx: number, vy: number, age: number, i: number): void {
    if (!this.enabled()) return;
    if (Math.hypot(vx, vy) < 240) return;
    if ((i + Math.floor(age * 30)) % 3 !== 0) return;
    this.particles.streak(x - vx * 0.02, y - vy * 0.02, vx * -0.16, vy * -0.16, COIN_GOLD.face, 0.22, 2.6);
  }

  /** The grab: a gold shockwave, a spray of coin glints, and a bloom of dust. */
  coinCollect(x: number, y: number, tier: CoinTier, streak: number): void {
    if (!this.enabled()) return;
    const stars = tier === 'gem' ? 18 : tier === 'star' ? 12 : 8;
    this.particles.ringFlash(x, y, COIN_GOLD.face, 5, 54, 0.28);
    this.particles.ringFlash(x, y, COIN_GOLD.shine, 3, 32, 0.2);
    this.particles.burstStars(x, y, stars, COIN_GOLD.shine);
    this.particles.puff(x, y, COIN_GOLD.face);
    // A run of pickups visibly escalates without paying out any extra.
    if (streak >= 5) this.particles.ringFlash(x, y, COIN_GOLD.shine, 8, 88, 0.36);
  }
}
