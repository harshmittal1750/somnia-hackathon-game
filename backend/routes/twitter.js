const express = require("express");
const { body, validationResult } = require("express-validator");
const router = express.Router();
const connectToDatabase = require("../lib/db");
const twitterVerificationService = require("../services/twitterVerificationService");
const web3Service = require("../services/web3Service");

const Player = require("../models/Player");

/**
 * Generate verification code for Twitter proof
 * POST /api/twitter/generate-code
 */
router.post(
  "/generate-code",
  [
    body("walletAddress")
      .isEthereumAddress()
      .withMessage("Invalid wallet address"),
  ],
  async (req, res) => {
    try {
      await connectToDatabase();

      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const { walletAddress } = req.body;

      // Check if player is already verified
      const player = await Player.findOne({
        address: walletAddress.toLowerCase(),
      });

      if (player && player.twitterVerified) {
        return res.status(400).json({
          error: "Twitter account already verified for this wallet",
        });
      }

      // Generate verification code
      const verificationCode =
        twitterVerificationService.generateVerificationCode(walletAddress);

      const requiredTweet = `${twitterVerificationService.REQUIRED_PHRASE} ${verificationCode}

${twitterVerificationService.YOUR_TWITTER_HANDLE} ${twitterVerificationService.ADDITIONAL_MENTION}

Play now: ${twitterVerificationService.GAME_URL}`;

      // URL encode for Twitter intent
      const tweetUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(requiredTweet)}`;

      res.json({
        success: true,
        verificationCode,
        requiredTweet,
        tweetUrl,
        instructions: {
          step1: `Click "Post Tweet" to open Twitter with the message pre-filled`,
          step2: `Post the tweet (includes mentions of ${twitterVerificationService.YOUR_TWITTER_HANDLE} and ${twitterVerificationService.ADDITIONAL_MENTION})`,
          step3: "Copy the tweet URL and submit it below",
          step4: "You'll receive 1 SSD token upon successful verification",
          expiresIn: "30 minutes",
        },
      });
    } catch (error) {
      console.error("Generate code error:", error);
      res.status(500).json({ error: "Failed to generate verification code" });
    }
  }
);

/**
 * Verify Twitter tweet and reward SSD
 * POST /api/twitter/verify
 */
router.post(
  "/verify",
  [
    body("walletAddress")
      .isEthereumAddress()
      .withMessage("Invalid wallet address"),
    body("tweetUrl").isURL().withMessage("Invalid tweet URL"),
    body("twitterHandle")
      .isString()
      .isLength({ min: 1, max: 50 })
      .withMessage("Invalid Twitter handle"),
  ],
  async (req, res) => {
    try {
      await connectToDatabase();

      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const { walletAddress, tweetUrl, twitterHandle } = req.body;

      // Check if player is already verified
      const player = await Player.findOne({
        address: walletAddress.toLowerCase(),
      });

      if (player && player.twitterVerified) {
        return res.status(400).json({
          error: "Twitter account already verified for this wallet",
        });
      }

      // Get verification code
      const verificationCode =
        twitterVerificationService.getVerificationCode(walletAddress);
      if (!verificationCode) {
        return res.status(400).json({
          error:
            "No active verification code found. Please generate a new one.",
        });
      }

      // Verify the tweet
      const verificationResult =
        await twitterVerificationService.verifyTweetByUrl(
          tweetUrl,
          verificationCode
        );

      if (!verificationResult.success) {
        return res.status(400).json({
          error: verificationResult.error || "Tweet verification failed",
        });
      }

      // Mark verification code as used
      twitterVerificationService.markCodeAsUsed(walletAddress);

      // Update player in database
      const updateData = {
        twitterHandle: twitterHandle.replace("@", ""),
        twitterVerified: true,
        twitterVerifiedAt: new Date(),
        twitterVerificationTweetUrl: tweetUrl,
      };

      const updatedPlayer = await Player.findOneAndUpdate(
        { address: walletAddress.toLowerCase() },
        { $set: updateData, $inc: { ssdEarned: 1 } }, // Add 1 SSD to earned amount
        { new: true, upsert: true }
      );

      // Reward 1 SSD token via blockchain
      let txHash = null;
      let blockchainRewardSuccess = false;

      try {
        if (web3Service.isEnabled) {
          // Call the contract's verifyTwitter function with 1 SSD reward
          const rewardResult = await web3Service.verifyTwitter(walletAddress, updateData.twitterHandle);
          if (rewardResult.success) {
            txHash = rewardResult.txHash;
            blockchainRewardSuccess = true;
          }
        }
      } catch (error) {
        console.error("Blockchain reward failed:", error);
        // Continue even if blockchain reward fails
      }

      res.json({
        success: true,
        message:
          "Twitter verification successful! 1 SSD token has been credited to your account.",
        player: {
          address: updatedPlayer.address,
          twitterHandle: updatedPlayer.twitterHandle,
          twitterVerified: updatedPlayer.twitterVerified,
          ssdEarned: updatedPlayer.ssdEarned,
        },
        reward: {
          amount: 1,
          currency: "SSD",
          txHash: txHash,
          blockchainSuccess: blockchainRewardSuccess,
        },
        verification: {
          verifiedAt: updatedPlayer.twitterVerifiedAt,
          tweetUrl: tweetUrl,
        },
      });
    } catch (error) {
      console.error("Twitter verification error:", error);
      res.status(500).json({ error: "Failed to verify Twitter account" });
    }
  }
);

/**
 * Check verification status
 * GET /api/twitter/status/:walletAddress
 */
router.get("/status/:walletAddress", async (req, res) => {
  try {
    await connectToDatabase();

    const { walletAddress } = req.params;

    if (!/^0x[a-fA-F0-9]{40}$/.test(walletAddress)) {
      return res.status(400).json({ error: "Invalid wallet address format" });
    }

    const player = await Player.findOne({
      address: walletAddress.toLowerCase(),
    });

    if (!player) {
      return res.json({
        isVerified: false,
        twitterHandle: null,
        hasActiveCode: false,
      });
    }

    // Check if there's an active verification code
    const activeCode =
      twitterVerificationService.getVerificationCode(walletAddress);

    res.json({
      isVerified: player.twitterVerified || false,
      twitterHandle: player.twitterHandle || null,
      verifiedAt: player.twitterVerifiedAt || null,
      hasActiveCode: !!activeCode,
      activeCode: activeCode, // Only return for debugging, remove in production
    });
  } catch (error) {
    console.error("Twitter status check error:", error);
    res.status(500).json({ error: "Failed to check Twitter status" });
  }
});

/**
 * Get verification instructions
 * GET /api/twitter/instructions
 */
router.get("/instructions", (req, res) => {
  res.json({
    process: "Manual Proof-of-Follow",
    steps: [
      {
        step: 1,
        title: "Generate Verification Code",
        description:
          "Click 'Generate Code' to get your unique verification code",
      },
              {
          step: 2,
          title: "Post Tweet",
          description: `Click "Post Tweet" button to open Twitter with pre-filled message including mentions of ${twitterVerificationService.YOUR_TWITTER_HANDLE} and ${twitterVerificationService.ADDITIONAL_MENTION}`,
        },
      {
        step: 3,
        title: "Submit Tweet URL",
        description: "Copy your tweet URL and submit it for verification",
      },
      {
        step: 4,
        title: "Receive Reward",
        description:
          "Get 1 SSD token credited to your wallet upon successful verification",
      },
    ],
    requirements: {
      tweetContent: twitterVerificationService.REQUIRED_PHRASE,
      mentions: `${twitterVerificationService.YOUR_TWITTER_HANDLE} and ${twitterVerificationService.ADDITIONAL_MENTION}`,
      gameUrl: twitterVerificationService.GAME_URL,
      reward: "1 SSD Token",
      timeLimit: "30 minutes",
    },
  });
});

module.exports = router;
