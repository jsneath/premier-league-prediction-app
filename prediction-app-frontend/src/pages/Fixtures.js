import { useState, useEffect } from "react";

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
        console.log("Received data:", data); // Log the raw API response
        if (!Array.isArray(data)) {
          console.error("Expected an array but got:", data);
          return;
        }
        const grouped = data.reduce((acc, fixture) => {
          if (fixture.league && fixture.league.round) {
            const gameWeekMatch = fixture.league.round.match(/\d+/);
            const gameWeek = gameWeekMatch ? gameWeekMatch[0] : "Unknown";
            if (!acc[gameWeek]) acc[gameWeek] = [];
            acc[gameWeek].push(fixture);
          }
          return acc;
        }, {});
        console.log("Grouped fixtures:", grouped); // Log the processed data
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
        <p>No fixtures available.</p>
      ) : (
        Object.keys(fixtureGroups)
          .sort((a, b) => Number(a) - Number(b))
          .map((gameWeek) => (
            <div key={gameWeek}>
              <h2>Game Week {gameWeek}</h2>
              {fixtureGroups[gameWeek].map((fixture) => (
                <div key={fixture._id}>
                  {fixture.teams.home.name} vs {fixture.teams.away.name}
                </div>
              ))}
            </div>
          ))
      )}
    </div>
  );
}

export default Fixtures;
