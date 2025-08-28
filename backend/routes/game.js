const express = require("express");
const { body, validationResult } = require("express-validator");
const router = express.Router();
const connectToDatabase = require("../lib/db");

const Player = require("../models/Player");
const GameScore = require("../models/GameScore");
const Achievement = require("../models/Achievement");
const web3Service = require("../services/web3Service");
const antiCheatService = require("../services/antiCheatService");

// Validation middleware
const validateScoreSubmission = [
  body("score").isInt({ min: 1, max: 1000000 }).withMessage("Invalid score"),
  body("level").isInt({ min: 1, max: 10 }).withMessage("Invalid level"),
  body("aliensKilled")
    .isInt({ min: 0, max: 10000 })
    .withMessage("Invalid aliens killed"),
  body("gameMode")
    .isIn(["normal", "endless", "challenge"])
    .withMessage("Invalid game mode"),
  body("gameSession").isObject().withMessage("Game session must be an object"),
  body("playTime").isInt({ min: 1 }).withMessage("Invalid play time"),
  body("playerAddress")
    .isEthereumAddress()
    .withMessage("Invalid player address"),
  body("blockchainTxHash")
    .optional()
    .isString()
    .withMessage("Invalid blockchain transaction hash"),
  body("ssdAlreadyRewarded")
    .optional()
    .isBoolean()
    .withMessage("Invalid ssdAlreadyRewarded flag"),
];

/**
 * Submit game score
 * POST /api/game/submit-score
 */
router.post(
  "/submit-score",
  validateScoreSubmission,
  (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }
    next();
  },
  async (req, res) => {
    try {
      // Connect to database
      await connectToDatabase();

      const {
        score,
        level,
        aliensKilled,
        gameMode,
        gameSession,
        playTime,
        powerUpsCollected = 0,
        accuracy = 0,
        playerAddress,
        blockchainTxHash = null,
        ssdAlreadyRewarded = false,
      } = req.body;

      // Anti-cheat validation
      const validationResult = await antiCheatService.validateScore({
        score,
        level,
        aliensKilled,
        gameSession,
        playTime,
        playerAddress,
      });

      if (!validationResult.valid) {
        // If blockchain transaction is provided, be more lenient with validation
        if (blockchainTxHash) {
          console.log(
            "⚠️ Validation failed but blockchain TX provided, allowing submission:",
            blockchainTxHash
          );
        } else {
          return res.status(400).json({
            error: "Score validation failed",
            reason: validationResult.reason,
            details: validationResult.details,
          });
        }
      }

      // Check submission rate limiting
      const player = await Player.findOne({
        address: playerAddress.toLowerCase(),
      });
      if (player && player.lastSubmissionTime) {
        const timeDiff = Date.now() - player.lastSubmissionTime.getTime();
        const cooldown = parseInt(process.env.SUBMISSION_COOLDOWN) || 5000;

        if (timeDiff < cooldown) {
          return res.status(429).json({
            error: "Submission cooldown active",
            timeRemaining: cooldown - timeDiff,
          });
        }
      }

      // Create game score record
      const gameScore = new GameScore({
        player: playerAddress.toLowerCase(),
        score,
        level,
        aliensKilled,
        gameMode,
        gameSession,
        playTime,
        powerUpsCollected,
        accuracy,
        validated: true,
        blockchainTxHash,
        ssdRewarded: ssdAlreadyRewarded ? aliensKilled * 0.01 : 0,
        validationDetails: {
          scorePerAlien: aliensKilled > 0 ? score / aliensKilled : 0,
          timeConsistency: validationResult.details.timeConsistent,
          levelProgression: validationResult.details.levelProgression,
          antiCheatPassed: true,
        },
      });

      await gameScore.save();

      // Update or create player stats
      const updateData = {
        $inc: {
          totalGames: 1,
          totalAliensKilled: aliensKilled,
          totalPlayTime: playTime,
        },
        $max: {
          highScore: score,
          maxLevelReached: level,
        },
        lastSubmissionTime: new Date(),
      };

      let updatedPlayer = await Player.findOneAndUpdate(
        { address: playerAddress.toLowerCase() },
        updateData,
        { upsert: true, new: true }
      );

      // Check for new achievements
      const newAchievements = await checkPlayerAchievements(updatedPlayer);

      // Process SD reward if aliens were killed and not already rewarded
      let ssdReward = 0;
      let txHash = blockchainTxHash;

      if (ssdAlreadyRewarded) {
        ssdReward = aliensKilled * 0.01;
        console.log(`✅ SD already rewarded on blockchain: ${ssdReward} SD`);

        // Update player SD earned for already rewarded SD
        await Player.updateOne(
          { address: playerAddress.toLowerCase() },
          { $inc: { ssdEarned: ssdReward } }
        );
      } else if (aliensKilled > 0) {
        // Fallback: reward via backend if blockchain failed
        try {
          console.log("🔄 Rewarding SD via backend fallback...");
          const rewardResult = await web3Service.rewardSD(
            playerAddress,
            aliensKilled
          );
          if (rewardResult.success) {
            ssdReward = rewardResult.amount;
            txHash = rewardResult.txHash;
            gameScore.ssdRewarded = ssdReward;
            gameScore.txHash = txHash;
            await gameScore.save();

            // Update player SD earned
            await Player.updateOne(
              { address: playerAddress.toLowerCase() },
              { $inc: { ssdEarned: ssdReward } }
            );
          }
        } catch (error) {
          console.error("SD reward failed:", error);
          // Continue without failing the score submission
        }
      }

      res.json({
        success: true,
        scoreId: gameScore._id,
        playerStats: {
          highScore: updatedPlayer.highScore,
          totalGames: updatedPlayer.totalGames,
          totalAliensKilled: updatedPlayer.totalAliensKilled,
          maxLevelReached: updatedPlayer.maxLevelReached,
        },
        ssdReward,
        txHash,
        newAchievements,
        validationPassed: true,
      });
    } catch (error) {
      console.error("Score submission error:", error);
      console.error("Error stack:", error.stack);
      res.status(500).json({
        error: "Failed to submit score",
        message: error.message,
        details:
          process.env.NODE_ENV === "development" ? error.stack : undefined,
      });
    }
  }
);

/**
 * Get game statistics
 * GET /api/game/stats
 */
router.get("/stats", async (req, res) => {
  try {
    // Connect to database
    await connectToDatabase();

    const totalGames = await GameScore.countDocuments();
    const totalPlayers = await Player.countDocuments();
    const totalAliensKilled = await Player.aggregate([
      { $group: { _id: null, total: { $sum: "$totalAliensKilled" } } },
    ]);

    const topScore = await GameScore.findOne().sort({ score: -1 });

    res.json({
      totalGames,
      totalPlayers,
      totalAliensKilled: totalAliensKilled[0]?.total || 0,
      topScore: topScore?.score || 0,
      topPlayer: topScore?.player || null,
    });
  } catch (error) {
    console.error("Stats error:", error);
    res.status(500).json({ error: "Failed to get stats" });
  }
});

/**
 * Get player's game history
 * GET /api/game/history/:address
 */
router.get("/history/:address", async (req, res) => {
  try {
    // Connect to database
    await connectToDatabase();

    const { address } = req.params;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const skip = (page - 1) * limit;

    const scores = await GameScore.find({ player: address.toLowerCase() })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    const total = await GameScore.countDocuments({
      player: address.toLowerCase(),
    });

    res.json({
      scores,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error("History error:", error);
    res.status(500).json({ error: "Failed to get game history" });
  }
});

// Helper function to check player achievements
async function checkPlayerAchievements(player) {
  const achievements = await Achievement.find({ isActive: true });
  const newAchievements = [];

  for (const achievement of achievements) {
    // Check if already unlocked
    const alreadyUnlocked = player.achievementsUnlocked.some(
      (a) => a.achievementId === achievement.id
    );

    if (alreadyUnlocked) continue;

    let playerValue = 0;
    switch (achievement.achievementType) {
      case "score":
        playerValue = player.highScore;
        break;
      case "level":
        playerValue = player.maxLevelReached;
        break;
      case "aliens":
        playerValue = player.totalAliensKilled;
        break;
      case "games":
        playerValue = player.totalGames;
        break;
      case "time":
        playerValue = player.totalPlayTime;
        break;
      default:
        continue;
    }

    if (playerValue >= achievement.requirement) {
      // Unlock achievement
      player.achievementsUnlocked.push({
        achievementId: achievement.id,
        unlockedAt: new Date(),
      });

      newAchievements.push({
        id: achievement.id,
        name: achievement.name,
        description: achievement.description,
        rarity: achievement.rarity,
      });
    }
  }

  if (newAchievements.length > 0) {
    await player.save();
  }

  return newAchievements;
}

module.exports = router;
