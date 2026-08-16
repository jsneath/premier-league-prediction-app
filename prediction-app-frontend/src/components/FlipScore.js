// Stadium-style flip when a predicted score changes.
function FlipScore({ value, className = "" }) {
  const display = value === "" || value === null || value === undefined ? "–" : String(value);
  return (
    <span className={`flip-score ${className}`}>
      <span className="flip-score-face" key={display}>
        {display}
      </span>
    </span>
  );
}

export default FlipScore;
