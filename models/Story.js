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

  views: {
    type: Number,
    default: 0,
  },

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

module.exports = mongoose.model("Story", storySchema);
