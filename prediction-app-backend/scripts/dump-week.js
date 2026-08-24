require("dotenv").config();
const mongoose = require("mongoose");
const League = require("../models/League");
const { buildWeekSummary } = require("../utils/commentary");
const { CURRENT_SEASON } = require("../utils/season");

(async () => {
  const gw = parseInt(process.argv[2] || "1", 10);
  await mongoose.connect(process.env.MONGO_URI);
  const leagues = await League.find({});
  for (const league of leagues) {
    const memberIds = league.members.map((m) => m.userId).filter(Boolean);
    const summary = await buildWeekSummary(CURRENT_SEASON, gw, memberIds);
    console.log("\n====", league.name, league._id.toString(), "====");
    if (!summary) {
      console.log("(no summary — unfinished or no predictions)");
      continue;
    }
    console.log("RESULTS");
    summary.results.forEach((r) => console.log(" ", r));
    console.log("PLAYERS");
    summary.players
      .sort((a, b) => b.weekTotal - a.weekTotal)
      .forEach((p) => {
        console.log(` ${p.username} ${p.weekTotal}pts`);
        p.picks.forEach((pick) => console.log("   ", pick));
      });
    console.log("TABLE");
    summary.standings.forEach((s, i) =>
      console.log(` ${i + 1}. ${s.username} ${s.totalPoints}`)
    );
  }
  await mongoose.disconnect();
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
