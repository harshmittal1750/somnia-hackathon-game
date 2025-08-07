// Step 2: Add MongoDB connection (no models or routes)
console.log("🚀 Starting step 2 server...");

const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const helmet = require("helmet");
const compression = require("compression");
const morgan = require("morgan");
const rateLimit = require("express-rate-limit");

console.log("✅ All dependencies loaded including Mongoose");

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

// MongoDB connection with better error handling for Vercel
let isDbConnected = false;

const connectDB = async () => {
  try {
    console.log("🔄 Attempting MongoDB connection...");

    if (!process.env.MONGODB_URI) {
      throw new Error("MONGODB_URI environment variable is not set");
    }

    await mongoose.connect(process.env.MONGODB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
      maxPoolSize: 10,
      serverSelectionTimeoutMS: 5000,
      socketTimeoutMS: 45000,
      bufferCommands: false,
      bufferMaxEntries: 0,
    });

    isDbConnected = true;
    console.log("✅ Connected to MongoDB successfully");
  } catch (err) {
    console.error("❌ MongoDB connection error:", err);
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

console.log("✅ MongoDB connection setup complete");

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

console.log("✅ DB connection middleware configured");

// Test endpoints
app.get("/", (req, res) => {
  res.json({ message: "Step 2 server working!", timestamp: Date.now() });
});

app.get("/test", (req, res) => {
  res.json({
    message: "Step 2 - MongoDB test working!",
    timestamp: Date.now(),
    nodeVersion: process.version,
    env: process.env.NODE_ENV || "development",
    database: {
      connected: isDbConnected,
      readyState: mongoose.connection.readyState,
      host: mongoose.connection.host || "unknown",
    },
    dependencies: {
      express: "✅",
      mongoose: "✅",
      cors: "✅",
      helmet: "✅",
      compression: "✅",
      morgan: "✅",
      rateLimit: "✅",
    },
  });
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
    host: mongoose.connection.host || "unknown",
    name: mongoose.connection.name || "unknown",
    allEnvVars: Object.keys(process.env).filter(
      (key) => key.includes("MONGODB") || key.includes("DATABASE")
    ),
    vercelRegion: process.env.VERCEL_REGION || "unknown",
  });
});

app.get("/health", (req, res) => {
  try {
    const healthData = {
      status: "OK",
      step: "2 - MongoDB connection",
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      version: "step2-1.0.0",
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

    console.log("Health check requested - Step 2:", healthData);
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

console.log("✅ Error handling configured");

// Export for Vercel
module.exports = app;

console.log("✅ Step 2 server ready - with MongoDB, no models/routes");
