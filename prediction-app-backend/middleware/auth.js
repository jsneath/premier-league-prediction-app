const express = require("express");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const crypto = require("crypto");
const { body, validationResult } = require("express-validator");
const rateLimit = require("express-rate-limit");
const User = require("../models/User");
const sendEmail = require("../utils/sendEmail");
const verifyToken = require("./verifyToken");
const { usernameFilter, sameUsername } = require("../utils/username");
const router = express.Router();

// Rate limiter for login
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // 5 attempts per IP
  message: "Too many login attempts, please try again later",
});

// Rate limiter for registration
const registerLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 10, // 10 accounts per IP per hour
  message: "Too many accounts created from this IP, please try again later",
});

// Rate limiter for password reset emails (protects Gmail sending limits)
const forgotPasswordLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 5, // 5 reset requests per IP per hour
  message: "Too many password reset requests, please try again later",
});

// Account changes ask for the current password, so throttle them the same way
// as login to stop anyone grinding through guesses.
const accountLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  message: "Too many account update attempts, please try again later",
});

// Register route
router.post(
  "/register",
  registerLimiter,
  [
    body("username")
      .isString()
      .withMessage("Username must be text")
      .bail()
      .trim()
      .isLength({ min: 3, max: 20 })
      .withMessage("Username must be 3-20 characters long")
      .matches(/^[a-zA-Z0-9_-]+$/)
      .withMessage("Username can only contain letters, numbers, - and _"),
    body("email")
      .isString()
      .withMessage("Email must be text")
      .bail()
      .isEmail()
      .normalizeEmail()
      .withMessage("Invalid email format"),
    body("password")
      .isString()
      .withMessage("Password must be text")
      .bail()
      .isLength({ min: 8, max: 200 })
      .withMessage("Password must be at least 8 characters long"),
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }
    const { username, password, email } = req.body;
    try {
      const existingName = await User.findOne(usernameFilter(username));
      if (existingName) {
        return res.status(400).json({ msg: "Username already exists" });
      }
      const existingEmail = await User.findOne({ email });
      if (existingEmail) {
        return res.status(400).json({ msg: "Email already in use" });
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
  try {
    const { username, password } = req.body;
    // Must be strings — objects here would become MongoDB query operators
    if (typeof username !== "string" || typeof password !== "string") {
      return res.status(400).json({ message: "Username and password are required" });
    }
    if (!username || !password) {
      return res.status(400).json({ message: "Username and password are required" });
    }
    const user = await User.findOne(usernameFilter(username));
    if (!user || !(await user.comparePassword(password))) {
      return res.status(401).json({ message: "Invalid credentials" });
    }
    const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET, {
      expiresIn: "7d",
    });
    res.json({ token });
  } catch (err) {
    console.error("Login error:", err);
    res.status(500).json({ message: "An error occurred during login" });
  }
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

// PATCH /api/auth/profile - Change display name and/or email.
// The current password is required so that someone who gets hold of a signed-in
// session can't quietly move the account's recovery address to their own.
router.patch(
  "/profile",
  verifyToken,
  accountLimiter,
  [
    body("username")
      .isString().withMessage("Username must be text").bail()
      .trim()
      .isLength({ min: 3, max: 20 })
      .withMessage("Username must be 3-20 characters long")
      .matches(/^[a-zA-Z0-9_-]+$/)
      .withMessage("Username can only contain letters, numbers, - and _"),
    body("email")
      .isString().withMessage("Email must be text").bail()
      .isEmail().normalizeEmail().withMessage("Invalid email format"),
    body("currentPassword")
      .isString().withMessage("Enter your current password").bail()
      .notEmpty().withMessage("Enter your current password"),
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ message: errors.array()[0].msg });
    }

    try {
      const user = await User.findById(req.user.id);
      if (!user) return res.status(404).json({ message: "User not found" });

      if (!(await user.comparePassword(req.body.currentPassword))) {
        return res.status(401).json({ message: "That password isn't right" });
      }

      const { username, email } = req.body;

      // Only complain about clashes with *other* people's accounts.
      // Changing only the capital letters of your own name is allowed.
      if (!sameUsername(username, user.username)) {
        const taken = await User.findOne({
          ...usernameFilter(username),
          _id: { $ne: user._id },
        });
        if (taken) return res.status(400).json({ message: "That username is already taken" });
      }
      if (email !== user.email) {
        const taken = await User.findOne({ email, _id: { $ne: user._id } });
        if (taken) return res.status(400).json({ message: "That email is already in use" });
      }

      const changed = [];
      if (username !== user.username) changed.push("name");
      if (email !== user.email) changed.push("email");

      user.username = username;
      user.email = email;
      await user.save();

      res.json({
        message: changed.length
          ? `Your ${changed.join(" and ")} ${changed.length > 1 ? "have" : "has"} been updated.`
          : "Nothing to change — those details are already saved.",
        user: { id: user._id, username: user.username, email: user.email },
      });
    } catch (err) {
      console.error("Profile update error:", err);
      res.status(500).json({ message: "Server error" });
    }
  }
);

// POST /api/auth/change-password - Set a new password from inside the app.
// This is the practical way to change a password here, since the emailed reset
// link can't be delivered from the current host.
router.post(
  "/change-password",
  verifyToken,
  accountLimiter,
  [
    body("currentPassword")
      .isString().withMessage("Enter your current password").bail()
      .notEmpty().withMessage("Enter your current password"),
    body("newPassword")
      .isString().withMessage("Password must be text").bail()
      .isLength({ min: 8, max: 200 })
      .withMessage("New password must be at least 8 characters long"),
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ message: errors.array()[0].msg });
    }

    try {
      const user = await User.findById(req.user.id);
      if (!user) return res.status(404).json({ message: "User not found" });

      if (!(await user.comparePassword(req.body.currentPassword))) {
        return res.status(401).json({ message: "That password isn't right" });
      }
      if (req.body.currentPassword === req.body.newPassword) {
        return res.status(400).json({ message: "That's already your password — pick a new one" });
      }

      user.password = await bcrypt.hash(req.body.newPassword, 10);
      user.resetPasswordToken = undefined;
      user.resetPasswordExpires = undefined;
      await user.save();

      // Hand back a fresh token so the current session carries on working
      const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET, {
        expiresIn: "7d",
      });
      res.json({ message: "Password changed.", token });
    } catch (err) {
      console.error("Change password error:", err);
      res.status(500).json({ message: "Server error" });
    }
  }
);

// POST /api/auth/forgot-password
router.post(
  "/forgot-password",
  forgotPasswordLimiter,
  [body("email").isEmail().normalizeEmail().withMessage("Invalid email")],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    try {
      const email = req.body.email;
      const user = await User.findOne({
        $or: [
          { email },
          { email: new RegExp(`^${email.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}$`, "i") },
        ],
      });

      if (user) {
        const resetToken = crypto.randomBytes(32).toString("hex");
        user.resetPasswordToken = crypto
          .createHash("sha256")
          .update(resetToken)
          .digest("hex");
        user.resetPasswordExpires = Date.now() + 48 * 60 * 60 * 1000; // 48 hours
        await user.save();

        const resetUrl = `${
          (process.env.FRONTEND_URL || "http://localhost:3000").replace(/\/$/, "")
        }/reset-password/${resetToken}`;

        await sendEmail({
          to: user.email,
          subject: "PL Predictions - Password Reset",
          html: `
            <h2>Password Reset Request</h2>
            <p>You requested a password reset. Click the link below to set a new password:</p>
            <p><a href="${resetUrl}">${resetUrl}</a></p>
            <p>This link expires in 48 hours.</p>
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
      res.status(503).json({
        message:
          "The reset email could not be sent just now. Try again in a minute, or ask James to reset it for you.",
      });
    }
  }
);

// POST /api/auth/reset-password/:token
router.post(
  "/reset-password/:token",
  forgotPasswordLimiter,
  [
    body("password")
      .isString()
      .withMessage("Password must be text")
      .bail()
      .isLength({ min: 8, max: 200 })
      .withMessage("Password must be at least 8 characters long"),
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

module.exports = router;
