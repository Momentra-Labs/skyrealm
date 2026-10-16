import { Difficulty } from '../types/game.ts';
import type { GameSettings } from '../types/game.ts';
import { MenuPlayground } from './MenuPlayground.tsx';

interface Props {
  settings: GameSettings;
  onChange: (next: Partial<GameSettings>) => void;
  onBack: () => void;
  onReset?: () => void;
  playful?: boolean;
  onPop?: () => void;
}

export function Settings({ settings, onChange, onBack, onReset, playful, onPop }: Props) {
  return (
    <div className={`overlay ${playful ? 'overlay-playful' : ''}`}>
      {playful && onPop && <MenuPlayground onPop={onPop} />}
      <div className="panel">
        <h2>SETTINGS</h2>
        <label className="toggle">
          <span>SOUND EFFECTS</span>
          <input type="checkbox" checked={settings.soundEnabled} onChange={(e) => onChange({ soundEnabled: e.target.checked })} />
        </label>
        <label className="toggle">
          <span>MUSIC</span>
          <input type="checkbox" checked={settings.musicEnabled} onChange={(e) => onChange({ musicEnabled: e.target.checked })} />
        </label>
        <label className="toggle">
          <span>SCREEN SHAKE</span>
          <input type="checkbox" checked={settings.screenShakeEnabled} onChange={(e) => onChange({ screenShakeEnabled: e.target.checked })} />
        </label>
        <label className="toggle">
          <span>PARTICLES</span>
          <input type="checkbox" checked={settings.particlesEnabled} onChange={(e) => onChange({ particlesEnabled: e.target.checked })} />
        </label>
        <p className="hud-label">QUALITY</p>
        <div className="diff-row">
          {(['LOW', 'HIGH'] as const).map((q) => (
            <button key={q} type="button" className={`ns-btn ${settings.quality === q ? 'ns-btn-primary' : ''}`} onClick={() => onChange({ quality: q })}>
              {q}
            </button>
          ))}
        </div>
        <p className="hud-label">STEERING HAND · SPECIAL ON OPPOSITE SIDE</p>
        <div className="diff-row">
          {(['LEFT', 'RIGHT'] as const).map((hand) => (
            <button
              key={hand}
              type="button"
              className={`ns-btn ${settings.touchHand === hand ? 'ns-btn-primary' : ''}`}
              onClick={() => onChange({ touchHand: hand })}
            >
              {hand}
            </button>
          ))}
        </div>
        <p className="hud-label">DIFFICULTY</p>
        <div className="diff-row">
          {([Difficulty.EASY, Difficulty.NORMAL, Difficulty.HARD] as const).map((level) => (
            <button key={level} type="button" className={`ns-btn ${settings.difficulty === level ? 'ns-btn-primary' : ''}`} onClick={() => onChange({ difficulty: level })}>
              {level}
            </button>
          ))}
        </div>
        {onReset && (
          <button type="button" className="ns-btn" onClick={onReset}>
            RESET SAVE
          </button>
        )}
        <button type="button" className="ns-btn ns-btn-primary" onClick={onBack}>
          BACK
        </button>
      </div>
    </div>
  );
}
