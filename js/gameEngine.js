// Somnia Space Defender - Game Engine
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

    // Game state
    this.score = 0;
    this.level = 1;
    this.lives = CONFIG.GAME.PLAYER.MAX_HEALTH;
    this.aliensKilled = 0;
    this.highScore = 0;
    this.isPaused = false;
    this.gameStartTime = 0;
    this.gameSession = null; // 🛡️ Track session for anti-cheat
    this.scoreMultiplier = 1; // 🛍️ SSD shop boost: 1x default, 2x with boost

    // Level management
    this.currentLevelConfig = null;
    this.alienSpawnTimer = 0;
    this.alienSpawnRate = CONFIG.GAME.ALIEN.SPAWN_RATE;
    this.aliensToSpawn = [];

    // Input handling
    this.keys = {};
    this.inputCooldown = {};

    // Audio
    this.audioManager = null;
    this.soundEnabled = true;

    // Performance tracking
    this.entityCleanupTimer = 0;
    this.performanceMode = false;

    // Visual effects
    this.screenShake = 0;
    this.backgroundOffset = 0;

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

    // Load high score
    this.highScore = web3Manager.getHighScore();
    this.updateUI();

    // Initialize first level
    this.initLevel(1);

    console.log("✅ Game Engine Initialized");
  }

  initAudio() {
    this.audioManager = {
      backgroundMusic: document.getElementById("backgroundMusic"),
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

    if (this.audioManager.backgroundMusic) {
      this.audioManager.backgroundMusic.volume = CONFIG.GAME.AUDIO.MUSIC_VOLUME;
    }
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

    // Resize handling
    window.addEventListener("resize", () => {
      this.handleResize();
    });
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
    }
  }

  handleKeyUp(e) {
    this.keys[e.code] = false;
  }

  handlePlayerInput() {
    if (!this.player || this.gameState !== GAME_STATES.PLAYING) return;

    // Movement
    this.player.keys.left = this.keys["KeyA"] || this.keys["ArrowLeft"];
    this.player.keys.right = this.keys["KeyD"] || this.keys["ArrowRight"];
    this.player.keys.up = this.keys["KeyW"] || this.keys["ArrowUp"];
    this.player.keys.down = this.keys["KeyS"] || this.keys["ArrowDown"];

    // Shooting
    if (this.keys["Space"] || this.keys["KeyJ"]) {
      const newBullets = this.player.shoot();
      this.bullets.push(...newBullets);

      if (newBullets.length > 0) {
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

    // Start background music
    this.playSound("backgroundMusic", true);

    this.updateUI();
    console.log("🚀 Game Started!");
  }

  pauseGame() {
    if (this.gameState === GAME_STATES.PLAYING) {
      this.isPaused = true;
      this.gameState = GAME_STATES.PAUSED;
      this.showPauseMenu();

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

      // Resume background music
      if (this.audioManager.backgroundMusic) {
        this.audioManager.backgroundMusic.play();
      }

      // Reset timing
      this.lastTime = performance.now();
    }
  }

  gameLoop(currentTime = performance.now()) {
    // Calculate delta time
    const deltaTime = Math.min(currentTime - this.lastTime, 50); // Cap delta time
    this.lastTime = currentTime;

    // Update FPS
    this.updateFPS(deltaTime);

    // Only update game if playing
    if (this.gameState === GAME_STATES.PLAYING && !this.isPaused) {
      this.update(deltaTime);
    }

    // Always render
    this.render();

    // Continue game loop
    if (
      this.gameState === GAME_STATES.PLAYING ||
      this.gameState === GAME_STATES.PAUSED
    ) {
      requestAnimationFrame((time) => this.gameLoop(time));
    }
  }

  update(deltaTime) {
    // Handle input
    this.handlePlayerInput();

    // Update player
    if (this.player) {
      this.player.update(deltaTime);

      // Check if player died
      if (this.player.health <= 0) {
        this.handlePlayerDeath();
        return;
      }
    }

    // Update bullets
    this.updateBullets(deltaTime);

    // Update aliens
    this.updateAliens(deltaTime);

    // Update power-ups
    this.updatePowerUps(deltaTime);

    // Update particles
    this.updateParticles(deltaTime);

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

        if (bullet.collidesWith(alien)) {
          // Damage alien
          const destroyed = alien.takeDamage(bullet.damage);
          bullet.active = false;

          if (destroyed) {
            this.handleAlienDestroyed(alien);
          } else {
            // Just damaged
            this.addParticles(
              alien.x + alien.width / 2,
              alien.y + alien.height / 2,
              "small"
            );
          }

          break;
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
          this.addParticles(
            powerUp.x + powerUp.width / 2,
            powerUp.y + powerUp.height / 2,
            "TRAIL"
          );
          break;
        }
      }
    }
  }

  handleAlienDestroyed(alien) {
    // Add score with multiplier boost
    const baseScore = alien.points;
    const multipliedScore = baseScore * this.scoreMultiplier;
    this.score += multipliedScore;
    this.aliensKilled++;

    // Show score multiplier effect if active
    if (this.scoreMultiplier > 1) {
      console.log(
        `🚀 Score boost! ${baseScore} x${this.scoreMultiplier} = ${multipliedScore}`
      );
    }

    // Track SSD earned this session
    const ssdPerKill = parseFloat(CONFIG.SSD.REWARD_PER_KILL);
    this.sessionSSDEarned += ssdPerKill;

    // Update SSD display in real-time (if available)
    if (window.gameApp && window.gameApp.updateSessionSSD) {
      window.gameApp.updateSessionSSD(this.sessionSSDEarned);
    }

    // Create explosion effect
    this.addParticles(
      alien.x + alien.width / 2,
      alien.y + alien.height / 2,
      "EXPLOSION"
    );
    this.playSound("explosionSound");
    this.addScreenShake(5);

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

  handlePlayerDeath() {
    this.lives--;

    if (this.lives <= 0) {
      this.gameOver();
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

  gameOver() {
    this.gameState = GAME_STATES.GAME_OVER;

    // Stop background music
    if (this.audioManager.backgroundMusic) {
      this.audioManager.backgroundMusic.pause();
      this.audioManager.backgroundMusic.currentTime = 0;
    }

    // Check for new high score (compared to previously saved blockchain scores)
    const savedHighScore = web3Manager.getHighScore();
    const isNewHighScore = this.score > savedHighScore;

    // Update local high score for display
    if (this.score > this.highScore) {
      this.highScore = this.score;
    }

    // Show game over screen with blockchain comparison
    this.showGameOverScreen(isNewHighScore);

    console.log(
      `💀 Game Over! Score: ${this.score}, Level: ${this.level}, Aliens Killed: ${this.aliensKilled}`
    );
  }

  checkLevelProgression() {
    // Level up every 10 aliens killed (adjust as needed)
    const aliensNeededForNextLevel = this.level * 10;
    if (this.aliensKilled >= aliensNeededForNextLevel && this.level < 10) {
      this.level++;
      this.initLevel(this.level);

      // Show level up notification
      this.showLevelUpNotification();
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
      this.bullets = this.bullets.filter((bullet) => bullet.active);
      this.aliens = this.aliens.filter((alien) => alien.active);
      this.powerUps = this.powerUps.filter((powerUp) => powerUp.active);
      this.particles = this.particles.filter((particle) => particle.active);

      this.entityCleanupTimer = 0;
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

    // Render game entities
    this.renderEntities();

    // Render UI overlays
    this.renderGameUI();

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
    // Space background with moving stars
    this.ctx.fillStyle = "rgba(0, 5, 20, 0.1)";
    this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

    // Moving star field
    this.ctx.fillStyle = "#ffffff";
    for (let i = 0; i < 50; i++) {
      const x = (i * 37) % this.canvas.width;
      const y =
        (i * 23 + this.backgroundOffset * (1 + (i % 3))) % this.canvas.height;
      const alpha = 0.3 + (i % 3) * 0.3;

      this.ctx.globalAlpha = alpha;
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

  updateFPS(deltaTime) {
    this.frameCount++;
    this.fpsUpdateTime += deltaTime;

    if (this.fpsUpdateTime >= 1000) {
      this.fps = (this.frameCount * 1000) / this.fpsUpdateTime;
      this.frameCount = 0;
      this.fpsUpdateTime = 0;
    }
  }

  updateUI() {
    document.getElementById("score").textContent = UTILS.formatScore(
      this.score
    );
    document.getElementById("level").textContent = this.level;
    document.getElementById("lives").textContent = this.player
      ? this.player.health
      : this.lives;
    document.getElementById("highScore").textContent = UTILS.formatScore(
      this.highScore
    );
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
    // You can implement a toast notification here
    console.log(`🎉 Level Up! Welcome to ${this.currentLevelConfig.name}`);
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
    }

    console.log(`🔊 Sound ${this.soundEnabled ? "enabled" : "disabled"}`);
  }

  handleResize() {
    // Handle responsive canvas resizing if needed
    const container = this.canvas.parentElement;
    const containerRect = container.getBoundingClientRect();

    // Maintain aspect ratio
    const aspectRatio = CONFIG.GAME.CANVAS_WIDTH / CONFIG.GAME.CANVAS_HEIGHT;
    let newWidth = containerRect.width;
    let newHeight = newWidth / aspectRatio;

    if (newHeight > containerRect.height) {
      newHeight = containerRect.height;
      newWidth = newHeight * aspectRatio;
    }

    this.canvas.style.width = newWidth + "px";
    this.canvas.style.height = newHeight + "px";
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

  // Save score to blockchain
  async saveScore() {
    const success = await web3Manager.saveScore(
      this.score,
      this.level,
      this.aliensKilled,
      "normal",
      this.gameSession // 🛡️ Pass session for validation
    );
    if (success) {
      console.log("💾 Score saved to Somnia blockchain!");
      return true;
    }
    return false;
  }
}

// Create global game engine instance
const gameEngine = new GameEngine();

console.log("🎮 Game Engine Loaded");
