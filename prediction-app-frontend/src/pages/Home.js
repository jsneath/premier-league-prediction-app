import { Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { useState, useEffect } from "react";
import Leaderboard from "../components/Leaderboard";

function Home() {
  const { user } = useAuth();
  const [scores, setScores] = useState([]);
  const [scoresError, setScoresError] = useState(false);

  useEffect(() => {
    if (user) {
      fetch("/api/scores/leaderboard")
        .then((res) => {
          if (!res.ok) throw new Error();
          return res.json();
        })
        .then((data) => setScores(Array.isArray(data) ? data : []))
        .catch(() => setScoresError(true));
    }
  }, [user]);

  return (
    <div>
      <div className="text-center py-5">
        <h1 className="display-5 fw-bold">Premier League Predictions</h1>
        <p className="lead text-muted">
          Predict match scores, earn points, and compete with friends!
        </p>
        <div className="d-flex justify-content-center gap-3 mt-4">
          <Link to="/fixtures" className="btn btn-primary btn-lg">
            View Fixtures
          </Link>
          {!user && (
            <Link to="/login" className="btn btn-outline-primary btn-lg">
              Get Started
            </Link>
          )}
        </div>
      </div>

      <div className="row mt-4">
        <div className="col-md-6">
          <div className="card">
            <div className="card-body">
              <h5 className="card-title">How Scoring Works</h5>
              <ul className="list-unstyled">
                <li className="mb-2">
                  <strong>3 points</strong> - Exact score prediction
                </li>
                <li className="mb-2">
                  <strong>1 point</strong> - Correct result (win/draw/loss)
                </li>
                <li className="mb-2">
                  <strong>Double Points</strong> - Pick one match per week to
                  double your points
                </li>
              </ul>
            </div>
          </div>
        </div>
        <div className="col-md-6">
          {user && scores.length > 0 ? (
            <div className="card">
              <div className="card-body">
                <h5 className="card-title">
                  Leaderboard{" "}
                  <Link to="/leaderboard" className="small">
                    View All
                  </Link>
                </h5>
                <Leaderboard
                  scores={scores.slice(0, 5)}
                  currentUserId={user?.id}
                />
              </div>
            </div>
          ) : (
            <div className="card">
              <div className="card-body">
                <h5 className="card-title">Get Started</h5>
                <p>
                  {user
                    ? scoresError
                      ? "Could not load leaderboard — check back later."
                      : "Head to Fixtures to start predicting!"
                    : "Login or register to start making predictions and climb the leaderboard."}
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default Home;
