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

// MongoDB connection with better error handling for Vercel
let isDbConnected = false;
let lastConnectionError = null;

const connectDB = async () => {
  try {
    if (!process.env.MONGODB_URI) {
      const error = "MONGODB_URI environment variable is not set";
      lastConnectionError = error;
      throw new Error(error);
    }

    console.log("🔄 Attempting MongoDB connection...");
    console.log(
      "URI prefix:",
      process.env.MONGODB_URI.substring(0, 30) + "..."
    );

    await mongoose.connect(process.env.MONGODB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
      maxPoolSize: 10, // Maintain up to 10 socket connections
      serverSelectionTimeoutMS: 10000, // Increased timeout to 10 seconds
      socketTimeoutMS: 45000, // Close sockets after 45 seconds of inactivity
      bufferCommands: false, // Disable mongoose buffering
      bufferMaxEntries: 0, // Disable mongoose buffering
    });

    isDbConnected = true;
    lastConnectionError = null;
    console.log("✅ Connected to MongoDB successfully");
    console.log("Database name:", mongoose.connection.name);
    console.log("Host:", mongoose.connection.host);
  } catch (err) {
    console.error("❌ MongoDB connection error:", err);
    lastConnectionError = err.message;
    isDbConnected = false;
    // Don't throw the error - let the app start but handle DB errors gracefully
  }
};

// Connect to database
connectDB();

// Handle MongoDB connection events
mongoose.connection.on("connected", () => {
  isDbConnected = true;
  console.log("✅ Mongoose connected to MongoDB");
});

mongoose.connection.on("error", (err) => {
  isDbConnected = false;
  console.error("❌ Mongoose connection error:", err);
});

mongoose.connection.on("disconnected", () => {
  isDbConnected = false;
  console.log("⚠️ Mongoose disconnected from MongoDB");
});

// Middleware to check DB connection
app.use((req, res, next) => {
  if (!isDbConnected && req.path !== "/health") {
    return res.status(503).json({
      error: "Database temporarily unavailable",
      retry: true,
    });
  }
  next();
});

// Routes
app.use("/api/game", gameRoutes);
app.use("/api/leaderboard", leaderboardRoutes);
app.use("/api/achievements", achievementRoutes);
app.use("/api/player", playerRoutes);

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
