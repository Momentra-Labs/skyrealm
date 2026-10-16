import { EnemyType, RunMode } from '../types/game.ts';
import type { BossKind, EnemyType as En, WorldId } from '../types/game.ts';
import { WORLD_LIST } from './content/worlds.ts';
import { WORLD_BOSS } from './content/bosses.ts';
import { WORLD_WAVES } from './content/formations.ts';
import type { WavePiece } from './content/formations.ts';
import { chance, pick, randRange } from '../utils/random.ts';

export interface DirectorEvent {
  spawn?: { type: En; count: number };
  form?: WavePiece;
  boss?: BossKind;
  banner?: string;
  worldId: WorldId;
}

export class RunDirector {
  time = 0;
  biomeIndex = 0;
  spawnCd = 0.4;
  formCd = 5.5;
  eliteCd = 22;
  bossCd = 75;
  crateCd = 18;
  ramp = 0;
  private formStep = 0;
  mode: RunMode = RunMode.NORMAL;
  raidKind: BossKind | null = null;
  raidStarted = false;
  stage = 1;
  recovery = 0;
  private awaitingBoss = false;

  start(mode: RunMode, raidKind?: BossKind): void {
    this.time = 0;
    this.biomeIndex = 0;
    this.spawnCd = 0.35;
    this.formCd = 5.2;
    this.formStep = 0;
    this.eliteCd = 20;
    this.bossCd = mode === RunMode.TRAINING ? 9999 : 45;
    this.stage = 1;
    this.recovery = 0;
    this.awaitingBoss = false;
    this.crateCd = 16;
    this.ramp = 0;
    this.mode = mode;
    this.raidKind = raidKind ?? null;
    this.raidStarted = false;
  }

  world() {
    return WORLD_LIST[this.biomeIndex % WORLD_LIST.length]!;
  }

  bossDefeated(): void {
    if (this.mode !== RunMode.NORMAL) return;
    this.stage += 1;
    this.awaitingBoss = false;
    this.recovery = 4;
    this.bossCd = 45;
    this.spawnCd = 0.8;
    this.formCd = 2;
    this.eliteCd = 20;
    this.crateCd = 14;
  }

  hpScale(): number {
    return 1 + this.ramp * 0.14;
  }

  speedScale(): number {
    return 1 + this.ramp * 0.085;
  }

  update(dt: number, fightingBoss: boolean): DirectorEvent[] {
    this.time += dt;
    const events: DirectorEvent[] = [];
    const world = this.world();
    if (this.mode === RunMode.RAID) {
      if (!this.raidStarted && !fightingBoss) {
        this.raidStarted = true;
        events.push({ boss: this.raidKind ?? WORLD_BOSS[world.id], banner: 'RAID BOSS', worldId: world.id });
      }
      return events;
    }

    if (fightingBoss || this.awaitingBoss) return events;
    if (this.recovery > 0) {
      this.recovery = Math.max(0, this.recovery - dt);
      if (this.recovery === 0) {
        this.biomeIndex = (this.stage - 1) % WORLD_LIST.length;
        this.ramp = this.stage - 1;
        this.formStep = 0;
        events.push({ banner: `REALM ${this.stage} · ${this.world().name}`, worldId: this.world().id });
      }
      return events;
    }

    this.spawnCd -= dt;
    this.formCd -= dt;
    this.eliteCd -= dt;
    this.bossCd -= dt;
    this.crateCd -= dt;

    if (this.bossCd <= 0 && this.mode === RunMode.NORMAL) {
      this.awaitingBoss = true;
      events.push({ boss: WORLD_BOSS[world.id], banner: 'BOSS APPROACHING', worldId: world.id });
      return events;
    }

    if (this.formCd <= 0) {
      this.formCd = Math.max(5.8, 9.4 - this.ramp * 0.4);
      const catalog = WORLD_WAVES[world.id];
      const piece = catalog[this.formStep % catalog.length]!;
      this.formStep += 1;
      events.push({ form: piece, banner: piece.banner, worldId: world.id });
    }
    if (this.spawnCd <= 0) {
      this.spawnCd = Math.max(0.48, 1.32 - this.ramp * 0.09);
      const type = pick([...world.foes]);
      const count = type === EnemyType.SWARM || type === EnemyType.SPORE ? randRange(4, 8) : chance(0.35) ? 2 : 1;
      events.push({ spawn: { type, count }, worldId: world.id });
    }
    if (this.eliteCd <= 0 && this.mode !== RunMode.TRAINING) {
      this.eliteCd = 26 - Math.min(8, this.ramp);
      events.push({ spawn: { type: chance(0.35) ? EnemyType.MINI_BOSS : EnemyType.ELITE, count: 1 }, banner: 'ELITE!', worldId: world.id });
    }
    if (this.crateCd <= 0) {
      this.crateCd = 20;
      events.push({ spawn: { type: EnemyType.LOOT_CRATE, count: 1 }, worldId: world.id });
    }
    return events;
  }
}
