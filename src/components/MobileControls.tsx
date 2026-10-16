import type { CSSProperties } from 'react';
import type { GameEngine } from '../game/GameEngine.ts';
import type { GameSettings } from '../types/game.ts';

interface Props {
  engine: GameEngine;
  specialReady?: boolean;
  specialEnergy?: number;
  touchHand?: GameSettings['touchHand'];
}

export function MobileControls({ engine, specialReady = false, specialEnergy = 0, touchHand = 'LEFT' }: Props) {
  const pct = Math.max(0, Math.min(100, specialEnergy));
  return (
    <div className="touch-layer">
      <div className={`touch-frame hand-${touchHand.toLowerCase()}`}>
        <button type="button" className="touch-btn pause" aria-label="Pause" title="Pause (P)" onClick={() => engine.input.queuePause()}>
          <span className="touch-pause-bars" aria-hidden="true" />
        </button>
        <button type="button" className={`touch-btn special${specialReady ? ' is-ready' : ''}`} aria-label="Special" title="Special (E)"
          style={{ '--sp': `${pct}%` } as CSSProperties} onClick={() => engine.input.queueSpecial()}>
          <span className="touch-special-face"><span className="touch-special-glyph">E</span></span>
        </button>
      </div>
    </div>
  );
}
