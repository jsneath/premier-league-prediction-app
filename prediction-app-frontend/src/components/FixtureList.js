import React, { useState, useEffect } from "react";

function FixtureList({ fixtures }) {
  // State to store predicted scores, selected fixture for double points, and actual scores
  const [predictedScores, setPredictedScores] = useState({});
  const [selectedFixture, setSelectedFixture] = useState(null);
  const [actualScores, setActualScores] = useState({});

  // Fetch actual scores for completed fixtures when the component mounts or fixtures change
  useEffect(() => {
    const fetchActualScores = async () => {
      const scores = {};
      for (const fixture of fixtures) {
        if (fixture.status === "completed") {
          try {
            const response = await fetch(`/api/fixtures/${fixture.id}/score`);
            const data = await response.json();
            scores[fixture.id] = data; // Assuming data is { home: number, away: number }
          } catch (error) {
            console.error("Error fetching actual score:", error);
          }
        }
      }
      setActualScores(scores);
    };

    fetchActualScores();
  }, [fixtures]);

  // Handle changes to predicted scores
  const handlePredictedScoreChange = (fixtureId, team, value) => {
    setPredictedScores((prev) => ({
      ...prev,
      [fixtureId]: {
        ...prev[fixtureId],
        [team]: Number(value), // Convert to number for calculations
      },
    }));
  };

  // Handle selecting a fixture for double points
  const handleSelectDoublePoints = (fixtureId) => {
    setSelectedFixture(fixtureId);
  };

  // Calculate points based on predicted and actual scores
  const calculatePoints = (predictedScore, actualScore, isDoublePoints) => {
    // If no actual score (fixture not completed), return 0
    if (!actualScore) {
      return 0;
    }

    const predictedHome = predictedScore?.home ?? 0; // Default to 0 if not entered
    const predictedAway = predictedScore?.away ?? 0;
    const actualHome = actualScore.home;
    const actualAway = actualScore.away;

    let points = 0;

    // Check for exact score
    if (predictedHome === actualHome && predictedAway === actualAway) {
      points = 3;
    }
    // Check for correct result (win, loss, or draw)
    else if (
      (predictedHome > predictedAway && actualHome > actualAway) || // Home win
      (predictedHome < predictedAway && actualHome < actualAway) || // Away win
      (predictedHome === predictedAway && actualHome === actualAway) // Draw
    ) {
      points = 1;
    }
    // Incorrect result remains 0 (default)

    // Double points if this is the selected fixture
    if (isDoublePoints) {
      points *= 2;
    }

    return points;
  };

  return (
    <div>
      {fixtures.length === 0 ? (
        <p>No upcoming fixtures available.</p>
      ) : (
        <ul className="list-group">
          {fixtures.map((fixture) => {
            const actualScore = actualScores[fixture.id];
            const predictedScore = predictedScores[fixture.id] || {};
            const isDoublePoints = selectedFixture === fixture.id;
            const points = calculatePoints(
              predictedScore,
              actualScore,
              isDoublePoints
            );

            return (
              <li key={fixture.id} className="list-group-item">
                <strong>{fixture.teams.home.name}</strong> vs{" "}
                <strong>{fixture.teams.away.name}</strong>
                <br />
                Date: {new Date(fixture.date).toLocaleString()}
                <br />
                Venue: {fixture.venue.name}, {fixture.venue.city}
                <br />
                {/* Conditional rendering based on fixture status */}
                {fixture.status === "completed" ? (
                  <>
                    Actual Score: {actualScore.home} - {actualScore.away}
                    <br />
                    Predicted Score: {predictedScore.home ?? "N/A"} -{" "}
                    {predictedScore.away ?? "N/A"}
                    <br />
                    Points: {points}
                  </>
                ) : (
                  <>
                    <label>
                      Home Score:
                      <input
                        type="number"
                        min="0"
                        placeholder="Home Score"
                        value={predictedScore.home ?? ""}
                        onChange={(e) =>
                          handlePredictedScoreChange(
                            fixture.id,
                            "home",
                            e.target.value
                          )
                        }
                        style={{ marginLeft: "5px", width: "60px" }}
                      />
                    </label>
                    <label style={{ marginLeft: "10px" }}>
                      Away Score:
                      <input
                        type="number"
                        min="0"
                        placeholder="Away Score"
                        value={predictedScore.away ?? ""}
                        onChange={(e) =>
                          handlePredictedScoreChange(
                            fixture.id,
                            "away",
                            e.target.value
                          )
                        }
                        style={{ marginLeft: "5px", width: "60px" }}
                      />
                    </label>
                    <br />
                    <label>
                      <input
                        type="checkbox"
                        checked={isDoublePoints}
                        onChange={() => handleSelectDoublePoints(fixture.id)}
                      />
                      Select for double points
                    </label>
                  </>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

export default FixtureList;
