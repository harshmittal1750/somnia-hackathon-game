// Vercel serverless function handler
const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const helmet = require("helmet");
const compression = require("compression");
const morgan = require("morgan");
const rateLimit = require("express-rate-limit");
require("dotenv").config();

// Import routes
const gameRoutes = require("../routes/game");
const leaderboardRoutes = require("../routes/leaderboard");
const achievementRoutes = require("../routes/achievements");
const playerRoutes = require("../routes/player");

const app = express();

// Security middleware
app.use(helmet());
app.use(compression());

// CORS configuration for production
app.use(
  cors({
    origin: [
      "http://localhost:8000",
      "http://localhost:3000",
      "https://somnia-space-defender.vercel.app/",
      "https://www.spacedefender.xyz/",
      process.env.CORS_ORIGIN,
    ].filter(Boolean),
    methods: ["GET", "POST", "PUT", "DELETE"],
    allowedHeaders: ["Content-Type", "Authorization", "X-Player-Address"],
    credentials: true,
  })
);

// Rate limiting (more lenient for serverless)
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: parseInt(process.env.API_RATE_LIMIT) || 200,
  message: { error: "Too many requests from this IP" },
  standardHeaders: true,
  legacyHeaders: false,
});
app.use("/api/", limiter);

// Middleware
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true }));
app.use(morgan("combined"));

// MongoDB connection with connection reuse for serverless
let isConnected = false;

async function connectToDatabase() {
  if (isConnected) {
    return;
  }

  try {
    await mongoose.connect(process.env.MONGODB_URI, {
      bufferCommands: false,
      useNewUrlParser: true,
      useUnifiedTopology: true,
      serverSelectionTimeoutMS: 5000,
      socketTimeoutMS: 45000,
    });
    isConnected = true;
    console.log("✅ Connected to MongoDB (Serverless)");
  } catch (error) {
    console.error("❌ MongoDB connection error:", error);
    throw error;
  }
}

// Database middleware
app.use(async (req, res, next) => {
  await connectToDatabase();
  next();
});

// Routes
app.use("/api/game", gameRoutes);
app.use("/api/leaderboard", leaderboardRoutes);
app.use("/api/achievements", achievementRoutes);
app.use("/api/player", playerRoutes);

// Health check
app.get("/health", async (req, res) => {
  try {
    await connectToDatabase();
    res.json({
      status: "OK",
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      version: "1.0.0",
      environment: "vercel-serverless",
    });
  } catch (error) {
    res.status(503).json({
      status: "ERROR",
      error: "Database connection failed",
      timestamp: new Date().toISOString(),
    });
  }
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error("Error:", err);
  res.status(err.status || 500).json({
    error:
      process.env.NODE_ENV === "production"
        ? "Internal server error"
        : err.message,
  });
});

// 404 handler
app.use("*", (req, res) => {
  res.status(404).json({ error: "Route not found" });
});

// Export for Vercel
module.exports = app;
