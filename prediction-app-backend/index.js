const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const cron = require("node-cron");
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

// Remove duplicate Score/Prediction docs (keep the newest) so the unique
// {userId, matchweek} indexes can build, then build them.
const ensureIndexes = async () => {
  for (const Model of [Score, Prediction]) {
    const dups = await Model.aggregate([
      {
        $group: {
          _id: { userId: "$userId", matchweek: "$matchweek" },
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
