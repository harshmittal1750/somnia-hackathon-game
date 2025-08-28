// Space Defender - Configuration
const GAME = {
  BASE_WIDTH: 800,
  BASE_HEIGHT: 600,
};
const CONFIG = {
  // Multi-Network Support - RISE and Somnia
  SUPPORTED_NETWORKS: {
    "0xaa39db": {
      // RISE Testnet (11155931)
      chainId: "0xaa39db",
      chainName: "RISE Testnet",
      rpcUrls: ["https://testnet.riselabs.xyz"],
      blockExplorerUrls: ["https://explorer.testnet.riselabs.xyz"],
      nativeCurrency: {
        name: "ETH",
        symbol: "ETH",
        decimals: 18,
      },
      bridgeUrl: "https://bridge-ui.testnet.riselabs.xyz",
      faucetUrl: "https://faucet.risechain.com/",
    },
    "0xc488": {
      // Somnia Testnet (50312)
      chainId: "0xc488",
      chainName: "Somnia Testnet",
      rpcUrls: ["https://dream-rpc.somnia.network"],
      blockExplorerUrls: ["https://shannon-explorer.somnia.network"],
      nativeCurrency: {
        name: "STT",
        symbol: "STT",
        decimals: 18,
      },
      bridgeUrl: "",
    },
  },

  // Primary Network (RISE Testnet by default)
  NETWORK: {
    chainId: "0xaa39db", // RISE Testnet Chain ID (11155931 in hex)
    chainName: "RISE Testnet",
    rpcUrls: ["https://testnet.riselabs.xyz"],
    blockExplorerUrls: ["https://explorer.testnet.riselabs.xyz"],
    nativeCurrency: {
      name: "ETH",
      symbol: "ETH",
      decimals: 18,
    },
  },

  // Smart Contract Addresses (Multi-Network)
  CONTRACTS: {
    // RISE Testnet Contracts
    "0xaa39db": {
      GAME_SCORE: "0x8FDc1a64c45dD36550fCbd61405bE57de884A29A", // RISE Game Contract
      SD_TOKEN: "0xe7c120Da02A3dD724f2ED9D7B0eEdC2652475Df8", // RISE SD Token
    },
    // Somnia Testnet Contracts
    "0xc488": {
      GAME_SCORE: "0x4AB51147CB615DF6630BD91b3a6dCfe5BbEe1041", // Existing Somnia Contract
      SD_TOKEN: "0x1169936CB958c0E39c91Cf4A9A5C0d8B7103FD8F", // Existing Somnia SD Token (now SD)
    },
  },

  // Helper function to get current network contracts
  getCurrentContracts() {
    const currentChainId =
      (typeof window !== "undefined" && window.ethereum?.chainId) ||
      this.NETWORK.chainId;
    return this.CONTRACTS[currentChainId] || this.CONTRACTS["0xaa39db"]; // Default to RISE
  },

  // Backend API Configuration
  API: {
    BASE_URL:
      typeof window !== "undefined" &&
      window.location.origin.includes("localhost")
        ? "http://localhost:3000/api"
        : "https://somnia-space-defender-backend.vercel.app/api",

    TIMEOUT: 10000,
    RETRY_ATTEMPTS: 3,
  },

  // // WalletConnect Configuration (optional)
  // WALLETCONNECT: {
  //   PROJECT_ID: process.env.PROJECT_ID,
  //   // Get a project ID from: https://cloud.walletconnect.com/
  // },

  // 🎮 SD Token Integration (Multi-Chain Bridgeable)
  SD: {
    REWARD_PER_KILL: "0.01", // SD tokens per alien kill
    TWITTER_REWARD: "1", // SD tokens for Twitter verification
    SYMBOL: "SD",
    DECIMALS: 18,
    // Bridge configuration for multi-chain support
    BRIDGE: {
      ENABLED: true,
      SUPPORTED_CHAINS: [
        {
          chainId: "0xaa39db", // RISE Testnet
          name: "RISE Testnet",
          rpcUrl: "https://testnet.riselabs.xyz",
          explorer: "https://explorer.testnet.riselabs.xyz",
          bridgeContract: "0x8FDc1a64c45dD36550fCbd61405bE57de884A29A", // RISE Game Contract with bridge functionality
          tokenContract: "0xe7c120Da02A3dD724f2ED9D7B0eEdC2652475Df8", // RISE SD Token
        },
        {
          chainId: "0xc488", // Somnia Testnet
          name: "Somnia Testnet",
          rpcUrl: "https://dream-rpc.somnia.network",
          explorer: "https://shannon-explorer.somnia.network",
          bridgeContract: "", // To be deployed
          tokenContract: "0x1169936CB958c0E39c91Cf4A9A5C0d8B7103FD8F", // Existing token
        },
      ],
      BRIDGE_UI_URL: "https://bridge-ui.testnet.riselabs.xyz",
    },
    // DEX/Swap integration (to be updated for RISE ecosystem)
    SWAP_URL: "https://bridge-ui.testnet.riselabs.xyz",
  },

  // Game Constants
  GAME: {
    CANVAS_WIDTH:
      (typeof window !== "undefined" ? window.innerWidth * 0.78 : null) ||
      GAME.BASE_WIDTH, // Fullscreen width
    CANVAS_HEIGHT:
      (typeof window !== "undefined" ? window.innerHeight * 0.82 : null) ||
      GAME.BASE_HEIGHT, // Fullscreen height
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
      WIDTH: 8, // Increased from 4 to 8 for easier hitting
      HEIGHT: 12,
      SPEED: 12, // faster bullets
      DAMAGE: 1,
      COLLISION_PADDING: 6, // Extra pixels for forgiving hit detection
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

    // Alien Types - Enhanced with More Varieties
    ALIEN_TYPES: {
      BASIC: {
        speed: 0.1,
        health: 1,
        points: 10,
        color: "#ff4444",
        pattern: "straight",
        abilities: [],
      },
      FAST: {
        speed: 2,
        health: 1,
        points: 20,
        color: "#44ff44",
        pattern: "zigzag",
        abilities: ["dodge"],
      },
      TANK: {
        speed: 0.5,
        health: 3,
        points: 30,
        color: "#4444ff",
        pattern: "straight",
        abilities: ["armor"],
      },
      BOSS: {
        speed: 0.8,
        health: 5,
        points: 100,
        color: "#ff44ff",
        pattern: "circle",
        abilities: ["regenerate"],
      },
      // 👾 New Alien Types
      SWARM: {
        speed: 1.5,
        health: 1,
        points: 15,
        color: "#ffff44",
        pattern: "swarm", // Moves in groups
        abilities: ["group_behavior"],
        spawnCount: 3, // Spawns in groups of 3
      },
      STEALTH: {
        speed: 1.2,
        health: 2,
        points: 40,
        color: "#8844ff",
        pattern: "phase", // Phases in/out of visibility
        abilities: ["stealth", "phase"],
        stealthCooldown: 3000,
        stealthDuration: 1500,
      },
      BERSERKER: {
        speed: 0.3,
        health: 4,
        points: 50,
        color: "#ff8844",
        pattern: "charge", // Accelerates when damaged
        abilities: ["rage", "charge"],
        rageMultiplier: 1.5,
        chargeThreshold: 0.5, // Charges when <50% health
      },
      SHIELDED: {
        speed: 0.7,
        health: 2,
        points: 35,
        color: "#44ffff",
        pattern: "defensive",
        abilities: ["energy_shield"],
        shieldHealth: 2,
        shieldRegenDelay: 4000,
      },
      SPLITTER: {
        speed: 0.8,
        health: 2,
        points: 25,
        color: "#ff44aa",
        pattern: "split", // Splits into smaller aliens when killed
        abilities: ["split_on_death"],
        splitCount: 2,
        splitType: "BASIC",
      },
      BOMBER: {
        speed: 1.0,
        health: 1,
        points: 30,
        color: "#ffaa44",
        pattern: "kamikaze", // Explodes when reaching player
        abilities: ["explosive_death"],
        explosionRadius: 50,
        explosionDamage: 2,
      },
      HEALER: {
        speed: 0.6,
        health: 3,
        points: 60,
        color: "#44ff88",
        pattern: "support", // Heals nearby aliens
        abilities: ["heal_others"],
        healRange: 80,
        healAmount: 1,
        healCooldown: 2000,
      },
      MEGA_BOSS: {
        speed: 0.4,
        health: 15,
        points: 500,
        color: "#ff0088",
        pattern: "mega", // Multiple attack patterns
        abilities: ["multi_phase", "spawn_minions", "area_attack"],
        phases: 3,
        minionSpawnRate: 5000,
      },
    },

    // Bullet Types - Enhanced Weapon System
    BULLET_TYPES: {
      STANDARD: {
        type: "standard",
        color: "#ffffff",
        trailColor: "#4444ff",
        damage: 1,
        speed: 12,
        piercing: false,
        splash: false,
        effect: "none",
      },
      LIGHTNING: {
        type: "lightning",
        color: "#00ffff",
        trailColor: "#8888ff",
        damage: 2,
        speed: 15,
        piercing: true, // Can hit multiple enemies
        splash: false,
        effect: "chain", // Chains between nearby enemies
        chainRange: 80,
        maxChains: 3,
      },
      FIRE: {
        type: "fire",
        color: "#ff4444",
        trailColor: "#ff8844",
        damage: 1,
        speed: 10,
        piercing: false,
        splash: true, // Area damage
        effect: "burn", // Damage over time
        splashRadius: 40,
        burnDuration: 3000,
        burnDamage: 0.5,
      },
      WAVE: {
        type: "wave",
        color: "#44ff44",
        trailColor: "#88ff88",
        damage: 3,
        speed: 8,
        piercing: true,
        splash: false,
        effect: "wave", // Oscillating movement
        amplitude: 30,
        frequency: 0.01,
      },
      PLASMA: {
        type: "plasma",
        color: "#ff44ff",
        trailColor: "#ff88ff",
        damage: 4,
        speed: 14,
        piercing: false,
        splash: true,
        effect: "plasma", // Energy burst
        splashRadius: 60,
        energyPulse: true,
      },
      ICE: {
        type: "ice",
        color: "#88ffff",
        trailColor: "#bbffff",
        damage: 1,
        speed: 9,
        piercing: false,
        splash: true,
        effect: "freeze", // Slows enemies
        splashRadius: 35,
        slowDuration: 2000,
        slowFactor: 0.5,
      },
    },

    // Power-up Types - Enhanced with Weapon Upgrades
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
      // 🔫 New Weapon Power-ups
      LIGHTNING_WEAPON: {
        type: "lightning_weapon",
        color: "#00ffff",
        effect: "Lightning Bullets",
        duration: 8000,
      },
      FIRE_WEAPON: {
        type: "fire_weapon",
        color: "#ff4444",
        effect: "Fire Bullets",
        duration: 8000,
      },
      WAVE_WEAPON: {
        type: "wave_weapon",
        color: "#44ff44",
        effect: "Wave Bullets",
        duration: 8000,
      },
      PLASMA_WEAPON: {
        type: "plasma_weapon",
        color: "#ff44ff",
        effect: "Plasma Cannon",
        duration: 10000,
      },
      ICE_WEAPON: {
        type: "ice_weapon",
        color: "#88ffff",
        effect: "Ice Blaster",
        duration: 8000,
      },
    },

    // Enhanced Particle Effects
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
      // 🔫 New Weapon Effects
      LIGHTNING_ARC: {
        count: 8,
        speed: 2,
        life: 15,
        colors: ["#00ffff", "#8888ff", "#ffffff"],
      },
      PLASMA_EXPLOSION: {
        count: 20,
        speed: 4,
        life: 25,
        colors: ["#ff44ff", "#ff88ff", "#ffffff"],
      },
      SPLASH_EXPLOSION: {
        count: 12,
        speed: 2.5,
        life: 20,
        colors: ["#ff4444", "#ff8844", "#ffaa44"],
      },
      FIRE_TRAIL: {
        count: 6,
        speed: 1.5,
        life: 25,
        colors: ["#ff4444", "#ff8844", "#ffaa44"],
      },
      ICE_SHARDS: {
        count: 10,
        speed: 3,
        life: 30,
        colors: ["#88ffff", "#bbffff", "#ffffff"],
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
    SHOW_FPS: true,
    SHOW_HITBOXES: false,
    GOD_MODE: true,
    SKIP_INTRO: false,
  },

  // Performance Settings
  PERFORMANCE: {
    AUTO_OPTIMIZATION: true, // Automatically enable optimizations on low-end hardware
    FORCE_PERFORMANCE_MODE: false, // Manually force performance mode
    BULLET_POOLING: true, // Use bullet object pooling for better memory management
    REDUCED_PARTICLES: false, // Reduce particle effects for better performance
    SIMPLIFIED_TRAILS: false, // Use simpler bullet trails
  },
};

// Export for use in other modules
if (typeof module !== "undefined" && module.exports) {
  module.exports = CONFIG;
}

// Network Utility Functions
const NETWORK_UTILS = {
  // Check if a network is supported
  isSupportedNetwork(chainId) {
    return !!CONFIG.SUPPORTED_NETWORKS[chainId];
  },

  // Get network info by chain ID
  getNetworkInfo(chainId) {
    return CONFIG.SUPPORTED_NETWORKS[chainId] || null;
  },

  // Get contracts for current chain
  getCurrentContracts(chainId) {
    return CONFIG.CONTRACTS[chainId] || CONFIG.CONTRACTS["0xaa39db"];
  },

  // Get all supported chain IDs
  getSupportedChainIds() {
    return Object.keys(CONFIG.SUPPORTED_NETWORKS);
  },

  // Get network display name
  getNetworkName(chainId) {
    const network = this.getNetworkInfo(chainId);
    return network ? network.chainName : "Unknown Network";
  },

  // Check if bridging is available between networks
  canBridge(fromChainId, toChainId) {
    return (
      this.isSupportedNetwork(fromChainId) &&
      this.isSupportedNetwork(toChainId) &&
      fromChainId !== toChainId
    );
  },
};

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

  // Enhanced collision detection with padding for better gameplay
  checkEnhancedCollision: (rect1, rect2, padding = 4) => {
    return (
      rect1.x < rect2.x + rect2.width + padding &&
      rect1.x + rect1.width > rect2.x - padding &&
      rect1.y < rect2.y + rect2.height + padding &&
      rect1.y + rect1.height > rect2.y - padding
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

console.log(
  "🚀 Space Defender Config Loaded - Multi-Network Support (RISE + Somnia) Ready!"
);
