import { useCallback, useEffect, useRef } from 'react';
import { WorldId } from '../types/game.ts';
import type { GuardianId, WorldId as W } from '../types/game.ts';
import { WORLDS } from '../game/content/worlds.ts';
import { getSkyPlate } from '../game/phaser/SkyPlates.ts';
import { PortraitCanvas } from '../components/PortraitCanvas.tsx';
import { drawGuardianSprite } from '../assets/drawEntity.ts';
import { assets } from '../assets/AssetLoader.ts';
import { envPath, guardianPath, worldAssetUrls } from '../assets/assetManifest.ts';

function paintWorld(canvas: HTMLCanvasElement, world: W, width: number, height: number): void {
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  if (!ctx) return;
  const background = assets.get(envPath(world, 'bg'));
  if (!background) {
    ctx.drawImage(getSkyPlate(world), 0, 80, 540, 520, 0, 0, width, height);
    return;
  }
  for (const layer of ['bg', 'mid', 'fg'] as const) {
    const image = assets.get(envPath(world, layer));
    if (!image) continue;
    const sourceHeight = image.width * height / width;
    ctx.drawImage(image, 0, Math.max(0, (image.height - sourceHeight) / 2), image.width, Math.min(image.height, sourceHeight), 0, 0, width, height);
  }
}

interface PromoProps {
  world: W;
  guardian: GuardianId;
  className?: string;
  caption?: string;
  size?: number;
}

export function PromoFrame({ world, guardian, className = '', caption, size = 168 }: PromoProps) {
  const ref = useRef<HTMLCanvasElement>(null);
  const drawGuardian = useCallback(
    (ctx: CanvasRenderingContext2D) => {
      drawGuardianSprite(ctx, guardian, size * 0.9, 'portrait');
    },
    [guardian, size],
  );

  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    const paint = () => paintWorld(canvas, world, 540, 360);
    const off = assets.onReady(paint);
    paint();
    void assets.load([...worldAssetUrls(world), guardianPath(guardian, 'portrait')]);
    return off;
  }, [world, guardian]);

  return (
    <figure className={`lp-promo ${className}`}>
      <div className="lp-promo-bezel">
        <canvas ref={ref} className="lp-promo-plate" width={540} height={360} />
        <div className="lp-promo-char">
          <PortraitCanvas size={size} offsetY={0} draw={drawGuardian} />
        </div>
      </div>
      {caption && <figcaption>{caption}</figcaption>}
    </figure>
  );
}

interface ThumbProps {
  world: W;
  selected?: boolean;
  onSelect?: () => void;
}

export function WorldThumb({ world, selected = false, onSelect }: ThumbProps) {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    const paint = () => paintWorld(canvas, world, 320, 200);
    const off = assets.onReady(paint);
    paint();
    void assets.load(worldAssetUrls(world));
    return off;
  }, [world]);

  return (
    <figure
      className={`lp-world-card${selected ? ' is-on' : ''}`}
      tabIndex={onSelect ? 0 : undefined}
      role={onSelect ? 'button' : undefined}
      aria-pressed={onSelect ? selected : undefined}
      onClick={onSelect}
      onKeyDown={(event) => {
        if (!onSelect) return;
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault();
          onSelect();
        }
      }}
    >
      <canvas ref={ref} className="lp-world-plate" width={320} height={200} />
      <figcaption>{WORLDS[world].name}</figcaption>
    </figure>
  );
}

export const SHOW_WORLDS = [
  WorldId.MEADOWS,
  WorldId.CRYSTAL_FOREST,
  WorldId.EMBER_CANYON,
  WorldId.FROZEN_SKIES,
  WorldId.SHADOW_REALM,
  WorldId.STORM_KINGDOM,
  WorldId.CELESTIAL_RUINS,
  WorldId.VOID_FRONTIER,
] as const;
