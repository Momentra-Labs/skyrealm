import { useEffect, useRef, useState } from 'react';
import { SkyrealmLogo } from '../components/SkyrealmLogo.tsx';

interface Props {
  onPlay: () => void;
}

const LINKS = [
  { href: '#guardians', label: 'GUARDIANS' },
  { href: '#aetherlings', label: 'AETHERLINGS' },
  { href: '#bosses', label: 'BOSSES' },
  { href: '#world', label: 'REALMS' },
  { href: '#earn', label: 'EARN' },
  { href: '#how-to-play', label: 'FAQ' },
] as const;

export function LandingNav({ onPlay }: Props) {
  const [compact, setCompact] = useState(false);
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState('');
  const headerRef = useRef<HTMLElement>(null);
  const toggleRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    const observer = new IntersectionObserver(entries => {
      for (const entry of entries) if (entry.isIntersecting) setActive(`#${entry.target.id}`);
    }, { rootMargin: '-15% 0px -55% 0px' });
    for (const link of LINKS) {
      const section = document.querySelector(link.href);
      if (section) observer.observe(section);
    }
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    const onScroll = () => setCompact(window.scrollY > 28);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') { setOpen(false); toggleRef.current?.focus(); }
    };
    const onOutside = (event: PointerEvent) => {
      if (!headerRef.current?.contains(event.target as Node)) setOpen(false);
    };
    window.addEventListener('keydown', onKey);
    window.addEventListener('pointerdown', onOutside);
    return () => { window.removeEventListener('keydown', onKey); window.removeEventListener('pointerdown', onOutside); };
  }, [open]);

  return (
    <header ref={headerRef} className={`lp-nav${compact ? ' is-compact' : ''}`}>
      <div className="lp-nav-inner">
        <a className="lp-nav-brand" href="#top">
          <SkyrealmLogo />
        </a>
        <nav className="lp-nav-links" aria-label="Landing">
          {LINKS.map((link) => (
            <a key={link.href} href={link.href} aria-current={active === link.href ? 'location' : undefined}>
              {link.label}
            </a>
          ))}
        </nav>
        <button type="button" className="lp-btn lp-btn-play sm lp-nav-play" onClick={onPlay}>
          PLAY NOW
        </button>
        <button
          type="button"
          className="lp-nav-burger"
          ref={toggleRef}
          aria-label={open ? 'Close navigation' : 'Open navigation'}
          aria-expanded={open}
          aria-controls="lp-drawer"
          onClick={() => setOpen((v) => !v)}
        >
          {open ? 'CLOSE' : 'MENU'}
        </button>
        {open && (
          <nav id="lp-drawer" className="lp-drawer" aria-label="Mobile navigation">
            {LINKS.map((link) => (
              <a key={link.href} href={link.href} onClick={() => setOpen(false)}>
                {link.label}
              </a>
            ))}
            <button
              type="button"
              className="lp-btn lp-btn-play sm lp-nav-play"
              onClick={() => {
                setOpen(false);
                onPlay();
              }}
            >
              PLAY NOW
            </button>
          </nav>
        )}
      </div>
    </header>
  );
}
