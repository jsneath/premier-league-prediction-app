const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const cron = require("node-cron");
const axios = require("axios");
const Fixture = require("./models/Fixture");
const Prediction = require("./models/Prediction");
const Score = require("./models/Score");
require("dotenv").config();

const app = express();
app.use(
  cors(
    process.env.FRONTEND_URL
      ? { origin: process.env.FRONTEND_URL }
      : undefined
  )
);
app.use(express.json());

mongoose
  .connect(process.env.MONGO_URI)
  .then(() => console.log("MongoDB connected"))
  .catch((err) => console.log(err));

// New: Function to refresh fixtures (call your route logic)
const refreshFixtures = async () => {
  try {
    console.log("Starting daily fixture refresh...");
    // Reuse your fetch/save logic from routes/fixtures.js
    let url =
      "https://api-football-v1.p.rapidapi.com/v3/fixtures?league=39&season=2025"; // Full season
    const response = await axios.get(url, {
      headers: {
        "X-RapidAPI-Key": process.env.API_FOOTBALL_KEY,
        "X-RapidAPI-Host": "api-football-v1.p.rapidapi.com",
      },
    });
    const fixtures = response.data.response;

    for (const fixture of fixtures) {
      const matchweekMatch = fixture.league.round.match(/\d+/);
      const matchweek = matchweekMatch ? parseInt(matchweekMatch[0]) : null;
      await Fixture.findOneAndUpdate(
        { id: fixture.fixture.id },
        {
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
            // Add any new fields like league.season: fixture.league.season
          },
        },
        { upsert: true, new: true }
      );
    }
    console.log("Fixtures refreshed successfully.");

    // After refreshing fixtures, recalculate scores
    await updateScores();
  } catch (err) {
    console.error("Error refreshing fixtures:", err);
  }
};

const updateScores = async () => {
  try {
    const fixtures = await Fixture.find({ "status.short": "FT" });
    const matchweeks = [...new Set(fixtures.map((f) => f.matchweek))];

    for (const matchweek of matchweeks) {
      const weekFixtures = fixtures.filter((f) => f.matchweek === matchweek);
      const predictions = await Prediction.find({ matchweek });

      for (const predDoc of predictions) {
        let totalPoints = 0;

        for (const pred of predDoc.predictions) {
          const fixture = weekFixtures.find(
            (f) => f._id.toString() === pred.fixtureId.toString()
          );
          if (!fixture) continue;

          const actualHome = fixture.goals.home;
          const actualAway = fixture.goals.away;
          if (actualHome === null || actualAway === null) continue;

          const exactMatch =
            pred.predictedHomeScore === actualHome &&
            pred.predictedAwayScore === actualAway;
          const correctResult =
            (pred.predictedHomeScore > pred.predictedAwayScore && actualHome > actualAway) ||
            (pred.predictedHomeScore < pred.predictedAwayScore && actualHome < actualAway) ||
            (pred.predictedHomeScore === pred.predictedAwayScore && actualHome === actualAway);

          if (exactMatch) totalPoints += pred.isDoublePoints ? 6 : 3;
          else if (correctResult) totalPoints += pred.isDoublePoints ? 2 : 1;
        }

        await Score.findOneAndUpdate(
          { userId: predDoc.userId, matchweek },
          { $set: { points: totalPoints } },
          { upsert: true }
        );
      }
    }
    console.log("Scores updated successfully.");
  } catch (err) {
    console.error("Error updating scores:", err);
  }
};

// Refresh fixtures + recalculate scores every 2 hours
cron.schedule("0 */2 * * *", refreshFixtures);

app.use("/api/auth", require("./middleware/auth"));
app.use("/api/fixtures", require("./routes/fixtures"));
app.use("/api/predictions", require("./routes/predictions"));
app.use("/api/scores", require("./routes/scores"));
app.use("/api/leagues", require("./routes/leagues"));

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
