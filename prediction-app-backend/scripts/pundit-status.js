require("dotenv").config();
const mongoose = require("mongoose");
const Fixture = require("../models/Fixture");
const League = require("../models/League");
const Commentary = require("../models/Commentary");
const Prediction = require("../models/Prediction");
const { CURRENT_SEASON } = require("../utils/season");

(async () => {
  await mongoose.connect(process.env.MONGO_URI);
  const gw = parseInt(process.argv[2] || "1", 10);

  const fixtures = await Fixture.find({
    matchweek: gw,
    "league.season": CURRENT_SEASON,
  }).select("teams.home.name teams.away.name status.short goals date");

  const statuses = {};
  for (const f of fixtures) {
    const s = f.status?.short || "NONE";
    statuses[s] = (statuses[s] || 0) + 1;
  }

  const leagues = await League.find({}).select("name members");
  const commentaries = await Commentary.find({
    season: CURRENT_SEASON,
    matchweek: gw,
  }).select("leagueId generatedAt");

  const predCount = await Prediction.countDocuments({
    season: CURRENT_SEASON,
    matchweek: gw,
  });

  console.log(
    JSON.stringify(
      {
        season: CURRENT_SEASON,
        matchweek: gw,
        fixtureCount: fixtures.length,
        statuses,
        unfinished: fixtures
          .filter((f) => !["FT", "AET", "PEN"].includes(f.status?.short))
          .map(
            (f) =>
              `${f.teams.home.name} vs ${f.teams.away.name} [${f.status?.short}]`
          ),
        predictionDocs: predCount,
        leagues: leagues.map((l) => ({
          name: l.name,
          members: l.members.length,
        })),
        reports: commentaries.length,
        xaiKeyPresent: Boolean(process.env.XAI_API_KEY),
      },
      null,
      2
    )
  );

  await mongoose.disconnect();
})().catch((e) => {
  console.error(e.message);
  process.exit(1);
});
