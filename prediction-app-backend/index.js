const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const cron = require("node-cron"); // New import
const axios = require("axios"); // Added import for axios
const Fixture = require("./models/Fixture"); // Added import for Fixture model
require("dotenv").config();

const app = express();
app.use(cors());
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
  } catch (err) {
    console.error("Error refreshing fixtures:", err);
  }
};

// New: Schedule daily refresh (every day at 00:00 UTC)
cron.schedule("0 0 * * *", refreshFixtures);

app.use("/api/auth", require("./middleware/auth")); // Changed back to middleware/auth assuming that's where your auth file is
app.use("/api/fixtures", require("./routes/fixtures"));
app.use("/api/predictions", require("./routes/predictions"));
app.use("/api/scores", require("./routes/scores"));

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
