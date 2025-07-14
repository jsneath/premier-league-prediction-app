import { useState, useEffect } from "react";
import { Link } from "react-router-dom"; // Assuming Router setup

function Fixtures() {
  const [fixtureGroups, setFixtureGroups] = useState({});

  useEffect(() => {
    console.log("Fetching fixtures from http://localhost:5000/api/fixtures");
    fetch("http://localhost:5000/api/fixtures")
      .then((res) => {
        if (!res.ok) {
          throw new Error(`HTTP error! status: ${res.status}`);
        }
        return res.json();
      })
      .then((data) => {
        console.log("Received data:", data);
        if (!Array.isArray(data)) {
          console.error("Expected an array but got:", data);
          return;
        }
        const grouped = data.reduce((acc, fixture) => {
          const gameWeek = fixture.matchweek || "Unknown"; // Use new field
          if (!acc[gameWeek]) acc[gameWeek] = [];
          acc[gameWeek].push(fixture);
          return acc;
        }, {});
        console.log("Grouped fixtures:", grouped);
        setFixtureGroups(grouped);
      })
      .catch((error) => {
        console.error("Error fetching fixtures:", error);
      });
  }, []);

  return (
    <div>
      <h1>Fixtures</h1>
      {Object.keys(fixtureGroups).length === 0 ? (
        <p>No fixtures available. Check back later.</p>
      ) : (
        Object.keys(fixtureGroups)
          .sort((a, b) => Number(a) - Number(b))
          .map((gameWeek) => (
            <div key={gameWeek}>
              <h2>
                Matchweek {gameWeek}{" "}
                <Link to={`/predictions/${gameWeek}`}>Predict</Link>
              </h2>{" "}
              {/* Link to predictions page with param */}
              {fixtureGroups[gameWeek].map((fixture) => (
                <div key={fixture._id}>
                  {fixture.teams.home.name} vs {fixture.teams.away.name} -{" "}
                  {new Date(fixture.date).toLocaleDateString()}
                </div>
              ))}
            </div>
          ))
      )}
    </div>
  );
}

export default Fixtures;
