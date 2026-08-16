import { useEffect, useRef } from "react";
import usePrefersReducedMotion from "../hooks/usePrefersReducedMotion";

// Soft rising sparks behind the whole app. Pauses when the tab is hidden.
function EmberField() {
  const canvasRef = useRef(null);
  const reduced = usePrefersReducedMotion();

  useEffect(() => {
    if (reduced) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    let raf = 0;
    let running = true;

    const sparks = Array.from({ length: 42 }, () => spawn(true));

    function spawn(anywhere) {
      return {
        x: Math.random(),
        y: anywhere ? Math.random() : 1.05,
        r: 0.6 + Math.random() * 1.8,
        s: 0.08 + Math.random() * 0.22,
        drift: (Math.random() - 0.5) * 0.08,
        a: 0.15 + Math.random() * 0.45,
        hue: Math.random() > 0.78 ? 188 : 16,
      };
    }

    function size() {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = window.innerWidth * dpr;
      canvas.height = window.innerHeight * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    }

    function tick() {
      if (!running) return;
      const w = window.innerWidth;
      const h = window.innerHeight;
      ctx.clearRect(0, 0, w, h);
      for (const p of sparks) {
        p.y -= p.s * 0.004;
        p.x += p.drift * 0.002;
        if (p.y < -0.04 || p.x < -0.05 || p.x > 1.05) Object.assign(p, spawn(false));
        ctx.beginPath();
        ctx.fillStyle = `hsla(${p.hue}, 95%, 58%, ${p.a})`;
        ctx.shadowColor = `hsla(${p.hue}, 95%, 58%, 0.7)`;
        ctx.shadowBlur = 8;
        ctx.arc(p.x * w, p.y * h, p.r, 0, Math.PI * 2);
        ctx.fill();
      }
      raf = requestAnimationFrame(tick);
    }

    const onVis = () => {
      running = document.visibilityState === "visible";
      if (running) raf = requestAnimationFrame(tick);
    };

    size();
    window.addEventListener("resize", size);
    document.addEventListener("visibilitychange", onVis);
    raf = requestAnimationFrame(tick);
    return () => {
      running = false;
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", size);
      document.removeEventListener("visibilitychange", onVis);
    };
  }, [reduced]);

  if (reduced) return null;
  return <canvas ref={canvasRef} className="ember-field" aria-hidden />;
}

export default EmberField;
