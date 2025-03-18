const express = require("express");
const router = express.Router(); // Initialize the router
const axios = require("axios");
const Fixture = require("../models/Fixture"); // Add this to import the Fixture model

router.get("/", async (req, res) => {
  try {
    const response = await axios.get(
      "https://api-football-v1.p.rapidapi.com/v3/fixtures",
      {
        headers: {
          "X-RapidAPI-Key": process.env.API_FOOTBALL_KEY,
          "X-RapidAPI-Host": "api-football-v1.p.rapidapi.com",
        },
        params: { league: 39, season: 2024 }, // Premier League
      }
    );
    const fixtures = response.data.response;

    // Save fixtures to MongoDB
    for (const fixture of fixtures) {
      await Fixture.findOneAndUpdate(
        { id: fixture.fixture.id }, // Match by fixture ID
        { $set: fixture }, // Update with the full fixture data
        { upsert: true, new: true } // Insert if not exists, return updated doc
      );
    }

    // Optionally fetch from DB to confirm storage (or just send the API response)
    const dbFixtures = await Fixture.find();
    res.json(dbFixtures);
  } catch (err) {
    console.error("Error:", err.message);
    res.status(500).json({ msg: "Server error" });
  }
});

module.exports = router;
