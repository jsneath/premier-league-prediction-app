const axios = require("axios");
const Fixture = require("../models/Fixture");
const { CURRENT_SEASON } = require("./season");

// Pull the full season's fixtures from API-Football and upsert into MongoDB.
// League/season are configurable so next season only needs an env change.
async function refreshFixtures() {
  const league = process.env.API_FOOTBALL_LEAGUE || "39"; // Premier League
  const url = `https://api-football-v1.p.rapidapi.com/v3/fixtures?league=${league}&season=${CURRENT_SEASON}`;

  const response = await axios.get(url, {
    headers: {
      "X-RapidAPI-Key": process.env.API_FOOTBALL_KEY,
      "X-RapidAPI-Host": "api-football-v1.p.rapidapi.com",
    },
  });

  const fixtures = response.data.response;

  // One bulk upsert instead of ~380 sequential round-trips
  const ops = fixtures.map((fixture) => {
    const matchweekMatch = fixture.league.round.match(/\d+/);
    const matchweek = matchweekMatch ? parseInt(matchweekMatch[0]) : null;

    return {
      updateOne: {
        filter: { id: fixture.fixture.id },
        update: {
          $set: {
            id: fixture.fixture.id,
            referee: fixture.fixture.referee,
            timezone: fixture.fixture.timezone,
            date: new Date(fixture.fixture.date),
            timestamp: fixture.fixture.timestamp,
            periods: fixture.fixture.periods,
            venue: fixture.fixture.venue,
            status: fixture.fixture.status,
            league: fixture.league,
            matchweek,
            teams: fixture.teams,
            goals: fixture.goals,
          },
        },
        upsert: true,
      },
    };
  });

  if (ops.length > 0) {
    await Fixture.bulkWrite(ops);
  }

  return ops.length;
}

module.exports = refreshFixtures;
