import type { ReactNode } from 'react';
import type { SaveGame } from '../types/game.ts';
import { uiAssets } from '../assets/assetManifest.ts';

interface Props {
  title: string;
  save: SaveGame;
  onBack: () => void;
  notice?: string;
  children: ReactNode;
  wide?: boolean;
}

export function HangarChrome({ title, save, onBack, notice, children, wide = true }: Props) {
  const bank = [
    { icon: uiAssets.coin, label: 'Coins', value: save.profile.coins },
    { icon: uiAssets.crystal, label: 'Crystals', value: save.profile.crystals },
    { icon: uiAssets.energy, label: 'Boss energy', value: save.profile.bossEnergy },
  ];
  return (
    <div className="overlay">
      <div className={`panel hangar-panel${wide ? ' panel-wide' : ''}`}>
        <div className="hangar-chrome hangar-bar">
          <button type="button" className="hangar-arrow" onClick={onBack} aria-label="Back">
            <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M15 5 8 12l7 7" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" /></svg>
          </button>
          <h2>{title}</h2>
          <p className="hangar-bank hangar-pills">
            {bank.map((b) => (
              <span key={b.label} title={b.label}><img src={b.icon} alt={b.label} />{Math.round(b.value).toLocaleString()}</span>
            ))}
          </p>
        </div>
        {notice && <p className="hangar-note">{notice}</p>}
        {children}
      </div>
    </div>
  );
}
