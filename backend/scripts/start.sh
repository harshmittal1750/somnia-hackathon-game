#!/bin/bash

# Space Defender Backend Startup Script

echo "🚀 Starting Space Defender Backend..."

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    echo "❌ Node.js is not installed. Please install Node.js 16+ first."
    exit 1
fi

# Check if MongoDB is running
if ! pgrep -x "mongod" > /dev/null; then
    echo "⚠️ MongoDB is not running. Please start MongoDB first."
    echo "   On macOS: brew services start mongodb-community"
    echo "   On Ubuntu: sudo systemctl start mongod"
    echo "   On Windows: net start MongoDB"
    exit 1
fi

# Check if .env exists
if [ ! -f .env ]; then
    echo "⚠️ .env file not found. Creating from template..."
    cp env.example .env
    echo "📝 Please edit .env with your configuration before running again."
    exit 1
fi

# Install dependencies if node_modules doesn't exist
if [ ! -d "node_modules" ]; then
    echo "📦 Installing dependencies..."
    npm install
fi

# Seed achievements if needed
echo "🌱 Seeding achievements..."
node scripts/seedAchievements.js

# Start the server
echo "🎮 Starting backend server..."
if [ "$NODE_ENV" = "production" ]; then
    npm start
else
    npm run dev
fi