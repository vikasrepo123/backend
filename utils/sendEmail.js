// backend/utils/sendEmail.js
const nodemailer = require("nodemailer");

const {
  SMTP_HOST,
  SMTP_PORT,
  MAIL_USER,     // from .env
  MAIL_PASS,     // from .env
  FROM_NAME,
  FROM_EMAIL,
  OTP_TTL_MINUTES
} = process.env;

// Create transporter (Hostinger SMTP)
const transporter = nodemailer.createTransport({
  host: SMTP_HOST,
  port: Number(SMTP_PORT) || 465,
  secure: Number(SMTP_PORT) === 465,  // port 465 = secure: true
  auth: {
    user: MAIL_USER,
    pass: MAIL_PASS,
  },
  tls: {
    rejectUnauthorized: false
  }
});

// Optional: verify SMTP connection on server start
transporter.verify((err, success) => {
  if (err) {
    console.log("SMTP VERIFY ERROR:", err);
  } else {
    console.log("SMTP READY ✓");
  }
});

// Send OTP Email
async function sendOtpEmail({ to, otp, purpose, name }) {
  const subject =
    purpose === "signup"
      ? "Verify your StoryProofs email address"
      : purpose === "2fa"
      ? "Your StoryProofs verification code"
      : "Reset your StoryProofs password";

  const html = `
  <div style="font-family: Arial, Helvetica, sans-serif; color: #111;">
    <div style="max-width:600px;margin:0 auto;padding:20px;">
      <div style="text-align:center;padding-bottom:20px;">
        <h2 style="margin:0;color:#2B2B2B">${FROM_NAME}</h2>
        <p style="margin:6px 0 0;color:#777">
          We received a request for ${
            purpose === "signup"
              ? "account verification"
              : purpose === "reset"
              ? "password reset"
              : "verification"
          }.
        </p>
      </div>

      <div style="background:#fff;border-radius:12px;padding:24px;border:1px solid #eee;">
        <p style="margin:0 0 10px;">Hello ${name || "there"},</p>

        <p style="margin:0 0 18px;color:#555">
          Use the verification code below to complete the process.
          This code will expire in <strong>${OTP_TTL_MINUTES || 10} minutes</strong>.
        </p>

        <div style="text-align:center;margin:18px 0;">
          <div style="display:inline-block;background:#0b3d91;color:#fff;
          padding:12px 18px;font-size:22px;border-radius:8px;letter-spacing:4px;font-weight:700;">
            ${otp}
          </div>
        </div>

        <p style="color:#777;font-size:14px;margin-top:18px;">
          If you did not request this, you can safely ignore this email.
        </p>

        <p style="color:#777;font-size:13px;margin-top:6px;">
          Regards,<br/>${FROM_NAME}
        </p>
      </div>

      <p style="text-align:center;color:#aaa;font-size:12px;margin-top:18px;">
        ${FROM_NAME} — support: ${FROM_EMAIL}
      </p>
    </div>
  </div>
  `;

  const mailOptions = {
    from: `"${FROM_NAME}" <${FROM_EMAIL}>`,
    to,
    subject,
    html,
  };

  return transporter.sendMail(mailOptions);
}

module.exports = { sendOtpEmail };
