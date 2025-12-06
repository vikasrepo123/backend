require("dotenv").config();
const express = require("express");
const cors = require("cors");

// DB
const { connectToDatabase } = require("./lib/mongodb");

// Routes
const storyRoutes = require("./routes/storyRoutes");
const authRoutes = require("./routes/authRoutes");
const userRoutes = require("./routes/users");
const adminRoutes = require("./routes/adminRoutes");


// ---------------------
// CREATE EXPRESS APP
// ---------------------
const app = express();

console.log("🔥 Starting backend server…");
console.log("MAIL_USER:", process.env.MAIL_USER);
console.log("MAIL_PASS:", process.env.MAIL_PASS ? "[SET]" : "[NOT SET]");

// ---------------------
// MIDDLEWARES
// ---------------------
app.use(express.json());
app.use(cors());
app.use("/uploads", express.static("public/uploads"));
app.use("/admin", adminRoutes);
// ---------------------
// CONNECT MONGO
// ---------------------
connectToDatabase()
  .then(() => console.log("🔥 MongoDB Atlas connected"))
  .catch((err) => console.error("❌ MongoDB error:", err));

// ---------------------
// ROUTES
// ---------------------
console.log("🔧 Mounting routes…");

app.use("/auth", authRoutes);
console.log("✔ /auth routes loaded");

app.use("/stories", storyRoutes);
console.log("✔ /stories routes loaded");

app.use("/users", userRoutes);
console.log("✔ /users routes loaded");

// ---------------------
// HEALTH CHECK
// ---------------------
app.get("/", (req, res) => {
  res.send("Backend is running…");
});

// ---------------------
// START SERVER
// ---------------------
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`🚀 Backend running on port ${PORT}`);
});
