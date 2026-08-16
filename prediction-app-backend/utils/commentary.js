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
  const allFinished = fixtures.every((f) => f.status?.short === "FT");
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
          `${p.isDoublePoints ? ", DOUBLE POINTS pick" : ""})`
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
    `Players' predictions and points this week (3 pts exact score, 1 pt correct result, doubled on their chosen DOUBLE POINTS match):`,
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
          "You are the resident pundit for a private Premier League score-prediction game played between a small group of friends. " +
          "Each week you write a short, funny match report about THEIR predictions (not the football itself, though you can reference real results). " +
          "Style: British football banter — cheeky, warm, taking the mick out of mates. Think Soccer Saturday meets a group chat. " +
          "Praise the week's winner, roast whoever flopped (especially bold double-points picks that backfired or someone predicting a team they clearly overrate), " +
          "celebrate exact-score hits as moments of genius, and note anything spicy in the season standings (gaps closing, leads extending, someone rooted to the bottom). " +
          "Keep it good-natured — these are friends. No profanity stronger than mild British slang. " +
          "Write 150-250 words of flowing prose in 2-4 short paragraphs. No headings, no bullet points, no markdown, no sign-off. " +
          "Only ever mention the players listed in the data. Refer to them by their username exactly as given.",
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
      "status.short": "FT",
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

module.exports = { generateCommentary, generateMissingCommentaries };
