import { useEffect, useRef, useState } from "react";

const prefersReducedMotion = () =>
  typeof window !== "undefined" &&
  window.matchMedia &&
  window.matchMedia("(prefers-reduced-motion: reduce)").matches;

// Counts a number up from zero when it first appears. Used for points totals
// so the table feels alive when a gameweek's scores land.
function CountUp({ value = 0, duration = 900, className = "" }) {
  const target = Number(value) || 0;
  const [shown, setShown] = useState(target === 0 || prefersReducedMotion() ? target : 0);
  const frame = useRef(null);
  const prev = useRef(target);

  useEffect(() => {
    if (prefersReducedMotion() || target === 0) {
      setShown(target);
      prev.current = target;
      return;
    }

    const from = prev.current === target ? 0 : prev.current;
    const start = performance.now();

    const tick = (now) => {
      const t = Math.min((now - start) / duration, 1);
      // ease-out cubic — quick off the mark, gentle landing
      const eased = 1 - Math.pow(1 - t, 3);
      setShown(Math.round(from + (target - from) * eased));
      if (t < 1) frame.current = requestAnimationFrame(tick);
      else prev.current = target;
    };

    frame.current = requestAnimationFrame(tick);
    return () => frame.current && cancelAnimationFrame(frame.current);
  }, [target, duration]);

  return <span className={className}>{shown}</span>;
}

export default CountUp;
