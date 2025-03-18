const express = require("express");
const router = express.Router();
const auth = require("../middleware/auth");
const Prediction = require("../models/Prediction");

router.post("/", auth, async (req, res) => {
  const { fixtureId, predictedHomeScore, predictedAwayScore, isDoublePoints } =
    req.body;
  try {
    const prediction = new Prediction({
      userId: req.user.id,
      fixtureId,
      predictedHomeScore,
      predictedAwayScore,
      isDoublePoints,
    });
    await prediction.save();
    res.json(prediction);
  } catch (err) {
    res.status(500).json({ msg: "Server error" });
  }
});

module.exports = router;
