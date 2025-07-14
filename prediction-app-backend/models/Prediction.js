const mongoose = require("mongoose");

const predictionSubSchema = new mongoose.Schema({
  fixtureId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Fixture",
    required: true,
  },
  predictedHomeScore: { type: Number, required: true, min: 0 },
  predictedAwayScore: { type: Number, required: true, min: 0 },
  isDoublePoints: { type: Boolean, default: false },
});

const predictionSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  matchweek: { type: Number, required: true }, // e.g., 1
  predictions: [predictionSubSchema],
  submittedAt: { type: Date, default: Date.now },
});

module.exports = mongoose.model("Prediction", predictionSchema);
