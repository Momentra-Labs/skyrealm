import Phaser from 'phaser';
import { GameState } from '../../types/game.ts';
import { LOGICAL_HEIGHT, LOGICAL_WIDTH } from '../constants.ts';
import type { SkyPalette } from '../content/skies.ts';
import type { GameEngine } from '../GameEngine.ts';
import type { StarFloater } from '../Starfield.ts';
import type { TextureBank } from './TextureBank.ts';

const DEPTH = { sky: 0, plate: 1, bg: 1, disk: 2, mid: 2.5, curtain: 3, fg: 3.5, weather: 4, veil: 8 };

/**
 * Parallax rates against the run's scroll. Kept restrained: the painting
 * drifts slowly, the cloud banks a little faster, the near banks fastest.
 */
const PARALLAX = { bg: 0.32, mid: 0.7, fg: 1.15 };

export class SkyLayer {
  private readonly engine: GameEngine;
  private readonly bank: TextureBank;
  private readonly sky: Phaser.GameObjects.Graphics;
  private readonly disk: Phaser.GameObjects.Graphics;
  private readonly sceneGfx: Phaser.GameObjects.Graphics;
  private readonly veil: Phaser.GameObjects.Graphics;
  private lastGrad = '';
  private readonly plateA: Phaser.GameObjects.Image;
  private readonly plateB: Phaser.GameObjects.Image;
  private readonly bg: Strip;
  private readonly mid: Strip;
  private readonly fg: Strip;
  private readonly curtainL: Phaser.GameObjects.Image;
  private readonly curtainR: Phaser.GameObjects.Image;

  constructor(scene: Phaser.Scene, engine: GameEngine, bank: TextureBank) {
    this.engine = engine;
    this.bank = bank;
    this.sky = scene.add.graphics().setDepth(DEPTH.sky);
    this.plateA = makeLayer(scene, DEPTH.plate);
    this.plateB = makeLayer(scene, DEPTH.plate);
    this.disk = scene.add.graphics().setDepth(DEPTH.disk);
    this.bg = new Strip(scene, DEPTH.bg);
    this.mid = new Strip(scene, DEPTH.mid);
    this.fg = new Strip(scene, DEPTH.fg);
    this.curtainL = makeLayer(scene, DEPTH.curtain);
    this.curtainR = makeLayer(scene, DEPTH.curtain);
    this.sceneGfx = scene.add.graphics().setDepth(DEPTH.weather);
    this.veil = scene.add.graphics().setDepth(DEPTH.veil);
    this.paintVeil();
  }

  sync(): void {
    this.veil.setVisible(this.engine.state !== GameState.MENU);
    const field = this.engine.starfield;
    const pal = field.palette();
    this.paintGradient(pal, field.fading);
    this.sky.scene.cameras.main.setBackgroundColor(pal.top);
    // The painted sky is the scene once it has loaded. Until then the
    // procedural plate, sun and side curtains stand in for it.
    const painted = this.bg.place(this.bank.env(field.worldId, 'bg'), field.scroll * PARALLAX.bg, 1);
    this.mid.place(this.bank.env(field.worldId, 'mid'), field.scroll * PARALLAX.mid, 0.95);
    this.fg.place(this.bank.env(field.worldId, 'fg'), field.scroll * PARALLAX.fg, 0.9);
    if (painted) {
      this.plateA.setVisible(false);
      this.plateB.setVisible(false);
      this.curtainL.setVisible(false);
      this.curtainR.setVisible(false);
      this.disk.clear();
    } else {
      this.placePlates(field.worldId, field.scroll);
      this.paintDisk(pal);
      this.placeCurtains(field.worldId);
    }
    this.paintWeather(pal);
  }

  private paintGradient(pal: SkyPalette, fading: boolean): void {
    const key = `${pal.top}:${pal.glow}:${pal.mid}:${pal.ground}`;
    if (!fading && key === this.lastGrad) return;
    this.lastGrad = key;
    const g = this.sky;
    g.clear();
    const h = LOGICAL_HEIGHT;
    const w = LOGICAL_WIDTH;
    g.fillGradientStyle(pal.top, pal.top, pal.glow, pal.glow, 1);
    g.fillRect(0, 0, w, h * 0.26);
    g.fillGradientStyle(pal.glow, pal.glow, pal.mid, pal.mid, 1);
    g.fillRect(0, h * 0.2, w, h * 0.34);
    g.fillGradientStyle(pal.mid, pal.mid, pal.mid, pal.mid, 1);
    g.fillRect(0, h * 0.48, w, h * 0.28);
    g.fillGradientStyle(pal.mid, pal.mid, pal.glow, pal.glow, 1);
    g.fillRect(0, h * 0.7, w, h * 0.3);
  }

  private paintDisk(pal: SkyPalette): void {
    const g = this.disk;
    g.clear();
    const sun = this.engine.starfield.celestial();
    g.fillStyle(sun.halo, 0.2);
    g.fillCircle(sun.x, sun.y, sun.r * 4.1);
    g.fillStyle(sun.halo, 0.3);
    g.fillCircle(sun.x, sun.y, sun.r * 2.4);
    g.fillStyle(sun.color, 0.96);
    g.fillCircle(sun.x, sun.y, sun.r);
    if (sun.moon) {
      g.fillStyle(pal.top, 0.55);
      g.fillCircle(sun.x + sun.r * 0.32, sun.y - sun.r * 0.18, sun.r * 0.72);
    }
  }

  private placePlates(world: string, scroll: number): void {
    const key = this.bank.plate(world);
    const shift = wrapShift(scroll);
    showCover(this.plateA, key, 0, shift - LOGICAL_HEIGHT, 1);
    showCover(this.plateB, key, 0, shift, 1);
  }

  private placeCurtains(world: string): void {
    const key = this.bank.curtain(world);
    const w = 120;
    this.curtainL.setTexture(key);
    this.curtainL.setVisible(true);
    this.curtainL.setAlpha(0.25);
    this.curtainL.setFlipX(false);
    this.curtainL.setOrigin(0, 0);
    this.curtainL.setPosition(0, 0);
    this.curtainL.setDisplaySize(w, LOGICAL_HEIGHT);
    this.curtainR.setTexture(key);
    this.curtainR.setVisible(true);
    this.curtainR.setAlpha(0.25);
    this.curtainR.setFlipX(true);
    this.curtainR.setOrigin(1, 0);
    this.curtainR.setPosition(LOGICAL_WIDTH, 0);
    this.curtainR.setDisplaySize(w, LOGICAL_HEIGHT);
  }

  private paintWeather(pal: SkyPalette): void {
    const g = this.sceneGfx;
    g.clear();
    const layers = this.engine.starfield.floaters();
    for (const f of layers.far) this.mote(g, f, pal);
    for (const f of layers.mid) {
      if (f.kind === 'petal') this.petal(g, f, pal);
      else this.mote(g, f, pal);
    }
    for (const f of layers.near) {
      if (f.kind === 'petal') this.petal(g, f, pal);
      else if (f.kind === 'shard') this.shard(g, f, pal);
      else this.mote(g, f, pal);
    }
  }

  private paintVeil(): void {
    const g = this.veil;
    g.clear();
    const w = LOGICAL_WIDTH;
    const h = LOGICAL_HEIGHT;
    // Recede the scenery behind luminous wings and hostile projectiles.
    // This sits below every gameplay sprite, so it never dims the action.
    g.fillGradientStyle(0x102b3b, 0x102b3b, 0x1b1734, 0x1b1734, 0.18, 0.18, 0.3, 0.3);
    g.fillRect(0, 0, w, h);
    g.fillGradientStyle(0x11192b, 0x11192b, 0x11192b, 0x11192b, 0.14, 0, 0.14, 0);
    g.fillRect(0, 0, 70, h);
    g.fillGradientStyle(0x11192b, 0x11192b, 0x11192b, 0x11192b, 0, 0.14, 0, 0.14);
    g.fillRect(w - 70, 0, 70, h);
  }

  private mote(g: Phaser.GameObjects.Graphics, f: StarFloater, pal: SkyPalette): void {
    g.fillStyle(pal.weather, f.alpha);
    g.fillCircle(f.x, f.y, Math.max(3.2, f.w * 0.28));
  }

  private petal(g: Phaser.GameObjects.Graphics, f: StarFloater, pal: SkyPalette): void {
    g.fillStyle(pal.weather, f.alpha);
    g.save();
    g.translateCanvas(f.x, f.y);
    g.rotateCanvas(f.x * 0.012 + f.y * 0.004);
    g.fillEllipse(0, 0, f.w * 0.95, f.h * 1.65);
    g.restore();
  }

  private shard(g: Phaser.GameObjects.Graphics, f: StarFloater, pal: SkyPalette): void {
    g.fillStyle(pal.weather, f.alpha);
    g.fillTriangle(f.x, f.y - f.h, f.x + f.w * 0.4, f.y, f.x, f.y + f.h * 0.4);
    g.fillTriangle(f.x, f.y - f.h, f.x, f.y + f.h * 0.4, f.x - f.w * 0.4, f.y);
  }
}

/** A vertically looping image layer, drawn at the texture's true aspect. */
class Strip {
  private readonly scene: Phaser.Scene;
  private readonly depth: number;
  private readonly tiles: Phaser.GameObjects.Image[] = [];

  constructor(scene: Phaser.Scene, depth: number) {
    this.scene = scene;
    this.depth = depth;
  }

  /** Returns false (and hides) when the texture is not ready yet. */
  place(key: string | null, scroll: number, alpha: number): boolean {
    if (!key) {
      for (const t of this.tiles) t.setVisible(false);
      return false;
    }
    const src = this.scene.textures.get(key).getSourceImage() as { width: number; height: number };
    const span = Math.max(64, Math.round((LOGICAL_WIDTH * src.height) / Math.max(1, src.width)));
    const need = Math.ceil(LOGICAL_HEIGHT / span) + 1;
    while (this.tiles.length < need) this.tiles.push(makeLayer(this.scene, this.depth));
    const shift = ((Math.round(scroll) % span) + span) % span;
    for (let i = 0; i < this.tiles.length; i++) {
      const img = this.tiles[i]!;
      if (i >= need) {
        img.setVisible(false);
        continue;
      }
      if (img.texture.key !== key) img.setTexture(key);
      img.setVisible(true);
      img.setAlpha(alpha);
      img.setPosition(0, shift - span + i * span);
      // An opaque layer overlaps one px to hide any sub-pixel gap; a
      // translucent one must not, or the shared row blends twice and shows.
      img.setDisplaySize(LOGICAL_WIDTH, alpha >= 1 ? span + 1 : span);
    }
    return true;
  }
}

function wrapShift(scroll: number): number {
  const span = LOGICAL_HEIGHT;
  return Math.round(((scroll % span) + span) % span);
}

function makeLayer(scene: Phaser.Scene, depth: number): Phaser.GameObjects.Image {
  return scene.add.image(0, 0, 'dot').setOrigin(0, 0).setDepth(depth).setVisible(false);
}

function showCover(img: Phaser.GameObjects.Image, key: string, x: number, y: number, alpha: number): void {
  img.setTexture(key);
  img.setVisible(true);
  img.setAlpha(alpha);
  img.setPosition(x, y);
  img.setDisplaySize(LOGICAL_WIDTH, LOGICAL_HEIGHT);
}
