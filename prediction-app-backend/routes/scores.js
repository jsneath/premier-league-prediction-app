const express = require("express");
const router = express.Router();
const mongoose = require("mongoose");
const Fixture = require("../models/Fixture");
const Prediction = require("../models/Prediction");
const Score = require("../models/Score");
const League = require("../models/League");
const User = require("../models/User");
const verifyToken = require("../middleware/verifyToken");

// POST /api/scores/update - Calculate and store scores for completed fixtures
router.post("/update", async (req, res) => {
  try {
    // Find all completed fixtures
    const fixtures = await Fixture.find({ "status.short": "FT" });

    // Get unique matchweeks from completed fixtures
    const matchweeks = [...new Set(fixtures.map((f) => f.matchweek))];

    for (const matchweek of matchweeks) {
      const weekFixtures = fixtures.filter((f) => f.matchweek === matchweek);

      // Find all predictions for this matchweek
      const predictions = await Prediction.find({ matchweek });

      for (const predDoc of predictions) {
        let totalPoints = 0;

        for (const pred of predDoc.predictions) {
          // Find the matching fixture
          const fixture = weekFixtures.find(
            (f) => f._id.toString() === pred.fixtureId.toString()
          );
          if (!fixture) continue;

          const actualHome = fixture.goals.home;
          const actualAway = fixture.goals.away;

          const correctResult =
            (pred.predictedHomeScore > pred.predictedAwayScore &&
              actualHome > actualAway) ||
            (pred.predictedHomeScore < pred.predictedAwayScore &&
              actualHome < actualAway) ||
            (pred.predictedHomeScore === pred.predictedAwayScore &&
              actualHome === actualAway);

          let points = 0;
          if (
            pred.predictedHomeScore === actualHome &&
            pred.predictedAwayScore === actualAway
          ) {
            points = pred.isDoublePoints ? 6 : 3;
          } else if (correctResult) {
            points = pred.isDoublePoints ? 2 : 1;
          }

          totalPoints += points;
        }

        // Upsert score for this user + matchweek
        await Score.findOneAndUpdate(
          { userId: predDoc.userId, matchweek },
          { $set: { points: totalPoints } },
          { upsert: true }
        );
      }
    }

    res.json({ message: "Scores updated successfully" });
  } catch (err) {
    console.error("Score update error:", err);
    res.status(500).json({ msg: "Server error" });
  }
});

// GET /api/scores/leaderboard - All users ranked by total points (optional ?leagueId= filter)
router.get("/leaderboard", async (req, res) => {
  try {
    let matchStage = {};

    if (req.query.leagueId) {
      const league = await League.findById(req.query.leagueId);
      if (!league) return res.status(404).json({ message: "League not found" });
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
    res.status(500).json({ msg: "Server error" });
  }
});

// GET /api/scores/:matchweek - User's score breakdown for a matchweek
router.get("/:matchweek", verifyToken, async (req, res) => {
  try {
    const score = await Score.findOne({
      userId: req.user.id,
      matchweek: parseInt(req.params.matchweek),
    });
    res.json(score || { points: 0 });
  } catch (err) {
    console.error("Score fetch error:", err);
    res.status(500).json({ msg: "Server error" });
  }
});

module.exports = router;
