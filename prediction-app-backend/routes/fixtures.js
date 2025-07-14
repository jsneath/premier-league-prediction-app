const express = require("express");
const router = express.Router();
const axios = require("axios");
const Fixture = require("../models/Fixture");

router.get("/", async (req, res) => {
  try {
    // Build the API request URL with optional filters
    let url =
      "https://api-football-v1.p.rapidapi.com/v3/fixtures?league=39&season=2025"; // Updated season
    if (req.query.status) {
      url += `&status=${req.query.status}`;
    }
    if (req.query.matchweek) {
      url += `&round=Regular%20Season%20-%20${req.query.matchweek}`;
    }

    // Fetch fixtures from API-Football
    const response = await axios.get(url, {
      headers: {
        "X-RapidAPI-Key": process.env.API_FOOTBALL_KEY,
        "X-RapidAPI-Host": "api-football-v1.p.rapidapi.com",
      },
    });

    const fixtures = response.data.response;
    console.log("API-Football response:", response.data); // Log for debugging

    // Save each fixture to MongoDB
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
            matchweek, // New: Extracted
            teams: fixture.teams,
            goals: fixture.goals,
          },
        },
        { upsert: true, new: true }
      );
    }

    // Build query for fetching from DB
    let query = {};
    if (req.query.status) {
      query["status.short"] = req.query.status;
    }
    if (req.query.matchweek) {
      query.matchweek = parseInt(req.query.matchweek);
    }

    // Fetch filtered fixtures from DB
    const dbFixtures = await Fixture.find(query).sort({ date: 1 });
    res.json(dbFixtures);
  } catch (err) {
    console.error("Error:", err.message);
    res.status(500).json({ msg: "Server error" });
  }
});

module.exports = router;
