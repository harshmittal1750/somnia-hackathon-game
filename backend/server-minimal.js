// Minimal server to test basic functionality
console.log("🚀 Starting minimal server...");

const express = require("express");
const app = express();

console.log("✅ Express loaded");

// Basic middleware
app.use(express.json());

console.log("✅ Middleware loaded");

// Simple test endpoints
app.get("/", (req, res) => {
  res.json({ message: "Minimal server working!", timestamp: Date.now() });
});

app.get("/test", (req, res) => {
  res.json({
    message: "Test endpoint working!",
    timestamp: Date.now(),
    nodeVersion: process.version,
    env: process.env.NODE_ENV || "development",
  });
});

app.get("/health", (req, res) => {
  res.json({
    status: "OK",
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    version: "minimal-1.0.0",
  });
});

console.log("✅ Routes defined");

// Error handling
app.use((err, req, res, next) => {
  console.error("Error:", err);
  res.status(500).json({ error: err.message });
});

console.log("✅ Error handling set up");

// Export for Vercel
module.exports = app;

console.log("✅ App exported for Vercel");
