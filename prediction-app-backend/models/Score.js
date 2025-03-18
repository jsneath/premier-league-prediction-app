const mongoose = require("mongoose");
const scoreSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  gameWeek: Number,
  points: Number,
});
module.exports = mongoose.model("Score", scoreSchema);
