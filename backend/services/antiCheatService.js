const crypto = require("crypto");

class AntiCheatService {
  constructor() {
    // Game validation constants
    this.MAX_SCORE = 1000000;
    this.MAX_ALIENS_KILLED = 10000;
    this.MIN_SCORE_PER_ALIEN = parseInt(process.env.MIN_SCORE_PER_ALIEN) || 5;
    this.MAX_SCORE_PER_ALIEN = parseInt(process.env.MAX_SCORE_PER_ALIEN) || 150;

    // Level-based maximum scores
    this.MAX_SCORE_PER_LEVEL = [
      1000, // Level 1
      3000, // Level 2
      6000, // Level 3
      10000, // Level 4
      15000, // Level 5
      25000, // Level 6
      40000, // Level 7
      60000, // Level 8
      100000, // Level 9
      200000, // Level 10
    ];

    // Timing validation
    this.MIN_PLAY_TIME = 10; // seconds
    this.MAX_PLAY_TIME_PER_LEVEL = [
      300, // Level 1: 5 minutes
      480, // Level 2: 8 minutes
      600, // Level 3: 10 minutes
      720, // Level 4: 12 minutes
      900, // Level 5: 15 minutes
      1080, // Level 6: 18 minutes
      1260, // Level 7: 21 minutes
      1440, // Level 8: 24 minutes
      1800, // Level 9: 30 minutes
      2400, // Level 10: 40 minutes
    ];

    // Track game sessions to prevent replay attacks
    this.activeSessions = new Map();
    this.sessionTimeout = 30 * 60 * 1000; // 30 minutes
  }

  /**
   * Validate game score submission
   */
  async validateScore(scoreData) {
    const { score, level, aliensKilled, gameSession, playTime, playerAddress } =
      scoreData;

    const validation = {
      valid: true,
      reason: "",
      details: {
        basicValidation: false,
        scoreRatioValidation: false,
        levelValidation: false,
        timeConsistent: false,
        sessionValidation: false,
        levelProgression: false,
      },
    };

    try {
      // 1. Basic bounds checking
      if (!this.validateBasicBounds(score, level, aliensKilled)) {
        validation.valid = false;
        validation.reason =
          "Basic validation failed: score, level, or aliens killed out of bounds";
        return validation;
      }
      validation.details.basicValidation = true;

      // 2. Score-to-aliens ratio validation
      if (!this.validateScoreRatio(score, aliensKilled)) {
        validation.valid = false;
        validation.reason = "Score-to-aliens ratio is suspicious";
        return validation;
      }
      validation.details.scoreRatioValidation = true;

      // 3. Level-based maximum score validation
      if (!this.validateLevelScore(score, level)) {
        validation.valid = false;
        validation.reason = "Score exceeds maximum for level";
        return validation;
      }
      validation.details.levelValidation = true;

      // 4. Play time validation
      if (!this.validatePlayTime(playTime, level, score)) {
        validation.valid = false;
        validation.reason = "Play time inconsistent with score/level";
        return validation;
      }
      validation.details.timeConsistent = true;

      // 5. Game session validation
      if (!this.validateGameSession(gameSession, playerAddress)) {
        validation.valid = false;
        validation.reason = "Invalid or expired game session";
        return validation;
      }
      validation.details.sessionValidation = true;

      // 6. Level progression validation (basic)
      if (!this.validateLevelProgression(level, aliensKilled)) {
        validation.valid = false;
        validation.reason = "Level progression inconsistent with aliens killed";
        return validation;
      }
      validation.details.levelProgression = true;

      return validation;
    } catch (error) {
      console.error("Score validation error:", error);
      validation.valid = false;
      validation.reason = "Validation system error";
      return validation;
    }
  }

  /**
   * Validate basic bounds
   */
  validateBasicBounds(score, level, aliensKilled) {
    if (score < 0 || score > this.MAX_SCORE) return false;
    if (level < 1 || level > 10) return false;
    if (aliensKilled < 0 || aliensKilled > this.MAX_ALIENS_KILLED) return false;
    return true;
  }

  /**
   * Validate score-to-aliens ratio
   */
  validateScoreRatio(score, aliensKilled) {
    if (aliensKilled > 0) {
      const scorePerAlien = score / aliensKilled;
      if (
        scorePerAlien < this.MIN_SCORE_PER_ALIEN ||
        scorePerAlien > this.MAX_SCORE_PER_ALIEN
      ) {
        return false;
      }
    } else if (score > 100) {
      // Can't have high score with 0 aliens killed
      return false;
    }
    return true;
  }

  /**
   * Validate level-based maximum score
   */
  validateLevelScore(score, level) {
    const maxScoreForLevel = this.MAX_SCORE_PER_LEVEL[level - 1];
    return score <= maxScoreForLevel;
  }

  /**
   * Validate play time consistency
   */
  validatePlayTime(playTime, level, score) {
    // Minimum play time check
    if (playTime < this.MIN_PLAY_TIME) return false;

    // Maximum play time for level
    const maxTimeForLevel = this.MAX_PLAY_TIME_PER_LEVEL[level - 1];
    if (playTime > maxTimeForLevel) return false;

    // Score-to-time ratio (rough estimate)
    const scorePerSecond = score / playTime;
    if (scorePerSecond > 500) return false; // Too high score per second
    if (score > 1000 && scorePerSecond < 1) return false; // Too low for high scores

    return true;
  }

  /**
   * Validate game session
   */
  validateGameSession(gameSession, playerAddress) {
    if (!gameSession || gameSession.length < 10) return false;

    // Check if session is unique and not expired
    const sessionKey = `${playerAddress}-${gameSession}`;
    const now = Date.now();

    // Clean up expired sessions
    for (const [key, timestamp] of this.activeSessions.entries()) {
      if (now - timestamp > this.sessionTimeout) {
        this.activeSessions.delete(key);
      }
    }

    // Check if session already used
    if (this.activeSessions.has(sessionKey)) {
      return false; // Session replay attack
    }

    // Mark session as used
    this.activeSessions.set(sessionKey, now);

    return true;
  }

  /**
   * Validate level progression
   */
  validateLevelProgression(level, aliensKilled) {
    // Basic check: higher levels should generally have more aliens killed
    const expectedMinKills = Math.max(1, (level - 1) * 8); // Rough estimate

    if (level > 3 && aliensKilled < expectedMinKills / 2) {
      return false;
    }

    return true;
  }

  /**
   * Generate secure game session ID
   */
  generateGameSession(playerAddress) {
    const timestamp = Date.now();
    const random = crypto.randomBytes(16).toString("hex");
    const data = `${playerAddress}-${timestamp}-${random}`;

    return crypto
      .createHash("sha256")
      .update(data)
      .digest("hex")
      .substring(0, 32);
  }

  /**
   * Calculate risk score (0-100, higher = more suspicious)
   */
  calculateRiskScore(scoreData) {
    const { score, level, aliensKilled, playTime } = scoreData;
    let riskScore = 0;

    // Score ratio risk
    if (aliensKilled > 0) {
      const scorePerAlien = score / aliensKilled;
      if (scorePerAlien > 100) riskScore += 30;
      else if (scorePerAlien > 80) riskScore += 15;
    }

    // Time efficiency risk
    const scorePerSecond = score / playTime;
    if (scorePerSecond > 200) riskScore += 40;
    else if (scorePerSecond > 100) riskScore += 20;

    // Level progression risk
    const expectedScore = this.MAX_SCORE_PER_LEVEL[level - 1] * 0.7;
    if (score > expectedScore) riskScore += 20;

    // Play time risk
    const avgTimeForLevel = this.MAX_PLAY_TIME_PER_LEVEL[level - 1] * 0.5;
    if (playTime < avgTimeForLevel) riskScore += 15;

    return Math.min(100, riskScore);
  }

  /**
   * Get validation statistics
   */
  getValidationStats() {
    return {
      activeSessions: this.activeSessions.size,
      maxScorePerLevel: this.MAX_SCORE_PER_LEVEL,
      validationRules: {
        maxScore: this.MAX_SCORE,
        maxAliensKilled: this.MAX_ALIENS_KILLED,
        minScorePerAlien: this.MIN_SCORE_PER_ALIEN,
        maxScorePerAlien: this.MAX_SCORE_PER_ALIEN,
        sessionTimeout: this.sessionTimeout,
      },
    };
  }

  /**
   * Clean up expired sessions (call periodically)
   */
  cleanupSessions() {
    const now = Date.now();
    let cleaned = 0;

    for (const [key, timestamp] of this.activeSessions.entries()) {
      if (now - timestamp > this.sessionTimeout) {
        this.activeSessions.delete(key);
        cleaned++;
      }
    }

    console.log(`🧹 Cleaned up ${cleaned} expired game sessions`);
    return cleaned;
  }
}

module.exports = new AntiCheatService();
