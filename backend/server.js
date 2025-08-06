const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const helmet = require("helmet");
const compression = require("compression");
const morgan = require("morgan");
const rateLimit = require("express-rate-limit");
require("dotenv").config();

// Import routes
const gameRoutes = require("./routes/game");
const leaderboardRoutes = require("./routes/leaderboard");
const achievementRoutes = require("./routes/achievements");
const playerRoutes = require("./routes/player");

const app = express();
const PORT = process.env.PORT || 3000;

// Security middleware
app.use(helmet());
app.use(compression());

// CORS configuration
app.use(
  cors({
    origin: process.env.CORS_ORIGIN || "http://localhost:8000",
    methods: ["GET", "POST", "PUT", "DELETE"],
    allowedHeaders: ["Content-Type", "Authorization", "X-Player-Address"],
  })
);

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: parseInt(process.env.API_RATE_LIMIT) || 100,
  message: { error: "Too many requests from this IP" },
});
app.use("/api/", limiter);

// Middleware
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true }));
app.use(morgan("combined"));

// MongoDB connection
mongoose
  .connect(process.env.MONGODB_URI)
  .then(() => console.log("✅ Connected to MongoDB"))
  .catch((err) => console.error("❌ MongoDB connection error:", err));

// Routes
app.use("/api/game", gameRoutes);
app.use("/api/leaderboard", leaderboardRoutes);
app.use("/api/achievements", achievementRoutes);
app.use("/api/player", playerRoutes);

// Health check
app.get("/health", (req, res) => {
  res.json({
    status: "OK",
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    version: "1.0.0",
  });
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

// Start server
app.listen(PORT, () => {
  console.log(`🚀 Somnia Space Defender Backend running on port ${PORT}`);
  console.log(`📊 Environment: ${process.env.NODE_ENV}`);
  console.log(`🔗 MongoDB: ${process.env.MONGODB_URI}`);
});
