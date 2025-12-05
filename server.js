require("dotenv").config();
const express = require("express");
const cors = require("cors");

// ✅ Import DB connection function
const { connectToDatabase } = require("./lib/mongodb");

// ✅ Import Routes
const storyRoutes = require("./routes/storyRoutes");
const authRoutes = require("./routes/authRoutes");

const app = express();

// ---------------------
// 🔥 MIDDLEWARES
// ---------------------
app.use(express.json());

// Serve uploaded files
app.use("/uploads", express.static("public/uploads"));

app.use(cors());

// ---------------------
// 🔥 CONNECT TO MONGODB AT STARTUP
// ---------------------
connectToDatabase()
  .then(() => console.log("✅ MongoDB connected successfully"))
  .catch((err) => console.error("❌ MongoDB connection error:", err));

// ---------------------
// 🔥 ROUTES
// ---------------------
app.use("/auth", authRoutes);
app.use("/stories", storyRoutes);

// Health Check
app.get("/", (req, res) => {
  res.send("Backend is running…");
});

// ---------------------
// 🔥 START SERVER
// ---------------------
const PORT = process.env.PORT || 5000;
app.listen(PORT, () =>
  console.log(`🚀 Backend running on http://127.0.0.1:${PORT}`)
);
