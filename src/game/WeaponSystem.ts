import type { Bullet } from './Bullet.ts';
import type { ObjectPool } from './ObjectPool.ts';
import type { Player } from './Player.ts';
import type { AudioManager } from './AudioManager.ts';
import { MUZZLE } from './constants.ts';
import { GuardianId } from '../types/game.ts';
import type { GuardianId as GID } from '../types/game.ts';
import type { VFXManager } from './vfx/VFXManager.ts';
import { guardianShotStyle, paintShot } from './vfx/projectileStyle.ts';

/**
 * Each guardian's signature: how their shots move and land, on top of the shared
 * weapon tiers. Damage is trimmed wherever a shot gains reach (pierce, splash,
 * seeking) so no hero simply out-damages the rest.
 */
interface Signature {
  damage: number;
  radius: number;
  pierce: number;
  seek: number;
  splash: number;
  wave: number;
  waveFreq: number;
}

const SIGNATURE: Record<GID, Signature> = {
  // Solar Lance: steady beams, plus sun rays that flare out every third volley.
  [GuardianId.AURELIA]: { damage: 1, radius: 1, pierce: 0, seek: 0, splash: 0, wave: 0, waveFreq: 0 },
  // Storm Bolts: lightning that crackles side to side as it flies.
  [GuardianId.KAIRO]: { damage: 1, radius: 1, pierce: 0, seek: 0, splash: 0, wave: 150, waveFreq: 30 },
  // Shadow Crescents: blades that cut through the first foe they meet.
  [GuardianId.NYXARA]: { damage: 0.8, radius: 1.1, pierce: 1, seek: 0, splash: 0, wave: 0, waveFreq: 0 },
  // Seed Volley: leaves that curl toward the nearest foe ahead.
  [GuardianId.ELARA]: { damage: 0.9, radius: 1.05, pierce: 0, seek: 3.4, splash: 0, wave: 0, waveFreq: 0 },
  // Arcane Orbs: fat orbs that burst over everything nearby.
  [GuardianId.ORION]: { damage: 0.82, radius: 1.55, pierce: 0, seek: 0, splash: 46, wave: 0, waveFreq: 0 },
  // Twin Stars: paired shards that braid around each other in a helix.
  [GuardianId.VESPER]: { damage: 1, radius: 1.05, pierce: 0, seek: 0, splash: 0, wave: 210, waveFreq: 17 },
};

export class WeaponSystem {
  private volley = 0;

  fire(player: Player, bullets: Bullet[], pool: ObjectPool<Bullet>, vfx: VFXManager, audio: AudioManager): number {
    this.volley += 1;
    const spawned = this.cast(player, bullets, pool);
    const extra = player.doubleShotTime > 0 || player.mushroomTime > 0 ? this.cast(player, bullets, pool) : 0;
    vfx.muzzle(player.x, player.y - MUZZLE.player, guardianShotStyle(player.guardian), 'player');
    this.cue(player.weaponLevel, audio);
    return spawned + extra;
  }

  private cast(player: Player, bullets: Bullet[], pool: ObjectPool<Bullet>): number {
    const level = player.weaponLevel;
    const style = guardianShotStyle(player.guardian);
    const sig = SIGNATURE[player.guardian];
    let spawned = 0;

    // Each tier's pace is a fraction of the guardian's own muzzle velocity, so a
    // heavy cannon still lags a tracer bolt without pinning every gun to one speed.
    const add = (
      ox: number,
      vx: number,
      damage: number,
      kind: 'laser' | 'cannon' | 'plasma',
      pace = 1,
    ) => {
      const b = pool.acquire();
      if (!b) return;
      const shot = player.rollShot(damage * sig.damage);
      b.spawn(player.x + ox, player.y - MUZZLE.player, vx, -style.speed * pace, shot.damage, kind);
      // The tier still picks the hitbox and pace; the art is the guardian's own.
      b.guardian = player.guardian;
      b.radius *= sig.radius;
      b.pierce = sig.pierce;
      b.seek = sig.seek;
      b.splash = sig.splash;
      if (sig.wave > 0) {
        b.wave = sig.wave;
        b.waveFreq = sig.waveFreq;
        // Vesper's pairs sway in opposite phase to braid; Kairo's bolts each crackle on their own.
        b.wavePhase = player.guardian === GuardianId.VESPER ? (spawned % 2) * Math.PI : Math.random() * Math.PI * 2;
      }
      paintShot(b, style, 'player', shot.crit);
      bullets.push(b);
      spawned += 1;
    };
    // Vesper's helix needs a partner for every lone centre shot.
    const twin = player.guardian === GuardianId.VESPER;

    if (level <= 1) {
      if (twin) {
        add(-3, 0, 6.5, 'laser');
        add(3, 0, 6.5, 'laser');
      } else add(0, 0, 12, 'laser');
    } else if (level === 2) {
      add(-8, 0, 10, 'laser');
      add(8, 0, 10, 'laser');
    } else if (level === 3) {
      add(0, 0, 9, 'laser');
      add(-10, -150, 9, 'laser', 0.96);
      add(10, 150, 9, 'laser', 0.96);
    } else if (level === 4) {
      add(0, 0, 28, 'cannon', 0.85);
    } else {
      const fans = Math.min(5, 2 + Math.floor((level - 5) / 2));
      for (let i = -fans; i <= fans; i++) {
        add(i * 6, i * 28, level >= 8 ? 13 : 11, level >= 10 ? 'plasma' : 'laser', 1.04 + Math.abs(i) * 0.015);
      }
      if (level >= 6) {
        const extras = Math.min(4, level - 5);
        for (let n = 0; n < extras; n++) {
          const ox = (n - (extras - 1) / 2) * 7;
          add(ox, 0, 10, 'laser', 1.12);
        }
      }
    }
    // Aurelia's sun rays: a flared pair every third volley.
    if (player.guardian === GuardianId.AURELIA && this.volley % 3 === 0) {
      add(-12, -230, 6, 'laser', 0.92);
      add(12, 230, 6, 'laser', 0.92);
    }
    // Kairo's storm surge: every fourth volley one bolt tears through two foes.
    if (player.guardian === GuardianId.KAIRO && this.volley % 4 === 0) {
      const b = bullets[bullets.length - 1];
      if (b && spawned > 0) b.pierce = 2;
    }
    return spawned;
  }

  private cue(level: number, audio: AudioManager): void {
    audio.play(level === 4 ? 'cannon' : 'laser');
  }
}
