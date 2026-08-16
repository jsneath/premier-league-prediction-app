import { useRef } from "react";
import usePrefersReducedMotion from "../hooks/usePrefersReducedMotion";

function TiltCard({ className = "", children, disabled = false, style }) {
  const ref = useRef(null);
  const reduced = usePrefersReducedMotion();

  const reset = () => {
    if (ref.current) ref.current.style.transform = "";
  };

  const onMove = (e) => {
    if (disabled || reduced) return;
    const el = ref.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    const x = (e.clientX - r.left) / r.width - 0.5;
    const y = (e.clientY - r.top) / r.height - 0.5;
    el.style.transform = `perspective(900px) rotateY(${x * 9}deg) rotateX(${-y * 7}deg) translateY(-2px)`;
  };

  return (
    <div
      ref={ref}
      className={`tilt-card ${className}`}
      style={style}
      onMouseMove={onMove}
      onMouseLeave={reset}
    >
      {children}
    </div>
  );
}

export default TiltCard;
