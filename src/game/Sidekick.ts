import type { AbilityId as AbilityIdT, OwnedAetherling } from '../types/game.ts';
import { AbilityId } from '../types/game.ts';
import type { Bullet } from './Bullet.ts';
import { FORMATION, MUZZLE } from './constants.ts';
import type { ObjectPool } from './ObjectPool.ts';
import type { Player } from './Player.ts';
import { SPECIES_META, aetherPower } from './content/aetherlings.ts';
import { drawAetherSprite } from '../assets/drawEntity.ts';
import { leanTilt } from './cartoon.ts';
import type { VFXManager } from './vfx/VFXManager.ts';
import { paintShot, speciesShotStyle } from './vfx/projectileStyle.ts';

/** How long a companion wears its glowing cast pose after a shot. */
export const SIDEKICK_FLARE = 0.09;

export class Sidekick {
  x = 0;
  y = 0;
  vx = 0;
  slot = 0;
  fireCd = 0;
  unit: OwnedAetherling | null = null;
  /** Ability cooldown, reset on every trigger. Not a clock: see `age`. */
  pulse = 0;
  /** Monotonic clock for hover and flight motion, which must never snap back. */
  age = 0;
  /** Seconds left on the cast flare shown after each shot. Visual only. */
  fireFlash = 0;

  bind(unit: OwnedAetherling | undefined, slot: number, player: Player): void {
    this.unit = unit ?? null;
    this.slot = slot;
    this.x = anchorX(slot, player);
    this.y = anchorY(player);
    this.vx = 0;
    this.fireCd = 0.2 + slot * 0.1;
    this.pulse = 0;
    this.age = 0;
    this.fireFlash = 0;
  }

  update(
    dt: number,
    player: Player,
    bullets: Bullet[],
    pool: ObjectPool<Bullet>,
    vfx: VFXManager,
  ): number {
    if (!this.unit || !player.alive) return 0;
    // Same exponential easing as the hero's cursor follow, so the formation keeps
    // its shape at any frame rate instead of rubber-banding on slow frames.
    const follow = 1 - Math.exp(-dt * FORMATION.wingFollow);
    const nextX = this.x + (anchorX(this.slot, player) - this.x) * follow;
    this.vx = dt > 0 ? (nextX - this.x) / dt : 0;
    this.x = nextX;
    this.y += (anchorY(player) - this.y) * follow;
    this.fireCd -= dt;
    this.pulse += dt;
    this.age += dt;
    this.fireFlash = Math.max(0, this.fireFlash - dt);
    const meta = SPECIES_META[this.unit.species];
    const scale = aetherPower(this.unit.level, this.unit.stars, this.unit.rarity);
    const haste = meta.ability === AbilityId.HASTE ? 1.25 : 1;
    let spawned = 0;
    if (this.fireCd <= 0) {
      this.fireCd = 1 / (meta.fireRate * scale.fireRate * haste);
      spawned = this.shoot(bullets, pool, vfx, meta.damage * scale.damage);
      this.fireFlash = SIDEKICK_FLARE;
    }
    if (meta.ability === AbilityId.HEALING_PULSE && this.pulse > 2.4) {
      this.pulse = 0;
      player.heal(3);
    }
    if (meta.ability === AbilityId.AETHER_SHIELD && this.pulse > 1.8) {
      this.pulse = 0;
      player.addShield(2);
    }
    if (meta.ability === AbilityId.ENERGY_DRIP && this.pulse > 1.4) {
      this.pulse = 0;
      player.addEnergy(3);
    }
    return spawned;
  }

  render(ctx: CanvasRenderingContext2D): void {
    if (!this.unit) return;
    ctx.save();
    ctx.translate(this.x, this.y);
    ctx.rotate(leanTilt(this.vx));
    ctx.globalAlpha = this.slot >= 2 ? 0.55 : 1;
    drawAetherSprite(ctx, this.unit.species, this.slot >= 2 ? 22 : 28, { age: this.age, pose: 'idle' });
    ctx.restore();
  }

  private shoot(
    bullets: Bullet[],
    pool: ObjectPool<Bullet>,
    vfx: VFXManager,
    damage: number,
  ): number {
    if (!this.unit) return 0;
    const b = pool.acquire();
    if (!b) return 0;
    // One spell per sidekick, cast straight up from the top of its head and then
    // steered onto whichever foe is nearest. The art comes from its element.
    const meta = SPECIES_META[this.unit.species];
    const ability = meta.ability;
    const style = speciesShotStyle(this.unit.species);
    const top = this.y - (this.slot >= 2 ? MUZZLE.wingClone : MUZZLE.wing);
    const boss = ability === AbilityId.SHADOW_STRIKE ? 1.25 : 1;
    b.spawn(this.x, top, 0, -style.speed, damage * volleySize(ability) * boss, 'spell');
    b.element = meta.element;
    b.pierce = ability === AbilityId.PIERCE ? 2 : 0;
    b.homing = true;
    paintShot(b, style, 'sidekick', false);
    bullets.push(b);
    vfx.muzzle(this.x, top, style, 'sidekick');
    return 1;
  }
}

/** Even slots flank the hero on the left, odd slots on the right. */
function anchorX(slot: number, player: Player): number {
  const spread = slot >= 2 ? FORMATION.cloneSpread : FORMATION.wingSpread;
  return player.x + (slot % 2 === 0 ? -spread : spread);
}

function anchorY(player: Player): number {
  return player.y + FORMATION.wingDrop;
}

/** Volley weight of a species, folded into the damage of its single spell. */
function volleySize(ability: AbilityIdT): number {
  if (ability === AbilityId.SPLASH || ability === AbilityId.THUNDER_CHAIN) return 3;
  if (ability === AbilityId.ARCANE_ECHO || ability === AbilityId.LIGHT_BEAM) return 2;
  return 1;
}
