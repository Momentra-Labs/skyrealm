import { hangarBootUrls } from './assetManifest.ts';

const DEV = import.meta.env.DEV;

export class AssetLoader {
  private readonly images = new Map<string, HTMLImageElement | HTMLCanvasElement>();
  private readonly silhouettes = new Map<string, HTMLCanvasElement>();
  private readonly failed = new Set<string>();
  private readonly inflight = new Map<string, Promise<void>>();
  private readonly readyFns = new Set<() => void>();
  private readonly progressFns = new Set<() => void>();
  private loaded = 0;
  private total = 0;

  get progress(): number {
    return this.total <= 0 ? 0 : this.loaded / this.total;
  }

  has(url: string): boolean {
    return this.images.has(url);
  }

  get(url: string): HTMLImageElement | HTMLCanvasElement | null {
    return this.images.get(url) ?? null;
  }

  async loadCritical(): Promise<void> {
    await this.load(hangarBootUrls());
  }

  async load(urls: readonly string[]): Promise<void> {
    const jobs: Promise<void>[] = [];
    for (const url of new Set(urls)) {
      if (this.images.has(url) || this.failed.has(url)) continue;
      let job = this.inflight.get(url);
      if (!job) {
        this.total += 1;
        job = this.fetchOne(url).finally(() => this.inflight.delete(url));
        this.inflight.set(url, job);
      }
      jobs.push(job);
    }
    this.emitProgress();
    await Promise.all(jobs);
    this.emitReady();
  }

  onReady(fn: () => void): () => void {
    this.readyFns.add(fn);
    return () => {
      this.readyFns.delete(fn);
    };
  }

  onProgress(fn: () => void): () => void {
    this.progressFns.add(fn);
    return () => {
      this.progressFns.delete(fn);
    };
  }

  private emitReady(): void {
    for (const fn of this.readyFns) fn();
  }

  private emitProgress(): void {
    for (const fn of this.progressFns) fn();
  }

  private markLoaded(): void {
    this.loaded += 1;
    this.emitProgress();
  }

  draw(ctx: CanvasRenderingContext2D, url: string, size: number): boolean {
    const img = this.images.get(url);
    if (!img) return false;
    const w = 'naturalWidth' in img ? img.naturalWidth || img.width : img.width;
    const h = 'naturalHeight' in img ? img.naturalHeight || img.height : img.height;
    if (!w || !h) return false;
    const scale = size / Math.max(w, h);
    const dw = w * scale;
    const dh = h * scale;
    ctx.drawImage(img, -dw / 2, -dh / 2, dw, dh);
    return true;
  }

  drawSilhouette(ctx: CanvasRenderingContext2D, url: string, size: number): boolean {
    const img = this.images.get(url);
    if (!img) return false;
    let silhouette = this.silhouettes.get(url);
    if (!silhouette) {
      silhouette = document.createElement('canvas');
      silhouette.width = img.width;
      silhouette.height = img.height;
      const paint = silhouette.getContext('2d');
      if (!paint) return false;
      paint.drawImage(img, 0, 0);
      paint.globalCompositeOperation = 'source-in';
      paint.fillStyle = '#2a1838';
      paint.fillRect(0, 0, silhouette.width, silhouette.height);
      this.silhouettes.set(url, silhouette);
    }
    const scale = size / Math.max(silhouette.width, silhouette.height);
    const w = silhouette.width * scale, h = silhouette.height * scale;
    ctx.drawImage(silhouette, -w / 2, -h / 2, w, h);
    return true;
  }

  drawCover(ctx: CanvasRenderingContext2D, url: string, x: number, y: number, w: number, h: number, alpha = 1): boolean {
    const img = this.images.get(url);
    if (!img) return false;
    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.drawImage(img, x, y, w, h);
    ctx.restore();
    return true;
  }

  private fetchOne(url: string): Promise<void> {
    return new Promise((resolve) => {
      const img = new Image();
      img.decoding = 'async';
      img.fetchPriority = 'low';
      img.onload = () => {
        this.images.set(url, img);
        this.markLoaded();
        this.emitReady();
        resolve();
      };
      img.onerror = () => {
        this.failed.add(url);
        this.markLoaded();
        if (DEV) console.warn(`[SKYREALM] missing asset ${url}`);
        resolve();
      };
      img.src = url;
    });
  }
}

export const assets = new AssetLoader();
