const express = require("express");
const router = express.Router();
const Commentary = require("../models/Commentary");
const verifyToken = require("../middleware/verifyToken");
const { CURRENT_SEASON } = require("../utils/season");

// GET /api/commentary/:matchweek - The pundit's report for a finished gameweek
router.get("/:matchweek", verifyToken, async (req, res) => {
  try {
    const commentary = await Commentary.findOne({
      season: CURRENT_SEASON,
      matchweek: parseInt(req.params.matchweek),
    });

    if (!commentary) {
      return res.status(404).json({ message: "No report for this gameweek yet" });
    }

    res.json({ text: commentary.text, generatedAt: commentary.generatedAt });
  } catch (err) {
    console.error("Commentary fetch error:", err);
    res.status(500).json({ message: "Server error" });
  }
});

module.exports = router;
