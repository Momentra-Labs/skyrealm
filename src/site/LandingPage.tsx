import { useState } from 'react';
import type { SaveGame } from '../types/game.ts';
import { AetherlingSpecies, BossKind, EnemyType, GuardianId, WorldId } from '../types/game.ts';
import { GUARDIAN_LIST, GUARDIAN_META } from '../game/content/guardians.ts';
import { aetherPath, bossPath, enemyPath, guardianPath, powerUpAssets } from '../assets/assetManifest.ts';
import { LandingNav } from './LandingNav.tsx';
import { WorldThumb, SHOW_WORLDS } from './PromoFrame.tsx';
import { WORLDS } from '../game/content/worlds.ts';
import { BRAND } from '../brand.ts';
import { SkyrealmLogo } from '../components/SkyrealmLogo.tsx';
import './landing.css';

interface Props { save: SaveGame; onPlay: () => void }
const COMPANIONS = [AetherlingSpecies.FLICKER, AetherlingSpecies.TIDECURL, AetherlingSpecies.SPROUT, AetherlingSpecies.GLOOM, AetherlingSpecies.LUMEN, AetherlingSpecies.PRISMITE];
const ITEMS = [
  { image: powerUpAssets.CLOVER, name: 'Clover', text: 'Raise your attack level for the rest of the flight.' },
  { image: powerUpAssets.MAGNET, name: 'Magnet', text: 'Bring nearby coins and treasure straight to your guardian.' },
  { image: powerUpAssets.DOUBLE, name: 'Double Shot', text: 'Fill the sky with twice the firepower for a short time.' },
  { image: powerUpAssets.RUSH, name: 'Rush', text: 'Become invincible and charge through enemies.' },
  { image: powerUpAssets.FREEZE, name: 'Time Freeze', text: 'Slow the danger and give your party room to breathe.' },
  { image: powerUpAssets.HEART, name: 'Heart', text: 'Recover health and keep your adventure going.' },
];

export function LandingPage({ save, onPlay }: Props) {
  const [spot, setSpot] = useState(save.equippedGuardian);
  const [peek, setPeek] = useState<WorldId>(WorldId.MEADOWS);
  const hero = GUARDIAN_META[spot];
  return (
    <div className="lp" id="top">
      <a className="lp-skip" href="#lp-main">Skip to content</a>
      <LandingNav onPlay={onPlay} />
      <section className="lp-hero" aria-label="Welcome to Skyrealm">
        <div className="lp-hero-mist" />
        <div className="lp-hero-portal" aria-hidden="true"><span>✦</span><i /><span>✦</span></div>
        <div className="lp-hero-ensemble" aria-hidden="true">
          <img className="hero-left" src={guardianPath(GuardianId.ELARA, 'portrait')} alt="" />
          <img className="hero-center" src={guardianPath(GuardianId.AURELIA, 'portrait')} alt="" fetchPriority="high" />
          <img className="hero-right" src={guardianPath(GuardianId.KAIRO, 'portrait')} alt="" />
        </div>
        <div className="lp-hero-heading"><h1><SkyrealmLogo /></h1><p className="lp-kicker">GUARDIANS OF THE AETHER</p></div>
      </section>
      <main id="lp-main" tabIndex={-1}>
        <section className="lp-welcome lp-section">
          <button className="lp-game-preview" onClick={onPlay} aria-label="Play Skyrealm">
            <span className="lp-preview-enemies" aria-hidden="true">
              <img src={enemyPath(EnemyType.VOID_BAT)} alt="" />
              <img src={enemyPath(EnemyType.TANK)} alt="" />
              <img src={enemyPath(EnemyType.VOID_BAT)} alt="" />
            </span>
            <span className="lp-preview-spells" aria-hidden="true" />
            <div className="lp-preview-party" aria-hidden="true">
              <img src={aetherPath(AetherlingSpecies.FLICKER, 'idle')} alt="" />
              <img src={guardianPath(save.equippedGuardian, 'idle')} alt="" />
              <img src={aetherPath(AetherlingSpecies.TIDECURL, 'idle')} alt="" />
            </div>
            <span className="lp-preview-play" aria-hidden="true">▶</span>
          </button>
          <button className="lp-btn lp-btn-green lp-btn-xl" onClick={onPlay}>{save.profile.runsPlayed ? 'PLAY AGAIN' : 'PLAY NOW'}</button>
          <p className="lp-platforms"><span>✧ FREE TO PLAY</span><span>PHONE & DESKTOP</span><span>NO DOWNLOAD ✧</span></p>
          <h2>Take flight. Find your magic.</h2>
          <p className="lp-copy">Choose your guardian, bring two companions, and soar into an endless world of monsters and treasure. Drag to dodge. Your party takes care of the firepower.</p>
          <div className="lp-adventure-steps"><span><b>01</b> Build your party</span><span><b>02</b> Brave the skies</span><span><b>03</b> Grow stronger</span></div>
        </section>
        <section className="lp-section lp-guardians" id="guardians">
          <p className="lp-kicker">SIX HEROES. YOUR STORY.</p><h2>Meet your guardians</h2>
          <p className="lp-copy">A spark of sunlight, a whisper of shadow, or the heart of a storm. Who will lead your next adventure?</p>
          <div className="lp-guardian-detail" aria-live="polite">
            <img src={guardianPath(spot, 'portrait')} alt={hero.name} />
            <div><p className="lp-kicker">{hero.title}</p><h3>{hero.name}</h3><p>{hero.blurb}.</p><p><strong>{hero.special}</strong><br />{hero.specialBlurb}</p><span className="lp-unlock">{save.guardians[spot].unlocked ? `Available · Level ${save.guardians[spot].level}` : hero.unlock}</span></div>
          </div>
          <div className="lp-guardian-row" aria-label="Choose a guardian to preview">
            {GUARDIAN_LIST.map(id => <button key={id} className={`lp-gcard${spot === id ? ' is-on' : ''}`} aria-pressed={spot === id} aria-label={`Preview ${GUARDIAN_META[id].name}`} onClick={() => setSpot(id)}><img src={guardianPath(id, 'portrait')} alt="" loading="lazy" /><strong>{GUARDIAN_META[id].name}</strong><span>{GUARDIAN_META[id].title}</span></button>)}
          </div><p className="lp-note">Preview here. Equip your unlocked guardians in the game.</p>
        </section>
        <section className="lp-companion-band">
          <div className="lp-section"><p className="lp-kicker">BETTER TOGETHER</p><h2>Small companions. Big magic.</h2><p className="lp-copy">Hatch eggs to discover 30 Aetherlings. Equip two, combine their elements, and let your new friends fight by your side.</p>
            <div className="lp-companions">{COMPANIONS.map(id => <figure key={id}><img src={aetherPath(id, 'portrait')} alt={id.toLowerCase()} loading="lazy" /><figcaption>{id}</figcaption></figure>)}</div>
            <button className="lp-btn lp-btn-green" onClick={onPlay}>MEET YOUR PARTY →</button>
          </div>
        </section>
        <section className="lp-section lp-boss-feature">
          <div><p className="lp-kicker">A BIGGER CHALLENGE</p><h2>Brave the beasts<br />beyond the clouds.</h2><p className="lp-copy">Every realm has a guardian of its own. Dodge its attacks, discover its weakness, and claim the treasure that waits on the other side.</p><p className="lp-copy">Ready for more? Enter a Boss Raid for a timed fight and greater rewards.</p><button className="lp-btn lp-btn-gold" onClick={onPlay}>TAKE THE CHALLENGE →</button></div>
          <img src={bossPath(BossKind.IRON_HYDRA, 'portrait')} alt="The Iron Hydra realm boss" loading="lazy" />
        </section>
        <section className="lp-section lp-world-section" id="world"><p className="lp-kicker">FOLLOW YOUR CURIOSITY</p><h2>Eight realms. Endless wonder.</h2><p className="lp-world-tale" aria-live="polite">Explore <strong>{WORLDS[peek].name}</strong></p><div className="lp-worlds">{SHOW_WORLDS.map(id => <WorldThumb key={id} world={id} selected={peek === id} onSelect={() => setPeek(id)} />)}</div></section>
        <section className="lp-section" id="rewards"><p className="lp-kicker">A LITTLE HELP ALONG THE WAY</p><h2>Treasure worth chasing</h2><p className="lp-copy">Keep an eye on the skies. These magical finds can turn your next close call into your best flight yet.</p><div className="lp-items">{ITEMS.map(item => <article key={item.name}><img src={item.image} alt="" loading="lazy" /><div><h3>{item.name}</h3><p>{item.text}</p></div></article>)}</div></section>
        <section className="lp-section lp-faq" id="how-to-play"><p className="lp-kicker">YOUR FIELD GUIDE</p><h2>Ready for your first flight?</h2>
          <details open><summary>How do I play?</summary><p>Press Play Now and take flight. Drag anywhere in the game to steer; your guardian and companions fire automatically. On desktop, WASD or arrow keys also work. Press E, or tap the special button, when your energy is ready.</p></details>
          <details><summary>How do I grow stronger?</summary><p>Collect clovers during a run to improve your attacks. After your flight, spend earned coins on permanent guardian levels. Hatch companions and equip them in your party for extra firepower.</p></details>
          <details><summary>Do I need to download anything?</summary><p>No. SKYREALM runs directly in your browser on a phone, tablet, or desktop.</p></details>
          <details><summary>Will my progress be saved?</summary><p>Your progress is saved in this browser on this device. Clearing site data or using a private browsing session can remove it.</p></details>
          <details><summary>What happens after a flight?</summary><p>Your treasure is banked. Upgrade your guardian, change your party, or fly again from the results screen. Defeat realm bosses to reach new skies during an endless run.</p></details>
        </section>
        <section className="lp-finale"><p className="lp-kicker">THE SKY IS CALLING</p><h2>Your next adventure awaits.</h2><button className="lp-btn lp-btn-green lp-btn-xl" onClick={onPlay}>PLAY FREE NOW ▶</button><p>No download. Just a little courage.</p></section>
      </main>
      <footer className="lp-footer"><a href="#top" className="lp-footer-brand">{BRAND.name}</a><nav aria-label="Footer"><a href="#guardians">Guardians</a><a href="#world">Worlds</a><a href="#how-to-play">How to play</a></nav><p>© {new Date().getFullYear()} SKYREALM · An original fantasy adventure</p></footer>
      <div className="lp-mobile-launch"><span>THE SKY IS CALLING<strong>Ready to fly?</strong></span><button className="lp-btn lp-btn-green" onClick={onPlay}>PLAY NOW ▶</button></div>
    </div>
  );
}
