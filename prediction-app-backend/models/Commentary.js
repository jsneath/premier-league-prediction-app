const mongoose = require("mongoose");

const commentarySchema = new mongoose.Schema({
  season: { type: Number, required: true }, // e.g., 2026 = the 2026/27 season
  matchweek: { type: Number, required: true },
  text: { type: String, required: true },
  generatedAt: { type: Date, default: Date.now },
});

// One report per gameweek per season
commentarySchema.index({ season: 1, matchweek: 1 }, { unique: true });

module.exports = mongoose.model("Commentary", commentarySchema);
