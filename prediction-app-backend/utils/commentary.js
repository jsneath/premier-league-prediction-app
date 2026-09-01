const OpenAI = require("openai");
const Fixture = require("../models/Fixture");
const Prediction = require("../models/Prediction");
const League = require("../models/League");
const Commentary = require("../models/Commentary");
const { calculatePoints, leaderboard } = require("./scoring");
const { CURRENT_SEASON, seasonLabel } = require("./season");

function grokClient() {
  return new OpenAI({
    apiKey: process.env.XAI_API_KEY,
    baseURL: "https://api.x.ai/v1",
    timeout: 120000,
  });
}

// Build the data pack Grok needs to write one league's weekly report.
async function buildWeekSummary(season, matchweek, memberIds) {
  const fixtures = await Fixture.find({
    matchweek,
    "league.season": season,
  }).sort({ date: 1 });

  if (fixtures.length === 0) return null;
  const FINISHED = new Set(["FT", "AET", "PEN"]);
  const allFinished = fixtures.every((f) => FINISHED.has(f.status?.short));
  if (!allFinished) return null;

  const predictions = (
    await Prediction.find({
      matchweek,
      season,
      userId: { $in: memberIds },
    }).populate("userId", "username")
    // Skip deleted accounts and empty records — the pundit should only talk
    // about players who actually put predictions in.
  ).filter((p) => p.userId?.username && p.predictions.length > 0);
  if (predictions.length === 0) return null;

  const results = fixtures.map(
    (f) =>
      `${f.teams.home.name} ${f.goals.home}-${f.goals.away} ${f.teams.away.name}`
  );

  const players = predictions.map((predDoc) => {
    let weekTotal = 0;
    const picks = [];

    for (const p of predDoc.predictions) {
      const fixture = fixtures.find(
        (f) => f._id.toString() === p.fixtureId.toString()
      );
      if (!fixture) continue;

      const points = calculatePoints(p, fixture.goals.home, fixture.goals.away);
      if (points !== null) weekTotal += points;

      picks.push(
        `${fixture.teams.home.name} ${p.predictedHomeScore}-${p.predictedAwayScore} ${fixture.teams.away.name}` +
          ` (actual ${fixture.goals.home}-${fixture.goals.away}, ${points ?? 0} pts` +
          `${p.isDoublePoints ? ", NAP (pick of the day, points doubled)" : ""})`
      );
    }

    return { username: predDoc.userId.username, weekTotal, picks };
  });

  const standings = await leaderboard(season, { _id: { $in: memberIds } });

  return { results, players, standings };
}

// Generate and store one league's pundit report for a finished gameweek.
// Returns the Commentary doc, or null if not ready / not eligible.
async function generateCommentary(league, matchweek, season = CURRENT_SEASON) {
  if (!process.env.XAI_API_KEY) return null;

  const existing = await Commentary.findOne({
    leagueId: league._id,
    season,
    matchweek,
  });
  if (existing) return existing;

  const memberIds = league.members.map((m) => m.userId).filter(Boolean);
  if (memberIds.length === 0) return null;

  const summary = await buildWeekSummary(season, matchweek, memberIds);
  if (!summary) return null;

  const dataBlock = [
    `League: ${league.name}`,
    `Season: ${seasonLabel(season)}, Gameweek ${matchweek}`,
    ``,
    `Results:`,
    ...summary.results.map((r) => `- ${r}`),
    ``,
    `Players' predictions and points this week (3 pts exact score, 1 pt correct result, doubled if they NAPped that match — NAP = pick of the day):`,
    ...summary.players.map(
      (p) =>
        `\n${p.username} — ${p.weekTotal} pts this week:\n` +
        p.picks.map((pick) => `  - ${pick}`).join("\n")
    ),
    ``,
    `Season standings after this gameweek:`,
    ...summary.standings.map(
      (s, i) => `${i + 1}. ${s.username} — ${s.totalPoints} pts`
    ),
  ].join("\n");

  const client = grokClient();
  const response = await client.responses.create({
    model: "grok-4.6",
    store: false,
    max_output_tokens: 2000,
    input: [
      {
        role: "system",
        content:
          "You are the resident pundit for a private Premier League score-prediction league of mates. " +
          "Write about THEIR picks, not a newspaper match report, though you may needle them with the actual scores. " +
          "The doubled match is the NAP — nap of the day, pick of the day. Never call it an armband, captain, or 'the double'. " +
          "Say they napped a team, or put their NAP on a match. A dead NAP is sacred comic material. " +
          "Voice: clever, funny, abusive British football banter. Pub roast, not a press conference. Specific jokes, callbacks to last week, numbers that land. " +
          "Do not write generic metaphors ('that's not X, that's Y', 'do not buy the T-shirt', 'stopped clock'). If a line could fit any week, bin it. " +
          "Take the piss. Name and shame rotten NAPs, hive-mind scorelines, anyone still napping Manchester United, and blanks. " +
          "Praise is rare and backhanded. The winner still gets called lucky. " +
          "Mild British slang is fine (bloody, rubbish, shambles, bottled it). No slurs, no genuine nastiness about anyone's life. " +
          "150-250 words, 2-4 short paragraphs of flowing prose. No headings, bullets, markdown or sign-off. " +
          "Only mention the usernames in the data, spelled exactly as given.",
      },
      { role: "user", content: dataBlock },
    ],
  });

  const text = (response.output_text || "").trim();
  if (!text) return null;

  const doc = await Commentary.findOneAndUpdate(
    { leagueId: league._id, season, matchweek },
    { $set: { text, generatedAt: new Date() } },
    { upsert: true, new: true }
  );
  console.log(
    `Pundit report generated for "${league.name}" GW${matchweek} (${seasonLabel(season)})`
  );
  return doc;
}

// Called by the hourly cron: for every league, find current-season gameweeks
// that have fully finished with predictions in but no report yet.
async function generateMissingCommentaries() {
  if (!process.env.XAI_API_KEY) return;

  try {
    const finishedWeeks = await Fixture.distinct("matchweek", {
      "league.season": CURRENT_SEASON,
      "status.short": { $in: ["FT", "AET", "PEN"] },
    });
    if (finishedWeeks.length === 0) return;

    const leagues = await League.find({});

    for (const league of leagues) {
      for (const matchweek of finishedWeeks) {
        const covered = await Commentary.findOne({
          leagueId: league._id,
          season: CURRENT_SEASON,
          matchweek,
        });
        if (covered) continue;
        try {
          await generateCommentary(league, matchweek);
        } catch (err) {
          console.error(
            `Pundit report failed for "${league.name}" GW${matchweek}:`,
            err.message || err
          );
        }
      }
    }
  } catch (err) {
    console.error("Commentary generation error:", err);
  }
}

module.exports = {
  generateCommentary,
  generateMissingCommentaries,
  buildWeekSummary,
};
