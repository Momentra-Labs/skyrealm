import { MenuPlayground } from './MenuPlayground.tsx';

interface Props {
  onBack: () => void;
  onPop: () => void;
}

export function HowToPlay({ onBack, onPop }: Props) {
  return (
    <div className="overlay overlay-playful">
      <MenuPlayground onPop={onPop} />
      <div className="panel panel-wide">
        <h2>HOW TO PLAY</h2>
        <div className="how-grid">
          <section>
            <h3>FLY</h3>
            <p>Drag anywhere in the sky to move. Your Guardian auto-fires upward. WASD or arrows also work. E spends special energy. P pauses. On touch screens, your guardian stays above your finger.</p>
          </section>
          <section>
            <h3>AETHERLINGS</h3>
            <p>Equip two companions. They attack on their own, carry elements, and evolve with essence plus shards — not twin merges.</p>
          </section>
          <section>
            <h3>ITEMS</h3>
            <p>Clover raises attack level (cap 12). Magnet pulls loot. Double Shot, Rush, Time Freeze, Aether Blast, and Hearts drop in the endless sky.</p>
          </section>
          <section>
            <h3>ELEMENTS</h3>
            <p>Fire beats Nature beats Water beats Fire. Light and Shadow oppose. Arcane is even. Match the boss weakness shown before the fight.</p>
          </section>
          <section>
            <h3>MODES</h3>
            <p>Endless runs bank coins, crystals, trophies, eggs, and essence. Quests use a local timer. Raids spend Boss Energy. Training drops no loot.</p>
          </section>
          <section>
            <h3>ART</h3>
            <p>Original fantasy guardians, companions, monsters, and realms bring every flight to life.</p>
          </section>
        </div>
        <button type="button" className="ns-btn ns-btn-primary" onClick={onBack}>
          BACK
        </button>
      </div>
    </div>
  );
}
