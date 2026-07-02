const mongoose = require("mongoose");
const scoreSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  season: { type: Number, required: true }, // e.g., 2026 = the 2026/27 season
  matchweek: { type: Number, required: true },
  points: { type: Number, default: 0 },
});

// One score doc per user per matchweek per season — prevents double-counting
scoreSchema.index({ userId: 1, season: 1, matchweek: 1 }, { unique: true });

module.exports = mongoose.model("Score", scoreSchema);
