import { useState, useEffect } from "react";
import Leaderboard from "../components/Leaderboard";
import { useAuth } from "../context/AuthContext";
import api from "../api/axios";

function LeaderboardPage() {
  const [seasons, setSeasons] = useState([]);
  const [selectedSeason, setSelectedSeason] = useState(null);
  const [scores, setScores] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const { user } = useAuth();

  useEffect(() => {
    api.get("/api/scores/seasons")
      .then((res) => {
        const list = Array.isArray(res.data) ? res.data : [];
        setSeasons(list);
        const current = list.find((s) => s.current);
        setSelectedSeason(current ? current.season : null);
      })
      .catch(() => setError("Could not load seasons"));
  }, []);

  useEffect(() => {
    if (selectedSeason === null) return;
    setLoading(true);
    setError(null);
    api.get(`/api/scores/leaderboard?season=${selectedSeason}`)
      .then((res) => { setScores(Array.isArray(res.data) ? res.data : []); setLoading(false); })
      .catch((err) => {
        setError(err.response?.data?.message || "Could not load leaderboard");
        setLoading(false);
      });
  }, [selectedSeason]);

  const seasonMeta = seasons.find((s) => s.season === selectedSeason);
  const isHistory = seasonMeta && !seasonMeta.current;
  const champion = isHistory && scores.length > 0 ? scores[0] : null;

  const myRank = user ? scores.findIndex((s) => s._id === user.id) + 1 : null;
  const myScore = user ? scores.find((s) => s._id === user.id) : null;

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">
          Leaderboard
          {seasonMeta && (
            <span className="season-chip ms-2">{seasonMeta.label}</span>
          )}
        </h1>
        {!isHistory && myScore && (
          <span style={{ color: "var(--text-muted)", fontSize: "0.9rem" }}>
            Your rank: <strong style={{ color: "var(--purple-light)" }}>#{myRank}</strong>
            {" "}· <strong style={{ color: "var(--gold)" }}>{myScore.totalPoints} pts</strong>
          </span>
        )}
      </div>

      {seasons.length > 1 && (
        <div className="season-switch mb-3">
          {seasons.map((s) => (
            <button
              key={s.season}
              className={`season-switch-btn ${s.season === selectedSeason ? "active" : ""}`}
              onClick={() => setSelectedSeason(s.season)}
            >
              {s.label}
              {s.current ? "" : " · History"}
            </button>
          ))}
        </div>
      )}

      {champion && (
        <div className="champion-banner mb-3">
          <span className="champion-trophy">🏆</span>
          <div>
            <div className="champion-title">{seasonMeta.label} Champion</div>
            <div className="champion-name">
              {champion.username}
              <span className="champion-pts">{champion.totalPoints} pts</span>
            </div>
          </div>
        </div>
      )}

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
            {scores.length === 0 || scores.every((s) => s.totalPoints === 0) ? (
              !isHistory && scores.length > 0 ? (
                <>
                  <div className="p-3 pb-0 text-muted small">
                    New season, clean slate — everyone starts on 0.
                  </div>
                  <Leaderboard scores={scores} currentUserId={user?.id} />
                </>
              ) : (
                <p className="text-muted p-4 mb-0">No scores for this season.</p>
              )
            ) : (
              <Leaderboard scores={scores} currentUserId={user?.id} />
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default LeaderboardPage;
