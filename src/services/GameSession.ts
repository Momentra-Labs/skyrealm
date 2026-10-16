import { AbilityId, EggTier, ElementId, GuardianId, Rarity, RunMode } from '../types/game.ts';
import type {
  DailyMission,
  OwnedAetherling,
  RunResult,
  SaveGame,
} from '../types/game.ts';
import { SaveManager } from '../save/SaveManager.ts';
import { GUARDIAN_LIST, guardianXpNeed } from '../game/content/guardians.ts';
import { SPECIES_LIST, SPECIES_META, aetherXpNeed, evolveNeed } from '../game/content/aetherlings.ts';
import { QUEST_DEFS } from '../game/content/quests.ts';
import { rollEggRarity } from '../game/content/eggs.ts';
import { newId, todayKey } from '../utils/ids.ts';
import { chance, pick } from '../utils/random.ts';

export const ACHIEVEMENTS = [
  { id: 'FIRST_FLIGHT', name: 'First Flight', blurb: 'Finish a run' },
  { id: 'CENTURION', name: 'Centurion', blurb: 'Destroy 100 enemies' },
  { id: 'BOSS_SLAYER', name: 'Boss Slayer', blurb: 'Defeat 10 bosses' },
  { id: 'COLLECTOR', name: 'Collector', blurb: 'Discover 12 Aetherlings' },
  { id: 'DEX_COMPLETE', name: 'Field Guide', blurb: 'Discover every Aetherling' },
  { id: 'EVOLUTION_MASTER', name: 'Evolution Master', blurb: 'Perform 10 evolutions' },
  { id: 'HIGH_FLYER', name: 'High Flyer', blurb: 'Raise a Guardian to 20' },
  { id: 'SOVEREIGN', name: 'Sovereign', blurb: 'Raise a Guardian to 50' },
  { id: 'TREASURE_HUNTER', name: 'Treasure Hunter', blurb: 'Bank 10,000 coins' },
  { id: 'RAIDER', name: 'Raider', blurb: 'Finish 3 raids' },
  { id: 'QUEST_RUNNER', name: 'Quest Runner', blurb: 'Claim 5 quests' },
] as const;

const LOGIN_REWARDS = [
  { coins: 80 },
  { crystals: 2 },
  { egg: EggTier.BASIC },
  { essence: 2 },
  { egg: EggTier.RARE },
  { energy: 2 },
  { crystals: 6, egg: EggTier.EPIC },
] as const;

export class GameSession {
  readonly save: SaveManager;

  constructor(save = new SaveManager()) {
    this.save = save;
    this.tickDaily();
    this.refreshUnlocks();
  }

  get data(): SaveGame {
    return this.save.data;
  }

  persist(): void {
    this.save.persist();
  }

  resetSave(): void {
    this.save.reset();
    this.tickDaily();
  }

  equippedUnits(): (OwnedAetherling | undefined)[] {
    return this.data.equipped.map((id) => this.data.aetherlings.find((u) => u.id === id));
  }

  findAether(id: string | null): OwnedAetherling | undefined {
    if (!id) return undefined;
    return this.data.aetherlings.find((u) => u.id === id);
  }

  finishTutorial(): void {
    this.data.tutorialDone = true;
    this.persist();
  }

  setGuardian(id: GuardianId): string {
    if (!this.data.guardians[id]?.unlocked) return 'Still sealed';
    this.data.equippedGuardian = id;
    this.persist();
    return '';
  }

  equipAether(slot: 0 | 1, id: string | null): void {
    const next: [string | null, string | null] = [...this.data.equipped];
    if (id) {
      if (next[slot === 0 ? 1 : 0] === id) next[slot === 0 ? 1 : 0] = null;
      next[slot] = id;
    } else next[slot] = null;
    this.data.equipped = next;
    this.persist();
  }

  dissolve(id: string): string {
    const unit = this.findAether(id);
    if (!unit) return 'Missing';
    if (this.data.equipped.includes(id)) return 'Unequip first';
    if (this.data.aetherlings.length <= 1) return 'Keep one companion';
    this.data.profile.essence += unit.stars >= 3 ? 3 : unit.rarity === Rarity.COMMON ? 1 : 2;
    this.data.aetherlings = this.data.aetherlings.filter((u) => u.id !== id);
    this.persist();
    return `+essence (${unit.species})`;
  }

  evolve(id: string): string {
    const unit = this.findAether(id);
    if (!unit) return 'Missing';
    const need = evolveNeed(unit.stars);
    if (!need) return 'Max stars';
    if (unit.level < need.level) return `Need level ${need.level}`;
    if (this.data.profile.essence < need.essence) return 'Need more essence';
    if (this.data.profile.shards[unit.element] < need.shards) return 'Need more shards';
    this.data.profile.essence -= need.essence;
    this.data.profile.shards[unit.element] -= need.shards;
    unit.stars = (unit.stars + 1) as 2 | 3 | 4;
    unit.history.push(`Evolved to ${unit.stars}★`);
    this.data.profile.evolutions += 1;
    this.refreshUnlocks();
    this.persist();
    return `Evolved to ${unit.stars}★`;
  }

  openEgg(tier: EggTier): { ok: false; reason: string } | { ok: true; unit: OwnedAetherling; duplicate: boolean } {
    if (this.data.eggs[tier] <= 0) return { ok: false, reason: 'No egg' };
    this.data.eggs[tier] -= 1;
    const rarity = rollEggRarity(tier);
    const species = pick(SPECIES_LIST);
    const owned = this.data.aetherlings.some((u) => u.species === species);
    if (owned && chance(0.55)) {
      this.data.profile.essence += rarity === Rarity.COMMON ? 1 : 2;
      this.noteDiscover(species);
      this.persist();
      const ghost: OwnedAetherling = {
        id: 'dup',
        species,
        rarity,
        level: 1,
        xp: 0,
        stars: 1,
        element: SPECIES_META[species].element,
        history: ['Duplicate'],
      };
      return { ok: true, unit: ghost, duplicate: true };
    }
    const unit: OwnedAetherling = {
      id: newId('ae'),
      species,
      rarity,
      level: 1,
      xp: 0,
      stars: 1,
      element: SPECIES_META[species].element,
      history: [`Hatched from ${tier} egg`],
    };
    this.data.aetherlings.push(unit);
    this.noteDiscover(species);
    if (!this.data.equipped[1]) this.data.equipped[1] = unit.id;
    this.persist();
    return { ok: true, unit, duplicate: false };
  }

  startQuest(defId: string): string {
    const def = QUEST_DEFS.find((q) => q.id === defId);
    if (!def) return 'Unknown quest';
    if (this.data.quests.length >= 2) return 'Two quests already fly';
    if (this.data.quests.some((q) => q.defId === defId)) return 'Already underway';
    this.data.quests.push({
      id: newId('q'),
      defId,
      endsAt: Date.now() + def.minutes * 60_000,
      guardian: this.data.equippedGuardian,
      companions: this.data.equipped.filter((id): id is string => !!id),
    });
    this.persist();
    return `Sent to ${def.name}`;
  }

  claimQuest(id: string): string {
    const q = this.data.quests.find((item) => item.id === id);
    if (!q) return 'Missing';
    if (Date.now() < q.endsAt) return 'Still in the field';
    const def = QUEST_DEFS.find((d) => d.id === q.defId);
    if (!def) return 'Missing';
    const g = this.data.guardians[q.guardian];
    const power = 1 + (g.level - 1) * 0.02 + q.companions.length * 0.08;
    this.data.profile.coins += Math.round(def.coins * power);
    this.data.profile.crystals += def.crystals;
    this.data.profile.essence += def.essence;
    this.grantGuardianXp(q.guardian, Math.round(def.xp * power));
    for (const cid of q.companions) {
      const unit = this.findAether(cid);
      if (unit) this.grantAetherXp(unit, Math.round(def.xp * 0.6));
    }
    if (chance(def.eggChance * power)) this.data.eggs.BASIC += 1;
    this.data.quests = this.data.quests.filter((item) => item.id !== id);
    this.data.profile.questsDone += 1;
    this.bumpMission('quest', 1);
    this.refreshUnlocks();
    this.persist();
    return `Claimed ${def.name}`;
  }

  claimLogin(): string {
    this.tickDaily();
    const day = ((this.data.daily.streak - 1) % 7) + 1;
    if (this.data.daily.claimed >= day) return 'Already claimed today';
    const reward = LOGIN_REWARDS[day - 1]!;
    if ('coins' in reward && reward.coins) this.data.profile.coins += reward.coins;
    if ('crystals' in reward && reward.crystals) this.data.profile.crystals += reward.crystals;
    if ('essence' in reward && reward.essence) this.data.profile.essence += reward.essence;
    if ('energy' in reward && reward.energy) this.data.profile.bossEnergy += reward.energy;
    if ('egg' in reward && reward.egg) this.data.eggs[reward.egg] += 1;
    this.data.daily.claimed = day;
    this.persist();
    return `Day ${day} claimed`;
  }

  buy(offerId: string): string {
    const offer = this.shopOffers().find((o) => o.id === offerId);
    if (!offer) return 'Gone';
    if (offer.pay === 'coins') {
      if (this.data.profile.coins < offer.cost) return 'Need coins';
      this.data.profile.coins -= offer.cost;
    } else {
      if (this.data.profile.crystals < offer.cost) return 'Need crystals';
      this.data.profile.crystals -= offer.cost;
    }
    if (offer.egg) this.data.eggs[offer.egg] += 1;
    if (offer.essence) this.data.profile.essence += offer.essence;
    if (offer.energy) this.data.profile.bossEnergy += offer.energy;
    if (offer.shard) this.data.profile.shards[offer.shard] += offer.shardAmt ?? 3;
    this.persist();
    return 'Purchased';
  }

  shopOffers(): { id: string; label: string; cost: number; pay: 'coins' | 'crystals'; egg?: EggTier; essence?: number; energy?: number; shard?: ElementId; shardAmt?: number }[] {
    const seed = todayKey().split('-').reduce((n, p) => n + Number(p), 0);
    const eggs = [EggTier.BASIC, EggTier.RARE, EggTier.EPIC, EggTier.LEGENDARY] as const;
    const els = [ElementId.FIRE, ElementId.WATER, ElementId.NATURE, ElementId.SHADOW] as const;
    return [
      { id: 'egg0', label: `${eggs[seed % 4]} egg`, cost: seed % 4 === 0 ? 180 : seed % 4 === 1 ? 2 : seed % 4 === 2 ? 5 : 12, pay: seed % 4 === 0 ? 'coins' : 'crystals', egg: eggs[seed % 4] },
      { id: 'ess', label: '3 Aether Essence', cost: 220, pay: 'coins', essence: 3 },
      { id: 'en', label: '2 Boss Energy', cost: 3, pay: 'crystals', energy: 2 },
      { id: 'sh', label: `${els[seed % 4]} shards x4`, cost: 140, pay: 'coins', shard: els[seed % 4], shardAmt: 4 },
    ];
  }

  guardianUpgradeCost(): number {
    return 100 + this.data.guardians[this.data.equippedGuardian].level * 40;
  }

  upgradeGuardian(): string {
    const guardian = this.data.guardians[this.data.equippedGuardian];
    if (guardian.level >= 50) return 'Guardian at maximum level';
    const cost = this.guardianUpgradeCost();
    if (this.data.profile.coins < cost) return 'Collect more coins on your next flight';
    this.data.profile.coins -= cost;
    guardian.level += 1;
    this.refreshUnlocks();
    this.persist();
    return `Guardian upgraded to level ${guardian.level}`;
  }

  spendRaidEnergy(): string {
    if (this.data.profile.bossEnergy <= 0) return 'Need boss energy';
    this.data.profile.bossEnergy -= 1;
    this.persist();
    return '';
  }

  applyRun(result: RunResult): void {
    const p = this.data.profile;
    p.coins += Math.round(result.coins);
    p.crystals += Math.round(result.crystals);
    p.trophies += result.trophies;
    p.essence += result.essence;
    p.totalCoins += result.coins;
    p.totalKills += result.kills;
    p.bossesKilled += result.bosses;
    if (result.mode === RunMode.NORMAL || result.mode === RunMode.RAID) p.runsPlayed += 1;
    if (result.mode === RunMode.RAID) {
      p.raidsDone += 1;
      this.data.raidGhosts = [...this.data.raidGhosts, { name: 'You', damage: result.bossDamage }]
        .sort((a, b) => b.damage - a.damage)
        .slice(0, 8);
    }
    for (const [el, n] of Object.entries(result.shards)) {
      if (n) p.shards[el as ElementId] += n;
    }
    for (const [tier, n] of Object.entries(result.eggs)) {
      if (n) this.data.eggs[tier as EggTier] += n;
    }
    if (result.score > this.data.settings.highScore) this.data.settings.highScore = result.score;
    this.grantGuardianXp(this.data.equippedGuardian, 18 + result.kills + result.bosses * 20);
    for (const unit of this.equippedUnits()) {
      if (unit) this.grantAetherXp(unit, 12 + Math.floor(result.kills / 3) + result.bosses * 10);
    }
    this.bumpMission('kills', result.kills);
    this.bumpMission('coins', result.coins);
    if (result.bosses > 0) this.bumpMission('boss', result.bosses);
    if (result.mode !== RunMode.TRAINING) this.bumpMission('run', 1);
    if (result.usedAbility) this.bumpMission('ability', 1);
    this.refreshUnlocks();
    this.persist();
  }

  applySettings(next: Partial<SaveGame['settings']>): void {
    this.data.settings = { ...this.data.settings, ...next };
    this.persist();
  }

  rememberWallet(address?: string): void {
    const lastAddress = address ?? this.data.web3?.lastAddress;
    if (this.data.web3?.lastAddress === lastAddress) return;
    this.data.web3 = { lastAddress };
    this.persist();
  }

  private grantGuardianXp(id: GuardianId, amount: number): void {
    const g = this.data.guardians[id];
    if (!g || g.level >= 50) return;
    g.xp += amount;
    while (g.level < 50 && g.xp >= guardianXpNeed(g.level)) {
      g.xp -= guardianXpNeed(g.level);
      g.level += 1;
    }
  }

  private grantAetherXp(unit: OwnedAetherling, amount: number): void {
    if (unit.level >= 40) return;
    unit.xp += amount;
    while (unit.level < 40 && unit.xp >= aetherXpNeed(unit.level)) {
      unit.xp -= aetherXpNeed(unit.level);
      unit.level += 1;
    }
  }

  private noteDiscover(species: OwnedAetherling['species']): void {
    if (!this.data.discovered.includes(species)) this.data.discovered.push(species);
  }

  private refreshUnlocks(): void {
    const p = this.data.profile;
    const g = this.data.guardians;
    if (p.runsPlayed >= 3) g[GuardianId.KAIRO].unlocked = true;
    if (p.bossesKilled >= 3) g[GuardianId.NYXARA].unlocked = true;
    if (p.questsDone >= 1) g[GuardianId.ELARA].unlocked = true;
    if (p.trophies >= 800) g[GuardianId.ORION].unlocked = true;
    if (p.evolutions >= 5) g[GuardianId.VESPER].unlocked = true;
    const maxG = Math.max(...GUARDIAN_LIST.map((id) => g[id].level));
    const set = (id: string, on: boolean) => {
      if (on) this.data.achievements[id] = true;
    };
    set('FIRST_FLIGHT', p.runsPlayed >= 1);
    set('CENTURION', p.totalKills >= 100);
    set('BOSS_SLAYER', p.bossesKilled >= 10);
    set('COLLECTOR', this.data.discovered.length >= 12);
    set('DEX_COMPLETE', this.data.discovered.length >= SPECIES_LIST.length);
    set('EVOLUTION_MASTER', p.evolutions >= 10);
    set('HIGH_FLYER', maxG >= 20);
    set('SOVEREIGN', maxG >= 50);
    set('TREASURE_HUNTER', p.totalCoins >= 10000);
    set('RAIDER', p.raidsDone >= 3);
    set('QUEST_RUNNER', p.questsDone >= 5);
  }

  private tickDaily(): void {
    const today = todayKey();
    if (this.data.daily.lastLogin !== today) {
      const yest = new Date();
      yest.setDate(yest.getDate() - 1);
      const yesterday = yest.toISOString().slice(0, 10);
      this.data.daily.streak = this.data.daily.lastLogin === yesterday ? this.data.daily.streak + 1 : 1;
      this.data.daily.lastLogin = today;
      if (this.data.daily.claimed >= 7) this.data.daily.claimed = 0;
    }
    if (this.data.daily.missionDay !== today) {
      this.data.daily.missionDay = today;
      this.data.daily.missions = this.rollMissions();
    }
    this.persist();
  }

  private rollMissions(): DailyMission[] {
    const pool: DailyMission[] = [
      { id: 'm1', kind: 'kills', label: 'Destroy 50 enemies', need: 50, have: 0, reward: { coins: 60 }, done: false },
      { id: 'm2', kind: 'coins', label: 'Collect 100 coins', need: 100, have: 0, reward: { crystals: 1 }, done: false },
      { id: 'm3', kind: 'boss', label: 'Defeat one boss', need: 1, have: 0, reward: { essence: 1 }, done: false },
      { id: 'm4', kind: 'run', label: 'Play 3 runs', need: 3, have: 0, reward: { coins: 80 }, done: false },
      { id: 'm5', kind: 'quest', label: 'Complete one quest', need: 1, have: 0, reward: { egg: EggTier.BASIC }, done: false },
      { id: 'm6', kind: 'ability', label: 'Use a Guardian ability', need: 1, have: 0, reward: { coins: 40 }, done: false },
    ];
    return pool.slice(0, 5);
  }

  private bumpMission(kind: string, amt: number): void {
    for (const m of this.data.daily.missions) {
      if (m.kind !== kind || m.done) continue;
      m.have = Math.min(m.need, m.have + amt);
      if (m.have >= m.need) {
        m.done = true;
        if (m.reward.coins) this.data.profile.coins += m.reward.coins;
        if (m.reward.crystals) this.data.profile.crystals += m.reward.crystals;
        if (m.reward.essence) this.data.profile.essence += m.reward.essence;
        if (m.reward.egg) this.data.eggs[m.reward.egg] += 1;
      }
    }
  }
}

export function companionHas(units: (OwnedAetherling | undefined)[], ability: AbilityId): boolean {
  return units.some((u) => u && SPECIES_META[u.species].ability === ability);
}
