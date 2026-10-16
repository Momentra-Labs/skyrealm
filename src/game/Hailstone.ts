import { LOGICAL_HEIGHT, LOGICAL_WIDTH } from './constants.ts';
import { randRange, randInt } from '../utils/random.ts';
import { drawFrostWind, drawHailstone } from './fantasyDraw.ts';
import { FROST_HAIL } from './content/hazards.ts';

export class Hailstone {
  x = 0;
  y = 0;
  vx = 0;
  vy = 0;
  radius = 9;
  health = 12;
  age = 0;
  spin = 0;
  variant: 0 | 1 | 2 = 0;

  spawn(x?: number, y?: number): void {
    this.x = x ?? randRange(40, LOGICAL_WIDTH - 40);
    this.y = y ?? -24;
    this.vx = randRange(-55, 55);
    this.vy = randRange(115, 195);
    this.radius = 9;
    this.health = 12;
    this.age = 0;
    this.variant = randInt(0, 2) as 0 | 1 | 2;
    // A round stone can tumble freely, so it spins livelier than a shard could.
    this.spin = randRange(-2.6, 2.6);
  }

  update(dt: number): boolean {
    this.age += dt;
    this.x += this.vx * dt;
    this.y += this.vy * dt + Math.sin(this.age * 5) * 10 * dt;
    if (this.x < 20 || this.x > LOGICAL_WIDTH - 20) this.vx *= -1;
    return this.y < LOGICAL_HEIGHT + 30 && this.health > 0;
  }

  hurt(amount: number): boolean {
    this.health -= amount;
    return this.health <= 0;
  }

  render(ctx: CanvasRenderingContext2D): void {
    ctx.save();
    ctx.translate(this.x, this.y);
    const len = this.radius * FROST_HAIL.plume;
    ctx.save();
    ctx.rotate(Math.atan2(-this.vy, -this.vx));
    ctx.translate(len * 0.5, 0);
    drawFrostWind(ctx, len, FROST_HAIL);
    ctx.restore();
    drawHailstone(ctx, this.radius, this.age * this.spin);
    ctx.restore();
  }
}
