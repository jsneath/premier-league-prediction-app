// Tests that a league only ever offers seasons it actually ran in.
//
// Regression cover for the bug where the season list came from every score in
// the database, so a league created this summer showed last season's table as
// its own "history".
//
// Runs against a THROWAWAY database that is dropped afterwards.
require("dotenv").config();
const express = require("express");
const mongoose = require("mongoose");
const jwt = require("jsonwebtoken");

const PORT = 5098;
const BASE = `http://localhost:${PORT}/api`;

function testUri() {
  const uri = process.env.MONGO_URI;
  if (!uri) throw new Error("MONGO_URI not set");
  const [head, query] = uri.split("?");
  const withoutDb = head.replace(/\/[^/]*$/, "");
  return `${withoutDb}/pl-predictions-seasontest${query ? "?" + query : ""}`;
}

let pass = 0, fail = 0;
function check(name, actual, expected) {
  const ok = JSON.stringify(actual) === JSON.stringify(expected);
  ok ? pass++ : fail++;
  console.log(`  ${ok ? "PASS" : "FAIL"}  ${name}` +
    (ok ? "" : `\n          got ${JSON.stringify(actual)} want ${JSON.stringify(expected)}`));
}

async function get(path, token) {
  const res = await fetch(BASE + path, {
    headers: token ? { Authorization: "Bearer " + token } : {},
  });
  let body = null;
  try { body = await res.json(); } catch {}
  return { status: res.status, body };
}

(async () => {
  process.env.API_FOOTBALL_SEASON = "2026";
  await mongoose.connect(testUri());
  await mongoose.connection.dropDatabase();
  console.log("throwaway db:", mongoose.connection.name, "\n");

  const { seasonForDate } = require("../utils/season");

  console.log("--- Which season was running on a given date ---");
  check("11 Aug 2026 is the 2026/27 season", seasonForDate("2026-08-11"), 2026);
  check("1 Jan 2026 is still the 2025/26 season", seasonForDate("2026-01-01"), 2025);
  check("7 Feb 2026 is still the 2025/26 season", seasonForDate("2026-02-07"), 2025);
  check("31 May 2026 is still the 2025/26 season", seasonForDate("2026-05-31"), 2025);
  check("1 Jul 2026 rolls over to 2026/27", seasonForDate("2026-07-01"), 2026);

  const User = require("../models/User");
  const League = require("../models/League");
  const Score = require("../models/Score");

  const owner = await User.create({
    username: "owner", email: "owner@example.com", password: "x",
  });
  const token = jwt.sign({ id: String(owner._id) }, process.env.JWT_SECRET, { expiresIn: "10m" });

  // Last season's points, earned before either league below existed
  await Score.create({ userId: owner._id, season: 2025, matchweek: 38, points: 29 });

  const brandNew = await League.create({
    name: "Big dogs", inviteCode: "NEW111", createdBy: owner._id,
    members: [{ userId: owner._id, role: "admin" }],
    createdAt: new Date("2026-08-11"),   // created this summer
  });
  const veteran = await League.create({
    name: "Old timers", inviteCode: "OLD222", createdBy: owner._id,
    members: [{ userId: owner._id, role: "admin" }],
    createdAt: new Date("2026-02-07"),   // existed during 2025/26
  });

  const app = express();
  app.use(express.json());
  app.use("/api/leagues", require("../routes/leagues"));
  const server = app.listen(PORT);

  console.log("\n--- Seasons offered per league ---");

  let r = await get(`/leagues/${brandNew._id}/seasons`, token);
  check("a league created this summer offers only this season",
    r.body.map((s) => s.label), ["2026/27"]);

  r = await get(`/leagues/${veteran._id}/seasons`, token);
  check("a league that ran last season offers both",
    r.body.map((s) => s.label), ["2026/27", "2025/26"]);

  console.log("\n--- The leaderboard refuses seasons the league missed ---");

  r = await get(`/leagues/${brandNew._id}/leaderboard?season=2025`, token);
  check("new league cannot be asked for last season",
    [r.status, r.body.message], [400, "This league didn't run in that season"]);

  r = await get(`/leagues/${brandNew._id}/leaderboard`, token);
  check("new league's current table works", r.status, 200);
  check("...and everyone starts on zero", r.body.map((x) => x.totalPoints), [0]);

  r = await get(`/leagues/${veteran._id}/leaderboard?season=2025`, token);
  check("older league can still show its real history",
    [r.status, r.body[0].totalPoints], [200, 29]);

  console.log("\n--- Still membership-checked ---");
  const stranger = await User.create({
    username: "stranger", email: "stranger@example.com", password: "x",
  });
  const strangerToken = jwt.sign({ id: String(stranger._id) }, process.env.JWT_SECRET, { expiresIn: "10m" });
  r = await get(`/leagues/${brandNew._id}/seasons`, strangerToken);
  check("a non-member can't list a league's seasons", r.status, 403);

  await mongoose.connection.dropDatabase();
  console.log("\nthrowaway database dropped");
  server.close();
  await mongoose.disconnect();

  console.log(`\n${pass} passed, ${fail} failed\n`);
  process.exit(fail === 0 ? 0 : 1);
})().catch(async (e) => {
  console.error(e);
  try { await mongoose.connection.dropDatabase(); await mongoose.disconnect(); } catch {}
  process.exit(1);
});
