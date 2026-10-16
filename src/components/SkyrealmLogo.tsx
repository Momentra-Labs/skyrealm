import { useId } from 'react';

/** Resolution-independent wordmark shared by the website's hero and navigation. */
export function SkyrealmLogo({ className = '' }: { className?: string }) {
  const id = useId().replace(/:/g, '');
  return (
    <svg className={`skyrealm-logo ${className}`} viewBox="0 0 520 112" role="img" aria-label="SKYREALM">
      <defs>
        <linearGradient id={`${id}-gold`} x2="0" y2="1">
          <stop stopColor="#fff9d6" /><stop offset=".42" stopColor="#ffe49a" /><stop offset=".48" stopColor="#d49a38" /><stop offset=".58" stopColor="#ffe6a0" /><stop offset="1" stopColor="#d99b32" />
        </linearGradient>
        <linearGradient id={`${id}-wing`} x2=".7" y2="1">
          <stop stopColor="#b0faff" /><stop offset=".45" stopColor="#4bcee7" /><stop offset="1" stopColor="#5061c8" />
        </linearGradient>
      </defs>
      <g stroke="#473027" strokeWidth="5" strokeLinejoin="round">
        <path d="M83 66C58 53 34 30 10 21L22 55 37 54 31 71 50 68 48 84 80 77Z" fill={`url(#${id}-wing)`} />
        <path d="M437 66C462 53 486 30 510 21L498 55 483 54 489 71 470 68 472 84 440 77Z" fill={`url(#${id}-wing)`} />
        <path d="M77 79Q260 111 443 79L432 96Q260 119 88 96Z" fill="#453047" strokeWidth="3" />
      </g>
      <path d="M17 29L70 64M28 54L65 67M503 29L450 64M492 54L455 67" fill="none" stroke="#d7ffff" strokeWidth="2" opacity=".7" />
      <text x="260" y="80" textAnchor="middle" textLength="392" lengthAdjust="spacingAndGlyphs" fontFamily="Georgia, serif" fontSize="67" fontWeight="900" fill="#4d3025" stroke="#4d3025" strokeWidth="10" strokeLinejoin="round" transform="translate(0 4)">SKYREALM</text>
      <text x="260" y="80" textAnchor="middle" textLength="392" lengthAdjust="spacingAndGlyphs" fontFamily="Georgia, serif" fontSize="67" fontWeight="900" fill={`url(#${id}-gold)`} stroke="#8f5928" strokeWidth="1.5" paintOrder="stroke fill">SKYREALM</text>
      <path d="M244 17L260 3 276 17 260 33Z" fill="#73e6ee" stroke="#4e3428" strokeWidth="3" />
      <path d="M260 7L260 27 248 17Z" fill="#dcfffd" /><path d="M260 7L272 17 260 27Z" fill="#3394c9" />
      <path d="M228 18H242M278 18H292" stroke="#efcc79" strokeWidth="2" />
    </svg>
  );
}
