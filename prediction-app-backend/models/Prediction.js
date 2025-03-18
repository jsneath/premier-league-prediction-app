const mongoose = require("mongoose");
const predictionSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  fixtureId: { type: mongoose.Schema.Types.ObjectId, ref: "Fixture" },
  predictedHomeScore: Number,
  predictedAwayScore: Number,
  isDoublePoints: Boolean,
  submittedAt: { type: Date, default: Date.now },
});
module.exports = mongoose.model("Prediction", predictionSchema);
