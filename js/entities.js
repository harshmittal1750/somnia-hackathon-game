// Somnia Space Defender - Game Entities

// Base Entity Class
class Entity {
  constructor(x, y, width, height) {
    this.x = x;
    this.y = y;
    this.width = width;
    this.height = height;
    this.vx = 0; // velocity x
    this.vy = 0; // velocity y
    this.active = true;
    this.id = UTILS.generateId();
  }

  update(deltaTime) {
    this.x += this.vx * deltaTime;
    this.y += this.vy * deltaTime;
  }

  render(ctx) {
    // Override in subclasses
  }

  getBounds() {
    return {
      x: this.x,
      y: this.y,
      width: this.width,
      height: this.height,
    };
  }

  getCenter() {
    return {
      x: this.x + this.width / 2,
      y: this.y + this.height / 2,
    };
  }

  collidesWith(other) {
    return UTILS.checkCollision(this.getBounds(), other.getBounds());
  }

  isOffScreen(canvasWidth, canvasHeight, margin = 50) {
    return (
      this.x < -margin ||
      this.x > canvasWidth + margin ||
      this.y < -margin ||
      this.y > canvasHeight + margin
    );
  }
}

// Player Spaceship
class Player extends Entity {
  constructor(x, y) {
    super(x, y, CONFIG.GAME.PLAYER.WIDTH, CONFIG.GAME.PLAYER.HEIGHT);
    this.health = CONFIG.GAME.PLAYER.MAX_HEALTH;
    this.maxHealth = CONFIG.GAME.PLAYER.MAX_HEALTH;
    this.speed = CONFIG.GAME.PLAYER.SPEED;
    this.lastShot = 0;
    this.weaponCooldown = CONFIG.GAME.PLAYER.WEAPON_COOLDOWN;

    // Power-ups
    this.powerUps = new Map();
    this.shieldActive = false;
    this.rapidFireActive = false;
    this.multiShotActive = false;

    // Visual effects
    this.thrusterOffset = 0;
    this.shieldRadius = 30;
    this.shieldAlpha = 0.7;

    // Input state
    this.keys = {
      up: false,
      down: false,
      left: false,
      right: false,
      shoot: false,
    };

    // Immunity after taking damage
    this.immunityTime = 0;
    this.isImmune = false;
  }

  update(deltaTime) {
    // Handle movement
    this.handleMovement(deltaTime);

    // Update power-ups
    this.updatePowerUps(deltaTime);

    // Update immunity
    if (this.isImmune) {
      this.immunityTime -= deltaTime;
      if (this.immunityTime <= 0) {
        this.isImmune = false;
      }
    }

    // Update visual effects
    this.thrusterOffset = Math.sin(Date.now() * 0.01) * 2;

    super.update(deltaTime);
  }

  handleMovement(deltaTime) {
    let vx = 0;
    let vy = 0;

    if (this.keys.left) vx -= this.speed;
    if (this.keys.right) vx += this.speed;
    if (this.keys.up) vy -= this.speed;
    if (this.keys.down) vy += this.speed;

    // Normalize diagonal movement
    if (vx !== 0 && vy !== 0) {
      const magnitude = Math.sqrt(vx * vx + vy * vy);
      vx = (vx / magnitude) * this.speed;
      vy = (vy / magnitude) * this.speed;
    }

    this.vx = vx;
    this.vy = vy;

    // Keep player on screen
    this.x = UTILS.clamp(this.x, 0, CONFIG.GAME.CANVAS_WIDTH - this.width);
    this.y = UTILS.clamp(this.y, 0, CONFIG.GAME.CANVAS_HEIGHT - this.height);
  }

  updatePowerUps(deltaTime) {
    // Update all active power-ups
    for (const [type, powerUp] of this.powerUps) {
      powerUp.duration -= deltaTime;
      if (powerUp.duration <= 0) {
        this.removePowerUp(type);
      }
    }

    // Update power-up states
    this.rapidFireActive = this.powerUps.has("rapid_fire");
    this.multiShotActive = this.powerUps.has("multi_shot");
    this.shieldActive = this.powerUps.has("shield");

    // 🐛 DEBUG: Log power-up states
    if (this.multiShotActive) {
      console.log(
        `🐛 DEBUG: multiShotActive is TRUE (powerUps has multi_shot: ${this.powerUps.has(
          "multi_shot"
        )})`
      );
    }

    // Adjust weapon cooldown for rapid fire
    this.weaponCooldown = this.rapidFireActive
      ? CONFIG.GAME.PLAYER.WEAPON_COOLDOWN * 0.3
      : CONFIG.GAME.PLAYER.WEAPON_COOLDOWN;
  }

  canShoot() {
    return Date.now() - this.lastShot >= this.weaponCooldown;
  }

  shoot() {
    if (!this.canShoot()) return [];

    this.lastShot = Date.now();
    const bullets = [];
    const centerX = this.x + this.width / 2;
    const topY = this.y;

    // 🐛 DEBUG: Check multi-shot status
    console.log(`🔫 SHOOTING - multiShotActive: ${this.multiShotActive}`);

    if (this.multiShotActive) {
      // Multi-shot: 3 bullets in a spread pattern
      console.log("🔫 Creating 3 bullets (multi-shot)");
      bullets.push(new Bullet(centerX - 2, topY, 0, -CONFIG.GAME.BULLET.SPEED));
      bullets.push(
        new Bullet(centerX - 8, topY, -1, -CONFIG.GAME.BULLET.SPEED)
      );
      bullets.push(new Bullet(centerX + 6, topY, 1, -CONFIG.GAME.BULLET.SPEED));
    } else {
      // Single shot
      console.log("🔫 Creating 1 bullet (single shot)");
      bullets.push(new Bullet(centerX - 2, topY, 0, -CONFIG.GAME.BULLET.SPEED));
    }

    console.log(`🔫 Total bullets created: ${bullets.length}`);
    return bullets;
  }

  takeDamage(amount = 1) {
    if (this.isImmune || this.shieldActive) return false;

    this.health -= amount;
    this.isImmune = true;
    this.immunityTime = CONFIG.GAME.PLAYER.RESPAWN_IMMUNITY;

    // Remove shield if active
    if (this.shieldActive) {
      this.removePowerUp("shield");
    }

    return true;
  }

  heal(amount = 1) {
    this.health = Math.min(this.maxHealth, this.health + amount);
  }

  addPowerUp(type, duration) {
    this.powerUps.set(type, { duration, startTime: Date.now() });

    // Special handling for instant effects
    if (type === "health") {
      this.heal(1);
      return;
    }

    console.log(
      `🔋 Power-up activated: ${
        CONFIG.GAME.POWERUP_TYPES[type.toUpperCase()]?.effect || type
      }`
    );

    // 🐛 DEBUG: Log power-up map state
    console.log(
      `🐛 DEBUG: PowerUps map now has: ${Array.from(this.powerUps.keys()).join(
        ", "
      )}`
    );
  }

  removePowerUp(type) {
    this.powerUps.delete(type);
    console.log(`🔋 Power-up expired: ${type}`);
  }

  render(ctx) {
    const centerX = this.x + this.width / 2;
    const centerY = this.y + this.height / 2;

    // Render shield
    if (this.shieldActive) {
      this.renderShield(ctx, centerX, centerY);
    }

    // Render immunity flashing effect
    if (this.isImmune && Math.floor(Date.now() / 100) % 2) {
      ctx.globalAlpha = 0.5;
    }

    // Render thruster trail
    this.renderThruster(ctx);

    // Render player ship
    this.renderShip(ctx, centerX, centerY);

    ctx.globalAlpha = 1;

    // Render health bar
    this.renderHealthBar(ctx);
  }

  renderShip(ctx, centerX, centerY) {
    ctx.save();

    // Ship body (triangle)
    ctx.fillStyle = "#00aaff";
    ctx.strokeStyle = "#ffffff";
    ctx.lineWidth = 2;

    ctx.beginPath();
    ctx.moveTo(centerX, this.y); // Top point
    ctx.lineTo(this.x + 5, this.y + this.height); // Bottom left
    ctx.lineTo(this.x + this.width - 5, this.y + this.height); // Bottom right
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    // Ship details
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(centerX - 2, this.y + 10, 4, 15);

    // Wing details
    ctx.fillStyle = "#ff4400";
    ctx.fillRect(this.x + 2, this.y + 20, 8, 4);
    ctx.fillRect(this.x + this.width - 10, this.y + 20, 8, 4);

    ctx.restore();
  }

  renderThruster(ctx) {
    if (this.vy < 0 || this.vx !== 0) {
      // Show thruster when moving
      const thrusterX = this.x + this.width / 2;
      const thrusterY = this.y + this.height + this.thrusterOffset;

      ctx.save();
      ctx.fillStyle = "#ff8800";
      ctx.globalAlpha = 0.8;

      ctx.beginPath();
      ctx.moveTo(thrusterX, thrusterY);
      ctx.lineTo(thrusterX - 6, thrusterY + 8);
      ctx.lineTo(thrusterX + 6, thrusterY + 8);
      ctx.closePath();
      ctx.fill();

      // Inner flame
      ctx.fillStyle = "#ffff00";
      ctx.beginPath();
      ctx.moveTo(thrusterX, thrusterY);
      ctx.lineTo(thrusterX - 3, thrusterY + 5);
      ctx.lineTo(thrusterX + 3, thrusterY + 5);
      ctx.closePath();
      ctx.fill();

      ctx.restore();
    }
  }

  renderShield(ctx, centerX, centerY) {
    ctx.save();
    ctx.globalAlpha = this.shieldAlpha;
    ctx.strokeStyle = "#00ffff";
    ctx.lineWidth = 3;
    ctx.setLineDash([5, 5]);
    ctx.lineDashOffset = Date.now() * 0.01;

    ctx.beginPath();
    ctx.arc(centerX, centerY, this.shieldRadius, 0, Math.PI * 2);
    ctx.stroke();

    ctx.restore();
  }

  renderHealthBar(ctx) {
    const barWidth = this.width;
    const barHeight = 4;
    const barX = this.x;
    const barY = this.y - 10;

    // Background
    ctx.fillStyle = "rgba(255, 255, 255, 0.3)";
    ctx.fillRect(barX, barY, barWidth, barHeight);

    // Health
    const healthPercent = this.health / this.maxHealth;
    ctx.fillStyle =
      healthPercent > 0.6
        ? "#00ff00"
        : healthPercent > 0.3
        ? "#ffff00"
        : "#ff0000";
    ctx.fillRect(barX, barY, barWidth * healthPercent, barHeight);
  }
}

// Bullet Class
class Bullet extends Entity {
  constructor(x, y, vx, vy, damage = CONFIG.GAME.BULLET.DAMAGE) {
    super(x, y, CONFIG.GAME.BULLET.WIDTH, CONFIG.GAME.BULLET.HEIGHT);
    this.vx = vx;
    this.vy = vy;
    this.damage = damage;
    this.trail = [];
    this.maxTrailLength = 5;
  }

  update(deltaTime) {
    // Add current position to trail
    this.trail.push({ x: this.x, y: this.y });
    if (this.trail.length > this.maxTrailLength) {
      this.trail.shift();
    }

    super.update(deltaTime);

    // Deactivate if off screen
    if (this.isOffScreen(CONFIG.GAME.CANVAS_WIDTH, CONFIG.GAME.CANVAS_HEIGHT)) {
      this.active = false;
    }
  }

  render(ctx) {
    // Render trail
    ctx.save();
    for (let i = 0; i < this.trail.length; i++) {
      const alpha = ((i + 1) / this.trail.length) * 0.5;
      ctx.globalAlpha = alpha;
      ctx.fillStyle = "#4444ff";
      ctx.fillRect(this.trail[i].x, this.trail[i].y, this.width, this.height);
    }
    ctx.restore();

    // Render bullet
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(this.x, this.y, this.width, this.height);

    // Glowing effect
    ctx.save();
    ctx.shadowColor = "#ffffff";
    ctx.shadowBlur = 5;
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(this.x, this.y, this.width, this.height);
    ctx.restore();
  }
}

// Alien Classes
class Alien extends Entity {
  constructor(x, y, type = "BASIC") {
    const alienType = CONFIG.GAME.ALIEN_TYPES[type];
    super(x, y, CONFIG.GAME.ALIEN.WIDTH, CONFIG.GAME.ALIEN.HEIGHT);

    this.type = type;
    this.health = alienType.health;
    this.maxHealth = alienType.health;
    this.baseSpeed = alienType.speed;
    this.points = alienType.points;
    this.color = alienType.color;
    this.pattern = alienType.pattern;

    // Movement pattern variables
    this.angle = 0;
    this.amplitude = 50;
    this.frequency = 0.02;
    this.originalX = x;

    // Visual effects
    this.pulsePhase = Math.random() * Math.PI * 2;
    this.scale = 1;

    this.initializeMovement();
  }

  initializeMovement() {
    switch (this.pattern) {
      case "straight":
        this.vy = this.baseSpeed;
        break;
      case "zigzag":
        this.vy = this.baseSpeed * 0.7;
        this.vx = this.baseSpeed * 0.5;
        break;
      case "circle":
        this.vy = this.baseSpeed * 0.5;
        break;
      default:
        this.vy = this.baseSpeed;
    }
  }

  update(deltaTime) {
    this.updateMovementPattern(deltaTime);

    // Update visual effects
    this.pulsePhase += 0.1;
    this.scale = 1 + Math.sin(this.pulsePhase) * 0.1;

    super.update(deltaTime);

    // Deactivate if off screen
    if (this.isOffScreen(CONFIG.GAME.CANVAS_WIDTH, CONFIG.GAME.CANVAS_HEIGHT)) {
      this.active = false;
    }
  }

  updateMovementPattern(deltaTime) {
    switch (this.pattern) {
      case "zigzag":
        this.angle += this.frequency * deltaTime;
        this.vx = Math.sin(this.angle) * this.baseSpeed;
        break;
      case "circle":
        this.angle += this.frequency * deltaTime;
        this.x = this.originalX + Math.sin(this.angle) * this.amplitude;
        break;
    }
  }

  takeDamage(amount = 1) {
    this.health -= amount;
    if (this.health <= 0) {
      this.active = false;
      return true; // Alien destroyed
    }
    return false; // Alien damaged but alive
  }

  render(ctx) {
    ctx.save();

    const centerX = this.x + this.width / 2;
    const centerY = this.y + this.height / 2;

    // Scale for pulse effect
    ctx.translate(centerX, centerY);
    ctx.scale(this.scale, this.scale);
    ctx.translate(-centerX, -centerY);

    // Render alien based on type
    this.renderAlienShape(ctx, centerX, centerY);

    // Health bar for tougher aliens
    if (this.maxHealth > 1) {
      this.renderHealthBar(ctx);
    }

    ctx.restore();
  }

  renderAlienShape(ctx, centerX, centerY) {
    ctx.fillStyle = this.color;
    ctx.strokeStyle = "#ffffff";
    ctx.lineWidth = 1;

    switch (this.type) {
      case "BASIC":
        this.renderBasicAlien(ctx, centerX, centerY);
        break;
      case "FAST":
        this.renderFastAlien(ctx, centerX, centerY);
        break;
      case "TANK":
        this.renderTankAlien(ctx, centerX, centerY);
        break;
      case "BOSS":
        this.renderBossAlien(ctx, centerX, centerY);
        break;
    }
  }

  renderBasicAlien(ctx, centerX, centerY) {
    // Simple diamond shape
    ctx.beginPath();
    ctx.moveTo(centerX, this.y);
    ctx.lineTo(this.x + this.width, centerY);
    ctx.lineTo(centerX, this.y + this.height);
    ctx.lineTo(this.x, centerY);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
  }

  renderFastAlien(ctx, centerX, centerY) {
    // Arrow-like shape
    ctx.beginPath();
    ctx.moveTo(centerX, this.y);
    ctx.lineTo(this.x + this.width * 0.8, this.y + this.height * 0.3);
    ctx.lineTo(this.x + this.width * 0.6, this.y + this.height);
    ctx.lineTo(this.x + this.width * 0.4, this.y + this.height);
    ctx.lineTo(this.x + this.width * 0.2, this.y + this.height * 0.3);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
  }

  renderTankAlien(ctx, centerX, centerY) {
    // Rectangle with extra armor details
    ctx.fillRect(this.x, this.y, this.width, this.height);
    ctx.strokeRect(this.x, this.y, this.width, this.height);

    // Armor plates
    ctx.fillStyle = "#6666ff";
    ctx.fillRect(this.x + 2, this.y + 2, this.width - 4, 4);
    ctx.fillRect(this.x + 2, this.y + this.height - 6, this.width - 4, 4);
  }

  renderBossAlien(ctx, centerX, centerY) {
    // Complex shape for boss
    ctx.beginPath();
    ctx.arc(centerX, centerY, this.width / 2, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    // Boss details
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(centerX - 3, centerY - 3, 6, 6);

    // Boss spikes
    for (let i = 0; i < 6; i++) {
      const angle = (i / 6) * Math.PI * 2;
      const spikeX = centerX + Math.cos(angle) * (this.width / 2 + 5);
      const spikeY = centerY + Math.sin(angle) * (this.height / 2 + 5);

      ctx.beginPath();
      ctx.moveTo(
        centerX + (Math.cos(angle) * this.width) / 2,
        centerY + (Math.sin(angle) * this.height) / 2
      );
      ctx.lineTo(spikeX, spikeY);
      ctx.stroke();
    }
  }

  renderHealthBar(ctx) {
    const barWidth = this.width;
    const barHeight = 3;
    const barX = this.x;
    const barY = this.y - 8;

    // Background
    ctx.fillStyle = "rgba(255, 255, 255, 0.3)";
    ctx.fillRect(barX, barY, barWidth, barHeight);

    // Health
    const healthPercent = this.health / this.maxHealth;
    ctx.fillStyle =
      healthPercent > 0.6
        ? "#00ff00"
        : healthPercent > 0.3
        ? "#ffff00"
        : "#ff0000";
    ctx.fillRect(barX, barY, barWidth * healthPercent, barHeight);
  }
}

// Power-up Class
class PowerUp extends Entity {
  constructor(x, y, type) {
    super(x, y, CONFIG.GAME.POWERUP.WIDTH, CONFIG.GAME.POWERUP.HEIGHT);
    this.type = type;
    this.config = CONFIG.GAME.POWERUP_TYPES[type.toUpperCase()];
    this.vy = CONFIG.GAME.POWERUP.SPEED;
    this.rotationAngle = 0;
    this.pulsePhase = Math.random() * Math.PI * 2;
    this.collected = false;
  }

  update(deltaTime) {
    this.rotationAngle += 0.05;
    this.pulsePhase += 0.1;

    super.update(deltaTime);

    // Deactivate if off screen
    if (this.isOffScreen(CONFIG.GAME.CANVAS_WIDTH, CONFIG.GAME.CANVAS_HEIGHT)) {
      this.active = false;
    }
  }

  render(ctx) {
    const centerX = this.x + this.width / 2;
    const centerY = this.y + this.height / 2;
    const scale = 1 + Math.sin(this.pulsePhase) * 0.2;

    ctx.save();
    ctx.translate(centerX, centerY);
    ctx.rotate(this.rotationAngle);
    ctx.scale(scale, scale);

    // Power-up glow
    ctx.shadowColor = this.config.color;
    ctx.shadowBlur = 15;

    // Power-up shape
    ctx.fillStyle = this.config.color;
    ctx.strokeStyle = "#ffffff";
    ctx.lineWidth = 2;

    ctx.beginPath();
    ctx.arc(0, 0, this.width / 2, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    // Power-up symbol
    ctx.fillStyle = "#ffffff";
    ctx.font = "12px Arial";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";

    const symbol = this.getPowerUpSymbol();
    ctx.fillText(symbol, 0, 0);

    ctx.restore();
  }

  getPowerUpSymbol() {
    switch (this.type) {
      case "rapid_fire":
        return "⚡";
      case "shield":
        return "🛡️";
      case "multi_shot":
        return "💥";
      case "health":
        return "+";
      default:
        return "?";
    }
  }
}

// Particle Class for visual effects
class Particle extends Entity {
  constructor(x, y, vx, vy, color, life) {
    super(x, y, 2, 2);
    this.vx = vx;
    this.vy = vy;
    this.color = color;
    this.life = life;
    this.maxLife = life;
    this.gravity = 0.1;
  }

  update(deltaTime) {
    this.vy += this.gravity;
    this.life -= deltaTime;

    if (this.life <= 0) {
      this.active = false;
    }

    super.update(deltaTime);
  }

  render(ctx) {
    const alpha = this.life / this.maxLife;
    const size = (this.life / this.maxLife) * 4;

    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.fillStyle = this.color;
    ctx.fillRect(this.x, this.y, size, size);
    ctx.restore();
  }
}

// Explosion effect generator
class ExplosionEffect {
  static create(x, y, type = "EXPLOSION") {
    const config = CONFIG.GAME.PARTICLES[type];

    // Safety check: if particle type doesn't exist, use EXPLOSION as fallback
    if (!config) {
      console.warn(
        `⚠️ Particle type '${type}' not found, using EXPLOSION instead`
      );
      return this.create(x, y, "EXPLOSION");
    }

    const particles = [];

    for (let i = 0; i < config.count; i++) {
      const angle = (Math.PI * 2 * i) / config.count;
      const speed = UTILS.randomFloat(1, config.speed);
      const vx = Math.cos(angle) * speed;
      const vy = Math.sin(angle) * speed;
      const color =
        config.colors[Math.floor(Math.random() * config.colors.length)];
      const life = config.life + Math.random() * 10;

      particles.push(new Particle(x, y, vx, vy, color, life));
    }

    return particles;
  }
}

console.log("🎮 Game Entities Loaded");
