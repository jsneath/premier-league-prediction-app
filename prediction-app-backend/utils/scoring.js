const Fixture = require("../models/Fixture");
const Prediction = require("../models/Prediction");
const Score = require("../models/Score");
const User = require("../models/User");
const { CURRENT_SEASON } = require("./season");

// Single source of truth for the points rules:
// exact score = 3 (6 doubled), correct result = 1 (2 doubled), wrong = 0.
// Returns null if the fixture has no final score yet.
function calculatePoints(pred, actualHome, actualAway) {
  if (actualHome === null || actualAway === null || actualHome === undefined || actualAway === undefined) {
    return null;
  }

  const exactMatch =
    pred.predictedHomeScore === actualHome &&
    pred.predictedAwayScore === actualAway;
  const correctResult =
    Math.sign(pred.predictedHomeScore - pred.predictedAwayScore) ===
    Math.sign(actualHome - actualAway);

  if (exactMatch) return pred.isDoublePoints ? 6 : 3;
  if (correctResult) return pred.isDoublePoints ? 2 : 1;
  return 0;
}

// Recalculate every user's score for every matchweek with finished fixtures
// in the current season. Past seasons stay frozen as history.
async function updateAllScores() {
  const fixtures = await Fixture.find({
    "status.short": "FT",
    "league.season": CURRENT_SEASON,
  });
  const matchweeks = [...new Set(fixtures.map((f) => f.matchweek))];

  for (const matchweek of matchweeks) {
    const weekFixtures = fixtures.filter((f) => f.matchweek === matchweek);
    const predictions = await Prediction.find({
      matchweek,
      season: CURRENT_SEASON,
    });

    for (const predDoc of predictions) {
      let totalPoints = 0;

      for (const pred of predDoc.predictions) {
        const fixture = weekFixtures.find(
          (f) => f._id.toString() === pred.fixtureId.toString()
        );
        if (!fixture) continue;

        const points = calculatePoints(
          pred,
          fixture.goals.home,
          fixture.goals.away
        );
        if (points !== null) totalPoints += points;
      }

      await Score.findOneAndUpdate(
        { userId: predDoc.userId, season: CURRENT_SEASON, matchweek },
        { $set: { points: totalPoints } },
        { upsert: true }
      );
    }
  }
}

// Season leaderboard: every matched user ranked by total points for a season.
// userFilter narrows the User collection (e.g. to league members); {} = everyone.
async function leaderboard(season, userFilter = {}) {
  return User.aggregate([
    { $match: userFilter },
    {
      $lookup: {
        from: "scores",
        let: { uid: "$_id" },
        pipeline: [
          {
            $match: {
              $expr: {
                $and: [
                  { $eq: ["$userId", "$$uid"] },
                  { $eq: ["$season", season] },
                ],
              },
            },
          },
        ],
        as: "scoreEntries",
      },
    },
    {
      $project: {
        _id: 1,
        username: 1,
        totalPoints: { $sum: "$scoreEntries.points" },
      },
    },
    { $sort: { totalPoints: -1, username: 1 } },
  ]);
}

module.exports = { calculatePoints, updateAllScores, leaderboard };
