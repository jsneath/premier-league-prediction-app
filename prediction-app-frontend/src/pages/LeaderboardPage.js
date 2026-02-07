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
    api
      .get("/api/scores/leaderboard")
      .then((res) => {
        setScores(Array.isArray(res.data) ? res.data : []);
        setLoading(false);
      })
      .catch((err) => {
        setError(
          err.response?.data?.message || "Could not load leaderboard"
        );
        setLoading(false);
      });
  }, []);

  if (loading) {
    return (
      <div className="text-center mt-5">
        <div className="spinner-border" role="status">
          <span className="visually-hidden">Loading...</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div>
        <h1 className="mb-4">Leaderboard</h1>
        <div className="alert alert-danger">
          <strong>Failed to load leaderboard.</strong> Please check your
          connection and try again.
          <button
            className="btn btn-outline-danger btn-sm ms-3"
            onClick={() => window.location.reload()}
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div>
      <h1 className="mb-4">Leaderboard</h1>
      {scores.length === 0 ? (
        <div className="alert alert-info">
          No scores yet. The leaderboard will populate once matchweek results
          are in.
        </div>
      ) : (
        <Leaderboard scores={scores} currentUserId={user?.id} />
      )}
    </div>
  );
}

export default LeaderboardPage;
