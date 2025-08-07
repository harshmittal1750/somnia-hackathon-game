// API Service for Backend Communication
class APIService {
  constructor() {
    this.baseURL = CONFIG.API.BASE_URL || "http://localhost:3000/api";
    this.timeout = 10000; // 10 seconds
  }

  /**
   * Make HTTP request with error handling
   */
  async request(endpoint, options = {}) {
    const url = `${this.baseURL}${endpoint}`;
    const defaultOptions = {
      headers: {
        "Content-Type": "application/json",
      },
      timeout: this.timeout,
    };

    // Add player address to headers if available
    if (web3Manager && web3Manager.account) {
      defaultOptions.headers["X-Player-Address"] = web3Manager.account;
    }

    const finalOptions = { ...defaultOptions, ...options };

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), this.timeout);

      const response = await fetch(url, {
        ...finalOptions,
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(
          errorData.error || `HTTP ${response.status}: ${response.statusText}`
        );
      }

      return await response.json();
    } catch (error) {
      if (error.name === "AbortError") {
        throw new Error("Request timeout");
      }
      console.error(`API Error [${endpoint}]:`, error);
      throw error;
    }
  }

  /**
   * Submit game score to backend
   */
  async submitScore(scoreData) {
    return await this.request("/game/submit-score", {
      method: "POST",
      body: JSON.stringify(scoreData),
    });
  }

  /**
   * Get global leaderboard
   */
  async getLeaderboard(gameMode = "normal", limit = 100) {
    return await this.request(
      `/leaderboard/global?gameMode=${gameMode}&limit=${limit}`
    );
  }

  /**
   * Get level-specific leaderboard
   */
  async getLevelLeaderboard(level, limit = 50) {
    return await this.request(`/leaderboard/level/${level}?limit=${limit}`);
  }

  /**
   * Get weekly leaderboard
   */
  async getWeeklyLeaderboard(limit = 50) {
    return await this.request(`/leaderboard/weekly?limit=${limit}`);
  }

  /**
   * Get player rank
   */
  async getPlayerRank(address, gameMode = "normal") {
    return await this.request(
      `/leaderboard/rank/${address}?gameMode=${gameMode}`
    );
  }

  /**
   * Get player statistics
   */
  async getPlayerStats(address) {
    return await this.request(`/player/${address}`);
  }

  /**
   * Get player's game history
   */
  async getPlayerHistory(address, options = {}) {
    const params = new URLSearchParams(options).toString();
    return await this.request(`/player/${address}/games?${params}`);
  }

  /**
   * Get all achievements
   */
  async getAchievements() {
    return await this.request("/achievements");
  }

  /**
   * Get player's achievements
   */
  async getPlayerAchievements(address) {
    return await this.request(`/achievements/player/${address}`);
  }

  /**
   * Get achievement leaderboard
   */
  async getAchievementLeaderboard(limit = 50) {
    return await this.request(`/achievements/leaderboard?limit=${limit}`);
  }

  /**
   * Get recent achievement unlocks
   */
  async getRecentAchievements(limit = 20) {
    return await this.request(`/achievements/recent?limit=${limit}`);
  }

  /**
   * Get game statistics
   */
  async getGameStats() {
    return await this.request("/game/stats");
  }

  /**
   * Compare two players
   */
  async comparePlayers(address1, address2) {
    return await this.request(`/player/compare/${address1}/${address2}`);
  }

  /**
   * Update player profile
   */
  async updatePlayerProfile(address, profileData) {
    return await this.request(`/player/${address}`, {
      method: "PUT",
      body: JSON.stringify(profileData),
    });
  }

  /**
   * Check API health
   */
  async healthCheck() {
    try {
      const response = await fetch(
        `${this.baseURL.replace("/api", "")}/health`
      );
      return await response.json();
    } catch (error) {
      console.error("Health check failed:", error);
      return { status: "ERROR", error: error.message };
    }
  }

  /**
   * Generate game session ID
   */
  generateGameSession() {
    const timestamp = Date.now();
    const random = Math.random().toString(36).substring(2);
    const address = web3Manager?.account || "anonymous";

    return `${address.slice(0, 8)}-${timestamp}-${random}`;
  }

  /**
   * Get cached data with fallback
   */
  getCachedData(key, fallback = null) {
    try {
      const cached = localStorage.getItem(`api_cache_${key}`);
      if (cached) {
        const { data, timestamp } = JSON.parse(cached);
        // Cache for 5 minutes
        if (Date.now() - timestamp < 5 * 60 * 1000) {
          return data;
        }
      }
    } catch (error) {
      console.warn("Cache read error:", error);
    }
    return fallback;
  }

  /**
   * Set cached data
   */
  setCachedData(key, data) {
    try {
      localStorage.setItem(
        `api_cache_${key}`,
        JSON.stringify({
          data,
          timestamp: Date.now(),
        })
      );
    } catch (error) {
      console.warn("Cache write error:", error);
    }
  }

  /**
   * Get leaderboard with caching
   */
  async getLeaderboardCached(gameMode = "normal", limit = 100) {
    const cacheKey = `leaderboard_${gameMode}_${limit}`;
    const cached = this.getCachedData(cacheKey);

    if (cached) {
      return cached;
    }

    try {
      const data = await this.getLeaderboard(gameMode, limit);
      this.setCachedData(cacheKey, data);
      return data;
    } catch (error) {
      // Return cached data even if expired on error
      return (
        this.getCachedData(cacheKey) || {
          leaderboard: [],
          error: error.message,
        }
      );
    }
  }

  /**
   * Validate network connectivity
   */
  async validateConnection() {
    try {
      const health = await this.healthCheck();
      return health.status === "OK";
    } catch (error) {
      return false;
    }
  }

  /**
   * Batch multiple API calls
   */
  async batchRequests(requests) {
    try {
      const promises = requests.map(({ endpoint, options }) =>
        this.request(endpoint, options).catch((error) => ({
          error: error.message,
        }))
      );

      return await Promise.all(promises);
    } catch (error) {
      console.error("Batch request error:", error);
      throw error;
    }
  }
}

// Create global instance
const apiService = new APIService();
