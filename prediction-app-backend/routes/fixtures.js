const express = require("express");
const router = express.Router();
const axios = require("axios");
const Fixture = require("../models/Fixture");

router.get("/", async (req, res) => {
  try {
    const response = await axios.get(
      "https://api-football-v1.p.rapidapi.com/v3/fixtures",
      {
        headers: {
          "X-RapidAPI-Key": process.env.API_FOOTBALL_KEY,
          "X-RapidAPI-Host": "api-football-v1.p.rapidapi.com",
        },
        params: { league: 39, season: 2024 }, // Example: Premier League 2024
      }
    );
    const fixtures = response.data.response;

    // Save each fixture to MongoDB
    for (const fixture of fixtures) {
      await Fixture.findOneAndUpdate(
        { id: fixture.fixture.id }, // Match by fixture ID
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
            teams: fixture.teams,
            goals: fixture.goals, // Save full-time scores
          },
        },
        { upsert: true, new: true } // Insert if not exists, return updated doc
      );
    }

    // Fetch all fixtures from DB and send as response
    const dbFixtures = await Fixture.find();
    res.json(dbFixtures);
  } catch (err) {
    console.error("Error:", err.message);
    res.status(500).json({ msg: "Server error" });
  }
});

module.exports = router;
