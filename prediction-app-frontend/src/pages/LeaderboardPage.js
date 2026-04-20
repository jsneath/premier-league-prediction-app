import { useState, useEffect } from "react";
import Leaderboard from "../components/Leaderboard";
import { useAuth } from "../context/AuthContext";
import api from "../api/axios";

function LeaderboardPage() {
  const [scores, setScores] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const { user } = useAuth();

  useEffect(() => {
    api.get("/api/scores/leaderboard")
      .then((res) => { setScores(Array.isArray(res.data) ? res.data : []); setLoading(false); })
      .catch((err) => {
        setError(err.response?.data?.message || "Could not load leaderboard");
        setLoading(false);
      });
  }, []);

  if (loading) {
    return (
      <div className="text-center mt-5">
        <div className="spinner-border" role="status"><span className="visually-hidden">Loading…</span></div>
      </div>
    );
  }

  const myRank = user ? scores.findIndex((s) => s._id === user.id) + 1 : null;
  const myScore = user ? scores.find((s) => s._id === user.id) : null;

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">Season Leaderboard</h1>
        {myScore && (
          <span style={{ color: "var(--text-muted)", fontSize: "0.9rem" }}>
            Your rank: <strong style={{ color: "var(--purple-light)" }}>#{myRank}</strong>
            {" "}· <strong style={{ color: "var(--gold)" }}>{myScore.totalPoints} pts</strong>
          </span>
        )}
      </div>

      {error ? (
        <div className="alert alert-danger">
          {error}
          <button className="btn btn-outline-danger btn-sm ms-3" onClick={() => window.location.reload()}>
            Retry
          </button>
        </div>
      ) : (
        <div className="card">
          <div className="card-body p-0">
            <Leaderboard scores={scores} currentUserId={user?.id} />
          </div>
        </div>
      )}
    </div>
  );
}

export default LeaderboardPage;
