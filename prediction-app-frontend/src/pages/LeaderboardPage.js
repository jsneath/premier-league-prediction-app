import { useState, useEffect } from "react";
import Leaderboard from "../components/Leaderboard";
import { useAuth } from "../context/AuthContext";
import api from "../api/axios";

// Current season only — past-season history lives inside each league's page
function LeaderboardPage() {
  const [seasonLabel, setSeasonLabel] = useState(null);
  const [scores, setScores] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const { user } = useAuth();

  useEffect(() => {
    api.get("/api/fixtures/current")
      .then((res) => setSeasonLabel(res.data.seasonLabel))
      .catch(() => {});

    api.get("/api/scores/leaderboard")
      .then((res) => { setScores(Array.isArray(res.data) ? res.data : []); setLoading(false); })
      .catch((err) => {
        setError(err.response?.data?.message || "Could not load leaderboard");
        setLoading(false);
      });
  }, []);

  const myRank = user ? scores.findIndex((s) => s._id === user.id) + 1 : null;
  const myScore = user ? scores.find((s) => s._id === user.id) : null;
  const seasonStarted = scores.some((s) => s.totalPoints > 0);

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">
          Season Leaderboard
          {seasonLabel && (
            <span className="season-chip ms-2">{seasonLabel}</span>
          )}
        </h1>
        {myScore && (
          <span style={{ color: "var(--text-muted)", fontSize: "0.9rem" }}>
            Your rank: <strong style={{ color: "var(--purple-light)" }}>#{myRank}</strong>
            {" "}· <strong style={{ color: "var(--gold)" }}>{myScore.totalPoints} pts</strong>
          </span>
        )}
      </div>

      {loading ? (
        <div className="text-center mt-5">
          <div className="spinner-border" role="status"><span className="visually-hidden">Loading…</span></div>
        </div>
      ) : error ? (
        <div className="alert alert-danger">
          {error}
          <button className="btn btn-outline-danger btn-sm ms-3" onClick={() => window.location.reload()}>
            Retry
          </button>
        </div>
      ) : (
        <div className="card">
          <div className="card-body p-0">
            {!seasonStarted && scores.length > 0 && (
              <div className="p-3 pb-0 text-muted small">
                New season, clean slate — everyone starts on 0.
              </div>
            )}
            <Leaderboard scores={scores} currentUserId={user?.id} />
          </div>
        </div>
      )}
    </div>
  );
}

export default LeaderboardPage;
