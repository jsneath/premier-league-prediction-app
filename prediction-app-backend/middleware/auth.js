const express = require("express");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const crypto = require("crypto");
const { body, validationResult } = require("express-validator");
const rateLimit = require("express-rate-limit");
const User = require("../models/User");
const sendEmail = require("../utils/sendEmail");
const verifyToken = require("./verifyToken");
const router = express.Router();

// Rate limiter for login
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // 5 attempts per IP
  message: "Too many login attempts, please try again later",
});

// Register route
router.post(
  "/register",
  [
    body("username")
      .trim()
      .isLength({ min: 3 })
      .withMessage("Username must be at least 3 characters long"),
    body("email")
      .isEmail()
      .normalizeEmail()
      .withMessage("Invalid email format"),
    body("password")
      .isLength({ min: 6 })
      .withMessage("Password must be at least 6 characters long"),
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }
    const { username, password, email } = req.body;
    try {
      let user = await User.findOne({ $or: [{ username }, { email }] });
      if (user) {
        if (user.username === username) {
          return res.status(400).json({ msg: "Username already exists" });
        } else {
          return res.status(400).json({ msg: "Email already in use" });
        }
      }
      user = new User({
        username,
        password: await bcrypt.hash(password, 10),
        email,
      });
      await user.save();
      const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET, {
        expiresIn: "7d",
      });
      res.json({ token });
    } catch (err) {
      console.error("Registration error:", err);
      res.status(500).json({ msg: "An error occurred during registration" });
    }
  }
);

// Login route
router.post("/login", loginLimiter, async (req, res) => {
  const { username, password } = req.body;
  const user = await User.findOne({ username });
  if (!user || !(await user.comparePassword(password))) {
    return res.status(401).json({ message: "Invalid credentials" });
  }
  const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET, {
    expiresIn: "7d",
  });
  res.json({ token });
});

// POST /api/auth/refresh - Issue new token if current one is valid
router.post("/refresh", verifyToken, async (req, res) => {
  try {
    const token = jwt.sign({ id: req.user.id }, process.env.JWT_SECRET, {
      expiresIn: "7d",
    });
    res.json({ token });
  } catch (err) {
    console.error("Token refresh error:", err);
    res.status(500).json({ message: "Server error" });
  }
});

// GET /api/auth/me - Get current authenticated user
router.get("/me", verifyToken, async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select("-password");
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }
    res.json({ id: user._id, username: user.username, email: user.email });
  } catch (err) {
    console.error("GET /me error:", err);
    res.status(500).json({ message: "Server error" });
  }
});

// POST /api/auth/forgot-password
router.post(
  "/forgot-password",
  [body("email").isEmail().normalizeEmail().withMessage("Invalid email")],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    try {
      const user = await User.findOne({ email: req.body.email });

      if (user) {
        const resetToken = crypto.randomBytes(32).toString("hex");
        user.resetPasswordToken = crypto
          .createHash("sha256")
          .update(resetToken)
          .digest("hex");
        user.resetPasswordExpires = Date.now() + 60 * 60 * 1000; // 1 hour
        await user.save();

        const resetUrl = `${
          process.env.FRONTEND_URL || "http://localhost:3000"
        }/reset-password/${resetToken}`;

        await sendEmail({
          to: user.email,
          subject: "PL Predictions - Password Reset",
          html: `
            <h2>Password Reset Request</h2>
            <p>You requested a password reset. Click the link below to set a new password:</p>
            <p><a href="${resetUrl}">${resetUrl}</a></p>
            <p>This link expires in 1 hour.</p>
            <p>If you didn't request this, please ignore this email.</p>
          `,
        });
      }

      // Always return success to prevent email enumeration
      res.json({
        message:
          "If an account with that email exists, a reset link has been sent.",
      });
    } catch (err) {
      console.error("Forgot password error:", err);
      res.status(500).json({ message: "Server error" });
    }
  }
);

// POST /api/auth/reset-password/:token
router.post(
  "/reset-password/:token",
  [
    body("password")
      .isLength({ min: 6 })
      .withMessage("Password must be at least 6 characters long"),
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    try {
      const hashedToken = crypto
        .createHash("sha256")
        .update(req.params.token)
        .digest("hex");

      const user = await User.findOne({
        resetPasswordToken: hashedToken,
        resetPasswordExpires: { $gt: Date.now() },
      });

      if (!user) {
        return res
          .status(400)
          .json({ message: "Invalid or expired reset token" });
      }

      user.password = await bcrypt.hash(req.body.password, 10);
      user.resetPasswordToken = undefined;
      user.resetPasswordExpires = undefined;
      await user.save();

      res.json({ message: "Password reset successful. You can now log in." });
    } catch (err) {
      console.error("Reset password error:", err);
      res.status(500).json({ message: "Server error" });
    }
  }
);

// Dev-only mock login route
router.get("/dev-login", (req, res) => {
  if (process.env.NODE_ENV !== "development") {
    return res.status(403).json({ message: "Dev mode only" });
  }
  const mockUserId = "66b3e8f5a4b5c1234567890";
  const token = jwt.sign({ id: mockUserId }, process.env.JWT_SECRET, {
    expiresIn: "7d",
  });
  res.json({ token });
});

module.exports = router;
