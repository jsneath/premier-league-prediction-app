const express = require("express");
const router = express.Router();
const Commentary = require("../models/Commentary");
const League = require("../models/League");
const verifyToken = require("../middleware/verifyToken");
const { CURRENT_SEASON } = require("../utils/season");
const { getLeagueIfMember } = require("../utils/leagueMates");
const { generateCommentary } = require("../utils/commentary");

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

// POST /api/commentary/:matchweek/generate?leagueId=...
// If the week is finished and no report exists, write one now (so we don't
// wait for the hourly cron — Render often sleeps through it).
router.post("/:matchweek/generate", verifyToken, async (req, res) => {
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
    if (!process.env.XAI_API_KEY) {
      return res.status(503).json({
        message: "The pundit is not configured (missing XAI_API_KEY).",
      });
    }

    const fresh = await League.findById(league._id);
    const doc = await generateCommentary(
      fresh,
      parseInt(req.params.matchweek, 10)
    );
    if (!doc) {
      return res.status(409).json({
        message:
          "Nothing to write yet — the week may still be in play, or nobody predicted.",
      });
    }
    res.json({ text: doc.text, generatedAt: doc.generatedAt });
  } catch (err) {
    console.error("Commentary generate error:", err);
    res.status(500).json({ message: "The pundit bottled it. Try again." });
  }
});

module.exports = router;
