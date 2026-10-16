import type { ParticleSystem } from '../Particle.ts';
import type { ProjectileStyle } from './projectileStyle.ts';

export function spawnProjectileImpact(
  particles: ParticleSystem,
  x: number,
  y: number,
  style: ProjectileStyle,
  opts: { crit?: boolean; boss?: boolean } = {},
): void {
  const scale = style.impactScale * (opts.crit ? 1.35 : 1) * (opts.boss ? 1.22 : 1);
  const puffs = opts.crit ? 8 : opts.boss ? 7 : 5;
  particles.ringFlash(x, y, style.trailColor, 2 * scale, 65 * scale, 0.18);
  particles.burst(x, y, 2, [255, 250, 225], 35, 0.09, 5 * scale, 'star');
  for (let i = 0; i < 4; i++) {
    const angle = Math.PI / 4 + i * Math.PI / 2;
    particles.streak(x, y, Math.cos(angle) * 125 * scale, Math.sin(angle) * 125 * scale,
      style.particleColor, 0.19, 2 * scale);
  }
  particles.burst(x, y, puffs, style.particleColor, 68 * scale, 0.16, 2 * scale, 'puff');
  particles.burst(x, y, opts.crit ? 6 : 4, style.trailColor, 38 * scale, 0.11, 1.35 * scale, 'star');
}
