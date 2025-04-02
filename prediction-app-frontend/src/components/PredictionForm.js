// src/components/PredictionForm.js
import React, { useState } from "react";

const PredictionForm = ({ fixtureId, onSubmit }) => {
  const [homeScore, setHomeScore] = useState("");
  const [awayScore, setAwayScore] = useState("");

  const handleSubmit = (e) => {
    e.preventDefault();
    onSubmit(fixtureId, homeScore, awayScore);
    setHomeScore("");
    setAwayScore("");
  };

  return (
    <form onSubmit={handleSubmit}>
      <input
        type="number"
        value={homeScore}
        onChange={(e) => setHomeScore(e.target.value)}
        placeholder="Home Score"
        required
      />
      <input
        type="number"
        value={awayScore}
        onChange={(e) => setAwayScore(e.target.value)}
        placeholder="Away Score"
        required
      />
      <button type="submit">Submit Prediction</button>
    </form>
  );
};

export default PredictionForm;
