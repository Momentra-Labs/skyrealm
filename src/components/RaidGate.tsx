import { BossKind } from '../types/game.ts';
import type { SaveGame } from '../types/game.ts';
import { BOSS_LIST } from '../game/content/bosses.ts';
import { weaknessOf } from '../game/content/elements.ts';
import { HangarChrome } from './HangarChrome.tsx';
import { bossPath, elementAssets } from '../assets/assetManifest.ts';

interface Props {
  save: SaveGame;
  notice: string;
  onEnter: (kind: (typeof BossKind)[keyof typeof BossKind]) => void;
  onBack: () => void;
}

const RAID_SECONDS = 90;

export function RaidGate({ save, notice, onEnter, onBack }: Props) {
  const charged = save.profile.bossEnergy > 0;
  return (
    <HangarChrome title="BOSS RAID" save={save} notice={notice} onBack={onBack}>
      <p className="hangar-blurb">One Boss Energy opens a ninety-second fight. Trophies if you last.</p>
      {!charged && <p className="hangar-note">No Boss Energy. Fly or claim quests to refill a charge.</p>}
      <ul className="hangar-list">
        {BOSS_LIST.map((b) => (
          <li key={b.kind} className="hangar-item raid-item">
            <span className={`raid-portrait raid-el-${b.element.toLowerCase()}`}>
              <img src={bossPath(b.kind, 'portrait')} alt="" loading="lazy" decoding="async" />
              <img className="raid-badge" src={elementAssets[b.element]} alt="" />
            </span>
            <div>
              <strong>{b.name}</strong>
              <span>
                {b.element} · weak to {weaknessOf(b.element) ?? 'none'} · {b.raidHealth} HP · {RAID_SECONDS}s
              </span>
            </div>
            <button type="button" className="ns-btn ns-btn-primary" onClick={() => onEnter(b.kind)} disabled={!charged}>
              ENTER
            </button>
          </li>
        ))}
      </ul>
      <p className="hud-label">LOCAL BOARD</p>
      <ul className="stats">
        {[...save.raidGhosts].sort((a, b) => b.damage - a.damage).map((g) => (
          <li key={g.name + g.damage}>
            <span>{g.name}</span>
            <strong>{Math.round(g.damage).toLocaleString()}</strong>
          </li>
        ))}
      </ul>
    </HangarChrome>
  );
}
