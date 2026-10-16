import type { ParticleSystem } from '../Particle.ts';
import type { ProjectileStyle, ShotSource } from './projectileStyle.ts';

export function spawnMuzzleFlash(
  particles: ParticleSystem,
  x: number,
  y: number,
  style: ProjectileStyle,
  source: ShotSource = 'player',
): void {
  const scale = style.muzzleFlashScale;
  const sidekick = source === 'sidekick';
  particles.ringFlash(x, y, style.trailColor, 3 * scale, (sidekick ? 42 : 60) * scale, 0.16);
  particles.streak(x, y - 4, 0, -140, [255, 249, 221], 0.09, 3 * scale);
  for (const side of [-1, 1]) {
    particles.streak(x, y, side * 45 * scale, -85, style.particleColor, 0.14, 2 * scale);
  }
  particles.burst(
    x,
    y,
    sidekick ? 3 : 4,
    style.particleColor,
    58 * scale,
    0.1,
    (sidekick ? 1.5 : 1.9) * scale,
    sidekick ? 'puff' : 'star',
  );
}
