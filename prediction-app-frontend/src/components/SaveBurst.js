import { useEffect, useState } from "react";
import usePrefersReducedMotion from "../hooks/usePrefersReducedMotion";

function SaveBurst({ fire }) {
  const [bits, setBits] = useState([]);
  const reduced = usePrefersReducedMotion();

  useEffect(() => {
    if (!fire || reduced) return;
    const next = Array.from({ length: 28 }, (_, i) => ({
      id: `${fire}-${i}`,
      x: 50 + (Math.random() - 0.5) * 18,
      y: 62 + (Math.random() - 0.5) * 10,
      dx: (Math.random() - 0.5) * 220,
      dy: -80 - Math.random() * 180,
      rot: (Math.random() - 0.5) * 360,
      hue: Math.random() > 0.3 ? 16 : 48,
    }));
    setBits(next);
    const t = setTimeout(() => setBits([]), 900);
    return () => clearTimeout(t);
  }, [fire, reduced]);

  if (!fire) return null;

  return (
    <div className="save-burst" aria-hidden>
      <div className="save-stamp">Locked in</div>
      {bits.map((b) => (
        <span
          key={b.id}
          className="save-spark"
          style={{
            left: `${b.x}%`,
            top: `${b.y}%`,
            background: `hsl(${b.hue}, 95%, 58%)`,
            "--dx": `${b.dx}px`,
            "--dy": `${b.dy}px`,
            "--rot": `${b.rot}deg`,
          }}
        />
      ))}
    </div>
  );
}

export default SaveBurst;
