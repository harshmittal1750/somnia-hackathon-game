// Step 4: Add Routes one by one to find the problematic one
console.log("🚀 Starting step 4 server...");

const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const helmet = require("helmet");
const compression = require("compression");
const morgan = require("morgan");
const rateLimit = require("express-rate-limit");

console.log("✅ All dependencies loaded");

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
      if (!origin) return callback(null, true);
      
      if (allowedOrigins.includes(origin)) {
        return callback(null, true);
      }
      
      if (origin.includes(".vercel.app")) {
        return callback(null, true);
      }
      
      const msg = "The CORS policy for this site does not allow access from the specified Origin.";
      return callback(new Error(msg), false);
    },
    methods: ["GET", "POST", "PUT", "DELETE"],
    allowedHeaders: ["Content-Type", "Authorization", "X-Player-Address"],
    credentials: true,
  })
);

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: parseInt(process.env.API_RATE_LIMIT) || 100,
  message: { error: "Too many requests from this IP" },
});
app.use("/api/", limiter);

// Middleware
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true }));
app.use(morgan("combined"));

console.log("✅ Basic middleware configured");

// MongoDB connection
let isDbConnected = false;
let lastConnectionError = null;

const connectDB = async () => {
  try {
    console.log("🔄 Attempting MongoDB connection...");
    
    if (!process.env.MONGODB_URI) {
      const error = "MONGODB_URI environment variable is not set";
      lastConnectionError = error;
      throw new Error(error);
    }

    console.log("URI prefix:", process.env.MONGODB_URI.substring(0, 30) + "...");

    // Remove database name from URI for initial connection 
    const baseUri = process.env.MONGODB_URI.replace(/\/[^/?]*\?/, "/?");

    await mongoose.connect(baseUri, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
      maxPoolSize: 10,
      serverSelectionTimeoutMS: 10000,
      socketTimeoutMS: 45000,
      bufferCommands: false,
      bufferMaxEntries: 0,
    });
    
    isDbConnected = true;
    lastConnectionError = null;
    console.log("✅ Connected to MongoDB successfully");
  } catch (err) {
    console.error("❌ MongoDB connection error:", err);
    lastConnectionError = err.message;
    isDbConnected = false;
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

console.log("✅ MongoDB connection setup complete");

// Import models
console.log("🔄 Testing model imports...");
try {
  const Player = require("./models/Player");
  const GameScore = require("./models/GameScore");
  const Achievement = require("./models/Achievement");
  console.log("✅ All models imported successfully");
} catch (error) {
  console.error("❌ Model import failed:", error.message);
}

// Test route imports one by one
const routeTests = {};

console.log("🔄 Testing route imports one by one...");

// Test 1: Player routes
try {
  const playerRoutes = require("./routes/player");
  routeTests.player = "✅ Success";
  console.log("✅ Player routes imported");
} catch (error) {
  routeTests.player = `❌ Error: ${error.message}`;
  console.error("❌ Player routes failed:", error.message);
}

// Test 2: Game routes
try {
  const gameRoutes = require("./routes/game");
  routeTests.game = "✅ Success";
  console.log("✅ Game routes imported");
} catch (error) {
  routeTests.game = `❌ Error: ${error.message}`;
  console.error("❌ Game routes failed:", error.message);
}

// Test 3: Leaderboard routes
try {
  const leaderboardRoutes = require("./routes/leaderboard");
  routeTests.leaderboard = "✅ Success";
  console.log("✅ Leaderboard routes imported");
} catch (error) {
  routeTests.leaderboard = `❌ Error: ${error.message}`;
  console.error("❌ Leaderboard routes failed:", error.message);
}

// Test 4: Achievement routes
try {
  const achievementRoutes = require("./routes/achievements");
  routeTests.achievements = "✅ Success";
  console.log("✅ Achievement routes imported");
} catch (error) {
  routeTests.achievements = `❌ Error: ${error.message}`;
  console.error("❌ Achievement routes failed:", error.message);
}

// Middleware to check DB connection
app.use((req, res, next) => {
  const allowedPaths = ["/health", "/test", "/debug-routes"];
  
  if (!isDbConnected && !allowedPaths.includes(req.path)) {
    return res.status(503).json({
      error: "Database temporarily unavailable",
      retry: true,
    });
  }
  next();
});

console.log("✅ DB connection middleware configured");

// Test endpoints
app.get("/", (req, res) => {
  res.json({ message: "Step 4 server working!", timestamp: Date.now() });
});

app.get("/test", (req, res) => {
  res.json({
    message: "Step 4 - Route import test!",
    timestamp: Date.now(),
    nodeVersion: process.version,
    env: process.env.NODE_ENV || "development",
    database: {
      connected: isDbConnected,
      readyState: mongoose.connection.readyState,
      host: mongoose.connection.host || "unknown",
    },
    routeTests: routeTests
  });
});

// Debug route imports
app.get("/debug-routes", (req, res) => {
  res.json({
    message: "Route import test results",
    timestamp: Date.now(),
    routeTests: routeTests,
    summary: {
      total: Object.keys(routeTests).length,
      successful: Object.values(routeTests).filter(result => result.includes("✅")).length,
      failed: Object.values(routeTests).filter(result => result.includes("❌")).length
    }
  });
});

app.get("/health", (req, res) => {
  try {
    const healthData = {
      status: "OK",
      step: "4 - Route Import Tests",
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      version: "step4-1.0.0",
      database: {
        connected: isDbConnected,
        readyState: mongoose.connection.readyState,
        host: mongoose.connection.host || "unknown",
      },
      routeTests: routeTests,
      environment: process.env.NODE_ENV || "development"
    };
    
    console.log("Health check requested - Step 4:", healthData);
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

console.log("✅ Routes defined");

// Error handling middleware
app.use((err, req, res, next) => {
  console.error("Error:", err);
  res.status(err.status || 500).json({
    error: process.env.NODE_ENV === "production" ? "Internal server error" : err.message,
  });
});

// 404 handler
app.use("*", (req, res) => {
  res.status(404).json({ error: "Route not found" });
});

console.log("✅ Error handling configured");

// Export for Vercel
module.exports = app;

console.log("✅ Step 4 server ready - Testing individual route imports");