import React, { useState, useEffect } from "react";
import { useParams } from "react-router-dom"; // New import
import PredictionForm from "../components/PredictionForm";

function Predictions() {
  const { matchweek } = useParams(); // Get from URL, e.g., "1"
  const [fixtures, setFixtures] = useState([]);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetch(`http://localhost:5000/api/fixtures?matchweek=${matchweek}`)
      .then((response) => {
        if (!response.ok) {
          throw new Error(`HTTP error! Status: ${response.status}`);
        }
        return response.json();
      })
      .then((data) => {
        console.log("Fetched fixtures for week:", data);
        setFixtures(data);
      })
      .catch((err) => {
        console.error("Error fetching fixtures:", err);
        setError(err.message);
      });
  }, [matchweek]);

  if (error) {
    return <div>Error: {error}</div>;
  }
  if (fixtures.length === 0) {
    return <div>Loading fixtures for Matchweek {matchweek}...</div>;
  }

  return (
    <div>
      <h1>Predict Matchweek {matchweek}</h1>
      <PredictionForm fixtures={fixtures} matchweek={matchweek} />
    </div>
  );
}

export default Predictions;
