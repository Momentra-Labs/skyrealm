import { LOGICAL_HEIGHT, LOGICAL_WIDTH } from './constants.ts';
import { ElementId, EnemyType, ProjectileKind } from '../types/game.ts';
import type { ElementId as El, EnemyType as EnemyTypeT } from '../types/game.ts';
import type { EnemyProjectile, MuzzleCue } from './EnemyProjectile.ts';
import type { ObjectPool } from './ObjectPool.ts';
import type { Player } from './Player.ts';
import { randRange } from '../utils/random.ts';
import { squashScale } from './cartoon.ts';
import { ENEMY_SCORE } from './content/enemies.ts';
import { drawFoeSprite } from '../assets/drawEntity.ts';

export class Enemy {
  type: EnemyTypeT = EnemyType.SCOUT;
  x = 0;
  y = 0;
  vx = 0;
  vy = 0;
  health = 10;
  maxHealth = 10;
  radius = 12;
  speed = 120;
  score = 100;
  fireCd = 0;
  age = 0;
  phase = 0;
  hitFlash = 0;
  alive = true;
  sequence = 0;
  ally = false;
  armored = false;
  cloakArmor = false;
  linger = 0;
  holdX = 750;
  element: El = ElementId.ARCANE;
  /** Follow-up shots left in the current burst, and the gap before the next. */
  burst = 0;
  burstCd = 0;

  spawn(type: EnemyTypeT, laneX: number, hpScale: number, speedScale: number): void {
    this.type = type;
    this.x = laneX;
    this.y = -28;
    this.age = 0;
    this.burst = 0;
    this.burstCd = 0;
    this.phase = randRange(0, Math.PI * 2);
    this.hitFlash = 0;
    this.alive = true;
    this.sequence = 0;
    this.ally = false;
    this.armored = false;
    this.cloakArmor = false;
    this.linger = 0;
    this.holdX = 750;
    this.score = ENEMY_SCORE[type];
    switch (type) {
      case EnemyType.SCOUT:
        this.health = 12 * hpScale;
        this.radius = 11;
        this.speed = 150 * speedScale;
        this.vx = 0;
        this.vy = this.speed;
        this.fireCd = 99;
        break;
      case EnemyType.DRONE:
        this.health = 24 * hpScale;
        this.radius = 14;
        this.speed = 92 * speedScale;
        this.vx = 0;
        this.vy = this.speed;
        this.fireCd = randRange(0.6, 1.4);
        break;
      case EnemyType.ZIGZAG:
        this.health = 20 * hpScale;
        this.radius = 12;
        this.speed = 125 * speedScale;
        this.vx = 0;
        this.vy = this.speed;
        this.fireCd = 99;
        break;
      case EnemyType.TANK:
        this.health = 86 * hpScale;
        this.radius = 20;
        this.speed = 52 * speedScale;
        this.vx = 0;
        this.vy = this.speed;
        this.fireCd = randRange(0.8, 1.6);
        break;
      case EnemyType.SWARM:
        this.health = 8 * hpScale;
        this.radius = 8;
        this.speed = 165 * speedScale;
        this.vx = randRange(-40, 40);
        this.vy = this.speed;
        this.fireCd = 99;
        break;
      case EnemyType.KAMIKAZE:
        this.health = 16 * hpScale;
        this.radius = 12;
        this.speed = 210 * speedScale;
        this.vx = 0;
        this.vy = this.speed * 0.45;
        this.fireCd = 99;
        break;
      case EnemyType.LOOT_CRATE:
        this.health = 36 * hpScale;
        this.radius = 16;
        this.speed = 70 * speedScale;
        this.vx = 0;
        this.vy = this.speed;
        this.fireCd = 99;
        break;
      case EnemyType.CRAWLER:
        this.health = 22 * hpScale;
        this.radius = 13;
        this.speed = 70 * speedScale;
        this.vx = 40;
        this.vy = this.speed;
        this.fireCd = 99;
        break;
      case EnemyType.FLYER:
        this.health = 18 * hpScale;
        this.radius = 12;
        this.speed = 140 * speedScale;
        this.vx = 0;
        this.vy = this.speed;
        this.fireCd = randRange(0.8, 1.5);
        break;
      case EnemyType.MAGE:
        this.health = 28 * hpScale;
        this.radius = 13;
        this.speed = 80 * speedScale;
        this.vx = 0;
        this.vy = this.speed;
        this.fireCd = 0.7;
        break;
      case EnemyType.BOMBER:
        this.health = 20 * hpScale;
        this.radius = 13;
        this.speed = 100 * speedScale;
        this.vx = 0;
        this.vy = this.speed;
        this.fireCd = 1.1;
        break;
      case EnemyType.ELITE:
        this.health = 120 * hpScale;
        this.radius = 18;
        this.speed = 70 * speedScale;
        this.vx = 0;
        this.vy = this.speed;
        this.fireCd = 0.7;
        break;
      case EnemyType.MINI_BOSS:
        this.health = 220 * hpScale;
        this.radius = 24;
        this.speed = 48 * speedScale;
        this.vx = 50;
        this.vy = this.speed * 0.6;
        this.fireCd = 0.55;
        break;
      case EnemyType.SPORE:
        this.health = 7 * hpScale;
        this.radius = 8;
        this.speed = 90 * speedScale;
        this.vx = randRange(-30, 30);
        this.vy = this.speed;
        this.fireCd = 99;
        break;
      case EnemyType.WISP_FOE:
        this.health = 14 * hpScale;
        this.radius = 10;
        this.speed = 130 * speedScale;
        this.vx = 0;
        this.vy = this.speed;
        this.fireCd = 99;
        break;
      case EnemyType.VOID_BAT:
        this.health = 16 * hpScale;
        this.radius = 12;
        this.speed = 150 * speedScale;
        this.vx = 0;
        this.vy = this.speed;
        this.fireCd = 99;
        break;
      case EnemyType.FROST_GOBLIN:
        this.health = 32 * hpScale;
        this.radius = 14;
        this.speed = 78 * speedScale;
        this.vx = 0;
        this.vy = this.speed;
        this.fireCd = 0.9;
        break;
      case EnemyType.BONE_WISP:
        this.health = 18 * hpScale;
        this.radius = 11;
        this.speed = 125 * speedScale;
        this.vx = 0;
        this.vy = this.speed;
        this.fireCd = 99;
        break;
      case EnemyType.AETHER_TICK:
        this.health = 9 * hpScale;
        this.radius = 8;
        this.speed = 170 * speedScale;
        this.vx = randRange(-50, 50);
        this.vy = this.speed;
        this.fireCd = 99;
        break;
      case EnemyType.CRYSTAL_GOLEM:
        this.health = 110 * hpScale;
        this.radius = 22;
        this.speed = 46 * speedScale;
        this.vx = 0;
        this.vy = this.speed;
        this.fireCd = 1.1;
        break;
      default:
        break;
    }
    this.maxHealth = this.health;
  }

  update(
    dt: number,
    player: Player,
    projectiles: EnemyProjectile[],
    pool: ObjectPool<EnemyProjectile>,
    projSpeed: number,
    onMuzzle?: MuzzleCue,
  ): boolean {
    const step = player.freezeTime > 0 ? dt * 0.35 : dt;
    this.age += step;
    this.hitFlash = Math.max(0, this.hitFlash - dt);
    switch (this.type) {
      case EnemyType.SCOUT: {
        const dx = player.x - this.x;
        this.vx = Math.max(-180, Math.min(180, dx * 1.6));
        this.x += this.vx * step;
        this.y += this.vy * step;
        break;
      }
      case EnemyType.ZIGZAG:
      case EnemyType.WISP_FOE:
      case EnemyType.VOID_BAT:
      case EnemyType.BONE_WISP:
        this.x += Math.sin(this.age * 6.2 + this.phase) * 110 * step;
        this.y += this.vy * step;
        break;
      case EnemyType.KAMIKAZE: {
        const dx = player.x - this.x;
        const dy = player.y - this.y;
        const dist = Math.hypot(dx, dy) || 1;
        this.vx += (dx / dist) * 480 * step;
        this.vy += (dy / dist) * 500 * step + Math.sin(this.age * 9) * 40;
        const mag = Math.hypot(this.vx, this.vy);
        const cap = this.speed;
        if (mag > cap) {
          this.vx = (this.vx / mag) * cap;
          this.vy = (this.vy / mag) * cap;
        }
        this.x += this.vx * step;
        this.y += this.vy * step;
        break;
      }
      default:
        this.x += this.vx * step;
        this.y += this.vy * step;
        if (this.type === EnemyType.CRAWLER && (this.x < 30 || this.x > LOGICAL_WIDTH - 30)) this.vx *= -1;
        break;
    }

    this.x = Math.max(18, Math.min(LOGICAL_WIDTH - 18, this.x));
    this.tryShoot(dt, player, projectiles, pool, projSpeed, onMuzzle);
    return this.y < LOGICAL_HEIGHT + 50 && this.health > 0;
  }

  hurt(amount: number): boolean {
    this.health -= amount;
    this.hitFlash = 0.08;
    if (this.health <= 0) {
      this.alive = false;
      return true;
    }
    return false;
  }

  render(ctx: CanvasRenderingContext2D): void {
    const bob = Math.sin(this.age * 8 + this.phase) * 1.4;
    const scale = squashScale(this.hitFlash, this.vx);
    ctx.save();
    ctx.translate(this.x, this.y + bob);
    ctx.scale(scale.sx, scale.sy);
    if (this.hitFlash > 0) ctx.globalAlpha = 0.7;
    drawFoeSprite(ctx, this.type, this.radius, this.age);
    ctx.restore();
  }

  private tryShoot(
    dt: number,
    player: Player,
    projectiles: EnemyProjectile[],
    pool: ObjectPool<EnemyProjectile>,
    projSpeed: number,
    onMuzzle?: MuzzleCue,
  ): void {
    if (this.ally) return;
    const T = EnemyType;
    const t = this.type;
    if (
      t !== T.DRONE && t !== T.TANK && t !== T.MAGE && t !== T.BOMBER && t !== T.FLYER &&
      t !== T.ELITE && t !== T.MINI_BOSS && t !== T.FROST_GOBLIN && t !== T.CRYSTAL_GOLEM
    )
      return;
    // Follow-up shots of a burst ride their own short clock.
    if (this.burst > 0) {
      this.burstCd -= dt;
      if (this.burstCd <= 0) {
        this.burst -= 1;
        this.burstCd = t === T.MAGE ? 0.16 : 0.11;
        const a = this.aimAt(player, t === T.FLYER ? 240 : 215);
        this.emit(projectiles, pool, a.vx, a.vy, ProjectileKind.STRAIGHT, 10, projSpeed);
        onMuzzle?.(this.x, this.y + this.radius, a.vx, a.vy, this.element);
      }
    }
    this.fireCd -= dt;
    if (this.fireCd > 0) return;
    // Each foe has its own attack, so a wave reads as a mix of threats rather
    // than a wall of identical pellets.
    this.fireCd = t === T.TANK ? 1.35 : t === T.ELITE || t === T.MINI_BOSS ? 1.6 : t === T.BOMBER ? 1.9 : t === T.CRYSTAL_GOLEM ? 1.8 : 1.45;
    let a = this.aimAt(player, 200);
    switch (t) {
      case T.TANK: // Cannon spread: three heavy shells.
        this.emit(projectiles, pool, -80, 190, ProjectileKind.SPREAD, 12, projSpeed);
        this.emit(projectiles, pool, 0, 220, ProjectileKind.PLASMA, 14, projSpeed);
        this.emit(projectiles, pool, 80, 190, ProjectileKind.SPREAD, 12, projSpeed);
        a = { vx: 0, vy: 220 };
        break;
      case T.MAGE: // Hex burst: an aimed bolt, two follow-ups, and a seeking eye.
        this.emit(projectiles, pool, a.vx, a.vy, ProjectileKind.STRAIGHT, 10, projSpeed);
        this.emit(projectiles, pool, a.vx * 0.55, a.vy * 0.55, ProjectileKind.HOMING, 11, projSpeed);
        this.burst = 2;
        this.burstCd = 0.16;
        break;
      case T.FLYER: // Quick double tap.
        a = this.aimAt(player, 240);
        this.emit(projectiles, pool, a.vx, a.vy, ProjectileKind.STRAIGHT, 10, projSpeed);
        this.burst = 1;
        this.burstCd = 0.11;
        break;
      case T.BOMBER: // Carpet bomb: a slow ring of six.
        for (let i = 0; i < 6; i++) {
          const ang = (Math.PI * 2 * i) / 6 + this.age;
          this.emit(projectiles, pool, Math.cos(ang) * 120, Math.sin(ang) * 120 + 60, ProjectileKind.PLASMA, 11, projSpeed);
        }
        a = { vx: 0, vy: 160 };
        break;
      case T.ELITE: // Five-way fan aimed at the hero.
        this.fan(projectiles, pool, a, 5, 0.22, ProjectileKind.SPREAD, 11, projSpeed);
        break;
      case T.MINI_BOSS: // Ring burst, then an aimed missile.
        for (let i = 0; i < 10; i++) {
          const ang = (Math.PI * 2 * i) / 10 + this.age * 0.7;
          this.emit(projectiles, pool, Math.cos(ang) * 135, Math.sin(ang) * 135, ProjectileKind.STRAIGHT, 11, projSpeed);
        }
        this.emit(projectiles, pool, a.vx * 1.1, a.vy * 1.1, ProjectileKind.MISSILE, 13, projSpeed);
        break;
      case T.FROST_GOBLIN: // Icicle trio: narrow and fast.
        a = this.aimAt(player, 260);
        this.fan(projectiles, pool, a, 3, 0.12, ProjectileKind.STRAIGHT, 10, projSpeed);
        break;
      case T.CRYSTAL_GOLEM: // Boulder lob flanked by two shards.
        a = this.aimAt(player, 150);
        this.emit(projectiles, pool, a.vx, a.vy, ProjectileKind.PLASMA, 15, projSpeed);
        this.fan(projectiles, pool, this.aimAt(player, 230), 2, 0.45, ProjectileKind.SPREAD, 10, projSpeed);
        break;
      default: // Drone: one aimed shot.
        this.emit(projectiles, pool, a.vx, a.vy, ProjectileKind.STRAIGHT, 12, projSpeed);
    }
    onMuzzle?.(this.x, this.y + this.radius, a.vx, a.vy, this.element);
  }

  /** Velocity toward where the hero is about to be. */
  private aimAt(player: Player, speed: number): { vx: number; vy: number } {
    const dx = player.x - this.x;
    const dy = player.y + player.vy * 0.12 - this.y;
    const dist = Math.hypot(dx, dy) || 1;
    return { vx: (dx / dist) * speed, vy: (dy / dist) * speed };
  }

  /** `count` shots spread evenly across `step` radians either side of `aim`. */
  private fan(
    projectiles: EnemyProjectile[],
    pool: ObjectPool<EnemyProjectile>,
    aim: { vx: number; vy: number },
    count: number,
    step: number,
    kind: ProjectileKind,
    damage: number,
    projSpeed: number,
  ): void {
    const base = Math.atan2(aim.vy, aim.vx);
    const speed = Math.hypot(aim.vx, aim.vy);
    for (let i = 0; i < count; i++) {
      const ang = base + (i - (count - 1) / 2) * step;
      this.emit(projectiles, pool, Math.cos(ang) * speed, Math.sin(ang) * speed, kind, damage, projSpeed);
    }
  }

  private emit(
    projectiles: EnemyProjectile[],
    pool: ObjectPool<EnemyProjectile>,
    vx: number,
    vy: number,
    kind: ProjectileKind,
    damage: number,
    projSpeed: number,
  ): void {
    const shot = pool.acquire();
    if (!shot) return;
    shot.spawn(this.x, this.y + this.radius, vx, vy, kind, damage, projSpeed, this.element);
    projectiles.push(shot);
  }
}

