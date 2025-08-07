const express = require("express");
const router = express.Router();

const Player = require("../models/Player");
const GameScore = require("../models/GameScore");

/**
 * Get global leaderboard
 * GET /api/leaderboard/global
 */
router.get("/global", async (req, res) => {
  try {
    const limit = Math.min(parseInt(req.query.limit) || 100, 500);
    const gameMode = req.query.gameMode || "normal";

    // Get top scores by game mode
    let matchQuery = { validated: true };
    if (gameMode !== "all") {
      matchQuery.gameMode = gameMode;
    }

    const topScores = await GameScore.aggregate([
      { $match: matchQuery },
      {
        $group: {
          _id: "$player",
          highScore: { $max: "$score" },
          lastPlayed: { $max: "$createdAt" },
          totalGames: { $sum: 1 },
          totalAliensKilled: { $sum: "$aliensKilled" },
        },
      },
      { $sort: { highScore: -1, lastPlayed: -1 } },
      { $limit: limit },
      {
        $lookup: {
          from: "players",
          localField: "_id",
          foreignField: "address",
          as: "playerData",
        },
      },
      {
        $project: {
          address: "$_id",
          highScore: 1,
          lastPlayed: 1,
          totalGames: 1,
          totalAliensKilled: 1,
          twitterHandle: { $arrayElemAt: ["$playerData.twitterHandle", 0] },
          twitterVerified: { $arrayElemAt: ["$playerData.twitterVerified", 0] },
        },
      },
    ]);

    // Add rank to each player
    const leaderboard = topScores.map((player, index) => ({
      ...player,
      rank: index + 1,
    }));

    res.json({
      leaderboard,
      gameMode,
      count: leaderboard.length,
      lastUpdated: new Date(),
    });
  } catch (error) {
    console.error("Leaderboard error:", error);
    res.status(500).json({ error: "Failed to get leaderboard" });
  }
});

/**
 * Get level-specific leaderboard
 * GET /api/leaderboard/level/:level
 */
router.get("/level/:level", async (req, res) => {
  try {
    const level = parseInt(req.params.level);
    const limit = Math.min(parseInt(req.query.limit) || 50, 200);

    if (level < 1 || level > 10) {
      return res.status(400).json({ error: "Invalid level" });
    }

    const levelScores = await GameScore.aggregate([
      { $match: { level: level, validated: true } },
      {
        $group: {
          _id: "$player",
          bestScore: { $max: "$score" },
          bestTime: { $min: "$playTime" },
          attempts: { $sum: 1 },
          lastPlayed: { $max: "$createdAt" },
        },
      },
      { $sort: { bestScore: -1, bestTime: 1 } },
      { $limit: limit },
      {
        $lookup: {
          from: "players",
          localField: "_id",
          foreignField: "address",
          as: "playerData",
        },
      },
      {
        $project: {
          address: "$_id",
          bestScore: 1,
          bestTime: 1,
          attempts: 1,
          lastPlayed: 1,
          twitterHandle: { $arrayElemAt: ["$playerData.twitterHandle", 0] },
        },
      },
    ]);

    const leaderboard = levelScores.map((player, index) => ({
      ...player,
      rank: index + 1,
    }));

    res.json({
      leaderboard,
      level,
      count: leaderboard.length,
    });
  } catch (error) {
    console.error("Level leaderboard error:", error);
    res.status(500).json({ error: "Failed to get level leaderboard" });
  }
});

/**
 * Get player's rank
 * GET /api/leaderboard/rank/:address
 */
router.get("/rank/:address", async (req, res) => {
  try {
    const { address } = req.params;
    const gameMode = req.query.gameMode || "normal";

    const player = await Player.findOne({ address: address.toLowerCase() });
    if (!player) {
      return res.status(404).json({ error: "Player not found" });
    }

    // Count players with higher scores
    let matchQuery = { validated: true };
    if (gameMode !== "all") {
      matchQuery.gameMode = gameMode;
    }

    const playersAbove = await GameScore.aggregate([
      { $match: matchQuery },
      {
        $group: {
          _id: "$player",
          highScore: { $max: "$score" },
        },
      },
      {
        $match: {
          highScore: { $gt: player.highScore },
        },
      },
      { $count: "count" },
    ]);

    const rank = (playersAbove[0]?.count || 0) + 1;
    const totalPlayers = await Player.countDocuments({ highScore: { $gt: 0 } });

    res.json({
      address: address.toLowerCase(),
      rank,
      totalPlayers,
      highScore: player.highScore,
      percentile:
        totalPlayers > 0
          ? Math.round((1 - (rank - 1) / totalPlayers) * 100)
          : 0,
    });
  } catch (error) {
    console.error("Rank error:", error);
    res.status(500).json({ error: "Failed to get player rank" });
  }
});

/**
 * Get weekly leaderboard
 * GET /api/leaderboard/weekly
 */
router.get("/weekly", async (req, res) => {
  try {
    const limit = Math.min(parseInt(req.query.limit) || 50, 200);
    const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

    const weeklyScores = await GameScore.aggregate([
      {
        $match: {
          createdAt: { $gte: weekAgo },
          validated: true,
        },
      },
      {
        $group: {
          _id: "$player",
          bestScore: { $max: "$score" },
          totalScore: { $sum: "$score" },
          gamesPlayed: { $sum: 1 },
          aliensKilled: { $sum: "$aliensKilled" },
          lastPlayed: { $max: "$createdAt" },
        },
      },
      { $sort: { bestScore: -1, totalScore: -1 } },
      { $limit: limit },
      {
        $lookup: {
          from: "players",
          localField: "_id",
          foreignField: "address",
          as: "playerData",
        },
      },
      {
        $project: {
          address: "$_id",
          bestScore: 1,
          totalScore: 1,
          gamesPlayed: 1,
          aliensKilled: 1,
          lastPlayed: 1,
          twitterHandle: { $arrayElemAt: ["$playerData.twitterHandle", 0] },
        },
      },
    ]);

    const leaderboard = weeklyScores.map((player, index) => ({
      ...player,
      rank: index + 1,
    }));

    res.json({
      leaderboard,
      period: "weekly",
      startDate: weekAgo,
      endDate: new Date(),
      count: leaderboard.length,
    });
  } catch (error) {
    console.error("Weekly leaderboard error:", error);
    res.status(500).json({ error: "Failed to get weekly leaderboard" });
  }
});

module.exports = router;
