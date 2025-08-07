const mongoose = require('mongoose');

let cached = global.mongoose || { conn: null, promise: null };

async function connectToDatabase() {
  if (cached.conn) {
    console.log('✅ Using cached MongoDB connection');
    return cached.conn;
  }

  if (!process.env.MONGODB_URI) {
    throw new Error('MONGODB_URI not defined');
  }

  if (!cached.promise) {
    console.log('🔄 Creating new MongoDB connection...');
    
    const opts = {
      useNewUrlParser: true,
      useUnifiedTopology: true,
      maxPoolSize: 10,
      serverSelectionTimeoutMS: 10000,
      socketTimeoutMS: 45000,
      bufferCommands: false,
    };

    cached.promise = mongoose.connect(process.env.MONGODB_URI, opts).then((mongoose) => {
      console.log('✅ Connected to MongoDB (serverless)');
      return mongoose;
    });
  }

  try {
    cached.conn = await cached.promise;
    console.log('✅ MongoDB connection established');
    return cached.conn;
  } catch (error) {
    console.error('❌ MongoDB connection failed:', error.message);
    cached.promise = null;
    throw error;
  }
}

// Store the cached connection globally
global.mongoose = cached;

module.exports = connectToDatabase;