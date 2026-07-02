const express = require("express");
const router = express.Router();
const Score = require("../models/Score");
const League = require("../models/League");
const verifyToken = require("../middleware/verifyToken");
const { updateAllScores, leaderboard } = require("../utils/scoring");
const { CURRENT_SEASON, seasonLabel } = require("../utils/season");

// All score routes require a logged-in user
router.use(verifyToken);

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

// GET /api/scores/leaderboard - Users ranked by total points
// Optional: ?season=2025 (defaults to current), ?leagueId= (members only)
router.get("/leaderboard", async (req, res) => {
  try {
    const season = req.query.season
      ? parseInt(req.query.season)
      : CURRENT_SEASON;
    let userFilter = {};

    if (req.query.leagueId) {
      const league = await League.findById(req.query.leagueId);
      if (!league) return res.status(404).json({ message: "League not found" });

      // Only members can view a league's leaderboard
      const isMember = league.members.some(
        (m) => m.userId.toString() === req.user.id
      );
      if (!isMember) {
        return res
          .status(403)
          .json({ message: "You are not a member of this league" });
      }

      userFilter = { _id: { $in: league.members.map((m) => m.userId) } };
    }

    res.json(await leaderboard(season, userFilter));
  } catch (err) {
    console.error("Leaderboard error:", err);
    res.status(500).json({ message: "Server error" });
  }
});

// GET /api/scores/:matchweek - User's score for a matchweek (current season)
router.get("/:matchweek", async (req, res) => {
  try {
    const score = await Score.findOne({
      userId: req.user.id,
      season: CURRENT_SEASON,
      matchweek: parseInt(req.params.matchweek),
    });
    res.json(score || { points: 0 });
  } catch (err) {
    console.error("Score fetch error:", err);
    res.status(500).json({ message: "Server error" });
  }
});

module.exports = router;
