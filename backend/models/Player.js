const mongoose = require("mongoose");

const playerSchema = new mongoose.Schema({
  address: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    index: true,
  },
  highScore: {
    type: Number,
    default: 0,
    index: true,
  },
  totalGames: {
    type: Number,
    default: 0,
  },
  totalAliensKilled: {
    type: Number,
    default: 0,
  },
  maxLevelReached: {
    type: Number,
    default: 0,
  },
  totalPlayTime: {
    type: Number,
    default: 0,
  },
  achievementsUnlocked: [
    {
      achievementId: String,
      unlockedAt: {
        type: Date,
        default: Date.now,
      },
    },
  ],
  ssdEarned: {
    type: Number,
    default: 0,
  },
  ssdSpent: {
    type: Number,
    default: 0,
  },
  twitterHandle: {
    type: String,
    default: null,
  },
  twitterVerified: {
    type: Boolean,
    default: false,
  },
  lastSubmissionTime: {
    type: Date,
    default: null,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
  updatedAt: {
    type: Date,
    default: Date.now,
  },
});

// Update the updatedAt field before saving
playerSchema.pre("save", function (next) {
  this.updatedAt = Date.now();
  next();
});

// Virtual for player rank (calculated when needed)
playerSchema.virtual("rank").get(function () {
  return this._rank;
});

// Index for leaderboard queries
playerSchema.index({ highScore: -1, updatedAt: -1 });

module.exports = mongoose.model("Player", playerSchema);
