const mongoose = require("mongoose");

const commentarySchema = new mongoose.Schema({
  // Reports are written per league so separate groups of friends only ever
  // get banter about their own players.
  leagueId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "League",
    required: true,
  },
  season: { type: Number, required: true }, // e.g., 2026 = the 2026/27 season
  matchweek: { type: Number, required: true },
  text: { type: String, required: true },
  generatedAt: { type: Date, default: Date.now },
});

// One report per league per gameweek per season
commentarySchema.index(
  { leagueId: 1, season: 1, matchweek: 1 },
  { unique: true }
);

module.exports = mongoose.model("Commentary", commentarySchema);
