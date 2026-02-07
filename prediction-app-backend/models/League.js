const mongoose = require("mongoose");

const leagueSchema = new mongoose.Schema({
  name: { type: String, required: true, maxlength: 50 },
  inviteCode: { type: String, unique: true, required: true },
  members: [
    {
      userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: true,
      },
      role: { type: String, enum: ["admin", "member"], default: "member" },
      joinedAt: { type: Date, default: Date.now },
    },
  ],
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
  },
  createdAt: { type: Date, default: Date.now },
});

module.exports = mongoose.model("League", leagueSchema);
