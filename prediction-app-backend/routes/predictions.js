const express = require("express");
const router = express.Router();
const Prediction = require("../models/Prediction");
const Fixture = require("../models/Fixture");
const auth = require("../middleware/verifyToken");

const ONE_HOUR_MS = 60 * 60 * 1000;

// POST /api/predictions - Save predictions for a matchweek
router.post("/", auth, async (req, res) => {
  try {
    const { matchweek, predictions } = req.body;

    if (!matchweek || !Array.isArray(predictions) || predictions.length === 0) {
      return res
        .status(400)
        .json({ message: "Matchweek and predictions are required" });
    }

    const fixtures = await Fixture.find({ matchweek: parseInt(matchweek) });
    if (fixtures.length === 0) {
      return res
        .status(404)
        .json({ message: "No fixtures found for this matchweek" });
    }

    const now = new Date();

    // Build set of open fixture IDs (more than 1 hour until kickoff)
    const openFixtureIds = new Set(
      fixtures
        .filter(
          (f) => new Date(f.date).getTime() - now.getTime() > ONE_HOUR_MS
        )
        .map((f) => f._id.toString())
    );

    if (openFixtureIds.size === 0) {
      return res.status(400).json({
        message:
          "All fixtures in this matchweek have locked (less than 1 hour to kickoff)",
      });
    }

    // Filter to only open predictions and validate their scores
    const openPredictions = [];
    for (const pred of predictions) {
      if (!openFixtureIds.has(pred.fixtureId)) continue;

      const home = parseInt(pred.predictedHomeScore);
      const away = parseInt(pred.predictedAwayScore);
      if (isNaN(home) || isNaN(away) || home < 0 || away < 0) {
        return res.status(400).json({
          message: "Please enter a valid score (0 or above) for all open fixtures",
        });
      }

      openPredictions.push({
        fixtureId: pred.fixtureId,
        predictedHomeScore: home,
        predictedAwayScore: away,
        isDoublePoints: !!pred.isDoublePoints,
      });
    }

    if (openPredictions.length === 0) {
      return res.status(400).json({
        message: "No valid predictions for open fixtures were submitted",
      });
    }

    // Validate exactly one double points pick across ALL predictions (open + locked)
    // Load existing doc to check locked predictions too
    let predDoc = await Prediction.findOne({
      userId: req.user.id,
      matchweek: parseInt(matchweek),
    });

    const previouslyLocked = predDoc
      ? predDoc.predictions.filter(
          (p) => !openFixtureIds.has(p.fixtureId.toString())
        )
      : [];

    const allPredictions = [...previouslyLocked, ...openPredictions];
    const doubleCount = allPredictions.filter((p) => p.isDoublePoints).length;
    if (doubleCount !== 1) {
      return res
        .status(400)
        .json({ message: "Select exactly one match for double points" });
    }

    // Save
    if (predDoc) {
      predDoc.predictions = allPredictions;
      predDoc.submittedAt = Date.now();
    } else {
      predDoc = new Prediction({
        userId: req.user.id,
        matchweek: parseInt(matchweek),
        predictions: allPredictions,
      });
    }

    await predDoc.save();

    const lockedCount = predictions.filter(
      (p) => !openFixtureIds.has(p.fixtureId)
    ).length;
    const savedCount = openPredictions.length;
    let msg = `${savedCount} prediction${savedCount !== 1 ? "s" : ""} saved!`;
    if (lockedCount > 0) {
      msg += ` (${lockedCount} fixture${lockedCount !== 1 ? "s" : ""} already locked)`;
    }

    res.json({ message: msg });
  } catch (error) {
    console.error("POST /predictions error:", error);
    res.status(500).json({
      message: "Something went wrong saving predictions. Please try again.",
    });
  }
});

// GET /api/predictions/:matchweek - Get user's predictions + deadline info
router.get("/:matchweek", auth, async (req, res) => {
  try {
    const matchweek = parseInt(req.params.matchweek);
    const fixtures = await Fixture.find({ matchweek });
    const now = new Date();

    const deadlines = fixtures.map((f) => ({
      fixtureId: f._id.toString(),
      kickoff: f.date,
      locked: new Date(f.date).getTime() - now.getTime() <= ONE_HOUR_MS,
    }));

    const prediction = await Prediction.findOne({
      userId: req.user.id,
      matchweek,
    });

    res.json({
      predictions: prediction ? prediction.predictions : [],
      deadlines,
    });
  } catch (error) {
    console.error("GET /predictions error:", error);
    res.status(500).json({
      message: "Could not load predictions. Please try again.",
    });
  }
});

module.exports = router;
