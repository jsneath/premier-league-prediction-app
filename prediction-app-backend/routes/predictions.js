const express = require("express");
const router = express.Router();
const { body, validationResult } = require("express-validator");
const Prediction = require("../models/Prediction");
const Fixture = require("../models/Fixture");
const auth = require("../middleware/auth");

// POST /api/predictions - Save predictions for a matchweek
router.post(
  "/",
  auth,
  body("matchweek").isInt({ min: 1 }).withMessage("Invalid matchweek"),
  body("predictions")
    .isArray({ min: 1 })
    .withMessage("Predictions array required"),
  body("predictions.*.fixtureId").isMongoId().withMessage("Invalid fixture ID"),
  body("predictions.*.predictedHomeScore")
    .isInt({ min: 0 })
    .withMessage("Invalid home score"),
  body("predictions.*.predictedAwayScore")
    .isInt({ min: 0 })
    .withMessage("Invalid away score"),
  body("predictions.*.isDoublePoints")
    .isBoolean()
    .withMessage("Double points must be boolean"),
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    try {
      const { matchweek, predictions } = req.body;
      const fixtures = await Fixture.find({ matchweek });
      if (fixtures.length !== predictions.length) {
        return res.status(400).json({ message: "Predict all fixtures" });
      }
      const earliestDate = fixtures.sort((a, b) => a.date - b.date)[0].date;
      if (new Date(earliestDate) < new Date()) {
        return res.status(400).json({ message: "Deadline passed" });
      }
      if (predictions.filter((p) => p.isDoublePoints).length !== 1) {
        return res
          .status(400)
          .json({ message: "Exactly one double points game" });
      }

      let prediction = await Prediction.findOne({
        userId: req.user.id,
        matchweek,
      });
      if (prediction) {
        prediction.predictions = predictions;
        prediction.submittedAt = Date.now();
      } else {
        prediction = new Prediction({
          userId: req.user.id,
          matchweek,
          predictions,
        });
      }
      await prediction.save();
      res.json({ message: "Predictions saved" });
    } catch (error) {
      console.error(error);
      res.status(500).json({ message: "Server error" });
    }
  }
);
router.get("/:matchweek", auth, async (req, res) => {
  try {
    if (!req.user || !req.user.id) {
      return res.status(401).json({ message: "Unauthorized - Login required" });
    }
    console.log(
      "Fetching predictions for user:",
      req.user.id,
      "matchweek:",
      req.params.matchweek
    );
    const prediction = await Prediction.findOne({
      userId: req.user.id,
      matchweek: req.params.matchweek,
    });
    res.json(prediction || { predictions: [] });
  } catch (error) {
    console.error("GET /predictions error:", error.stack); // Full stack for debug
    res.status(500).json({ message: "Server error" });
  }
});
// GET /api/predictions/:matchweek - Get user's predictions

module.exports = router;
