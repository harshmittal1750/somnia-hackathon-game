const express = require("express");
const router = express.Router();

const Achievement = require("../models/Achievement");
const Player = require("../models/Player");

/**
 * Get all achievements
 * GET /api/achievements
 */
router.get("/", async (req, res) => {
  try {
    const achievements = await Achievement.find({ isActive: true }).sort({
      category: 1,
      order: 1,
      requirement: 1,
    });

    // Group by category
    const grouped = achievements.reduce((acc, achievement) => {
      if (!acc[achievement.category]) {
        acc[achievement.category] = [];
      }
      acc[achievement.category].push({
        id: achievement.id,
        name: achievement.name,
        description: achievement.description,
        requirement: achievement.requirement,
        type: achievement.achievementType,
        rarity: achievement.rarity,
        ssdReward: achievement.ssdReward,
        icon: achievement.icon,
      });
      return acc;
    }, {});

    res.json({
      achievements: grouped,
      total: achievements.length,
    });
  } catch (error) {
    console.error("Achievements error:", error);
    res.status(500).json({ error: "Failed to get achievements" });
  }
});

/**
 * Get player's achievements
 * GET /api/achievements/player/:address
 */
router.get("/player/:address", async (req, res) => {
  try {
    const { address } = req.params;

    const player = await Player.findOne({ address: address.toLowerCase() });
    if (!player) {
      return res.status(404).json({ error: "Player not found" });
    }

    const allAchievements = await Achievement.find({ isActive: true });

    const playerAchievements = allAchievements.map((achievement) => {
      const unlocked = player.achievementsUnlocked.find(
        (a) => a.achievementId === achievement.id
      );

      let progress = 0;
      let currentValue = 0;

      // Calculate progress
      switch (achievement.achievementType) {
        case "score":
          currentValue = player.highScore;
          break;
        case "level":
          currentValue = player.maxLevelReached;
          break;
        case "aliens":
          currentValue = player.totalAliensKilled;
          break;
        case "games":
          currentValue = player.totalGames;
          break;
        case "time":
          currentValue = player.totalPlayTime;
          break;
      }

      progress = Math.min(
        100,
        Math.round((currentValue / achievement.requirement) * 100)
      );

      return {
        id: achievement.id,
        name: achievement.name,
        description: achievement.description,
        requirement: achievement.requirement,
        type: achievement.achievementType,
        category: achievement.category,
        rarity: achievement.rarity,
        ssdReward: achievement.ssdReward,
        icon: achievement.icon,
        unlocked: !!unlocked,
        unlockedAt: unlocked?.unlockedAt || null,
        progress,
        currentValue,
      };
    });

    // Group by category
    const grouped = playerAchievements.reduce((acc, achievement) => {
      if (!acc[achievement.category]) {
        acc[achievement.category] = [];
      }
      acc[achievement.category].push(achievement);
      return acc;
    }, {});

    const unlockedCount = playerAchievements.filter((a) => a.unlocked).length;
    const totalCount = playerAchievements.length;

    res.json({
      achievements: grouped,
      stats: {
        unlocked: unlockedCount,
        total: totalCount,
        percentage:
          totalCount > 0 ? Math.round((unlockedCount / totalCount) * 100) : 0,
      },
    });
  } catch (error) {
    console.error("Player achievements error:", error);
    res.status(500).json({ error: "Failed to get player achievements" });
  }
});

/**
 * Get achievement leaderboard (most achievements unlocked)
 * GET /api/achievements/leaderboard
 */
router.get("/leaderboard", async (req, res) => {
  try {
    const limit = Math.min(parseInt(req.query.limit) || 50, 200);

    const achievementLeaders = await Player.aggregate([
      {
        $project: {
          address: 1,
          achievementsCount: { $size: "$achievementsUnlocked" },
          highScore: 1,
          totalGames: 1,
          twitterHandle: 1,
          twitterVerified: 1,
          updatedAt: 1,
        },
      },
      {
        $match: {
          achievementsCount: { $gt: 0 },
        },
      },
      {
        $sort: {
          achievementsCount: -1,
          highScore: -1,
          updatedAt: -1,
        },
      },
      { $limit: limit },
    ]);

    const leaderboard = achievementLeaders.map((player, index) => ({
      ...player,
      rank: index + 1,
    }));

    res.json({
      leaderboard,
      count: leaderboard.length,
    });
  } catch (error) {
    console.error("Achievement leaderboard error:", error);
    res.status(500).json({ error: "Failed to get achievement leaderboard" });
  }
});

/**
 * Get recent achievement unlocks
 * GET /api/achievements/recent
 */
router.get("/recent", async (req, res) => {
  try {
    const limit = Math.min(parseInt(req.query.limit) || 20, 100);

    const recentUnlocks = await Player.aggregate([
      { $unwind: "$achievementsUnlocked" },
      {
        $lookup: {
          from: "achievements",
          localField: "achievementsUnlocked.achievementId",
          foreignField: "id",
          as: "achievementData",
        },
      },
      { $unwind: "$achievementData" },
      {
        $project: {
          address: 1,
          twitterHandle: 1,
          achievementId: "$achievementsUnlocked.achievementId",
          achievementName: "$achievementData.name",
          achievementRarity: "$achievementData.rarity",
          unlockedAt: "$achievementsUnlocked.unlockedAt",
        },
      },
      { $sort: { unlockedAt: -1 } },
      { $limit: limit },
    ]);

    res.json({
      recentUnlocks,
      count: recentUnlocks.length,
    });
  } catch (error) {
    console.error("Recent achievements error:", error);
    res.status(500).json({ error: "Failed to get recent achievements" });
  }
});

module.exports = router;
