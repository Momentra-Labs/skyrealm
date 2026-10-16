/** Decorative desktop surround; never intercepts game input. */
export function MagicFrame() {
  return (
    <div className="magic-frame" aria-hidden="true">
      <div className="magic-frame-line" />
      {['nw', 'ne', 'sw', 'se'].map(corner => (
        <svg key={corner} className={`magic-corner ${corner}`} viewBox="0 0 100 100" fill="none">
          <path d="M7 95V25L25 7H95L76 16H32L16 32V76Z" fill="#35283c" stroke="#ebc779" strokeWidth="2" />
          <path d="M23 78V36L36 23H78M32 58V40L40 32H58" stroke="#a88142" />
          <path d="M8 8L29 14L38 38L14 29Z" fill="#69e0e4" stroke="#fff1b6" strokeWidth="2" />
          <path d="M8 8L23 23L38 38M23 23L29 14M23 23L14 29" stroke="#23899e" />
          <path d="M48 10L59 5L70 10L59 15ZM10 48L5 59L10 70L15 59Z" fill="#eac77e" />
        </svg>
      ))}
      <div className="magic-crest top"><span />✦<span /></div>
      <div className="magic-crest bottom"><span />◇<span /></div>
      <div className="magic-runes left">✧<i />ᛟ<i />◇<i />ᛝ<i />✧</div>
      <div className="magic-runes right">✧<i />ᛝ<i />◇<i />ᛟ<i />✧</div>
      <div className="magic-orbit left" /><div className="magic-orbit right" />
    </div>
  );
}
