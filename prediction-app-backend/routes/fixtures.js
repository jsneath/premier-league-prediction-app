const express = require("express");
const router = express.Router();
const axios = require("axios");
const Fixture = require("../models/Fixture");

// GET /api/fixtures - Read from MongoDB only (fast)
router.get("/", async (req, res) => {
  try {
    let query = {};
    if (req.query.status) {
      query["status.short"] = req.query.status;
    }
    if (req.query.matchweek) {
      query.matchweek = parseInt(req.query.matchweek);
    }

    const fixtures = await Fixture.find(query).sort({ date: 1 });
    res.json(fixtures);
  } catch (err) {
    console.error("Error fetching fixtures:", err.message);
    res.status(500).json({ msg: "Server error" });
  }
});

// GET /api/fixtures/current - Get the current/next matchweek number
router.get("/current", async (req, res) => {
  try {
    // Find the earliest fixture that hasn't finished yet
    const upcoming = await Fixture.findOne({
      "status.short": { $ne: "FT" },
    }).sort({ date: 1 });

    if (upcoming) {
      return res.json({ matchweek: upcoming.matchweek });
    }

    // All fixtures finished — return the last matchweek
    const last = await Fixture.findOne().sort({ matchweek: -1 });
    res.json({ matchweek: last ? last.matchweek : 1 });
  } catch (err) {
    console.error("Error getting current matchweek:", err.message);
    res.status(500).json({ msg: "Server error" });
  }
});

// POST /api/fixtures/refresh - Manual sync from API-Football (admin use)
router.post("/refresh", async (req, res) => {
  try {
    let url =
      "https://api-football-v1.p.rapidapi.com/v3/fixtures?league=39&season=2025";

    const response = await axios.get(url, {
      headers: {
        "X-RapidAPI-Key": process.env.API_FOOTBALL_KEY,
        "X-RapidAPI-Host": "api-football-v1.p.rapidapi.com",
      },
    });

    const fixtures = response.data.response;
    let count = 0;

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
          },
        },
        { upsert: true, new: true }
      );
      count++;
    }

    res.json({ message: `Refreshed ${count} fixtures` });
  } catch (err) {
    console.error("Refresh error:", err.message);
    res.status(500).json({ msg: "Server error" });
  }
});

module.exports = router;
