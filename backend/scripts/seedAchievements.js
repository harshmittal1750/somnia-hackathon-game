const mongoose = require("mongoose");
const Achievement = require("../models/Achievement");
require("dotenv").config();

const achievements = [
  // Score-based achievements
  {
    id: "space_cadet",
    name: "Space Cadet",
    description: "Score 1,000 points",
    requirement: 1000,
    achievementType: "score",
    category: "combat",
    rarity: "common",
    ssdReward: 1,
    order: 1,
  },
  {
    id: "space_pilot",
    name: "Space Pilot",
    description: "Score 5,000 points",
    requirement: 5000,
    achievementType: "score",
    category: "combat",
    rarity: "common",
    ssdReward: 5,
    order: 2,
  },
  {
    id: "space_ace",
    name: "Space Ace",
    description: "Score 10,000 points",
    requirement: 10000,
    achievementType: "score",
    category: "combat",
    rarity: "rare",
    ssdReward: 10,
    order: 3,
  },
  {
    id: "space_legend",
    name: "Space Legend",
    description: "Score 25,000 points",
    requirement: 25000,
    achievementType: "score",
    category: "combat",
    rarity: "epic",
    ssdReward: 25,
    order: 4,
  },
  {
    id: "space_master",
    name: "Space Master",
    description: "Score 50,000 points",
    requirement: 50000,
    achievementType: "score",
    category: "combat",
    rarity: "epic",
    ssdReward: 50,
    order: 5,
  },
  {
    id: "galactic_champion",
    name: "Galactic Champion",
    description: "Score 100,000 points",
    requirement: 100000,
    achievementType: "score",
    category: "combat",
    rarity: "legendary",
    ssdReward: 100,
    order: 6,
  },

  // Level-based achievements
  {
    id: "veteran_pilot",
    name: "Veteran Pilot",
    description: "Reach Level 5",
    requirement: 5,
    achievementType: "level",
    category: "progression",
    rarity: "rare",
    ssdReward: 15,
    order: 7,
  },
  {
    id: "elite_commander",
    name: "Elite Commander",
    description: "Reach Level 8",
    requirement: 8,
    achievementType: "level",
    category: "progression",
    rarity: "epic",
    ssdReward: 30,
    order: 8,
  },
  {
    id: "insane_pilot",
    name: "INSANE Pilot",
    description: "Beat Level 10",
    requirement: 10,
    achievementType: "level",
    category: "progression",
    rarity: "legendary",
    ssdReward: 75,
    order: 9,
  },

  // Alien kill achievements
  {
    id: "alien_hunter",
    name: "Alien Hunter",
    description: "Kill 50 aliens",
    requirement: 50,
    achievementType: "aliens",
    category: "combat",
    rarity: "common",
    ssdReward: 5,
    order: 10,
  },
  {
    id: "alien_slayer",
    name: "Alien Slayer",
    description: "Kill 100 aliens",
    requirement: 100,
    achievementType: "aliens",
    category: "combat",
    rarity: "rare",
    ssdReward: 10,
    order: 11,
  },
  {
    id: "alien_destroyer",
    name: "Alien Destroyer",
    description: "Kill 250 aliens",
    requirement: 250,
    achievementType: "aliens",
    category: "combat",
    rarity: "epic",
    ssdReward: 25,
    order: 12,
  },
  {
    id: "alien_annihilator",
    name: "Alien Annihilator",
    description: "Kill 500 aliens",
    requirement: 500,
    achievementType: "aliens",
    category: "combat",
    rarity: "legendary",
    ssdReward: 50,
    order: 13,
  },

  // Game count achievements
  {
    id: "dedicated_defender",
    name: "Dedicated Defender",
    description: "Play 10 games",
    requirement: 10,
    achievementType: "games",
    category: "endurance",
    rarity: "common",
    ssdReward: 5,
    order: 14,
  },
  {
    id: "persistent_pilot",
    name: "Persistent Pilot",
    description: "Play 50 games",
    requirement: 50,
    achievementType: "games",
    category: "endurance",
    rarity: "rare",
    ssdReward: 20,
    order: 15,
  },
  {
    id: "obsessed_guardian",
    name: "Obsessed Guardian",
    description: "Play 100 games",
    requirement: 100,
    achievementType: "games",
    category: "endurance",
    rarity: "epic",
    ssdReward: 50,
    order: 16,
  },

  // Time-based achievements
  {
    id: "time_warrior",
    name: "Time Warrior",
    description: "Play for 1 hour total",
    requirement: 3600,
    achievementType: "time",
    category: "endurance",
    rarity: "common",
    ssdReward: 10,
    order: 17,
  },
  {
    id: "marathon_pilot",
    name: "Marathon Pilot",
    description: "Play for 5 hours total",
    requirement: 18000,
    achievementType: "time",
    category: "endurance",
    rarity: "rare",
    ssdReward: 30,
    order: 18,
  },

  // Special achievements
  {
    id: "first_blood",
    name: "First Blood",
    description: "Kill your first alien",
    requirement: 1,
    achievementType: "aliens",
    category: "special",
    rarity: "common",
    ssdReward: 1,
    order: 19,
  },
  {
    id: "speed_demon",
    name: "Speed Demon",
    description: "Complete Level 1 in under 60 seconds",
    requirement: 1,
    achievementType: "special",
    category: "special",
    rarity: "rare",
    ssdReward: 15,
    order: 20,
  },
  {
    id: "perfectionist",
    name: "Perfectionist",
    description: "Achieve 100% accuracy in a game",
    requirement: 1,
    achievementType: "special",
    category: "special",
    rarity: "epic",
    ssdReward: 25,
    order: 21,
  },
];

async function seedAchievements() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log("Connected to MongoDB");

    // Clear existing achievements
    await Achievement.deleteMany({});
    console.log("Cleared existing achievements");

    // Insert new achievements
    await Achievement.insertMany(achievements);
    console.log(`✅ Successfully seeded ${achievements.length} achievements`);

    // Display summary
    const counts = achievements.reduce((acc, achievement) => {
      acc[achievement.rarity] = (acc[achievement.rarity] || 0) + 1;
      return acc;
    }, {});

    console.log("\n📊 Achievement Summary:");
    Object.entries(counts).forEach(([rarity, count]) => {
      console.log(`  ${rarity}: ${count}`);
    });

    process.exit(0);
  } catch (error) {
    console.error("❌ Error seeding achievements:", error);
    process.exit(1);
  }
}

if (require.main === module) {
  seedAchievements();
}

module.exports = { achievements, seedAchievements };
