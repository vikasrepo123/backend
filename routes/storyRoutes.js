const multer = require("multer");
const path = require("path");
const express = require("express");
const Story = require("../models/Story");

const router = express.Router();
// Multer setup for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, "public/uploads");
  },
  filename: (req, file, cb) => {
    const uniqueName = Date.now() + "-" + file.originalname;
    cb(null, uniqueName);
  }
});

const upload = multer({ storage: storage });


// Create a new story
router.post("/", async (req, res) => {
  try {
    const {
      title,
      category,
      content,
      tags,
      anonymous,
      author
    } = req.body;

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
    console.error("Error creating story:", err);
    res.status(500).json({ success: false, error: "Server error" });
  }
});

// Get stories by category
router.get("/category/:category", async (req, res) => {
  try {
    const category = req.params.category;

    const stories = await Story.find({ category }).sort({ createdAt: -1 });

    res.json({
      success: true,
      category,
      total: stories.length,
      stories,
    });
  } catch (err) {
    console.error("Error fetching category stories:", err);
    res.status(500).json({ success: false, error: "Server error" });
  }
});

// Search stories by keyword (title or tags)
router.get("/search/:keyword", async (req, res) => {
  try {
    const keyword = req.params.keyword;

    const stories = await Story.find({
      $or: [
        { title: { $regex: keyword, $options: "i" } },
        { tags: { $regex: keyword, $options: "i" } },
        { content: { $regex: keyword, $options: "i" } }
      ]
    }).sort({ createdAt: -1 });

    res.json({
      success: true,
      keyword,
      total: stories.length,
      stories,
    });

  } catch (err) {
    console.error("Error searching stories:", err);
    res.status(500).json({ success: false, error: "Server error" });
  }
});

// Sort stories (latest, views, likes)
router.get("/sort", async (req, res) => {
  try {
    const type = req.query.type;

    let sortCondition = {};

    if (type === "latest") {
      sortCondition = { createdAt: -1 };
    } else if (type === "views") {
      sortCondition = { views: -1 };
    } else if (type === "likes") {
      sortCondition = { likes: -1 };
    } else {
      return res.json({
        success: false,
        message: "Invalid sort type. Use: latest, views, likes",
      });
    }

    const stories = await Story.find().sort(sortCondition);

    res.json({
      success: true,
      sortBy: type,
      total: stories.length,
      stories,
    });

  } catch (err) {
    console.error("Error sorting stories:", err);
    res.status(500).json({ success: false, error: "Server error" });
  }
});

// Like a story
router.post("/like/:id", async (req, res) => {
  try {
    const story = await Story.findById(req.params.id);

    if (!story) {
      return res.status(404).json({ success: false, message: "Story not found" });
    }

    story.likes += 1;
    await story.save();

    res.json({
      success: true,
      message: "Story liked!",
      likes: story.likes,
    });

  } catch (err) {
    console.error("Error liking story:", err);
    res.status(500).json({ success: false, error: "Server error" });
  }
});
// Dislike a story
router.post("/dislike/:id", async (req, res) => {
  try {
    const story = await Story.findById(req.params.id);

    if (!story) {
      return res.status(404).json({ success: false, message: "Story not found" });
    }

    story.dislikes += 1;
    await story.save();

    res.json({
      success: true,
      message: "Story disliked!",
      dislikes: story.dislikes,
    });

  } catch (err) {
    console.error("Error disliking story:", err);
    res.status(500).json({ success: false, error: "Server error" });
  }
});

// Add a comment to a story
router.post("/comment/:id", async (req, res) => {
  try {
    const { text, author, anonymous } = req.body;

    const story = await Story.findById(req.params.id);

    if (!story) {
      return res.status(404).json({
        success: false,
        message: "Story not found",
      });
    }

    const comment = {
      text,
      author: anonymous ? "Anonymous" : author,
    };

    story.comments.push(comment);
    await story.save();

    res.json({
      success: true,
      message: "Comment added!",
      comments: story.comments,
    });

  } catch (err) {
    console.error("Error posting comment:", err);
    res.status(500).json({
      success: false,
      error: "Server error",
    });
  }
});

// Get a single story + increase views
router.get("/:id", async (req, res) => {
  try {
    const story = await Story.findById(req.params.id);

    if (!story) {
      return res.status(404).json({
        success: false,
        message: "Story not found",
      });
    }

    // Increase view count
    story.views += 1;
    await story.save();

    res.json({
      success: true,
      story
    });

  } catch (err) {
    console.error("Error fetching story:", err);
    res.status(500).json({ success: false, error: "Server error" });
  }
});
// Upload proof files (Images or Videos)
router.post("/upload/:id", upload.array("files", 5), async (req, res) => {
  try {
    const story = await Story.findById(req.params.id);

    if (!story) {
      return res.status(404).json({ success: false, message: "Story not found" });
    }

    const filePaths = req.files.map(file => `/uploads/${file.filename}`);

    story.proofs.push(...filePaths);
    await story.save();

    res.json({
      success: true,
      message: "Files uploaded!",
      proofs: story.proofs
    });

  } catch (err) {
    console.error("Upload error:", err);
    res.status(500).json({ success: false, error: "Server error" });
  }
});

// Search stories
router.get("/search/:query", async (req, res) => {
  try {
    const q = req.params.query;
    const stories = await Story.find({
      title: { $regex: q, $options: "i" }
    }).sort({ createdAt: -1 });
    res.json({ success: true, stories });
  } catch (err) {
    res.status(500).json({ success: false, error: "Server error" });
  }
});

// Filter by category
router.get("/category/:cat", async (req, res) => {
  try {
    const cat = req.params.cat;
    const stories = await Story.find({ category: cat }).sort({ createdAt: -1 });
    res.json({ success: true, stories });
  } catch (err) {
    res.status(500).json({ success: false, error: "Server error" });
  }
});

// Sorting (Latest / Most Viewed / Most Liked)
router.get("/sort", async (req, res) => {
  try {
    const type = req.query.type;

    let sortOption = {};
    if (type === "latest") sortOption = { createdAt: -1 };
    if (type === "views") sortOption = { views: -1 };
    if (type === "likes") sortOption = { likes: -1 };

    const stories = await Story.find().sort(sortOption);

    res.json({ success: true, stories });

  } catch (err) {
    res.status(500).json({ success: false, error: "Server error" });
  }
});


module.exports = router;
// Get all stories
router.get("/", async (req, res) => {
  try {
    const stories = await Story.find().sort({ createdAt: -1 }); // latest first
    res.json({ success: true, stories });
  } catch (err) {
    console.error("Error fetching stories:", err);
    res.status(500).json({ success: false, error: "Server error" });
  }
});
