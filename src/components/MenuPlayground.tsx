import { useEffect, useId, useRef, useState, type PointerEvent } from 'react';
import { AetherlingSpecies, GuardianId } from '../types/game.ts';
import { drawAetherSprite, drawGuardianSprite } from '../assets/drawEntity.ts';

interface Props {
  onPop: () => void;
}

interface Spark {
  id: number;
  x: number;
  y: number;
}

interface Burst {
  id: number;
  x: number;
  y: number;
  text: string;
}

const POPS = ['SPARK!', 'YAY!', '+10', 'GLOW!'];

export function MenuPlayground({ onPop }: Props) {
  const uid = useId();
  const wrapRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const target = useRef({ x: 0.5, y: 0.52 });
  const pos = useRef({ x: 0.5, y: 0.52 });
  const sparkId = useRef(0);
  const burstId = useRef(0);
  const lastSpark = useRef(0);
  const [sparks, setSparks] = useState<Spark[]>([]);
  const [bursts, setBursts] = useState<Burst[]>([]);

  useEffect(() => {
    let frame = 0;
    let age = 0;
    let last = performance.now();
    const tick = (now: number) => {
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      age += dt;
      pos.current.x += (target.current.x - pos.current.x) * 0.08;
      pos.current.y += (target.current.y - pos.current.y) * 0.08;
      const wrap = wrapRef.current;
      const canvas = canvasRef.current;
      if (wrap && canvas) {
        const dpr = Math.min(2, window.devicePixelRatio || 1);
        const w = wrap.clientWidth;
        const h = wrap.clientHeight;
        if (canvas.width !== Math.floor(w * dpr) || canvas.height !== Math.floor(h * dpr)) {
          canvas.width = Math.floor(w * dpr);
          canvas.height = Math.floor(h * dpr);
        }
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
          ctx.clearRect(0, 0, w, h);
          const x = pos.current.x * w;
          const y = pos.current.y * h;
          const bob = Math.sin(age * 6) * 4;
          ctx.save();
          ctx.translate(x - 42, y + 18 + bob);
          drawAetherSprite(ctx, AetherlingSpecies.FLICKER, 28, { age, pose: 'portrait' });
          ctx.restore();
          ctx.save();
          ctx.translate(x + 42, y + 20 - bob);
          drawAetherSprite(ctx, AetherlingSpecies.TIDECURL, 28, { age: age + 1, pose: 'portrait' });
          ctx.restore();
          ctx.save();
          ctx.translate(x, y + bob);
          drawGuardianSprite(ctx, GuardianId.AURELIA, 52, 'portrait');
          ctx.restore();
        }
      }
      frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, []);

  const point = (clientX: number, clientY: number) => {
    const box = wrapRef.current?.getBoundingClientRect();
    if (!box) return;
    target.current.x = (clientX - box.left) / box.width;
    target.current.y = (clientY - box.top) / box.height;
  };

  const sparkle = (clientX: number, clientY: number) => {
    const now = performance.now();
    if (now - lastSpark.current < 40) return;
    lastSpark.current = now;
    const box = wrapRef.current?.getBoundingClientRect();
    if (!box) return;
    const next: Spark = {
      id: sparkId.current++,
      x: clientX - box.left,
      y: clientY - box.top,
    };
    setSparks((list) => [...list.slice(-10), next]);
    window.setTimeout(() => {
      setSparks((list) => list.filter((s) => s.id !== next.id));
    }, 420);
  };

  const popAt = (clientX: number, clientY: number) => {
    const box = wrapRef.current?.getBoundingClientRect();
    if (!box) return;
    const next: Burst = {
      id: burstId.current++,
      x: clientX - box.left,
      y: clientY - box.top,
      text: POPS[burstId.current % POPS.length]!,
    };
    setBursts((list) => [...list.slice(-6), next]);
    window.setTimeout(() => {
      setBursts((list) => list.filter((b) => b.id !== next.id));
    }, 700);
    onPop();
  };

  const tapSky = (event: PointerEvent<HTMLDivElement>) => {
    const el = event.target;
    if (el !== event.currentTarget && el !== canvasRef.current) return;
    point(event.clientX, event.clientY);
    sparkle(event.clientX, event.clientY);
    popAt(event.clientX, event.clientY);
  };

  return (
    <div
      ref={wrapRef}
      className="menu-play"
      onPointerDown={tapSky}
      onPointerMove={(event) => {
        point(event.clientX, event.clientY);
        if (event.pointerType !== 'touch') sparkle(event.clientX, event.clientY);
      }}
    >
      <canvas ref={canvasRef} className="menu-fairy" />
      <button type="button" className="toy toy-cloud toy-a" aria-label="Puff cloud" onClick={(event) => popAt(event.clientX, event.clientY)} />
      <button type="button" className="toy toy-cloud toy-b" aria-label="Puff cloud" onClick={(event) => popAt(event.clientX, event.clientY)} />
      <button type="button" className="toy toy-petal toy-c" aria-label="Petal" onClick={(event) => popAt(event.clientX, event.clientY)} />
      <button type="button" className="toy toy-petal toy-d" aria-label="Petal" onClick={(event) => popAt(event.clientX, event.clientY)} />
      {sparks.map((s) => (
        <span key={`${uid}-s${s.id}`} className="toy-spark" style={{ left: s.x, top: s.y }} />
      ))}
      {bursts.map((b) => (
        <span key={`${uid}-b${b.id}`} className="toy-burst" style={{ left: b.x, top: b.y }}>
          {b.text}
        </span>
      ))}
    </div>
  );
}
