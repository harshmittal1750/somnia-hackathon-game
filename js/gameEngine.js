//  Space Defender - Game Engine
class GameEngine {
  constructor() {
    this.canvas = null;
    this.ctx = null;
    this.gameState = GAME_STATES.LOADING;
    this.lastTime = 0;
    this.fps = 0;
    this.frameCount = 0;
    this.fpsUpdateTime = 0;

    // Game entities
    this.player = null;
    this.bullets = [];
    this.aliens = [];
    this.powerUps = [];
    this.particles = [];

    // Bullet pooling for better performance
    this.bulletPool = [];
    this.maxBulletPoolSize = 100;

    // Game state
    this.score = 0;
    this.level = 1;
    this.lives = CONFIG.GAME.PLAYER.MAX_HEALTH;
    this.aliensKilled = 0;
    this.highScore = 0;
    this.isPaused = false;
    this.gameStartTime = 0;
    this.gameSession = null; // 🛡️ Track session for anti-cheat
    this.scoreMultiplier = 1; // 🛍️ SD shop boost: 1x default, 2x with boost

    // Additional tracking for backend
    this.totalShots = 0;
    this.totalHits = 0;
    this.powerUpsCollected = 0;

    // Level management
    this.currentLevelConfig = null;
    this.alienSpawnTimer = 0;
    this.alienSpawnRate = CONFIG.GAME.ALIEN.SPAWN_RATE;
    this.aliensToSpawn = [];

    // Input handling
    this.keys = {};
    this.inputCooldown = {};

    // Touch controls state
    this.touchControls = {
      joystick: {
        active: false,
        startX: 0,
        startY: 0,
        currentX: 0,
        currentY: 0,
        deltaX: 0,
        deltaY: 0,
        maxDistance: 50,
      },
      fireButton: {
        active: false,
      },
    };
    this.isMobile = false;

    // Audio
    this.audioManager = null;
    this.soundEnabled = true;

    // Performance tracking
    this.entityCleanupTimer = 0;
    this.performanceMode = false;
    this.lastFPSCheck = 0;
    this.frameRateStable = true;
    this.lowPerformanceDetected = false;

    // Visual effects
    this.screenShake = 0;
    this.backgroundOffset = 0;

    // 🌌 Space Transition Effects
    this.isTransitioning = false;
    this.transitionProgress = 0;
    this.transitionType = "none";
    this.spaceAmbientParticles = [];
    this.levelTheme = "nebula"; // nebula, asteroid, deep_space, void, galaxy
    this.transitionCallback = null;

    // Visual effects for UI feedback
    this.floatingTexts = [];
    this.comboCounter = 0;
    this.comboTimer = 0;
    this.comboMultiplier = 1;

    this.init();
  }

  async init() {
    console.log("🎮 Initializing Game Engine...");

    this.canvas = document.getElementById("gameCanvas");
    this.ctx = this.canvas.getContext("2d");

    // Set canvas size
    this.canvas.width = CONFIG.GAME.CANVAS_WIDTH;
    this.canvas.height = CONFIG.GAME.CANVAS_HEIGHT;

    // Initialize audio
    this.initAudio();

    // Set up event listeners
    this.setupEventListeners();

    // Load high score - use cached value from GameApp if available
    this.highScore =
      window.gameApp?.cachedHighScore || web3Manager.getHighScore();
    this.updateUI();

    // Initialize first level
    this.initLevel(1);

    // 🌌 Initialize space theme for level 1
    this.levelTheme = this.getLevelTheme(1);

    console.log("✅ Game Engine Initialized");
  }

  initAudio() {
    this.audioManager = {
      backgroundMusic: document.getElementById("backgroundMusic"),
      waveMusic1: document.getElementById("waveMusic1"),
      waveMusic2: document.getElementById("waveMusic2"),
      waveMusic3: document.getElementById("waveMusic3"),
      shootSound: document.getElementById("shootSound"),
      explosionSound: document.getElementById("explosionSound"),
      powerupSound: document.getElementById("powerupSound"),
    };

    // Set volumes
    Object.values(this.audioManager).forEach((audio) => {
      if (audio) {
        audio.volume = CONFIG.GAME.AUDIO.MASTER_VOLUME;
      }
    });

    // Set music volume for all tracks
    const musicTracks = [
      "backgroundMusic",
      "waveMusic1",
      "waveMusic2",
      "waveMusic3",
    ];
    musicTracks.forEach((trackName) => {
      if (this.audioManager[trackName]) {
        this.audioManager[trackName].volume = CONFIG.GAME.AUDIO.MUSIC_VOLUME;
      }
    });

    // Initialize dynamic music system
    this.currentMusicTrack = null;
    this.musicIntensity = 0; // 0-3, determines which track to play
  }

  setupEventListeners() {
    // Keyboard events
    document.addEventListener("keydown", (e) => this.handleKeyDown(e));
    document.addEventListener("keyup", (e) => this.handleKeyUp(e));

    // Prevent arrow keys and space from scrolling
    document.addEventListener("keydown", (e) => {
      if (
        ["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight", "Space"].includes(
          e.code
        )
      ) {
        e.preventDefault();
      }
    });

    // Focus handling
    window.addEventListener("blur", () => {
      if (this.gameState === GAME_STATES.PLAYING) {
        this.pauseGame();
      }
    });

    // Resize handling with debounce for better performance
    let resizeTimeout;
    window.addEventListener("resize", () => {
      clearTimeout(resizeTimeout);
      resizeTimeout = setTimeout(() => {
        this.handleResize();
      }, 100); // Debounce resize events
    });

    // Also handle dev tools opening/closing via visibility change
    document.addEventListener("visibilitychange", () => {
      if (!document.hidden && this.canvas) {
        // Page became visible again, ensure canvas is properly sized
        setTimeout(() => {
          this.handleResize();
        }, 200);
      }
    });

    // Touch controls setup
    this.setupTouchControls();
  }

  handleKeyDown(e) {
    this.keys[e.code] = true;

    // Handle special keys
    switch (e.code) {
      case "Escape":
        if (this.gameState === GAME_STATES.PLAYING) {
          this.pauseGame();
        } else if (this.gameState === GAME_STATES.PAUSED) {
          this.resumeGame();
        }
        break;
      case "KeyM":
        this.toggleSound();
        break;
      case "KeyR":
        // Ctrl+R or Cmd+R to restore canvas visibility
        if (e.ctrlKey || e.metaKey) {
          e.preventDefault();
          this.restoreCanvasVisibility();
          console.log(
            "🔧 Canvas visibility restore triggered by keyboard shortcut (Ctrl/Cmd+R)"
          );
        }
        break;
    }
  }

  handleKeyUp(e) {
    this.keys[e.code] = false;
  }

  handlePlayerInput(frameMultiplier = 1.0) {
    if (!this.player || this.gameState !== GAME_STATES.PLAYING) return;

    // Keyboard movement
    let leftPressed = this.keys["KeyA"] || this.keys["ArrowLeft"];
    let rightPressed = this.keys["KeyD"] || this.keys["ArrowRight"];
    let upPressed = this.keys["KeyW"] || this.keys["ArrowUp"];
    let downPressed = this.keys["KeyS"] || this.keys["ArrowDown"];

    // Touch joystick movement
    if (this.touchControls.joystick.active) {
      const deadZone = 10; // Minimum distance to register movement
      const distance = Math.sqrt(
        this.touchControls.joystick.deltaX ** 2 +
          this.touchControls.joystick.deltaY ** 2
      );

      if (distance > deadZone) {
        // Normalize deltas to -1 to 1 range
        const normalizedX =
          this.touchControls.joystick.deltaX /
          this.touchControls.joystick.maxDistance;
        const normalizedY =
          this.touchControls.joystick.deltaY /
          this.touchControls.joystick.maxDistance;

        // Apply threshold for directional input
        if (normalizedX < -0.3) leftPressed = true;
        if (normalizedX > 0.3) rightPressed = true;
        if (normalizedY < -0.3) upPressed = true;
        if (normalizedY > 0.3) downPressed = true;
      }
    }

    // Set player movement keys
    this.player.keys.left = leftPressed;
    this.player.keys.right = rightPressed;
    this.player.keys.up = upPressed;
    this.player.keys.down = downPressed;

    // Frame rate normalized shooting for consistent behavior across different refresh rates
    const shouldShoot =
      this.keys["Space"] ||
      this.keys["KeyJ"] ||
      this.touchControls.fireButton.active;

    if (shouldShoot) {
      // Use frame rate normalization to ensure consistent shooting regardless of display refresh rate
      const newBullets = this.player.shootWithFrameNormalization
        ? this.player.shootWithFrameNormalization(frameMultiplier)
        : this.player.shoot();

      if (newBullets.length > 0) {
        this.bullets.push(...newBullets);
        this.playSound("shootSound");
      }
    }
  }

  initLevel(levelNumber) {
    this.level = levelNumber;
    this.currentLevelConfig =
      CONFIG.GAME.LEVELS[levelNumber] || CONFIG.GAME.LEVELS[10];

    // Reset spawn timer
    this.alienSpawnTimer = 0;
    this.alienSpawnRate =
      CONFIG.GAME.ALIEN.SPAWN_RATE *
      this.currentLevelConfig.spawnRateMultiplier;

    // Clear existing aliens (keep bullets and particles for smooth transition)
    this.aliens = [];

    console.log(
      `🎯 Level ${levelNumber} initialized: ${this.currentLevelConfig.name}`
    );
  }

  startGame(startLevel = 1) {
    this.gameState = GAME_STATES.PLAYING;
    this.isPaused = false; // 🔧 Fix: Ensure game is not paused when restarting
    this.gameStartTime = Date.now();

    // 🛡️ Initialize game session for anti-cheat
    this.gameSession = {
      startTime: this.gameStartTime,
      startLevel: startLevel,
      sessionId: this.generateSessionId(),
      events: [],
    };

    // Reset game state
    this.score = 0;
    this.aliensKilled = 0;
    this.level = startLevel;
    this.sessionSSDEarned = 0; // Track SSD earned this session
    this.lives = CONFIG.GAME.PLAYER.MAX_HEALTH;
    this.scoreMultiplier = 1; // Reset score multiplier

    // Initialize player
    const playerX = CONFIG.GAME.CANVAS_WIDTH / 2 - CONFIG.GAME.PLAYER.WIDTH / 2;
    const playerY = CONFIG.GAME.CANVAS_HEIGHT - CONFIG.GAME.PLAYER.HEIGHT - 20;
    this.player = new Player(playerX, playerY);

    // 🛍️ Apply active SSD shop boosts to player
    this.applyActiveBoosts();

    // Clear all entities
    this.bullets = [];
    this.aliens = [];
    this.powerUps = [];
    this.particles = [];

    // Initialize level
    this.initLevel(startLevel);

    // Start game loop
    this.lastTime = performance.now();
    this.gameLoop();

    // Reset and start dynamic music system
    this.currentMusicTrack = null; // 🔧 Fix: Reset music track to ensure it plays after restart
    this.musicIntensity = 0;
    this.switchMusicTrack(0); // Start with calm music

    // 🌌 Initialize space ambience for the starting level
    this.levelTheme = this.getLevelTheme(startLevel);
    this.generateAmbientParticles();

    // Update mobile controls visibility
    this.updateMobileControlsVisibility();

    this.updateUI();
    console.log("🚀 Game Started!");
  }

  pauseGame() {
    if (this.gameState === GAME_STATES.PLAYING) {
      this.isPaused = true;
      this.gameState = GAME_STATES.PAUSED;
      this.showPauseMenu();

      // Update mobile controls visibility
      this.updateMobileControlsVisibility();

      // Pause background music
      if (this.audioManager.backgroundMusic) {
        this.audioManager.backgroundMusic.pause();
      }
    }
  }

  resumeGame() {
    if (this.gameState === GAME_STATES.PAUSED) {
      this.isPaused = false;
      this.gameState = GAME_STATES.PLAYING;
      this.hidePauseMenu();

      // Update mobile controls visibility
      this.updateMobileControlsVisibility();

      // Resume background music
      if (this.audioManager.backgroundMusic) {
        this.audioManager.backgroundMusic.play();
      }

      // Reset timing
      this.lastTime = performance.now();
    }
  }

  async gameLoop(currentTime = performance.now()) {
    // Calculate delta time with better frame rate normalization
    const rawDeltaTime = currentTime - this.lastTime;
    const deltaTime = Math.min(rawDeltaTime, 50); // Cap delta time to prevent large jumps
    this.lastTime = currentTime;

    // Update FPS
    this.updateFPS(deltaTime);

    // Frame rate normalization for consistent gameplay
    // Target 60 FPS equivalent timing regardless of actual refresh rate
    const targetFrameTime = 1000 / 60; // 16.67ms for 60 FPS
    const frameMultiplier = deltaTime / targetFrameTime;

    // Only update game if playing
    if (this.gameState === GAME_STATES.PLAYING && !this.isPaused) {
      await this.update(deltaTime, frameMultiplier);
    }

    // Always render
    this.render();

    // Continue game loop
    if (
      this.gameState === GAME_STATES.PLAYING ||
      this.gameState === GAME_STATES.PAUSED
    ) {
      requestAnimationFrame(async (time) => await this.gameLoop(time));
    }
  }

  async update(deltaTime, frameMultiplier = 1.0) {
    // 🌌 Slow down game during space transitions for better visibility
    const transitionSlowDown = this.isTransitioning ? 0.3 : 1.0;
    const adjustedDeltaTime = deltaTime * transitionSlowDown;

    // Handle input with frame rate normalization
    this.handlePlayerInput(frameMultiplier);

    // Update player
    if (this.player) {
      this.player.update(adjustedDeltaTime);

      // Check if player died
      if (this.player.health <= 0) {
        await this.handlePlayerDeath();
        return;
      }
    }

    // Update bullets
    this.updateBullets(adjustedDeltaTime);

    // Update aliens
    this.updateAliens(adjustedDeltaTime);

    // Update power-ups
    this.updatePowerUps(adjustedDeltaTime);

    // Update particles
    this.updateParticles(adjustedDeltaTime);

    // 🌌 Update space transition effects (use original deltaTime)
    this.updateSpaceTransition(deltaTime);

    // Update floating texts (use original deltaTime)
    this.updateFloatingTexts(deltaTime);

    // Spawn aliens
    this.updateAlienSpawning(deltaTime);

    // Check collisions
    this.checkCollisions();

    // Clean up inactive entities
    this.cleanupEntities();

    // Check level progression
    this.checkLevelProgression();

    // Update visual effects
    this.updateVisualEffects(deltaTime);

    // Update floating texts and combo system
    this.updateFloatingTexts(deltaTime);
    this.updateComboSystem(deltaTime);

    // Update dynamic music based on game intensity
    this.updateDynamicMusic();

    // Update UI
    this.updateUI();
  }

  updateBullets(deltaTime) {
    for (const bullet of this.bullets) {
      bullet.update(deltaTime);
    }
  }

  updateAliens(deltaTime) {
    for (const alien of this.aliens) {
      alien.update(deltaTime);
    }
  }

  updatePowerUps(deltaTime) {
    for (const powerUp of this.powerUps) {
      powerUp.update(deltaTime);
    }
  }

  updateParticles(deltaTime) {
    for (const particle of this.particles) {
      particle.update(deltaTime);
    }
  }

  updateAlienSpawning(deltaTime) {
    this.alienSpawnTimer += deltaTime;

    if (this.alienSpawnTimer >= this.alienSpawnRate) {
      this.spawnAlien();
      this.alienSpawnTimer = 0;

      // Slightly decrease spawn rate over time (increase difficulty)
      this.alienSpawnRate = Math.max(200, this.alienSpawnRate * 0.998);
    }
  }

  spawnAlien() {
    if (this.aliens.length >= CONFIG.GAME.PERFORMANCE.MAX_ALIENS) return;

    const alienTypes = this.getAvailableAlienTypes();
    const randomType =
      alienTypes[Math.floor(Math.random() * alienTypes.length)];

    const x =
      Math.random() * (CONFIG.GAME.CANVAS_WIDTH - CONFIG.GAME.ALIEN.WIDTH);
    const y = -CONFIG.GAME.ALIEN.HEIGHT;

    const alien = new Alien(x, y, randomType);

    // Apply level modifiers
    alien.baseSpeed *= this.currentLevelConfig.speedMultiplier;
    alien.health = Math.ceil(
      alien.health * this.currentLevelConfig.healthMultiplier
    );
    alien.maxHealth = alien.health;

    this.aliens.push(alien);
  }

  getAvailableAlienTypes() {
    const typeCount = this.currentLevelConfig.alienTypes;
    const types = ["BASIC"];

    if (typeCount >= 2) types.push("FAST");
    if (typeCount >= 3) types.push("TANK");
    if (typeCount >= 4) types.push("BOSS");

    return types;
  }

  checkCollisions() {
    // Bullet vs Alien collisions
    for (let i = this.bullets.length - 1; i >= 0; i--) {
      const bullet = this.bullets[i];
      if (!bullet.active) continue;

      for (let j = this.aliens.length - 1; j >= 0; j--) {
        const alien = this.aliens[j];
        if (!alien.active) continue;

        if (
          bullet.collidesWithEnhanced(
            alien,
            CONFIG.GAME.BULLET.COLLISION_PADDING
          )
        ) {
          // Handle special bullet effects
          this.handleBulletHit(bullet, alien, i, j);

          // For non-piercing bullets, break after first hit
          if (!bullet.piercing) {
            break;
          }
        }
      }
    }

    // Player vs Alien collisions
    if (this.player && this.player.active) {
      for (const alien of this.aliens) {
        if (!alien.active) continue;

        if (this.player.collidesWith(alien)) {
          const damaged = this.player.takeDamage(1);
          if (damaged) {
            alien.active = false;
            this.addParticles(
              alien.x + alien.width / 2,
              alien.y + alien.height / 2,
              "EXPLOSION"
            );
            this.addScreenShake(10);
            this.playSound("explosionSound");
          }
          break;
        }
      }
    }

    // Player vs PowerUp collisions
    if (this.player && this.player.active) {
      for (const powerUp of this.powerUps) {
        if (!powerUp.active) continue;

        if (this.player.collidesWith(powerUp)) {
          this.player.addPowerUp(powerUp.type, powerUp.config.duration);
          powerUp.active = false;
          this.playSound("powerupSound");

          // Enhanced power-up collection effect
          const collectParticles = ExplosionEffect.createPowerUpEffect(
            powerUp.x + powerUp.width / 2,
            powerUp.y + powerUp.height / 2
          );
          this.particles.push(...collectParticles);

          // Show power-up name
          this.addFloatingText(
            powerUp.x + powerUp.width / 2,
            powerUp.y - 10,
            powerUp.config.effect.toUpperCase(),
            powerUp.config.color,
            1500
          );

          break;
        }
      }
    }
  }

  // 🔫 Enhanced Bullet Hit Handling
  handleBulletHit(bullet, alien, bulletIndex, alienIndex) {
    // Skip if already hit by this bullet (for piercing bullets)
    if (bullet.targetsHit && bullet.targetsHit.has(alien)) {
      return;
    }

    // Mark alien as hit by this bullet
    if (bullet.targetsHit) {
      bullet.targetsHit.add(alien);
    }

    // Apply damage
    const destroyed = alien.takeDamage(bullet.damage);

    // Handle special bullet effects
    this.applyBulletEffect(bullet, alien);

    // Deactivate bullet if not piercing
    if (!bullet.piercing) {
      bullet.active = false;
    }

    if (destroyed) {
      this.handleAlienDestroyed(alien);
    } else {
      // Show hit effect
      const hitParticles = ExplosionEffect.createHitEffect(
        alien.x + alien.width / 2,
        alien.y + alien.height / 2
      );
      this.particles.push(...hitParticles);

      // Show damage indicator
      this.addFloatingText(
        alien.x + alien.width / 2,
        alien.y,
        `-${bullet.damage}`,
        bullet.color,
        800
      );
    }
  }

  applyBulletEffect(bullet, hitAlien) {
    switch (bullet.effect) {
      case "chain":
        this.handleLightningChain(bullet, hitAlien);
        break;
      case "burn":
        this.applyBurnEffect(hitAlien, bullet);
        break;
      case "freeze":
        this.applyFreezeEffect(hitAlien, bullet);
        break;
      case "plasma":
        this.applyPlasmaExplosion(bullet, hitAlien);
        break;
      case "none":
      default:
        // Standard bullet, no special effect
        break;
    }

    // Handle splash damage
    if (bullet.splash) {
      this.applySplashDamage(bullet, hitAlien);
    }
  }

  handleLightningChain(bullet, startAlien) {
    if (bullet.hasChained) return;

    bullet.hasChained = true;
    const chainRange = bullet.bulletConfig.chainRange || 80;
    const maxChains = bullet.bulletConfig.maxChains || 3;
    let chainCount = 0;
    let currentTarget = startAlien;

    const chainedTargets = new Set([startAlien]);

    while (chainCount < maxChains) {
      let nearestAlien = null;
      let nearestDistance = chainRange;

      // Find nearest unchained alien
      for (const alien of this.aliens) {
        if (!alien.active || chainedTargets.has(alien)) continue;

        const distance = UTILS.distance(
          currentTarget.x + currentTarget.width / 2,
          currentTarget.y + currentTarget.height / 2,
          alien.x + alien.width / 2,
          alien.y + alien.height / 2
        );

        if (distance < nearestDistance) {
          nearestDistance = distance;
          nearestAlien = alien;
        }
      }

      if (!nearestAlien) break;

      // Create lightning arc effect
      this.createLightningArc(currentTarget, nearestAlien);

      // Damage chained alien
      const destroyed = nearestAlien.takeDamage(bullet.damage);
      chainedTargets.add(nearestAlien);

      if (destroyed) {
        this.handleAlienDestroyed(nearestAlien);
      }

      currentTarget = nearestAlien;
      chainCount++;
    }
  }

  createLightningArc(fromAlien, toAlien) {
    // Create visual lightning effect between aliens
    const arcParticles = ExplosionEffect.create(
      (fromAlien.x + toAlien.x) / 2,
      (fromAlien.y + toAlien.y) / 2,
      "LIGHTNING_ARC"
    );
    this.particles.push(...arcParticles);
  }

  applyBurnEffect(alien, bullet) {
    // Apply damage over time effect
    if (!alien.statusEffects) alien.statusEffects = {};

    alien.statusEffects.burn = {
      damage: bullet.bulletConfig.burnDamage || 0.5,
      duration: bullet.bulletConfig.burnDuration || 3000,
      interval: 500, // Damage every 500ms
      lastTick: Date.now(),
    };
  }

  applyFreezeEffect(alien, bullet) {
    // Apply slow effect
    if (!alien.statusEffects) alien.statusEffects = {};

    alien.statusEffects.freeze = {
      slowFactor: bullet.bulletConfig.slowFactor || 0.5,
      duration: bullet.bulletConfig.slowDuration || 2000,
      startTime: Date.now(),
    };
  }

  applyPlasmaExplosion(bullet, hitAlien) {
    // Create energy pulse explosion
    const pulseParticles = ExplosionEffect.create(
      hitAlien.x + hitAlien.width / 2,
      hitAlien.y + hitAlien.height / 2,
      "PLASMA_EXPLOSION"
    );
    this.particles.push(...pulseParticles);
    this.addScreenShake(8);
  }

  applySplashDamage(bullet, centerAlien) {
    const splashRadius = bullet.bulletConfig.splashRadius || 40;
    const centerX = centerAlien.x + centerAlien.width / 2;
    const centerY = centerAlien.y + centerAlien.height / 2;

    for (const alien of this.aliens) {
      if (!alien.active || alien === centerAlien) continue;

      const distance = UTILS.distance(
        centerX,
        centerY,
        alien.x + alien.width / 2,
        alien.y + alien.height / 2
      );

      if (distance <= splashRadius) {
        const splashDamage = Math.max(1, Math.floor(bullet.damage * 0.5));
        const destroyed = alien.takeDamage(splashDamage);

        // Visual splash effect
        this.addFloatingText(
          alien.x + alien.width / 2,
          alien.y,
          `-${splashDamage}`,
          bullet.color,
          600
        );

        if (destroyed) {
          this.handleAlienDestroyed(alien);
        }
      }
    }

    // Create splash explosion effect
    const splashParticles = ExplosionEffect.create(
      centerX,
      centerY,
      "SPLASH_EXPLOSION"
    );
    this.particles.push(...splashParticles);
  }

  handleAlienDestroyed(alien) {
    // Update combo system
    this.comboCounter++;
    this.comboTimer = 3000; // 3 seconds to maintain combo
    this.comboMultiplier = Math.min(
      5,
      1 + Math.floor(this.comboCounter / 5) * 0.5
    );

    // Add score with multiplier boost and combo
    const baseScore = alien.points;
    const totalMultiplier = this.scoreMultiplier * this.comboMultiplier;
    const finalScore = Math.floor(baseScore * totalMultiplier);
    this.score += finalScore;
    this.aliensKilled++;

    // Create floating score text
    this.addFloatingText(
      alien.x + alien.width / 2,
      alien.y + alien.height / 2,
      `+${finalScore}`,
      "#ffff00",
      1000
    );

    // Show combo multiplier if active
    if (this.comboMultiplier > 1) {
      this.addFloatingText(
        alien.x + alien.width / 2,
        alien.y + alien.height / 2 - 20,
        `${this.comboCounter}x COMBO!`,
        "#ff8800",
        1500
      );
    }

    // Show score multiplier effect if active
    if (this.scoreMultiplier > 1) {
      console.log(
        `🚀 Score boost! ${baseScore} x${totalMultiplier} = ${finalScore}`
      );
    }

    // Track SSD earned this session
    const ssdPerKill = parseFloat(CONFIG.SSD.REWARD_PER_KILL);
    this.sessionSSDEarned += ssdPerKill;

    // Update SSD display in real-time (if available)
    if (window.gameApp && window.gameApp.updateSessionSSD) {
      window.gameApp.updateSessionSSD(this.sessionSSDEarned);
    }

    // Create enhanced explosion effect
    const intensity = alien.type === "BOSS" ? 2 : 1;
    this.addParticles(
      alien.x + alien.width / 2,
      alien.y + alien.height / 2,
      "EXPLOSION",
      intensity
    );
    this.playSound("explosionSound");
    this.addScreenShake(alien.type === "BOSS" ? 15 : 5);

    // Chance to spawn power-up
    if (Math.random() < CONFIG.GAME.POWERUP.SPAWN_CHANCE) {
      this.spawnPowerUp(alien.x + alien.width / 2, alien.y + alien.height / 2);
    }

    alien.active = false;
  }

  spawnPowerUp(x, y) {
    const types = Object.keys(CONFIG.GAME.POWERUP_TYPES);
    const randomType =
      types[Math.floor(Math.random() * types.length)].toLowerCase();

    const powerUp = new PowerUp(
      x - CONFIG.GAME.POWERUP.WIDTH / 2,
      y,
      randomType
    );
    this.powerUps.push(powerUp);
  }

  async handlePlayerDeath() {
    this.lives--;

    if (this.lives <= 0) {
      await this.gameOver();
    } else {
      // Respawn player
      this.player.health = CONFIG.GAME.PLAYER.MAX_HEALTH;
      this.player.isImmune = true;
      this.player.immunityTime = CONFIG.GAME.PLAYER.RESPAWN_IMMUNITY;

      // Clear nearby enemies
      for (const alien of this.aliens) {
        if (
          UTILS.distance(alien.x, alien.y, this.player.x, this.player.y) < 100
        ) {
          alien.active = false;
        }
      }
    }
  }

  async gameOver() {
    this.gameState = GAME_STATES.GAME_OVER;

    // Update mobile controls visibility
    this.updateMobileControlsVisibility();

    // Stop background music
    if (this.audioManager.backgroundMusic) {
      this.audioManager.backgroundMusic.pause();
      this.audioManager.backgroundMusic.currentTime = 0;
    }

    // Check for new high score (compared to backend saved scores)
    const savedHighScore = await web3Manager.getHighScoreFromBackend();
    const isNewHighScore = this.score > savedHighScore;

    // Update local high score for display
    if (this.score > this.highScore) {
      this.highScore = this.score;
      // Also update the cached high score in GameApp for consistent display
      if (window.gameApp) {
        window.gameApp.cachedHighScore = this.score;
      }
    }

    // Show game over screen with backend comparison
    this.showGameOverScreen(isNewHighScore);

    console.log(
      `💀 Game Over! Score: ${this.score}, Level: ${this.level}, Aliens Killed: ${this.aliensKilled}`,
      `Previous High Score: ${savedHighScore}, New High Score: ${isNewHighScore}`
    );
  }

  checkLevelProgression() {
    // Level up every 10 aliens killed (adjust as needed)
    const aliensNeededForNextLevel = this.level * 10;
    if (this.aliensKilled >= aliensNeededForNextLevel && this.level < 10) {
      this.level++;

      // 🌌 Start space transition effect
      this.startSpaceTransition(() => {
        this.initLevel(this.level);
        this.showLevelUpNotification();
      });
    }
  }

  addParticles(x, y, type) {
    const newParticles = ExplosionEffect.create(x, y, type);
    this.particles.push(...newParticles);

    // Limit particle count for performance
    if (this.particles.length > CONFIG.GAME.PERFORMANCE.MAX_PARTICLES) {
      this.particles.splice(
        0,
        this.particles.length - CONFIG.GAME.PERFORMANCE.MAX_PARTICLES
      );
    }
  }

  addScreenShake(intensity) {
    this.screenShake = Math.max(this.screenShake, intensity);
  }

  addFloatingText(x, y, text, color, duration = 1000) {
    this.floatingTexts.push({
      x: x,
      y: y,
      text: text,
      color: color,
      life: duration,
      maxLife: duration,
      vx: (Math.random() - 0.5) * 2,
      vy: -1 - Math.random(),
    });
  }

  updateFloatingTexts(deltaTime) {
    for (let i = this.floatingTexts.length - 1; i >= 0; i--) {
      const text = this.floatingTexts[i];
      text.life -= deltaTime;
      text.x += text.vx * deltaTime * 0.1;
      text.y += text.vy * deltaTime * 0.1;

      if (text.life <= 0) {
        this.floatingTexts.splice(i, 1);
      }
    }
  }

  updateComboSystem(deltaTime) {
    if (this.comboTimer > 0) {
      this.comboTimer -= deltaTime;
      if (this.comboTimer <= 0) {
        // Reset combo
        this.comboCounter = 0;
        this.comboMultiplier = 1;
      }
    }
  }

  updateDynamicMusic() {
    if (!this.soundEnabled) return;

    // Calculate music intensity based on game state
    let newIntensity = 0;

    // Base intensity on level
    newIntensity += Math.min(this.level - 1, 1);

    // Add intensity based on enemy count
    if (this.aliens.length > 15) newIntensity += 1;
    if (this.aliens.length > 25) newIntensity += 1;

    // Add intensity based on combo
    if (this.comboCounter > 10) newIntensity += 1;

    // Cap at 3
    newIntensity = Math.min(3, newIntensity);

    if (newIntensity !== this.musicIntensity) {
      this.switchMusicTrack(newIntensity);
      this.musicIntensity = newIntensity;
    }
  }

  switchMusicTrack(intensity) {
    const trackNames = [
      "backgroundMusic",
      "waveMusic1",
      "waveMusic2",
      "waveMusic3",
    ];
    const newTrackName = trackNames[intensity];

    if (newTrackName === this.currentMusicTrack) return;

    // Fade out current track
    if (this.currentMusicTrack && this.audioManager[this.currentMusicTrack]) {
      this.fadeOutTrack(this.audioManager[this.currentMusicTrack]);
    }

    // Fade in new track
    if (this.audioManager[newTrackName]) {
      this.fadeInTrack(this.audioManager[newTrackName]);
      this.currentMusicTrack = newTrackName;
    }

    console.log(`🎵 Music intensity changed to ${intensity}: ${newTrackName}`);
  }

  fadeOutTrack(audio) {
    const originalVolume = CONFIG.GAME.AUDIO.MUSIC_VOLUME;
    const fadeSteps = 20;
    const stepTime = 50;
    let currentStep = 0;

    const fadeInterval = setInterval(() => {
      currentStep++;
      const newVolume = originalVolume * (1 - currentStep / fadeSteps);
      audio.volume = Math.max(0, newVolume);

      if (currentStep >= fadeSteps) {
        clearInterval(fadeInterval);
        audio.pause();
        audio.currentTime = 0;
      }
    }, stepTime);
  }

  fadeInTrack(audio) {
    const targetVolume = CONFIG.GAME.AUDIO.MUSIC_VOLUME;
    const fadeSteps = 20;
    const stepTime = 50;
    let currentStep = 0;

    audio.volume = 0;
    audio.currentTime = 0;
    audio.play().catch((e) => console.warn("Audio play failed:", e));

    const fadeInterval = setInterval(() => {
      currentStep++;
      const newVolume = targetVolume * (currentStep / fadeSteps);
      audio.volume = Math.min(targetVolume, newVolume);

      if (currentStep >= fadeSteps) {
        clearInterval(fadeInterval);
      }
    }, stepTime);
  }

  updateVisualEffects(deltaTime) {
    // Update screen shake
    if (this.screenShake > 0) {
      this.screenShake -= deltaTime * 0.3;
      this.screenShake = Math.max(0, this.screenShake);
    }

    // Update background scroll
    this.backgroundOffset += deltaTime * 0.05;
    if (this.backgroundOffset > 100) this.backgroundOffset = 0;
  }

  cleanupEntities() {
    this.entityCleanupTimer++;

    if (this.entityCleanupTimer >= CONFIG.GAME.PERFORMANCE.CLEANUP_INTERVAL) {
      // Remove inactive bullets and return them to pool for reuse
      this.bullets = this.bullets.filter((bullet) => {
        if (!bullet.active) {
          this.returnBulletToPool(bullet);
          return false;
        }
        return true;
      });

      this.aliens = this.aliens.filter((alien) => alien.active);
      this.powerUps = this.powerUps.filter((powerUp) => powerUp.active);
      this.particles = this.particles.filter((particle) => particle.active);

      this.entityCleanupTimer = 0;
    }
  }

  // Bullet pooling methods for better performance on low-end hardware
  getBulletFromPool(x, y, vx, vy, bulletType) {
    let bullet;

    if (this.bulletPool.length > 0) {
      bullet = this.bulletPool.pop();
      bullet.reset(x, y, vx, vy, bulletType);
    } else {
      bullet = new Bullet(x, y, vx, vy, bulletType);
    }

    return bullet;
  }

  returnBulletToPool(bullet) {
    if (this.bulletPool.length < this.maxBulletPoolSize) {
      bullet.active = false;
      bullet.trail = []; // Clear trail for next use
      this.bulletPool.push(bullet);
    }
  }

  render() {
    // Clear canvas
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

    // Apply screen shake
    if (this.screenShake > 0) {
      const shakeX = (Math.random() - 0.5) * this.screenShake;
      const shakeY = (Math.random() - 0.5) * this.screenShake;
      this.ctx.save();
      this.ctx.translate(shakeX, shakeY);
    }

    // Render background
    this.renderBackground();

    // 🌌 Render space ambient effects
    this.renderSpaceAmbience();

    // 🌌 Render space transition effects
    this.renderSpaceTransition();

    // Render game entities
    this.renderEntities();

    // Render UI overlays
    this.renderGameUI();

    // 🌌 Render floating texts (on top of everything)
    this.renderFloatingTexts();

    // Restore screen shake
    if (this.screenShake > 0) {
      this.ctx.restore();
    }

    // Render debug info
    if (CONFIG.DEBUG.SHOW_FPS) {
      this.renderDebugInfo();
    }
  }

  renderBackground() {
    // Dynamic space background based on level theme
    const themeColors = {
      nebula: "rgba(25, 5, 40, 0.1)", // Purple nebula
      asteroid: "rgba(40, 25, 5, 0.1)", // Brown asteroid field
      deep_space: "rgba(0, 5, 20, 0.1)", // Deep blue space
      void: "rgba(5, 0, 10, 0.1)", // Dark void
      galaxy: "rgba(20, 10, 30, 0.1)", // Galaxy purple
    };

    this.ctx.fillStyle =
      themeColors[this.levelTheme] || themeColors["deep_space"];
    this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

    // Moving star field with theme-appropriate colors
    const starColors = {
      nebula: ["#FFB6C1", "#DDA0DD", "#98FB98"],
      asteroid: ["#F4A460", "#CD853F", "#DEB887"],
      deep_space: ["#FFFFFF", "#87CEEB", "#B0C4DE"],
      void: ["#8A2BE2", "#4B0082", "#483D8B"],
      galaxy: ["#FFD700", "#FFA500", "#FF6347"],
    };

    const colors = starColors[this.levelTheme] || starColors["deep_space"];

    for (let i = 0; i < 50; i++) {
      const x = (i * 37) % this.canvas.width;
      const y =
        (i * 23 + this.backgroundOffset * (1 + (i % 3))) % this.canvas.height;
      const alpha = 0.3 + (i % 3) * 0.3;
      const colorIndex = i % colors.length;

      this.ctx.globalAlpha = alpha;
      this.ctx.fillStyle = colors[colorIndex];
      this.ctx.fillRect(x, y, 1, 1);
    }
    this.ctx.globalAlpha = 1;
  }

  renderEntities() {
    // Render particles (background layer)
    for (const particle of this.particles) {
      if (particle.active) particle.render(this.ctx);
    }

    // Render power-ups
    for (const powerUp of this.powerUps) {
      if (powerUp.active) powerUp.render(this.ctx);
    }

    // Render aliens
    for (const alien of this.aliens) {
      if (alien.active) alien.render(this.ctx);
    }

    // Render bullets
    for (const bullet of this.bullets) {
      if (bullet.active) bullet.render(this.ctx);
    }

    // Render player
    if (this.player && this.player.active) {
      this.player.render(this.ctx);
    }
  }

  renderGameUI() {
    // Power-up indicators
    if (this.player) {
      this.renderPowerUpIndicators();
    }

    // Render floating texts
    this.renderFloatingTexts();

    // Render combo indicator
    if (this.comboMultiplier > 1) {
      this.renderComboIndicator();
    }
  }

  renderFloatingTexts() {
    this.ctx.save();
    this.ctx.textAlign = "center";
    this.ctx.font = "bold 16px Orbitron";
    this.ctx.strokeStyle = "#000000";
    this.ctx.lineWidth = 3;

    for (const text of this.floatingTexts) {
      const alpha = text.life / text.maxLife;
      const scale = 0.5 + alpha * 0.5;

      this.ctx.globalAlpha = alpha;
      this.ctx.fillStyle = text.color;

      this.ctx.save();
      this.ctx.translate(text.x, text.y);
      this.ctx.scale(scale, scale);

      // Text outline
      this.ctx.strokeText(text.text, 0, 0);
      // Text fill
      this.ctx.fillText(text.text, 0, 0);

      this.ctx.restore();
    }

    this.ctx.restore();
  }

  renderComboIndicator() {
    this.ctx.save();

    const x = this.canvas.width - 150;
    const y = 100;

    // Background
    this.ctx.fillStyle = "rgba(255, 136, 0, 0.8)";
    this.ctx.fillRect(x, y, 120, 40);

    // Border
    this.ctx.strokeStyle = "#ff8800";
    this.ctx.lineWidth = 2;
    this.ctx.strokeRect(x, y, 120, 40);

    // Text
    this.ctx.fillStyle = "#ffffff";
    this.ctx.font = "bold 14px Orbitron";
    this.ctx.textAlign = "center";
    this.ctx.fillText(`${this.comboCounter}x COMBO`, x + 60, y + 16);
    this.ctx.fillText(
      `${this.comboMultiplier.toFixed(1)}x SCORE`,
      x + 60,
      y + 32
    );

    this.ctx.restore();
  }

  renderPowerUpIndicators() {
    let yOffset = 0;
    for (const [type, powerUp] of this.player.powerUps) {
      const timeLeft = powerUp.duration;
      const config = CONFIG.GAME.POWERUP_TYPES[type.toUpperCase()];

      if (config && timeLeft > 0) {
        const x = this.canvas.width - 120;
        const y = 50 + yOffset;

        // Background
        this.ctx.fillStyle = "rgba(0, 0, 0, 0.7)";
        this.ctx.fillRect(x, y, 100, 20);

        // Progress bar
        const progress = timeLeft / config.duration;
        this.ctx.fillStyle = config.color;
        this.ctx.fillRect(x + 2, y + 2, 96 * progress, 16);

        // Text
        this.ctx.fillStyle = "#ffffff";
        this.ctx.font = "10px Orbitron";
        this.ctx.fillText(config.effect, x + 5, y + 13);

        yOffset += 25;
      }
    }
  }

  renderDebugInfo() {
    this.ctx.fillStyle = "#00ff00";
    this.ctx.font = "12px monospace";
    this.ctx.fillText(`FPS: ${Math.round(this.fps)}`, 10, 20);
    this.ctx.fillText(
      `Entities: ${
        this.bullets.length +
        this.aliens.length +
        this.powerUps.length +
        this.particles.length
      }`,
      10,
      35
    );
    this.ctx.fillText(
      `Level: ${this.level} (${this.currentLevelConfig?.name})`,
      10,
      50
    );
  }

  // 🌌 Space Ambience Rendering
  renderSpaceAmbience() {
    // Render ambient space particles
    this.spaceAmbientParticles.forEach((particle) => {
      if (particle.life <= 0) return;

      this.ctx.save();
      this.ctx.globalAlpha = particle.alpha;
      this.ctx.fillStyle = particle.color;

      // Add twinkling effect for ambient particles
      if (particle.twinkle !== undefined) {
        particle.twinkle += 0.05;
        const twinkleAlpha = (Math.sin(particle.twinkle) + 1) * 0.5;
        this.ctx.globalAlpha *= twinkleAlpha;
      }

      // Scale particle if needed
      if (particle.scale !== 1) {
        this.ctx.translate(particle.x, particle.y);
        this.ctx.scale(particle.scale, particle.scale);
        this.ctx.translate(-particle.x, -particle.y);
      }

      // Render as a glowing dot
      this.ctx.beginPath();
      this.ctx.arc(particle.x, particle.y, particle.size, 0, Math.PI * 2);
      this.ctx.fill();

      // Add glow effect for larger particles
      if (particle.size > 2) {
        this.ctx.globalAlpha *= 0.3;
        this.ctx.beginPath();
        this.ctx.arc(particle.x, particle.y, particle.size * 2, 0, Math.PI * 2);
        this.ctx.fill();
      }

      this.ctx.restore();
    });
  }

  renderSpaceTransition() {
    if (!this.isTransitioning) return;

    // Render transition overlay
    this.ctx.save();

    // Create transition effect based on type
    if (this.transitionType === "warp") {
      this.renderWarpTransition();
    } else if (this.transitionType === "fold") {
      this.renderFoldTransition();
    } else if (this.transitionType === "rift") {
      this.renderRiftTransition();
    } else if (this.transitionType === "quantum") {
      this.renderQuantumTransition();
    } else {
      this.renderFadeTransition();
    }

    this.ctx.restore();
  }

  renderWarpTransition() {
    // Warp speed effect with streaking particles
    this.spaceAmbientParticles.forEach((particle) => {
      if (particle.life <= 0) return;

      this.ctx.save();
      this.ctx.globalAlpha = particle.alpha * 0.8;
      this.ctx.strokeStyle = particle.color;
      this.ctx.lineWidth = particle.size;

      // Draw motion trails
      this.ctx.beginPath();
      this.ctx.moveTo(particle.x, particle.y);
      this.ctx.lineTo(
        particle.x - particle.vx * 20,
        particle.y - particle.vy * 20
      );
      this.ctx.stroke();

      this.ctx.restore();
    });
  }

  renderFoldTransition() {
    // Space folding effect with ripples
    const centerX = CONFIG.GAME.CANVAS_WIDTH / 2;
    const centerY = CONFIG.GAME.CANVAS_HEIGHT / 2;
    const maxRadius = Math.max(
      CONFIG.GAME.CANVAS_WIDTH,
      CONFIG.GAME.CANVAS_HEIGHT
    );

    this.ctx.save();
    this.ctx.globalAlpha = 0.3;
    this.ctx.strokeStyle = this.getTransitionColor();
    this.ctx.lineWidth = 2;

    // Draw concentric ripples
    for (let i = 0; i < 8; i++) {
      const radius = (this.transitionProgress * maxRadius + i * 80) % maxRadius;
      const alpha = 1 - radius / maxRadius;
      this.ctx.globalAlpha = alpha * 0.5; // Fade out as ripples expand
      this.ctx.beginPath();
      this.ctx.arc(centerX, centerY, radius, 0, Math.PI * 2);
      this.ctx.stroke();
    }

    this.ctx.restore();
  }

  renderRiftTransition() {
    // Dimensional rift effect
    const centerX = CONFIG.GAME.CANVAS_WIDTH / 2;
    const centerY = CONFIG.GAME.CANVAS_HEIGHT / 2;

    this.ctx.save();
    this.ctx.globalAlpha = 0.6;

    // Create jagged rift
    this.ctx.strokeStyle = this.getTransitionColor();
    this.ctx.lineWidth = 3;
    this.ctx.beginPath();

    const riftLength = this.transitionProgress * CONFIG.GAME.CANVAS_HEIGHT;
    const segments = 10;

    for (let i = 0; i <= segments; i++) {
      const y = centerY - riftLength / 2 + (i / segments) * riftLength;
      const x = centerX + Math.sin(i * 0.5 + this.transitionProgress * 10) * 20;

      if (i === 0) {
        this.ctx.moveTo(x, y);
      } else {
        this.ctx.lineTo(x, y);
      }
    }

    this.ctx.stroke();
    this.ctx.restore();
  }

  renderQuantumTransition() {
    // Quantum tunnel effect
    const centerX = CONFIG.GAME.CANVAS_WIDTH / 2;
    const centerY = CONFIG.GAME.CANVAS_HEIGHT / 2;

    this.ctx.save();

    // Create tunnel effect with multiple circles
    for (let i = 0; i < 8; i++) {
      const progress = (this.transitionProgress + i * 0.1) % 1;
      const radius = progress * 200;
      const alpha = (1 - progress) * 0.5;

      this.ctx.globalAlpha = alpha;
      this.ctx.strokeStyle = this.getTransitionColor();
      this.ctx.lineWidth = 2;
      this.ctx.beginPath();
      this.ctx.arc(centerX, centerY, radius, 0, Math.PI * 2);
      this.ctx.stroke();
    }

    this.ctx.restore();
  }

  renderFadeTransition() {
    // Simple fade effect
    this.ctx.save();
    this.ctx.globalAlpha = Math.sin(this.transitionProgress * Math.PI) * 0.3;
    this.ctx.fillStyle = this.getTransitionColor();
    this.ctx.fillRect(
      0,
      0,
      CONFIG.GAME.CANVAS_WIDTH,
      CONFIG.GAME.CANVAS_HEIGHT
    );
    this.ctx.restore();
  }

  renderFloatingTexts() {
    this.floatingTexts.forEach((text) => {
      if (text.life <= 0) return;

      this.ctx.save();
      this.ctx.globalAlpha = text.alpha;
      this.ctx.fillStyle = text.color;
      this.ctx.font = "bold 24px Arial";
      this.ctx.textAlign = "center";
      this.ctx.textBaseline = "middle";

      // Add glow effect
      this.ctx.shadowColor = text.color;
      this.ctx.shadowBlur = 10;

      this.ctx.fillText(text.text, text.x, text.y);
      this.ctx.restore();
    });
  }

  updateFPS(deltaTime) {
    this.frameCount++;
    this.fpsUpdateTime += deltaTime;

    if (this.fpsUpdateTime >= 1000) {
      this.fps = (this.frameCount * 1000) / this.fpsUpdateTime;

      // Performance monitoring and automatic optimization
      this.monitorPerformance();

      this.frameCount = 0;
      this.fpsUpdateTime = 0;
    }
  }

  monitorPerformance() {
    const now = Date.now();
    if (now - this.lastFPSCheck < 2000) return; // Check every 2 seconds

    this.lastFPSCheck = now;

    // Detect consistent low performance
    if (this.fps < 45) {
      if (!this.lowPerformanceDetected) {
        this.lowPerformanceDetected = true;
        console.warn("⚠️ Low performance detected, enabling optimizations...");
        this.enablePerformanceOptimizations();
      }
    } else if (this.fps > 55 && this.lowPerformanceDetected) {
      // Performance recovered
      this.lowPerformanceDetected = false;
      console.log(
        "✅ Performance recovered, disabling emergency optimizations"
      );
      this.disableEmergencyOptimizations();
    }
  }

  enablePerformanceOptimizations() {
    // Reduce particle count
    if (this.particles.length > 50) {
      this.particles = this.particles.slice(0, 50);
    }

    // Enable performance mode
    this.performanceMode = true;

    // Reduce bullet trail length for better performance
    this.bullets.forEach((bullet) => {
      if (bullet.maxTrailLength > 4) {
        bullet.maxTrailLength = 4;
      }
    });

    console.log("🔧 Performance optimizations enabled");
  }

  disableEmergencyOptimizations() {
    // Only disable emergency optimizations, keep performanceMode if manually set
    this.bullets.forEach((bullet) => {
      bullet.maxTrailLength = 8; // Restore normal trail length
    });

    console.log("🔧 Emergency optimizations disabled");
  }

  updateUI() {
    document.getElementById("score").textContent = UTILS.formatScore(
      this.score
    );
    document.getElementById("level").textContent = this.level;
    document.getElementById("lives").textContent = this.player
      ? this.player.health
      : this.lives;
    // Use the most current high score available (cached from backend or local)
    const currentHighScore = window.gameApp?.cachedHighScore || this.highScore;
    const highScoreElement = document.getElementById("highScore");
    if (highScoreElement) {
      highScoreElement.textContent = UTILS.formatScore(currentHighScore);
      console.log("🎯 GameEngine.updateUI() - High score display updated:", {
        gameEngineHighScore: this.highScore,
        cachedHighScore: window.gameApp?.cachedHighScore,
        finalDisplayed: currentHighScore,
        formatted: UTILS.formatScore(currentHighScore),
      });
    }
  }

  showGameOverScreen(isNewHighScore) {
    document.getElementById("finalScore").textContent = UTILS.formatScore(
      this.score
    );
    document.getElementById("finalLevel").textContent = this.level;
    document.getElementById("aliensKilled").textContent = this.aliensKilled;

    // Show SSD earned this session
    const sessionSSDElement = document.getElementById("sessionSSDEarned");
    if (sessionSSDElement) {
      sessionSSDElement.textContent = this.sessionSSDEarned.toFixed(2);
    }

    const newHighScoreDiv = document.getElementById("newHighScore");
    if (isNewHighScore) {
      newHighScoreDiv.classList.remove("hidden");
    } else {
      newHighScoreDiv.classList.add("hidden");
    }

    document.getElementById("gameOverScreen").classList.remove("hidden");
    document.getElementById("gameUI").classList.add("hidden");
  }

  showPauseMenu() {
    document.getElementById("pauseMenu").classList.remove("hidden");
  }

  // 🛍️ SSD SHOP BOOSTS INTEGRATION

  async applyActiveBoosts() {
    if (!this.player || !web3Manager.isConnected) return;

    try {
      console.log("🛍️ Checking for active SSD shop boosts...");

      // Check each boost type
      const boostChecks = [
        {
          itemId: 0,
          property: "scoreMultiplier",
          effect: "2x Score Multiplier",
        },
        { itemId: 1, property: "rapidFireActive", effect: "Rapid Fire" },
        { itemId: 2, property: "shieldActive", effect: "Energy Shield" },
        { itemId: 3, property: "multiShotActive", effect: "Multi-Shot" },
        { itemId: 4, property: "extraLife", effect: "Extra Life" },
      ];

      for (const boost of boostChecks) {
        const hasBoost = await web3Manager.hasActiveBoost(boost.itemId);
        if (hasBoost) {
          this.applyBoostToPlayer(boost.itemId, boost.property, boost.effect);
        }
      }
    } catch (error) {
      console.error("Failed to apply SSD boosts:", error);
    }
  }

  applyBoostToPlayer(itemId, property, effectName) {
    if (!this.player) return;

    switch (itemId) {
      case 0: // 2x Score Multiplier
        this.scoreMultiplier = 2;
        console.log("🚀 2x Score Multiplier activated!");
        break;

      case 1: // Rapid Fire
        // Add to power-up system with long duration (24 hours)
        this.player.addPowerUp("rapid_fire", 24 * 60 * 60 * 1000);
        console.log("⚡ Rapid Fire activated!");
        break;

      case 2: // Energy Shield
        // Add to power-up system with long duration (24 hours)
        this.player.addPowerUp("shield", 24 * 60 * 60 * 1000);
        console.log("🛡️ Energy Shield activated!");
        break;

      case 3: // Multi-Shot
        // Add to power-up system with long duration (24 hours)
        this.player.addPowerUp("multi_shot", 24 * 60 * 60 * 1000);
        console.log("🔫 Multi-Shot activated!");
        console.log(`🐛 DEBUG: Added multi_shot to powerUps map`);
        break;

      case 4: // Extra Life
        this.lives++;
        this.player.health = this.player.maxHealth; // Full heal too
        console.log("❤️ Extra Life activated!");
        break;
    }

    // Show boost notification
    if (window.gameApp && window.gameApp.showNotification) {
      window.gameApp.showNotification(
        `🛍️ ${effectName} Active!`,
        "success",
        2000
      );
    }
  }

  hidePauseMenu() {
    document.getElementById("pauseMenu").classList.add("hidden");
  }

  showLevelUpNotification() {
    // Enhanced level up notification with space theme
    const spaceRegionName = this.getSpaceRegionName(this.level);
    console.log(`🎉 Level Up! Welcome to ${this.currentLevelConfig.name}`);
    console.log(`🌌 Entering ${spaceRegionName}`);

    // Add floating text effect with longer duration
    this.addFloatingText(
      CONFIG.GAME.CANVAS_WIDTH / 2,
      CONFIG.GAME.CANVAS_HEIGHT / 2 - 50,
      `LEVEL ${this.level}: ${this.currentLevelConfig.name}`,
      "#FFD700",
      4000 // Increased from 2000ms to 4000ms
    );

    this.addFloatingText(
      CONFIG.GAME.CANVAS_WIDTH / 2,
      CONFIG.GAME.CANVAS_HEIGHT / 2 - 20,
      `Entering ${spaceRegionName}`,
      "#87CEEB",
      3500 // Increased from 1500ms to 3500ms
    );
  }

  // 🌌 Space Transition Effects
  startSpaceTransition(callback) {
    if (this.isTransitioning) return;

    this.isTransitioning = true;
    this.transitionProgress = 0;
    this.transitionType = this.getTransitionType(this.level);
    this.transitionCallback = callback;
    this.levelTheme = this.getLevelTheme(this.level);

    // Generate transition particles
    this.generateTransitionParticles();

    console.log(
      `🌌 Starting ${this.transitionType} transition to ${this.levelTheme} space`
    );
    console.log("⏱️ Transition will last ~5 seconds with slowed gameplay");
  }

  updateSpaceTransition(deltaTime) {
    if (!this.isTransitioning) return;

    this.transitionProgress += deltaTime * 0.0008; // 5 second transition (slower for visibility)

    // Update transition particles
    this.spaceAmbientParticles.forEach((particle) => {
      particle.x += particle.vx * deltaTime;
      particle.y += particle.vy * deltaTime;
      particle.life -= deltaTime;
      particle.alpha = Math.max(0, particle.life / particle.maxLife);

      // Apply transition-specific effects
      if (this.transitionType === "warp") {
        particle.vx *= 1.05; // Slower acceleration for warp effect
        particle.vy *= 1.05;
      } else if (this.transitionType === "fold") {
        particle.scale = 1 + Math.sin(particle.life * 0.005) * 0.3; // Slower pulsing
      }
    });

    // Remove dead particles
    this.spaceAmbientParticles = this.spaceAmbientParticles.filter(
      (p) => p.life > 0
    );

    // Complete transition
    if (this.transitionProgress >= 1) {
      this.completeSpaceTransition();
    }
  }

  completeSpaceTransition() {
    this.isTransitioning = false;
    this.transitionProgress = 0;

    // Execute callback (level initialization)
    if (this.transitionCallback) {
      this.transitionCallback();
      this.transitionCallback = null;
    }

    // Generate ambient particles for new space region
    this.generateAmbientParticles();
  }

  generateTransitionParticles() {
    this.spaceAmbientParticles = [];
    const particleCount = 50;

    for (let i = 0; i < particleCount; i++) {
      const angle = (Math.PI * 2 * i) / particleCount;
      const distance = UTILS.randomFloat(100, 300);
      const speed = UTILS.randomFloat(0.5, 2);

      this.spaceAmbientParticles.push({
        x: CONFIG.GAME.CANVAS_WIDTH / 2 + Math.cos(angle) * distance,
        y: CONFIG.GAME.CANVAS_HEIGHT / 2 + Math.sin(angle) * distance,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        life: 5000, // Extended for longer visibility
        maxLife: 5000,
        alpha: 1,
        color: this.getTransitionColor(),
        size: UTILS.randomFloat(2, 6),
        scale: 1,
      });
    }
  }

  generateAmbientParticles() {
    // Add fewer, longer-lasting ambient particles for atmosphere
    const ambientCount = 20;

    for (let i = 0; i < ambientCount; i++) {
      this.spaceAmbientParticles.push({
        x: UTILS.randomFloat(0, CONFIG.GAME.CANVAS_WIDTH),
        y: UTILS.randomFloat(0, CONFIG.GAME.CANVAS_HEIGHT),
        vx: UTILS.randomFloat(-0.2, 0.2),
        vy: UTILS.randomFloat(-0.2, 0.2),
        life: UTILS.randomFloat(5000, 10000),
        maxLife: UTILS.randomFloat(5000, 10000),
        alpha: UTILS.randomFloat(0.3, 0.7),
        color: this.getAmbientColor(),
        size: UTILS.randomFloat(1, 3),
        scale: 1,
        twinkle: UTILS.randomFloat(0, Math.PI * 2),
      });
    }
  }

  getTransitionType(level) {
    if (level <= 2) return "fade";
    if (level <= 4) return "warp";
    if (level <= 6) return "fold";
    if (level <= 8) return "rift";
    return "quantum";
  }

  getLevelTheme(level) {
    if (level <= 2) return "nebula";
    if (level <= 4) return "asteroid";
    if (level <= 6) return "deep_space";
    if (level <= 8) return "void";
    return "galaxy";
  }

  getSpaceRegionName(level) {
    const themes = {
      nebula: "Stellar Nursery",
      asteroid: "Asteroid Fields",
      deep_space: "Deep Space Sector",
      void: "The Dark Void",
      galaxy: "Galactic Core",
    };
    return themes[this.getLevelTheme(level)] || "Unknown Space";
  }

  getTransitionColor() {
    const colors = {
      fade: "#87CEEB",
      warp: "#00FFFF",
      fold: "#9370DB",
      rift: "#FF6347",
      quantum: "#FFD700",
    };
    return colors[this.transitionType] || "#FFFFFF";
  }

  getAmbientColor() {
    const colors = {
      nebula: "#FF69B4",
      asteroid: "#CD853F",
      deep_space: "#191970",
      void: "#4B0082",
      galaxy: "#FFD700",
    };
    return colors[this.levelTheme] || "#FFFFFF";
  }

  addFloatingText(x, y, text, color = "#FFFFFF", duration = 1000) {
    this.floatingTexts.push({
      x,
      y,
      text,
      color,
      life: duration,
      maxLife: duration,
      alpha: 1,
      vx: 0,
      vy: -0.2, // Slower upward drift for better readability
    });
  }

  updateFloatingTexts(deltaTime) {
    this.floatingTexts.forEach((text) => {
      text.x += text.vx * deltaTime;
      text.y += text.vy * deltaTime;
      text.life -= deltaTime;
      text.alpha = Math.max(0, text.life / text.maxLife);
    });

    // Remove expired texts
    this.floatingTexts = this.floatingTexts.filter((text) => text.life > 0);
  }

  // Audio methods
  playSound(soundName, loop = false) {
    if (!this.soundEnabled) return;

    const audio = this.audioManager[soundName];
    if (audio) {
      audio.currentTime = 0;
      audio.loop = loop;
      audio.play().catch((e) => console.warn("Audio play failed:", e));
    }
  }

  toggleSound() {
    this.soundEnabled = !this.soundEnabled;

    if (!this.soundEnabled) {
      Object.values(this.audioManager).forEach((audio) => {
        if (audio) audio.pause();
      });
      this.currentMusicTrack = null;
    } else {
      // Resume music if game is playing
      if (this.gameState === GAME_STATES.PLAYING) {
        this.switchMusicTrack(this.musicIntensity);
      }
    }

    console.log(`🔊 Sound ${this.soundEnabled ? "enabled" : "disabled"}`);
  }

  handleResize() {
    // Handle responsive canvas resizing if needed
    const container = this.canvas.parentElement;
    if (!container) {
      console.warn("Canvas container not found during resize");
      return;
    }

    const containerRect = container.getBoundingClientRect();

    // Check if container is actually visible and has dimensions
    if (containerRect.width === 0 || containerRect.height === 0) {
      console.warn("Container has zero dimensions, skipping resize");
      return;
    }

    // Maintain aspect ratio
    const aspectRatio = CONFIG.GAME.CANVAS_WIDTH / CONFIG.GAME.CANVAS_HEIGHT;
    let newWidth = containerRect.width;
    let newHeight = newWidth / aspectRatio;

    if (newHeight > containerRect.height) {
      newHeight = containerRect.height;
      newWidth = newHeight * aspectRatio;
    }

    // Ensure minimum canvas size for visibility
    const minWidth = 200;
    const minHeight = 150;

    if (newWidth < minWidth) {
      newWidth = minWidth;
      newHeight = newWidth / aspectRatio;
    }

    if (newHeight < minHeight) {
      newHeight = minHeight;
      newWidth = newHeight * aspectRatio;
    }

    // Update canvas display size
    this.canvas.style.width = newWidth + "px";
    this.canvas.style.height = newHeight + "px";

    // Ensure canvas internal dimensions match config
    this.canvas.width = CONFIG.GAME.CANVAS_WIDTH;
    this.canvas.height = CONFIG.GAME.CANVAS_HEIGHT;

    // Force canvas to be visible and properly positioned
    this.canvas.style.display = "block";
    this.canvas.style.visibility = "visible";

    // Log resize info for debugging
    console.log(
      `🔄 Canvas resized: ${newWidth}x${newHeight} (display), ${this.canvas.width}x${this.canvas.height} (internal)`
    );

    // Ensure the canvas context is still valid
    if (!this.ctx || this.ctx.canvas !== this.canvas) {
      console.warn("Canvas context lost during resize, reinitializing...");
      this.ctx = this.canvas.getContext("2d");
    }

    // Force a redraw if game is active
    if (
      this.gameState === GAME_STATES.PLAYING ||
      this.gameState === GAME_STATES.PAUSED
    ) {
      requestAnimationFrame(() => {
        this.render();
      });
    }
  }

  // 🔧 Failsafe method to restore canvas visibility
  restoreCanvasVisibility() {
    console.log("🔧 Attempting to restore canvas visibility...");

    if (!this.canvas) {
      console.error("Canvas not found!");
      return false;
    }

    // Force canvas to be visible
    this.canvas.style.display = "block";
    this.canvas.style.visibility = "visible";
    this.canvas.style.opacity = "1";

    // Reset any potential positioning issues
    this.canvas.style.position = "relative";
    this.canvas.style.zIndex = "1";

    // Ensure canvas has proper dimensions
    this.canvas.width = CONFIG.GAME.CANVAS_WIDTH;
    this.canvas.height = CONFIG.GAME.CANVAS_HEIGHT;

    // Reinitialize context if needed
    if (!this.ctx || this.ctx.canvas !== this.canvas) {
      this.ctx = this.canvas.getContext("2d");
      console.log("🔧 Canvas context reinitialized");
    }

    // Force a resize to ensure proper sizing
    this.handleResize();

    // Force a redraw
    if (
      this.gameState === GAME_STATES.PLAYING ||
      this.gameState === GAME_STATES.PAUSED
    ) {
      this.render();
    }

    console.log("✅ Canvas visibility restoration complete");
    return true;
  }

  // 🛡️ Generate unique session ID for anti-cheat
  generateSessionId() {
    return Date.now().toString(36) + Math.random().toString(36).substr(2);
  }

  // Reset game to initial state
  resetGame() {
    console.log("🔄 Resetting game state...");

    // Reset game state
    this.gameState = GAME_STATES.MENU;
    this.score = 0;
    this.level = 1;
    this.lives = CONFIG.GAME.PLAYER.MAX_HEALTH;
    this.aliensKilled = 0;
    this.sessionSSDEarned = 0;
    this.scoreMultiplier = 1;
    this.isPaused = false;

    // Clear entities
    this.bullets = [];
    this.aliens = [];
    this.powerUps = [];
    this.particles = [];

    // Reset player
    if (this.player) {
      const playerX =
        CONFIG.GAME.CANVAS_WIDTH / 2 - CONFIG.GAME.PLAYER.WIDTH / 2;
      const playerY =
        CONFIG.GAME.CANVAS_HEIGHT - CONFIG.GAME.PLAYER.HEIGHT - 20;
      this.player = new Player(playerX, playerY);
    }

    // Reset level
    this.initLevel(1);

    // Stop any playing audio
    if (this.audioManager?.backgroundMusic) {
      this.audioManager.backgroundMusic.pause();
      this.audioManager.backgroundMusic.currentTime = 0;
    }

    // Update UI
    this.updateUI();

    console.log("✅ Game state reset complete");
  }

  // Setup touch controls for mobile devices
  setupTouchControls() {
    console.log("📱 Setting up touch controls...");

    // Detect if device supports touch
    this.isMobile = "ontouchstart" in window || navigator.maxTouchPoints > 0;

    if (!this.isMobile) {
      console.log("📱 Non-touch device detected, skipping touch controls");
      return;
    }

    console.log("📱 Touch device detected, initializing mobile controls");

    // Get touch control elements
    const mobileControls = document.getElementById("mobileControls");
    const virtualJoystick = document.getElementById("virtualJoystick");
    const joystickKnob = document.getElementById("joystickKnob");
    const fireButton = document.getElementById("fireButton");
    const mobilePauseBtn = document.getElementById("mobilePauseBtn");

    if (!mobileControls || !virtualJoystick || !fireButton) {
      console.warn("📱 Touch control elements not found");
      return;
    }

    // Show mobile controls
    mobileControls.classList.remove("hidden");

    // Update controls text for mobile
    const controlsText = document.getElementById("controlsText");
    if (controlsText) {
      controlsText.textContent =
        "📱 Use virtual joystick to move • Fire button to shoot • Top-right to pause";
    }

    // Virtual Joystick Touch Events
    const joystickBase = virtualJoystick.querySelector(".joystick-base");

    // Get joystick center position
    const getJoystickCenter = () => {
      const rect = joystickBase.getBoundingClientRect();
      return {
        x: rect.left + rect.width / 2,
        y: rect.top + rect.height / 2,
      };
    };

    // Update joystick knob position
    const updateJoystickKnob = (x, y) => {
      const center = getJoystickCenter();
      this.touchControls.joystick.deltaX = x - center.x;
      this.touchControls.joystick.deltaY = y - center.y;

      // Limit to max distance
      const distance = Math.sqrt(
        this.touchControls.joystick.deltaX ** 2 +
          this.touchControls.joystick.deltaY ** 2
      );

      if (distance > this.touchControls.joystick.maxDistance) {
        this.touchControls.joystick.deltaX =
          (this.touchControls.joystick.deltaX / distance) *
          this.touchControls.joystick.maxDistance;
        this.touchControls.joystick.deltaY =
          (this.touchControls.joystick.deltaY / distance) *
          this.touchControls.joystick.maxDistance;
      }

      // Update visual position
      joystickKnob.style.transform = `translate(-50%, -50%) translate(${this.touchControls.joystick.deltaX}px, ${this.touchControls.joystick.deltaY}px)`;
    };

    // Reset joystick to center
    const resetJoystick = () => {
      this.touchControls.joystick.active = false;
      this.touchControls.joystick.deltaX = 0;
      this.touchControls.joystick.deltaY = 0;
      joystickKnob.style.transform = "translate(-50%, -50%)";
      joystickBase.classList.remove("active");
    };

    // Joystick touch start
    virtualJoystick.addEventListener("touchstart", (e) => {
      e.preventDefault();
      const touch = e.touches[0];
      const center = getJoystickCenter();

      this.touchControls.joystick.active = true;
      this.touchControls.joystick.startX = center.x;
      this.touchControls.joystick.startY = center.y;

      updateJoystickKnob(touch.clientX, touch.clientY);
      joystickBase.classList.add("active");
    });

    // Joystick touch move
    virtualJoystick.addEventListener("touchmove", (e) => {
      e.preventDefault();
      if (!this.touchControls.joystick.active) return;

      const touch = e.touches[0];
      updateJoystickKnob(touch.clientX, touch.clientY);
    });

    // Joystick touch end
    virtualJoystick.addEventListener("touchend", (e) => {
      e.preventDefault();
      resetJoystick();
    });

    // Fire Button Touch Events
    const fireButtonInner = fireButton.querySelector(".fire-button-inner");

    fireButton.addEventListener("touchstart", (e) => {
      e.preventDefault();
      this.touchControls.fireButton.active = true;
      fireButtonInner.classList.add("active");
    });

    fireButton.addEventListener("touchend", (e) => {
      e.preventDefault();
      this.touchControls.fireButton.active = false;
      fireButtonInner.classList.remove("active");
    });

    // Prevent fire button from triggering when touch moves outside
    fireButton.addEventListener("touchcancel", (e) => {
      e.preventDefault();
      this.touchControls.fireButton.active = false;
      fireButtonInner.classList.remove("active");
    });

    // Mobile Pause Button
    if (mobilePauseBtn) {
      mobilePauseBtn.addEventListener("touchstart", (e) => {
        e.preventDefault();
        if (this.gameState === GAME_STATES.PLAYING) {
          this.pauseGame();
        } else if (this.gameState === GAME_STATES.PAUSED) {
          this.resumeGame();
        }
      });
    }

    // Prevent context menu on long press
    document.addEventListener("contextmenu", (e) => {
      if (
        this.isMobile &&
        (e.target.closest("#mobileControls") || e.target.closest("#gameCanvas"))
      ) {
        e.preventDefault();
      }
    });

    // Prevent page scrolling when touching game area
    document.addEventListener(
      "touchmove",
      (e) => {
        if (
          e.target.closest("#gameUI") ||
          e.target.closest("#mobileControls")
        ) {
          e.preventDefault();
        }
      },
      { passive: false }
    );

    console.log("✅ Touch controls initialized");
  }

  // Hide/show mobile controls based on game state
  updateMobileControlsVisibility() {
    if (!this.isMobile) return;

    const mobileControls = document.getElementById("mobileControls");
    if (!mobileControls) return;

    if (this.gameState === GAME_STATES.PLAYING) {
      mobileControls.classList.remove("hidden");
    } else {
      mobileControls.classList.add("hidden");
    }
  }

  // Save score to backend API
  async saveScore() {
    const playTime =
      this.gameStartTime > 0
        ? Math.floor((Date.now() - this.gameStartTime) / 1000)
        : 0;
    const powerUpsCollected = this.powerUpsCollected || 0;
    const accuracy = this.calculateAccuracy();

    const result = await web3Manager.saveScore(
      this.score,
      this.level,
      this.aliensKilled,
      "normal",
      this.gameSession,
      playTime,
      powerUpsCollected,
      accuracy
    );

    if (result && result.success) {
      console.log("💾 Score saved successfully!", result);
      return true;
    }
    return false;
  }

  // Calculate shooting accuracy
  calculateAccuracy() {
    if (this.totalShots === 0) return 0;
    return Math.round((this.totalHits / this.totalShots) * 100);
  }
}

// Create global game engine instance
const gameEngine = new GameEngine();

console.log("🎮 Game Engine Loaded");
