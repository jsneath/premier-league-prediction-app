function PitchLean({ lean }) {
  return (
    <div className={`mini-pitch lean-${lean || "none"}`} aria-hidden>
      <span className="mini-pitch-box left" />
      <span className="mini-pitch-circle" />
      <span className="mini-pitch-box right" />
      <span className="mini-pitch-spot" />
    </div>
  );
}

export default PitchLean;
