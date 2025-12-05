const mongoose = require("mongoose");

async function connectToDatabase() {
  try {
    const uri = process.env.MONGO_URI;

    if (!uri) {
      throw new Error("❌ MONGO_URI is missing from .env file");
    }

    // Prevent multiple connections in dev mode (important for Next.js)
    if (mongoose.connection.readyState === 1) {
      console.log("⚡ Using existing MongoDB connection");
      return mongoose.connection;
    }

    await mongoose.connect(uri, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });

    console.log("🔥 MongoDB Atlas connected");
    return mongoose.connection;

  } catch (err) {
    console.error("❌ MongoDB connection failed:", err.message);
    throw err;
  }
}

module.exports = { connectToDatabase };
