const isBlank = (v) => v === "" || v === null || v === undefined;

// Merges a submitted batch of predictions into whatever the player has already
// saved for that gameweek. Deliberately partial-friendly: a player can fill in
// one match now and the rest later, and each save only ever touches the
// matches included in that submission.
//
// Rules:
//  - Matches that are locked are never modified, whatever the payload says.
//  - A match sent with blank scores clears any pick the player had for it.
//  - A match absent from the payload is left exactly as it was.
//  - At most one double-points pick per gameweek; zero is allowed.
//
// Pure function (no database access) so the behaviour can be tested directly.
// Returns { error } on invalid input, otherwise
// { predictions, filledIn, clearedOut, doubleCount }.
function mergePredictions({ existing = [], submitted = [], openFixtureIds }) {
  const open =
    openFixtureIds instanceof Set ? openFixtureIds : new Set(openFixtureIds);

  const merged = new Map();
  for (const p of existing) {
    merged.set(String(p.fixtureId), {
      fixtureId: p.fixtureId,
      predictedHomeScore: p.predictedHomeScore,
      predictedAwayScore: p.predictedAwayScore,
      isDoublePoints: !!p.isDoublePoints,
    });
  }

  let filledIn = 0;
  let clearedOut = 0;

  for (const pred of submitted) {
    const fid = String(pred.fixtureId);
    if (!open.has(fid)) continue; // locked: never modify

    if (isBlank(pred.predictedHomeScore) || isBlank(pred.predictedAwayScore)) {
      if (merged.delete(fid)) clearedOut++;
      continue;
    }

    const home = parseInt(pred.predictedHomeScore, 10);
    const away = parseInt(pred.predictedAwayScore, 10);
    if (
      Number.isNaN(home) || Number.isNaN(away) ||
      home < 0 || away < 0 || home > 99 || away > 99
    ) {
      return { error: "Scores must be whole numbers between 0 and 99." };
    }

    merged.set(fid, {
      fixtureId: pred.fixtureId,
      predictedHomeScore: home,
      predictedAwayScore: away,
      isDoublePoints: !!pred.isDoublePoints,
    });
    filledIn++;
  }

  const predictions = [...merged.values()];
  const doubleCount = predictions.filter((p) => p.isDoublePoints).length;

  if (doubleCount > 1) {
    return {
      error:
        "You can only pick one double points match per week. Unpick one and try again.",
    };
  }

  return { predictions, filledIn, clearedOut, doubleCount };
}

module.exports = { mergePredictions };
