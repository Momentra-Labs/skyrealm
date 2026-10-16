import { useState } from 'react';
import type { SaveGame } from '../types/game.ts';
import { GUARDIAN_META } from '../game/content/guardians.ts';
import { SPECIES_META } from '../game/content/aetherlings.ts';
import { SkyrealmLogo } from './SkyrealmLogo.tsx';
import { aetherPath, guardianPath, uiAssets } from '../assets/assetManifest.ts';
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

export function Home({ save, notice, onPlay, onOpen, onLogin }: Props) {
  const [more, setMore] = useState(false);
  const g = GUARDIAN_META[save.equippedGuardian];
  const a = save.equipped.map((id) => save.aetherlings.find((unit) => unit.id === id));
  const leftSpecies = a[0]?.species;
  const rightSpecies = a[1]?.species;
  return (
    <div className="overlay overlay-menu overlay-home">
      <div className="menu-frame">

        <div className="home-layout">
          <div className="home-hero">
            <div className="home-brand-row">
              <SkyrealmLogo />
              <span className="home-hangar-label">YOUR HANGAR</span>
            </div>
            <div className="home-fly">
              <div className="home-party-card">
                <div className="home-party-head">
                  <p className="home-party-kicker">YOUR PARTY</p>
                  <p className="home-party-hint">Tap a face to change</p>
                </div>
                <div className="home-party">
                  <button type="button" className="home-party-slot" onClick={() => onOpen('GUARDIANS')} aria-label="Change guardian">
                    <span className="home-party-face">
                      <img className="home-party-art" src={guardianPath(save.equippedGuardian, 'portrait')} alt="" />
                    </span>
                    <span className="home-party-name">{g.name}</span>
                    <span className="home-party-role">LV {save.guardians[save.equippedGuardian].level} · GUARDIAN</span>
                  </button>
                  <button type="button" className="home-party-slot" onClick={() => onOpen('AETHERLINGS')} aria-label={a[0] ? `Change ${SPECIES_META[a[0].species].name}` : 'Add companion'}>
                    <span className={`home-party-face${a[0] ? '' : ' is-open'}`}>
                      {leftSpecies && <img className="home-party-art" src={aetherPath(leftSpecies, 'portrait')} alt="" />}
                      {!a[0] && <span className="home-party-plus">+</span>}
                    </span>
                    <span className="home-party-name">{a[0] ? SPECIES_META[a[0].species].name : 'ADD FRIEND'}</span>
                    <span className="home-party-role">{a[0] ? 'COMPANION' : 'EMPTY SLOT'}</span>
                  </button>
                  <button type="button" className="home-party-slot" onClick={() => onOpen('AETHERLINGS')} aria-label={a[1] ? `Change ${SPECIES_META[a[1].species].name}` : 'Add companion'}>
                    <span className={`home-party-face${a[1] ? '' : ' is-open'}`}>
                      {rightSpecies && <img className="home-party-art" src={aetherPath(rightSpecies, 'portrait')} alt="" />}
                      {!a[1] && <span className="home-party-plus">+</span>}
                    </span>
                    <span className="home-party-name">{a[1] ? SPECIES_META[a[1].species].name : 'ADD FRIEND'}</span>
                    <span className="home-party-role">{a[1] ? 'COMPANION' : 'EMPTY SLOT'}</span>
                  </button>
                </div>
              </div>
              <div className="home-stats">
                <span className="home-chip">HIGH {Math.round(save.settings.highScore).toLocaleString()}</span>
                <button type="button" className="home-chip" onClick={() => onOpen('SHOP')} aria-label="Open shop">
                  <img src={uiAssets.coin} alt="" />
                  COINS {Math.round(save.profile.coins).toLocaleString()}
                </button>
                <button type="button" className="home-chip" onClick={() => onOpen('SHOP')} aria-label="Open shop">
                  <img src={uiAssets.crystal} alt="" />
                  CRYSTALS {Math.round(save.profile.crystals).toLocaleString()}
                </button>
                <button type="button" className="home-chip" onClick={() => onOpen('ACHIEVEMENTS')} aria-label="Open achievements">
                  <img src={uiAssets.trophy} alt="" />
                  TROPHIES {Math.round(save.profile.trophies).toLocaleString()}
                </button>
                <button type="button" className="home-chip" onClick={() => onOpen('RAID')} aria-label="Open boss raid">
                  <img src={uiAssets.energy} alt="" />
                  ENERGY {Math.round(save.profile.bossEnergy).toLocaleString()}
                </button>
              </div>
              {notice && <p className="hangar-note">{notice}</p>}
              <button type="button" className="ns-btn ns-btn-primary home-play" onClick={onPlay}>
                TAKE FLIGHT
              </button>
              <p className="home-play-hint">Drag to steer · Auto-fire · Collect treasure</p>
            </div>
            <div className="home-nav">
              <div className="home-grid">
                <button type="button" className="ns-btn" onClick={() => onOpen('QUESTS')}>
                  <HomeGlyph kind="scroll" />
                  QUESTS
                  <small>Send party · Claim rewards</small>
                </button>
                <button type="button" className="ns-btn" onClick={() => onOpen('RAID')}>
                  <HomeGlyph kind="dragon" />
                  BOSS RAID
                  <small>Spend 1 Boss Energy</small>
                </button>
                <button type="button" className="ns-btn" onClick={() => onOpen('EGGS')}>
                  <HomeGlyph kind="egg" />
                  EGGS
                </button>
                <button type="button" className="ns-btn" onClick={() => onOpen('SHOP')}>
                  <HomeGlyph kind="pouch" />
                  SHOP
                </button>
              </div>
              <button
                type="button"
                className={`home-more-toggle${more ? ' is-open' : ''}`}
                aria-expanded={more}
                aria-controls="home-extra-options"
                onClick={() => setMore((open) => !open)}
              >
                {more ? 'FEWER OPTIONS −' : 'TRAINING, INVENTORY & MORE +'}
              </button>
              {more && (
                <div id="home-extra-options" className="home-grid home-grid-more">
                  <button type="button" className="ns-btn" onClick={() => onOpen('TRAINING')}>
                    <HomeGlyph kind="sword" />
                    TRAINING
                    <small>Practice. No spoils.</small>
                  </button>
                  <button type="button" className="ns-btn" onClick={() => onOpen('INVENTORY')}>
                    <HomeGlyph kind="satchel" />
                    INVENTORY
                  </button>
                  <button type="button" className="ns-btn" onClick={() => onOpen('ACHIEVEMENTS')}>
                    <HomeGlyph kind="star" />
                    ACHIEVEMENTS
                  </button>
                  {web3UiOn() && (
                    <button type="button" className="ns-btn" onClick={() => onOpen('COLLECTION')}>
                      <HomeGlyph kind="gem" />
                      COLLECTION
                    </button>
                  )}
                </div>
              )}
            </div>
            <nav className="home-help" aria-label="Help">
              <button type="button" className="home-text-link" onClick={() => onOpen('HOW_TO_PLAY')}>HOW TO PLAY</button>
              <button type="button" className="home-text-link" onClick={() => onOpen('SETTINGS')}>SETTINGS</button>
              <button type="button" className="home-text-link" onClick={onLogin}>DAILY LOGIN</button>
            </nav>
          </div>
        </div>
      </div>
    </div>
  );
}
