const express = require("express");
const User = require("../models/User");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");

const router = express.Router();

// quick health check for this router
router.get("/ping", (req, res) => res.json({ success: true, route: "/auth ping ok" }));

// Register
router.post("/register", async (req, res) => {
  try {
    const { name, email, password } = req.body || {};

    if (!name || !email || !password) {
      return res.status(400).json({ success: false, message: "Missing name/email/password" });
    }

    const exists = await User.findOne({ email });
    if (exists) {
      return res.status(400).json({ success: false, message: "Email already registered" });
    }

    const hashed = await bcrypt.hash(password, 10);

    const user = new User({
      name,
      email,
      password: hashed,
    });

    await user.save();

    res.json({ success: true, message: "User registered" });
  } catch (err) {
    console.error("Register error:", err);
    res.status(500).json({ success: false, error: "Server error" });
  }
});

// Login
router.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body || {};
    if (!email || !password) return res.status(400).json({ success: false, message: "Missing email/password" });

    const user = await User.findOne({ email });
    if (!user) return res.status(400).json({ success: false, message: "User not found" });

    const match = await bcrypt.compare(password, user.password);
    if (!match) return res.status(400).json({ success: false, message: "Invalid password" });

    const token = jwt.sign({ userId: user._id }, process.env.JWT_SECRET || "SECRET_JWT_KEY", { expiresIn: "7d" });

    res.json({
      success: true,
      message: "Login successful",
      token,
      user: { _id: user._id, name: user.name, email: user.email }
    });
  } catch (err) {
    console.error("Login error:", err);
    res.status(500).json({ success: false, error: "Server error" });
  }
});

module.exports = router;
