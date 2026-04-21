import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import api from "../api/axios";

function FixtureRow({ f }) {
  const ft = ["FT","AET","PEN"].includes(f.status?.short);
  const live = ["1H","HT","2H","ET","BT","P","LIVE"].includes(f.status?.short);
  return (
    <div style={{
      display: "grid",
      gridTemplateColumns: "1fr 90px 1fr",
      alignItems: "center",
      padding: "0.9rem 1.25rem",
      borderBottom: "1px solid var(--border)",
      gap: "0.5rem",
    }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "flex-end", gap: "0.5rem" }}>
        <span style={{ fontWeight: 600, fontSize: "0.9rem", textAlign: "right" }}>{f.teams.home.name}</span>
        <img src={f.teams.home.logo} alt="" width="28" height="28" style={{ objectFit: "contain", flexShrink: 0 }} />
      </div>
      <div style={{ textAlign: "center" }}>
        {ft ? (
          <span style={{ fontFamily: "Oswald, sans-serif", fontSize: "1.15rem", fontWeight: 700, color: "var(--text)" }}>
            {f.goals.home} <span style={{ color: "var(--text-muted)" }}>–</span> {f.goals.away}
          </span>
        ) : live ? (
          <span className="status-live">{f.goals.home ?? 0}–{f.goals.away ?? 0}</span>
        ) : (
          <>
            <div style={{ fontFamily: "Oswald, sans-serif", fontSize: "1rem", color: "var(--text-muted)" }}>vs</div>
            <div style={{ fontSize: "0.7rem", color: "var(--text-muted)", marginTop: "2px" }}>
              {new Date(f.date).toLocaleDateString("en-GB", { day: "numeric", month: "short" })}
              {" "}
              {new Date(f.date).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" })}
            </div>
          </>
        )}
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
        <img src={f.teams.away.logo} alt="" width="28" height="28" style={{ objectFit: "contain", flexShrink: 0 }} />
        <span style={{ fontWeight: 600, fontSize: "0.9rem" }}>{f.teams.away.name}</span>
      </div>
    </div>
  );
}

function Fixtures() {
  const [tab, setTab] = useState("matchweek");
  const [fixtures, setFixtures] = useState([]);
  const [upcomingFixtures, setUpcomingFixtures] = useState([]);
  const [currentWeek, setCurrentWeek] = useState(null);
  const [selectedWeek, setSelectedWeek] = useState(null);
  const [loading, setLoading] = useState(true);
  const [upcomingLoading, setUpcomingLoading] = useState(false);
  const [error, setError] = useState(null);
  const { user } = useAuth();

  useEffect(() => {
    api.get("/api/fixtures/current")
      .then((res) => { setCurrentWeek(res.data.matchweek); setSelectedWeek(res.data.matchweek); })
      .catch(() => { setError("Could not load fixtures"); setLoading(false); });
  }, []);

  useEffect(() => {
    if (selectedWeek === null) return;
    setLoading(true); setError(null);
    api.get(`/api/fixtures?matchweek=${selectedWeek}`)
      .then((res) => { setFixtures(res.data); setLoading(false); })
      .catch(() => { setError("Could not load fixtures"); setLoading(false); });
  }, [selectedWeek]);

  useEffect(() => {
    if (tab !== "upcoming") return;
    setUpcomingLoading(true);
    api.get("/api/fixtures/upcoming")
      .then((res) => { setUpcomingFixtures(res.data); setUpcomingLoading(false); })
      .catch(() => setUpcomingLoading(false));
  }, [tab]);

  // Group upcoming fixtures by matchweek
  const upcomingByWeek = upcomingFixtures.reduce((acc, f) => {
    const wk = f.matchweek;
    if (!acc[wk]) acc[wk] = [];
    acc[wk].push(f);
    return acc;
  }, {});
  const upcomingWeeks = Object.keys(upcomingByWeek).map(Number).sort((a, b) => a - b);

  const sorted = [...fixtures].sort((a, b) => new Date(a.date) - new Date(b.date));
  const hasOpen = sorted.some((f) => new Date(f.date).getTime() - Date.now() > 60 * 60 * 1000);
  const allFT = sorted.length > 0 && sorted.every((f) => ["FT","AET","PEN"].includes(f.status?.short));

  return (
    <div>
      {/* Tabs */}
      <ul className="nav nav-tabs mb-3">
        <li className="nav-item">
          <button className={`nav-link ${tab === "matchweek" ? "active" : ""}`} onClick={() => setTab("matchweek")}>
            By Matchweek
          </button>
        </li>
        <li className="nav-item">
          <button className={`nav-link ${tab === "upcoming" ? "active" : ""}`} onClick={() => setTab("upcoming")}>
            All Upcoming
          </button>
        </li>
      </ul>

      {tab === "matchweek" && (
        <>
          <div className="d-flex justify-content-between align-items-center mb-3 flex-wrap gap-2">
            <h1 className="page-title mb-0">Matchweek {selectedWeek}</h1>
            <div className="d-flex align-items-center gap-2">
              <button className="btn btn-outline-secondary btn-sm" disabled={!selectedWeek || selectedWeek <= 1}
                onClick={() => setSelectedWeek((w) => w - 1)}>‹ Prev</button>
              {selectedWeek !== currentWeek && (
                <button className="btn btn-outline-primary btn-sm" onClick={() => setSelectedWeek(currentWeek)}>
                  Current
                </button>
              )}
              <button className="btn btn-outline-secondary btn-sm" disabled={!selectedWeek || selectedWeek >= 38}
                onClick={() => setSelectedWeek((w) => w + 1)}>Next ›</button>
            </div>
          </div>

          <div className="card">
            {loading ? (
              <div className="card-body text-center py-5"><div className="spinner-border" role="status" /></div>
            ) : error ? (
              <div className="card-body">
                <div className="alert alert-danger mb-0">{error}</div>
              </div>
            ) : sorted.length === 0 ? (
              <div className="card-body">
                <div className="alert alert-info mb-0">No fixtures for GW{selectedWeek} yet.</div>
              </div>
            ) : (
              <>
                <div className="card-header d-flex align-items-center gap-2">
                  {allFT ? <span className="status-ft">All Finished</span>
                    : hasOpen ? <span className="status-upcoming">Upcoming</span>
                    : <span style={{ color: "var(--text-muted)", fontSize: "0.8rem" }}>Predictions Locked</span>}
                </div>
                <div>
                  {sorted.map((f) => <FixtureRow key={f._id} f={f} />)}
                </div>
                <div className="card-body">
                  <div className="d-flex justify-content-center gap-2 flex-wrap">
                    {hasOpen && user && (
                      <Link to={`/predictions/${selectedWeek}`} className="btn btn-primary">Make Predictions</Link>
                    )}
                    {hasOpen && !user && (
                      <Link to="/login" className="btn btn-outline-primary">Login to Predict</Link>
                    )}
                    {user && (
                      <Link to={`/gameweek/${selectedWeek}`} className="btn btn-outline-secondary">View Results</Link>
                    )}
                  </div>
                  {!hasOpen && !allFT && (
                    <p className="text-muted text-center small mt-2 mb-0">
                      All predictions locked — kickoffs are within 1 hour.
                    </p>
                  )}
                </div>
              </>
            )}
          </div>
        </>
      )}

      {tab === "upcoming" && (
        <>
          <h1 className="page-title mb-3">All Upcoming Fixtures</h1>
          {upcomingLoading ? (
            <div className="text-center py-5"><div className="spinner-border" role="status" /></div>
          ) : upcomingWeeks.length === 0 ? (
            <div className="alert alert-info">No upcoming fixtures found.</div>
          ) : (
            upcomingWeeks.map((wk) => {
              const wkFixtures = [...upcomingByWeek[wk]].sort((a, b) => new Date(a.date) - new Date(b.date));
              const wkHasOpen = wkFixtures.some((f) => new Date(f.date).getTime() - Date.now() > 60 * 60 * 1000);
              return (
                <div className="card mb-3" key={wk}>
                  <div className="card-header d-flex justify-content-between align-items-center">
                    <span className="fw-bold">GW{wk}</span>
                    <div className="d-flex gap-2">
                      {wkHasOpen && user && (
                        <Link to={`/predictions/${wk}`} className="btn btn-primary btn-sm">Predict</Link>
                      )}
                      {user && (
                        <Link to={`/gameweek/${wk}`} className="btn btn-outline-secondary btn-sm">Results</Link>
                      )}
                    </div>
                  </div>
                  <div>
                    {wkFixtures.map((f) => <FixtureRow key={f._id} f={f} />)}
                  </div>
                </div>
              );
            })
          )}
        </>
      )}
    </div>
  );
}

export default Fixtures;
