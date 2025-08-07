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
let lastConnectionError = null;

const connectDB = async () => {
  try {
    console.log("🔄 Attempting MongoDB connection...");

    if (!process.env.MONGODB_URI) {
      const error = "MONGODB_URI environment variable is not set";
      lastConnectionError = error;
      throw new Error(error);
    }

    console.log(
      "URI prefix:",
      process.env.MONGODB_URI.substring(0, 30) + "..."
    );

    await mongoose.connect(process.env.MONGODB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
      maxPoolSize: 10,
      serverSelectionTimeoutMS: 10000, // Increased timeout
      socketTimeoutMS: 45000,
      bufferCommands: false,
      bufferMaxEntries: 0,
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

console.log("✅ MongoDB connection setup complete");

// Middleware to check DB connection
app.use((req, res, next) => {
  // Allow test endpoints to bypass DB check
  const allowedPaths = [
    "/health",
    "/test",
    "/debug-db",
    "/test-mongo",
    "/test-native-mongo",
    "/test-encoding",
    "/test-stable-api",
    "/test-databases",
    "/test-comprehensive",
  ];

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
    lastConnectionError: lastConnectionError,
    host: mongoose.connection.host || "unknown",
    name: mongoose.connection.name || "unknown",
    allEnvVars: Object.keys(process.env).filter(
      (key) => key.includes("MONGODB") || key.includes("DATABASE")
    ),
    vercelRegion: process.env.VERCEL_REGION || "unknown",
  });
});

// Test MongoDB connection manually with Mongoose
app.get("/test-mongo", async (req, res) => {
  try {
    console.log("Manual MongoDB connection test with Mongoose...");

    if (!process.env.MONGODB_URI) {
      return res.status(500).json({ error: "MONGODB_URI not set" });
    }

    // Test connection
    const testConnection = await mongoose.createConnection(
      process.env.MONGODB_URI,
      {
        useNewUrlParser: true,
        useUnifiedTopology: true,
        serverSelectionTimeoutMS: 5000,
      }
    );

    await testConnection.close();

    res.json({
      success: true,
      message: "MongoDB connection test successful with Mongoose!",
      timestamp: Date.now(),
    });
  } catch (error) {
    console.error("Mongoose connection test failed:", error);
    res.status(500).json({
      success: false,
      error: error.message,
      code: error.code,
      timestamp: Date.now(),
    });
  }
});

// Test with native MongoDB driver (like Atlas docs)
app.get("/test-native-mongo", async (req, res) => {
  try {
    console.log("Testing with native MongoDB driver...");

    if (!process.env.MONGODB_URI) {
      return res.status(500).json({ error: "MONGODB_URI not set" });
    }

    const { MongoClient } = require("mongodb");

    const client = new MongoClient(process.env.MONGODB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
      serverSelectionTimeoutMS: 5000,
    });

    await client.connect();

    // Test ping like in Atlas docs
    await client.db("admin").command({ ping: 1 });

    await client.close();

    res.json({
      success: true,
      message: "Native MongoDB driver connection successful!",
      timestamp: Date.now(),
    });
  } catch (error) {
    console.error("Native MongoDB driver test failed:", error);
    res.status(500).json({
      success: false,
      error: error.message,
      code: error.code,
      timestamp: Date.now(),
    });
  }
});

// Test URL encoding of MongoDB URI
app.get("/test-encoding", async (req, res) => {
  try {
    if (!process.env.MONGODB_URI) {
      return res.status(500).json({ error: "MONGODB_URI not set" });
    }

    const originalUri = process.env.MONGODB_URI;

    // Parse the URI to check for encoding issues
    const uriParts = originalUri.match(/mongodb\+srv:\/\/([^:]+):([^@]+)@(.+)/);

    if (!uriParts) {
      return res.status(500).json({ error: "Invalid URI format" });
    }

    const [, username, password, rest] = uriParts;

    // Create properly encoded URI
    const encodedUsername = encodeURIComponent(username);
    const encodedPassword = encodeURIComponent(password);
    const encodedUri = `mongodb+srv://${encodedUsername}:${encodedPassword}@${rest}`;

    // Test with original URI
    let originalResult = "success";
    try {
      const { MongoClient } = require("mongodb");
      const client1 = new MongoClient(originalUri, {
        useNewUrlParser: true,
        useUnifiedTopology: true,
        serverSelectionTimeoutMS: 5000,
      });
      await client1.connect();
      await client1.db("admin").command({ ping: 1 });
      await client1.close();
    } catch (err) {
      originalResult = err.message;
    }

    // Test with encoded URI
    let encodedResult = "success";
    try {
      const { MongoClient } = require("mongodb");
      const client2 = new MongoClient(encodedUri, {
        useNewUrlParser: true,
        useUnifiedTopology: true,
        serverSelectionTimeoutMS: 5000,
      });
      await client2.connect();
      await client2.db("admin").command({ ping: 1 });
      await client2.close();
    } catch (err) {
      encodedResult = err.message;
    }

    res.json({
      originalUri: originalUri.substring(0, 50) + "...",
      encodedUri: encodedUri.substring(0, 50) + "...",
      username: username,
      encodedUsername: encodedUsername,
      password: password.substring(0, 5) + "***",
      encodedPassword: encodedPassword.substring(0, 5) + "***",
      originalResult: originalResult,
      encodedResult: encodedResult,
      recommendation:
        originalResult === "success"
          ? "Use original URI"
          : encodedResult === "success"
          ? "Use encoded URI"
          : "Both failed",
      timestamp: Date.now(),
    });
  } catch (error) {
    res.status(500).json({
      error: error.message,
      timestamp: Date.now(),
    });
  }
});

// Test Mongoose with Stable API (like docs)
app.get("/test-stable-api", async (req, res) => {
  try {
    if (!process.env.MONGODB_URI) {
      return res.status(500).json({ error: "MONGODB_URI not set" });
    }

    console.log("Testing Mongoose with Stable API...");

    // Remove database name from URI (connect to default/admin)
    const uriWithoutDb = process.env.MONGODB_URI.replace(/\/[^/?]+\?/, "/?");

    const clientOptions = {
      serverApi: {
        version: "1",
        strict: true,
        deprecationErrors: true,
      },
      useNewUrlParser: true,
      useUnifiedTopology: true,
      serverSelectionTimeoutMS: 10000,
    };

    const connection = await mongoose.createConnection(
      uriWithoutDb,
      clientOptions
    );

    // Test ping like in docs
    await connection.db.admin().command({ ping: 1 });

    await connection.close();

    res.json({
      success: true,
      message: "Mongoose Stable API connection successful!",
      uriUsed: uriWithoutDb.substring(0, 50) + "...",
      timestamp: Date.now(),
    });
  } catch (error) {
    console.error("Stable API test failed:", error);
    res.status(500).json({
      success: false,
      error: error.message,
      code: error.code,
      timestamp: Date.now(),
    });
  }
});

// Test different database configurations
app.get("/test-databases", async (req, res) => {
  try {
    if (!process.env.MONGODB_URI) {
      return res.status(500).json({ error: "MONGODB_URI not set" });
    }

    const { MongoClient } = require("mongodb");
    const results = {};

    // Test 1: Connect without specifying database
    const baseUri = process.env.MONGODB_URI.replace(/\/[^/?]+\?/, "/?");

    try {
      const client1 = new MongoClient(baseUri, {
        useNewUrlParser: true,
        useUnifiedTopology: true,
        serverSelectionTimeoutMS: 5000,
      });
      await client1.connect();
      await client1.db("admin").command({ ping: 1 });
      await client1.close();
      results.adminAccess = "success";
    } catch (err) {
      results.adminAccess = err.message;
    }

    // Test 2: Connect to specific database
    const dbUri = process.env.MONGODB_URI;
    try {
      const client2 = new MongoClient(dbUri, {
        useNewUrlParser: true,
        useUnifiedTopology: true,
        serverSelectionTimeoutMS: 5000,
      });
      await client2.connect();
      await client2.db("somnia-space-defender").command({ ping: 1 });
      await client2.close();
      results.customDbAccess = "success";
    } catch (err) {
      results.customDbAccess = err.message;
    }

    // Test 3: List available databases
    try {
      const client3 = new MongoClient(baseUri, {
        useNewUrlParser: true,
        useUnifiedTopology: true,
        serverSelectionTimeoutMS: 5000,
      });
      await client3.connect();
      const dbs = await client3.db().admin().listDatabases();
      results.availableDatabases = dbs.databases.map((db) => db.name);
      await client3.close();
    } catch (err) {
      results.availableDatabases = err.message;
    }

    res.json({
      message: "Database access tests completed",
      baseUri: baseUri.substring(0, 50) + "...",
      customDbUri: dbUri.substring(0, 50) + "...",
      results: results,
      timestamp: Date.now(),
    });
  } catch (error) {
    res.status(500).json({
      error: error.message,
      timestamp: Date.now(),
    });
  }
});

// Comprehensive connection test
app.get("/test-comprehensive", async (req, res) => {
  try {
    const { MongoClient } = require("mongodb");
    const results = {};

    if (!process.env.MONGODB_URI) {
      return res.status(500).json({ error: "MONGODB_URI not set" });
    }

    // Parse the URI to get details
    const uri = process.env.MONGODB_URI;
    const uriMatch = uri.match(/mongodb\+srv:\/\/([^:]+):([^@]+)@([^/]+)/);

    if (uriMatch) {
      const [, username, password, cluster] = uriMatch;
      results.connectionDetails = {
        username: username,
        cluster: cluster,
        passwordLength: password.length,
        hasSpecialChars: /[^a-zA-Z0-9]/.test(password),
      };
    }

    // Test 1: Basic connection (no database specified)
    const baseUri = uri.replace(/\/[^/?]*\?/, "/?");
    console.log("Testing base URI:", baseUri.substring(0, 50) + "...");

    try {
      const client = new MongoClient(baseUri, {
        serverSelectionTimeoutMS: 10000,
      });

      await client.connect();
      console.log("✅ Basic connection successful");

      // Test admin command
      const adminResult = await client.db("admin").command({ ping: 1 });
      results.adminPing = "success";
      console.log("✅ Admin ping successful:", adminResult);

      // List databases
      const dbs = await client.db().admin().listDatabases();
      results.availableDatabases = dbs.databases.map((db) => ({
        name: db.name,
        sizeOnDisk: db.sizeOnDisk,
      }));
      console.log("✅ Database list:", results.availableDatabases);

      await client.close();
      console.log("✅ Connection closed");
    } catch (error) {
      console.error("❌ Connection failed:", error.message);
      results.connectionError = {
        message: error.message,
        code: error.code,
        codeName: error.codeName,
      };
    }

    res.json({
      message: "Comprehensive connection test completed",
      uriUsed: baseUri.substring(0, 50) + "...",
      results: results,
      timestamp: Date.now(),
    });
  } catch (error) {
    console.error("❌ Test failed:", error);
    res.status(500).json({
      error: error.message,
      timestamp: Date.now(),
    });
  }
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
