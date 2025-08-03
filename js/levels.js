// Somnia Space Defender - Level Management System
class LevelManager {
  constructor() {
    this.currentLevel = 1;
    this.unlockedLevels = 1;
    this.levelData = CONFIG.GAME.LEVELS;
    this.achievementsUnlocked = new Set();

    this.loadProgress();
  }

  loadProgress() {
    try {
      const saved = localStorage.getItem("somniaSpaceDefender_progress");
      if (saved) {
        const progress = JSON.parse(saved);
        this.unlockedLevels = progress.unlockedLevels || 1;
        this.achievementsUnlocked = new Set(progress.achievements || []);
      }
    } catch (error) {
      console.warn("Failed to load progress:", error);
    }
  }

  saveProgress() {
    try {
      const progress = {
        unlockedLevels: this.unlockedLevels,
        achievements: Array.from(this.achievementsUnlocked),
        lastPlayed: Date.now(),
      };
      localStorage.setItem(
        "somniaSpaceDefender_progress",
        JSON.stringify(progress)
      );
    } catch (error) {
      console.warn("Failed to save progress:", error);
    }
  }

  getLevelInfo(levelNumber) {
    const level = this.levelData[levelNumber];
    if (!level) return null;

    return {
      number: levelNumber,
      name: level.name,
      speedMultiplier: level.speedMultiplier,
      healthMultiplier: level.healthMultiplier,
      spawnRateMultiplier: level.spawnRateMultiplier,
      alienTypes: level.alienTypes,
      isUnlocked: levelNumber <= this.unlockedLevels,
      difficulty: this.getDifficultyRating(levelNumber),
      estimatedDuration: this.getEstimatedDuration(levelNumber),
      requiredScore: this.getRequiredScore(levelNumber),
    };
  }

  getDifficultyRating(levelNumber) {
    if (levelNumber <= 2) return "Easy";
    if (levelNumber <= 4) return "Medium";
    if (levelNumber <= 6) return "Hard";
    if (levelNumber <= 8) return "Expert";
    return "Insane";
  }

  getEstimatedDuration(levelNumber) {
    // Estimate based on aliens needed to beat level
    const aliensNeeded = levelNumber * 10;
    const avgTimePerAlien = 2 + levelNumber * 0.5; // Gets harder
    return Math.round((aliensNeeded * avgTimePerAlien) / 60); // Minutes
  }

  getRequiredScore(levelNumber) {
    // Minimum score typically needed to unlock next level
    return levelNumber * 250;
  }

  unlockLevel(levelNumber) {
    if (levelNumber > this.unlockedLevels && levelNumber <= 10) {
      this.unlockedLevels = levelNumber;
      this.saveProgress();
      console.log(`🔓 Level ${levelNumber} unlocked!`);
      return true;
    }
    return false;
  }

  checkLevelCompletion(score, level, aliensKilled) {
    const achievements = [];

    // Level completion achievements
    if (level > this.unlockedLevels - 1) {
      const nextLevel = level + 1;
      if (nextLevel <= 10) {
        this.unlockLevel(nextLevel);
        achievements.push(`Level ${nextLevel} Unlocked!`);
      }
    }

    // Score-based achievements
    const achievementChecks = [
      {
        id: "score_1k",
        threshold: 1000,
        message: "Space Cadet - 1,000 points!",
      },
      {
        id: "score_5k",
        threshold: 5000,
        message: "Space Pilot - 5,000 points!",
      },
      {
        id: "score_10k",
        threshold: 10000,
        message: "Space Ace - 10,000 points!",
      },
      {
        id: "score_25k",
        threshold: 25000,
        message: "Space Legend - 25,000 points!",
      },
      {
        id: "score_50k",
        threshold: 50000,
        message: "Space Master - 50,000 points!",
      },
    ];

    for (const achievement of achievementChecks) {
      if (
        score >= achievement.threshold &&
        !this.achievementsUnlocked.has(achievement.id)
      ) {
        this.achievementsUnlocked.add(achievement.id);
        achievements.push(achievement.message);
      }
    }

    // Alien kill achievements
    const killAchievements = [
      { id: "kills_50", threshold: 50, message: "Alien Hunter - 50 kills!" },
      { id: "kills_100", threshold: 100, message: "Alien Slayer - 100 kills!" },
      {
        id: "kills_250",
        threshold: 250,
        message: "Alien Destroyer - 250 kills!",
      },
      {
        id: "kills_500",
        threshold: 500,
        message: "Alien Annihilator - 500 kills!",
      },
    ];

    for (const achievement of killAchievements) {
      if (
        aliensKilled >= achievement.threshold &&
        !this.achievementsUnlocked.has(achievement.id)
      ) {
        this.achievementsUnlocked.add(achievement.id);
        achievements.push(achievement.message);
      }
    }

    // Level-specific achievements
    const levelAchievements = [
      {
        id: "beat_level_5",
        level: 5,
        message: "Veteran Pilot - Beat Level 5!",
      },
      {
        id: "beat_level_10",
        level: 10,
        message: "INSANE PILOT - Beat Level 10!",
      },
    ];

    for (const achievement of levelAchievements) {
      if (
        level >= achievement.level &&
        !this.achievementsUnlocked.has(achievement.id)
      ) {
        this.achievementsUnlocked.add(achievement.id);
        achievements.push(achievement.message);
      }
    }

    if (achievements.length > 0) {
      this.saveProgress();
    }

    return achievements;
  }

  getAllLevels() {
    const levels = [];
    for (let i = 1; i <= 10; i++) {
      levels.push(this.getLevelInfo(i));
    }
    return levels;
  }

  getAchievements() {
    return Array.from(this.achievementsUnlocked);
  }

  getStatistics() {
    const scores = web3Manager.getLocalScores();
    const userScores = scores.filter((s) => s.address === web3Manager.account);

    return {
      totalGames: userScores.length,
      highScore:
        userScores.length > 0 ? Math.max(...userScores.map((s) => s.score)) : 0,
      totalAliensKilled: userScores.reduce(
        (sum, s) => sum + (s.aliensKilled || 0),
        0
      ),
      averageScore:
        userScores.length > 0
          ? Math.round(
              userScores.reduce((sum, s) => sum + s.score, 0) /
                userScores.length
            )
          : 0,
      bestLevel:
        userScores.length > 0 ? Math.max(...userScores.map((s) => s.level)) : 0,
      achievementsCount: this.achievementsUnlocked.size,
      unlockedLevels: this.unlockedLevels,
    };
  }

  // Special level configurations for events or tournaments
  getSpecialLevels() {
    return [
      {
        id: "tournament_mode",
        name: "Tournament Mode",
        description: "Compete for the highest score in 5 minutes",
        timeLimit: 300000, // 5 minutes
        scoringMultiplier: 1.5,
        unlocked: this.unlockedLevels >= 5,
      },
      {
        id: "survival_mode",
        name: "Survival Mode",
        description: "Endless waves of aliens",
        timeLimit: null,
        scoringMultiplier: 1.2,
        unlocked: this.unlockedLevels >= 3,
      },
      {
        id: "boss_rush",
        name: "Boss Rush",
        description: "Fight only boss aliens",
        timeLimit: null,
        scoringMultiplier: 2.0,
        unlocked: this.unlockedLevels >= 8,
      },
    ];
  }

  generateRandomLevel() {
    // Generate a random level configuration for variety
    return {
      name: "Random Challenge",
      speedMultiplier: 0.5 + Math.random() * 2.5,
      healthMultiplier: 0.5 + Math.random() * 2.0,
      spawnRateMultiplier: 0.3 + Math.random() * 0.7,
      alienTypes: Math.floor(1 + Math.random() * 4),
      isRandom: true,
    };
  }

  // Daily challenge system
  getDailyChallenge() {
    const today = new Date().toDateString();
    const seed = this.stringToSeed(today);
    Math.random = this.seededRandom(seed); // Temporary override for consistency

    const challenge = {
      date: today,
      name: "Daily Challenge",
      description: this.getDailyChallengeDescription(),
      modifiers: this.generateDailyChallengeModifiers(),
      reward: "Double Score Points",
      completed: this.isDailyChallengeCompleted(today),
    };

    // Restore normal random
    Math.random = Math.random;

    return challenge;
  }

  stringToSeed(str) {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = (hash << 5) - hash + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return Math.abs(hash);
  }

  seededRandom(seed) {
    return function () {
      seed = (seed * 9301 + 49297) % 233280;
      return seed / 233280;
    };
  }

  getDailyChallengeDescription() {
    const descriptions = [
      "Survive with only rapid fire power-ups",
      "No shield power-ups allowed",
      "Double alien speed",
      "Triple alien health",
      "Rapid alien spawning",
      "Boss aliens only",
      "Limited ammunition",
      "Invisible aliens (brief flashing)",
      "Moving walls",
      "Gravity effects",
    ];
    return descriptions[Math.floor(Math.random() * descriptions.length)];
  }

  generateDailyChallengeModifiers() {
    return {
      speedMultiplier: 1.0 + Math.random() * 1.5,
      healthMultiplier: 1.0 + Math.random() * 2.0,
      spawnRateMultiplier: 0.3 + Math.random() * 0.4,
      specialRules: ["double_score", "limited_powerups"],
      alienTypes: 2 + Math.floor(Math.random() * 3),
    };
  }

  isDailyChallengeCompleted(date) {
    try {
      const completed = localStorage.getItem(
        "somniaSpaceDefender_dailyCompleted"
      );
      return completed === date;
    } catch {
      return false;
    }
  }

  markDailyChallengeCompleted(date) {
    try {
      localStorage.setItem("somniaSpaceDefender_dailyCompleted", date);
    } catch (error) {
      console.warn("Failed to save daily challenge completion:", error);
    }
  }

  // Leaderboard integration
  async submitScore(score, level, gameMode = "normal") {
    const scoreData = {
      score,
      level,
      gameMode,
      timestamp: Date.now(),
      address: web3Manager.account,
      achievements: this.checkLevelCompletion(score, level, 0), // Update with actual aliens killed
    };

    // Save locally first
    web3Manager.saveScoreLocally(score, level);

    // Try to save on blockchain if connected
    if (web3Manager.isConnected) {
      try {
        return await web3Manager.saveScore(score, level);
      } catch (error) {
        console.warn("Failed to save score to blockchain:", error);
        return false;
      }
    }

    return true;
  }

  // Get recommended level based on player performance
  getRecommendedLevel() {
    const stats = this.getStatistics();

    if (stats.totalGames === 0) return 1;
    if (stats.averageScore < 500) return Math.max(1, this.unlockedLevels - 1);
    if (stats.averageScore < 1000) return this.unlockedLevels;
    if (stats.averageScore < 2500) return Math.min(10, this.unlockedLevels + 1);

    return Math.min(10, this.unlockedLevels + 2);
  }

  // Tutorial system
  getTutorialSteps() {
    return [
      {
        step: 1,
        title: "Welcome to Space Defender!",
        description: "Use WASD or arrow keys to move your spaceship",
        target: "movement",
      },
      {
        step: 2,
        title: "Shooting",
        description: "Press SPACE or J to shoot at incoming aliens",
        target: "shooting",
      },
      {
        step: 3,
        title: "Power-ups",
        description: "Collect power-ups to enhance your abilities",
        target: "powerups",
      },
      {
        step: 4,
        title: "Health & Lives",
        description: "Avoid alien contact or you'll take damage",
        target: "health",
      },
      {
        step: 5,
        title: "Level Progression",
        description: "Kill aliens to advance through 10 difficulty levels",
        target: "levels",
      },
      {
        step: 6,
        title: "Web3 Integration",
        description:
          "Connect your wallet to save high scores on Somnia blockchain",
        target: "web3",
      },
    ];
  }

  isTutorialCompleted() {
    try {
      return (
        localStorage.getItem("somniaSpaceDefender_tutorialCompleted") === "true"
      );
    } catch {
      return false;
    }
  }

  markTutorialCompleted() {
    try {
      localStorage.setItem("somniaSpaceDefender_tutorialCompleted", "true");
    } catch (error) {
      console.warn("Failed to save tutorial completion:", error);
    }
  }
}

// Create global level manager instance
const levelManager = new LevelManager();

console.log("📊 Level Manager Loaded");
