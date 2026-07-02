const nodemailer = require("nodemailer");

const transporter = nodemailer.createTransport({
  host: "smtp.gmail.com",
  port: 587, // STARTTLS — port 465 is blocked from Render's network
  secure: false,
  requireTLS: true,
  auth: {
    user: process.env.GMAIL_USER,
    pass: process.env.GMAIL_APP_PASSWORD,
  },
  // Fail fast if the SMTP port is unreachable instead of hanging for 2 minutes
  connectionTimeout: 15000,
  greetingTimeout: 15000,
});

async function sendEmail({ to, subject, html }) {
  await transporter.sendMail({
    from: `"PL Predictions" <${process.env.GMAIL_USER}>`,
    to,
    subject,
    html,
  });
}

module.exports = sendEmail;
