// Only rendered when the user belongs to more than one league — otherwise
// there is nothing to choose between.
function LeaguePicker({ leagues, leagueId, onChange }) {
  if (!leagues || leagues.length < 2) return null;

  return (
    <div className="season-switch">
      {leagues.map((l) => (
        <button
          key={l._id}
          type="button"
          className={`season-switch-btn ${l._id === leagueId ? "active" : ""}`}
          onClick={() => onChange(l._id)}
        >
          {l.name}
        </button>
      ))}
    </div>
  );
}

export default LeaguePicker;
