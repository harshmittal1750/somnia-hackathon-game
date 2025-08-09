console.log("🚀 Starting Somnia Space Defender Backend...");
console.log("Node.js version:", process.version);
console.log("Environment:", process.env.NODE_ENV || "development");

const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const helmet = require("helmet");
const compression = require("compression");
const morgan = require("morgan");
const rateLimit = require("express-rate-limit");
require("dotenv").config();

console.log("✅ Dependencies loaded successfully");

// Import routes
const gameRoutes = require("./routes/game");
const leaderboardRoutes = require("./routes/leaderboard");
const achievementRoutes = require("./routes/achievements");
const playerRoutes = require("./routes/player");
const twitterRoutes = require("./routes/twitter");

const app = express();
const PORT = process.env.PORT || 3000;

// Security middleware
app.use(helmet());
app.use(compression());

// CORS configuration
const allowedOrigins = [
  "http://localhost:8000",
  "http://localhost:3000",
  "https://www.spacedefender.xyz/",
  "https://somnia-space-defender.vercel.app/",
  process.env.CORS_ORIGIN,
  process.env.FRONTEND_URL,
].filter(Boolean);

app.use(
  cors({
    origin: (origin, callback) => {
      // Allow requests with no origin (mobile apps, postman, etc.)
      if (!origin) return callback(null, true);

      if (allowedOrigins.includes(origin)) {
        return callback(null, true);
      }

      // Allow any vercel.app domain for development
      if (origin.includes(".vercel.app")) {
        return callback(null, true);
      }

      const msg =
        "The CORS policy for this site does not allow access from the specified Origin.";
      return callback(new Error(msg), false);
    },
    methods: ["GET", "POST", "PUT", "DELETE"],
    allowedHeaders: ["Content-Type", "Authorization", "X-Player-Address"],
    credentials: true,
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

// Import serverless database connection
const connectToDatabase = require("./lib/db");

// Database connection status for legacy compatibility
let isDbConnected = false;
let lastConnectionError = null;

// Test database connection on startup (for health checks)
const testConnection = async () => {
  try {
    await connectToDatabase();
    isDbConnected = true;
    lastConnectionError = null;
    console.log("✅ Database connection test successful");
  } catch (err) {
    console.error("❌ Database connection test failed:", err.message);
    isDbConnected = false;
    lastConnectionError = err.message;
  }
};

// Test connection on startup (non-blocking)
testConnection();

// Note: Removed global DB connection middleware for serverless compatibility
// Each route will handle its own connection using connectToDatabase()

// Routes
app.use("/api/game", gameRoutes);
app.use("/api/leaderboard", leaderboardRoutes);
app.use("/api/achievements", achievementRoutes);
app.use("/api/player", playerRoutes);
app.use("/api/twitter", twitterRoutes);

// Simple test endpoint to check if function starts
app.get("/test", (req, res) => {
  res.json({ message: "Function is working!", timestamp: Date.now() });
});

// Debug endpoint to check MongoDB connection details
app.get("/debug-db", (req, res) => {
  res.json({
    message: "Debug MongoDB connection",
    timestamp: Date.now(),
    mongodbUri: process.env.MONGODB_URI
      ? `${process.env.MONGODB_URI.substring(0, 30)}...`
      : "NOT SET",
    mongodbUriExists: !!process.env.MONGODB_URI,
    connectionState: mongoose.connection.readyState,
    connectionStates: {
      0: "disconnected",
      1: "connected",
      2: "connecting",
      3: "disconnecting",
    },
    isDbConnected: isDbConnected,
    lastConnectionError: lastConnectionError,
    host: mongoose.connection.host || "unknown",
    name: mongoose.connection.name || "unknown",
    allEnvVars: Object.keys(process.env).filter(
      (key) => key.includes("MONGODB") || key.includes("DATABASE")
    ),
    vercelRegion: process.env.VERCEL_REGION || "unknown",
  });
});

// Health check
app.get("/health", (req, res) => {
  try {
    const healthData = {
      status: "OK",
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      version: "1.0.0",
      database: {
        connected: isDbConnected,
        readyState: mongoose.connection.readyState,
        host: mongoose.connection.host || "unknown",
      },
      environment: process.env.NODE_ENV || "development",
      memory: process.memoryUsage(),
      envVars: {
        MONGODB_URI: !!process.env.MONGODB_URI,
        SOMNIA_RPC_URL: !!process.env.SOMNIA_RPC_URL,
        CONTRACT_ADDRESS: !!process.env.CONTRACT_ADDRESS,
        SSD_TOKEN_ADDRESS: !!process.env.SSD_TOKEN_ADDRESS,
      },
    };

    console.log("Health check requested:", healthData);
    res.json(healthData);
  } catch (error) {
    console.error("Health check error:", error);
    res.status(500).json({
      error: "Health check failed",
      message: error.message,
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

// Start server (only in development)
if (process.env.NODE_ENV !== "production") {
  app.listen(PORT, () => {
    console.log(`🚀 Somnia Space Defender Backend running on port ${PORT}`);
    console.log(`📊 Environment: ${process.env.NODE_ENV}`);
    console.log(
      `🔗 MongoDB: ${process.env.MONGODB_URI ? "Connected" : "Not configured"}`
    );
  });
} else {
  console.log("✅ Production mode - Serverless function ready");
}

// Export for Vercel serverless functions
module.exports = app;
