import React, { useState, useEffect } from "react";
import axios from "axios";

const PredictionForm = ({ fixtures, matchweek }) => {
  const [predictions, setPredictions] = useState([]);
  const [message, setMessage] = useState("");

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) {
      setMessage("Please log in to view/submit predictions");
      return; // Safe: Inside useEffect callback
    }

    const fetchPreds = async () => {
      try {
        const res = await axios.get(`/api/predictions/${matchweek}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        const existing = res.data.predictions || [];
        setPredictions(
          fixtures.map((f) => ({
            fixtureId: f._id,
            predictedHomeScore:
              existing.find((p) => p.fixtureId === f._id)?.predictedHomeScore ||
              "",
            predictedAwayScore:
              existing.find((p) => p.fixtureId === f._id)?.predictedAwayScore ||
              "",
            isDoublePoints:
              existing.find((p) => p.fixtureId === f._id)?.isDoublePoints ||
              false,
          }))
        );
      } catch (err) {
        setMessage("Error: " + (err.response?.data?.message || "Load failed"));
        // Fallback to empty form on error
        setPredictions(
          fixtures.map((f) => ({
            fixtureId: f._id,
            predictedHomeScore: "",
            predictedAwayScore: "",
            isDoublePoints: false,
          }))
        );
      }
    };
    fetchPreds();
  }, [fixtures, matchweek]);

  const handleScoreChange = (idx, field, value) => {
    if (predictions.length === 0 || !predictions[idx]) return;
    const updated = [...predictions];
    updated[idx][field] = parseInt(value) || "";
    setPredictions(updated);
  };

  const handleDoubleChange = (idx) => {
    setPredictions(
      predictions.map((p, i) => ({ ...p, isDoublePoints: i === idx }))
    );
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const token = localStorage.getItem("token");
    if (!token) {
      setMessage("Log in required");
      return;
    }
    try {
      await axios.post(
        "/api/predictions",
        { matchweek, predictions },
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );
      setMessage("Predictions submitted!");
    } catch (err) {
      setMessage(err.response?.data?.message || "Submit failed");
    }
  };

  if (message.includes("log in")) {
    return (
      <div>
        {message}{" "}
        <button onClick={() => (window.location.href = "/login")}>
          Log In
        </button>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit}>
      {fixtures.map((f, idx) => (
        <div key={f._id}>
          <span>
            {f.teams.home.name} vs {f.teams.away.name}
          </span>
          <input
            type="number"
            min="0"
            value={predictions[idx]?.predictedHomeScore || ""}
            onChange={(e) =>
              handleScoreChange(idx, "predictedHomeScore", e.target.value)
            }
          />
          <input
            type="number"
            min="0"
            value={predictions[idx]?.predictedAwayScore || ""}
            onChange={(e) =>
              handleScoreChange(idx, "predictedAwayScore", e.target.value)
            }
          />
          <label>
            Double:
            <input
              type="radio"
              checked={predictions[idx]?.isDoublePoints || false}
              onChange={() => handleDoubleChange(idx)}
            />
          </label>
        </div>
      ))}
      <button type="submit">Submit</button>
      {message && <p>{message}</p>}
    </form>
  );
};

export default PredictionForm;
