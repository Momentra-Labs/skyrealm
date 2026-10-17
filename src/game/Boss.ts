import { LOGICAL_WIDTH } from './constants.ts';
import { BossKind, EnemyType, ProjectileKind } from '../types/game.ts';
import type { BossKind as BossKindT, ProjectileKind as ProjectileKindT } from '../types/game.ts';
import type { EnemyProjectile, MuzzleCue } from './EnemyProjectile.ts';
import type { ObjectPool } from './ObjectPool.ts';
import type { Player } from './Player.ts';
import { randRange } from '../utils/random.ts';
import { squashScale } from './cartoon.ts';
import { BOSS_META } from './content/bosses.ts';
import { drawBossSprite } from '../assets/drawEntity.ts';

type MoveId =
  | 'triple-bite' | 'venom-fan' | 'coil-sweep'
  | 'flame-fan' | 'phoenix-spiral' | 'ember-ring'
  | 'ground-slam' | 'hail-wall' | 'seeker-shards'
  | 'double-helix' | 'shadow-lunge'
  | 'chain-lightning' | 'storm-grid' | 'tempest-ring';

/** Each attack family's signature moves, unlocked as the boss loses health. */
const MOVES: Record<'hydra' | 'queen' | 'titan' | 'serpent' | 'storm', readonly { id: MoveId; name: string; phase: number }[]> = {
  hydra: [
    { id: 'triple-bite', name: 'TRIPLE BITE', phase: 1 },
    { id: 'venom-fan', name: 'VENOM FAN', phase: 1 },
    { id: 'coil-sweep', name: 'COIL SWEEP', phase: 2 },
  ],
  queen: [
    { id: 'flame-fan', name: 'FLAME FAN', phase: 1 },
    { id: 'phoenix-spiral', name: 'PHOENIX SPIRAL', phase: 1 },
    { id: 'ember-ring', name: 'EMBER RING', phase: 2 },
  ],
  titan: [
    { id: 'ground-slam', name: 'GROUND SLAM', phase: 1 },
    { id: 'hail-wall', name: 'HAIL WALL', phase: 1 },
    { id: 'seeker-shards', name: 'SEEKER SHARDS', phase: 2 },
  ],
  serpent: [
    { id: 'double-helix', name: 'DOUBLE HELIX', phase: 1 },
    { id: 'shadow-lunge', name: 'SHADOW LUNGE', phase: 1 },
    { id: 'venom-fan', name: 'VENOM FAN', phase: 3 },
  ],
  storm: [
    { id: 'chain-lightning', name: 'CHAIN LIGHTNING', phase: 1 },
    { id: 'storm-grid', name: 'STORM GRID', phase: 1 },
    { id: 'tempest-ring', name: 'TEMPEST RING', phase: 2 },
  ],
};

export class Boss {
  kind: BossKindT = BossKind.IRON_HYDRA;
  name = 'IRON HYDRA';
  raid = false;
  damageTaken = 0;
  x = LOGICAL_WIDTH * 0.5;
  y = 140;
  health = 1000;
  maxHealth = 1000;
  radius = 52;
  hitFlash = 0;
  fireCd = 0;
  patternCd = 0;
  age = 0;
  phase = 1;
  vx = 0;
  vy = 40;
  alive = true;
  intro = 1.2;
  lastPhase = 1;
  /** Name of the move being cast, shown as a callout. */
  move = '';
  /** Index into this boss's move list, so moves cycle instead of repeating. */
  private moveIndex = 0;
  /** Timed emissions of the move in progress. */
  private readonly queue: { at: number; run: () => void }[] = [];
  private castClock = 0;

  spawn(kind: BossKindT, hpScale: number, raid = false): void {
    const meta = BOSS_META[kind];
    this.kind = kind;
    this.name = meta.name;
    this.raid = raid;
    this.damageTaken = 0;
    this.health = (raid ? meta.raidHealth : meta.health) * hpScale;
    this.maxHealth = this.health;
    this.radius = meta.radius;
    this.x = LOGICAL_WIDTH * 0.5;
    this.y = -90;
    this.hitFlash = 0;
    this.fireCd = 1;
    this.patternCd = 0;
    this.age = 0;
    this.phase = 1;
    this.vx = 70;
    this.vy = 0;
    this.alive = true;
    this.intro = 1.4;
    this.lastPhase = 1;
    this.move = '';
    this.moveIndex = 0;
    this.queue.length = 0;
    this.castClock = 0;
  }

  /** True while a move is still unleashing its volleys. */
  casting(): boolean {
    return this.queue.length > 0;
  }

  phaseLine(): string {
    const lines = ['PHASE ONE', 'IT SEES YOU', 'THE REALM SHAKES', 'ENRAGE!'];
    return lines[this.phase - 1] ?? 'RAWR!';
  }

  hpRatio(): number {
    return this.health / this.maxHealth;
  }

  currentPhase(): number {
    const r = this.hpRatio();
    if (r > 0.7) return 1;
    if (r > 0.4) return 2;
    if (r > 0.15) return 3;
    return 4;
  }

  hurt(amount: number): boolean {
    this.health -= amount;
    this.damageTaken += amount;
    this.hitFlash = 0.08;
    if (this.health <= 0) {
      this.health = 0;
      this.alive = false;
      return true;
    }
    return false;
  }

  update(
    dt: number,
    player: Player,
    projectiles: EnemyProjectile[],
    pool: ObjectPool<EnemyProjectile>,
    spawnMinion: (type: EnemyType, y: number) => void,
    projSpeed: number,
    onAttack: () => void,
    onPhase?: (line: string) => void,
    onMuzzle?: MuzzleCue,
  ): void {
    this.age += dt;
    this.hitFlash = Math.max(0, this.hitFlash - dt);
    this.phase = this.currentPhase();
    if (this.phase !== this.lastPhase) {
      this.lastPhase = this.phase;
      onPhase?.(this.phaseLine());
    }
    // Hover clear of the boss health bar so the body stays readable.
    const targetY = 200;
    // One settle rate for the whole life of the boss, so the descent doesn't
    // visibly change pace at the instant the intro window closes.
    this.y += (targetY - this.y) * Math.min(1, dt * 2.2);
    if (this.intro > 0) {
      this.intro -= dt;
      // Drift sideways on the way down so the entrance has some sway to it, but
      // hold off on the bounce-off-the-walls patrol until the fight is live.
      this.x += this.vx * dt * 0.35;
      return;
    }
    this.x += this.vx * dt;
    if (this.x < 80 || this.x > LOGICAL_WIDTH - 80) this.vx *= -1;
    const rage = this.phase === 4;
    if (rage && BOSS_META[this.kind].pattern === 'serpent' && Math.random() < dt * 0.35) {
      this.x = randRange(90, LOGICAL_WIDTH - 90);
    }

    this.fireCd -= dt;
    this.patternCd -= dt;
    this.castClock += dt;
    // Run whatever volleys of the current move have come due.
    for (let i = this.queue.length - 1; i >= 0; i--) {
      if (this.queue[i]!.at <= this.castClock) {
        this.queue[i]!.run();
        this.queue.splice(i, 1);
      }
    }
    // Rest between moves shortens as the fight escalates.
    const rest = this.phase === 1 ? 1.9 : this.phase === 2 ? 1.55 : this.phase === 3 ? 1.25 : 0.95;
    if (this.fireCd <= 0 && !this.casting()) {
      this.fireCd = rest;
      this.castMove(player, projectiles, pool, projSpeed, onPhase);
      onMuzzle?.(this.x, this.y + 24, player.x - this.x, player.y - this.y - 24, BOSS_META[this.kind].element);
      onAttack();
    }
    if (this.patternCd <= 0) {
      this.patternCd = rage ? 3.2 : 5.5;
      const pat = BOSS_META[this.kind].pattern;
      if (pat === 'hydra') spawnMinion(EnemyType.SCOUT, this.x);
      if (pat === 'titan') {
        spawnMinion(EnemyType.DRONE, this.x - 40);
        spawnMinion(EnemyType.DRONE, this.x + 40);
      }
      if (pat === 'serpent' || pat === 'queen') spawnMinion(EnemyType.KAMIKAZE, this.x);
      if (pat === 'storm') spawnMinion(EnemyType.MAGE, this.x);
      if (rage) spawnMinion(EnemyType.SWARM, this.x);
    }
  }

  render(ctx: CanvasRenderingContext2D): void {
    const scale = squashScale(this.hitFlash, this.vy);
    const bob = Math.sin(this.age * 4) * 3;
    const pulse = 1 + Math.sin(this.age * 6) * 0.08;
    ctx.save();
    ctx.translate(this.x, this.y + bob);
    ctx.scale(scale.sx * pulse, scale.sy * pulse);
    if (this.hitFlash > 0) ctx.globalAlpha = 0.65;
    const pose = !this.alive ? 'death' : this.hitFlash > 0 ? 'hit' : this.fireCd < 0.2 ? 'attack' : 'idle';
    drawBossSprite(ctx, this.kind, this.radius, this.age, pose);
    ctx.restore();
  }

  /** Starts this boss's next signature move: queues its volleys and calls it out. */
  private castMove(
    player: Player,
    projectiles: EnemyProjectile[],
    pool: ObjectPool<EnemyProjectile>,
    projSpeed: number,
    onCallout?: (line: string) => void,
  ): void {
    const K = ProjectileKind;
    const fire = (vx: number, vy: number, kind: ProjectileKindT, dmg: number, ox = 0, oy = 24) =>
      this.shot(projectiles, pool, vx, vy, kind, dmg, projSpeed, ox, oy);
    const aimFrom = (ox: number, oy: number, speed: number) => {
      const dx = player.x - (this.x + ox);
      const dy = player.y - (this.y + oy);
      const d = Math.hypot(dx, dy) || 1;
      return { vx: (dx / d) * speed, vy: (dy / d) * speed };
    };
    const fan = (count: number, step: number, speed: number, kind: ProjectileKindT, dmg: number) => {
      const a = aimFrom(0, 24, speed);
      const base = Math.atan2(a.vy, a.vx);
      for (let i = 0; i < count; i++) {
        const ang = base + (i - (count - 1) / 2) * step;
        fire(Math.cos(ang) * speed, Math.sin(ang) * speed, kind, dmg);
      }
    };
    const ring = (count: number, speed: number, kind: ProjectileKindT, dmg: number, turn = 0) => {
      for (let i = 0; i < count; i++) {
        const ang = (Math.PI * 2 * i) / count + turn;
        fire(Math.cos(ang) * speed, Math.sin(ang) * speed, kind, dmg);
      }
    };
    const at = (delay: number, run: () => void) => {
      this.queue.push({ at: this.castClock + delay, run });
    };
    const rage = this.phase >= 4;
    const list = MOVES[BOSS_META[this.kind].pattern].filter((m) => m.phase <= this.phase);
    const move = list[this.moveIndex % list.length]!;
    this.moveIndex += 1;
    this.move = move.name;
    onCallout?.(move.name);

    switch (move.id) {
      case 'triple-bite':
        // Three heads snap in turn, each with a three-shot aimed burst.
        [-48, 0, 48].forEach((ox, h) => {
          for (let n = 0; n < 3; n++) {
            at(h * 0.14 + n * 0.1, () => {
              const a = aimFrom(ox, 30, 230);
              fire(a.vx, a.vy, K.STRAIGHT, 11, ox, 30);
            });
          }
        });
        break;
      case 'venom-fan':
        at(0, () => fan(9, 0.17, 170, K.SPREAD, 10));
        at(0.45, () => fan(8, 0.17, 150, K.SPREAD, 10));
        break;
      case 'coil-sweep':
        // A stream that sweeps the arena from one side to the other.
        for (let n = 0; n < 16; n++) {
          at(n * 0.06, () => {
            const ang = Math.PI * (0.18 + (0.64 * n) / 15);
            fire(Math.cos(ang) * 210, Math.sin(ang) * 210, K.STRAIGHT, 11);
          });
        }
        break;
      case 'flame-fan':
        at(0, () => fan(7, 0.2, 200, K.SPREAD, 11));
        at(0.3, () => fan(6, 0.2, 230, K.SPREAD, 11));
        break;
      case 'phoenix-spiral':
        // Two arms of fire wheeling out from the body.
        for (let n = 0; n < 22; n++) {
          at(n * 0.065, () => {
            for (let arm = 0; arm < 2; arm++) {
              const ang = n * 0.42 + arm * Math.PI;
              fire(Math.cos(ang) * 150, Math.sin(ang) * 150, K.STRAIGHT, 10);
            }
          });
        }
        break;
      case 'ember-ring':
        at(0, () => ring(14, 120, K.PLASMA, 13, this.age));
        at(0.35, () => ring(14, 150, K.STRAIGHT, 11, this.age + 0.22));
        break;
      case 'ground-slam':
        at(0, () => ring(12, 135, K.PLASMA, 14));
        at(0.28, () => ring(12, 95, K.PLASMA, 14, Math.PI / 12));
        break;
      case 'hail-wall': {
        // A falling row with a gap where the hero is, so it is always dodgeable.
        const gap = player.x;
        for (let n = 0; n < 11; n++) {
          const x = 30 + n * ((LOGICAL_WIDTH - 60) / 10);
          if (Math.abs(x - gap) < 58) continue;
          at(0, () => fire(0, 175, K.STRAIGHT, 12, x - this.x, -this.y - 10));
        }
        break;
      }
      case 'seeker-shards':
        for (let n = 0; n < 3; n++) {
          at(n * 0.2, () => {
            const a = aimFrom(0, 24, 110);
            fire(a.vx + (n - 1) * 70, a.vy, K.HOMING, 12);
          });
        }
        break;
      case 'double-helix':
        // Two streams that weave across each other on the way down.
        for (let n = 0; n < 20; n++) {
          at(n * 0.075, () => {
            const t = n * 0.32;
            fire(Math.sin(t) * 120, 170, K.STRAIGHT, 10, -26);
            fire(-Math.sin(t) * 120, 170, K.STRAIGHT, 10, 26);
          });
        }
        break;
      case 'shadow-lunge':
        at(0, () => {
          this.x = Math.max(90, Math.min(LOGICAL_WIDTH - 90, player.x + randRange(-60, 60)));
        });
        at(0.22, () => ring(12, 140, K.STRAIGHT, 11, this.age));
        at(0.4, () => {
          const a = aimFrom(0, 24, 210);
          fire(a.vx, a.vy, K.MISSILE, 14);
        });
        break;
      case 'chain-lightning':
        for (let n = 0; n < 6; n++) {
          at(n * 0.08, () => {
            const a = aimFrom(0, 24, 300);
            fire(a.vx, a.vy, K.STRAIGHT, 10);
          });
        }
        break;
      case 'storm-grid':
        // Bolts drop from the sky in alternating columns.
        for (let col = 0; col < 6; col++) {
          const x = 45 + col * ((LOGICAL_WIDTH - 90) / 5);
          const delay = col % 2 ? 0.25 : 0;
          at(delay, () => fire(0, 210, K.STRAIGHT, 11, x - this.x, -this.y - 10));
          at(delay + 0.12, () => fire(0, 210, K.STRAIGHT, 11, x - this.x, -this.y - 10));
        }
        break;
      case 'tempest-ring':
        for (let w = 0; w < 3; w++) at(w * 0.22, () => ring(10, 140, K.SPREAD, 10, w * 0.31 + this.age));
        break;
    }
    // Enrage: every move ends with a hunting missile.
    if (rage) {
      at(0.5, () => {
        const a = aimFrom(0, 24, 200);
        fire(a.vx, a.vy, K.MISSILE, 14);
      });
    }
  }

  private shot(
    projectiles: EnemyProjectile[],
    pool: ObjectPool<EnemyProjectile>,
    vx: number,
    vy: number,
    kind: (typeof ProjectileKind)[keyof typeof ProjectileKind],
    damage: number,
    projSpeed: number,
    ox = 0,
    oy = 24,
  ): void {
    const p = pool.acquire();
    if (!p) return;
    p.spawn(this.x + ox, this.y + oy, vx, vy, kind, damage, projSpeed, BOSS_META[this.kind].element);
    projectiles.push(p);
  }
}
