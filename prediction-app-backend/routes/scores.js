const express = require("express");
const router = express.Router();
const Score = require("../models/Score");
const verifyToken = require("../middleware/verifyToken");
const { updateAllScores } = require("../utils/scoring");
const { CURRENT_SEASON, seasonLabel } = require("../utils/season");

// All score routes require a logged-in user
router.use(verifyToken);

// NOTE: there is deliberately no global leaderboard here. Standings are
// always viewed through a league, so separate groups of friends never see
// each other's scores. Use GET /api/leagues/:id/leaderboard instead.

// POST /api/scores/update - Recalculate scores for completed fixtures
router.post("/update", async (req, res) => {
  try {
    await updateAllScores();
    res.json({ message: "Scores updated successfully" });
  } catch (err) {
    console.error("Score update error:", err);
    res.status(500).json({ message: "Server error" });
  }
});

// GET /api/scores/seasons - Seasons available for the leaderboard (current + history)
router.get("/seasons", async (req, res) => {
  try {
    const pastSeasons = await Score.distinct("season");
    const seasons = [...new Set([CURRENT_SEASON, ...pastSeasons])]
      .sort((a, b) => b - a)
      .map((s) => ({
        season: s,
        label: seasonLabel(s),
        current: s === CURRENT_SEASON,
      }));
    res.json(seasons);
  } catch (err) {
    console.error("Seasons error:", err);
    res.status(500).json({ message: "Server error" });
  }
});

// GET /api/scores/:matchweek - User's own score for a matchweek
router.get("/:matchweek", async (req, res) => {
  try {
    const matchweek = parseInt(req.params.matchweek);
    if (Number.isNaN(matchweek)) {
      return res.status(404).json({ message: "Not found" });
    }

    const score = await Score.findOne({
      userId: req.user.id,
      season: CURRENT_SEASON,
      matchweek,
    });
    res.json(score || { points: 0 });
  } catch (err) {
    console.error("Score fetch error:", err);
    res.status(500).json({ message: "Server error" });
  }
});

module.exports = router;
