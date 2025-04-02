const express = require("express");
const router = express.Router();
const { body, validationResult } = require("express-validator");
const Prediction = require("../models/Prediction");
const Fixture = require("../models/Fixture"); // Ensure this model exists
const auth = require("../middleware/auth");

// POST /api/predictions - Create a new prediction
router.post(
  "/",
  auth,
  [
    body("fixtureId").isMongoId().withMessage("Invalid fixture ID"),
    body("homeScore")
      .isInt({ min: 0 })
      .withMessage("Home score must be a non-negative integer"),
    body("awayScore")
      .isInt({ min: 0 })
      .withMessage("Away score must be a non-negative integer"),
  ],
  async (req, res) => {
    // Check for validation errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    try {
      const { fixtureId, homeScore, awayScore } = req.body;

      // Check if the fixture exists
      const fixture = await Fixture.findById(fixtureId);
      if (!fixture) {
        return res.status(404).json({ message: "Fixture not found" });
      }

      // Check if the fixture is in the future
      if (new Date(fixture.date) < new Date()) {
        return res
          .status(400)
          .json({ message: "Cannot predict on past fixtures" });
      }

      // Check for existing prediction
      const existingPrediction = await Prediction.findOne({
        userId: req.user.id,
        fixtureId,
      });
      if (existingPrediction) {
        return res
          .status(400)
          .json({ message: "Prediction already exists for this fixture" });
      }

      // Create and save the new prediction
      const prediction = new Prediction({
        userId: req.user.id,
        fixtureId,
        homeScore,
        awayScore,
      });
      await prediction.save();

      res.status(201).json({ message: "Prediction saved" });
    } catch (error) {
      console.error("Error saving prediction:", error);
      if (error.name === "ValidationError") {
        return res.status(400).json({ message: "Invalid prediction data" });
      }
      res.status(500).json({ message: "Server error" });
    }
  }
);

// GET /api/predictions - Retrieve all predictions for the user
router.get("/", auth, async (req, res) => {
  try {
    const predictions = await Prediction.find({ userId: req.user.id }).populate(
      {
        path: "fixtureId",
        select: "homeTeam awayTeam date", // Only fetch necessary fields
      }
    );
    res.json(predictions);
  } catch (error) {
    console.error("Error fetching predictions:", error);
    res.status(500).json({ message: "Server error" });
  }
});

module.exports = router;
