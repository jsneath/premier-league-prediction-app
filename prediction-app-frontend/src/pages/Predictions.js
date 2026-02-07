import { useState, useEffect } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import PredictionForm from "../components/PredictionForm";

function Predictions() {
  const { matchweek } = useParams();
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [fixtures, setFixtures] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!authLoading && !user) {
      navigate("/login");
      return;
    }

    fetch(`/api/fixtures?matchweek=${matchweek}`)
      .then((response) => {
        if (!response.ok)
          throw new Error("Could not load fixtures for this matchweek");
        return response.json();
      })
      .then((data) => {
        setFixtures(data);
        setLoading(false);
      })
      .catch((err) => {
        setError(err.message);
        setLoading(false);
      });
  }, [matchweek, user, authLoading, navigate]);

  if (authLoading || loading) {
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
        <h1 className="mb-4">Predict Matchweek {matchweek}</h1>
        <div className="alert alert-danger">
          <strong>Something went wrong.</strong> {error}
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

  if (fixtures.length === 0) {
    return (
      <div>
        <h1 className="mb-4">Predict Matchweek {matchweek}</h1>
        <div className="alert alert-info">
          No fixtures found for Matchweek {matchweek}.{" "}
          <Link to="/fixtures">Back to Fixtures</Link>
        </div>
      </div>
    );
  }

  return (
    <div>
      <h1 className="mb-4">Predict Matchweek {matchweek}</h1>
      <PredictionForm fixtures={fixtures} matchweek={matchweek} />
    </div>
  );
}

export default Predictions;
