// Somnia Space Defender - Configuration
const GAME = {
  BASE_WIDTH: 800,
  BASE_HEIGHT: 600,
};
const CONFIG = {
  // Somnia Testnet Configuration
  NETWORK: {
    chainId: "0xc488", // Somnia Testnet Chain ID (50312 in hex)
    chainName: "Somnia Testnet",
    rpcUrls: ["https://dream-rpc.somnia.network"],
    blockExplorerUrls: ["https://shannon-explorer.somnia.network"],
    nativeCurrency: {
      name: "STT",
      symbol: "STT",
      decimals: 18,
    },
  },

  // Smart Contract Addresses (Deployed on Somnia Testnet)
  CONTRACTS: {
    GAME_SCORE: "0x4912aFEA272C0283FDe9804480422a8046EC1908", // 🛡️ MINIMAL SSD REWARDS CONTRACT!
    SSD_TOKEN: "0xeDFd8C7E14f5D491Cf9063076a4FcE60737170dE", // SSD Token Contract ✅
  },

  // Backend API Configuration
  API: {
    BASE_URL: "https://somnia-space-defender-backend.vercel.app/api",

    TIMEOUT: 10000,
    RETRY_ATTEMPTS: 3,
  },

  // 🎮 SSD Token Integration
  SSD: {
    REWARD_PER_KILL: "0.01", // SSD tokens per alien kill
    TWITTER_REWARD: "5", // SSD tokens for Twitter verification
    SYMBOL: "SSD",
    DECIMALS: 18,
    EUCLID_SWAP_URL: "https://testnet.euclidswap.io/pools/ssd.eucl-stt",
  },

  // Game Constants
  GAME: {
    CANVAS_WIDTH: window.innerWidth * 0.78 || GAME.BASE_WIDTH, // Fullscreen width
    CANVAS_HEIGHT: window.innerHeight * 0.82 || GAME.BASE_HEIGHT, // Fullscreen height
    FPS: 60,

    // Player Ship Settings
    PLAYER: {
      WIDTH: 48,
      HEIGHT: 48,
      SPEED: 0.5, // pixels per millisecond (much more reasonable)
      MAX_HEALTH: 1,
      WEAPON_COOLDOWN: 100, // milliseconds (faster shooting)
      RESPAWN_IMMUNITY: 2000, // milliseconds
    },

    // Bullet Settings
    BULLET: {
      WIDTH: 4,
      HEIGHT: 12,
      SPEED: 12, // faster bullets
      DAMAGE: 1,
    },

    // Alien Settings
    ALIEN: {
      WIDTH: 32,
      HEIGHT: 32,
      BASE_SPEED: 0.5, // slower base speed
      BASE_HEALTH: 1,
      SPAWN_RATE: 2500, // milliseconds (slower spawn rate)
      POINTS: 10,
    },

    // Power-up Settings
    POWERUP: {
      WIDTH: 24,
      HEIGHT: 24,
      SPEED: 2,
      SPAWN_CHANCE: 0.15, // 15% chance on alien death
      DURATION: 5000, // milliseconds
    },

    // Level Progression
    LEVELS: {
      1: {
        name: "Rookie",
        speedMultiplier: 1.0,
        healthMultiplier: 1.0,
        spawnRateMultiplier: 1.0,
        alienTypes: 1,
      },
      2: {
        name: "Cadet",
        speedMultiplier: 1.1,
        healthMultiplier: 1.0,
        spawnRateMultiplier: 0.95,
        alienTypes: 1,
      },
      3: {
        name: "Pilot",
        speedMultiplier: 1.15,
        healthMultiplier: 1.1,
        spawnRateMultiplier: 0.9,
        alienTypes: 2,
      },
      4: {
        name: "Ace",
        speedMultiplier: 1.2,
        healthMultiplier: 1.2,
        spawnRateMultiplier: 0.85,
        alienTypes: 2,
      },
      5: {
        name: "Veteran",
        speedMultiplier: 1.3,
        healthMultiplier: 1.3,
        spawnRateMultiplier: 0.8,
        alienTypes: 2,
      },
      6: {
        name: "Elite",
        speedMultiplier: 1.4,
        healthMultiplier: 1.5,
        spawnRateMultiplier: 0.75,
        alienTypes: 3,
      },
      7: {
        name: "Legend",
        speedMultiplier: 1.5,
        healthMultiplier: 1.7,
        spawnRateMultiplier: 0.7,
        alienTypes: 3,
      },
      8: {
        name: "Master",
        speedMultiplier: 1.6,
        healthMultiplier: 2.0,
        spawnRateMultiplier: 0.65,
        alienTypes: 3,
      },
      9: {
        name: "Nightmare",
        speedMultiplier: 1.8,
        healthMultiplier: 2.5,
        spawnRateMultiplier: 0.6,
        alienTypes: 4,
      },
      10: {
        name: "INSANE",
        speedMultiplier: 2.0,
        healthMultiplier: 3.0,
        spawnRateMultiplier: 0.55,
        alienTypes: 4,
      },
    },

    // Alien Types
    ALIEN_TYPES: {
      BASIC: {
        speed: 0.1,
        health: 1,
        points: 10,
        color: "#ff4444",
        pattern: "straight",
      },
      FAST: {
        speed: 2,
        health: 1,
        points: 20,
        color: "#44ff44",
        pattern: "zigzag",
      },
      TANK: {
        speed: 0.5,
        health: 3,
        points: 30,
        color: "#4444ff",
        pattern: "straight",
      },
      BOSS: {
        speed: 0.8,
        health: 5,
        points: 100,
        color: "#ff44ff",
        pattern: "circle",
      },
    },

    // Power-up Types
    POWERUP_TYPES: {
      RAPID_FIRE: {
        type: "rapid_fire",
        color: "#ffff00",
        effect: "Rapid Fire",
        duration: 5000,
      },
      SHIELD: {
        type: "shield",
        color: "#00ffff",
        effect: "Energy Shield",
        duration: 8000,
      },
      MULTI_SHOT: {
        type: "multi_shot",
        color: "#ff8800",
        effect: "Multi-Shot",
        duration: 6000,
      },
      HEALTH: {
        type: "health",
        color: "#00ff00",
        effect: "Health Boost",
        duration: 0, // Instant effect
      },
    },

    // Particle Effects
    PARTICLES: {
      EXPLOSION: {
        count: 15,
        speed: 3,
        life: 30,
        colors: ["#ff4444", "#ff8844", "#ffff44"],
      },
      TRAIL: {
        count: 3,
        speed: 1,
        life: 20,
        colors: ["#4444ff", "#8888ff"],
      },
      small: {
        count: 8,
        speed: 2,
        life: 20,
        colors: ["#ffaa44", "#ff6644"],
      },
    },

    // Audio Settings
    AUDIO: {
      MASTER_VOLUME: 0.7,
      SFX_VOLUME: 0.8,
      MUSIC_VOLUME: 0.5,
    },

    // Performance Settings
    PERFORMANCE: {
      MAX_PARTICLES: 200,
      MAX_BULLETS: 50,
      MAX_ALIENS: 30,
      CLEANUP_INTERVAL: 60, // frames
    },
  },

  // UI Constants
  UI: {
    ANIMATION_DURATION: 300,
    NOTIFICATION_DURATION: 3000,
    SCORE_INCREMENT_ANIMATION: 500,
  },

  // Development Settings
  DEBUG: {
    SHOW_FPS: false,
    SHOW_HITBOXES: false,
    GOD_MODE: false,
    SKIP_INTRO: false,
  },
};

// Export for use in other modules
if (typeof module !== "undefined" && module.exports) {
  module.exports = CONFIG;
}

// Utility Functions
const UTILS = {
  // Clamp value between min and max
  clamp: (value, min, max) => Math.min(Math.max(value, min), max),

  // Linear interpolation
  lerp: (start, end, factor) => start + (end - start) * factor,

  // Distance between two points
  distance: (x1, y1, x2, y2) => Math.sqrt((x2 - x1) ** 2 + (y2 - y1) ** 2),

  // Random integer between min and max (inclusive)
  randomInt: (min, max) => Math.floor(Math.random() * (max - min + 1)) + min,

  // Random float between min and max
  randomFloat: (min, max) => Math.random() * (max - min) + min,

  // Check collision between two rectangles
  checkCollision: (rect1, rect2) => {
    return (
      rect1.x < rect2.x + rect2.width &&
      rect1.x + rect1.width > rect2.x &&
      rect1.y < rect2.y + rect2.height &&
      rect1.y + rect1.height > rect2.y
    );
  },

  // Format score with commas
  formatScore: (score) =>
    score.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ","),

  // Format wallet address for display
  formatAddress: (address) => `${address.slice(0, 6)}...${address.slice(-4)}`,

  // Generate random ID
  generateId: () => Math.random().toString(36).substr(2, 9),

  // Debounce function
  debounce: (func, wait) => {
    let timeout;
    return function executedFunction(...args) {
      const later = () => {
        clearTimeout(timeout);
        func(...args);
      };
      clearTimeout(timeout);
      timeout = setTimeout(later, wait);
    };
  },

  // Throttle function
  throttle: (func, limit) => {
    let inThrottle;
    return function () {
      const args = arguments;
      const context = this;
      if (!inThrottle) {
        func.apply(context, args);
        inThrottle = true;
        setTimeout(() => (inThrottle = false), limit);
      }
    };
  },
};

// Color utilities
const COLORS = {
  // Convert hex to RGB
  hexToRgb: (hex) => {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result
      ? {
          r: parseInt(result[1], 16),
          g: parseInt(result[2], 16),
          b: parseInt(result[3], 16),
        }
      : null;
  },

  // Create RGBA string
  rgba: (r, g, b, a = 1) => `rgba(${r}, ${g}, ${b}, ${a})`,

  // Create HSL string
  hsl: (h, s, l) => `hsl(${h}, ${s}%, ${l}%)`,

  // Lighten color
  lighten: (color, amount) => {
    const rgb = COLORS.hexToRgb(color);
    if (!rgb) return color;

    const r = Math.min(255, rgb.r + amount);
    const g = Math.min(255, rgb.g + amount);
    const b = Math.min(255, rgb.b + amount);

    return `rgb(${r}, ${g}, ${b})`;
  },
};

// Game State Constants
const GAME_STATES = {
  LOADING: "loading",
  CONNECTING: "connecting",
  MENU: "menu",
  PLAYING: "playing",
  PAUSED: "paused",
  GAME_OVER: "game_over",
  LEADERBOARD: "leaderboard",
};

console.log("🚀 Somnia Space Defender Config Loaded");
