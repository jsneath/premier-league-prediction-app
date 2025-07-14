const express = require("express");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const { body, validationResult } = require("express-validator");
const rateLimit = require("express-rate-limit");
const User = require("../models/User");
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
        expiresIn: "1h",
      });
      res.json({ token });
    } catch (err) {
      console.error("Registration error:", err);
      res.status(500).json({ msg: "An error occurred during registration" });
    }
  }
);

// Login route
router.post("/login", async (req, res) => {
  const { username, password } = req.body;
  const user = await User.findOne({ username });
  if (!user || !(await user.comparePassword(password))) {
    // Assume hashed password
    return res.status(401).json({ message: "Invalid credentials" });
  }
  const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET, {
    expiresIn: "1d",
  });
  res.json({ token });
});

// Dev-only mock login route (add this new route for testing - hit /api/auth/dev-login to get a token without credentials)
router.get("/dev-login", (req, res) => {
  if (process.env.NODE_ENV !== "development") {
    return res.status(403).json({ message: "Dev mode only" });
  }
  // Hardcode a test user ID - replace '66b3e8f5a4b5c1234567890' with a real _id from your users collection in MongoDB Atlas
  const mockUserId = "66b3e8f5a4b5c1234567890";
  const token = jwt.sign({ id: mockUserId }, process.env.JWT_SECRET, {
    expiresIn: "7d",
  }); // Long expiry for testing
  res.json({ token });
});

module.exports = router;
