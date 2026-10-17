import { useMemo, useState } from 'react';
import type { CSSProperties } from 'react';
import type { SaveGame, BossKind as BK, ElementId as El } from '../types/game.ts';
import { AetherlingSpecies, BossKind, EggTier, ElementId, GuardianId, Rarity, WorldId } from '../types/game.ts';
import { GUARDIAN_LIST, GUARDIAN_META } from '../game/content/guardians.ts';
import { SPECIES_LIST, SPECIES_META } from '../game/content/aetherlings.ts';
import { BOSS_LIST, BOSS_META, WORLD_BOSS } from '../game/content/bosses.ts';
import { ELEMENT_COLOR, ELEMENT_LIST } from '../game/content/elements.ts';
import { WORLDS } from '../game/content/worlds.ts';
import { aetherPath, bossPath, eggAssets, elementAssets, envPath, guardianPath, powerUpAssets, uiAssets } from '../assets/assetManifest.ts';
import { LandingNav } from './LandingNav.tsx';
import { SHOW_WORLDS } from './PromoFrame.tsx';
import { BRAND } from '../brand.ts';
import { SkyrealmLogo } from '../components/SkyrealmLogo.tsx';
import './landing.css';

interface Props { save: SaveGame; onPlay: () => void }

/** Each guardian's signature element, used for the showcase aura. */
const GUARDIAN_ELEMENT: Record<GuardianId, El> = {
  [GuardianId.AURELIA]: ElementId.LIGHT,
  [GuardianId.KAIRO]: ElementId.WATER,
  [GuardianId.NYXARA]: ElementId.SHADOW,
  [GuardianId.ELARA]: ElementId.NATURE,
  [GuardianId.ORION]: ElementId.ARCANE,
  [GuardianId.VESPER]: ElementId.SHADOW,
};

const RARITY_LABEL: Record<Rarity, string> = {
  [Rarity.COMMON]: 'Common', [Rarity.RARE]: 'Rare', [Rarity.EPIC]: 'Epic', [Rarity.LEGENDARY]: 'Legendary', [Rarity.MYTHIC]: 'Mythic',
};

const EGGS = [EggTier.BASIC, EggTier.RARE, EggTier.EPIC, EggTier.LEGENDARY, EggTier.MYTHIC] as const;

const ITEMS = [
  { image: powerUpAssets.CLOVER, name: 'Clover', text: 'Permanent attack boost for the flight' },
  { image: powerUpAssets.MAGNET, name: 'Magnet', text: 'Pulls every coin to you' },
  { image: powerUpAssets.DOUBLE, name: 'Double Shot', text: 'Twice the firepower' },
  { image: powerUpAssets.RUSH, name: 'Rush', text: 'Invincible charge' },
  { image: powerUpAssets.FREEZE, name: 'Time Freeze', text: 'Slow the whole sky' },
  { image: powerUpAssets.HEART, name: 'Heart', text: 'Restore health' },
];

const FAQ = [
  { q: 'Is Skyrealm play-to-earn?', a: 'Yes. Skyrealm is being built as a play-to-earn game on Base. Guardians, Aetherlings and Eggs are designed as collectibles you can own. Reward, token and marketplace details will be announced before launch.' },
  { q: 'How do I play?', a: 'Drag anywhere to steer. Your guardian and companions fire automatically. On desktop, WASD or the arrow keys work too. Press E, or tap the special button, when your energy is full.' },
  { q: 'How do I grow stronger?', a: 'Grab clovers during a flight to power up your attacks. Between flights, spend coins on guardian levels, hatch eggs for new Aetherlings, and evolve your favourites.' },
  { q: 'Do I need to download anything?', a: 'No. Skyrealm runs in your browser on phone, tablet and desktop.' },
  { q: 'Will my progress be saved?', a: 'Your progress is saved in this browser on this device. Clearing site data or using private browsing can remove it.' },
];

/** Normalised stat bars for the guardian showcase. */
function stats(id: GuardianId) {
  const g = GUARDIAN_META[id];
  return [
    { label: 'Attack speed', value: g.fireRate / 9 },
    { label: 'Power', value: g.damage / 1.15 },
    { label: 'Critical', value: g.crit / 0.24 },
  ];
}

function tint(color: string): CSSProperties {
  return { '--tint': color } as CSSProperties;
}

export function LandingPage({ save, onPlay }: Props) {
  const [spot, setSpot] = useState<GuardianId>(save.equippedGuardian);
  const [element, setElement] = useState<El | 'ALL'>('ALL');
  const [boss, setBoss] = useState<BK>(BossKind.EMBER_QUEEN);
  const hero = GUARDIAN_META[spot];
  const heroTint = ELEMENT_COLOR[GUARDIAN_ELEMENT[spot]];
  const foe = BOSS_META[boss];
  const pets = useMemo(() => SPECIES_LIST.filter(id => element === 'ALL' || SPECIES_META[id].element === element), [element]);
  const playLabel = save.profile.runsPlayed ? 'PLAY AGAIN' : 'PLAY NOW';

  return (
    <div className="lp" id="top">
      <a className="lp-skip" href="#lp-main">Skip to content</a>
      <LandingNav onPlay={onPlay} />

      <section className="lp-hero" aria-label="Welcome to Skyrealm">
        <div className="lp-hero-sky" aria-hidden="true">
          <i style={{ backgroundImage: `url(${envPath(WorldId.CELESTIAL_RUINS, 'bg')})` }} />
          <i style={{ backgroundImage: `url(${envPath(WorldId.CELESTIAL_RUINS, 'mid')})` }} />
          <i style={{ backgroundImage: `url(${envPath(WorldId.CELESTIAL_RUINS, 'fg')})` }} />
        </div>
        <div className="lp-motes" aria-hidden="true">{Array.from({ length: 14 }, (_, i) => <span key={i} style={{ '--i': i } as CSSProperties} />)}</div>
        <div className="lp-hero-stage" aria-hidden="true">
          <div className="lp-portal"><i /><i /></div>
          <img className="lp-hero-boss" src={bossPath(BossKind.AETHER_WYRM, 'portrait')} alt="" />
          <img className="lp-hero-g g-left" src={guardianPath(GuardianId.ELARA, 'portrait')} alt="" />
          <img className="lp-hero-g g-right" src={guardianPath(GuardianId.KAIRO, 'portrait')} alt="" />
          <img className="lp-hero-g g-center" src={guardianPath(GuardianId.AURELIA, 'portrait')} alt="" fetchPriority="high" />
          <img className="lp-hero-pet p-a" src={aetherPath(AetherlingSpecies.FLICKER, 'portrait')} alt="" />
          <img className="lp-hero-pet p-b" src={aetherPath(AetherlingSpecies.TIDECURL, 'portrait')} alt="" />
          <img className="lp-hero-pet p-c" src={aetherPath(AetherlingSpecies.LUMEN, 'portrait')} alt="" />
        </div>
        <div className="lp-hero-copy">
          <span className="lp-chip">◆ PLAY · COLLECT · EARN ◆</span>
          <h1><SkyrealmLogo /><span className="lp-sr">{BRAND.name}</span></h1>
          <p className="lp-hero-sub">GUARDIANS OF THE AETHER</p>
          <p className="lp-hero-line">Choose a Guardian. Bond two Aetherlings. Battle bosses across eight realms, and own everything you collect.</p>
          <div className="lp-hero-cta">
            <button className="lp-btn lp-btn-play" onClick={onPlay}><span>▶</span>{playLabel}</button>
            <a className="lp-btn lp-btn-ghost" href="#earn">HOW YOU EARN</a>
          </div>
          <p className="lp-hero-meta"><span>Built on Base</span><span>Phone &amp; desktop</span><span>No download</span></p>
        </div>
      </section>

      <main id="lp-main" tabIndex={-1}>
        <section className="lp-stats" aria-label="Skyrealm in numbers">
          {[['6', 'Guardians'], ['30', 'Aetherlings'], ['10', 'Bosses'], ['8', 'Realms'], ['5', 'Egg tiers']].map(([n, l]) => (
            <div key={l}><strong>{n}</strong><span>{l}</span></div>
          ))}
        </section>

        <section className="lp-section lp-loop" id="loop">
          <header className="lp-head"><p className="lp-kicker">THE GAME LOOP</p><h2>Fly. Hatch. Own.</h2></header>
          <div className="lp-loop-grid">
            <article className="lp-loop-card lp-reveal" style={{ backgroundImage: `url(${envPath(WorldId.EMBER_CANYON, 'bg')})` }}>
              <div className="lp-loop-art"><img src={bossPath(BossKind.EMBER_QUEEN, 'portrait')} alt="" /><img className="front" src={guardianPath(GuardianId.KAIRO, 'portrait')} alt="" /></div>
              <b>01</b><h3>Fly &amp; fight</h3><p>Drag to dodge while your party auto-fires. Chain combos, grab power-ups and take down the realm boss.</p>
            </article>
            <article className="lp-loop-card lp-reveal" style={{ backgroundImage: `url(${envPath(WorldId.CRYSTAL_FOREST, 'bg')})` }}>
              <div className="lp-loop-art eggs">{EGGS.slice(1, 4).map(t => <img key={t} src={eggAssets[t]} alt="" />)}</div>
              <b>02</b><h3>Hatch &amp; bond</h3><p>Crack eggs from Basic to Mythic. Discover 30 Aetherlings, level them up and evolve them to five stars.</p>
            </article>
            <article className="lp-loop-card lp-reveal" style={{ backgroundImage: `url(${envPath(WorldId.VOID_FRONTIER, 'bg')})` }}>
              <div className="lp-loop-art loot"><img src={uiAssets.coin} alt="" /><img src={uiAssets.crystal} alt="" /><img src={uiAssets.trophy} alt="" /></div>
              <b>03</b><h3>Own &amp; earn</h3><p>Your Guardians, Aetherlings and Eggs are on-chain collectibles. Play, collect and earn your way up.</p>
            </article>
          </div>
        </section>

        <section className="lp-guardians" id="guardians" style={tint(heroTint)}>
          <div className="lp-section">
            <header className="lp-head"><p className="lp-kicker">SIX HEROES</p><h2>Choose your Guardian</h2></header>
            <div className="lp-gshow" aria-live="polite">
              <div className="lp-gshow-art">
                <div className="lp-gshow-ring" />
                <img key={spot} src={guardianPath(spot, 'portrait')} alt={hero.name} />
              </div>
              <div className="lp-gshow-info">
                <div className="lp-tags">
                  <span className={`lp-rarity r-${hero.rarity.toLowerCase()}`}>{RARITY_LABEL[hero.rarity]}</span>
                  <span className="lp-el"><img src={elementAssets[GUARDIAN_ELEMENT[spot]]} alt="" />{GUARDIAN_ELEMENT[spot].toLowerCase()}</span>
                </div>
                <p className="lp-gshow-title">{hero.title}</p>
                <h3>{hero.name}</h3>
                <p className="lp-gshow-blurb">{hero.blurb}.</p>
                <dl className="lp-bars">
                  {stats(spot).map(s => (
                    <div key={s.label}><dt>{s.label}</dt><dd><i style={{ width: `${Math.round(Math.min(1, s.value) * 100)}%` }} /></dd></div>
                  ))}
                </dl>
                <div className="lp-skill"><span>SPECIAL</span><strong>{hero.special}</strong><p>{hero.specialBlurb}</p></div>
                <div className="lp-skill"><span>PASSIVE</span><p>{hero.passive}</p></div>
                <p className="lp-unlock">{save.guardians[spot].unlocked ? `✓ Unlocked · Level ${save.guardians[spot].level}` : `🔒 Unlock: ${hero.unlock}`}</p>
              </div>
            </div>
            <div className="lp-groster" role="group" aria-label="Choose a guardian to preview">
              {GUARDIAN_LIST.map(id => (
                <button key={id} className={`lp-gpick${spot === id ? ' is-on' : ''}`} style={tint(ELEMENT_COLOR[GUARDIAN_ELEMENT[id]])} aria-pressed={spot === id} onClick={() => setSpot(id)}>
                  <img src={guardianPath(id, 'icon')} alt="" loading="lazy" /><strong>{GUARDIAN_META[id].name}</strong>
                </button>
              ))}
            </div>
          </div>
        </section>

        <section className="lp-section lp-pets" id="aetherlings">
          <header className="lp-head"><p className="lp-kicker">30 COMPANIONS · 6 ELEMENTS</p><h2>Bond your Aetherlings</h2><p className="lp-copy">Bring two into every flight. Mix elements to hit boss weaknesses: fire burns nature, nature drinks water, water douses fire, and light and shadow cancel each other out.</p></header>
          <div className="lp-filter" role="group" aria-label="Filter by element">
            <button className={element === 'ALL' ? 'is-on' : ''} aria-pressed={element === 'ALL'} onClick={() => setElement('ALL')}>All</button>
            {ELEMENT_LIST.map(el => (
              <button key={el} className={element === el ? 'is-on' : ''} style={tint(ELEMENT_COLOR[el])} aria-pressed={element === el} onClick={() => setElement(el)}>
                <img src={elementAssets[el]} alt="" />{el.toLowerCase()}
              </button>
            ))}
          </div>
          <div className="lp-pet-grid">
            {pets.map(id => {
              const s = SPECIES_META[id];
              return (
                <figure key={id} className="lp-pet" style={tint(s.glow)}>
                  <img src={aetherPath(id, 'portrait')} alt="" loading="lazy" />
                  <figcaption><strong>{s.name}</strong><span>{s.blurb}</span></figcaption>
                  <img className="lp-pet-el" src={elementAssets[s.element]} alt={s.element.toLowerCase()} />
                </figure>
              );
            })}
          </div>
          <div className="lp-eggs">
            {EGGS.map(t => <figure key={t}><img src={eggAssets[t]} alt="" loading="lazy" /><figcaption>{t.toLowerCase()}</figcaption></figure>)}
          </div>
        </section>

        <section className="lp-bosses" id="bosses" style={{ ...tint(ELEMENT_COLOR[foe.element]), backgroundImage: `url(${envPath(foe.world, 'bg')})` }}>
          <div className="lp-section">
            <header className="lp-head"><p className="lp-kicker">10 WORLD BOSSES</p><h2>Face the titans of the sky</h2></header>
            <div className="lp-boss-show" aria-live="polite">
              <img key={boss} className="lp-boss-art" src={bossPath(boss, 'portrait')} alt={foe.name} />
              <div className="lp-boss-card">
                <span className="lp-warn">⚠ BOSS INCOMING</span>
                <h3>{foe.name}</h3>
                <p className="lp-boss-realm">Rules over {WORLDS[foe.world].name}</p>
                <div className="lp-hp"><span>RAID HP</span><i /><b>{foe.raidHealth.toLocaleString()}</b></div>
                <ul className="lp-loot">
                  <li><img src={uiAssets.coin} alt="" />{foe.coins} coins</li>
                  <li><img src={uiAssets.crystal} alt="" />{foe.crystals} crystals</li>
                  <li><img src={uiAssets.trophy} alt="" />{foe.trophies} trophies</li>
                </ul>
                <button className="lp-btn lp-btn-play sm" onClick={onPlay}>ENTER BOSS RAID</button>
              </div>
            </div>
            <div className="lp-boss-strip" role="group" aria-label="Choose a boss to preview">
              {BOSS_LIST.map(b => (
                <button key={b.kind} className={boss === b.kind ? 'is-on' : ''} style={tint(ELEMENT_COLOR[b.element])} aria-pressed={boss === b.kind} aria-label={b.name} onClick={() => setBoss(b.kind)}>
                  <img src={bossPath(b.kind, 'icon')} alt="" loading="lazy" />
                </button>
              ))}
            </div>
          </div>
        </section>

        <section className="lp-section lp-realms" id="world">
          <header className="lp-head"><p className="lp-kicker">ONE ENDLESS JOURNEY</p><h2>Eight realms to conquer</h2></header>
          <div className="lp-realm-grid">
            {SHOW_WORLDS.map((w, i) => (
              <article key={w} className="lp-realm lp-reveal" style={{ ...tint(ELEMENT_COLOR[WORLDS[w].element]), backgroundImage: `url(${envPath(w, 'bg')})` }}>
                <span className="lp-realm-no">REALM {i + 1}</span>
                <img src={bossPath(WORLD_BOSS[w], 'icon')} alt="" loading="lazy" />
                <h3>{WORLDS[w].name}</h3>
                <p>Boss: {BOSS_META[WORLD_BOSS[w]].name}</p>
              </article>
            ))}
          </div>
        </section>

        <section className="lp-earn" id="earn">
          <div className="lp-section lp-earn-inner">
            <div className="lp-earn-copy">
              <p className="lp-kicker">PLAY-TO-EARN ON BASE</p>
              <h2>Your heroes.<br />Your collection.<br /><em>Truly yours.</em></h2>
              <ul className="lp-earn-list">
                <li><b>Play</b>Clear waves, beat bosses and finish quests to win coins, crystals, trophies and eggs.</li>
                <li><b>Collect</b>Guardians, Aetherlings and Eggs are on-chain collectibles that belong to your wallet.</li>
                <li><b>Earn</b>Level up, evolve and trade your way to a stronger party.</li>
              </ul>
              <p className="lp-earn-note">Token and marketplace details will be announced before launch.</p>
            </div>
            <div className="lp-nfts" aria-hidden="true">
              <div className="lp-nft n1" style={tint(ELEMENT_COLOR[ElementId.SHADOW])}><span>GUARDIAN</span><img src={guardianPath(GuardianId.NYXARA, 'portrait')} alt="" /><strong>NYXARA</strong><em>Epic · Shadow</em></div>
              <div className="lp-nft n2" style={tint(ELEMENT_COLOR[ElementId.LIGHT])}><span>GUARDIAN</span><img src={guardianPath(GuardianId.AURELIA, 'portrait')} alt="" /><strong>AURELIA</strong><em>Starter · Light</em></div>
              <div className="lp-nft n3" style={tint(ELEMENT_COLOR[ElementId.ARCANE])}><span>AETHERLING</span><img src={aetherPath(AetherlingSpecies.PRISMITE, 'portrait')} alt="" /><strong>PRISMITE</strong><em>★★★ · Arcane</em></div>
            </div>
          </div>
        </section>

        <section className="lp-section lp-items-wrap" id="rewards">
          <header className="lp-head"><p className="lp-kicker">SKY TREASURE</p><h2>Power-ups that turn the fight</h2></header>
          <div className="lp-items">{ITEMS.map(item => <article key={item.name}><img src={item.image} alt="" loading="lazy" /><h3>{item.name}</h3><p>{item.text}</p></article>)}</div>
        </section>

        <section className="lp-section lp-faq" id="how-to-play">
          <header className="lp-head"><p className="lp-kicker">FIELD GUIDE</p><h2>Questions, Guardian?</h2></header>
          {FAQ.map((f, i) => <details key={f.q} open={i === 0}><summary>{f.q}</summary><p>{f.a}</p></details>)}
        </section>

        <section className="lp-finale" style={{ backgroundImage: `url(${envPath(WorldId.CELESTIAL_RUINS, 'bg')})` }}>
          <img className="lp-finale-g" src={guardianPath(GuardianId.VESPER, 'portrait')} alt="" loading="lazy" />
          <div>
            <p className="lp-kicker">THE SKY IS CALLING</p>
            <h2>Your Guardian is waiting.</h2>
            <button className="lp-btn lp-btn-play" onClick={onPlay}><span>▶</span>{playLabel}</button>
          </div>
        </section>
      </main>

      <footer className="lp-footer">
        <a href="#top" className="lp-footer-brand" aria-label="Back to top"><SkyrealmLogo /></a>
        <nav aria-label="Footer"><a href="#guardians">Guardians</a><a href="#aetherlings">Aetherlings</a><a href="#bosses">Bosses</a><a href="#world">Realms</a><a href="#earn">Earn</a><a href="#how-to-play">FAQ</a></nav>
        <p>© {new Date().getFullYear()} SKYREALM · Guardians of the Aether · Built on Base</p>
      </footer>
      <div className="lp-mobile-launch"><span>THE SKY IS CALLING<strong>Ready to fly?</strong></span><button className="lp-btn lp-btn-play sm" onClick={onPlay}>▶ PLAY</button></div>
    </div>
  );
}
