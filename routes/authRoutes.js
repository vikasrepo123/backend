// backend/routes/authRoutes.js
const express = require("express");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const validator = require("validator");

const User = require("../models/User");
const { sendOtpEmail } = require("../utils/sendEmail");

const router = express.Router();

const OTP_TTL_MINUTES = Number(process.env.OTP_TTL_MINUTES || 10);

// small helper
function generateOtp() {
  return Math.floor(100000 + Math.random() * 900000).toString(); // 6-digit
}

function passwordIsStrong(p) {
  if (!p || p.length < 6) return false;
  if (!/[A-Za-z]/.test(p)) return false;
  if (!/[0-9]/.test(p)) return false;
  return true;
}

// ------------------
// SEND SIGNUP OTP
// ------------------
router.post("/send-signup-otp", async (req, res) => {
  try {
    const { name, email, password } = req.body || {};

    if (!name || !email || !password) {
      return res.status(400).json({ success: false, message: "Missing fields" });
    }

    if (!validator.isEmail(email)) {
      return res.status(400).json({ success: false, message: "Invalid email" });
    }

    if (!passwordIsStrong(password)) {
      return res.status(400).json({
        success: false,
        message:
          "Password must be at least 6 characters with at least one number and one letter",
      });
    }

    const exists = await User.findOne({ email });
    if (exists) {
      return res
        .status(400)
        .json({ success: false, message: "Email already registered" });
    }

    const mongoose = require("mongoose");
    let PendingUser;
    try {
      PendingUser = mongoose.model("PendingUser");
    } catch (e) {
      const puSchema = new mongoose.Schema({
        name: String,
        email: String,
        passwordHash: String,
        otp: String,
        otpExpires: Date,
        createdAt: { type: Date, default: Date.now },
      });
      PendingUser = mongoose.model("PendingUser", puSchema);
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const otp = generateOtp();
    const expires = new Date(Date.now() + OTP_TTL_MINUTES * 60 * 1000);

    const existingPending = await PendingUser.findOne({ email });
    if (existingPending) {
      existingPending.name = name;
      existingPending.passwordHash = hashedPassword;
      existingPending.otp = otp;
      existingPending.otpExpires = expires;
      await existingPending.save();
    } else {
      await PendingUser.create({
        name,
        email,
        passwordHash: hashedPassword,
        otp,
        otpExpires: expires,
      });
    }

    await sendOtpEmail({ to: email, otp, purpose: "signup", name });

    return res.json({ success: true, message: "OTP sent to email" });
  } catch (err) {
    console.error("send-signup-otp error:", err);
    return res
      .status(500)
      .json({ success: false, message: "Server error" });
  }
});

// ------------------
// VERIFY SIGNUP OTP
// ------------------
router.post("/verify-signup-otp", async (req, res) => {
  try {
    const { email, otp } = req.body || {};
    if (!email || !otp)
      return res
        .status(400)
        .json({ success: false, message: "Missing email/otp" });

    const mongoose = require("mongoose");
    const PendingUser = mongoose.model("PendingUser");

    const pending = await PendingUser.findOne({ email });
    if (!pending)
      return res
        .status(400)
        .json({ success: false, message: "No signup in progress" });

    if (pending.otp !== otp || pending.otpExpires < new Date()) {
      return res
        .status(400)
        .json({ success: false, message: "Invalid or expired OTP" });
    }

    const user = await User.create({
      name: pending.name,
      email: pending.email,
      password: pending.passwordHash,
    });

    await PendingUser.deleteOne({ email });

    return res.json({
      success: true,
      message: "Signup successful",
      user: { id: user._id, name: user.name, email: user.email },
    });
  } catch (err) {
    console.error("verify-signup-otp error:", err);
    return res
      .status(500)
      .json({ success: false, message: "Server error" });
  }
});

// ------------------
// LOGIN (UNIFIED ERRORS)
// ------------------
router.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body || {};

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: "Email or password is incorrect",
      });
    }

    const user = await User.findOne({ email });
    if (!user) {
      return res.status(400).json({
        success: false,
        message: "Email or password is incorrect",
      });
    }

    const match = await bcrypt.compare(password, user.password);
    if (!match) {
      return res.status(400).json({
        success: false,
        message: "Email or password is incorrect",
      });
    }

    if (user.twoFA) {
      const otp = generateOtp();
      user.otp = otp;
      user.otpExpires = new Date(
        Date.now() + OTP_TTL_MINUTES * 60 * 1000
      );
      await user.save();

      await sendOtpEmail({
        to: user.email,
        otp,
        purpose: "2fa",
        name: user.name,
      });

      return res.json({
        success: true,
        message: "2FA required",
        twoFA: true,
        userId: user._id,
      });
    }

    const token = jwt.sign(
      { userId: user._id },
      process.env.JWT_SECRET || "SECRET_JWT_KEY",
      { expiresIn: "7d" }
    );

    return res.json({
      success: true,
      message: "Login successful",
      token,
      user: { id: user._id, name: user.name, email: user.email },
    });
  } catch (err) {
    console.error("login error:", err);
    return res
      .status(500)
      .json({ success: false, message: "Server error" });
  }
});

// ------------------
// VERIFY 2FA
// ------------------
router.post("/verify-2fa", async (req, res) => {
  try {
    const { userId, otp } = req.body || {};
    if (!userId || !otp)
      return res
        .status(400)
        .json({ success: false, message: "Missing userId/otp" });

    const user = await User.findById(userId);
    if (!user)
      return res
        .status(400)
        .json({ success: false, message: "User not found" });

    if (
      !user.otp ||
      user.otp !== otp ||
      !user.otpExpires ||
      user.otpExpires < new Date()
    ) {
      return res
        .status(400)
        .json({ success: false, message: "Invalid or expired OTP" });
    }

    user.otp = null;
    user.otpExpires = null;
    await user.save();

    const token = jwt.sign(
      { userId: user._id },
      process.env.JWT_SECRET || "SECRET_JWT_KEY",
      { expiresIn: "7d" }
    );

    return res.json({
      success: true,
      message: "Login successful",
      token,
      user: { id: user._id, name: user.name, email: user.email },
    });
  } catch (err) {
    console.error("verify-2fa error:", err);
    return res
      .status(500)
      .json({ success: false, message: "Server error" });
  }
});

// ------------------
// FORGOT PASSWORD
// ------------------
router.post("/forgot", async (req, res) => {
  try {
    const { email } = req.body || {};
    if (!email)
      return res
        .status(400)
        .json({ success: false, message: "Missing email" });

    const user = await User.findOne({ email });
    if (!user)
      return res
        .status(400)
        .json({ success: false, message: "User not found" });

    const otp = generateOtp();
    user.otp = otp;
    user.otpExpires = new Date(
      Date.now() + OTP_TTL_MINUTES * 60 * 1000
    );
    await user.save();

    await sendOtpEmail({
      to: user.email,
      otp,
      purpose: "reset",
      name: user.name,
    });

    return res.json({ success: true, message: "OTP sent to email" });
  } catch (err) {
    console.error("forgot error:", err);
    return res
      .status(500)
      .json({ success: false, message: "Server error" });
  }
});

// ------------------
// RESET PASSWORD
// ------------------
router.post("/reset-password", async (req, res) => {
  try {
    const { email, otp, newPassword } = req.body || {};

    if (!email || !otp || !newPassword)
      return res
        .status(400)
        .json({ success: false, message: "Missing fields" });

    if (!passwordIsStrong(newPassword)) {
      return res.status(400).json({
        success: false,
        message:
          "Password must be at least 6 characters with at least one number and one letter",
      });
    }

    const user = await User.findOne({ email });
    if (!user)
      return res
        .status(400)
        .json({ success: false, message: "User not found" });

    if (
      !user.otp ||
      user.otp !== otp ||
      !user.otpExpires ||
      user.otpExpires < new Date()
    ) {
      return res
        .status(400)
        .json({ success: false, message: "Invalid or expired OTP" });
    }

    user.password = await bcrypt.hash(newPassword, 10);
    user.otp = null;
    user.otpExpires = null;
    await user.save();

    return res.json({
      success: true,
      message: "Password reset successful",
    });
  } catch (err) {
    console.error("reset-password error:", err);
    return res
      .status(500)
      .json({ success: false, message: "Server error" });
  }
});

module.exports = router;
