const Fixture = require("../models/Fixture");
const Prediction = require("../models/Prediction");
const Score = require("../models/Score");

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

// Recalculate every user's score for every matchweek with finished fixtures.
async function updateAllScores() {
  const fixtures = await Fixture.find({ "status.short": "FT" });
  const matchweeks = [...new Set(fixtures.map((f) => f.matchweek))];

  for (const matchweek of matchweeks) {
    const weekFixtures = fixtures.filter((f) => f.matchweek === matchweek);
    const predictions = await Prediction.find({ matchweek });

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
        { userId: predDoc.userId, matchweek },
        { $set: { points: totalPoints } },
        { upsert: true }
      );
    }
  }
}

module.exports = { calculatePoints, updateAllScores };
