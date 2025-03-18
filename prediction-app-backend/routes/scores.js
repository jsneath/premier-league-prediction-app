const express = require("express");
const router = express.Router();
const Fixture = require("../models/Fixture");
const Prediction = require("../models/Prediction");
const Score = require("../models/Score");

router.get("/update", async (req, res) => {
  try {
    const fixtures = await Fixture.find({ homeScore: { $exists: true } });
    for (const fixture of fixtures) {
      const predictions = await Prediction.find({ fixtureId: fixture._id });
      for (const pred of predictions) {
        let points = 0;
        const correctResult =
          (pred.predictedHomeScore > pred.predictedAwayScore &&
            fixture.homeScore > fixture.awayScore) ||
          (pred.predictedHomeScore < pred.predictedAwayScore &&
            fixture.homeScore < fixture.awayScore) ||
          (pred.predictedHomeScore === pred.predictedAwayScore &&
            fixture.homeScore === fixture.awayScore);
        if (
          pred.predictedHomeScore === fixture.homeScore &&
          pred.predictedAwayScore === fixture.awayScore
        ) {
          points = pred.isDoublePoints ? 6 : 3;
        } else if (correctResult) {
          points = pred.isDoublePoints ? 2 : 1;
        }
        await Score.findOneAndUpdate(
          { userId: pred.userId, gameWeek: fixture.gameWeek },
          { $inc: { points } },
          { upsert: true }
        );
      }
    }
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
      { $sort: { totalPoints: -1 } },
    ]);
    res.json(scores);
  } catch (err) {
    res.status(500).json({ msg: "Server error" });
  }
});

module.exports = router;
