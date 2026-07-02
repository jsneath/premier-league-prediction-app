const mongoose = require("mongoose");
const scoreSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  matchweek: { type: Number, required: true },
  points: { type: Number, default: 0 },
});

// One score doc per user per matchweek — prevents double-counting on the leaderboard
scoreSchema.index({ userId: 1, matchweek: 1 }, { unique: true });

module.exports = mongoose.model("Score", scoreSchema);
