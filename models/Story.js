// models/Story.js
const mongoose = require("mongoose");

const storySchema = new mongoose.Schema({
  title: {
    type: String,
    required: true,
    trim: true,
  },

  category: {
    type: String,
    required: true,
    enum: [
      "Horror",
      "Adult",
      "Confession",
      "Success",
      "Travel",
      "Funny",
      "Mystery",
      "Relationship",
      "Life",
      "Crime"
    ],
  },

  content: {
    type: String,
    required: true,
  },

  tags: {
    type: [String],
    default: [],
  },

  proofs: {
    type: [String],
    default: [],
  },

  likes: {
    type: Number,
    default: 0,
  },

  dislikes: {
    type: Number,
    default: 0,
  },

  // track which users liked/disliked
  likedBy: {
    type: [String],
    default: [],
  },

  dislikedBy: {
    type: [String],
    default: [],
  },

  views: {
    type: Number,
    default: 0,
  },

  // admin may hide a story (moderation)
  hidden: {
    type: Boolean,
    default: false,
  },

  // reports array: store userId + reason + optional details
  reports: [
    {
      userId: { type: String },
      reason: { type: String, required: true },
      details: { type: String, default: "" },
      createdAt: { type: Date, default: Date.now }
    }
  ],

  anonymous: {
    type: Boolean,
    default: false,
  },

  author: {
    type: String,
    default: "Anonymous",
  },

  createdAt: {
    type: Date,
    default: Date.now,
  },

  comments: [
    {
      text: { type: String, required: true },
      author: { type: String, default: "Anonymous" },
      createdAt: { type: Date, default: Date.now }
    }
  ]
});

// optional index to speed up trending queries
storySchema.index({ views: -1, likes: -1, createdAt: -1 });

module.exports = mongoose.model("Story", storySchema);
