const express = require("express");
const User = require("../models/User.js");   // FORCE LOAD MODEL
const Story = require("../models/Story.js");

const router = express.Router();

// Health Check
router.get("/ping", (req, res) => {
  res.json({ success: true, route: "/users ok" });
});

// ⭐ Toggle bookmark
router.post("/bookmark/:storyId", async (req, res) => {
  try {
    const { userId } = req.body;
    const { storyId } = req.params;

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ success: false, message: "User not found" });
    }

    if (user.bookmarks.includes(storyId)) {
      user.bookmarks = user.bookmarks.filter(id => id.toString() !== storyId);
    } else {
      user.bookmarks.push(storyId);
    }

    await user.save();

    res.json({
      success: true,
      bookmarks: user.bookmarks
    });

  } catch (err) {
    console.error("Bookmark error:", err);
    res.status(500).json({ success: false });
  }
});

// ⭐ Get user bookmarks
router.get("/bookmarks/:userId", async (req, res) => {
  try {
    const user = await User.findById(req.params.userId).populate("bookmarks");

    if (!user) {
      return res.status(404).json({ success: false, message: "User not found" });
    }

    res.json({
      success: true,
      bookmarks: user.bookmarks
    });

  } catch (err) {
    console.error("Get bookmarks error:", err);
    res.status(500).json({ success: false });
  }
});

module.exports = router;
