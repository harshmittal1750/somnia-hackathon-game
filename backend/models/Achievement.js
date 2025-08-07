const mongoose = require("mongoose");

const achievementSchema = new mongoose.Schema({
  id: {
    type: String,
    required: true,
    unique: true,
  },
  name: {
    type: String,
    required: true,
  },
  description: {
    type: String,
    required: true,
  },
  requirement: {
    type: Number,
    required: true,
  },
  achievementType: {
    type: String,
    enum: ["score", "level", "aliens", "games", "time", "special"],
    required: true,
  },
  category: {
    type: String,
    enum: ["combat", "progression", "endurance", "social", "special"],
    default: "combat",
  },
  rarity: {
    type: String,
    enum: ["common", "rare", "epic", "legendary"],
    default: "common",
  },
  icon: {
    type: String,
    default: null,
  },
  ssdReward: {
    type: Number,
    default: 0,
  },
  isActive: {
    type: Boolean,
    default: true,
  },
  order: {
    type: Number,
    default: 0,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

module.exports = mongoose.model("Achievement", achievementSchema);
