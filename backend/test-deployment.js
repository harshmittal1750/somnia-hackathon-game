// Simple deployment test script
console.log("🚀 Starting deployment test...");
console.log("Node version:", process.version);
console.log("Environment:", process.env.NODE_ENV);

// Test environment variables
const requiredEnvVars = [
  "MONGODB_URI",
  "SOMNIA_RPC_URL",
  "CONTRACT_ADDRESS",
  "SSD_TOKEN_ADDRESS",
];

console.log("\n📋 Environment Variables Check:");
requiredEnvVars.forEach((varName) => {
  const value = process.env[varName];
  console.log(`${varName}: ${value ? "✅ Set" : "❌ Missing"}`);
  if (value && varName === "MONGODB_URI") {
    // Don't log the full URI for security, just show if it looks valid
    console.log(
      `  - Looks valid: ${value.startsWith("mongodb") ? "✅" : "❌"}`
    );
  }
});

// Test basic imports
console.log("\n📦 Testing imports...");
try {
  require("express");
  console.log("✅ Express imported");

  require("mongoose");
  console.log("✅ Mongoose imported");

  require("cors");
  console.log("✅ CORS imported");

  console.log("✅ All core dependencies imported successfully");
} catch (error) {
  console.error("❌ Import error:", error.message);
}

console.log("\n🏁 Deployment test completed");
