import { useState } from 'react';
import type { CSSProperties } from 'react';
import type { SaveGame } from '../types/game.ts';
import { EggTier, WorldId } from '../types/game.ts';
import { GUARDIAN_META } from '../game/content/guardians.ts';
import { SPECIES_META } from '../game/content/aetherlings.ts';
import { SkyrealmLogo } from './SkyrealmLogo.tsx';
import { aetherPath, eggAssets, envPath, guardianPath, uiAssets } from '../assets/assetManifest.ts';
import './lobby.css';
import { web3UiOn } from '../web3/flags.ts';

interface Props {
  save: SaveGame;
  notice: string;
  onPlay: () => void;
  onOpen: (id: 'GUARDIANS' | 'AETHERLINGS' | 'QUESTS' | 'RAID' | 'EGGS' | 'SHOP' | 'ACHIEVEMENTS' | 'INVENTORY' | 'TRAINING' | 'COLLECTION' | 'HOW_TO_PLAY' | 'SETTINGS') => void;
  onPop: () => void;
  onLogin: () => void;
}

type GlyphKind = 'scroll' | 'dragon' | 'egg' | 'pouch' | 'sword' | 'satchel' | 'star' | 'gem';

function HomeGlyph({ kind }: { kind: GlyphKind }) {
  return (
    <svg className="home-nav-glyph" viewBox="0 0 32 32" aria-hidden="true">
      {kind === 'scroll' && (
        <>
          <path fill="#ffe08a" stroke="#8a5405" strokeWidth="1.6" d="M7.5 8.5c0-1.8 2.4-3 5.2-3h9.6c1.4 0 2.2.9 2.2 2v17c0 1.1-.8 2-2.2 2H12.7c-2.8 0-5.2-1-5.2-2.8z" />
          <path fill="none" stroke="#8a5405" strokeWidth="1.4" strokeLinecap="round" d="M12 12.5h9M12 16.5h8M12 20.5h6" />
          <ellipse cx="7.6" cy="16" rx="2.4" ry="7.2" fill="#fff6e4" stroke="#8a5405" strokeWidth="1.5" />
        </>
      )}
      {kind === 'dragon' && (
        <>
          <path fill="#9ed49a" stroke="#8a5405" strokeWidth="1.6" d="M8 20c1.2-5 5-9.2 10.4-9.6 2.2-.2 4.2.5 5.6 1.8l2.6-2.2c.5 2.1.2 4.2-1 5.8 1.4 1.6 1.8 3.6 1.2 5.6-2.4.4-5 .2-7.2-1.1-1.6 2.4-4.4 3.8-7.6 3.6C9.2 24 7.6 22.2 8 20z" />
          <path fill="#ffe08a" stroke="#8a5405" strokeWidth="1.2" d="M11.2 12.4 8 8.8l3.8.6 1.6-3.4.6 3.8 3.4.4z" />
          <circle cx="20.2" cy="15.4" r="1.15" fill="#3a2450" />
        </>
      )}
      {kind === 'egg' && (
        <>
          <path fill="#fff6e4" stroke="#8a5405" strokeWidth="1.6" d="M16 5.5c4.6 0 8.2 6.2 8.2 12.2 0 4.6-3.4 8.3-8.2 8.3s-8.2-3.7-8.2-8.3C7.8 11.7 11.4 5.5 16 5.5z" />
          <path fill="#e8a41c" d="M13.2 12.2c.7-.4 1.5.2 1.2.9-.5.9-1.7.7-1.6-.2zM18.6 15.4c.8-.3 1.5.5 1.2 1.1-.5 1.1-1.9.7-1.5-.2zM15.2 19.6c.7-.5 1.6.2 1.2 1-.4.8-1.6.6-1.4-.2z" />
        </>
      )}
      {kind === 'pouch' && (
        <>
          <path fill="#e8a41c" stroke="#8a5405" strokeWidth="1.6" d="M11.2 12.5c.4-2.4 2-4 4.8-4s4.4 1.6 4.8 4c3.2.4 5 2.6 5 6.2 0 4.2-3.2 7.6-9.8 7.6s-9.8-3.4-9.8-7.6c0-3.6 1.8-5.8 5-6.2z" />
          <path fill="none" stroke="#8a5405" strokeWidth="1.5" strokeLinecap="round" d="M12.5 13.2c.6 1.4 2.2 2.2 3.5 2.2s2.9-.8 3.5-2.2" />
          <circle cx="16" cy="20.2" r="2.1" fill="#ffe08a" stroke="#8a5405" strokeWidth="1.3" />
        </>
      )}
      {kind === 'sword' && (
        <>
          <path fill="#ffe08a" stroke="#8a5405" strokeWidth="1.5" d="M18.6 6.2 25.8 13.4c.6.6.6 1.6 0 2.2l-1.4 1.4-9.8-9.8 1.4-1.4c.6-.6 1.6-.6 2.6 0z" />
          <path fill="#9ed49a" stroke="#8a5405" strokeWidth="1.5" d="M7.6 22.4c2.8-2.8 6.2-4 8.6-4.2l3.6 3.6c-.2 2.4-1.4 5.8-4.2 8.6l-2.2-2.2c.8-1.6 1.2-3 1.2-3s-1.4.4-3 1.2z" />
          <path fill="#e8a41c" stroke="#8a5405" strokeWidth="1.4" d="M12.2 14.8h7.4v3.2h-7.4z" transform="rotate(45 16 16.4)" />
        </>
      )}
      {kind === 'satchel' && (
        <>
          <path fill="#f3d9a8" stroke="#8a5405" strokeWidth="1.6" d="M8.2 13.2h15.6c1.4 0 2.4 1.2 2.2 2.6l-1.2 9.2c-.2 1.4-1.4 2.4-2.8 2.4H10c-1.4 0-2.6-1-2.8-2.4l-1.2-9.2c-.2-1.4.8-2.6 2.2-2.6z" />
          <path fill="none" stroke="#8a5405" strokeWidth="1.6" strokeLinecap="round" d="M11.2 13.2c0-3.2 2-5.4 4.8-5.4s4.8 2.2 4.8 5.4" />
          <circle cx="16" cy="20.6" r="1.6" fill="#e8a41c" stroke="#8a5405" strokeWidth="1.2" />
        </>
      )}
      {kind === 'star' && (
        <>
          <path fill="#ffe08a" stroke="#8a5405" strokeWidth="1.5" d="M16 5.2 18.8 12l7.4.6-5.6 4.8 1.8 7.2L16 20.8 9.6 24.6l1.8-7.2-5.6-4.8 7.4-.6z" />
          <circle cx="16" cy="15.2" r="2.1" fill="#fff6e4" stroke="#8a5405" strokeWidth="1.1" />
        </>
      )}
      {kind === 'gem' && (
        <>
          <path fill="#a6f8ff" stroke="#8a5405" strokeWidth="1.6" d="M16 5.6 26.2 13.2 16 26.4 5.8 13.2z" />
          <path fill="#17b4d9" stroke="#8a5405" strokeWidth="1.2" d="M16 5.6 19.8 13.2h-7.6z" />
          <path fill="#fff6e4" opacity="0.7" d="M10.4 13.2h5.2L12.2 20z" />
        </>
      )}
    </svg>
  );
}

type OpenId = Parameters<Props['onOpen']>[0];

function Badge({ n }: { n: number }) {
  return n > 0 ? <span className="lobby-badge">{n > 99 ? '99+' : n}</span> : null;
}

export function Home({ save, notice, onPlay, onOpen, onLogin }: Props) {
  const [more, setMore] = useState(false);
  const [now] = useState(() => Date.now());
  const gid = save.equippedGuardian;
  const g = GUARDIAN_META[gid];
  const level = save.guardians[gid].level;
  const pets = save.equipped.map((id) => save.aetherlings.find((unit) => unit.id === id));
  const eggs = Object.values(save.eggs).reduce((sum, n) => sum + n, 0);
  const questsReady = save.quests.filter((q) => q.endsAt <= now).length;
  const giftReady = save.daily.claimed < ((Math.max(1, save.daily.streak) - 1) % 7) + 1;
  const open = (id: OpenId) => () => onOpen(id);

  const petSlot = (index: 0 | 1) => {
    const unit = pets[index];
    const meta = unit ? SPECIES_META[unit.species] : null;
    return (
      <button
        type="button"
        className={`lobby-pet lobby-pet-${index ? 'right' : 'left'}${unit ? '' : ' is-empty'}`}
        style={meta ? ({ '--glow': meta.glow } as CSSProperties) : undefined}
        onClick={open('AETHERLINGS')}
        aria-label={meta ? `Change ${meta.name}` : 'Add companion'}
      >
        <span className="lobby-pet-art">
          {unit ? <img src={aetherPath(unit.species, 'portrait')} alt="" /> : <span className="lobby-plus">+</span>}
        </span>
        <span className="lobby-plate">
          <strong>{meta ? meta.name : 'EMPTY'}</strong>
          <small>{unit ? `LV ${unit.level} · ${'★'.repeat(unit.stars)}` : 'Add a companion'}</small>
        </span>
      </button>
    );
  };

  return (
    <div className="overlay overlay-menu overlay-home">
      <div className="menu-frame">
        <div className="lobby" style={{ '--realm': `url(${envPath(WorldId.CELESTIAL_RUINS, 'bg')})` } as CSSProperties}>
          <div className="lobby-sky" aria-hidden="true"><i /><i /></div>

          <header className="lobby-top">
            <button type="button" className="lobby-profile" onClick={open('GUARDIANS')} aria-label="Open guardian hall">
              <span className="lobby-avatar"><img src={guardianPath(gid, 'icon')} alt="" /><b>{level}</b></span>
              <span className="lobby-profile-text">
                <strong>{g.name}</strong>
                <small>BEST {Math.round(save.settings.highScore).toLocaleString()}</small>
              </span>
            </button>
            <div className="lobby-wallet">
              <button type="button" className="lobby-cur" onClick={open('SHOP')} aria-label={`Coins ${Math.round(save.profile.coins)}, open shop`}>
                <img src={uiAssets.coin} alt="" /><span>{Math.round(save.profile.coins).toLocaleString()}</span><i>+</i>
              </button>
              <button type="button" className="lobby-cur is-gem" onClick={open('SHOP')} aria-label={`Crystals ${Math.round(save.profile.crystals)}, open shop`}>
                <img src={uiAssets.crystal} alt="" /><span>{Math.round(save.profile.crystals).toLocaleString()}</span><i>+</i>
              </button>
            </div>
          </header>

          <div className="lobby-side" aria-label="Quick menu">
            <button type="button" className="lobby-round" onClick={onLogin} aria-label="Daily login reward">
              <HomeGlyph kind="star" />{giftReady && <span className="lobby-dot" />}
              <small>DAILY</small>
            </button>
            <button type="button" className="lobby-round" onClick={open('ACHIEVEMENTS')} aria-label="Achievements">
              <img src={uiAssets.trophy} alt="" /><small>{Math.round(save.profile.trophies)}</small>
            </button>
            <button type="button" className="lobby-round" onClick={open('SETTINGS')} aria-label="Settings">
              <svg viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M19.4 13a7.5 7.5 0 0 0 0-2l2-1.6-2-3.4-2.4 1a7.6 7.6 0 0 0-1.7-1L15 3.5h-4l-.4 2.5a7.6 7.6 0 0 0-1.7 1l-2.4-1-2 3.4 2 1.6a7.5 7.5 0 0 0 0 2l-2 1.6 2 3.4 2.4-1a7.6 7.6 0 0 0 1.7 1l.4 2.5h4l.4-2.5a7.6 7.6 0 0 0 1.7-1l2.4 1 2-3.4zM13 15.5a3.5 3.5 0 1 1 0-7 3.5 3.5 0 0 1 0 7z" transform="translate(-1 0)" /></svg>
              <small>SETUP</small>
            </button>
            <button type="button" className="lobby-round" onClick={open('HOW_TO_PLAY')} aria-label="How to play">
              <b>?</b><small>HELP</small>
            </button>
          </div>

          <section className="lobby-stage" aria-label="Your party">
            <div className="lobby-brand"><SkyrealmLogo /></div>
            <div className="lobby-portal" aria-hidden="true"><i /><i /></div>
            <div className="lobby-pedestal" aria-hidden="true" />
            <button type="button" className="lobby-hero" onClick={open('GUARDIANS')} aria-label={`Change guardian, ${g.name} equipped`}>
              <img src={guardianPath(gid, 'portrait')} alt="" />
            </button>
            {petSlot(0)}
            {petSlot(1)}
            <div className="lobby-nameplate">
              <span className={`lobby-rarity r-${g.rarity.toLowerCase()}`}>{g.rarity}</span>
              <strong>{g.name}</strong>
              <small>{g.title} · LV {level}</small>
            </div>
          </section>

          {notice && <p className="lobby-notice" role="status">{notice}</p>}

          <section className="lobby-modes" aria-label="Play">
            <button type="button" className="lobby-raid" onClick={open('RAID')}>
              <HomeGlyph kind="dragon" />
              <span><strong>BOSS RAID</strong><small><img src={uiAssets.energy} alt="" />{Math.round(save.profile.bossEnergy)} energy</small></span>
            </button>
            <button type="button" className="lobby-fly" onClick={onPlay}>
              <span className="lobby-fly-mode">ENDLESS FLIGHT</span>
              <strong>TAKE FLIGHT</strong>
            </button>
            <button type="button" className="lobby-raid" onClick={open('TRAINING')}>
              <HomeGlyph kind="sword" />
              <span><strong>TRAINING</strong><small>Practice run</small></span>
            </button>
          </section>

          {more && (
            <div id="lobby-more" className="lobby-more">
              <button type="button" onClick={open('INVENTORY')}><HomeGlyph kind="satchel" />INVENTORY</button>
              <button type="button" onClick={open('ACHIEVEMENTS')}><HomeGlyph kind="star" />ACHIEVEMENTS</button>
              {web3UiOn() && <button type="button" onClick={open('COLLECTION')}><HomeGlyph kind="gem" />COLLECTION</button>}
              <button type="button" onClick={open('HOW_TO_PLAY')}><b>?</b>HOW TO PLAY</button>
            </div>
          )}

          <nav className="lobby-dock" aria-label="Hangar">
            <button type="button" onClick={open('GUARDIANS')}><img src={guardianPath(gid, 'icon')} alt="" /><span>HEROES</span></button>
            <button type="button" onClick={open('AETHERLINGS')}><HomeGlyph kind="dragon" /><span>PETS</span></button>
            <button type="button" onClick={open('QUESTS')}><HomeGlyph kind="scroll" /><span>QUESTS</span><Badge n={questsReady} /></button>
            <button type="button" onClick={open('EGGS')}><img src={eggAssets[EggTier.EPIC]} alt="" /><span>EGGS</span><Badge n={eggs} /></button>
            <button type="button" onClick={open('SHOP')}><HomeGlyph kind="pouch" /><span>SHOP</span></button>
            <button type="button" className={more ? 'is-on' : ''} aria-expanded={more} aria-controls="lobby-more" onClick={() => setMore((v) => !v)}>
              <b className="lobby-more-ico">{more ? '×' : '⋯'}</b><span>MORE</span>
            </button>
          </nav>
        </div>
      </div>
    </div>
  );
}
