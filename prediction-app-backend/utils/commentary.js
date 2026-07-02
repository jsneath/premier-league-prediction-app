const Anthropic = require("@anthropic-ai/sdk");
const Fixture = require("../models/Fixture");
const Prediction = require("../models/Prediction");
const Commentary = require("../models/Commentary");
const { calculatePoints, leaderboard } = require("./scoring");
const { CURRENT_SEASON, seasonLabel } = require("./season");

// Build the data pack Claude needs to write the weekly report
async function buildWeekSummary(season, matchweek) {
  const fixtures = await Fixture.find({
    matchweek,
    "league.season": season,
  }).sort({ date: 1 });

  if (fixtures.length === 0) return null;
  const allFinished = fixtures.every((f) => f.status?.short === "FT");
  if (!allFinished) return null;

  let predictions = await Prediction.find({ matchweek, season }).populate(
    "userId",
    "username"
  );
  // Skip predictions whose user account no longer exists
  predictions = predictions.filter((p) => p.userId?.username);
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

    return {
      username: predDoc.userId.username,
      weekTotal,
      picks,
    };
  });

  const standings = await leaderboard(season);

  return { fixtures, results, players, standings };
}

// Generate and store the pundit report for one finished gameweek.
// Returns the Commentary doc, or null if the week isn't ready/eligible.
async function generateCommentary(matchweek, season = CURRENT_SEASON) {
  if (!process.env.ANTHROPIC_API_KEY) return null;

  const existing = await Commentary.findOne({ season, matchweek });
  if (existing) return existing;

  const summary = await buildWeekSummary(season, matchweek);
  if (!summary) return null;

  const dataBlock = [
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

  const client = new Anthropic();
  const response = await client.messages.create({
    model: "claude-opus-4-8",
    max_tokens: 2000,
    thinking: { type: "adaptive" },
    system:
      "You are the resident pundit for a private Premier League score-prediction game played between a small group of friends. " +
      "Each week you write a short, funny match report about THEIR predictions (not the football itself, though you can reference real results). " +
      "Style: British football banter — cheeky, warm, taking the mick out of mates. Think Soccer Saturday meets a group chat. " +
      "Praise the week's winner, roast whoever flopped (especially bold double-points picks that backfired or someone predicting a team they clearly overrate), " +
      "celebrate exact-score hits as moments of genius, and note anything spicy in the season standings (gaps closing, leads extending, someone rooted to the bottom). " +
      "Keep it good-natured — these are friends. No profanity stronger than mild British slang. " +
      "Write 150-250 words of flowing prose in 2-4 short paragraphs. No headings, no bullet points, no markdown, no sign-off. " +
      "Refer to players by their username exactly as given.",
    messages: [{ role: "user", content: dataBlock }],
  });

  if (response.stop_reason === "refusal") return null;

  const text = response.content
    .filter((b) => b.type === "text")
    .map((b) => b.text)
    .join("")
    .trim();
  if (!text) return null;

  const doc = await Commentary.findOneAndUpdate(
    { season, matchweek },
    { $set: { text, generatedAt: new Date() } },
    { upsert: true, new: true }
  );
  console.log(`Pundit report generated for GW${matchweek} (${seasonLabel(season)})`);
  return doc;
}

// Called by the hourly cron: find current-season gameweeks that have fully
// finished with predictions in, but no report yet, and generate them.
async function generateMissingCommentaries() {
  if (!process.env.ANTHROPIC_API_KEY) return;

  try {
    const finishedWeeks = await Fixture.distinct("matchweek", {
      "league.season": CURRENT_SEASON,
      "status.short": "FT",
    });

    for (const matchweek of finishedWeeks) {
      const covered = await Commentary.findOne({
        season: CURRENT_SEASON,
        matchweek,
      });
      if (covered) continue;
      await generateCommentary(matchweek);
    }
  } catch (err) {
    console.error("Commentary generation error:", err);
  }
}

module.exports = { generateCommentary, generateMissingCommentaries };
