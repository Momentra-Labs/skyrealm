import { ElementId } from '../types/game.ts';
import type { ElementId as El, GuardianId as GID } from '../types/game.ts';
import { LOGICAL_HEIGHT, LOGICAL_WIDTH } from './constants.ts';
import { drawElementShot, drawGuardianShot, drawPlayerShot } from './fantasyDraw.ts';
import { clamp } from '../utils/random.ts';
import { DEFAULT_SHOT_STYLE } from './vfx/projectileStyle.ts';
import type { ProjectileStyle, ShotSource } from './vfx/projectileStyle.ts';

export type ShotKind = 'laser' | 'cannon' | 'plasma' | 'spell';

/** How fast a seeking spell can swing onto a target, in radians per second. */
const SEEK_TURN = 7;

export class Bullet {
  x = 0;
  y = 0;
  vx = 0;
  vy = 0;
  damage = 10;
  radius = 3;
  life = 1.6;
  kind: ShotKind = 'laser';
  glow = '#3df0ff';
  pierce = 0;
  homing = false;
  source: ShotSource = 'player';
  style: ProjectileStyle = DEFAULT_SHOT_STYLE;
  crit = false;
  /** Which elemental art a 'spell' shot wears; ignored by the other kinds. */
  element: El = ElementId.ARCANE;
  /** Set on hero shots so they wear that guardian's signature art. */
  guardian: GID | null = null;
  /** Side-to-side sway in px/s (Kairo's crackle, Vesper's twin helix). */
  wave = 0;
  waveFreq = 0;
  wavePhase = 0;
  /** Gentle seeking turn rate in rad/s for non-spell shots (Elara's leaves). */
  seek = 0;
  /** Splash radius dealt around the first target on impact (Orion's orbs). */
  splash = 0;
  /** Last body this shot struck, so a piercing shot never re-hits it frame after frame. */
  lastHit: object | null = null;
  private age = 0;

  reset(): void {
    this.x = 0;
    this.y = 0;
    this.vx = 0;
    this.vy = 0;
    this.damage = 10;
    this.radius = 3;
    this.life = 1.6;
    this.kind = 'laser';
    this.glow = '#3df0ff';
    this.pierce = 0;
    this.homing = false;
    this.source = 'player';
    this.style = DEFAULT_SHOT_STYLE;
    this.crit = false;
    this.element = ElementId.ARCANE;
    this.guardian = null;
    this.wave = 0;
    this.waveFreq = 0;
    this.wavePhase = 0;
    this.seek = 0;
    this.splash = 0;
    this.lastHit = null;
    this.age = 0;
  }

  spawn(
    x: number,
    y: number,
    vx: number,
    vy: number,
    damage: number,
    kind: ShotKind,
  ): void {
    this.x = x;
    this.y = y;
    this.vx = vx;
    this.vy = vy;
    this.damage = damage;
    this.kind = kind;
    this.radius = kind === 'cannon' ? 7 : kind === 'plasma' || kind === 'spell' ? 5 : 3;
    this.life = 1.6;
    this.glow = kind === 'cannon' ? '#ffb347' : kind === 'plasma' || kind === 'spell' ? '#c46bff' : '#7ee8ff';
    this.pierce = 0;
    this.homing = false;
    this.guardian = null;
    this.wave = 0;
    this.waveFreq = 0;
    this.wavePhase = 0;
    this.seek = 0;
    this.splash = 0;
    this.lastHit = null;
    this.age = 0;
  }

  /** True when the engine should hand this shot a target each frame. */
  seeks(): boolean {
    return this.homing || this.seek > 0;
  }

  update(dt: number, aimX?: number, aimY?: number): boolean {
    this.age += dt;
    if (this.seek > 0 && !this.homing && aimX !== undefined && aimY !== undefined && aimY < this.y) {
      // Only bends toward targets still ahead, so a leaf never U-turns into the hero.
      const want = Math.atan2(aimY - this.y, aimX - this.x);
      const heading = Math.atan2(this.vy, this.vx);
      let turn = want - heading;
      while (turn > Math.PI) turn -= Math.PI * 2;
      while (turn < -Math.PI) turn += Math.PI * 2;
      const speed = Math.hypot(this.vx, this.vy);
      const aimed = heading + clamp(turn, -this.seek * dt, this.seek * dt);
      this.vx = Math.cos(aimed) * speed;
      this.vy = Math.sin(aimed) * speed;
    }
    if (this.homing && aimX !== undefined && aimY !== undefined) {
      if (this.kind === 'spell') {
        // Seeking spell: swing onto the target at a fixed turn rate and hold speed,
        // so it arcs in cleanly instead of drifting past and looping back.
        const want = Math.atan2(aimY - this.y, aimX - this.x);
        const heading = Math.atan2(this.vy, this.vx);
        let turn = want - heading;
        while (turn > Math.PI) turn -= Math.PI * 2;
        while (turn < -Math.PI) turn += Math.PI * 2;
        const speed = Math.hypot(this.vx, this.vy);
        const aimed = heading + clamp(turn, -SEEK_TURN * dt, SEEK_TURN * dt);
        this.vx = Math.cos(aimed) * speed;
        this.vy = Math.sin(aimed) * speed;
      } else {
        const dx = aimX - this.x;
        const dy = aimY - this.y;
        const dist = Math.hypot(dx, dy) || 1;
        this.vx += (dx / dist) * 520 * dt;
        this.vy += (dy / dist) * 520 * dt - 80 * dt;
      }
    }
    this.x += this.vx * dt;
    this.y += this.vy * dt;
    if (this.wave > 0) {
      // Sway perpendicular to travel; the heading itself is untouched.
      const speed = Math.hypot(this.vx, this.vy) || 1;
      const side = Math.cos(this.age * this.waveFreq + this.wavePhase) * this.wave * dt;
      this.x += (-this.vy / speed) * side;
      this.y += (this.vx / speed) * side;
    }
    this.life -= dt;
    return (
      this.life > 0 &&
      this.x > -30 &&
      this.x < LOGICAL_WIDTH + 30 &&
      this.y > -40 &&
      this.y < LOGICAL_HEIGHT + 40
    );
  }

  render(ctx: CanvasRenderingContext2D): void {
    ctx.save();
    ctx.translate(this.x, this.y);
    ctx.rotate(Math.atan2(this.vy, this.vx) + Math.PI / 2);
    if (this.kind === 'spell') drawElementShot(ctx, this.element);
    else if (this.guardian) drawGuardianShot(ctx, this.guardian);
    else drawPlayerShot(ctx, this.kind, this.glow);
    ctx.restore();
  }
}
