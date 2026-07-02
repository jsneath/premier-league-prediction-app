const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const cron = require("node-cron");
const Fixture = require("./models/Fixture");
const Prediction = require("./models/Prediction");
const Score = require("./models/Score");
const refreshFixtures = require("./utils/refreshFixtures");
const { updateAllScores } = require("./utils/scoring");
require("dotenv").config();

const app = express();

// Behind Render's proxy: needed so rate limiting sees real client IPs,
// not the proxy's IP (which would lump all users together)
app.set("trust proxy", 1);

app.use(
  cors(
    process.env.FRONTEND_URL
      ? { origin: process.env.FRONTEND_URL }
      : undefined
  )
);
app.use(express.json());

// One-time data migration + index setup:
// 1. Tag pre-season-support docs with season 2025 (they're all from 2025/26).
// 2. Remove duplicate Score/Prediction docs (keep the newest).
// 3. Build the unique {userId, season, matchweek} indexes.
const ensureIndexes = async () => {
  // Fixtures saved before the schema had league.season: tag by date
  // (2025/26 season ended May 2026; 2026/27 starts Aug 2026)
  const cutoff = new Date("2026-07-01");
  await Fixture.updateMany(
    { "league.season": { $exists: false }, date: { $lt: cutoff } },
    { $set: { "league.season": 2025 } }
  );
  await Fixture.updateMany(
    { "league.season": { $exists: false } },
    { $set: { "league.season": 2026 } }
  );

  for (const Model of [Score, Prediction]) {
    const migrated = await Model.updateMany(
      { season: { $exists: false } },
      { $set: { season: 2025 } }
    );
    if (migrated.modifiedCount > 0) {
      console.log(
        `Tagged ${migrated.modifiedCount} ${Model.modelName} doc(s) as season 2025`
      );
    }

    const dups = await Model.aggregate([
      {
        $group: {
          _id: { userId: "$userId", season: "$season", matchweek: "$matchweek" },
          ids: { $push: "$_id" },
          count: { $sum: 1 },
        },
      },
      { $match: { count: { $gt: 1 } } },
    ]);
    for (const group of dups) {
      const toDelete = group.ids.slice(0, -1); // keep the last (newest) doc
      await Model.deleteMany({ _id: { $in: toDelete } });
      console.log(
        `Removed ${toDelete.length} duplicate ${Model.modelName} doc(s) for`,
        group._id
      );
    }
    await Model.syncIndexes();
  }
};

const syncFixturesAndScores = async () => {
  try {
    console.log("Refreshing fixtures...");
    const count = await refreshFixtures();
    console.log(`${count} fixtures refreshed.`);
    await updateAllScores();
    console.log("Scores updated.");
  } catch (err) {
    console.error("Error refreshing fixtures/scores:", err);
  }
};

mongoose
  .connect(process.env.MONGO_URI)
  .then(async () => {
    console.log("MongoDB connected");
    await ensureIndexes().catch((err) =>
      console.error("Index setup error:", err)
    );
    syncFixturesAndScores();
  })
  .catch((err) => console.log(err));

// Refresh fixtures + recalculate scores every hour
cron.schedule("0 * * * *", syncFixturesAndScores);

app.use("/api/auth", require("./middleware/auth"));
app.use("/api/fixtures", require("./routes/fixtures"));
app.use("/api/predictions", require("./routes/predictions"));
app.use("/api/scores", require("./routes/scores"));
app.use("/api/leagues", require("./routes/leagues"));

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
