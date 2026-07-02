const express = require("express");
const router = express.Router();
const Fixture = require("../models/Fixture");
const verifyToken = require("../middleware/verifyToken");
const refreshFixtures = require("../utils/refreshFixtures");
const { CURRENT_SEASON, seasonLabel } = require("../utils/season");

// GET /api/fixtures - Read from MongoDB only (fast); current season only
router.get("/", async (req, res) => {
  try {
    let query = { "league.season": CURRENT_SEASON };
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
    // Find the earliest fixture that is active or not yet played
    // Excludes: FT, AET, PEN (finished), PST, CANC, ABD, AWD, WO (won't play)
    const DONE_STATUSES = ["FT", "AET", "PEN", "PST", "CANC", "ABD", "AWD", "WO"];

    const active = await Fixture.findOne({
      "status.short": { $nin: DONE_STATUSES },
      "league.season": CURRENT_SEASON,
    }).sort({ date: 1 });

    const seasonInfo = { season: CURRENT_SEASON, seasonLabel: seasonLabel(CURRENT_SEASON) };

    if (active) {
      return res.json({ matchweek: active.matchweek, ...seasonInfo });
    }

    // All fixtures done — return the last matchweek
    const last = await Fixture.findOne({ "league.season": CURRENT_SEASON }).sort({ matchweek: -1 });
    res.json({ matchweek: last ? last.matchweek : 1, ...seasonInfo });
  } catch (err) {
    console.error("Error getting current matchweek:", err.message);
    res.status(500).json({ msg: "Server error" });
  }
});

// GET /api/fixtures/upcoming - All unplayed fixtures across all matchweeks, sorted by date
router.get("/upcoming", async (req, res) => {
  try {
    const DONE_STATUSES = ["FT", "AET", "PEN", "PST", "CANC", "ABD", "AWD", "WO"];
    const fixtures = await Fixture.find({
      "status.short": { $nin: DONE_STATUSES },
      "league.season": CURRENT_SEASON,
      date: { $gt: new Date() },
    }).sort({ date: 1 });
    res.json(fixtures);
  } catch (err) {
    res.status(500).json({ msg: "Server error" });
  }
});

// POST /api/fixtures/refresh - Manual sync from API-Football (logged-in users only,
// so strangers can't burn the free API quota)
router.post("/refresh", verifyToken, async (req, res) => {
  try {
    const count = await refreshFixtures();
    res.json({ message: `Refreshed ${count} fixtures` });
  } catch (err) {
    console.error("Refresh error:", err.message);
    res.status(500).json({ msg: "Server error" });
  }
});

module.exports = router;
