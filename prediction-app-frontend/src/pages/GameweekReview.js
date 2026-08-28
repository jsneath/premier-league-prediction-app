import { useState, useEffect } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import LeaguePicker from "../components/LeaguePicker";
import { useMyLeagues } from "../hooks/useMyLeagues";
import api from "../api/axios";
import Typewriter from "../components/Typewriter";

function GameweekReview() {
  const { matchweek: matchweekParam } = useParams();
  const { user, loading: authLoading } = useAuth();
  const { leagues, league, leagueId, setLeagueId, loading: leaguesLoading } =
    useMyLeagues(user);
  const navigate = useNavigate();

  const [selectedWeek, setSelectedWeek] = useState(parseInt(matchweekParam) || null);
  const [currentWeek, setCurrentWeek] = useState(null);
  const [data, setData] = useState(null);
  const [commentary, setCommentary] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!authLoading && !user) {
      navigate("/login");
    }
  }, [authLoading, user, navigate]);

  useEffect(() => {
    api.get("/api/fixtures/current").then((res) => {
      setCurrentWeek(res.data.matchweek);
      if (!matchweekParam) setSelectedWeek(res.data.matchweek);
    });
  }, [matchweekParam]);

  useEffect(() => {
    if (!selectedWeek || !user || !leagueId) return;
    setLoading(true);
    setError(null);
    setData(null);
    setCommentary(null);
    api
      .get(`/api/predictions/matchweek/${selectedWeek}/all?leagueId=${leagueId}`)
      .then((res) => {
        setData(res.data);
        setLoading(false);
      })
      .catch((err) => {
        setError(err.response?.data?.message || "Could not load predictions.");
        setLoading(false);
      });

    api
      .get(`/api/commentary/${selectedWeek}?leagueId=${leagueId}`)
      .then((res) => setCommentary(res.data))
      .catch(() => {
        api
          .post(`/api/commentary/${selectedWeek}/generate?leagueId=${leagueId}`)
          .then((res) => setCommentary(res.data))
          .catch(() => {});
      });
  }, [selectedWeek, user, leagueId]);

  const changeWeek = (delta) => {
    const next = (selectedWeek || 1) + delta;
    if (next < 1 || next > 38) return;
    setSelectedWeek(next);
    navigate(`/gameweek/${next}`, { replace: true });
  };

  if (authLoading) return null;

  const { fixtures = [], lockedFixtureIds = [], users = [] } = data || {};
  const lockedSet = new Set(lockedFixtureIds);
  const sortedUsers = [...users].sort((a, b) => b.weeklyTotal - a.weeklyTotal);

  return (
    <div>
      <div className="d-flex justify-content-between align-items-center mb-4 flex-wrap gap-2">
        <div>
          <h1 className="mb-0">GW{selectedWeek} Results</h1>
          {league && (
            <span style={{ color: "var(--text-muted)", fontSize: "0.85rem" }}>
              {league.name}
            </span>
          )}
        </div>
        <div className="d-flex align-items-center gap-2">
          <button
            className="btn btn-outline-secondary btn-sm"
            disabled={selectedWeek <= 1}
            onClick={() => changeWeek(-1)}
          >
            &laquo; Prev
          </button>
          {currentWeek && selectedWeek !== currentWeek && (
            <button
              className="btn btn-outline-primary btn-sm"
              onClick={() => {
                setSelectedWeek(currentWeek);
                navigate(`/gameweek/${currentWeek}`, { replace: true });
              }}
            >
              Current
            </button>
          )}
          <button
            className="btn btn-outline-secondary btn-sm"
            disabled={selectedWeek >= 38}
            onClick={() => changeWeek(1)}
          >
            Next &raquo;
          </button>
        </div>
      </div>

      {leagues.length > 1 && (
        <div className="mb-3">
          <LeaguePicker leagues={leagues} leagueId={leagueId} onChange={setLeagueId} />
        </div>
      )}

      {!leaguesLoading && leagues.length === 0 && (
        <div className="alert alert-info">
          Results are shown per league.{" "}
          <Link to="/leagues/create" className="alert-link">Create a league</Link> or{" "}
          <Link to="/leagues/join" className="alert-link">join one</Link> to see how
          you compare with your mates.
        </div>
      )}

      {(leaguesLoading || (loading && leagues.length > 0)) && (
        <div className="text-center mt-5">
          <div className="spinner-border" role="status">
            <span className="visually-hidden">Loading...</span>
          </div>
        </div>
      )}

      {error && (
        <div className="alert alert-danger">{error}</div>
      )}

      {!loading && !error && data && (
        <>
          {lockedSet.size === 0 && (
            <div className="alert alert-info">
              Predictions for this gameweek are not yet revealed — they unlock 1 hour before each kickoff.
            </div>
          )}

          {/* The Pundit's weekly report */}
          {commentary && (
            <div className="pundit-card mb-4">
              <div className="pundit-header">
                <span className="pundit-icon">🎙️</span>
                <span>The Pundit — GW{selectedWeek} Report</span>
                <span className="vu-meters" aria-hidden>
                  <i /><i /><i /><i /><i />
                </span>
              </div>
              <div className="pundit-body">
                <Typewriter text={commentary.text} />
              </div>
            </div>
          )}

          {/* Weekly summary table */}
          {sortedUsers.length > 0 && lockedSet.size > 0 && (
            <div className="card mb-4">
              <div className="card-header fw-bold">
                GW{selectedWeek} Points
                {sortedUsers[0] && (
                  <span className="motm-chip">Player of the week · {sortedUsers[0].username}</span>
                )}
              </div>
              <div className="table-responsive">
                <table className="table table-sm mb-0">
                  <thead className="table-dark">
                    <tr>
                      <th>Rank</th>
                      <th>Player</th>
                      <th>GW Pts</th>
                    </tr>
                  </thead>
                  <tbody>
                    {sortedUsers.map((u, i) => (
                      <tr
                        key={u.userId}
                        className={i < 3 ? `podium-${i + 1}` : ""}
                      >
                        <td><span className={`rank-badge ${i < 3 ? `rank-${i + 1}` : "rank-other"}`}>{i + 1}</span></td>
                        <td>{u.username}</td>
                        <td className="points-value">{u.weeklyTotal}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Per-fixture breakdown */}
          {fixtures.map((fixture) => {
            const fid = fixture._id;
            const isLocked = lockedSet.has(fid);
            const isFinished = fixture.status?.short === "FT";

            return (
              <div className="card mb-3" key={fid}>
                {/* Fixture header */}
                <div className="card-header">
                  <div className="d-flex justify-content-between align-items-center flex-wrap gap-2">
                    <div className="d-flex align-items-center gap-2">
                      <img src={fixture.teams.home.logo} alt="" width="24" />
                      <strong>{fixture.teams.home.name}</strong>
                      <span className="text-muted mx-1">vs</span>
                      <strong>{fixture.teams.away.name}</strong>
                      <img src={fixture.teams.away.logo} alt="" width="24" />
                    </div>
                    <div className="d-flex align-items-center gap-2">
                      {isFinished ? (
                        <span className="badge bg-success fs-6">
                          {fixture.goals.home} – {fixture.goals.away}
                        </span>
                      ) : isLocked ? (
                        <span className="badge bg-warning text-dark">In Progress / Not Started</span>
                      ) : (
                        <span className="badge bg-secondary">
                          {new Date(fixture.date).toLocaleDateString("en-GB", {
                            weekday: "short", day: "numeric", month: "short",
                            hour: "2-digit", minute: "2-digit",
                          })}
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Predictions table */}
                <div className="card-body p-0">
                  {!isLocked ? (
                    <p className="text-muted small p-3 mb-0">
                      Predictions hidden until 1 hour before kickoff.
                    </p>
                  ) : users.length === 0 ? (
                    <p className="text-muted small p-3 mb-0">No predictions submitted yet.</p>
                  ) : (
                    <div className="table-responsive">
                      <table className="table table-sm mb-0">
                        <thead className="table-light">
                          <tr>
                            <th>Player</th>
                            <th className="text-center">Prediction</th>
                            <th className="text-center">×2</th>
                            <th className="text-center">Pts</th>
                          </tr>
                        </thead>
                        <tbody>
                          {users.map((u) => {
                            const pred = u.predictions[fid];
                            return (
                              <tr
                                key={u.userId}
                                className=""
                              >
                                <td>{u.username}</td>
                                <td className="text-center">
                                  {pred ? (
                                    `${pred.predictedHomeScore} – ${pred.predictedAwayScore}`
                                  ) : (
                                    <span className="no-show">didn&apos;t bother</span>
                                  )}
                                </td>
                                <td className="text-center">
                                  {pred?.isDoublePoints ? "⚡" : ""}
                                </td>
                                <td className="text-center fw-bold">
                                  {pred != null ? (
                                    <PointsBadge points={pred.points} />
                                  ) : (
                                    <span className="no-show">0</span>
                                  )}
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              </div>
            );
          })}

          {fixtures.length === 0 && (
            <div className="alert alert-info">
              No fixtures found for GW{selectedWeek}.{" "}
              <Link to="/fixtures">View Fixtures</Link>
            </div>
          )}
        </>
      )}
    </div>
  );
}

function PointsBadge({ points }) {
  if (points === null) return <span className="text-muted">—</span>;
  if (points === 0) return <span className="text-danger">0</span>;
  if (points >= 6) return <span className="badge bg-warning text-dark hit-screamer">{points} screamer</span>;
  if (points >= 3) return <span className="badge bg-success hit-exact">{points} exact</span>;
  return <span className="badge bg-secondary">{points}</span>;
}

export default GameweekReview;
