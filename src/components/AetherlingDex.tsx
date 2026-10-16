import { ElementId } from '../types/game.ts';
import type { ElementId as El, OwnedAetherling, SaveGame } from '../types/game.ts';
import { SPECIES_LIST, SPECIES_META, aetherXpNeed, evolveNeed } from '../game/content/aetherlings.ts';
import { ABILITIES } from '../game/content/abilities.ts';
import { useEffect, useState } from 'react';
import { assets } from '../assets/AssetLoader.ts';
import { elementAssets, speciesAssetUrls } from '../assets/assetManifest.ts';
import { drawAetherSprite } from '../assets/drawEntity.ts';
import { HangarChrome } from './HangarChrome.tsx';
import { PortraitCanvas } from './PortraitCanvas.tsx';

interface Props {
  save: SaveGame;
  notice: string;
  onEquip: (slot: 0 | 1, id: string | null) => void;
  onEvolve: (id: string) => void;
  onDissolve: (id: string) => void;
  onBack: () => void;
}

export function AetherlingDex({ save, notice, onEquip, onEvolve, onDissolve, onBack }: Props) {
  const [filter, setFilter] = useState<'ALL' | 'OWNED' | 'LOCKED' | El>('ALL');
  const [pick, setPick] = useState<OwnedAetherling | null>(null);
  const ownedSpecies = new Set(save.aetherlings.map((u) => u.species));
  useEffect(() => {
    void assets.load(SPECIES_LIST.flatMap((sp) => speciesAssetUrls(sp)));
  }, []);

  return (
    <HangarChrome title="AETHERLINGS" save={save} notice={notice} onBack={onBack}>
        <div className="diff-row">
          {(['ALL', 'OWNED', 'LOCKED'] as const).map((f) => (
            <button key={f} type="button" className={`ns-btn ${filter === f ? 'ns-btn-primary' : ''}`} onClick={() => setFilter(f)}>
              {f}
            </button>
          ))}
          {Object.values(ElementId).map((f) => (
            <button key={f} type="button" className={`ns-btn ${filter === f ? 'ns-btn-primary' : ''}`} onClick={() => setFilter(f)}>
              {assets.has(elementAssets[f]) && <img className="el-ico" src={elementAssets[f]} alt="" />}
              {f}
            </button>
          ))}
        </div>
        <div className="dex-grid">
          {SPECIES_LIST.filter((sp) => {
            if (filter === 'OWNED') return ownedSpecies.has(sp);
            if (filter === 'LOCKED') return !ownedSpecies.has(sp);
            if (filter === 'ALL') return true;
            return SPECIES_META[sp].element === filter;
          }).map((sp) => {
            const known = save.discovered.includes(sp);
            const live = save.aetherlings.find((u) => u.species === sp);
            return (
              <button key={sp} type="button" className="dex-card" onClick={() => live && setPick(live)}>
                <PortraitCanvas size={72} offsetY={0} draw={(ctx) => drawAetherSprite(ctx, sp, 68, { silhouette: !known, pose: 'portrait' })} />
                <strong>{known ? SPECIES_META[sp].name : '???'}</strong>
                <small>{known ? `${SPECIES_META[sp].element} · ${live ? `★${live.stars} LV ${live.level}` : 'seen'}` : 'Unknown silhouette'}</small>
              </button>
            );
          })}
        </div>
        <p className="hud-label">OWNED</p>
        <ul className="hangar-list">
          {save.aetherlings.map((unit) => (
            <li key={unit.id} className="hangar-item">
              <div>
                <strong>
                  {SPECIES_META[unit.species].name} {'★'.repeat(unit.stars)}
                </strong>
                <span>
                  {unit.rarity} · {unit.element} · LV {unit.level} · XP {unit.xp}/{aetherXpNeed(unit.level)} · {ABILITIES[SPECIES_META[unit.species].ability].name}
                </span>
              </div>
              <div className="hangar-item-actions">
                <button type="button" className="ns-btn" onClick={() => onEquip(0, unit.id)}>LEFT</button>
                <button type="button" className="ns-btn" onClick={() => onEquip(1, unit.id)}>RIGHT</button>
                <button type="button" className="ns-btn" onClick={() => onEvolve(unit.id)}>EVOLVE</button>
                <button type="button" className="ns-btn" onClick={() => onDissolve(unit.id)}>ESSENCE</button>
              </div>
            </li>
          ))}
        </ul>
        {pick && <EvolvePreview unit={pick} onClose={() => setPick(null)} />}
    </HangarChrome>
  );
}

function EvolvePreview({ unit, onClose }: { unit: OwnedAetherling; onClose: () => void }) {
  const need = evolveNeed(unit.stars);
  const meta = SPECIES_META[unit.species];
  return (
    <div className="briefing">
      <span>EVOLUTION</span>
      <strong>{meta.name} {'★'.repeat(unit.stars)} → {need ? `${unit.stars + 1}★` : 'MAX'}</strong>
      <em>{need ? `Lv ${need.level} · ${need.essence} essence · ${need.shards} ${unit.element} shards` : 'Already soaring'}</em>
      <p className="muted">{ABILITIES[meta.ability].blurb}</p>
      <button type="button" className="ns-btn" onClick={onClose}>CLOSE</button>
    </div>
  );
}
