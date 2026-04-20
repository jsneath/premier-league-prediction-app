import { useState, useEffect } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import api from "../api/axios";

function GameweekReview() {
  const { matchweek: matchweekParam } = useParams();
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();

  const [selectedWeek, setSelectedWeek] = useState(parseInt(matchweekParam) || null);
  const [currentWeek, setCurrentWeek] = useState(null);
  const [data, setData] = useState(null);
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
    if (!selectedWeek || !user) return;
    setLoading(true);
    setError(null);
    setData(null);
    api
      .get(`/api/predictions/matchweek/${selectedWeek}/all`)
      .then((res) => {
        setData(res.data);
        setLoading(false);
      })
      .catch((err) => {
        setError(err.response?.data?.message || "Could not load predictions.");
        setLoading(false);
      });
  }, [selectedWeek, user]);

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
      <div className="d-flex justify-content-between align-items-center mb-4">
        <h1 className="mb-0">GW{selectedWeek} Results</h1>
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

      {loading && (
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

          {/* Weekly summary table */}
          {sortedUsers.length > 0 && lockedSet.size > 0 && (
            <div className="card mb-4">
              <div className="card-header fw-bold">GW{selectedWeek} Points</div>
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
                        className=""
                      >
                        <td>{i + 1}</td>
                        <td>{u.username}</td>
                        <td>{u.weeklyTotal}</td>
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
                            {isFinished && <th className="text-center">Pts</th>}
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
                                  {pred
                                    ? `${pred.predictedHomeScore} – ${pred.predictedAwayScore}`
                                    : <span className="text-muted">—</span>}
                                </td>
                                <td className="text-center">
                                  {pred?.isDoublePoints ? "⚡" : ""}
                                </td>
                                {isFinished && (
                                  <td className="text-center fw-bold">
                                    {pred != null
                                      ? <PointsBadge points={pred.points} />
                                      : <span className="text-muted">—</span>}
                                  </td>
                                )}
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
  if (points >= 6) return <span className="badge bg-warning text-dark">{points}</span>;
  if (points >= 3) return <span className="badge bg-success">{points}</span>;
  return <span className="badge bg-secondary">{points}</span>;
}

export default GameweekReview;
