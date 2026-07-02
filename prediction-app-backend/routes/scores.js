const express = require("express");
const router = express.Router();
const Score = require("../models/Score");
const League = require("../models/League");
const User = require("../models/User");
const verifyToken = require("../middleware/verifyToken");
const { updateAllScores } = require("../utils/scoring");

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

// GET /api/scores/leaderboard - All users ranked by total points (optional ?leagueId= filter)
router.get("/leaderboard", async (req, res) => {
  try {
    let matchStage = {};

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

      const memberIds = league.members.map((m) => m.userId);
      matchStage = { _id: { $in: memberIds } };
    }

    // Start from User collection so everyone appears even with 0 points
    const scores = await User.aggregate([
      { $match: matchStage },
      {
        $lookup: {
          from: "scores",
          localField: "_id",
          foreignField: "userId",
          as: "scoreEntries",
        },
      },
      {
        $project: {
          _id: 1,
          username: 1,
          totalPoints: { $sum: "$scoreEntries.points" },
        },
      },
      { $sort: { totalPoints: -1, username: 1 } },
    ]);

    res.json(scores);
  } catch (err) {
    console.error("Leaderboard error:", err);
    res.status(500).json({ message: "Server error" });
  }
});

// GET /api/scores/:matchweek - User's score for a matchweek
router.get("/:matchweek", async (req, res) => {
  try {
    const score = await Score.findOne({
      userId: req.user.id,
      matchweek: parseInt(req.params.matchweek),
    });
    res.json(score || { points: 0 });
  } catch (err) {
    console.error("Score fetch error:", err);
    res.status(500).json({ message: "Server error" });
  }
});

module.exports = router;
