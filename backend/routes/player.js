const express = require("express");
const { body, validationResult } = require("express-validator");
const router = express.Router();
const connectToDatabase = require("../lib/db");

const Player = require("../models/Player");
const GameScore = require("../models/GameScore");

/**
 * Get player statistics
 * GET /api/player/:address
 */
router.get("/:address", async (req, res) => {
  try {
    // Connect to database
    await connectToDatabase();

    const { address } = req.params;

    // Validate address format (basic validation)
    if (!address || !/^0x[a-fA-F0-9]{40}$/.test(address)) {
      return res.status(400).json({ error: "Invalid wallet address format" });
    }

    const player = await Player.findOne({ address: address.toLowerCase() });
    if (!player) {
      // Create a default player entry if not found
      const newPlayer = new Player({
        address: address.toLowerCase(),
        highScore: 0,
        totalGames: 0,
        totalAliensKilled: 0,
        maxLevelReached: 0,
        totalPlayTime: 0,
        ssdEarned: 0,
        ssdSpent: 0,
        achievementsUnlocked: [],
      });

      await newPlayer.save();

      return res.json({
        address: newPlayer.address,
        stats: {
          highScore: 0,
          totalGames: 0,
          totalAliensKilled: 0,
          maxLevelReached: 0,
          totalPlayTime: 0,
          averageScore: 0,
          averagePlayTime: 0,
          killsPerGame: 0,
          ssdEarned: 0,
          ssdSpent: 0,
          achievementsUnlocked: 0,
        },
        social: {
          twitterHandle: null,
          twitterVerified: false,
        },
        recentGames: [],
        joinedAt: newPlayer.createdAt,
        lastActive: newPlayer.updatedAt,
      });
    }

    // Get recent games
    const recentGames = await GameScore.find({ player: address.toLowerCase() })
      .sort({ createdAt: -1 })
      .limit(10)
      .select("score level aliensKilled gameMode createdAt playTime");

    // Calculate additional stats
    const averageScore =
      recentGames.length > 0
        ? Math.round(
            recentGames.reduce((sum, game) => sum + game.score, 0) /
              recentGames.length
          )
        : 0;

    const averagePlayTime =
      player.totalGames > 0
        ? Math.round(player.totalPlayTime / player.totalGames)
        : 0;

    const killsPerGame =
      player.totalGames > 0
        ? Math.round(player.totalAliensKilled / player.totalGames)
        : 0;

    res.json({
      address: player.address,
      stats: {
        highScore: player.highScore,
        totalGames: player.totalGames,
        totalAliensKilled: player.totalAliensKilled,
        maxLevelReached: player.maxLevelReached,
        totalPlayTime: player.totalPlayTime,
        averageScore,
        averagePlayTime,
        killsPerGame,
        ssdEarned: player.ssdEarned,
        ssdSpent: player.ssdSpent,
        achievementsUnlocked: player.achievementsUnlocked.length,
      },
      social: {
        twitterHandle: player.twitterHandle,
        twitterVerified: player.twitterVerified,
      },
      recentGames,
      joinedAt: player.createdAt,
      lastActive: player.updatedAt,
    });
  } catch (error) {
    console.error("Player stats error:", error);
    res.status(500).json({ error: "Failed to get player stats" });
  }
});

/**
 * Update player profile
 * PUT /api/player/:address
 */
router.put(
  "/:address",
  [body("twitterHandle").optional().isString().isLength({ max: 50 })],
  async (req, res) => {
    try {
      // Connect to database
      await connectToDatabase();

      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const { address } = req.params;
      const { twitterHandle } = req.body;

      const updateData = {};
      if (twitterHandle !== undefined) {
        updateData.twitterHandle = twitterHandle;
      }

      const player = await Player.findOneAndUpdate(
        { address: address.toLowerCase() },
        updateData,
        { new: true, upsert: true }
      );

      res.json({
        success: true,
        player: {
          address: player.address,
          twitterHandle: player.twitterHandle,
          twitterVerified: player.twitterVerified,
        },
      });
    } catch (error) {
      console.error("Player update error:", error);
      res.status(500).json({ error: "Failed to update player" });
    }
  }
);

/**
 * Get player's detailed game history with filters
 * GET /api/player/:address/games
 */
router.get("/:address/games", async (req, res) => {
  try {
    // Connect to database
    await connectToDatabase();

    const { address } = req.params;
    const page = parseInt(req.query.page) || 1;
    const limit = Math.min(parseInt(req.query.limit) || 20, 100);
    const skip = (page - 1) * limit;

    const level = req.query.level ? parseInt(req.query.level) : null;
    const gameMode = req.query.gameMode;
    const sortBy = req.query.sortBy || "createdAt";
    const sortOrder = req.query.sortOrder === "asc" ? 1 : -1;

    // Build query
    const query = { player: address.toLowerCase() };
    if (level && level >= 1 && level <= 10) {
      query.level = level;
    }
    if (gameMode && ["normal", "endless", "challenge"].includes(gameMode)) {
      query.gameMode = gameMode;
    }

    // Build sort
    const sort = {};
    if (
      ["score", "level", "aliensKilled", "createdAt", "playTime"].includes(
        sortBy
      )
    ) {
      sort[sortBy] = sortOrder;
    } else {
      sort.createdAt = -1;
    }

    const games = await GameScore.find(query)
      .sort(sort)
      .skip(skip)
      .limit(limit)
      .select(
        "score level aliensKilled gameMode playTime accuracy powerUpsCollected ssdRewarded createdAt"
      );

    const total = await GameScore.countDocuments(query);

    // Calculate stats for the filtered games
    const stats = {
      totalGames: total,
      averageScore: 0,
      bestScore: 0,
      totalKills: 0,
      totalPlayTime: 0,
    };

    if (games.length > 0) {
      stats.averageScore = Math.round(
        games.reduce((sum, game) => sum + game.score, 0) / games.length
      );
      stats.bestScore = Math.max(...games.map((game) => game.score));
      stats.totalKills = games.reduce(
        (sum, game) => sum + game.aliensKilled,
        0
      );
      stats.totalPlayTime = games.reduce((sum, game) => sum + game.playTime, 0);
    }

    res.json({
      games,
      stats,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
      filters: {
        level,
        gameMode,
        sortBy,
        sortOrder: sortOrder === 1 ? "asc" : "desc",
      },
    });
  } catch (error) {
    console.error("Player games error:", error);
    res.status(500).json({ error: "Failed to get player games" });
  }
});

/**
 * Get player comparison
 * GET /api/player/compare/:address1/:address2
 */
router.get("/compare/:address1/:address2", async (req, res) => {
  try {
    // Connect to database
    await connectToDatabase();

    const { address1, address2 } = req.params;

    const [player1, player2] = await Promise.all([
      Player.findOne({ address: address1.toLowerCase() }),
      Player.findOne({ address: address2.toLowerCase() }),
    ]);

    if (!player1 || !player2) {
      return res.status(404).json({ error: "One or both players not found" });
    }

    const comparison = {
      player1: {
        address: player1.address,
        highScore: player1.highScore,
        totalGames: player1.totalGames,
        totalAliensKilled: player1.totalAliensKilled,
        maxLevelReached: player1.maxLevelReached,
        achievementsCount: player1.achievementsUnlocked.length,
        twitterHandle: player1.twitterHandle,
      },
      player2: {
        address: player2.address,
        highScore: player2.highScore,
        totalGames: player2.totalGames,
        totalAliensKilled: player2.totalAliensKilled,
        maxLevelReached: player2.maxLevelReached,
        achievementsCount: player2.achievementsUnlocked.length,
        twitterHandle: player2.twitterHandle,
      },
      winner: {
        highScore:
          player1.highScore > player2.highScore ? "player1" : "player2",
        totalGames:
          player1.totalGames > player2.totalGames ? "player1" : "player2",
        totalKills:
          player1.totalAliensKilled > player2.totalAliensKilled
            ? "player1"
            : "player2",
        maxLevel:
          player1.maxLevelReached > player2.maxLevelReached
            ? "player1"
            : "player2",
        achievements:
          player1.achievementsUnlocked.length >
          player2.achievementsUnlocked.length
            ? "player1"
            : "player2",
      },
    };

    res.json(comparison);
  } catch (error) {
    console.error("Player comparison error:", error);
    res.status(500).json({ error: "Failed to compare players" });
  }
});

module.exports = router;
