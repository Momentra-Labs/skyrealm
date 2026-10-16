import type { AetherlingSpecies, BossKind, EnemyType, GuardianId, PowerUpType } from '../types/game.ts';
import { drawBossShape, drawDrake, drawFoe, drawGuardian, drawPickup } from '../game/fantasyDraw.ts';
import { assets } from './AssetLoader.ts';
import { aetherPath, bossPath, enemyPath, guardianPath, powerUpAssets } from './assetManifest.ts';

export function drawGuardianSprite(ctx: CanvasRenderingContext2D, id: GuardianId, size: number, pose: 'idle' | 'attack' | 'hit' | 'ability' | 'death' | 'portrait' = 'idle'): void {
  if (assets.draw(ctx, guardianPath(id, pose), size)) return;
  if (pose !== 'idle' && assets.draw(ctx, guardianPath(id, 'idle'), size)) return;
  if (assets.draw(ctx, guardianPath(id, 'portrait'), size)) return;
  drawGuardian(ctx, id, size);
}

export function drawAetherSprite(
  ctx: CanvasRenderingContext2D,
  species: AetherlingSpecies,
  size: number,
  opts: { silhouette?: boolean; age?: number; pose?: 'idle' | 'attack' | 'portrait' | 'icon' } = {},
): void {
  if (opts.silhouette) {
    if (assets.drawSilhouette(ctx, aetherPath(species, 'portrait'), size)) return;
    drawDrake(ctx, species, size, opts);
    return;
  }
  const pose = opts.pose ?? 'idle';
  if (assets.draw(ctx, aetherPath(species, pose), size)) return;
  if (pose !== 'idle' && assets.draw(ctx, aetherPath(species, 'idle'), size)) return;
  if (assets.draw(ctx, aetherPath(species, 'portrait'), size)) return;
  drawDrake(ctx, species, size, opts);
}

export function drawFoeSprite(ctx: CanvasRenderingContext2D, type: EnemyType, radius: number, age: number): void {
  if (assets.draw(ctx, enemyPath(type, 'idle'), radius * 2.4)) return;
  drawFoe(ctx, type, radius, age);
}

export function drawBossSprite(ctx: CanvasRenderingContext2D, kind: BossKind, radius: number, age: number, pose: 'idle' | 'attack' | 'hit' | 'death' = 'idle'): void {
  if (assets.draw(ctx, bossPath(kind, pose), radius * 2.2)) return;
  if (pose !== 'idle' && assets.draw(ctx, bossPath(kind, 'idle'), radius * 2.2)) return;
  drawBossShape(ctx, kind, radius, age);
}

export function drawPickupSprite(ctx: CanvasRenderingContext2D, type: PowerUpType): void {
  if (assets.draw(ctx, powerUpAssets[type], 28)) return;
  drawPickup(ctx, type);
}
