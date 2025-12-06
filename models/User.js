// backend/models/User.js
const mongoose = require("mongoose");

/**
 * User schema
 * - name, email, password: basic auth fields
 * - otp + otpExpires: temporary OTP for signup / password reset / 2FA
 * - verified: whether email is verified
 * - twoFA: whether user has 2FA enabled (you can store secret in future)
 * - bookmarks: array of Story ObjectIds
 * - isAdmin: admin flag
 * - createdAt: timestamp
 */
const userSchema = new mongoose.Schema({
  // -----------------------
  // Basic profile fields
  // -----------------------
  name: {
    type: String,
    required: true,
    trim: true
  },

  email: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    trim: true
  },

  password: {
    type: String,
    required: true
  },

  // -----------------------
  // OTP / verification
  // -----------------------
  // OTP value (one-time code). Set to null when not in use.
  otp: {
    type: String,
    default: null
  },

  // OTP expiration timestamp (Date)
  otpExpires: {
    type: Date,
    default: null
  },

  // Whether the user has completed email verification
  verified: {
    type: Boolean,
    default: false
  },

  // -----------------------
  // Two-Factor Auth (2FA)
  // -----------------------
  // Simple boolean to indicate if 2FA is enabled.
  // (When you implement, you may add a 'twoFASecret' field later.)
  twoFA: {
    type: Boolean,
    default: false
  },

  // -----------------------
  // Bookmarks & roles
  // -----------------------
  // Bookmarked stories (references to Story model)
  bookmarks: [
    {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Story"
    }
  ],

  // Admin flag for admin panel / privileges
  isAdmin: {
    type: Boolean,
    default: false
  },

  // -----------------------
  // Metadata
  // -----------------------
  createdAt: {
    type: Date,
    default: Date.now
  }
}, {
  // include virtuals when converting to JSON (handy later)
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

module.exports = mongoose.model("User", userSchema);
