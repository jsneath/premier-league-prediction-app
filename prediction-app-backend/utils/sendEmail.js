/**
 * Password-reset mail.
 *
 * Prefer Resend (HTTPS) in production — Render's free web services often
 * cannot open outbound SMTP. Gmail SMTP is the local / fallback path.
 */
async function sendEmail({ to, subject, html }) {
  const fromName = "PL Predictions";
  const gmailUser = (process.env.GMAIL_USER || "").trim();
  const resendKey = (process.env.RESEND_API_KEY || "").trim();

  if (resendKey) {
    const from = gmailUser || "PL Predictions <onboarding@resend.dev>";
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${resendKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: gmailUser.includes("<") ? from : `${fromName} <${gmailUser}>`,
        to: [to],
        subject,
        html,
      }),
    });
    if (!res.ok) {
      const body = await res.text();
      throw new Error(`Resend failed (${res.status}): ${body}`);
    }
    return;
  }

  const gmailPass = (process.env.GMAIL_APP_PASSWORD || "").replace(/\s+/g, "");
  if (!gmailUser || !gmailPass) {
    throw new Error(
      "Email is not configured. Set RESEND_API_KEY or GMAIL_USER and GMAIL_APP_PASSWORD."
    );
  }

  const nodemailer = require("nodemailer");
  const transporter = nodemailer.createTransport({
    host: "smtp.gmail.com",
    port: 587,
    secure: false,
    requireTLS: true,
    auth: { user: gmailUser, pass: gmailPass },
    connectionTimeout: 15000,
    greetingTimeout: 15000,
  });

  await transporter.sendMail({
    from: `"${fromName}" <${gmailUser}>`,
    to,
    subject,
    html,
  });
}

module.exports = sendEmail;
