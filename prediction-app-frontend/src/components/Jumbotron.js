import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import api from "../api/axios";
import LockCountdown from "./LockCountdown";

const LIVE = ["1H", "HT", "2H", "ET", "BT", "P", "LIVE"];

function Jumbotron() {
  const [fixture, setFixture] = useState(null);

  useEffect(() => {
    api
      .get("/api/fixtures/current")
      .then((res) => api.get(`/api/fixtures?matchweek=${res.data.matchweek}`))
      .then((res) => {
        const list = Array.isArray(res.data) ? res.data : [];
        const on = list.find((f) => LIVE.includes(f.status?.short));
        if (on) {
          setFixture(on);
          return;
        }
        const next = list
          .filter((f) => !["FT", "AET", "PEN", "CANC", "ABD"].includes(f.status?.short))
          .sort((a, b) => new Date(a.date) - new Date(b.date))[0];
        setFixture(next || list[0] || null);
      })
      .catch(() => {});
  }, []);

  if (!fixture) return null;

  const live = LIVE.includes(fixture.status?.short);
  const kickoff = fixture.date;

  return (
    <div className={`jumbotron ${live ? "is-live" : ""}`}>
      <div className="jumbotron-kicker">
        {live ? <span className="fx-live-dot" /> : null}
        {live ? "Live on the big screen" : "Next up"}
        {fixture.matchweek ? ` · GW${fixture.matchweek}` : ""}
      </div>
      <div className="jumbotron-sides">
        <div className="jumbotron-team">
          <img src={fixture.teams.home.logo} alt="" />
          <strong>{fixture.teams.home.name}</strong>
        </div>
        <div className="jumbotron-mid">
          {live ? (
            <div className="jumbotron-score">
              {fixture.goals.home ?? 0}<span>–</span>{fixture.goals.away ?? 0}
            </div>
          ) : (
            <div className="jumbotron-vs">VS</div>
          )}
          {!live && (
            <div className="jumbotron-when">
              {new Date(kickoff).toLocaleString("en-GB", {
                weekday: "short",
                day: "numeric",
                month: "short",
                hour: "2-digit",
                minute: "2-digit",
              })}
            </div>
          )}
          {!live && <LockCountdown kickoff={kickoff} locked={false} />}
        </div>
        <div className="jumbotron-team">
          <img src={fixture.teams.away.logo} alt="" />
          <strong>{fixture.teams.away.name}</strong>
        </div>
      </div>
      {fixture.matchweek && (
        <Link to={`/predictions/${fixture.matchweek}`} className="jumbotron-cta">
          {live ? "Watch the table" : "Call this one"}
        </Link>
      )}
    </div>
  );
}

export default Jumbotron;
