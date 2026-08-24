require("dotenv").config();
const fs = require("fs");
const mongoose = require("mongoose");
const League = require("../models/League");
const Commentary = require("../models/Commentary");
const { CURRENT_SEASON } = require("../utils/season");

(async () => {
  const leagueName = process.argv[2];
  const matchweek = parseInt(process.argv[3], 10);
  const file = process.argv[4];
  if (!leagueName || !matchweek || !file) {
    console.error("Usage: node scripts/insert-commentary.js <league> <gw> <file>");
    process.exit(1);
  }
  const text = fs.readFileSync(file, "utf8").trim();
  await mongoose.connect(process.env.MONGO_URI);
  const league = await League.findOne({ name: leagueName });
  if (!league) {
    console.error("No league named", leagueName);
    process.exit(1);
  }
  const doc = await Commentary.findOneAndUpdate(
    { leagueId: league._id, season: CURRENT_SEASON, matchweek },
    { $set: { text, generatedAt: new Date() } },
    { upsert: true, new: true }
  );
  console.log("SAVED", league.name, "GW" + matchweek, "chars", doc.text.length);
  await mongoose.disconnect();
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
