import { Link } from "react-router-dom";

function SeasonTrack({ currentWeek, seasonLabel }) {
  const week = Number(currentWeek) || 1;
  return (
    <div className="season-track" aria-label="Season progress">
      <div className="season-track-meta">
        <span>GW {week}<em>/38</em></span>
        {seasonLabel ? <span className="season-track-year">{seasonLabel}</span> : null}
      </div>
      <div className="season-track-pitch">
        <div className="season-track-ball" style={{ left: `${((week - 1) / 37) * 100}%` }} />
        <div className="season-track-line" />
        {Array.from({ length: 38 }, (_, i) => {
          const n = i + 1;
          const state = n < week ? "done" : n === week ? "now" : "soon";
          return (
            <Link
              key={n}
              to={`/predictions/${n}`}
              className={`season-dot ${state}`}
              title={`Gameweek ${n}`}
            />
          );
        })}
      </div>
    </div>
  );
}

export default SeasonTrack;
