const express = require("express");
const router = express.Router();
const Prediction = require("../models/Prediction");
const Fixture = require("../models/Fixture");
const User = require("../models/User");
const auth = require("../middleware/verifyToken");
const { calculatePoints } = require("../utils/scoring");
const { CURRENT_SEASON } = require("../utils/season");
const { leagueMateIds, getLeagueIfMember } = require("../utils/leagueMates");
const { mergePredictions } = require("../utils/mergePredictions");

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

    const fixtures = await Fixture.find({
      matchweek: parseInt(matchweek),
      "league.season": CURRENT_SEASON,
    });
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

    let predDoc = await Prediction.findOne({
      userId: req.user.id,
      season: CURRENT_SEASON,
      matchweek: parseInt(matchweek),
    });

    const result = mergePredictions({
      existing: predDoc ? predDoc.predictions : [],
      submitted: predictions,
      openFixtureIds,
    });

    if (result.error) {
      return res.status(400).json({ message: result.error });
    }

    const {
      predictions: allPredictions,
      filledIn,
      clearedOut,
      doubleCount,
    } = result;

    if (filledIn === 0 && clearedOut === 0) {
      return res.status(400).json({
        message: "Nothing to save — enter a score for at least one match.",
      });
    }

    if (allPredictions.length === 0) {
      // Everything was cleared — drop the record entirely rather than leaving
      // an empty one behind, which would show the player on the results page
      // with no picks.
      if (predDoc) await predDoc.deleteOne();
    } else {
      if (predDoc) {
        predDoc.predictions = allPredictions;
        predDoc.submittedAt = Date.now();
      } else {
        predDoc = new Prediction({
          userId: req.user.id,
          season: CURRENT_SEASON,
          matchweek: parseInt(matchweek),
          predictions: allPredictions,
        });
      }
      await predDoc.save();
    }

    // Tell them exactly where they stand: what is saved, and what is still
    // open to fill in later.
    const savedOpen = allPredictions.filter((p) =>
      openFixtureIds.has(p.fixtureId.toString())
    ).length;
    const stillOpen = openFixtureIds.size - savedOpen;

    let msg;
    if (savedOpen === 0) {
      msg = "Predictions cleared. You can enter them again any time before kickoff.";
    } else {
      msg = `Saved — ${savedOpen} of ${openFixtureIds.size} open match${
        openFixtureIds.size !== 1 ? "es" : ""
      } predicted.`;
      if (stillOpen > 0) {
        msg += ` You can fill in the other ${stillOpen} any time before ${
          stillOpen === 1 ? "it kicks" : "they kick"
        } off.`;
      }
      if (doubleCount === 0) {
        msg += " Don't forget your ⚡ double points pick.";
      }
    }

    res.json({
      message: msg,
      savedOpen,
      totalOpen: openFixtureIds.size,
      hasDoublePick: doubleCount === 1,
    });
  } catch (error) {
    console.error("POST /predictions error:", error);
    res.status(500).json({
      message: "Something went wrong saving predictions. Please try again.",
    });
  }
});

// GET /api/predictions/matchweek/:matchweek/all - All users' predictions for locked fixtures
router.get("/matchweek/:matchweek/all", auth, async (req, res) => {
  try {
    const matchweek = parseInt(req.params.matchweek);
    const now = new Date();

    const fixtures = await Fixture.find({
      matchweek,
      "league.season": CURRENT_SEASON,
    }).sort({ date: 1 });
    if (fixtures.length === 0) {
      return res.status(404).json({ message: "No fixtures found for this matchweek" });
    }

    const lockedFixtureIds = new Set(
      fixtures
        .filter((f) => new Date(f.date).getTime() - now.getTime() <= ONE_HOUR_MS)
        .map((f) => f._id.toString())
    );

    // Only ever show predictions from people the viewer shares a league with,
    // so separate groups of friends stay private from each other.
    let visibleIds;
    if (req.query.leagueId) {
      const league = await getLeagueIfMember(req.query.leagueId, req.user.id);
      if (!league) {
        return res
          .status(403)
          .json({ message: "You are not a member of this league" });
      }
      visibleIds = league.members.map((m) => String(m.userId));
    } else {
      visibleIds = await leagueMateIds(req.user.id);
    }

    const allPredictions = await Prediction.find({
      matchweek,
      season: CURRENT_SEASON,
      userId: { $in: visibleIds },
    }).populate("userId", "username");

    const predByUser = new Map(
      allPredictions
        .filter((p) => p.userId?._id)
        .map((p) => [String(p.userId._id), p])
    );

    const members = await User.find({ _id: { $in: visibleIds } }).select(
      "username"
    );

    const users = members
      .filter((u) => u.username)
      .map((member) => {
        const predDoc = predByUser.get(String(member._id));
        const predsMap = {};
        for (const p of predDoc?.predictions || []) {
          const fid = p.fixtureId.toString();
          if (!lockedFixtureIds.has(fid)) continue;

          const fixture = fixtures.find((f) => f._id.toString() === fid);
          const points =
            fixture?.status?.short === "FT"
              ? calculatePoints(p, fixture.goals.home, fixture.goals.away)
              : null;

          predsMap[fid] = {
            predictedHomeScore: p.predictedHomeScore,
            predictedAwayScore: p.predictedAwayScore,
            isDoublePoints: p.isDoublePoints,
            points,
          };
        }

        const weeklyTotal = Object.values(predsMap).reduce(
          (sum, p) => sum + (p.points ?? 0),
          0
        );

        return {
          userId: member._id,
          username: member.username,
          predictions: predsMap,
          weeklyTotal,
        };
      });

    res.json({
      fixtures,
      lockedFixtureIds: [...lockedFixtureIds],
      users,
    });
  } catch (error) {
    console.error("GET /predictions/matchweek/:matchweek/all error:", error);
    res.status(500).json({ message: "Could not load predictions." });
  }
});

// GET /api/predictions/:matchweek - Get user's predictions + deadline info
router.get("/:matchweek", auth, async (req, res) => {
  try {
    const matchweek = parseInt(req.params.matchweek);
    const fixtures = await Fixture.find({
      matchweek,
      "league.season": CURRENT_SEASON,
    });
    const now = new Date();

    const deadlines = fixtures.map((f) => ({
      fixtureId: f._id.toString(),
      kickoff: f.date,
      locked: new Date(f.date).getTime() - now.getTime() <= ONE_HOUR_MS,
    }));

    const prediction = await Prediction.findOne({
      userId: req.user.id,
      season: CURRENT_SEASON,
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
