import { Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { useState, useEffect } from "react";
import Leaderboard from "../components/Leaderboard";
import LeaguePicker from "../components/LeaguePicker";
import Reveal from "../components/Reveal";
import { useMyLeagues } from "../hooks/useMyLeagues";
import api from "../api/axios";

function Home() {
  const { user } = useAuth();
  const { leagues, league, leagueId, setLeagueId, loading: leaguesLoading } =
    useMyLeagues(user);
  const [scores, setScores] = useState([]);
  const [currentWeek, setCurrentWeek] = useState(null);
  const [seasonLabel, setSeasonLabel] = useState(null);
  const [scoresError, setScoresError] = useState(false);

  useEffect(() => {
    api.get("/api/fixtures/current")
      .then((res) => {
        setCurrentWeek(res.data.matchweek);
        setSeasonLabel(res.data.seasonLabel);
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (!leagueId) return;
    setScoresError(false);
    api.get(`/api/leagues/${leagueId}/leaderboard`)
      .then((res) => setScores(Array.isArray(res.data) ? res.data : []))
      .catch(() => setScoresError(true));
  }, [leagueId]);

  return (
    <div>
      {/* Hero */}
      <div className="hero-section">
        <div className="row align-items-center">
          <div className="col-lg-7">
            {seasonLabel && (
              <span className="season-chip season-chip-hero">Season {seasonLabel}</span>
            )}
            <h1 className="hero-title">
              Premier League<br />
              <span className="accent">Predictions</span>
            </h1>
            <p className="hero-subtitle">
              Call the scores, bank the points, and settle it with your mates
              over thirty-eight gameweeks.
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
          <Reveal className="h-100">
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
                <span className="scoring-pill-points" style={{ color: "var(--gold)", fontSize: "1.25rem" }}>×2</span>
                <span className="scoring-pill-label">Double Points — pick one match per week</span>
              </div>
              <div className="scoring-pill" style={{ marginTop: "auto" }}>
                <span className="scoring-pill-points" style={{ fontSize: "1.1rem" }}>⏰</span>
                <span className="scoring-pill-label">Predictions lock 1 hour before kickoff</span>
              </div>
            </div>
          </div>
          </Reveal>
        </div>

        <div className="col-lg-7">
          <Reveal delay={90} className="h-100">
          <div className="card h-100">
            <div className="card-header d-flex justify-content-between align-items-center gap-2 flex-wrap">
              <span>{league ? league.name : "League Table"}</span>
              {league && (
                <Link to={`/leagues/${league._id}`} className="btn btn-outline-secondary btn-sm">
                  View League
                </Link>
              )}
            </div>
            <div className="card-body p-0">
              {!user ? (
                <div className="p-4 text-center text-muted">
                  <p className="mb-2">Sign in to see your league table.</p>
                  <Link to="/login" className="btn btn-primary btn-sm">Login</Link>
                </div>
              ) : leaguesLoading ? (
                <div className="p-4 text-center">
                  <div className="spinner-border spinner-border-sm" role="status" />
                </div>
              ) : leagues.length === 0 ? (
                <div className="p-4 text-center text-muted">
                  <p className="mb-3">
                    You're not in a league yet. Create one for your mates, or join
                    theirs with an invite code.
                  </p>
                  <div className="d-flex gap-2 justify-content-center flex-wrap">
                    <Link to="/leagues/create" className="btn btn-primary btn-sm">Create League</Link>
                    <Link to="/leagues/join" className="btn btn-outline-primary btn-sm">Join League</Link>
                  </div>
                </div>
              ) : scoresError ? (
                <div className="p-4 text-muted">Could not load the table — try again later.</div>
              ) : scores.length === 0 ? (
                <div className="p-4 text-muted">No scores yet. Start predicting!</div>
              ) : (
                <>
                  <Leaderboard scores={scores.slice(0, 5)} currentUserId={user?.id} />
                  {leagues.length > 1 && (
                    <div className="p-3 pt-2" style={{ borderTop: "1px solid var(--border)" }}>
                      <LeaguePicker leagues={leagues} leagueId={leagueId} onChange={setLeagueId} />
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
          </Reveal>
        </div>
      </div>
    </div>
  );
}

export default Home;
