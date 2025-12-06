// routes/storyRoutes.js
const multer = require("multer");
const path = require("path");
const express = require("express");
const Story = require("../models/Story");
const User = require("../models/User");
const mongoose = require("mongoose");

const router = express.Router();
router.use((req, res, next) => {
  console.log(`[STORIES ROUTE] ${new Date().toISOString()} ${req.method} ${req.originalUrl} body:${JSON.stringify(req.body)} query:${JSON.stringify(req.query)}`);
  next();
});

// Multer setup
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, "public/uploads"),
  filename: (req, file, cb) => cb(null, Date.now() + "-" + file.originalname)
});
const upload = multer({ storage });

// ---------------------------
// Utility: requireAuth (simple token guard optional)
// You can replace this with your JWT middleware if you have it.
// For now it checks req.body.userId or req.headers['x-user-id']
// ---------------------------
function requireUserId(req) {
  // prefer body.userId -> headers -> query
  return req.body?.userId || req.headers["x-user-id"] || req.query?.userId || null;
}

async function getUserFromReq(req) {
  const uid = requireUserId(req);
  if (!uid) return null;
  try {
    if (!mongoose.Types.ObjectId.isValid(uid)) return null;
    return await User.findById(uid);
  } catch (e) {
    return null;
  }
}

// ➤ CREATE STORY
router.post("/", async (req, res) => {
  try {
    const { title, category, content, tags, anonymous, author } = req.body;

    const newStory = new Story({
      title,
      category,
      content,
      tags,
      anonymous,
      author: anonymous ? "Anonymous" : author
    });

    await newStory.save();

    res.status(201).json({
      success: true,
      message: "Story submitted successfully!",
      story: newStory,
    });
  } catch (err) {
    console.error("Create story error:", err);
    res.status(500).json({ success: false, error: "Server error" });
  }
});

// ➤ CATEGORY
router.get("/category/:category", async (req, res) => {
  try {
    const stories = await Story.find({ category: req.params.category, hidden: { $ne: true } })
      .sort({ createdAt: -1 });

    res.json({
      success: true,
      category: req.params.category,
      total: stories.length,
      stories,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false });
  }
});

// ➤ SEARCH
router.get("/search/:keyword", async (req, res) => {
  try {
    const keyword = req.params.keyword;

    const stories = await Story.find({
      hidden: { $ne: true },
      $or: [
        { title: { $regex: keyword, $options: "i" } },
        { tags: { $regex: keyword, $options: "i" } },
        { content: { $regex: keyword, $options: "i" } }
      ]
    }).sort({ createdAt: -1 });

    res.json({ success: true, keyword, total: stories.length, stories });

  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false });
  }
});

// ➤ SORT
router.get("/sort", async (req, res) => {
  try {
    let sortCondition = {};

    if (req.query.type === "latest") sortCondition = { createdAt: -1 };
    else if (req.query.type === "views") sortCondition = { views: -1 };
    else if (req.query.type === "likes") sortCondition = { likes: -1 };

    const stories = await Story.find({ hidden: { $ne: true } }).sort(sortCondition);

    res.json({ success: true, stories });

  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false });
  }
});

// ➤ INFINITE SCROLL / LIST (supports ?limit=20&skip=0&category=Horror)
router.get("/list", async (req, res) => {
  try {
    const limit = Math.min(parseInt(req.query.limit || "20", 10), 100);
    const skip = Math.max(parseInt(req.query.skip || "0", 10), 0);
    const filter = { hidden: { $ne: true } };
    if (req.query.category) filter.category = req.query.category;

    const stories = await Story.find(filter)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    const total = await Story.countDocuments(filter);

    res.json({ success: true, total, stories });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false });
  }
});

// ➤ TRENDING (simple weighted score: views + likes*5)
router.get("/trending", async (req, res) => {
  try {
    const limit = Math.min(parseInt(req.query.limit || "10", 10), 50);
    // fetch top by a simple projection and sort in-memory (for small data OK)
    const stories = await Story.find({ hidden: { $ne: true } }).sort({ createdAt: -1 }).limit(200);
    const scored = stories.map(s => ({
      story: s,
      score: (s.views || 0) + (s.likes || 0) * 5
    }));
    scored.sort((a,b) => b.score - a.score);
    res.json({ success: true, stories: scored.slice(0, limit).map(x => x.story) });
  } catch (err) {
    console.error("Trending error:", err);
    res.status(500).json({ success: false });
  }
});

// ➤ LIKE (toggle) — expects { userId }
router.post("/like/:id", async (req, res) => {
  try {
    const { userId } = req.body;
    if (!userId) return res.status(400).json({ success: false, message: "Missing userId" });

    const story = await Story.findById(req.params.id);
    if (!story) return res.status(404).json({ success: false });

    if (!Array.isArray(story.likedBy)) story.likedBy = [];
    if (!Array.isArray(story.dislikedBy)) story.dislikedBy = [];

    if (story.likedBy.includes(userId)) {
      // unlike
      story.likedBy = story.likedBy.filter(id => id !== userId);
    } else {
      // like
      story.likedBy.push(userId);
      // ensure disliked removed
      story.dislikedBy = story.dislikedBy.filter(id => id !== userId);
    }

    story.likes = story.likedBy.length;
    story.dislikes = story.dislikedBy.length;

    await story.save();

    res.json({
      success: true,
      likes: story.likes,
      dislikes: story.dislikes,
      likedBy: story.likedBy,
      dislikedBy: story.dislikedBy
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false });
  }
});

// ➤ DISLIKE (toggle) — expects { userId }
router.post("/dislike/:id", async (req, res) => {
  try {
    const { userId } = req.body;
    if (!userId) return res.status(400).json({ success: false, message: "Missing userId" });

    const story = await Story.findById(req.params.id);
    if (!story) return res.status(404).json({ success: false });

    if (!Array.isArray(story.likedBy)) story.likedBy = [];
    if (!Array.isArray(story.dislikedBy)) story.dislikedBy = [];

    if (story.dislikedBy.includes(userId)) {
      // remove dislike
      story.dislikedBy = story.dislikedBy.filter(id => id !== userId);
    } else {
      // add dislike
      story.dislikedBy.push(userId);
      // remove like if exists
      story.likedBy = story.likedBy.filter(id => id !== userId);
    }

    story.likes = story.likedBy.length;
    story.dislikes = story.dislikedBy.length;

    await story.save();

    res.json({
      success: true,
      likes: story.likes,
      dislikes: story.dislikes,
      likedBy: story.likedBy,
      dislikedBy: story.dislikedBy
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false });
  }
});

// ➤ COMMENT
router.post("/comment/:id", async (req, res) => {
  try {
    const { text, author, anonymous } = req.body;
    if (!text) return res.status(400).json({ success: false, message: "Missing text" });

    const story = await Story.findById(req.params.id);
    if (!story) return res.status(404).json({ success: false });

    story.comments.push({ text, author: anonymous ? "Anonymous" : author });
    await story.save();

    res.json({ success: true, comments: story.comments });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false });
  }
});

// ➤ UPLOAD PROOFS
router.post("/upload/:id", upload.array("files", 5), async (req, res) => {
  try {
    const story = await Story.findById(req.params.id);
    if (!story) return res.status(404).json({ success: false });

    const filePaths = req.files.map(f => `/uploads/${f.filename}`);
    story.proofs.push(...filePaths);

    await story.save();

    res.json({ success: true, proofs: story.proofs });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false });
  }
});

// ➤ BOOKMARK / UNBOOKMARK story (User bookmarks stored in User model) — expects { userId }
router.post("/bookmark/:id", async (req, res) => {
  try {
    const { userId } = req.body;
    if (!userId) return res.status(400).json({ success: false, message: "Missing userId" });

    const user = await User.findById(userId);
    const storyId = req.params.id;
    if (!user) return res.status(404).json({ success: false, message: "User not found" });

    // toggle
    const exists = user.bookmarks?.some(b => String(b) === String(storyId));
    if (exists) {
      user.bookmarks = user.bookmarks.filter(b => String(b) !== String(storyId));
    } else {
      user.bookmarks.push(storyId);
    }

    await user.save();

    res.json({ success: true, bookmarks: user.bookmarks, bookmarked: !exists });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false });
  }
});

// ➤ GET user's bookmarks
router.get("/bookmarks/:userId", async (req, res) => {
  try {
    const user = await User.findById(req.params.userId).populate("bookmarks");
    if (!user) return res.status(404).json({ success: false, message: "User not found" });
    res.json({ success: true, bookmarks: user.bookmarks });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false });
  }
});

// ➤ REPORT a story (expects { userId, reason, details? })
router.post("/report/:id", async (req, res) => {
  try {
    const { userId, reason, details } = req.body;
    if (!reason) return res.status(400).json({ success: false, message: "Missing reason" });

    const story = await Story.findById(req.params.id);
    if (!story) return res.status(404).json({ success: false });

    story.reports.push({ userId, reason, details: details || "" });
    await story.save();

    res.json({ success: true, message: "Report submitted", reportsCount: story.reports.length });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false });
  }
});

// ➤ Admin: get all reports (for moderators) — simple endpoint
router.get("/admin/reports", async (req, res) => {
  try {
    // optionally add admin check
    const stories = await Story.find({ "reports.0": { $exists: true } }).select("title reports createdAt author");
    res.json({ success: true, stories });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false });
  }
});

// ➤ Admin: hide/unhide story (expects { hide: true/false })
router.patch("/admin/story/:id", async (req, res) => {
  try {
    const { hide } = req.body;
    const story = await Story.findById(req.params.id);
    if (!story) return res.status(404).json({ success: false });

    story.hidden = !!hide;
    await story.save();
    res.json({ success: true, story });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false });
  }
});

// ➤ Admin: delete story
router.delete("/admin/story/:id", async (req, res) => {
  try {
    await Story.findByIdAndDelete(req.params.id);
    res.json({ success: true, message: "Deleted" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false });
  }
});

// ➤ SEARCH (duplicate kept)
router.get("/search/:query", async (req, res) => {
  try {
    const stories = await Story.find({
      title: { $regex: req.params.query, $options: "i" }
    });

    res.json({ success: true, stories });

  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false });
  }
});

// ➤ CATEGORY (duplicate kept)
router.get("/category/:cat", async (req, res) => {
  try {
    const stories = await Story.find({ category: req.params.cat })
      .sort({ createdAt: -1 });

    res.json({ success: true, stories });

  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false });
  }
});

// ➤ SORT (duplicate kept)
router.get("/sort", async (req, res) => {
  try {
    let sortOption = {};
    if (req.query.type === "latest") sortOption = { createdAt: -1 };
    if (req.query.type === "views") sortOption = { views: -1 };
    if (req.query.type === "likes") sortOption = { likes: -1 };

    const stories = await Story.find().sort(sortOption);

    res.json({ success: true, stories });

  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false });
  }
});

// ➤ GET ALL STORIES
router.get("/", async (req, res) => {
  try {
    const stories = await Story.find().sort({ createdAt: -1 });
    res.json({ success: true, stories });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false });
  }
});

// ➤ GET STORY (final route) — optional ?noview=true
router.get("/:id", async (req, res) => {
  try {
    const story = await Story.findById(req.params.id);
    if (!story) return res.status(404).json({ success: false });

    if (!req.query.noview) {
      story.views = (story.views || 0) + 1;
      await story.save();
    }

    res.json({ success: true, story });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false });
  }
});

module.exports = router;
