const mongoose = require("mongoose");

const gameScoreSchema = new mongoose.Schema({
  player: {
    type: String,
    required: true,
    lowercase: true,
    index: true,
  },
  score: {
    type: Number,
    required: true,
    min: 0,
    index: true,
  },
  level: {
    type: Number,
    required: true,
    min: 1,
    max: 10,
  },
  aliensKilled: {
    type: Number,
    required: true,
    min: 0,
  },
  gameMode: {
    type: String,
    enum: ["normal", "endless", "challenge"],
    default: "normal",
  },
  gameSession: {
    type: mongoose.Schema.Types.Mixed,
    required: true,
  },
  playTime: {
    type: Number, // in seconds
    default: 0,
  },
  powerUpsCollected: {
    type: Number,
    default: 0,
  },
  accuracy: {
    type: Number, // percentage
    default: 0,
  },
  validated: {
    type: Boolean,
    default: false,
  },
  validationDetails: {
    scorePerAlien: Number,
    timeConsistency: Boolean,
    levelProgression: Boolean,
    antiCheatPassed: Boolean,
  },
  ssdRewarded: {
    type: Number,
    default: 0,
  },
  txHash: {
    type: String,
    default: null,
  },
  blockchainTxHash: {
    type: String,
    default: null,
  },
  createdAt: {
    type: Date,
    default: Date.now,
    index: true,
  },
});

// Compound indexes for queries
gameScoreSchema.index({ score: -1, createdAt: -1 }); // Global leaderboard
gameScoreSchema.index({ player: 1, score: -1 }); // Player scores
gameScoreSchema.index({ level: 1, score: -1 }); // Level leaderboards
gameScoreSchema.index({ gameMode: 1, score: -1 }); // Mode leaderboards

module.exports = mongoose.model("GameScore", gameScoreSchema);
