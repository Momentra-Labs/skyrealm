import { SkyrealmLogo } from './SkyrealmLogo.tsx';

export function LoadingScreen({ progress }: { progress: number }) {
  const pct = Math.max(0, Math.min(100, Math.round(progress * 100)));
  const status = pct >= 100 ? 'The portal is ready' : pct < 35 ? 'Awakening the skies' : pct < 75 ? 'Gathering your companions' : 'Opening the Aether gate';
  return (
    <div className="aether-loading">
      <header className="aether-loading-brand"><SkyrealmLogo /><p>GUARDIANS OF THE AETHER</p></header>
      <div className="aether-portal" aria-hidden="true">
        <div className="aether-ring outer" /><div className="aether-ring inner" />
        <span className="aether-sigil north">✧</span><span className="aether-sigil south">✧</span>
        <span className="aether-sigil east">◇</span><span className="aether-sigil west">◇</span>
        <svg viewBox="0 0 100 140" className="aether-crystal">
          <path d="M50 4 86 48 74 105 50 136 26 105 14 48Z" fill="#56cfd7" stroke="#ffe6ab" strokeWidth="2" />
          <path d="M50 4 38 50 50 136 14 48Z" fill="#c4fff3" />
          <path d="M50 4 86 48 60 57 50 136Z" fill="#3291b0" />
          <path d="M38 50 60 57 50 136Z" fill="#8ef2e4" />
          <path d="m14 48 24 2 22 7 26-9M50 4 38 50 50 136" fill="none" stroke="#ecfff2" strokeOpacity=".7" />
        </svg>
      </div>
      <div className="aether-loading-progress">
        <p className="aether-loading-kicker">YOUR ADVENTURE AWAITS</p>
        <h1 role="status">{status}</h1>
        <div className="aether-progress" role="progressbar" aria-label="Preparing your adventure" aria-valuemin={0} aria-valuemax={100} aria-valuenow={pct}><div style={{ width: `${pct}%` }} /></div>
        <p className="aether-progress-caption"><span>{pct === 100 ? 'Entering your hangar' : 'Preparing your adventure'}</span><strong>{pct}%</strong></p>
      </div>
      <p className="aether-loading-tip"><span>✦ FLIGHT TIP ✦</span>Drag to steer. Your guardian fires automatically.<br />Bring companions to strengthen your party.</p>
    </div>
  );
}
