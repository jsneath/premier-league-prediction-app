const express = require("express");
const router = express.Router();
const Commentary = require("../models/Commentary");
const verifyToken = require("../middleware/verifyToken");
const { CURRENT_SEASON } = require("../utils/season");
const { getLeagueIfMember } = require("../utils/leagueMates");

// GET /api/commentary/:matchweek?leagueId=... - The pundit's report for a
// finished gameweek, scoped to one league the caller belongs to.
router.get("/:matchweek", verifyToken, async (req, res) => {
  try {
    if (!req.query.leagueId) {
      return res.status(400).json({ message: "leagueId is required" });
    }

    const league = await getLeagueIfMember(req.query.leagueId, req.user.id);
    if (!league) {
      return res
        .status(403)
        .json({ message: "You are not a member of this league" });
    }

    const commentary = await Commentary.findOne({
      leagueId: league._id,
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
