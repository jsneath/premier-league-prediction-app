/**
 * One-off: create a live reset link and send it via local Gmail SMTP.
 * Usage: node scripts/send-reset.js <email-or-username>
 */
require("dotenv").config();
const crypto = require("crypto");
const mongoose = require("mongoose");
const User = require("../models/User");
const sendEmail = require("../utils/sendEmail");
const { usernameFilter } = require("../utils/username");

const FRONTEND = (
  process.env.FRONTEND_URL || "https://premier-league-prediction-app.vercel.app"
).replace(/\/$/, "");

(async () => {
  const q = process.argv[2];
  if (!q) {
    console.error("Usage: node scripts/send-reset.js <email-or-username>");
    process.exit(1);
  }

  await mongoose.connect(process.env.MONGO_URI);
  const escaped = q.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const user = await User.findOne({
    $or: [
      usernameFilter(q),
      { email: q },
      { email: new RegExp(`^${escaped}$`, "i") },
    ],
  });

  if (!user) {
    console.error("No account found for that email/username.");
    await mongoose.disconnect();
    process.exit(1);
  }

  const resetToken = crypto.randomBytes(32).toString("hex");
  user.resetPasswordToken = crypto
    .createHash("sha256")
    .update(resetToken)
    .digest("hex");
  user.resetPasswordExpires = Date.now() + 48 * 60 * 60 * 1000;
  await user.save();

  const resetUrl = `${FRONTEND}/reset-password/${resetToken}`;
  await sendEmail({
    to: user.email,
    subject: "PL Predictions - Password Reset",
    html: `
      <h2>Password Reset Request</h2>
      <p>Hi ${user.username},</p>
      <p>Click the link below to set a new password:</p>
      <p><a href="${resetUrl}">${resetUrl}</a></p>
      <p>This link expires in 48 hours.</p>
    `,
  });

  console.log("SENT_TO_ACCOUNT", user.username);
  console.log("RESET_URL", resetUrl);
  await mongoose.disconnect();
})().catch(async (err) => {
  console.error("FAIL", err.message);
  try {
    await mongoose.disconnect();
  } catch {}
  process.exit(1);
});
