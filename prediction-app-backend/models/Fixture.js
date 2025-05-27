const mongoose = require("mongoose");

const fixtureSchema = new mongoose.Schema({
  id: Number,
  referee: String,
  timezone: String,
  date: Date,
  timestamp: Number,
  periods: {
    first: Number,
    second: Number,
  },
  venue: {
    id: Number,
    name: String,
    city: String,
  },
  status: {
    long: String,
    short: String,
    elapsed: Number,
    extra: Number,
  },
  league: {
    id: Number,
    name: String,
    country: String,
    logo: String,
    round: String, // Add this to include the round field
  },
  teams: {
    home: { id: Number, name: String, logo: String },
    away: { id: Number, name: String, logo: String },
  },
  goals: {
    home: Number,
    away: Number,
  },
});

module.exports = mongoose.model("Fixture", fixtureSchema);
