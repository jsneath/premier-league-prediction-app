import { Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { useState, useEffect } from "react";
import Leaderboard from "../components/Leaderboard";
import api from "../api/axios";

function Home() {
  const { user } = useAuth();
  const [scores, setScores] = useState([]);
  const [currentWeek, setCurrentWeek] = useState(null);
  const [scoresError, setScoresError] = useState(false);

  useEffect(() => {
    api.get("/api/fixtures/current")
      .then((res) => setCurrentWeek(res.data.matchweek))
      .catch(() => {});

    if (user) {
      api.get("/api/scores/leaderboard")
        .then((res) => setScores(Array.isArray(res.data) ? res.data : []))
        .catch(() => setScoresError(true));
    }
  }, [user]);

  return (
    <div>
      {/* Hero */}
      <div className="hero-section">
        <div className="row align-items-center">
          <div className="col-lg-7">
            <h1 className="hero-title">Premier League<br />Predictions</h1>
            <p className="hero-subtitle">
              Pick your scores, earn points, and beat your mates all season long.
            </p>
            <div className="d-flex gap-2 flex-wrap">
              {currentWeek && (
                <Link to={`/fixtures`} className="btn btn-primary btn-lg">
                  GW{currentWeek} Fixtures
                </Link>
              )}
              {user && currentWeek && (
                <Link to={`/predictions/${currentWeek}`} className="btn btn-success btn-lg">
                  Make Predictions
                </Link>
              )}
              {!user && (
                <Link to="/login" className="btn btn-outline-primary btn-lg">
                  Get Started
                </Link>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Scoring rules + leaderboard */}
      <div className="row g-3">
        <div className="col-lg-5">
          <div className="card h-100">
            <div className="card-header">How Scoring Works</div>
            <div className="card-body d-flex flex-column gap-2">
              <div className="scoring-pill">
                <span className="scoring-pill-points">3</span>
                <span className="scoring-pill-label">pts for exact score prediction</span>
              </div>
              <div className="scoring-pill">
                <span className="scoring-pill-points">1</span>
                <span className="scoring-pill-label">pt for correct result (win/draw/loss)</span>
              </div>
              <div className="scoring-pill">
                <span className="scoring-pill-points" style={{ color: "var(--purple-light)", fontSize: "1.1rem" }}>×2</span>
                <span className="scoring-pill-label">Double Points — pick one match per week</span>
              </div>
              <div className="scoring-pill" style={{ marginTop: "auto" }}>
                <span className="scoring-pill-points" style={{ fontSize: "1rem" }}>⏰</span>
                <span className="scoring-pill-label">Predictions lock 1 hour before kickoff</span>
              </div>
            </div>
          </div>
        </div>

        <div className="col-lg-7">
          <div className="card h-100">
            <div className="card-header d-flex justify-content-between align-items-center">
              <span>Season Leaderboard</span>
              <Link to="/leaderboard" className="btn btn-outline-secondary btn-sm">View All</Link>
            </div>
            <div className="card-body p-0">
              {!user ? (
                <div className="p-4 text-center text-muted">
                  <p className="mb-2">Sign in to see the leaderboard.</p>
                  <Link to="/login" className="btn btn-primary btn-sm">Login</Link>
                </div>
              ) : scoresError ? (
                <div className="p-4 text-muted">Could not load leaderboard — try again later.</div>
              ) : scores.length === 0 ? (
                <div className="p-4 text-muted">No scores yet. Start predicting!</div>
              ) : (
                <Leaderboard scores={scores.slice(0, 5)} currentUserId={user?.id} />
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Home;
