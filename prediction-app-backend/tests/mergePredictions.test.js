// Pure-function tests for partial prediction saving. Touches no database.
const { mergePredictions } = require("../utils/mergePredictions");

let pass = 0, fail = 0;
function check(name, actual, expected) {
  const a = JSON.stringify(actual), e = JSON.stringify(expected);
  if (a === e) { pass++; console.log("  PASS  " + name); }
  else { fail++; console.log("  FAIL  " + name + "\n          got      " + a + "\n          expected " + e); }
}
const OPEN = ["m1", "m2", "m3"];          // still open
const ALL = new Set([...OPEN]);            // m4 is locked (absent from this set)
const score = (id, h, a, dbl = false) => ({
  fixtureId: id, predictedHomeScore: h, predictedAwayScore: a, isDoublePoints: dbl,
});
const summary = (r) => r.error
  ? { error: r.error }
  : {
      saved: r.predictions.map((p) => `${p.fixtureId}:${p.predictedHomeScore}-${p.predictedAwayScore}${p.isDoublePoints ? "(x2)" : ""}`).sort(),
      filledIn: r.filledIn, clearedOut: r.clearedOut,
    };

console.log("\n--- Partial saving ---");

check("predict one match, leave the rest blank",
  summary(mergePredictions({
    existing: [],
    submitted: [score("m1", 2, 1), score("m2", "", ""), score("m3", "", "")],
    openFixtureIds: ALL,
  })),
  { saved: ["m1:2-1"], filledIn: 1, clearedOut: 0 });

check("come back later and add a second match (first is KEPT)",
  summary(mergePredictions({
    existing: [score("m1", 2, 1)],
    submitted: [score("m1", 2, 1), score("m2", 0, 0), score("m3", "", "")],
    openFixtureIds: ALL,
  })),
  { saved: ["m1:2-1", "m2:0-0"], filledIn: 2, clearedOut: 0 });

check("submitting ONLY the new match still keeps the earlier one",
  summary(mergePredictions({
    existing: [score("m1", 2, 1)],
    submitted: [score("m3", 3, 3)],
    openFixtureIds: ALL,
  })),
  { saved: ["m1:2-1", "m3:3-3"], filledIn: 1, clearedOut: 0 });

check("0-0 is a real score, not a blank",
  summary(mergePredictions({
    existing: [], submitted: [score("m1", 0, 0)], openFixtureIds: ALL,
  })),
  { saved: ["m1:0-0"], filledIn: 1, clearedOut: 0 });

check("blanking a saved match clears it",
  summary(mergePredictions({
    existing: [score("m1", 2, 1)],
    submitted: [score("m1", "", "")],
    openFixtureIds: ALL,
  })),
  { saved: [], filledIn: 0, clearedOut: 1 });

console.log("\n--- Double points ---");

check("saving with no double pick is allowed",
  summary(mergePredictions({
    existing: [], submitted: [score("m1", 1, 0)], openFixtureIds: ALL,
  })),
  { saved: ["m1:1-0"], filledIn: 1, clearedOut: 0 });

check("one double pick is fine",
  summary(mergePredictions({
    existing: [], submitted: [score("m1", 1, 0, true), score("m2", 2, 2)], openFixtureIds: ALL,
  })),
  { saved: ["m1:1-0(x2)", "m2:2-2"], filledIn: 2, clearedOut: 0 });

check("two double picks are rejected",
  summary(mergePredictions({
    existing: [], submitted: [score("m1", 1, 0, true), score("m2", 2, 2, true)], openFixtureIds: ALL,
  })),
  { error: "You can only pick one double points match per week. Unpick one and try again." });

check("moving the double from an open match to another is fine",
  summary(mergePredictions({
    existing: [score("m1", 1, 0, true)],
    submitted: [score("m1", 1, 0, false), score("m2", 2, 2, true)],
    openFixtureIds: ALL,
  })),
  { saved: ["m1:1-0", "m2:2-2(x2)"], filledIn: 2, clearedOut: 0 });

check("cannot add a second double when one is already locked in",
  summary(mergePredictions({
    existing: [score("m4", 1, 0, true)],          // m4 locked, carries the double
    submitted: [score("m1", 2, 2, true)],
    openFixtureIds: ALL,
  })),
  { error: "You can only pick one double points match per week. Unpick one and try again." });

console.log("\n--- Locked matches are protected ---");

check("locked match in the payload is ignored",
  summary(mergePredictions({
    existing: [score("m4", 1, 0)],
    submitted: [score("m4", 9, 9), score("m1", 2, 0)],
    openFixtureIds: ALL,
  })),
  { saved: ["m1:2-0", "m4:1-0"], filledIn: 1, clearedOut: 0 });

check("blanking a locked match cannot erase it",
  summary(mergePredictions({
    existing: [score("m4", 1, 0)],
    submitted: [score("m4", "", "")],
    openFixtureIds: ALL,
  })),
  { saved: ["m4:1-0"], filledIn: 0, clearedOut: 0 });

console.log("\n--- Invalid scores ---");

for (const [label, h, a] of [["negative", -1, 0], ["absurd", 500, 0], ["not a number", "abc", 1]]) {
  check(label + " score rejected",
    summary(mergePredictions({ existing: [], submitted: [score("m1", h, a)], openFixtureIds: ALL })),
    { error: "Scores must be whole numbers between 0 and 99." });
}

console.log("\n" + pass + " passed, " + fail + " failed\n");
process.exit(fail === 0 ? 0 : 1);

