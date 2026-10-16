import type { GameSnapshot } from '../types/game.ts';

interface Props {
  snap: GameSnapshot;
  onRetry: () => void;
  onMenu: () => void;
  onUpgrade: () => void;
  upgradeCost: number;
  guardianLevel: number;
  coins: number;
  notice: string;
}

export function GameOver({ snap, onRetry, onMenu, onUpgrade, upgradeCost, guardianLevel, coins, notice }: Props) {
  return (
    <div className="overlay">
      <div className="panel">
        <p className="eyebrow">TREASURE BANKED · READY FOR ANOTHER FLIGHT?</p>
        <h2>FLIGHT COMPLETE</h2>
        {snap.isNewHighScore && <p className="celebrate">NEW HIGH SCORE!</p>}
        <ul className="stats">
          <li>
            <span>FINAL SCORE</span>
            <strong>{snap.finalScore.toLocaleString()}</strong>
          </li>
          <li>
            <span>SPOILS</span>
            <strong>
              {snap.runCoins.toLocaleString()} coins · {snap.runCrystals} crystals
            </strong>
          </li>
          <li>
            <span>HIGH SCORE</span>
            <strong>{snap.highScore.toLocaleString()}</strong>
          </li>
          <li>
            <span>LEVEL</span>
            <strong>{snap.level}</strong>
          </li>
          <li>
            <span>BEST COMBO</span>
            <strong>{snap.bestCombo}</strong>
          </li>
        </ul>
        <div className="menu-actions">
          <button type="button" className="ns-btn ns-btn-primary" onClick={onRetry}>
            FLY AGAIN
          </button>
          <button type="button" className="ns-btn" onClick={onMenu}>
            CHANGE PARTY
          </button>
        </div>
        <div className="flight-upgrade">
          <p>{snap.guardianName} · Level {guardianLevel} · {coins.toLocaleString()} coins</p>
          <button type="button" className="ns-btn" onClick={onUpgrade} disabled={guardianLevel >= 50 || coins < upgradeCost}>
            {guardianLevel >= 50 ? 'MAX LEVEL' : `UPGRADE GUARDIAN · ${upgradeCost} COINS`}
          </button>
          <p role="status">{notice || (coins < upgradeCost ? `${upgradeCost - coins} more coins to the next upgrade` : 'Grow stronger for your next flight.')}</p>
        </div>
      </div>
    </div>
  );
}
