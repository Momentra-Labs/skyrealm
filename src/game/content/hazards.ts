import { WorldId } from '../../types/game.ts';
import type { WorldId as W } from '../../types/game.ts';

export interface HazardStyle {
  body: string;
  shade: string;
  crack: string;
  rim: string;
  line: string;
  trail: readonly [number, number, number];
  spark: readonly [number, number, number];
  /** Trailing haze: soot for fire, vapor for frost. */
  haze: readonly [number, number, number];
  trailSize: number;
  trailStride: number;
  /** Plume length as a multiple of hazard radius. */
  plume: number;
  /** Sideways scatter of the wake, in pixels per second. */
  wind: number;
}

export const EMBER_ASTEROID: HazardStyle = {
  body: '#2f2320',
  shade: '#4d3730',
  crack: '#ff8a3d',
  rim: '#ffd24a',
  line: '#241713',
  trail: [255, 138, 61],
  spark: [255, 210, 74],
  haze: [96, 74, 68],
  trailSize: 2.6,
  trailStride: 1,
  plume: 7.5,
  wind: 26,
};

export const FROST_HAIL: HazardStyle = {
  body: '#7ec8ff',
  shade: '#3f7fb8',
  crack: '#e8fbff',
  rim: '#c8f4ff',
  line: '#1b3550',
  trail: [200, 240, 255],
  spark: [126, 200, 255],
  haze: [240, 251, 255],
  trailSize: 1.8,
  trailStride: 1,
  plume: 8,
  wind: 96,
};

/**
 * Spawn interval multipliers per world. Chosen so rock + hail combined stays
 * near the base ~0.93 hazards/sec; only the fire/frost ratio shifts.
 */
export const WORLD_HAZARD_RATE: Record<W, { rock: number; hail: number }> = {
  [WorldId.MEADOWS]: { rock: 1, hail: 1 },
  [WorldId.CRYSTAL_FOREST]: { rock: 1.3, hail: 0.8 },
  [WorldId.EMBER_CANYON]: { rock: 0.65, hail: 2.2 },
  [WorldId.FROZEN_SKIES]: { rock: 2.2, hail: 0.63 },
  [WorldId.SHADOW_REALM]: { rock: 0.8, hail: 1.35 },
  [WorldId.STORM_KINGDOM]: { rock: 1, hail: 1 },
  [WorldId.CELESTIAL_RUINS]: { rock: 0.9, hail: 1.15 },
  [WorldId.VOID_FRONTIER]: { rock: 0.75, hail: 1.5 },
};
