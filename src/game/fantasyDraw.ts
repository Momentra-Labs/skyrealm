import { AetherlingSpecies, BossKind, ElementId, EnemyType, GuardianId, PowerUpType } from '../types/game.ts';
import type {
  AetherlingSpecies as Species,
  BossKind as BK,
  ElementId as El,
  EnemyType as ET,
  GuardianId as GID,
  PowerUpType as PUT,
} from '../types/game.ts';
import { ELEMENT_COLOR } from './content/elements.ts';
import { SPECIES_META } from './content/aetherlings.ts';
import { BOSS_META } from './content/bosses.ts';
import { FOE_ART } from './content/foeArt.ts';
import { EMBER_ASTEROID, FROST_HAIL } from './content/hazards.ts';
import type { HazardStyle } from './content/hazards.ts';
import type { PickupStyle } from './content/pickups.ts';
import {
  LINE,
  LINE_DARK,
  SKIN,
  SHADOW_FILL,
  blush,
  blob,
  clearGlow,
  glowAura,
  oval,
  pairEyes,
  shineEye,
  smile,
  softFill,
  sparkle,
  strokeStyle,
  wingPair,
} from './cuteDraw.ts';

export const GUARDIAN_COLORS: Record<GID, { hair: string; dress: string; wing: string; glow: string; accent: string }> = {
  [GuardianId.AURELIA]: { hair: '#ffe08a', dress: '#ff9a62', wing: '#fff3c4', glow: '#ffd24a', accent: '#ff7a3a' },
  [GuardianId.KAIRO]: { hair: '#7ee8ff', dress: '#3a88b8', wing: '#d4f7ff', glow: '#3df0ff', accent: '#1f5f88' },
  [GuardianId.NYXARA]: { hair: '#c46bff', dress: '#2a1a40', wing: '#b8a8ff', glow: '#c46bff', accent: '#6b4aa8' },
  [GuardianId.ELARA]: { hair: '#8cff9e', dress: '#3fa86a', wing: '#e7ffc8', glow: '#7dff9a', accent: '#2f8f5b' },
  [GuardianId.ORION]: { hair: '#ff7ad9', dress: '#5a3498', wing: '#ffd0f2', glow: '#ff7ad9', accent: '#ffd24a' },
  [GuardianId.VESPER]: { hair: '#c0b4e4', dress: '#4a2d6e', wing: '#e2c4ff', glow: '#b388ff', accent: '#7a5aa8' },
};

export interface DrawOpts {
  portrait?: boolean;
  age?: number;
  silhouette?: boolean;
}

export function drawGuardian(ctx: CanvasRenderingContext2D, id: GID, size = 36, opts: DrawOpts = {}): void {
  const c = GUARDIAN_COLORS[id];
  const s = size / 36;
  const flap = Math.sin((opts.age ?? 0) * 8) * 0.08;
  const headBoost = opts.portrait ? 1.12 : 1;
  ctx.save();
  glowAura(ctx, c.glow, 16);
  if (id === GuardianId.AURELIA) drawAureliaWings(ctx, s, c, flap);
  else if (id === GuardianId.KAIRO) drawKairoWings(ctx, s, c, flap);
  else if (id === GuardianId.NYXARA) drawNyxaraWings(ctx, s, c, flap);
  else if (id === GuardianId.ELARA) drawElaraWings(ctx, s, c, flap);
  else if (id === GuardianId.ORION) drawOrionWings(ctx, s, c, flap);
  else drawVesperWings(ctx, s, c, flap);
  clearGlow(ctx);

  if (id === GuardianId.VESPER) {
    oval(ctx, 0, 6 * s, 13 * s, 16 * s, c.wing, s * 0.8, 0);
  }

  ctx.fillStyle = c.dress;
  ctx.beginPath();
  if (id === GuardianId.KAIRO) {
    ctx.moveTo(-7 * s, -2 * s);
    ctx.lineTo(-9 * s, 15 * s);
    ctx.quadraticCurveTo(0, 18 * s, 9 * s, 15 * s);
    ctx.lineTo(7 * s, -2 * s);
  } else if (id === GuardianId.NYXARA) {
    ctx.moveTo(-6 * s, -3 * s);
    ctx.quadraticCurveTo(-14 * s, 18 * s, 0, 20 * s);
    ctx.quadraticCurveTo(14 * s, 18 * s, 6 * s, -3 * s);
  } else {
    ctx.moveTo(-5 * s, -3 * s);
    ctx.quadraticCurveTo(-13 * s, 18 * s, 0, 17 * s);
    ctx.quadraticCurveTo(13 * s, 18 * s, 5 * s, -3 * s);
  }
  ctx.closePath();
  ctx.fill();
  strokeStyle(ctx, s);
  ctx.stroke();
  ctx.fillStyle = c.accent;
  ctx.globalAlpha = 0.35;
  ctx.beginPath();
  ctx.ellipse(0, 6 * s, 4 * s, 7 * s, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.globalAlpha = 1;

  const hy = -11 * s * headBoost;
  const hr = 7.4 * s * headBoost;
  blob(ctx, 0, hy, hr, SKIN, s);
  drawHair(ctx, id, c.hair, s, headBoost);
  blush(ctx, 0, hy + 1.2 * s, s * headBoost);
  pairEyes(ctx, hy + 0.4 * s, 2.6 * s * headBoost, s * headBoost);
  smile(ctx, hy + 3.4 * s, 2.2 * s, s);
  if (id === GuardianId.ELARA) drawLeafCrown(ctx, s, c.accent);
  if (id === GuardianId.ORION) sparkle(ctx, 6 * s, hy - 8 * s, 3.4 * s, c.accent);
  if (id === GuardianId.AURELIA) sparkle(ctx, 0, hy - 11 * s, 3.2 * s, c.glow);
  ctx.restore();
}

export function drawGuardianPortrait(ctx: CanvasRenderingContext2D, id: GID, size = 56): void {
  drawGuardian(ctx, id, size, { portrait: true });
}

function drawHair(ctx: CanvasRenderingContext2D, id: GID, color: string, s: number, boost: number): void {
  ctx.fillStyle = color;
  if (id === GuardianId.AURELIA) {
    ctx.beginPath();
    ctx.ellipse(0, -15 * s * boost, 8.6 * s * boost, 6.4 * s * boost, 0, Math.PI, Math.PI * 2);
    ctx.fill();
    oval(ctx, -8 * s, -2 * s, 3.2 * s, 10 * s, color, s * 0.7, -0.2);
    oval(ctx, 8 * s, -1 * s, 3.2 * s, 11 * s, color, s * 0.7, 0.2);
  } else if (id === GuardianId.KAIRO) {
    ctx.beginPath();
    ctx.moveTo(-8 * s, -12 * s);
    ctx.quadraticCurveTo(-2 * s, -22 * s, 9 * s, -16 * s);
    ctx.quadraticCurveTo(4 * s, -10 * s, 7 * s, -6 * s);
    ctx.lineTo(-6 * s, -7 * s);
    ctx.closePath();
    ctx.fill();
    strokeStyle(ctx, s * 0.8);
    ctx.stroke();
  } else if (id === GuardianId.NYXARA) {
    ctx.beginPath();
    ctx.ellipse(0, -15 * s * boost, 8.2 * s * boost, 6 * s * boost, 0, Math.PI, Math.PI * 2);
    ctx.fill();
    oval(ctx, 7.5 * s, 0, 4.4 * s, 12 * s, color, s * 0.7, 0.25);
    oval(ctx, -5 * s, -6 * s, 3.4 * s, 7 * s, color, s * 0.6, -0.4);
  } else if (id === GuardianId.ELARA) {
    ctx.beginPath();
    ctx.ellipse(0, -14.5 * s * boost, 8 * s * boost, 5.6 * s * boost, 0, Math.PI, Math.PI * 2);
    ctx.fill();
    oval(ctx, -7 * s, -4 * s, 2.6 * s, 7 * s, color, s * 0.6, -0.15);
    oval(ctx, 7 * s, -4 * s, 2.6 * s, 7 * s, color, s * 0.6, 0.15);
  } else if (id === GuardianId.ORION) {
    ctx.beginPath();
    ctx.ellipse(0, -14 * s * boost, 7.6 * s * boost, 5.2 * s * boost, 0, Math.PI, Math.PI * 2);
    ctx.fill();
    blob(ctx, 0, -20 * s * boost, 3.6 * s, color, s * 0.7);
  } else {
    ctx.beginPath();
    ctx.ellipse(0, -14.5 * s * boost, 8.4 * s * boost, 6 * s * boost, 0, Math.PI, Math.PI * 2);
    ctx.fill();
    oval(ctx, -6 * s, -2 * s, 3 * s, 9 * s, color, s * 0.65, -0.1);
    oval(ctx, 6.5 * s, -1 * s, 3 * s, 10 * s, color, s * 0.65, 0.15);
  }
}

function drawAureliaWings(
  ctx: CanvasRenderingContext2D,
  s: number,
  c: (typeof GUARDIAN_COLORS)[GID],
  flap: number,
): void {
  wingPair(ctx, 2 * s, 13 * s, 11 * s, 16 * s, 0.45 + flap, c.wing, '#fffef0', s);
  for (const dir of [-1, 1]) {
    ctx.strokeStyle = c.glow;
    ctx.lineWidth = 1.2;
    for (let i = 0; i < 3; i++) {
      const a = dir * (0.7 + i * 0.25) + flap;
      ctx.beginPath();
      ctx.moveTo(dir * 8 * s, 0);
      ctx.lineTo(dir * (18 + i * 2) * s, Math.sin(a) * 10 * s);
      ctx.stroke();
    }
  }
}

function drawKairoWings(
  ctx: CanvasRenderingContext2D,
  s: number,
  c: (typeof GUARDIAN_COLORS)[GID],
  flap: number,
): void {
  for (const dir of [-1, 1] as const) {
    ctx.save();
    ctx.translate(dir * 12 * s, 1 * s);
    ctx.rotate(dir * (0.55 + flap));
    ctx.fillStyle = c.wing;
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.quadraticCurveTo(dir * 16 * s, -18 * s, dir * 4 * s, -20 * s);
    ctx.quadraticCurveTo(dir * 2 * s, -8 * s, 0, 8 * s);
    ctx.closePath();
    ctx.fill();
    strokeStyle(ctx, s * 0.8);
    ctx.stroke();
    ctx.restore();
  }
}

function drawNyxaraWings(
  ctx: CanvasRenderingContext2D,
  s: number,
  c: (typeof GUARDIAN_COLORS)[GID],
  flap: number,
): void {
  wingPair(ctx, 1 * s, 13 * s, 13 * s, 15 * s, 0.35 + flap, c.wing, '#6b4aa8', s);
  ctx.fillStyle = c.accent;
  ctx.globalAlpha = 0.45;
  blob(ctx, -14 * s, 0, 2.4 * s, c.accent, 0.4);
  blob(ctx, 14 * s, 2 * s, 2.2 * s, c.accent, 0.4);
  ctx.globalAlpha = 1;
}

function drawElaraWings(
  ctx: CanvasRenderingContext2D,
  s: number,
  c: (typeof GUARDIAN_COLORS)[GID],
  flap: number,
): void {
  for (const dir of [-1, 1] as const) {
    for (let i = 0; i < 3; i++) {
      oval(ctx, dir * (10 + i * 2) * s, (i - 1) * 5 * s, 5.5 * s, 8 * s, c.wing, s * 0.65, dir * (0.4 + flap + i * 0.12));
    }
  }
}

function drawOrionWings(
  ctx: CanvasRenderingContext2D,
  s: number,
  c: (typeof GUARDIAN_COLORS)[GID],
  flap: number,
): void {
  wingPair(ctx, 1 * s, 12 * s, 10 * s, 15 * s, 0.5 + flap, c.wing, '#fff', s);
  sparkle(ctx, -16 * s, -6 * s, 2.6 * s, c.accent);
  sparkle(ctx, 16 * s, 4 * s, 2.2 * s, c.glow);
}

function drawVesperWings(
  ctx: CanvasRenderingContext2D,
  s: number,
  c: (typeof GUARDIAN_COLORS)[GID],
  flap: number,
): void {
  void flap;
  oval(ctx, -11 * s, 6 * s, 8 * s, 14 * s, c.wing, s, -0.2);
  oval(ctx, 11 * s, 6 * s, 8 * s, 14 * s, c.wing, s, 0.2);
}

function drawLeafCrown(ctx: CanvasRenderingContext2D, s: number, color: string): void {
  ctx.fillStyle = color;
  for (let i = -2; i <= 2; i++) {
    oval(ctx, i * 3.2 * s, -19 * s, 2.2 * s, 4.2 * s, i === 0 ? '#ffe08a' : color, s * 0.5, i * 0.35);
  }
}

export function drawDrake(ctx: CanvasRenderingContext2D, species: Species, size = 26, opts: DrawOpts = {}): void {
  const glow = SPECIES_META[species].glow;
  const fill = opts.silhouette ? SHADOW_FILL : ELEMENT_COLOR[SPECIES_META[species].element];
  const s = size / 26;
  const bob = Math.sin((opts.age ?? 0) * 6) * 1.2 * s;
  ctx.save();
  ctx.translate(0, bob);
  if (!opts.silhouette) glowAura(ctx, glow, 12);
  drawSpeciesBody(ctx, species, fill, glow, s, opts.silhouette === true);
  ctx.restore();
}

function critterFace(ctx: CanvasRenderingContext2D, y: number, spread: number, s: number, locked: boolean): void {
  if (locked) return;
  pairEyes(ctx, y, spread, s * 0.85);
  smile(ctx, y + 2.6 * s, 1.6 * s, s * 0.8);
}

function drawSpeciesBody(
  ctx: CanvasRenderingContext2D,
  species: Species,
  fill: string,
  glow: string,
  s: number,
  locked: boolean,
): void {
  const face = (y: number, spread = 2.1 * s) => critterFace(ctx, y, spread, s, locked);
  if (species === AetherlingSpecies.FLICKER) {
    oval(ctx, 8 * s, 4 * s, 7 * s, 3.2 * s, glow, s * 0.7, 0.4);
    oval(ctx, 0, 2 * s, 8 * s, 6 * s, fill, s);
    ctx.fillStyle = glow;
    ctx.beginPath();
    ctx.moveTo(-4 * s, -8 * s);
    ctx.lineTo(-7 * s, -14 * s);
    ctx.lineTo(-1 * s, -8 * s);
    ctx.moveTo(4 * s, -8 * s);
    ctx.lineTo(7 * s, -14 * s);
    ctx.lineTo(1 * s, -8 * s);
    ctx.fill();
    face(1 * s);
  } else if (species === AetherlingSpecies.CINDER) {
    oval(ctx, 0, 3 * s, 9 * s, 7 * s, fill, s);
    blob(ctx, -5 * s, -2 * s, 2 * s, glow, s * 0.4);
    blob(ctx, 4 * s, 0, 1.6 * s, glow, s * 0.4);
    face(1 * s, 2.4 * s);
  } else if (species === AetherlingSpecies.PYRELING) {
    ctx.fillStyle = fill;
    ctx.beginPath();
    ctx.moveTo(0, 10 * s);
    ctx.quadraticCurveTo(-10 * s, 2 * s, -2 * s, -10 * s);
    ctx.quadraticCurveTo(0, -4 * s, 3 * s, -11 * s);
    ctx.quadraticCurveTo(10 * s, 2 * s, 0, 10 * s);
    ctx.fill();
    strokeStyle(ctx, s);
    ctx.stroke();
    face(-1 * s);
  } else if (species === AetherlingSpecies.TIDECURL) {
    oval(ctx, 0, 1 * s, 10 * s, 5.5 * s, fill, s, -0.2);
    ctx.beginPath();
    ctx.moveTo(8 * s, 1 * s);
    ctx.quadraticCurveTo(16 * s, -6 * s, 14 * s, 6 * s);
    ctx.quadraticCurveTo(12 * s, 2 * s, 8 * s, 3 * s);
    ctx.fillStyle = glow;
    ctx.fill();
    face(0);
  } else if (species === AetherlingSpecies.BRINE) {
    oval(ctx, 0, 3 * s, 9 * s, 6 * s, glow, s);
    oval(ctx, 0, 2 * s, 7 * s, 5 * s, fill, s);
    blob(ctx, 0, -5 * s, 3.2 * s, fill, s * 0.7);
    face(-5 * s, 1.6 * s);
  } else if (species === AetherlingSpecies.RIPPLE) {
    ctx.fillStyle = fill;
    ctx.beginPath();
    ctx.moveTo(0, -10 * s);
    ctx.quadraticCurveTo(10 * s, 0, 0, 11 * s);
    ctx.quadraticCurveTo(-10 * s, 0, 0, -10 * s);
    ctx.fill();
    strokeStyle(ctx, s);
    ctx.stroke();
    face(0);
  } else if (species === AetherlingSpecies.SPROUT) {
    oval(ctx, 0, 3 * s, 7.5 * s, 6.5 * s, fill, s);
    oval(ctx, -5 * s, -8 * s, 4.2 * s, 2.4 * s, glow, s * 0.6, -0.5);
    oval(ctx, 5 * s, -8 * s, 4.2 * s, 2.4 * s, glow, s * 0.6, 0.5);
    face(2 * s);
  } else if (species === AetherlingSpecies.BRAMBLE) {
    oval(ctx, 0, 2 * s, 8 * s, 6.2 * s, fill, s);
    ctx.fillStyle = glow;
    for (let i = 0; i < 8; i++) {
      const a = (i / 8) * Math.PI * 2 - 0.4;
      ctx.beginPath();
      ctx.moveTo(Math.cos(a) * 6 * s, Math.sin(a) * 4.5 * s);
      ctx.lineTo(Math.cos(a) * 11 * s, Math.sin(a) * 8 * s);
      ctx.lineTo(Math.cos(a + 0.3) * 6 * s, Math.sin(a + 0.3) * 4.5 * s);
      ctx.fill();
    }
    face(2 * s);
  } else if (species === AetherlingSpecies.MOSSKIN) {
    oval(ctx, 0, 3 * s, 11 * s, 5.2 * s, fill, s);
    blob(ctx, -4 * s, 0, 2.4 * s, glow, s * 0.4);
    blob(ctx, 5 * s, 2 * s, 2 * s, glow, s * 0.4);
    face(1 * s);
  } else if (species === AetherlingSpecies.GLOOM) {
    oval(ctx, 7 * s, 4 * s, 6 * s, 2.2 * s, glow, s * 0.6, 0.5);
    oval(ctx, 0, 2 * s, 7.5 * s, 6 * s, fill, s);
    ctx.fillStyle = fill;
    ctx.beginPath();
    ctx.moveTo(-4 * s, -8 * s);
    ctx.lineTo(-6 * s, -14 * s);
    ctx.lineTo(-1 * s, -8 * s);
    ctx.moveTo(4 * s, -8 * s);
    ctx.lineTo(6 * s, -14 * s);
    ctx.lineTo(1 * s, -8 * s);
    ctx.fill();
    face(1 * s);
  } else if (species === AetherlingSpecies.DUSKWISP) {
    oval(ctx, 0, 0, 7 * s, 8 * s, fill, s);
    oval(ctx, 0, 10 * s, 4 * s, 6 * s, glow, s * 0.6);
    face(-1 * s);
  } else if (species === AetherlingSpecies.NIGHTMOTH) {
    wingPair(ctx, 0, 8 * s, 8 * s, 10 * s, 0.3, glow, fill, s * 0.8);
    oval(ctx, 0, 2 * s, 4.5 * s, 7 * s, fill, s);
    face(0, 1.5 * s);
  } else if (species === AetherlingSpecies.LUMEN) {
    sparkle(ctx, 0, 0, 12 * s, fill);
    if (!locked) {
      blob(ctx, 0, 0, 5 * s, SKIN, s * 0.6);
      face(0, 1.7 * s);
    }
  } else if (species === AetherlingSpecies.HALO) {
    ctx.strokeStyle = glow;
    ctx.lineWidth = 2.4 * s;
    ctx.beginPath();
    ctx.ellipse(0, -9 * s, 7 * s, 2.4 * s, 0, 0, Math.PI * 2);
    ctx.stroke();
    oval(ctx, 0, 2 * s, 7 * s, 7.5 * s, fill, s);
    face(0);
  } else if (species === AetherlingSpecies.GLIMMER) {
    oval(ctx, 0, 2 * s, 8 * s, 6 * s, fill, s);
    oval(ctx, 0, 1 * s, 6 * s, 4 * s, glow, s * 0.6);
    oval(ctx, -8 * s, 0, 4 * s, 2 * s, fill, s * 0.5, -0.3);
    oval(ctx, 8 * s, 0, 4 * s, 2 * s, fill, s * 0.5, 0.3);
    face(1 * s);
  } else if (species === AetherlingSpecies.HEXLING) {
    oval(ctx, 0, 3 * s, 7 * s, 6.5 * s, fill, s);
    ctx.fillStyle = glow;
    ctx.beginPath();
    ctx.moveTo(-5 * s, -6 * s);
    ctx.lineTo(-8 * s, -14 * s);
    ctx.lineTo(-2 * s, -7 * s);
    ctx.moveTo(5 * s, -6 * s);
    ctx.lineTo(8 * s, -14 * s);
    ctx.lineTo(2 * s, -7 * s);
    ctx.fill();
    oval(ctx, 6 * s, 8 * s, 4 * s, 1.8 * s, glow, s * 0.5, 0.6);
    face(2 * s);
  } else if (species === AetherlingSpecies.PRISMITE) {
    ctx.fillStyle = fill;
    ctx.beginPath();
    ctx.moveTo(0, -12 * s);
    ctx.lineTo(8 * s, 2 * s);
    ctx.lineTo(0, 10 * s);
    ctx.lineTo(-8 * s, 2 * s);
    ctx.closePath();
    ctx.fill();
    strokeStyle(ctx, s);
    ctx.stroke();
    ctx.fillStyle = glow;
    ctx.beginPath();
    ctx.moveTo(0, -6 * s);
    ctx.lineTo(4 * s, 2 * s);
    ctx.lineTo(-4 * s, 2 * s);
    ctx.closePath();
    ctx.fill();
    face(3 * s, 1.8 * s);
  } else if (species === AetherlingSpecies.FLAMEFOX) {
    oval(ctx, 8 * s, 5 * s, 6 * s, 2.4 * s, glow, s * 0.6, 0.5);
    oval(ctx, 0, 2 * s, 8 * s, 6 * s, fill, s);
    ctx.fillStyle = glow;
    ctx.beginPath();
    ctx.moveTo(-4 * s, -7 * s);
    ctx.lineTo(-6 * s, -14 * s);
    ctx.lineTo(0, -7 * s);
    ctx.moveTo(3 * s, -7 * s);
    ctx.lineTo(6 * s, -13 * s);
    ctx.lineTo(1 * s, -6 * s);
    ctx.fill();
    face(1 * s);
  } else if (species === AetherlingSpecies.AQUAMANTA) {
    oval(ctx, 0, 2 * s, 11 * s, 4.5 * s, fill, s);
    oval(ctx, -2 * s, 2 * s, 5 * s, 3 * s, glow, s * 0.5);
    face(0, 1.8 * s);
  } else if (species === AetherlingSpecies.MOSSLING) {
    oval(ctx, 0, 3 * s, 8 * s, 6.5 * s, fill, s);
    oval(ctx, -4 * s, -8 * s, 3.6 * s, 2.2 * s, glow, s * 0.5, -0.4);
    oval(ctx, 4 * s, -8 * s, 3.6 * s, 2.2 * s, glow, s * 0.5, 0.4);
    face(2 * s);
  } else if (species === AetherlingSpecies.STORMWING) {
    wingPair(ctx, 0, 9 * s, 7 * s, 9 * s, 0.4, glow, fill, s * 0.7);
    oval(ctx, 0, 2 * s, 6 * s, 5.5 * s, fill, s);
    face(1 * s);
  } else if (species === AetherlingSpecies.SHADOWCUB) {
    oval(ctx, 0, 3 * s, 7.5 * s, 6.2 * s, fill, s);
    ctx.fillStyle = fill;
    ctx.beginPath();
    ctx.moveTo(-4 * s, -6 * s);
    ctx.lineTo(-5 * s, -12 * s);
    ctx.lineTo(-1 * s, -6 * s);
    ctx.moveTo(4 * s, -6 * s);
    ctx.lineTo(5 * s, -12 * s);
    ctx.lineTo(1 * s, -6 * s);
    ctx.fill();
    face(2 * s);
  } else if (species === AetherlingSpecies.CRYSTSERPENT) {
    oval(ctx, -4 * s, 4 * s, 5 * s, 3 * s, fill, s * 0.7);
    oval(ctx, 2 * s, 0, 6 * s, 3.4 * s, glow, s * 0.7);
    oval(ctx, 6 * s, -5 * s, 4 * s, 3 * s, fill, s * 0.7);
    face(-4 * s, 1.5 * s);
  } else if (species === AetherlingSpecies.MOONOWL) {
    oval(ctx, 0, -2 * s, 8 * s, 7 * s, fill, s);
    oval(ctx, 0, 7 * s, 5 * s, 4 * s, glow, s * 0.7);
    face(-2 * s, 2.3 * s);
  } else if (species === AetherlingSpecies.SOLARHARE) {
    oval(ctx, 0, 3 * s, 7 * s, 6 * s, fill, s);
    oval(ctx, -3 * s, -8 * s, 1.6 * s, 5 * s, glow, s * 0.5);
    oval(ctx, 3 * s, -8 * s, 1.6 * s, 5 * s, glow, s * 0.5);
    face(2 * s);
  } else if (species === AetherlingSpecies.FROSTLYNX) {
    oval(ctx, 0, 3 * s, 8 * s, 6 * s, fill, s);
    oval(ctx, 8 * s, 5 * s, 5 * s, 2 * s, glow, s * 0.5, 0.4);
    face(1 * s, 2.2 * s);
  } else if (species === AetherlingSpecies.VOIDPUP) {
    oval(ctx, 0, 3 * s, 7 * s, 6 * s, fill, s);
    blob(ctx, 0, -8 * s, 2.2 * s, glow, s * 0.5);
    face(2 * s);
  } else if (species === AetherlingSpecies.EMBERBAT) {
    wingPair(ctx, 1 * s, 8 * s, 7 * s, 5 * s, 0.2, glow, fill, s * 0.6);
    oval(ctx, 0, 2 * s, 5 * s, 5.5 * s, fill, s);
    face(1 * s, 1.6 * s);
  } else if (species === AetherlingSpecies.THORNBACK) {
    oval(ctx, 0, 3 * s, 8.5 * s, 6 * s, fill, s);
    ctx.fillStyle = glow;
    for (let i = 0; i < 5; i++) {
      const a = -0.8 + i * 0.4;
      ctx.beginPath();
      ctx.moveTo(Math.cos(a) * 4 * s, Math.sin(a) * 3 * s - 2 * s);
      ctx.lineTo(Math.cos(a) * 10 * s, Math.sin(a) * 8 * s - 2 * s);
      ctx.lineTo(Math.cos(a + 0.2) * 4 * s, Math.sin(a + 0.2) * 3 * s - 2 * s);
      ctx.fill();
    }
    face(3 * s);
  } else {
    oval(ctx, 0, -3 * s, 8 * s, 7 * s, fill, s);
    oval(ctx, 0, 7 * s, 5 * s, 5 * s, glow, s * 0.8);
    ctx.fillStyle = fill;
    ctx.beginPath();
    ctx.moveTo(-5 * s, -10 * s);
    ctx.lineTo(-7 * s, -16 * s);
    ctx.lineTo(-2 * s, -10 * s);
    ctx.moveTo(5 * s, -10 * s);
    ctx.lineTo(7 * s, -16 * s);
    ctx.lineTo(2 * s, -10 * s);
    ctx.fill();
    face(-3 * s, 2.4 * s);
  }
}

/**
 * Backdrop that marks anything sitting on it as a collectible: bloom, bright
 * disc, hard ring, and four notches. Drawn behind the power-up icon so the
 * token reads the same whether the icon is baked art or a drawn glyph.
 */
export function drawPickupToken(ctx: CanvasRenderingContext2D, radius: number, style: PickupStyle): void {
  const r = radius;
  ctx.save();

  glowAura(ctx, style.glow, r * 0.9);
  ctx.fillStyle = style.glow;
  ctx.globalAlpha = 0.3;
  ctx.beginPath();
  ctx.arc(0, 0, r * 0.9, 0, Math.PI * 2);
  ctx.fill();
  ctx.globalAlpha = 1;
  clearGlow(ctx);

  const disc = ctx.createRadialGradient(0, -r * 0.15, r * 0.1, 0, 0, r * 0.9);
  disc.addColorStop(0, style.core);
  disc.addColorStop(0.55, style.glow);
  disc.addColorStop(1, 'rgba(255, 255, 255, 0)');
  ctx.globalAlpha = 0.62;
  ctx.fillStyle = disc;
  ctx.beginPath();
  ctx.arc(0, 0, r * 0.9, 0, Math.PI * 2);
  ctx.fill();
  ctx.globalAlpha = 1;

  ctx.strokeStyle = LINE_DARK;
  ctx.globalAlpha = 0.45;
  ctx.lineWidth = r * 0.2;
  ctx.beginPath();
  ctx.arc(0, 0, r * 0.76, 0, Math.PI * 2);
  ctx.stroke();
  ctx.globalAlpha = 1;

  glowAura(ctx, style.ring, r * 0.5);
  ctx.strokeStyle = style.ring;
  ctx.lineWidth = r * 0.13;
  ctx.beginPath();
  ctx.arc(0, 0, r * 0.76, 0, Math.PI * 2);
  ctx.stroke();
  clearGlow(ctx);

  ctx.strokeStyle = style.core;
  ctx.globalAlpha = 0.85;
  ctx.lineWidth = Math.max(0.8, r * 0.05);
  ctx.beginPath();
  ctx.arc(0, 0, r * 0.66, 0, Math.PI * 2);
  ctx.stroke();
  ctx.globalAlpha = 1;

  // Notches on the compass points read as "grab this".
  glowAura(ctx, style.ring, r * 0.4);
  for (let i = 0; i < 4; i++) {
    const a = (Math.PI / 2) * i;
    const cx = Math.cos(a) * r * 0.9;
    const cy = Math.sin(a) * r * 0.9;
    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate(a + Math.PI / 4);
    ctx.fillStyle = style.ring;
    ctx.fillRect(-r * 0.11, -r * 0.11, r * 0.22, r * 0.22);
    ctx.fillStyle = style.core;
    ctx.fillRect(-r * 0.05, -r * 0.05, r * 0.1, r * 0.1);
    ctx.restore();
  }
  clearGlow(ctx);
  ctx.restore();
}

export function drawPickup(ctx: CanvasRenderingContext2D, type: PUT): void {
  ctx.save();
  strokeStyle(ctx, 1);
  if (type === PowerUpType.CLOVER) {
    ctx.fillStyle = '#3ad46a';
    glowAura(ctx, '#3ad46a', 8);
    for (let i = 0; i < 4; i++) {
      ctx.beginPath();
      ctx.ellipse(Math.cos((i * Math.PI) / 2) * 4.2, Math.sin((i * Math.PI) / 2) * 4.2 - 1, 4.4, 3.2, (i * Math.PI) / 2, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
    }
  } else if (type === PowerUpType.MAGNET) {
    ctx.strokeStyle = '#3df0ff';
    ctx.lineWidth = 4;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.arc(0, 1, 7, 0.2, Math.PI - 0.2);
    ctx.stroke();
    ctx.fillStyle = '#ff5a7a';
    ctx.fillRect(-8.5, -2, 4, 6);
    ctx.fillRect(4.5, -2, 4, 6);
    strokeStyle(ctx, 0.8);
    ctx.strokeRect(-8.5, -2, 4, 6);
    ctx.strokeRect(4.5, -2, 4, 6);
  } else if (type === PowerUpType.DOUBLE) {
    ctx.fillStyle = '#ff8a4a';
    ctx.beginPath();
    ctx.ellipse(0, -2, 9, 6, 0, Math.PI, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = '#f0d8a8';
    ctx.fillRect(-2.4, -1, 4.8, 8);
  } else if (type === PowerUpType.RUSH) {
    ctx.fillStyle = '#ffe08a';
    glowAura(ctx, '#ffe08a', 8);
    for (let i = 0; i < 6; i++) {
      const a = (i * Math.PI) / 3;
      ctx.beginPath();
      ctx.ellipse(Math.cos(a) * 5, Math.sin(a) * 5, 4.2, 2.2, a, 0, Math.PI * 2);
      ctx.fill();
    }
  } else if (type === PowerUpType.FREEZE) {
    ctx.strokeStyle = '#9ee8ff';
    ctx.lineWidth = 2.2;
    for (let i = 0; i < 6; i++) {
      const a = (i * Math.PI) / 3;
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.lineTo(Math.cos(a) * 9, Math.sin(a) * 9);
      ctx.stroke();
    }
    blob(ctx, 0, 0, 2.4, '#e8fbff', 0.6);
  } else if (type === PowerUpType.BLAST) {
    sparkle(ctx, 0, 0, 10, '#ff7ad9');
    blob(ctx, 0, 0, 3.2, '#fff', 0.5);
  } else {
    ctx.fillStyle = '#ff6b8a';
    glowAura(ctx, '#ff6b8a', 8);
    ctx.beginPath();
    ctx.moveTo(0, 7);
    ctx.bezierCurveTo(-10, 0, -6, -8, 0, -3);
    ctx.bezierCurveTo(6, -8, 10, 0, 0, 7);
    ctx.fill();
    strokeStyle(ctx, 1);
    ctx.stroke();
  }
  ctx.restore();
}

export function drawFoe(ctx: CanvasRenderingContext2D, type: ET, radius: number, age: number): void {
  const art = FOE_ART[type];
  const glow = art.fill;
  const trim = art.accent;
  const r = radius;
  ctx.save();
  ctx.rotate(Math.sin(age * 3.2) * 0.06);
  glowAura(ctx, glow, 12);
  ctx.fillStyle = 'rgba(255, 246, 224, 0.16)';
  ctx.beginPath();
  ctx.ellipse(0, r * 0.72, r * 0.42, r * 0.12, 0, 0, Math.PI * 2);
  ctx.fill();
  if (type === EnemyType.CRYSTAL_GOLEM || type === EnemyType.DRONE) {
    ctx.fillStyle = glow;
    ctx.beginPath();
    ctx.moveTo(0, -r * 0.95);
    ctx.lineTo(r * 0.78, -r * 0.1);
    ctx.lineTo(r * 0.42, r * 0.85);
    ctx.lineTo(-r * 0.42, r * 0.85);
    ctx.lineTo(-r * 0.78, -r * 0.1);
    ctx.closePath();
    ctx.fill();
    strokeStyle(ctx, r / 13);
    ctx.stroke();
  } else {
    oval(ctx, 0, 0, r * 0.92, r * 0.88, glow, r / 13);
  }
  clearGlow(ctx);
  drawHeadFeature(ctx, type, r, trim, glow);
  ctx.restore();
}

function drawHeadFeature(ctx: CanvasRenderingContext2D, type: ET, r: number, trim: string, glow: string): void {
  if (type === EnemyType.MAGE || type === EnemyType.ELITE) {
    oval(ctx, 0, -r * 0.06, r * 0.42, r * 0.48, trim, r / 16);
    shineEye(ctx, -r * 0.08, -r * 0.1, r / 8);
    if (type === EnemyType.ELITE) {
      ctx.strokeStyle = trim;
      ctx.lineWidth = Math.max(1.2, r / 14);
      for (const a of [-0.9, -0.3, 0.3, 0.9]) {
        ctx.beginPath();
        ctx.moveTo(Math.cos(a + Math.PI * 0.5) * r * 0.7, Math.sin(a + Math.PI * 0.5) * r * 0.55 + r * 0.2);
        ctx.quadraticCurveTo(Math.cos(a) * r * 1.05, r * 0.95, Math.cos(a) * r * 0.55, r * 1.05);
        ctx.stroke();
      }
    }
    return;
  }
  if (type === EnemyType.VOID_BAT) {
    shineEye(ctx, -r * 0.28, -r * 0.12, r / 10);
    shineEye(ctx, r * 0.08, -r * 0.22, r / 8);
    shineEye(ctx, r * 0.32, r * 0.06, r / 12);
    ctx.fillStyle = trim;
    ctx.beginPath();
    ctx.moveTo(-r * 0.22, -r * 0.72);
    ctx.lineTo(-r * 0.12, -r * 1.05);
    ctx.lineTo(-r * 0.02, -r * 0.7);
    ctx.moveTo(r * 0.18, -r * 0.7);
    ctx.lineTo(r * 0.28, -r * 1.02);
    ctx.lineTo(r * 0.38, -r * 0.68);
    ctx.fill();
    return;
  }
  pairEyes(ctx, -r * 0.12, r * 0.28, r / 11);
  if (type === EnemyType.SCOUT || type === EnemyType.FLYER) {
    ctx.fillStyle = trim;
    ctx.beginPath();
    ctx.moveTo(0, r * 0.12);
    ctx.lineTo(r * 0.22, r * 0.42);
    ctx.lineTo(0, r * 0.82);
    ctx.lineTo(-r * 0.22, r * 0.42);
    ctx.closePath();
    ctx.fill();
    if (type === EnemyType.FLYER) {
      oval(ctx, -r * 0.82, -r * 0.05, r * 0.28, r * 0.16, trim, r / 18, -0.35);
      oval(ctx, r * 0.82, -r * 0.05, r * 0.28, r * 0.16, trim, r / 18, 0.35);
    }
  } else if (type === EnemyType.KAMIKAZE || type === EnemyType.ZIGZAG || type === EnemyType.LOOT_CRATE) {
    smile(ctx, r * 0.28, r * 0.32, r / 10);
    sparkle(ctx, r * 0.55, -r * 0.45, r * 0.2, trim);
    sparkle(ctx, -r * 0.5, r * 0.2, r * 0.16, glow);
  } else if (type === EnemyType.FROST_GOBLIN) {
    ctx.fillStyle = trim;
    ctx.beginPath();
    ctx.moveTo(-r * 0.16, r * 0.22);
    ctx.lineTo(-r * 0.08, r * 0.72);
    ctx.lineTo(0, r * 0.2);
    ctx.moveTo(r * 0.16, r * 0.22);
    ctx.lineTo(r * 0.08, r * 0.72);
    ctx.lineTo(0, r * 0.2);
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(-r * 0.32, -r * 0.55);
    ctx.lineTo(-r * 0.22, -r * 1.02);
    ctx.lineTo(-r * 0.08, -r * 0.52);
    ctx.moveTo(r * 0.32, -r * 0.55);
    ctx.lineTo(r * 0.22, -r * 1.02);
    ctx.lineTo(r * 0.08, -r * 0.52);
    ctx.fill();
  } else if (type === EnemyType.SPORE) {
    ctx.fillStyle = trim;
    for (const a of [-0.7, -0.25, 0.25, 0.7]) {
      ctx.beginPath();
      ctx.moveTo(Math.sin(a) * r * 0.35, -r * 0.55);
      ctx.lineTo(Math.sin(a) * r * 0.55, -r * 1.05);
      ctx.lineTo(Math.sin(a) * r * 0.15 + r * 0.08, -r * 0.52);
      ctx.fill();
    }
    blob(ctx, -r * 0.35, r * 0.7, r * 0.12, glow, r / 20);
    blob(ctx, r * 0.3, r * 0.66, r * 0.1, glow, r / 20);
  } else if (type === EnemyType.CRAWLER) {
    blob(ctx, -r * 0.55, r * 0.55, r * 0.16, trim, r / 18);
    blob(ctx, r * 0.42, r * 0.62, r * 0.14, trim, r / 18);
    blob(ctx, 0, r * 0.78, r * 0.12, trim, r / 18);
  } else if (type === EnemyType.TANK || type === EnemyType.MINI_BOSS) {
    ctx.fillStyle = trim;
    ctx.beginPath();
    ctx.moveTo(-r * 0.35, -r * 0.55);
    ctx.lineTo(-r * 0.18, -r * 1.0);
    ctx.lineTo(-r * 0.02, -r * 0.52);
    ctx.moveTo(r * 0.35, -r * 0.55);
    ctx.lineTo(r * 0.18, -r * 1.0);
    ctx.lineTo(r * 0.02, -r * 0.52);
    ctx.fill();
    if (type === EnemyType.MINI_BOSS) {
      ctx.beginPath();
      ctx.moveTo(-r * 0.55, -r * 0.62);
      ctx.lineTo(0, -r * 1.15);
      ctx.lineTo(r * 0.55, -r * 0.62);
      ctx.closePath();
      ctx.fill();
    }
    smile(ctx, r * 0.3, r * 0.24, r / 12);
  } else if (type === EnemyType.BOMBER) {
    ctx.fillStyle = trim;
    ctx.fillRect(-r * 0.06, -r * 1.05, r * 0.12, r * 0.35);
    sparkle(ctx, 0, -r * 1.12, r * 0.2, '#ffe08a');
    smile(ctx, r * 0.26, r * 0.22, r / 12);
  } else if (type === EnemyType.WISP_FOE) {
    sparkle(ctx, 0, -r * 1.05, r * 0.28, trim);
    blob(ctx, 0, -r * 0.85, r * 0.14, '#ffe08a', r / 18);
  } else if (type === EnemyType.AETHER_TICK) {
    ctx.strokeStyle = trim;
    ctx.lineWidth = Math.max(1.1, r / 16);
    ctx.beginPath();
    ctx.moveTo(-r * 0.55, -r * 0.15);
    ctx.lineTo(-r * 0.95, -r * 0.45);
    ctx.moveTo(r * 0.55, -r * 0.15);
    ctx.lineTo(r * 0.95, -r * 0.45);
    ctx.stroke();
  } else if (type === EnemyType.BONE_WISP) {
    shineEye(ctx, r * 0.22, -r * 0.1, r / 14);
    smile(ctx, r * 0.22, r * 0.16, r / 14);
  } else if (type === EnemyType.SWARM) {
    blob(ctx, -r * 0.35, r * 0.35, r * 0.18, trim, r / 18);
    blob(ctx, r * 0.32, r * 0.38, r * 0.16, trim, r / 18);
  } else {
    sparkle(ctx, r * 0.48, -r * 0.4, r * 0.18, trim);
  }
}

export function drawBossShape(ctx: CanvasRenderingContext2D, kind: BK, radius: number, age: number): void {
  const glow = ELEMENT_COLOR[BOSS_META[kind].element];
  const r = radius;
  ctx.save();
  glowAura(ctx, glow, 18);
  if (kind === BossKind.IRON_HYDRA) {
    oval(ctx, 0, r * 0.25, r * 0.7, r * 0.55, glow, r / 28);
    for (const [x, y, rot] of [
      [-r * 0.55, -r * 0.15, -0.4],
      [0, -r * 0.35, 0],
      [r * 0.55, -r * 0.15, 0.4],
    ] as const) {
      ctx.save();
      ctx.translate(x, y);
      ctx.rotate(rot + Math.sin(age * 3 + x) * 0.08);
      oval(ctx, 0, -r * 0.35, r * 0.28, r * 0.42, glow, r / 30);
      pairEyes(ctx, -r * 0.4, r * 0.1, r / 30);
      ctx.restore();
    }
  } else if (kind === BossKind.EMBER_QUEEN) {
    oval(ctx, 0, r * 0.2, r * 0.75, r * 0.7, glow, r / 26);
    ctx.fillStyle = '#ffe08a';
    for (let i = -2; i <= 2; i++) {
      ctx.beginPath();
      ctx.moveTo(i * r * 0.22, -r * 0.35);
      ctx.lineTo(i * r * 0.22 + r * 0.08, -r * 0.85);
      ctx.lineTo(i * r * 0.22 + r * 0.16, -r * 0.35);
      ctx.fill();
    }
    pairEyes(ctx, -r * 0.05, r * 0.22, r / 22);
    smile(ctx, r * 0.18, r * 0.16, r / 24);
  } else if (kind === BossKind.VOID_BEHEMOTH) {
    oval(ctx, 0, r * 0.1, r * 0.95, r * 0.8, glow, r / 24);
    ctx.fillStyle = LINE_DARK;
    ctx.beginPath();
    ctx.moveTo(-r * 0.55, -r * 0.35);
    ctx.lineTo(-r * 0.75, -r * 0.95);
    ctx.lineTo(-r * 0.25, -r * 0.4);
    ctx.moveTo(r * 0.55, -r * 0.35);
    ctx.lineTo(r * 0.75, -r * 0.95);
    ctx.lineTo(r * 0.25, -r * 0.4);
    ctx.fill();
    pairEyes(ctx, -r * 0.05, r * 0.28, r / 18);
  } else if (kind === BossKind.FROST_TITAN) {
    ctx.fillStyle = glow;
    ctx.beginPath();
    ctx.moveTo(0, -r);
    ctx.lineTo(r * 0.85, -r * 0.1);
    ctx.lineTo(r * 0.55, r * 0.85);
    ctx.lineTo(-r * 0.55, r * 0.85);
    ctx.lineTo(-r * 0.85, -r * 0.1);
    ctx.closePath();
    ctx.fill();
    strokeStyle(ctx, r / 26);
    ctx.stroke();
    pairEyes(ctx, -r * 0.15, r * 0.22, r / 20);
  } else if (kind === BossKind.SHADOW_SERPENT) {
    for (let i = 0; i < 5; i++) {
      const t = i / 4;
      oval(ctx, Math.sin(age + i) * r * 0.2, r * 0.55 - t * r * 1.1, r * (0.28 + t * 0.2), r * (0.22 + t * 0.12), glow, r / 32);
    }
    pairEyes(ctx, -r * 0.55, r * 0.16, r / 22);
  } else if (kind === BossKind.STORM_COLOSSUS) {
    oval(ctx, 0, -r * 0.15, r * 0.95, r * 0.55, '#e8f0ff', r / 26);
    oval(ctx, -r * 0.35, r * 0.25, r * 0.35, r * 0.55, glow, r / 28);
    oval(ctx, r * 0.35, r * 0.25, r * 0.35, r * 0.55, glow, r / 28);
    pairEyes(ctx, -r * 0.2, r * 0.28, r / 20);
    ctx.strokeStyle = '#ffe08a';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(r * 0.6, -r * 0.1);
    ctx.lineTo(r * 0.85, r * 0.35);
    ctx.lineTo(r * 0.55, r * 0.2);
    ctx.stroke();
  } else if (kind === BossKind.CRYSTAL_WARDEN) {
    ctx.fillStyle = glow;
    ctx.beginPath();
    ctx.moveTo(0, -r);
    ctx.lineTo(r * 0.75, 0);
    ctx.lineTo(r * 0.35, r);
    ctx.lineTo(-r * 0.35, r);
    ctx.lineTo(-r * 0.75, 0);
    ctx.closePath();
    ctx.fill();
    strokeStyle(ctx, r / 24);
    ctx.stroke();
    pairEyes(ctx, -r * 0.1, r * 0.2, r / 20);
  } else if (kind === BossKind.DAWN_SPHINX) {
    oval(ctx, 0, r * 0.2, r * 0.95, r * 0.5, glow, r / 26);
    oval(ctx, -r * 0.15, -r * 0.35, r * 0.45, r * 0.42, glow, r / 28);
    wingPair(ctx, 0, r * 0.7, r * 0.45, r * 0.7, 0.5, '#fff3c4', glow, r / 30);
    pairEyes(ctx, -r * 0.4, r * 0.16, r / 24);
  } else if (kind === BossKind.RUIN_KNIGHT) {
    oval(ctx, 0, r * 0.2, r * 0.7, r * 0.7, glow, r / 26);
    ctx.fillStyle = '#d4b06a';
    ctx.beginPath();
    ctx.moveTo(-r * 0.55, -r * 0.15);
    ctx.lineTo(-r * 0.4, -r * 0.85);
    ctx.lineTo(0, -r * 0.45);
    ctx.lineTo(r * 0.4, -r * 0.85);
    ctx.lineTo(r * 0.55, -r * 0.15);
    ctx.closePath();
    ctx.fill();
    strokeStyle(ctx, r / 26);
    ctx.stroke();
    pairEyes(ctx, 0, r * 0.2, r / 20);
  } else {
    for (let i = 0; i < 4; i++) {
      oval(ctx, Math.sin(age * 1.4 + i) * r * 0.15, r * 0.45 - i * r * 0.32, r * (0.55 - i * 0.08), r * 0.22, glow, r / 30);
    }
    oval(ctx, 0, -r * 0.55, r * 0.38, r * 0.32, glow, r / 28);
    pairEyes(ctx, -r * 0.58, r * 0.14, r / 24);
  }
  ctx.restore();
}

export function drawEggIcon(ctx: CanvasRenderingContext2D, color: string, shake = 0, size = 16): void {
  const s = size / 16;
  ctx.save();
  ctx.rotate(Math.sin(shake * 18) * 0.12);
  glowAura(ctx, color, 10);
  oval(ctx, 0, 0, 10 * s, 14 * s, color, s);
  clearGlow(ctx);
  ctx.fillStyle = 'rgba(255,255,255,0.45)';
  ctx.beginPath();
  ctx.ellipse(-3 * s, -4 * s, 3 * s, 5 * s, -0.4, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = LINE;
  ctx.globalAlpha = 0.25;
  blob(ctx, 3 * s, 3 * s, 1.6 * s, LINE, 0.3);
  blob(ctx, -2 * s, 6 * s, 1.2 * s, LINE, 0.3);
  ctx.restore();
}

function goldHairline(ctx: CanvasRenderingContext2D, r = 8.4, stroke = 'rgba(255, 210, 74, 0.55)'): void {
  ctx.save();
  clearGlow(ctx);
  ctx.strokeStyle = stroke;
  ctx.lineWidth = 0.75;
  ctx.beginPath();
  ctx.ellipse(0, 0, r, r * 0.9, 0, 0, Math.PI * 2);
  ctx.stroke();
  ctx.restore();
}

export function drawPlayerShot(ctx: CanvasRenderingContext2D, kind: 'laser' | 'cannon' | 'plasma', glow: string): void {
  ctx.save();
  glowAura(ctx, glow, 16);
  if (kind === 'cannon') {
    ctx.fillStyle = glow;
    ctx.beginPath();
    ctx.moveTo(0, -9);
    ctx.quadraticCurveTo(5.2, -1, 3.4, 7);
    ctx.quadraticCurveTo(0, 5.2, -3.4, 7);
    ctx.quadraticCurveTo(-5.2, -1, 0, -9);
    ctx.fill();
    strokeStyle(ctx, 0.45);
    ctx.stroke();
    blob(ctx, 0, 0.6, 2.8, '#fff4c8', 0.35);
    sparkle(ctx, 0, -6.2, 3.4, '#fff8e0');
    sparkle(ctx, 4.2, 2.4, 2.1, glow);
    sparkle(ctx, -4.2, 2.4, 2.1, glow);
  } else if (kind === 'plasma') {
    oval(ctx, 0, 0, 6.4, 6.4, glow, 0.55);
    blob(ctx, -0.6, -0.8, 2.8, '#fff8ff', 0.3);
    clearGlow(ctx);
    ctx.strokeStyle = '#fffef8';
    ctx.globalAlpha = 0.7;
    ctx.lineWidth = 1.15;
    ctx.beginPath();
    ctx.ellipse(0, 0, 8.2, 5.4, -0.4, 0, Math.PI * 2);
    ctx.stroke();
    ctx.globalAlpha = 1;
    sparkle(ctx, 5.6, -4.2, 2.6, '#fff');
    sparkle(ctx, -5.2, 3.8, 2.1, glow);
  } else {
    ctx.fillStyle = glow;
    ctx.beginPath();
    ctx.moveTo(0, -9.5);
    ctx.lineTo(2.6, -1.2);
    ctx.quadraticCurveTo(3.8, 2.4, 0, 8.4);
    ctx.quadraticCurveTo(-3.8, 2.4, -2.6, -1.2);
    ctx.closePath();
    ctx.fill();
    strokeStyle(ctx, 0.45);
    ctx.stroke();
    ctx.fillStyle = '#fffef8';
    ctx.beginPath();
    ctx.moveTo(0, -6.4);
    ctx.quadraticCurveTo(1.4, 0, 0, 5);
    ctx.quadraticCurveTo(-1.4, 0, 0, -6.4);
    ctx.fill();
    sparkle(ctx, 0, -8.2, 2.8, '#fff');
    sparkle(ctx, 3.6, 1.6, 1.8, glow);
    sparkle(ctx, -3.6, 1.6, 1.8, glow);
  }
  goldHairline(ctx, kind === 'plasma' ? 8.6 : 7.4, 'rgba(255, 248, 238, 0.5)');
  ctx.restore();
}

/**
 * Palette for each element's spell shot. Spells are baked in their own colours
 * rather than tinted flat at runtime, because an anime elemental read depends on
 * having several hues at once -- a white-hot heart, a saturated body, a pale rim.
 */
interface ShotPaintSet {
  core: string;
  body: string;
  rim: string;
  deep: string;
}

/** `rgba()` string from a `#rrggbb`, for gradients that need a variable alpha. */
function fade(hex: string, alpha: number): string {
  const h = hex.slice(1);
  const n = Number.parseInt(h, 16);
  return `rgba(${(n >> 16) & 255}, ${(n >> 8) & 255}, ${n & 255}, ${alpha})`;
}

const SPELL_PAINT: Record<El, ShotPaintSet> = {
  [ElementId.FIRE]: { core: '#fff8e2', body: '#ff7a2e', rim: '#ffd166', deep: '#c1301a' },
  [ElementId.WATER]: { core: '#f4ffff', body: '#4fd2ff', rim: '#bdf3ff', deep: '#1c6f9e' },
  [ElementId.NATURE]: { core: '#f8ffe6', body: '#5fd97a', rim: '#c6ff9e', deep: '#277a42' },
  [ElementId.SHADOW]: { core: '#ece2ff', body: '#8264ff', rim: '#c3a8ff', deep: '#30215e' },
  [ElementId.LIGHT]: { core: '#ffffff', body: '#ffce4a', rim: '#fff3b8', deep: '#d2911a' },
  [ElementId.ARCANE]: { core: '#fff2fb', body: '#ff5ec2', rim: '#ffb0e6', deep: '#96206f' },
};

/** True for spells whose shape has no front, so they should spin rather than aim. */
export function spellSpins(element: El): boolean {
  return element === ElementId.NATURE || element === ElementId.ARCANE;
}

/** Unstroked disc. The shared blob() helper always inks a dark rim, which on a
 *  shot this small reads as a hole punched through the middle. */
function disc(ctx: CanvasRenderingContext2D, x: number, y: number, r: number, fill: string): void {
  ctx.fillStyle = fill;
  ctx.beginPath();
  ctx.arc(x, y, r, 0, Math.PI * 2);
  ctx.fill();
}

export function spellColor(element: El): string {
  return SPELL_PAINT[element].body;
}

/**
 * A companion's shot, drawn from its element rather than from a weapon type: a
 * fireball, a frost lance, a leaf blade, a shadow fang, a light star, a rune
 * sigil. All are drawn nose-up so the caller can rotate them onto their heading.
 */
export function drawElementShot(ctx: CanvasRenderingContext2D, element: El): void {
  const p = SPELL_PAINT[element];
  ctx.save();
  glowAura(ctx, p.body, 18);
  if (element === ElementId.FIRE) {
    // Comet: a rounded head with flame licking off the back.
    ctx.fillStyle = p.deep;
    ctx.beginPath();
    ctx.moveTo(-4.4, 0);
    ctx.quadraticCurveTo(-3.4, 9, 0, 14);
    ctx.quadraticCurveTo(3.4, 9, 4.4, 0);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = p.body;
    ctx.beginPath();
    ctx.moveTo(0, -11);
    ctx.quadraticCurveTo(6.4, -4.4, 5.2, 3.4);
    ctx.quadraticCurveTo(2.6, 10.4, 0, 6.2);
    ctx.quadraticCurveTo(-2.6, 10.4, -5.2, 3.4);
    ctx.quadraticCurveTo(-6.4, -4.4, 0, -11);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = p.rim;
    ctx.beginPath();
    ctx.moveTo(0, -8.4);
    ctx.quadraticCurveTo(3.8, -3, 3, 2.6);
    ctx.quadraticCurveTo(1.4, 6.6, 0, 4);
    ctx.quadraticCurveTo(-1.4, 6.6, -3, 2.6);
    ctx.quadraticCurveTo(-3.8, -3, 0, -8.4);
    ctx.fill();
    disc(ctx, 0, -3.6, 2.9, p.core);
    sparkle(ctx, 0, -10.4, 3.2, p.core);
  } else if (element === ElementId.WATER) {
    // Frost lance: a faceted spike with a shaded right flank.
    ctx.fillStyle = p.body;
    ctx.beginPath();
    ctx.moveTo(0, -12.5);
    ctx.lineTo(4.4, -2.6);
    ctx.lineTo(2.6, 8.6);
    ctx.lineTo(-2.6, 8.6);
    ctx.lineTo(-4.4, -2.6);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = p.deep;
    ctx.beginPath();
    ctx.moveTo(0, -12.5);
    ctx.lineTo(4.4, -2.6);
    ctx.lineTo(2.6, 8.6);
    ctx.lineTo(0, 6);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = p.rim;
    ctx.beginPath();
    ctx.moveTo(0, -10.6);
    ctx.lineTo(-2.4, -2.2);
    ctx.lineTo(-1.2, 5.4);
    ctx.lineTo(0, 3.2);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = p.core;
    ctx.beginPath();
    ctx.moveTo(0, -11.4);
    ctx.lineTo(1, -3);
    ctx.lineTo(0, 1.4);
    ctx.lineTo(-1, -3);
    ctx.closePath();
    ctx.fill();
    // Splinters riding alongside the lance.
    ctx.fillStyle = p.rim;
    for (const [x, y, s] of [
      [6.6, 2.4, 1],
      [-6.4, 4.6, 0.82],
      [5.4, -5.4, 0.7],
    ] as const) {
      ctx.beginPath();
      ctx.moveTo(x, y - 3.4 * s);
      ctx.lineTo(x + 1.5 * s, y);
      ctx.lineTo(x, y + 3.4 * s);
      ctx.lineTo(x - 1.5 * s, y);
      ctx.closePath();
      ctx.fill();
    }
    sparkle(ctx, 0, -11.6, 3, p.core);
  } else if (element === ElementId.NATURE) {
    // Leaf blade: three petals on a seed, spun by the caller.
    for (let i = 0; i < 3; i++) {
      ctx.save();
      ctx.rotate((Math.PI * 2 * i) / 3);
      ctx.fillStyle = p.body;
      ctx.beginPath();
      ctx.moveTo(0, -1.6);
      ctx.quadraticCurveTo(5.6, -5.2, 0, -11.6);
      ctx.quadraticCurveTo(-5.6, -5.2, 0, -1.6);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = p.rim;
      ctx.beginPath();
      ctx.moveTo(0, -2.6);
      ctx.quadraticCurveTo(2.8, -5.6, 0, -10);
      ctx.quadraticCurveTo(-0.5, -5.6, 0, -2.6);
      ctx.fill();
      ctx.strokeStyle = p.deep;
      ctx.lineWidth = 0.7;
      ctx.beginPath();
      ctx.moveTo(0, -3);
      ctx.lineTo(0, -10.4);
      ctx.stroke();
      ctx.restore();
    }
    disc(ctx, 0, 0, 3.4, p.core);
    disc(ctx, 0, 0, 1.8, p.body);
  } else if (element === ElementId.SHADOW) {
    // Scythe: two hooked wings sweeping back off a void heart. Drawn as separate
    // halves with a gap down the middle, so the crescent stays open.
    for (const dir of [-1, 1] as const) {
      ctx.save();
      ctx.scale(dir, 1);
      ctx.fillStyle = p.body;
      ctx.beginPath();
      ctx.moveTo(0.9, -12);
      ctx.quadraticCurveTo(8.8, -4.6, 7.2, 9);
      ctx.quadraticCurveTo(4.6, 1.4, 0.9, -1.6);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = p.rim;
      ctx.beginPath();
      ctx.moveTo(1.4, -10.6);
      ctx.quadraticCurveTo(6.4, -4.4, 5.6, 4.4);
      ctx.quadraticCurveTo(4.4, 0.2, 1.4, -2.2);
      ctx.closePath();
      ctx.fill();
      ctx.restore();
    }
    ctx.fillStyle = p.deep;
    ctx.beginPath();
    ctx.moveTo(0, -9.6);
    ctx.quadraticCurveTo(3.4, -2.6, 0, 7.4);
    ctx.quadraticCurveTo(-3.4, -2.6, 0, -9.6);
    ctx.closePath();
    ctx.fill();
    disc(ctx, 0, -1.6, 2.5, p.core);
    disc(ctx, 0, -1.6, 1.1, p.deep);
  } else if (element === ElementId.LIGHT) {
    // Star lance: a long vertical flare crossed by a short one.
    ctx.fillStyle = p.body;
    ctx.beginPath();
    ctx.moveTo(0, -13.5);
    ctx.quadraticCurveTo(1.9, -2.6, 6.4, 0);
    ctx.quadraticCurveTo(1.9, 2.6, 0, 11.5);
    ctx.quadraticCurveTo(-1.9, 2.6, -6.4, 0);
    ctx.quadraticCurveTo(-1.9, -2.6, 0, -13.5);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = p.rim;
    ctx.beginPath();
    ctx.moveTo(0, -10.4);
    ctx.quadraticCurveTo(1.1, -1.8, 3.6, 0);
    ctx.quadraticCurveTo(1.1, 1.8, 0, 8);
    ctx.quadraticCurveTo(-1.1, 1.8, -3.6, 0);
    ctx.quadraticCurveTo(-1.1, -1.8, 0, -10.4);
    ctx.closePath();
    ctx.fill();
    disc(ctx, 0, 0, 2.6, p.core);
    sparkle(ctx, 0, -12, 3.4, p.core);
  } else {
    // Rune sigil: a bound orb inside a spinning glyph ring. The glyph is inked
    // heavily on purpose -- at gameplay size thin lines wash out to a plain donut.
    ctx.strokeStyle = p.body;
    ctx.lineWidth = 2.2;
    ctx.beginPath();
    ctx.arc(0, 0, 9.4, 0, Math.PI * 2);
    ctx.stroke();
    ctx.strokeStyle = p.rim;
    ctx.lineWidth = 1.9;
    ctx.lineJoin = 'round';
    for (let flip = 0; flip < 2; flip++) {
      ctx.beginPath();
      for (let i = 0; i < 3; i++) {
        const a = (Math.PI * 2 * i) / 3 - Math.PI / 2 + flip * Math.PI;
        const px = Math.cos(a) * 8.6;
        const py = Math.sin(a) * 8.6;
        if (i === 0) ctx.moveTo(px, py);
        else ctx.lineTo(px, py);
      }
      ctx.closePath();
      ctx.stroke();
    }
    ctx.fillStyle = p.core;
    for (let i = 0; i < 3; i++) {
      const a = (Math.PI * 2 * i) / 3 + Math.PI / 6;
      ctx.beginPath();
      ctx.arc(Math.cos(a) * 9.4, Math.sin(a) * 9.4, 1.9, 0, Math.PI * 2);
      ctx.fill();
    }
    disc(ctx, 0, 0, 4.2, p.deep);
    disc(ctx, 0, 0, 2.8, p.core);
  }
  ctx.restore();
}

/**
 * The cushion of lift under a hovering body. Companion art is drawn as grounded
 * creatures with their feet planted, so they need something under them that
 * reads as held up by magic rather than resting on a floor. Baked in whites for
 * the caller to tint.
 */
export function drawHoverLift(ctx: CanvasRenderingContext2D, span: number): void {
  const s = span;
  ctx.save();
  const g = ctx.createRadialGradient(0, 0, 0, 0, 0, s * 0.5);
  g.addColorStop(0, 'rgba(255, 255, 255, 0.62)');
  g.addColorStop(0.45, 'rgba(255, 255, 255, 0.26)');
  g.addColorStop(1, 'rgba(255, 255, 255, 0)');
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.ellipse(0, 0, s * 0.5, s * 0.2, 0, 0, Math.PI * 2);
  ctx.fill();
  // Two thin arcs curling off the sides, so it moves rather than just sitting.
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.42)';
  ctx.lineWidth = Math.max(1, s * 0.018);
  ctx.lineCap = 'round';
  for (const dir of [-1, 1] as const) {
    ctx.beginPath();
    ctx.moveTo(dir * s * 0.12, s * 0.04);
    ctx.quadraticCurveTo(dir * s * 0.36, s * 0.1, dir * s * 0.46, -s * 0.06);
    ctx.stroke();
  }
  ctx.restore();
}

/**
 * The smear a fast-beating pair of wings leaves behind a flyer. Baked in whites
 * so SpriteSync can tint it to the flyer's own wings, and drawn at full span so
 * squashing it vertically per frame reads as the stroke itself. This sits behind
 * the painted wings on the character art rather than replacing them: real
 * animation blurs a fast wing instead of drawing every feather.
 */
export function drawWingBlur(ctx: CanvasRenderingContext2D, span: number): void {
  const s = span;
  ctx.save();
  for (const dir of [-1, 1] as const) {
    const cx = dir * s * 0.25;
    const g = ctx.createRadialGradient(cx, 0, 0, cx, 0, s * 0.3);
    g.addColorStop(0, 'rgba(255, 255, 255, 0.5)');
    g.addColorStop(0.6, 'rgba(255, 255, 255, 0.24)');
    g.addColorStop(1, 'rgba(255, 255, 255, 0)');
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.ellipse(cx, 0, s * 0.3, s * 0.21, dir * -0.34, 0, Math.PI * 2);
    ctx.fill();
    // A faint edge so the smear doesn't dissolve into fog at small sizes.
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.3)';
    ctx.lineWidth = Math.max(1, s * 0.012);
    ctx.beginPath();
    ctx.ellipse(cx, 0, s * 0.28, s * 0.19, dir * -0.34, 0, Math.PI * 2);
    ctx.stroke();
  }
  ctx.restore();
}

/**
 * Each guardian fires her own signature, themed on the element in her title:
 * Aurelia's dawn, Kairo's storms, Nyxara's shadows, Elara's grove, Orion's
 * arcane, Vesper's twilight. Palettes are hand-set rather than lifted from
 * GUARDIAN_COLORS, which is tuned for costume rather than for a 30px shot.
 */
const GUARDIAN_SHOT_PAINT: Record<GID, ShotPaintSet> = {
  [GuardianId.AURELIA]: { core: '#ffffff', body: '#ffc93c', rim: '#fff3c4', deep: '#e8631f' },
  [GuardianId.KAIRO]: { core: '#ffffff', body: '#3df0ff', rim: '#d4f7ff', deep: '#16628c' },
  [GuardianId.NYXARA]: { core: '#f7f0ff', body: '#b45cff', rim: '#dcc4ff', deep: '#3b1f66' },
  [GuardianId.ELARA]: { core: '#f8ffe4', body: '#6ce08a', rim: '#e7ffc8', deep: '#22703f' },
  [GuardianId.ORION]: { core: '#fff2fb', body: '#ff6bcf', rim: '#ffd0f2', deep: '#7a2172' },
  [GuardianId.VESPER]: { core: '#f4efff', body: '#8f7bff', rim: '#ded0ff', deep: '#2a1c52' },
};

/** Nyxara and Vesper share smoke, but their palettes and shapes never collide. */
const GUARDIAN_WAKE: Record<GID, WakeFlavour> = {
  [GuardianId.AURELIA]: 'ray',
  [GuardianId.KAIRO]: 'frost',
  [GuardianId.NYXARA]: 'smoke',
  [GuardianId.ELARA]: 'petal',
  [GuardianId.ORION]: 'rune',
  [GuardianId.VESPER]: 'smoke',
};

/** True for signatures with no front, so they should spin rather than aim. */
export function guardianShotSpins(id: GID): boolean {
  return id === GuardianId.AURELIA || id === GuardianId.ELARA || id === GuardianId.VESPER;
}

export function drawGuardianWake(ctx: CanvasRenderingContext2D, id: GID, length: number): void {
  drawWakeStreak(ctx, length, GUARDIAN_SHOT_PAINT[id], GUARDIAN_WAKE[id]);
}

/** The hero's own projectile, drawn nose-up for the caller to rotate. */
export function drawGuardianShot(ctx: CanvasRenderingContext2D, id: GID): void {
  const p = GUARDIAN_SHOT_PAINT[id];
  ctx.save();
  glowAura(ctx, p.body, 18);
  if (id === GuardianId.AURELIA) {
    // Sunburst: a corona of alternating spikes around a white solar heart.
    ctx.fillStyle = p.deep;
    ctx.beginPath();
    for (let i = 0; i < 12; i++) {
      const a = (Math.PI * 2 * i) / 12;
      const r = i % 2 === 0 ? 12.5 : 7.4;
      const px = Math.cos(a) * r;
      const py = Math.sin(a) * r;
      if (i === 0) ctx.moveTo(px, py);
      else ctx.lineTo(px, py);
    }
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = p.body;
    ctx.beginPath();
    for (let i = 0; i < 12; i++) {
      const a = (Math.PI * 2 * i) / 12 + Math.PI / 12;
      const r = i % 2 === 0 ? 10 : 6.2;
      const px = Math.cos(a) * r;
      const py = Math.sin(a) * r;
      if (i === 0) ctx.moveTo(px, py);
      else ctx.lineTo(px, py);
    }
    ctx.closePath();
    ctx.fill();
    disc(ctx, 0, 0, 5, p.rim);
    disc(ctx, 0, 0, 3.2, p.core);
  } else if (id === GuardianId.KAIRO) {
    // Storm bolt: a hard zigzag with a white filament down the middle.
    const bolt = (s: number) => {
      ctx.beginPath();
      ctx.moveTo(1.1 * s, -12.6 * s);
      ctx.lineTo(-4.4 * s, -1.8 * s);
      ctx.lineTo(-0.5 * s, -1 * s);
      ctx.lineTo(-2.8 * s, 12.4 * s);
      ctx.lineTo(4.6 * s, -0.4 * s);
      ctx.lineTo(0.6 * s, -1.2 * s);
      ctx.lineTo(4.4 * s, -12.2 * s);
      ctx.closePath();
    };
    ctx.fillStyle = p.deep;
    bolt(1.12);
    ctx.fill();
    ctx.fillStyle = p.body;
    bolt(1);
    ctx.fill();
    ctx.fillStyle = p.core;
    bolt(0.52);
    ctx.fill();
    sparkle(ctx, 3.4, -8.4, 2.4, p.rim);
    sparkle(ctx, -3, 6.4, 2, p.rim);
  } else if (id === GuardianId.NYXARA) {
    // Night dagger: a broad blade with hooked quillons. The quillons are inked in
    // the rim colour, not the deep one -- deep violet on a dark sky vanishes.
    ctx.fillStyle = p.rim;
    for (const dir of [-1, 1] as const) {
      ctx.beginPath();
      ctx.moveTo(dir * 2, 1.4);
      ctx.quadraticCurveTo(dir * 8.4, 1.6, dir * 7, 8.2);
      ctx.quadraticCurveTo(dir * 5, 4.4, dir * 2, 4.4);
      ctx.closePath();
      ctx.fill();
    }
    ctx.fillStyle = p.body;
    ctx.beginPath();
    ctx.moveTo(0, -13);
    ctx.quadraticCurveTo(4.6, -5.6, 3.6, 2.8);
    ctx.lineTo(0, 10.4);
    ctx.lineTo(-3.6, 2.8);
    ctx.quadraticCurveTo(-4.6, -5.6, 0, -13);
    ctx.closePath();
    ctx.fill();
    // Fuller down the right flank so the blade has a spine, not a flat wash.
    ctx.fillStyle = p.deep;
    ctx.beginPath();
    ctx.moveTo(0, -11.4);
    ctx.quadraticCurveTo(3.2, -5.2, 2.5, 2.4);
    ctx.lineTo(0, 7.8);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = p.core;
    ctx.beginPath();
    ctx.moveTo(0, -10.6);
    ctx.quadraticCurveTo(-1.6, -5, -1.3, 2.2);
    ctx.lineTo(0, 5.6);
    ctx.closePath();
    ctx.fill();
    sparkle(ctx, 0, -12.4, 2.8, p.core);
  } else if (id === GuardianId.ELARA) {
    // Blossom: five round lobes around a pistil. Deliberately not a pointed
    // shape -- anything tapered with side fins reads as a rocket at this size.
    for (let i = 0; i < 5; i++) {
      ctx.save();
      ctx.rotate((Math.PI * 2 * i) / 5);
      ctx.fillStyle = p.body;
      ctx.beginPath();
      ctx.moveTo(0, -2.4);
      ctx.quadraticCurveTo(-6.2, -6.4, -3.4, -10.4);
      ctx.quadraticCurveTo(0, -13.4, 3.4, -10.4);
      ctx.quadraticCurveTo(6.2, -6.4, 0, -2.4);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = p.rim;
      ctx.beginPath();
      ctx.moveTo(0, -4);
      ctx.quadraticCurveTo(-3.4, -6.6, -1.9, -9.2);
      ctx.quadraticCurveTo(0, -10.9, 1.9, -9.2);
      ctx.quadraticCurveTo(3.4, -6.6, 0, -4);
      ctx.closePath();
      ctx.fill();
      ctx.restore();
    }
    disc(ctx, 0, 0, 3.6, p.deep);
    disc(ctx, 0, 0, 2.4, p.core);
  } else if (id === GuardianId.ORION) {
    // Prism: a tall faceted shard flanked by two smaller ones.
    ctx.fillStyle = p.rim;
    for (const dir of [-1, 1] as const) {
      ctx.beginPath();
      ctx.moveTo(dir * 5.6, -6.6);
      ctx.lineTo(dir * 8.2, 0.4);
      ctx.lineTo(dir * 5.2, 6.2);
      ctx.lineTo(dir * 4.2, 0.4);
      ctx.closePath();
      ctx.fill();
    }
    ctx.fillStyle = p.body;
    ctx.beginPath();
    ctx.moveTo(0, -13.2);
    ctx.lineTo(4.2, -0.6);
    ctx.lineTo(0, 10.4);
    ctx.lineTo(-4.2, -0.6);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = p.deep;
    ctx.beginPath();
    ctx.moveTo(0, -13.2);
    ctx.lineTo(4.2, -0.6);
    ctx.lineTo(0, 10.4);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = p.core;
    ctx.beginPath();
    ctx.moveTo(0, -11);
    ctx.lineTo(-2, -0.6);
    ctx.lineTo(0, 6.6);
    ctx.lineTo(-0.4, -0.6);
    ctx.closePath();
    ctx.fill();
    sparkle(ctx, 0, -12.2, 3.2, p.core);
  } else {
    // Eclipse: a violet crescent biting into a dark disc, with rift flecks.
    disc(ctx, 0, 0, 11, p.body);
    disc(ctx, 2.6, -1.8, 9.2, p.deep);
    ctx.strokeStyle = p.core;
    ctx.lineWidth = 1.6;
    ctx.beginPath();
    ctx.arc(0, 0, 10.2, Math.PI * 0.42, Math.PI * 1.42);
    ctx.stroke();
    ctx.strokeStyle = p.rim;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.arc(2.6, -1.8, 8.6, Math.PI * 1.3, Math.PI * 0.5);
    ctx.stroke();
    sparkle(ctx, 4.6, -5.4, 2.6, p.core);
    sparkle(ctx, 1.4, 5.6, 1.9, p.rim);
  }
  ctx.restore();
}

/**
 * The streak a spell drags behind it, baked base-at-left and tail-at-right like
 * the hazard plumes so SpriteSync can lay it along the reverse of travel.
 */
export function drawSpellWake(ctx: CanvasRenderingContext2D, element: El, length: number): void {
  drawWakeStreak(ctx, length, SPELL_PAINT[element], ELEMENT_WAKE[element]);
}

/** What a trailing streak is made of. Shared by companion and guardian shots. */
type WakeFlavour = 'flame' | 'frost' | 'petal' | 'smoke' | 'ray' | 'rune';

const ELEMENT_WAKE: Record<El, WakeFlavour> = {
  [ElementId.FIRE]: 'flame',
  [ElementId.WATER]: 'frost',
  [ElementId.NATURE]: 'petal',
  [ElementId.SHADOW]: 'smoke',
  [ElementId.LIGHT]: 'ray',
  [ElementId.ARCANE]: 'rune',
};

function drawWakeStreak(
  ctx: CanvasRenderingContext2D,
  length: number,
  p: ShotPaintSet,
  flavour: WakeFlavour,
): void {
  const half = length * 0.5;
  const w = length * 0.115;
  ctx.save();
  // The haze narrows toward the shot as well as toward the tail, so the streak
  // reads as a smear of motion rather than a solid plank bolted to the sprite.
  glowAura(ctx, p.body, length * 0.1);
  ctx.globalAlpha = 0.34;
  ctx.fillStyle = p.body;
  ctx.beginPath();
  ctx.moveTo(-half, 0);
  ctx.quadraticCurveTo(-half * 0.5, -w, half * 0.1, -w * 0.86);
  ctx.quadraticCurveTo(half * 0.6, -w * 0.5, half * 0.86, 0);
  ctx.quadraticCurveTo(half * 0.6, w * 0.5, half * 0.1, w * 0.86);
  ctx.quadraticCurveTo(-half * 0.5, w, -half, 0);
  ctx.closePath();
  ctx.fill();
  clearGlow(ctx);

  if (flavour === 'flame') {
    ctx.globalAlpha = 0.72;
    ctx.fillStyle = p.deep;
    tongue(ctx, -half * 0.9, half * 0.6, w * 0.66, 1.3, -w * 0.4);
    ctx.fill();
    tongue(ctx, -half * 0.86, half * 0.66, w * 0.6, 1.3, w * 0.44);
    ctx.fill();
    ctx.globalAlpha = 0.9;
    ctx.fillStyle = p.rim;
    tongue(ctx, -half, half * 0.3, w * 0.56, 1.15);
    ctx.fill();
    ctx.fillStyle = p.core;
    tongue(ctx, -half, -half * 0.1, w * 0.3, 1.2);
    ctx.fill();
  } else if (flavour === 'frost') {
    // Frost breath: thin streamers plus scattered ice flecks.
    ctx.lineCap = 'round';
    for (let i = 0; i < 5; i++) {
      const lane = (i % 2 === 0 ? -1 : 1) * (0.4 + i * 0.16);
      ctx.globalAlpha = 0.7 - i * 0.09;
      ctx.strokeStyle = i % 2 === 0 ? p.rim : p.core;
      ctx.lineWidth = length * (0.05 - i * 0.006);
      ctx.beginPath();
      ctx.moveTo(-half * 0.9, w * lane * 0.5);
      ctx.quadraticCurveTo(0, w * lane * 1.2, half * (0.6 - i * 0.09), w * lane * 1.7);
      ctx.stroke();
    }
    ctx.globalAlpha = 0.85;
    ctx.fillStyle = p.core;
    for (let i = 0; i < 6; i++) {
      const t = -0.7 + i * 0.26;
      ctx.beginPath();
      ctx.ellipse(half * t, w * (i % 2 === 0 ? -0.95 : 1.05), length * 0.018, length * 0.009, 0, 0, Math.PI * 2);
      ctx.fill();
    }
  } else if (flavour === 'petal') {
    // Petals shedding off the blade, alternating above and below the line.
    ctx.globalAlpha = 0.8;
    for (let i = 0; i < 7; i++) {
      const t = -0.85 + i * 0.26;
      const lane = (i % 2 === 0 ? -1 : 1) * w * (0.5 + (i % 3) * 0.3);
      const r = length * (0.05 - i * 0.004);
      ctx.fillStyle = i % 3 === 0 ? p.core : p.rim;
      ctx.save();
      ctx.translate(half * t, lane);
      ctx.rotate(i * 1.1);
      ctx.beginPath();
      ctx.ellipse(0, 0, r * 1.9, r, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }
  } else if (flavour === 'smoke') {
    // Void smoke: soft dark puffs that swallow the light behind the shot.
    for (let i = 0; i < 6; i++) {
      const t = i / 5;
      const cx = -half * 0.85 + half * 1.6 * t;
      const cr = w * (1 - t * 0.42);
      const lift = (i % 2 === 0 ? -1 : 1) * w * 0.24 * t;
      const puff = ctx.createRadialGradient(cx, lift, 0, cx, lift, cr);
      puff.addColorStop(0, fade(p.deep, 0.5 - t * 0.34));
      puff.addColorStop(1, fade(p.deep, 0));
      ctx.fillStyle = puff;
      ctx.beginPath();
      ctx.arc(cx, lift, cr, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 0.75;
    ctx.fillStyle = p.rim;
    tongue(ctx, -half, half * 0.34, w * 0.42, 1.2);
    ctx.fill();
  } else if (flavour === 'ray') {
    // Hard clean rays, the way an anime light attack smears its afterimage.
    ctx.lineCap = 'round';
    for (let i = 0; i < 4; i++) {
      const lane = (i % 2 === 0 ? -1 : 1) * w * (0.3 + i * 0.22);
      ctx.globalAlpha = 0.8 - i * 0.14;
      ctx.strokeStyle = i === 0 ? p.core : p.rim;
      ctx.lineWidth = length * (0.055 - i * 0.009);
      ctx.beginPath();
      ctx.moveTo(-half, lane * 0.4);
      ctx.lineTo(half * (0.78 - i * 0.16), lane);
      ctx.stroke();
    }
  } else {
    // Rune motes shrinking away down the trail.
    ctx.globalAlpha = 0.85;
    for (let i = 0; i < 6; i++) {
      const t = -0.85 + i * 0.3;
      const lane = (i % 2 === 0 ? -1 : 1) * w * (0.35 + (i % 3) * 0.32);
      const r = length * (0.042 - i * 0.005);
      ctx.strokeStyle = i % 2 === 0 ? p.core : p.rim;
      ctx.lineWidth = length * 0.012;
      ctx.save();
      ctx.translate(half * t, lane);
      ctx.rotate(i * 0.7);
      ctx.beginPath();
      ctx.rect(-r, -r, r * 2, r * 2);
      ctx.stroke();
      ctx.restore();
    }
    ctx.globalAlpha = 0.6;
    ctx.fillStyle = p.rim;
    tongue(ctx, -half, half * 0.3, w * 0.34, 1.2);
    ctx.fill();
  }
  ctx.globalAlpha = 1;
  ctx.restore();
}

export interface MonsterPaint {
  core: string;
  body: string;
  rim: string;
  edge: string;
}

/**
 * Hostile palette, deliberately *not* ELEMENT_COLOR. Sidekick spells already
 * own those bright hues, and a player must never have to work out whether an
 * orb belongs to them. Monster shots run dark-bodied with a hot toxic rim, so
 * incoming fire reads as "black heart, burning edge" against the player's
 * bright solid cores, while still naming its element.
 */
const MONSTER_PAINT: Record<El, MonsterPaint> = {
  [ElementId.FIRE]: { core: '#2a0a06', body: '#b52f18', rim: '#ff7a3a', edge: '#ffd08a' },
  [ElementId.WATER]: { core: '#04202c', body: '#166f92', rim: '#4fd8ff', edge: '#c8f6ff' },
  [ElementId.NATURE]: { core: '#0a2410', body: '#37853a', rim: '#9dff5a', edge: '#e4ffc0' },
  [ElementId.SHADOW]: { core: '#120820', body: '#512a8e', rim: '#a97dff', edge: '#e0ccff' },
  [ElementId.LIGHT]: { core: '#2e1f02', body: '#b98a14', rim: '#ffd94a', edge: '#fff6c8' },
  [ElementId.ARCANE]: { core: '#2a0a24', body: '#992a88', rim: '#ff6ae0', edge: '#ffd0f6' },
};

export function monsterPaint(element: El): MonsterPaint {
  return MONSTER_PAINT[element] ?? MONSTER_PAINT[ElementId.ARCANE];
}

/** The homing shot is an eye, so it should track the player it is chasing. */
export function monsterShotSpins(kind: string): boolean {
  return kind === 'PLASMA';
}

/**
 * Monster fire, nose pointing up the negative y axis to match the rotation
 * EnemyProjectile applies. Each kind gets a silhouette that telegraphs its
 * behaviour: a barbed fang for the plain shot, a torn shard for spread, a
 * clawed spike for the missile, a slit eye for the one that follows you, and a
 * cracked void sphere for plasma.
 */
export function drawMonsterShot(
  ctx: CanvasRenderingContext2D,
  kind: string,
  element: El,
  radius: number,
): void {
  const r = radius;
  const p = monsterPaint(element);
  ctx.save();
  if (kind === 'HOMING') drawMonsterEye(ctx, r, p);
  else if (kind === 'PLASMA') drawMonsterVoid(ctx, r, p);
  else if (kind === 'MISSILE') drawMonsterClaw(ctx, r, p);
  else if (kind === 'SPREAD') drawMonsterShard(ctx, r, p);
  else drawMonsterFang(ctx, r, p);
  ctx.restore();
}

/**
 * Barbed dart: the bread-and-butter enemy shot. Kept short and broad-shouldered
 * on purpose, because on screen it lives at around 24px, where a long thin
 * spike collapses into a dark sliver.
 */
function drawMonsterFang(ctx: CanvasRenderingContext2D, r: number, p: MonsterPaint): void {
  const body = (): void => {
    ctx.beginPath();
    ctx.moveTo(0, -r * 1.4);
    ctx.quadraticCurveTo(r * 0.98, -r * 0.42, r * 0.9, r * 0.28);
    ctx.lineTo(r * 1.24, r * 0.88);
    ctx.lineTo(r * 0.44, r * 0.7);
    ctx.lineTo(0, r * 1.22);
    ctx.lineTo(-r * 0.44, r * 0.7);
    ctx.lineTo(-r * 1.24, r * 0.88);
    ctx.lineTo(-r * 0.9, r * 0.28);
    ctx.quadraticCurveTo(-r * 0.98, -r * 0.42, 0, -r * 1.4);
    ctx.closePath();
  };
  glowAura(ctx, p.rim, r * 1.5);
  ctx.fillStyle = p.rim;
  body();
  ctx.fill();
  clearGlow(ctx);
  ctx.fillStyle = p.body;
  ctx.save();
  ctx.scale(0.66, 0.78);
  body();
  ctx.fill();
  ctx.restore();
  // Dark heart, small enough that the burning rim still owns the silhouette.
  disc(ctx, 0, r * 0.05, r * 0.3, p.core);
  ctx.fillStyle = p.edge;
  ctx.globalAlpha = 0.9;
  ctx.beginPath();
  ctx.moveTo(0, -r * 1.34);
  ctx.lineTo(r * 0.26, -r * 0.45);
  ctx.lineTo(-r * 0.26, -r * 0.45);
  ctx.closePath();
  ctx.fill();
  ctx.globalAlpha = 1;
}

/**
 * Shrapnel chevron for the spread volley. Drawn wider than it is tall so it
 * never gets mistaken for the dart, which is the shot you can out-run.
 */
function drawMonsterShard(ctx: CanvasRenderingContext2D, r: number, p: MonsterPaint): void {
  const body = (): void => {
    ctx.beginPath();
    ctx.moveTo(0, -r * 1.02);
    ctx.lineTo(r * 1.5, r * 0.06);
    ctx.lineTo(r * 1.02, r * 0.62);
    ctx.lineTo(r * 0.3, r * 0.34);
    ctx.lineTo(r * 0.1, r * 1.08);
    ctx.lineTo(-r * 0.3, r * 0.34);
    ctx.lineTo(-r * 1.02, r * 0.62);
    ctx.lineTo(-r * 1.5, r * 0.06);
    ctx.closePath();
  };
  glowAura(ctx, p.rim, r * 1.3);
  ctx.fillStyle = p.rim;
  body();
  ctx.fill();
  clearGlow(ctx);
  ctx.fillStyle = p.body;
  ctx.save();
  ctx.scale(0.68, 0.7);
  body();
  ctx.fill();
  ctx.restore();
  disc(ctx, 0, r * 0.02, r * 0.26, p.core);
  ctx.fillStyle = p.edge;
  ctx.globalAlpha = 0.85;
  ctx.beginPath();
  ctx.moveTo(0, -r * 0.96);
  ctx.lineTo(r * 0.24, -r * 0.2);
  ctx.lineTo(-r * 0.24, -r * 0.2);
  ctx.closePath();
  ctx.fill();
  ctx.globalAlpha = 1;
}

/** Heavy hooked spike, with a burning throat behind the head. */
function drawMonsterClaw(ctx: CanvasRenderingContext2D, r: number, p: MonsterPaint): void {
  const body = (): void => {
    ctx.beginPath();
    ctx.moveTo(0, -r * 1.55);
    ctx.quadraticCurveTo(r * 1.24, -r * 0.55, r * 1, r * 0.4);
    ctx.quadraticCurveTo(r * 1.3, r * 0.9, r * 0.56, r * 1.3);
    ctx.lineTo(0, r * 0.9);
    ctx.lineTo(-r * 0.56, r * 1.3);
    ctx.quadraticCurveTo(-r * 1.3, r * 0.9, -r * 1, r * 0.4);
    ctx.quadraticCurveTo(-r * 1.24, -r * 0.55, 0, -r * 1.55);
    ctx.closePath();
  };
  glowAura(ctx, p.rim, r * 1.7);
  ctx.fillStyle = p.rim;
  body();
  ctx.fill();
  clearGlow(ctx);
  ctx.fillStyle = p.body;
  ctx.save();
  ctx.scale(0.68, 0.8);
  body();
  ctx.fill();
  ctx.restore();
  disc(ctx, 0, -r * 0.1, r * 0.38, p.core);
  // Throat: a narrow hot slot burning out of the tail, not a bright plug.
  ctx.fillStyle = p.edge;
  ctx.globalAlpha = 0.85;
  ctx.beginPath();
  ctx.ellipse(0, r * 0.78, r * 0.16, r * 0.44, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.globalAlpha = 0.8;
  disc(ctx, 0, -r * 1.5, r * 0.2, p.edge);
  ctx.globalAlpha = 1;
}

/** A slit eye: the shot that follows you should look like it is looking back. */
function drawMonsterEye(ctx: CanvasRenderingContext2D, r: number, p: MonsterPaint): void {
  glowAura(ctx, p.rim, r * 1.8);
  disc(ctx, 0, 0, r * 1.3, p.rim);
  clearGlow(ctx);
  disc(ctx, 0, 0, r * 1.12, p.body);
  // Sclera, then a vertical slit pupil straight down the travel axis.
  disc(ctx, 0, 0, r * 0.86, p.edge);
  ctx.fillStyle = p.core;
  ctx.beginPath();
  ctx.ellipse(0, 0, r * 0.3, r * 0.8, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = p.rim;
  ctx.globalAlpha = 0.9;
  ctx.lineWidth = Math.max(1, r * 0.12);
  ctx.beginPath();
  ctx.ellipse(0, 0, r * 0.3, r * 0.8, 0, 0, Math.PI * 2);
  ctx.stroke();
  // Lids pinching the orb top and bottom, which keeps it from reading as a ball.
  ctx.globalAlpha = 0.95;
  ctx.fillStyle = p.body;
  for (const dir of [-1, 1] as const) {
    ctx.beginPath();
    ctx.moveTo(-r * 1.14, dir * r * 0.5);
    ctx.quadraticCurveTo(0, dir * r * 0.62, r * 1.14, dir * r * 0.5);
    ctx.quadraticCurveTo(0, dir * r * 1.24, -r * 1.14, dir * r * 0.5);
    ctx.closePath();
    ctx.fill();
  }
  ctx.globalAlpha = 1;
  sparkle(ctx, -r * 0.44, -r * 0.3, r * 0.26, p.edge);
}

/** Fracture lines as [start angle, bend, reach], hand-spaced to look broken. */
const VOID_CRACKS: readonly (readonly [number, number, number])[] = [
  [0.18, 0.42, 1],
  [1.32, -0.3, 0.82],
  [2.44, 0.36, 0.95],
  [3.66, -0.44, 0.7],
  [4.52, 0.28, 1],
  [5.6, -0.24, 0.86],
];

/** Cracked void sphere: the heaviest read on screen, so it gets the most mass. */
function drawMonsterVoid(ctx: CanvasRenderingContext2D, r: number, p: MonsterPaint): void {
  glowAura(ctx, p.rim, r * 2);
  disc(ctx, 0, 0, r * 1.3, p.rim);
  clearGlow(ctx);
  disc(ctx, 0, 0, r * 1.14, p.body);
  disc(ctx, 0, 0, r * 0.8, p.core);
  // Fractures across the dark heart, bright where the shell has split. Angles
  // and reaches are deliberately uneven: evenly spaced cracks join up into a
  // pentagram instead of reading as damage.
  ctx.strokeStyle = p.edge;
  ctx.lineWidth = Math.max(1, r * 0.14);
  ctx.lineCap = 'round';
  ctx.globalAlpha = 0.9;
  for (const [a, bend, reach] of VOID_CRACKS) {
    ctx.beginPath();
    ctx.moveTo(Math.cos(a) * r * 0.14, Math.sin(a) * r * 0.14);
    ctx.lineTo(Math.cos(a + bend) * r * 0.66 * reach, Math.sin(a + bend) * r * 0.66 * reach);
    ctx.lineTo(Math.cos(a + bend * 0.4) * r * 1.04 * reach, Math.sin(a + bend * 0.4) * r * 1.04 * reach);
    ctx.stroke();
  }
  // Off-axis containment ring, so the sphere looks spun rather than placed.
  ctx.strokeStyle = p.rim;
  ctx.globalAlpha = 0.75;
  ctx.lineWidth = Math.max(1.1, r * 0.16);
  ctx.beginPath();
  ctx.ellipse(0, 0, r * 1.5, r * 1.02, -0.42, 0, Math.PI * 2);
  ctx.stroke();
  ctx.globalAlpha = 1;
  disc(ctx, 0, 0, r * 0.22, p.edge);
}

/**
 * Wake behind monster fire. Drawn along the x axis like the player's streaks so
 * SpriteSync can place it the same way, but torn and sooty rather than clean:
 * the dense end sits at -x, nearest the shot.
 */
export function drawMonsterWake(ctx: CanvasRenderingContext2D, element: El, length: number): void {
  const p = monsterPaint(element);
  const half = length * 0.5;
  const w = length * 0.1;
  ctx.save();
  glowAura(ctx, p.body, length * 0.09);
  ctx.globalAlpha = 0.32;
  ctx.fillStyle = p.body;
  ctx.beginPath();
  ctx.moveTo(half, 0);
  ctx.quadraticCurveTo(half * 0.4, -w * 0.9, -half * 0.2, -w);
  ctx.quadraticCurveTo(-half * 0.7, -w * 0.7, -half, 0);
  ctx.quadraticCurveTo(-half * 0.7, w * 0.7, -half * 0.2, w);
  ctx.quadraticCurveTo(half * 0.4, w * 0.9, half, 0);
  ctx.closePath();
  ctx.fill();
  clearGlow(ctx);
  // Torn flecks shed off the smear, alternating sides so it churns.
  ctx.globalAlpha = 0.6;
  ctx.fillStyle = p.rim;
  for (let i = 0; i < 5; i++) {
    const t = i / 5;
    const side = i % 2 === 0 ? -1 : 1;
    const px = -half + t * length * 0.85;
    const py = side * w * (0.35 + t * 0.7);
    ctx.beginPath();
    ctx.moveTo(px, py);
    ctx.lineTo(px + length * 0.09, py + side * w * 0.22);
    ctx.lineTo(px + length * 0.03, py - side * w * 0.3);
    ctx.closePath();
    ctx.fill();
  }
  // Hot streak riding the middle, brightest right behind the shot.
  ctx.globalAlpha = 0.85;
  ctx.fillStyle = p.edge;
  ctx.beginPath();
  ctx.moveTo(-half * 0.95, 0);
  ctx.quadraticCurveTo(0, -w * 0.34, half * 0.5, 0);
  ctx.quadraticCurveTo(0, w * 0.34, -half * 0.95, 0);
  ctx.closePath();
  ctx.fill();
  ctx.globalAlpha = 1;
  ctx.restore();
}

function rockPath(ctx: CanvasRenderingContext2D, radius: number, verts: number[]): void {
  ctx.beginPath();
  for (let i = 0; i < verts.length; i++) {
    const a = (Math.PI * 2 * i) / verts.length - Math.PI / 2;
    const rr = radius * (verts[i] ?? 1);
    const px = Math.cos(a) * rr;
    const py = Math.sin(a) * rr;
    if (i === 0) ctx.moveTo(px, py);
    else ctx.lineTo(px, py);
  }
  ctx.closePath();
}

/** One branching fissure: index 0 is the trunk, the rest are thinner offshoots. */
const MOLTEN_CRACKS: readonly (readonly (readonly [number, number])[])[] = [
  [
    [-0.14, -0.74],
    [0.02, -0.36],
    [-0.12, 0.0],
    [0.07, 0.34],
    [-0.02, 0.74],
  ],
  [
    [0.02, -0.36],
    [0.34, -0.48],
    [0.6, -0.4],
  ],
  [
    [-0.12, 0.0],
    [-0.48, 0.11],
    [-0.72, 0.03],
  ],
  [
    [0.07, 0.34],
    [0.4, 0.43],
    [0.63, 0.29],
  ],
  [
    [-0.02, 0.74],
    [-0.32, 0.64],
  ],
];

function crackPath(
  ctx: CanvasRenderingContext2D,
  r: number,
  pts: readonly (readonly [number, number])[],
): void {
  ctx.beginPath();
  for (let i = 0; i < pts.length; i++) {
    const p = pts[i]!;
    if (i === 0) ctx.moveTo(p[0] * r, p[1] * r);
    else ctx.lineTo(p[0] * r, p[1] * r);
  }
}

export function drawBurningAsteroid(
  ctx: CanvasRenderingContext2D,
  radius: number,
  verts: number[],
  rotation: number,
  style: HazardStyle = EMBER_ASTEROID,
): void {
  const r = radius;
  ctx.save();
  ctx.rotate(rotation);
  ctx.lineJoin = 'round';
  ctx.lineCap = 'round';

  glowAura(ctx, style.crack, r * 0.3);
  ctx.fillStyle = style.body;
  rockPath(ctx, r, verts);
  ctx.fill();
  clearGlow(ctx);

  ctx.save();
  rockPath(ctx, r, verts);
  ctx.clip();

  // Basalt form: lit shoulder up-left, deep shadow down-right.
  ctx.fillStyle = style.shade;
  ctx.beginPath();
  ctx.ellipse(-r * 0.3, -r * 0.34, r * 0.82, r * 0.62, -0.5, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = 'rgba(14, 9, 8, 0.45)';
  ctx.beginPath();
  ctx.ellipse(r * 0.62, r * 0.6, r * 0.86, r * 0.7, -0.6, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = 'rgba(16, 10, 9, 0.55)';
  ctx.beginPath();
  ctx.ellipse(-r * 0.44, r * 0.36, r * 0.17, r * 0.12, 0.3, 0, Math.PI * 2);
  ctx.ellipse(r * 0.3, -r * 0.52, r * 0.13, r * 0.09, -0.5, 0, Math.PI * 2);
  ctx.ellipse(r * 0.5, -r * 0.02, r * 0.1, r * 0.07, 0.8, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = style.shade;
  ctx.lineWidth = Math.max(0.6, r * 0.03);
  ctx.beginPath();
  ctx.ellipse(-r * 0.44, r * 0.33, r * 0.17, r * 0.12, 0.3, Math.PI, Math.PI * 2);
  ctx.ellipse(r * 0.3, -r * 0.55, r * 0.13, r * 0.09, -0.5, Math.PI, Math.PI * 2);
  ctx.stroke();

  glowAura(ctx, style.crack, r * 0.38);
  for (let pass = 0; pass < 2; pass++) {
    ctx.strokeStyle = pass === 0 ? style.crack : style.rim;
    for (let i = 0; i < MOLTEN_CRACKS.length; i++) {
      const trunk = i === 0;
      const w = trunk ? (pass === 0 ? 0.1 : 0.042) : pass === 0 ? 0.06 : 0.025;
      ctx.lineWidth = Math.max(pass === 0 ? 1 : 0.6, r * w);
      crackPath(ctx, r, MOLTEN_CRACKS[i]!);
      ctx.stroke();
    }
  }

  // Molten pool where the trunk widens.
  ctx.fillStyle = style.crack;
  ctx.beginPath();
  ctx.ellipse(-r * 0.05, r * 0.06, r * 0.16, r * 0.1, -0.4, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = style.rim;
  ctx.beginPath();
  ctx.ellipse(-r * 0.05, r * 0.06, r * 0.08, r * 0.05, -0.4, 0, Math.PI * 2);
  ctx.fill();
  clearGlow(ctx);
  ctx.restore();

  ctx.strokeStyle = style.line;
  ctx.lineWidth = Math.max(1.6, r / 9);
  rockPath(ctx, r, verts);
  ctx.stroke();

  // Ember rim only where the crust is hottest, so the outline stays dark.
  ctx.strokeStyle = style.crack;
  ctx.globalAlpha = 0.3;
  ctx.lineWidth = Math.max(0.9, r / 20);
  rockPath(ctx, r * 0.92, verts);
  ctx.stroke();
  ctx.globalAlpha = 1;
  ctx.restore();
}

/**
 * Tapered tongue running from a wide base at `x0` to a point at `x1`.
 * `bulge` above 1 fattens the belly so the shape licks rather than cones.
 */
function tongue(
  ctx: CanvasRenderingContext2D,
  x0: number,
  x1: number,
  half: number,
  bulge: number,
  offset = 0,
): void {
  const mid = x0 + (x1 - x0) * 0.45;
  ctx.beginPath();
  ctx.moveTo(x0, offset - half);
  ctx.quadraticCurveTo(mid, offset - half * bulge, x1, offset);
  ctx.quadraticCurveTo(mid, offset + half * bulge, x0, offset + half);
  ctx.closePath();
}

/**
 * Comet flame for a burning hazard. Baked with the base at the left edge and
 * the tail tip at the right, so callers rotate it to point opposite travel and
 * the fire never spins with the rock.
 */
export function drawFlamePlume(ctx: CanvasRenderingContext2D, length: number, style: HazardStyle): void {
  const half = length * 0.5;
  const w = length * 0.13;
  ctx.save();

  // Soot as overlapping soft puffs; hard-edged shapes read as grey cardboard
  // once the sky behind them is bright.
  for (let i = 0; i < 6; i++) {
    const t = i / 5;
    const cx = -half * 0.2 + half * 1.05 * t;
    const cr = w * (0.92 - t * 0.4);
    const lift = (i % 2 === 0 ? -1 : 1) * w * 0.18 * t;
    const puff = ctx.createRadialGradient(cx, lift, 0, cx, lift, cr);
    puff.addColorStop(0, `rgba(74, 58, 52, ${0.1 - t * 0.06})`);
    puff.addColorStop(1, 'rgba(74, 58, 52, 0)');
    ctx.fillStyle = puff;
    ctx.beginPath();
    ctx.arc(cx, lift, cr, 0, Math.PI * 2);
    ctx.fill();
  }

  glowAura(ctx, style.crack, length * 0.14);
  ctx.globalAlpha = 0.82;
  const flame = ctx.createLinearGradient(-half, 0, half, 0);
  flame.addColorStop(0, 'rgba(255,184,74,0.9)');
  flame.addColorStop(0.35, 'rgba(255,103,38,0.65)');
  flame.addColorStop(0.72, 'rgba(207,44,36,0.15)');
  flame.addColorStop(1, 'rgba(207,44,36,0)');
  ctx.fillStyle = flame;
  tongue(ctx, -half, half * 0.66, w, 1.08);
  ctx.fill();
  ctx.globalAlpha = 0.7;
  tongue(ctx, -half * 0.55, half * 0.48, w * 0.62, 1.3, -w * 0.42);
  ctx.fill();
  tongue(ctx, -half * 0.5, half * 0.54, w * 0.56, 1.3, w * 0.46);
  ctx.fill();

  ctx.globalAlpha = 0.95;
  const core = ctx.createLinearGradient(-half, 0, half * 0.5, 0);
  core.addColorStop(0, 'rgba(255,247,204,0.95)');
  core.addColorStop(0.35, 'rgba(255,210,88,0.7)');
  core.addColorStop(1, 'rgba(255,145,38,0)');
  ctx.fillStyle = core;
  tongue(ctx, -half, half * 0.24, w * 0.6, 1.12);
  ctx.fill();
  ctx.globalAlpha = 1;
  tongue(ctx, -half, -half * 0.12, w * 0.34, 1.15);
  ctx.fill();

  // Inner licks so the body of the flame churns instead of reading as a cone.
  ctx.globalAlpha = 0.55;
  ctx.fillStyle = flame;
  tongue(ctx, -half * 0.2, half * 0.5, w * 0.24, 1.25, -w * 0.62);
  ctx.fill();
  tongue(ctx, -half * 0.3, half * 0.42, w * 0.2, 1.25, w * 0.68);
  ctx.fill();

  // White-hot throat where the flame leaves the rock.
  ctx.globalAlpha = 0.85;
  ctx.fillStyle = '#fff8e6';
  ctx.beginPath();
  ctx.ellipse(-half * 0.8, 0, w * 0.34, w * 0.2, 0, 0, Math.PI * 2);
  ctx.fill();
  clearGlow(ctx);
  ctx.restore();
}

/**
 * Wind-driven frost gust: pale vapor with swept streaks and ice specks. Same
 * orientation contract as the flame plume.
 */
export function drawFrostWind(ctx: CanvasRenderingContext2D, length: number, style: HazardStyle): void {
  const half = length * 0.5;
  const w = length * 0.16;
  ctx.save();

  glowAura(ctx, style.body, length * 0.1);
  ctx.globalAlpha = 0.12;
  ctx.fillStyle = style.crack;
  tongue(ctx, -half, half * 0.8, w * 1.1, 0.92);
  ctx.fill();
  clearGlow(ctx);

  ctx.globalAlpha = 0.18;
  ctx.fillStyle = style.body;
  tongue(ctx, -half * 0.9, half * 0.5, w * 0.72, 1.05, -w * 0.36);
  ctx.fill();
  tongue(ctx, -half * 0.85, half * 0.62, w * 0.66, 1.05, w * 0.42);
  ctx.fill();

  // Streamers: each starts near the shard and gets thinner downwind.
  const streaks: readonly (readonly [number, number, number, number])[] = [
    [-0.85, 0.92, -0.1, 0.025],
    [-0.7, 0.72, -0.62, 0.018],
    [-0.6, 0.86, 0.55, 0.02],
    [-0.9, 0.55, 0.95, 0.014],
    [-0.5, 0.98, -1.0, 0.012],
  ];
  ctx.lineCap = 'round';
  const frost = ctx.createLinearGradient(-half, 0, half, 0);
  frost.addColorStop(0, 'rgba(232,251,255,0.8)');
  frost.addColorStop(0.45, 'rgba(126,200,255,0.45)');
  frost.addColorStop(1, 'rgba(126,200,255,0)');
  for (let i = 0; i < streaks.length; i++) {
    const [from, to, lane, thick] = streaks[i]!;
    ctx.globalAlpha = 0.75 - i * 0.09;
    ctx.strokeStyle = frost;
    ctx.lineWidth = length * thick;
    ctx.beginPath();
    ctx.moveTo(half * from, w * lane * 0.9);
    ctx.quadraticCurveTo(0, w * lane * 1.5, half * to, w * lane * 1.9);
    ctx.stroke();
  }

  ctx.globalAlpha = 0.75;
  ctx.fillStyle = '#ffffff';
  for (let i = 0; i < 6; i++) {
    const t = -0.5 + i * 0.28;
    const r = length * (0.008 + (i % 2) * 0.005);
    ctx.beginPath();
    ctx.ellipse(half * t, w * (i % 2 === 0 ? -1.05 : 1.1), r * 2.4, r, 0, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.globalAlpha = 1;
  ctx.restore();
}

/**
 * Lumps of a hailstone as [angle around the stone, distance out, lump size].
 * Sizes are deliberately uneven so the stone reads as accreted rather than as a
 * flower, and the whole set is fixed data so the sprite bakes identically.
 */
const HAIL_LOBES: readonly (readonly [number, number, number])[] = [
  [0, 0, 0.68],
  [-1.82, 0.42, 0.58],
  [-0.34, 0.5, 0.46],
  [1.02, 0.44, 0.54],
  [2.44, 0.48, 0.43],
  [3.62, 0.4, 0.52],
];

function hailPath(ctx: CanvasRenderingContext2D, r: number, grow: number): void {
  ctx.beginPath();
  for (const lobe of HAIL_LOBES) {
    const lr = lobe[2] * grow * r;
    const cx = Math.cos(lobe[0]) * lobe[1] * r;
    const cy = Math.sin(lobe[0]) * lobe[1] * r;
    ctx.moveTo(cx + lr, cy);
    ctx.arc(cx, cy, lr, 0, Math.PI * 2);
  }
}

export function drawHailstone(
  ctx: CanvasRenderingContext2D,
  radius: number,
  rotation: number,
  style: HazardStyle = FROST_HAIL,
): void {
  const r = radius;
  ctx.save();
  ctx.rotate(rotation);

  // A dark underlay stands in for an outline. Stroking the lobe cluster would ink
  // every internal seam and turn the stone into a clump of soap bubbles, while
  // filling it oversized inks only the silhouette. The glow is kept tight for the
  // same reason -- a wide aura washes over this ring and the stone starts reading
  // as one more cloud puff against a bright sky.
  ctx.fillStyle = style.line;
  hailPath(ctx, r, 1.2);
  ctx.fill();

  glowAura(ctx, style.body, r * 0.3);
  ctx.fillStyle = style.body;
  hailPath(ctx, r, 1);
  ctx.fill();
  clearGlow(ctx);

  // Shade the lumps on the far side so the cluster has depth. The seams between
  // lumps only show up as shading, which is what sells it as fused hail.
  ctx.globalAlpha = 0.82;
  for (const lobe of HAIL_LOBES) {
    if (lobe[0] <= 0 || lobe[0] > 2.2) continue;
    disc(ctx, Math.cos(lobe[0]) * lobe[1] * r, Math.sin(lobe[0]) * lobe[1] * r, lobe[2] * r * 0.86, style.shade);
  }

  // Wet gloss on the lit lumps, pulled up-left toward the light. Deliberately
  // small: blown out to full lump size it bleaches the ice back to cloud white.
  ctx.globalAlpha = 0.42;
  for (const lobe of HAIL_LOBES) {
    if (lobe[0] > 0 && lobe[0] < 2.6) continue;
    const lr = lobe[2] * r;
    const cx = Math.cos(lobe[0]) * lobe[1] * r - lr * 0.24;
    const cy = Math.sin(lobe[0]) * lobe[1] * r - lr * 0.3;
    disc(ctx, cx, cy, lr * 0.38, style.crack);
  }

  // Rime along the windward edge.
  ctx.globalAlpha = 0.8;
  ctx.strokeStyle = style.rim;
  ctx.lineWidth = Math.max(0.9, r * 0.08);
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.arc(0, 0, r * 0.86, Math.PI * 1.08, Math.PI * 1.82);
  ctx.stroke();

  ctx.globalAlpha = 1;
  disc(ctx, -r * 0.28, -r * 0.5, r * 0.11, '#ffffff');
  disc(ctx, r * 0.2, -r * 0.62, r * 0.07, '#ffffff');
  disc(ctx, -r * 0.58, -r * 0.04, r * 0.06, '#ffffff');
  sparkle(ctx, -r * 0.3, -r * 0.56, r * 0.32, '#ffffff');
  ctx.restore();
}

/** One gold for every coin tier; only the size and the struck face change. */
const GOLD = {
  deep: '#8a5405',
  body: '#e8a41c',
  face: '#ffd24a',
  rim: '#ffe9a8',
  shine: '#fff6c8',
} as const;

export type CoinFace = 'plain' | 'star' | 'gem';

/** Depth of the coin's side band, so heavier tiers read as thicker metal. */
const COIN_THICK: Record<CoinFace, number> = { plain: 0.1, star: 0.17, gem: 0.22 };

function coinStar(ctx: CanvasRenderingContext2D, r: number, points: number, inner: number, fill: string): void {
  ctx.fillStyle = fill;
  ctx.beginPath();
  for (let i = 0; i < points * 2; i++) {
    const a = (Math.PI / points) * i - Math.PI / 2;
    const rr = i % 2 === 0 ? r : r * inner;
    const px = Math.cos(a) * rr;
    const py = Math.sin(a) * rr;
    if (i === 0) ctx.moveTo(px, py);
    else ctx.lineTo(px, py);
  }
  ctx.closePath();
  ctx.fill();
}

/**
 * A struck gold coin seen face-on. Every tier is the same gold; `face` picks
 * how ornate the strike is, which is what tells a 10 from a 40 in flight.
 */
export function drawGoldCoin(ctx: CanvasRenderingContext2D, radius: number, face: CoinFace): void {
  const r = radius;
  const thick = COIN_THICK[face] * r;
  ctx.save();

  // Side band under the face, so the coin has weight rather than reading flat.
  glowAura(ctx, GOLD.face, face === 'gem' ? 18 : 13);
  disc(ctx, 0, thick, r, GOLD.deep);
  disc(ctx, 0, 0, r, GOLD.body);
  clearGlow(ctx);

  // Dark contour, so the coin keeps a hard silhouette over pale skies as well
  // as dark ones rather than blooming into the background.
  ctx.strokeStyle = GOLD.deep;
  ctx.lineWidth = Math.max(1, r * 0.1);
  ctx.beginPath();
  ctx.arc(0, 0, r * 0.96, 0, Math.PI * 2);
  ctx.stroke();

  // Milled ring inside the contour.
  ctx.strokeStyle = GOLD.rim;
  ctx.lineWidth = Math.max(1.2, r * 0.11);
  ctx.beginPath();
  ctx.arc(0, 0, r * 0.87, 0, Math.PI * 2);
  ctx.stroke();

  const ticks = face === 'plain' ? 12 : face === 'star' ? 16 : 20;
  ctx.strokeStyle = GOLD.deep;
  ctx.lineWidth = Math.max(0.8, r * 0.07);
  ctx.globalAlpha = 0.5;
  ctx.beginPath();
  for (let i = 0; i < ticks; i++) {
    const a = (Math.PI * 2 * i) / ticks;
    const c = Math.cos(a);
    const s = Math.sin(a);
    ctx.moveTo(c * r * 0.8, s * r * 0.8);
    ctx.lineTo(c * r * 0.93, s * r * 0.93);
  }
  ctx.stroke();
  ctx.globalAlpha = 1;

  // Struck field, lit from the upper left.
  ctx.fillStyle = softFill(ctx, 0, 0, r * 0.82, GOLD.shine, GOLD.face);
  ctx.beginPath();
  ctx.arc(0, 0, r * 0.78, 0, Math.PI * 2);
  ctx.fill();

  if (face === 'plain') {
    coinStar(ctx, r * 0.5, 4, 0.3, GOLD.body);
    coinStar(ctx, r * 0.34, 4, 0.3, GOLD.rim);
  } else if (face === 'star') {
    ctx.strokeStyle = GOLD.body;
    ctx.lineWidth = Math.max(0.8, r * 0.06);
    ctx.globalAlpha = 0.6;
    ctx.beginPath();
    for (let i = 0; i < 8; i++) {
      const a = (Math.PI / 4) * i;
      ctx.moveTo(Math.cos(a) * r * 0.28, Math.sin(a) * r * 0.28);
      ctx.lineTo(Math.cos(a) * r * 0.68, Math.sin(a) * r * 0.68);
    }
    ctx.stroke();
    ctx.globalAlpha = 1;
    coinStar(ctx, r * 0.58, 5, 0.42, GOLD.body);
    coinStar(ctx, r * 0.42, 5, 0.42, GOLD.shine);
  } else {
    // Crown over a faceted gem, set into the strike.
    ctx.fillStyle = GOLD.body;
    ctx.beginPath();
    ctx.moveTo(-r * 0.42, -r * 0.14);
    ctx.lineTo(-r * 0.3, -r * 0.52);
    ctx.lineTo(-r * 0.14, -r * 0.24);
    ctx.lineTo(0, -r * 0.6);
    ctx.lineTo(r * 0.14, -r * 0.24);
    ctx.lineTo(r * 0.3, -r * 0.52);
    ctx.lineTo(r * 0.42, -r * 0.14);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = GOLD.deep;
    ctx.globalAlpha = 0.35;
    disc(ctx, 0, r * 0.24, r * 0.34, GOLD.deep);
    ctx.globalAlpha = 1;
    ctx.fillStyle = '#7ee8ff';
    ctx.beginPath();
    ctx.moveTo(0, r * 0.02);
    ctx.lineTo(r * 0.26, r * 0.24);
    ctx.lineTo(0, r * 0.5);
    ctx.lineTo(-r * 0.26, r * 0.24);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = 'rgba(255, 255, 255, 0.62)';
    ctx.beginPath();
    ctx.moveTo(0, r * 0.02);
    ctx.lineTo(r * 0.26, r * 0.24);
    ctx.lineTo(0, r * 0.24);
    ctx.closePath();
    ctx.fill();
  }

  // Specular sweep across the top left of the metal.
  ctx.fillStyle = 'rgba(255, 255, 255, 0.34)';
  ctx.beginPath();
  ctx.ellipse(-r * 0.34, -r * 0.42, r * 0.36, r * 0.16, -0.7, 0, Math.PI * 2);
  ctx.fill();
  sparkle(ctx, r * 0.46, -r * 0.56, Math.max(1.8, r * 0.2), '#fffef6');
  ctx.restore();
}

/**
 * The same coin caught edge-on at the thin point of its flip: a narrow bar of
 * gold with the side band showing.
 */
export function drawCoinEdge(ctx: CanvasRenderingContext2D, radius: number, face: CoinFace): void {
  const r = radius;
  const half = Math.max(1.4, r * (COIN_THICK[face] + 0.06));
  ctx.save();
  glowAura(ctx, GOLD.face, 12);
  ctx.fillStyle = GOLD.body;
  ctx.beginPath();
  ctx.ellipse(0, 0, half, r, 0, 0, Math.PI * 2);
  ctx.fill();
  clearGlow(ctx);
  ctx.fillStyle = GOLD.deep;
  ctx.globalAlpha = 0.5;
  ctx.beginPath();
  ctx.ellipse(half * 0.4, 0, half * 0.5, r * 0.94, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.globalAlpha = 1;
  ctx.fillStyle = GOLD.shine;
  ctx.beginPath();
  ctx.ellipse(-half * 0.32, -r * 0.1, half * 0.3, r * 0.6, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = GOLD.deep;
  ctx.lineWidth = Math.max(0.8, r * 0.08);
  ctx.beginPath();
  ctx.ellipse(0, 0, half, r * 0.98, 0, 0, Math.PI * 2);
  ctx.stroke();
  ctx.restore();
}

export function drawHangarIsle(ctx: CanvasRenderingContext2D): void {
  ctx.save();
  glowAura(ctx, '#9ed49a', 14);
  oval(ctx, 0, 16, 54, 14, '#c4a07a', 0.55);
  oval(ctx, 0, 6, 58, 18, '#8fc98a', 0.6);
  oval(ctx, -4, -2, 48, 16, '#9ed49a', 0.55);
  clearGlow(ctx);
  ctx.fillStyle = '#8a5a3a';
  ctx.fillRect(-3, -16, 5, 18);
  blob(ctx, -10, -22, 13, '#6fbe6a', 0.45);
  blob(ctx, 4, -20, 10, '#8fd98a', 0.4);
  blob(ctx, 18, -6, 7, '#7dff9a', 0.35);
  sparkle(ctx, 26, -14, 3.2, '#ffe08a');
  ctx.restore();
}

export function drawHangarCloud(ctx: CanvasRenderingContext2D): void {
  ctx.save();
  glowAura(ctx, '#fff8ec', 16);
  blob(ctx, -22, 6, 20, '#fff4e0', 0.35);
  blob(ctx, 0, 0, 26, '#fffef8', 0.35);
  blob(ctx, 22, 8, 18, '#ffe8c8', 0.35);
  blob(ctx, 6, -12, 15, '#fff6e8', 0.3);
  ctx.restore();
}

export function drawHangarBird(ctx: CanvasRenderingContext2D): void {
  ctx.save();
  glowAura(ctx, '#fff6e8', 10);
  oval(ctx, 0, 0, 11, 6.2, '#fffef8', 0.45);
  oval(ctx, -3, -7, 9, 4.2, '#ffe08a', 0.4, -0.45);
  oval(ctx, 3, -7, 9, 4.2, '#ffd0f2', 0.4, 0.45);
  blob(ctx, 9, 0, 3.4, '#ffb6c8', 0.35);
  sparkle(ctx, -12, -10, 2.4, '#fff');
  ctx.restore();
}

export function drawHangarLantern(ctx: CanvasRenderingContext2D): void {
  ctx.save();
  glowAura(ctx, '#ffd24a', 18);
  sparkle(ctx, 0, 0, 9, '#ffe08a');
  blob(ctx, 0, 0, 3.4, '#fff8e0', 0.35);
  ctx.restore();
}
