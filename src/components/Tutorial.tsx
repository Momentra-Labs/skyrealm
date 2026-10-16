interface Props {
  step: number;
  onNext: () => void;
}

const BEATS = [
  { title: 'DRAG. DODGE. COLLECT.', body: 'Drag anywhere in the sky to steer. Your party fires automatically. Collect treasure and clovers, defeat the realm boss, then fly into the next realm. Spend coins on guardian levels between flights. WASD / arrows also work; E unleashes your special.' },
];

export function Tutorial({ step, onNext }: Props) {
  const beat = BEATS[Math.min(step, BEATS.length - 1)]!;
  const last = step >= BEATS.length - 1;
  return (
    <div className="overlay">
      <div className="panel">
        <p className="eyebrow">FIRST FLIGHT</p>
        <h2>{beat.title}</h2>
        <p className="hangar-blurb">{beat.body}</p>
        <button type="button" className="ns-btn ns-btn-primary" onClick={onNext}>
          {last ? 'TAKE FLIGHT' : 'NEXT'}
        </button>
      </div>
    </div>
  );
}

export const TUTORIAL_STEPS = BEATS.length;
