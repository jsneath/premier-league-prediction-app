const express = require("express");
const router = express.Router();
const Fixture = require("../models/Fixture");
const Prediction = require("../models/Prediction");
const Score = require("../models/Score");
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

// GET /api/scores/leaderboard - Aggregated leaderboard
router.get("/leaderboard", async (req, res) => {
  try {
    const scores = await Score.aggregate([
      { $group: { _id: "$userId", totalPoints: { $sum: "$points" } } },
      {
        $lookup: {
          from: "users",
          localField: "_id",
          foreignField: "_id",
          as: "user",
        },
      },
      { $unwind: "$user" },
      {
        $project: {
          _id: 1,
          totalPoints: 1,
          username: "$user.username",
        },
      },
      { $sort: { totalPoints: -1 } },
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
