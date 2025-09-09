// Step 1: Add basic dependencies (no database)
console.log("🚀 Starting step 1 server...");

const express = require("express");
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

console.log("✅ Security middleware loaded");

// CORS configuration
const allowedOrigins = [
  "http://localhost:8000",
  "http://localhost:3000",
  "https://www.spacedefender.xyz/",
  "https://somnia-space-defender.vercel.app/",
  "https://www.rise.spacedefender.xyz/",
  "https://www.somnia.spacedefender.xyz/",
  "https://rise.spacedefender.xyz/",
  "https://somnia.spacedefender.xyz/",
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

console.log("✅ CORS configured");

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: parseInt(process.env.API_RATE_LIMIT) || 100,
  message: { error: "Too many requests from this IP" },
});
app.use("/api/", limiter);

console.log("✅ Rate limiting configured");

// Middleware
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true }));
app.use(morgan("combined"));

console.log("✅ Basic middleware configured");

// Test endpoints
app.get("/", (req, res) => {
  res.json({ message: "Step 1 server working!", timestamp: Date.now() });
});

app.get("/test", (req, res) => {
  res.json({
    message: "Step 1 - Dependencies test working!",
    timestamp: Date.now(),
    nodeVersion: process.version,
    env: process.env.NODE_ENV || "development",
    dependencies: {
      express: "✅",
      cors: "✅",
      helmet: "✅",
      compression: "✅",
      morgan: "✅",
      rateLimit: "✅",
    },
  });
});

app.get("/health", (req, res) => {
  res.json({
    status: "OK",
    step: "1 - Dependencies only",
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    version: "step1-1.0.0",
    environment: process.env.NODE_ENV || "development",
    memory: process.memoryUsage(),
    envVars: {
      MONGODB_URI: !!process.env.MONGODB_URI,
      SOMNIA_RPC_URL: !!process.env.SOMNIA_RPC_URL,
      CONTRACT_ADDRESS: !!process.env.CONTRACT_ADDRESS,
      SD_TOKEN_ADDRESS: !!process.env.SD_TOKEN_ADDRESS,
    },
  });
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

console.log("✅ Step 1 server ready - no database, no routes");
