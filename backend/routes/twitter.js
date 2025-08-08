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

      const requiredTweet = `${twitterVerificationService.REQUIRED_PHRASE} ${verificationCode}`;

      res.json({
        success: true,
        verificationCode,
        requiredTweet,
        instructions: {
          step1: `Post a tweet with this exact text: "${requiredTweet}"`,
          step2: `Make sure to mention ${twitterVerificationService.YOUR_TWITTER_HANDLE} in your tweet`,
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
          // For Twitter verification, we'll call the contract's verifyTwitter function
          // But since we need to modify the contract to give 1 SSD instead of 5,
          // let's use the claimSSDReward function with 100 aliens killed (100 * 0.01 = 1 SSD)
          const rewardResult = await web3Service.rewardSSD(walletAddress, 100);
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
        description: `Post a tweet with the text: "I just joined Somnia Space Defender #SSDGame [YOUR_CODE]" and mention ${twitterVerificationService.YOUR_TWITTER_HANDLE}`,
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
      mention: twitterVerificationService.YOUR_TWITTER_HANDLE,
      reward: "1 SSD Token",
      timeLimit: "30 minutes",
    },
  });
});

module.exports = router;
