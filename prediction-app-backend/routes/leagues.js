const express = require("express");
const router = express.Router();
const mongoose = require("mongoose");
const League = require("../models/League");
const Score = require("../models/Score");
const verifyToken = require("../middleware/verifyToken");
const generateInviteCode = require("../utils/generateInviteCode");

// All routes require auth
router.use(verifyToken);

// POST /api/leagues - Create a league
router.post("/", async (req, res) => {
  try {
    const { name } = req.body;
    if (!name || name.trim().length === 0) {
      return res.status(400).json({ message: "League name is required" });
    }
    if (name.trim().length > 50) {
      return res
        .status(400)
        .json({ message: "League name must be 50 characters or less" });
    }

    const inviteCode = await generateInviteCode();
    const league = new League({
      name: name.trim(),
      inviteCode,
      createdBy: req.user.id,
      members: [{ userId: req.user.id, role: "admin" }],
    });
    await league.save();

    res.status(201).json(league);
  } catch (err) {
    console.error("Create league error:", err);
    res.status(500).json({ message: "Server error" });
  }
});

// POST /api/leagues/join - Join a league by invite code
router.post("/join", async (req, res) => {
  try {
    const { inviteCode } = req.body;
    if (!inviteCode) {
      return res.status(400).json({ message: "Invite code is required" });
    }

    const league = await League.findOne({
      inviteCode: inviteCode.toUpperCase(),
    });
    if (!league) {
      return res.status(404).json({ message: "Invalid invite code" });
    }

    const alreadyMember = league.members.some(
      (m) => m.userId.toString() === req.user.id
    );
    if (alreadyMember) {
      return res
        .status(400)
        .json({ message: "You are already a member of this league" });
    }

    league.members.push({ userId: req.user.id, role: "member" });
    await league.save();

    res.json(league);
  } catch (err) {
    console.error("Join league error:", err);
    res.status(500).json({ message: "Server error" });
  }
});

// GET /api/leagues - List user's leagues
router.get("/", async (req, res) => {
  try {
    const leagues = await League.find({ "members.userId": req.user.id })
      .select("name inviteCode members createdAt")
      .sort({ createdAt: -1 });

    res.json(leagues);
  } catch (err) {
    console.error("List leagues error:", err);
    res.status(500).json({ message: "Server error" });
  }
});

// GET /api/leagues/:id - League detail
router.get("/:id", async (req, res) => {
  try {
    const league = await League.findById(req.params.id).populate(
      "members.userId",
      "username"
    );
    if (!league) {
      return res.status(404).json({ message: "League not found" });
    }

    const isMember = league.members.some(
      (m) => m.userId._id.toString() === req.user.id
    );
    if (!isMember) {
      return res.status(403).json({ message: "You are not a member of this league" });
    }

    res.json(league);
  } catch (err) {
    console.error("League detail error:", err);
    res.status(500).json({ message: "Server error" });
  }
});

// GET /api/leagues/:id/leaderboard - League-scoped leaderboard
router.get("/:id/leaderboard", async (req, res) => {
  try {
    const league = await League.findById(req.params.id);
    if (!league) {
      return res.status(404).json({ message: "League not found" });
    }

    const isMember = league.members.some(
      (m) => m.userId.toString() === req.user.id
    );
    if (!isMember) {
      return res.status(403).json({ message: "You are not a member of this league" });
    }

    const memberIds = league.members.map((m) => m.userId);

    const scores = await Score.aggregate([
      { $match: { userId: { $in: memberIds } } },
      { $group: { _id: "$userId", totalPoints: { $sum: "$points" } } },
      {
        $lookup: {
          from: "users",
          localField: "_id",
          foreignField: "_id",
          as: "user",
        },
      },
      { $unwind: "$user" },
      {
        $project: {
          _id: 1,
          totalPoints: 1,
          username: "$user.username",
        },
      },
      { $sort: { totalPoints: -1 } },
    ]);

    res.json(scores);
  } catch (err) {
    console.error("League leaderboard error:", err);
    res.status(500).json({ message: "Server error" });
  }
});

// DELETE /api/leagues/:id - Delete league (admin only)
router.delete("/:id", async (req, res) => {
  try {
    const league = await League.findById(req.params.id);
    if (!league) {
      return res.status(404).json({ message: "League not found" });
    }

    const member = league.members.find(
      (m) => m.userId.toString() === req.user.id
    );
    if (!member || member.role !== "admin") {
      return res
        .status(403)
        .json({ message: "Only the league admin can delete this league" });
    }

    await League.findByIdAndDelete(req.params.id);
    res.json({ message: "League deleted" });
  } catch (err) {
    console.error("Delete league error:", err);
    res.status(500).json({ message: "Server error" });
  }
});

// DELETE /api/leagues/:id/leave - Leave a league
router.delete("/:id/leave", async (req, res) => {
  try {
    const league = await League.findById(req.params.id);
    if (!league) {
      return res.status(404).json({ message: "League not found" });
    }

    const memberIdx = league.members.findIndex(
      (m) => m.userId.toString() === req.user.id
    );
    if (memberIdx === -1) {
      return res
        .status(400)
        .json({ message: "You are not a member of this league" });
    }

    const member = league.members[memberIdx];

    // If admin is leaving and there are other members, transfer admin
    if (member.role === "admin" && league.members.length > 1) {
      const nextAdmin = league.members.find(
        (m) => m.userId.toString() !== req.user.id
      );
      if (nextAdmin) nextAdmin.role = "admin";
    }

    league.members.splice(memberIdx, 1);

    // If no members left, delete the league
    if (league.members.length === 0) {
      await League.findByIdAndDelete(req.params.id);
      return res.json({ message: "Left league. League deleted (no members remaining)." });
    }

    await league.save();
    res.json({ message: "Left league successfully" });
  } catch (err) {
    console.error("Leave league error:", err);
    res.status(500).json({ message: "Server error" });
  }
});

module.exports = router;
