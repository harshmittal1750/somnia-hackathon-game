// Somnia Space Defender - Main Application Controller
class GameApp {
  constructor() {
    this.currentState = GAME_STATES.LOADING;
    this.selectedLevel = 1;
    this.isInitialized = false;
    this.loadingProgress = 0;
    this.audioLoaded = false;

    this.init();
  }

  async init() {
    console.log("🚀 Initializing Somnia Space Defender...");

    try {
      // Show loading screen
      this.showLoadingScreen();

      // Initialize components step by step
      await this.loadAssets();
      await this.initializeComponents();
      this.setupEventListeners();
      this.initializeUI();

      // Check wallet connection status
      this.checkWalletConnection();

      this.isInitialized = true;
      console.log("✅ Game fully initialized!");

      // Hide loading screen and show wallet connection
      this.hideLoadingScreen();
      this.showWalletPanel();
    } catch (error) {
      console.error("❌ Failed to initialize game:", error);
      this.showErrorScreen(error.message);
    }
  }

  async loadAssets() {
    console.log("📦 Loading game assets...");

    // Simulate asset loading with progress
    const loadingSteps = [
      { name: "Audio files", duration: 800 },
      { name: "Game engine", duration: 500 },
      { name: "Blockchain connection", duration: 700 },
      { name: "UI components", duration: 400 },
      { name: "Level data", duration: 300 },
    ];

    for (let i = 0; i < loadingSteps.length; i++) {
      const step = loadingSteps[i];
      this.updateLoadingProgress(
        (i / loadingSteps.length) * 100,
        `Loading ${step.name}...`
      );

      // Simulate loading time
      await new Promise((resolve) => setTimeout(resolve, step.duration));

      // Actually load audio files when we get to that step
      if (step.name === "Audio files") {
        await this.preloadAudio();
      }
    }

    this.updateLoadingProgress(100, "Ready to launch!");
    await new Promise((resolve) => setTimeout(resolve, 500));
  }

  async preloadAudio() {
    const audioFiles = [
      "backgroundMusic",
      "shootSound",
      "explosionSound",
      "powerupSound",
    ];

    console.log("🔊 Attempting to load audio files...");

    const promises = audioFiles.map((audioId) => {
      return new Promise((resolve) => {
        const audio = document.getElementById(audioId);
        if (audio) {
          // Set a timeout to prevent hanging on broken audio files
          const timeout = setTimeout(() => {
            console.warn(`⚠️ Audio file ${audioId} failed to load (timeout)`);
            resolve();
          }, 2000);

          audio.addEventListener(
            "canplaythrough",
            () => {
              clearTimeout(timeout);
              console.log(`✅ Audio loaded: ${audioId}`);
              resolve();
            },
            { once: true }
          );

          audio.addEventListener(
            "error",
            (e) => {
              clearTimeout(timeout);
              console.warn(`⚠️ Audio file ${audioId} failed to load:`, e);
              resolve(); // Continue even if audio fails
            },
            { once: true }
          );

          try {
            audio.load();
          } catch (error) {
            clearTimeout(timeout);
            console.warn(`⚠️ Audio file ${audioId} error:`, error);
            resolve();
          }
        } else {
          console.warn(`⚠️ Audio element not found: ${audioId}`);
          resolve();
        }
      });
    });

    await Promise.all(promises);
    this.audioLoaded = true;
    console.log("🔊 Audio loading completed (some files may have failed)");
  }

  async initializeComponents() {
    // Initialize game engine
    if (typeof gameEngine !== "undefined") {
      console.log("🎮 Game engine ready");
    }

    // Initialize Web3 manager
    if (typeof web3Manager !== "undefined") {
      console.log("🔗 Web3 manager ready");
    }

    // Initialize level manager
    if (typeof levelManager !== "undefined") {
      console.log("📊 Level manager ready");
    }
  }

  setupEventListeners() {
    // Wallet connection
    document.getElementById("connectWallet")?.addEventListener("click", () => {
      this.connectWallet();
    });

    // Refresh connection
    document
      .getElementById("refreshConnection")
      ?.addEventListener("click", () => {
        this.refreshConnection();
      });

    // Level selection
    document.querySelectorAll(".level-btn").forEach((btn) => {
      btn.addEventListener("click", (e) => {
        this.selectLevel(parseInt(e.target.dataset.level));
      });
    });

    // Game controls
    document.getElementById("startGame")?.addEventListener("click", () => {
      this.startGame();
    });

    document.getElementById("pauseBtn")?.addEventListener("click", () => {
      gameEngine.pauseGame();
    });

    document.getElementById("resumeGame")?.addEventListener("click", () => {
      gameEngine.resumeGame();
    });

    document.getElementById("restartGame")?.addEventListener("click", () => {
      this.restartGame();
    });

    document.getElementById("backToMenu")?.addEventListener("click", () => {
      this.backToMenu();
    });

    document.getElementById("playAgain")?.addEventListener("click", () => {
      this.startGame();
    });

    document
      .getElementById("backToMenuFromGameOver")
      ?.addEventListener("click", () => {
        this.backToMenu();
      });

    // Leaderboard
    document.getElementById("leaderboard")?.addEventListener("click", () => {
      this.showLeaderboard();
    });

    document
      .getElementById("closeLeaderboard")
      ?.addEventListener("click", () => {
        this.hideLeaderboard();
      });

    // SSD Shop event listeners
    document.getElementById("openShop")?.addEventListener("click", () => {
      this.showSSDShop();
    });

    document.getElementById("closeShop")?.addEventListener("click", () => {
      this.hideSSDShop();
    });

    // Twitter verification event listeners
    document.getElementById("openTwitter")?.addEventListener("click", () => {
      this.showTwitterPanel();
    });

    document.getElementById("closeTwitter")?.addEventListener("click", () => {
      this.hideTwitterPanel();
    });

    document.getElementById("verifyTwitter")?.addEventListener("click", () => {
      this.verifyTwitter();
    });

    // Upcoming features event listeners
    document.getElementById("openFeatures")?.addEventListener("click", () => {
      this.showUpcomingFeatures();
    });

    document.getElementById("closeFeatures")?.addEventListener("click", () => {
      this.hideUpcomingFeatures();
    });

    // Admin panel event listeners
    document.getElementById("openAdmin")?.addEventListener("click", () => {
      this.checkAndShowAdminPanel();
    });

    document.getElementById("closeAdmin")?.addEventListener("click", () => {
      this.hideAdminPanel();
    });

    document.getElementById("fundContract")?.addEventListener("click", () => {
      this.fundContract();
    });

    document
      .getElementById("withdrawContract")
      ?.addEventListener("click", () => {
        this.withdrawFromContract();
      });

    // Score saving
    document.getElementById("saveScore")?.addEventListener("click", () => {
      this.saveScoreToBlockchain();
    });

    // Keyboard shortcuts
    document.addEventListener("keydown", (e) => {
      this.handleGlobalKeyDown(e);
    });

    // Window events
    window.addEventListener("beforeunload", () => {
      this.cleanup();
    });

    // Web3 event listeners
    if (web3Manager) {
      web3Manager.onConnect = (account) => {
        this.onWalletConnected(account);
      };

      web3Manager.onDisconnect = () => {
        this.onWalletDisconnected();
      };
    }
  }

  initializeUI() {
    // Update level selection UI
    this.updateLevelSelection();

    // Update high score display
    this.updateHighScore();

    // Set default selected level
    this.selectLevel(levelManager.getRecommendedLevel());

    // Check if tutorial should be shown
    if (!levelManager.isTutorialCompleted()) {
      this.showTutorialPrompt();
    }
  }

  // Loading Screen Management
  showLoadingScreen() {
    document.getElementById("loadingScreen").classList.remove("hidden");
    this.hideAllPanels();
  }

  hideLoadingScreen() {
    document.getElementById("loadingScreen").classList.add("hidden");
  }

  updateLoadingProgress(percent, message) {
    this.loadingProgress = percent;
    const progressBar = document.getElementById("loadingProgress");
    const loadingText = document.querySelector("#loadingScreen p");

    if (progressBar) {
      progressBar.style.width = `${percent}%`;
    }

    if (loadingText && message) {
      loadingText.textContent = message;
    }
  }

  // Wallet Management
  async connectWallet() {
    try {
      const success = await web3Manager.connectWallet();
      if (success) {
        this.showGameMenu();
      }
    } catch (error) {
      console.error("Failed to connect wallet:", error);
      alert("Failed to connect wallet: " + error.message);
    }
  }

  async refreshConnection() {
    console.log("🔄 Manually refreshing connection...");
    try {
      // Re-check wallet connection status
      await this.checkWalletConnection();

      // Show success message
      console.log("✅ Connection refreshed successfully");
    } catch (error) {
      console.error("Failed to refresh connection:", error);
      alert("Failed to refresh connection: " + error.message);
    }
  }

  async checkWalletConnection() {
    console.log("🔍 Checking wallet connection status...");

    // Refresh the Web3 connection state
    await web3Manager.refreshConnection();

    // Check if we can actually play the game
    if (web3Manager.canPlayGame()) {
      this.onWalletConnected(web3Manager.account);
    } else if (
      web3Manager.isConnected &&
      web3Manager.networkId !== CONFIG.NETWORK.chainId
    ) {
      // Connected but wrong network
      console.warn("⚠️ Connected to wrong network");
      this.showWalletPanel(); // Stay on wallet panel with network warning
    } else {
      // Not connected or other issues
      this.onWalletDisconnected();
    }
  }

  async onWalletConnected(account) {
    console.log("✅ Wallet connected:", account);
    this.updateHighScore();
    this.showGameMenu();

    // Initialize SSD balance in HUD
    this.updateHUDSSDBalance();

    // Check if user is contract owner and show/hide admin button
    try {
      const isOwner = await web3Manager.isContractOwner();
      const adminButton = document.getElementById("openAdmin");
      if (adminButton) {
        adminButton.style.display = isOwner ? "block" : "none";
      }
    } catch (error) {
      console.warn("Could not check admin status:", error);
      // Hide admin button if we can't verify
      const adminButton = document.getElementById("openAdmin");
      if (adminButton) {
        adminButton.style.display = "none";
      }
    }
  }

  onWalletDisconnected() {
    console.log("🔌 Wallet disconnected");

    // Reset game state
    if (gameEngine && gameEngine.gameState !== GAME_STATES.MENU) {
      gameEngine.resetGame();
    }

    // Clear any cached data
    this.updateHighScore();

    // Show wallet connection panel
    this.showWalletPanel();
  }

  // UI State Management
  showWalletPanel() {
    this.currentState = GAME_STATES.CONNECTING;
    this.hideAllPanels();
    document.getElementById("web3Panel").classList.remove("hidden");
  }

  showGameMenu() {
    this.currentState = GAME_STATES.MENU;
    this.hideAllPanels();
    document.getElementById("gameMenu").classList.remove("hidden");
    this.updateLevelSelection();
  }

  showGameUI() {
    this.currentState = GAME_STATES.PLAYING;
    this.hideAllPanels();
    document.getElementById("gameUI").classList.remove("hidden");
  }

  hideAllPanels() {
    const panels = [
      "web3Panel",
      "gameMenu",
      "gameUI",
      "pauseMenu",
      "gameOverScreen",
      "leaderboardPanel",
      "loadingScreen",
      "ssdShop",
      "twitterPanel",
      "upcomingFeatures",
      "adminPanel",
    ];

    panels.forEach((panelId) => {
      const panel = document.getElementById(panelId);
      if (panel) panel.classList.add("hidden");
    });
  }

  // Level Management
  selectLevel(levelNumber) {
    const levelInfo = levelManager.getLevelInfo(levelNumber);

    if (!levelInfo || !levelInfo.isUnlocked) {
      console.warn(`Level ${levelNumber} is not unlocked`);
      return;
    }

    this.selectedLevel = levelNumber;

    // Update UI
    document.querySelectorAll(".level-btn").forEach((btn) => {
      btn.classList.remove("selected");
      if (parseInt(btn.dataset.level) === levelNumber) {
        btn.classList.add("selected");
      }
    });

    console.log(`🎯 Level ${levelNumber} selected: ${levelInfo.name}`);
  }

  updateLevelSelection() {
    const levels = levelManager.getAllLevels();

    levels.forEach((level) => {
      const btn = document.querySelector(`[data-level="${level.number}"]`);
      if (btn) {
        btn.disabled = !level.isUnlocked;
        btn.classList.toggle("locked", !level.isUnlocked);

        if (!level.isUnlocked) {
          btn.textContent = `${level.number} - 🔒`;
        } else {
          btn.textContent = `${level.number} - ${level.name}`;
        }
      }
    });
  }

  // Game Control
  startGame() {
    if (!this.isInitialized) {
      console.warn("Game not fully initialized yet");
      return;
    }

    // Check if we can actually play the game (proper network and connection)
    if (!web3Manager.canPlayGame()) {
      console.warn("⚠️ Cannot start game: Wrong network or not connected");
      alert("Please connect to the Somnia Testnet to play the game!");
      this.showWalletPanel();
      return;
    }

    // Reset session SSD counter
    this.updateSessionSSD(0);

    this.showGameUI();
    gameEngine.startGame(this.selectedLevel);
    console.log(`🚀 Starting game at level ${this.selectedLevel}`);
  }

  restartGame() {
    // Reset session SSD counter
    this.updateSessionSSD(0);

    gameEngine.startGame(this.selectedLevel);
    document.getElementById("pauseMenu").classList.add("hidden");
    console.log("🔄 Game restarted");
  }

  backToMenu() {
    // Stop game engine
    if (gameEngine.gameState === GAME_STATES.PLAYING) {
      gameEngine.gameState = GAME_STATES.MENU;
    }

    // Stop background music
    if (gameEngine.audioManager?.backgroundMusic) {
      gameEngine.audioManager.backgroundMusic.pause();
      gameEngine.audioManager.backgroundMusic.currentTime = 0;
    }

    this.showGameMenu();
    console.log("📋 Returned to main menu");
  }

  // Leaderboard Management
  async showLeaderboard() {
    document.getElementById("leaderboardPanel").classList.remove("hidden");

    const leaderboardList = document.getElementById("leaderboardList");
    leaderboardList.innerHTML =
      '<div class="loading">Loading leaderboard...</div>';

    try {
      const scores = await web3Manager.getLeaderboard();
      this.renderLeaderboard(scores);
    } catch (error) {
      console.error("Failed to load leaderboard:", error);
      leaderboardList.innerHTML =
        '<div class="error">Failed to load leaderboard</div>';
    }
  }

  hideLeaderboard() {
    document.getElementById("leaderboardPanel").classList.add("hidden");
  }

  renderLeaderboard(scores) {
    const leaderboardList = document.getElementById("leaderboardList");

    if (scores.length === 0) {
      leaderboardList.innerHTML =
        '<div class="no-scores">No scores yet. Be the first!</div>';
      return;
    }

    let html = "";
    scores.forEach((score, index) => {
      const isCurrentUser = score.address === web3Manager.account;
      const rankClass = index < 3 ? "top-3" : "";
      const userClass = isCurrentUser ? "current-user" : "";

      html += `
                <div class="leaderboard-entry ${rankClass} ${userClass}">
                    <div class="rank">#${score.rank}</div>
                    <div class="player">
                        <div class="address">${UTILS.formatAddress(
                          score.address
                        )}</div>
                        <div class="level">Level ${score.level}</div>
                    </div>
                    <div class="score">${UTILS.formatScore(score.score)}</div>
                    <div class="date">${this.formatTimestamp(
                      score.timestamp
                    )}</div>
                </div>
            `;
    });

    leaderboardList.innerHTML = html;
  }

  // Score Management
  async saveScoreToBlockchain() {
    const saveBtn = document.getElementById("saveScore");
    const originalText = saveBtn.textContent;

    saveBtn.textContent = "Saving...";
    saveBtn.disabled = true;

    try {
      const success = await gameEngine.saveScore();

      if (success) {
        saveBtn.textContent = "Saved! ✅";
        setTimeout(() => {
          document.getElementById("newHighScore").classList.add("hidden");
        }, 2000);
      } else {
        saveBtn.textContent = "Failed ❌";
        setTimeout(() => {
          saveBtn.textContent = originalText;
          saveBtn.disabled = false;
        }, 2000);
      }
    } catch (error) {
      console.error("Failed to save score:", error);
      saveBtn.textContent = "Error ❌";
      setTimeout(() => {
        saveBtn.textContent = originalText;
        saveBtn.disabled = false;
      }, 2000);
    }
  }

  updateHighScore() {
    const highScore = web3Manager.getHighScore();
    const highScoreElements = document.querySelectorAll("#highScore");

    highScoreElements.forEach((element) => {
      element.textContent = UTILS.formatScore(highScore);
    });
  }

  // Tutorial System
  showTutorialPrompt() {
    const showTutorial = confirm(
      "Welcome to Somnia Space Defender! Would you like to see the tutorial?"
    );

    if (showTutorial) {
      this.startTutorial();
    } else {
      levelManager.markTutorialCompleted();
    }
  }

  startTutorial() {
    const steps = levelManager.getTutorialSteps();
    let currentStep = 0;

    const showStep = () => {
      if (currentStep >= steps.length) {
        levelManager.markTutorialCompleted();
        alert("Tutorial completed! Ready to defend the galaxy!");
        return;
      }

      const step = steps[currentStep];
      const proceed = confirm(
        `${step.title}\n\n${step.description}\n\nPress OK to continue or Cancel to skip tutorial.`
      );

      if (proceed) {
        currentStep++;
        setTimeout(showStep, 1000);
      } else {
        levelManager.markTutorialCompleted();
      }
    };

    showStep();
  }

  // Global Event Handlers
  handleGlobalKeyDown(e) {
    // Only handle global shortcuts when not in game
    if (this.currentState === GAME_STATES.PLAYING) return;

    switch (e.code) {
      case "Enter":
        if (this.currentState === GAME_STATES.MENU) {
          this.startGame();
        }
        break;
      case "Escape":
        if (this.currentState === GAME_STATES.LEADERBOARD) {
          this.hideLeaderboard();
        }
        break;
    }
  }

  // Error Handling
  showErrorScreen(message) {
    const loadingScreen = document.getElementById("loadingScreen");
    if (loadingScreen) {
      loadingScreen.innerHTML = `
                <div class="panel-content">
                    <h2>❌ Error</h2>
                    <p>${message}</p>
                    <button onclick="location.reload()" class="btn btn-primary">Reload Game</button>
                </div>
            `;
    }
  }

  // Cleanup
  cleanup() {
    console.log("🧹 Cleaning up game resources...");

    // Save any pending progress
    levelManager.saveProgress();

    // Pause any playing audio
    if (gameEngine?.audioManager) {
      Object.values(gameEngine.audioManager).forEach((audio) => {
        if (audio && !audio.paused) {
          audio.pause();
        }
      });
    }
  }

  // Performance Monitoring
  monitorPerformance() {
    // Monitor FPS and adjust quality if needed
    if (gameEngine && gameEngine.fps < 30) {
      console.warn("⚠️ Low FPS detected, consider enabling performance mode");
      gameEngine.performanceMode = true;
    }
  }

  // Utility Methods
  showNotification(message, type = "info", duration = 3000) {
    // Create and show a toast notification
    const notification = document.createElement("div");
    notification.className = `notification notification-${type}`;
    notification.textContent = message;

    document.body.appendChild(notification);

    setTimeout(() => {
      notification.classList.add("show");
    }, 100);

    setTimeout(() => {
      notification.classList.remove("show");
      setTimeout(() => {
        document.body.removeChild(notification);
      }, 300);
    }, duration);
  }

  // 🎉 SSD REWARD NOTIFICATION SYSTEM

  showSSDReward(ssdAmount, aliensKilled = 0, source = "Gameplay") {
    // Create animated SSD reward notification
    const rewardDiv = document.createElement("div");
    rewardDiv.className = "ssd-reward-popup";

    if (source === "Twitter Verification") {
      rewardDiv.innerHTML = `
        <div class="reward-icon">🐦</div>
        <div class="reward-text">
          <div class="reward-title">Twitter Verified!</div>
          <div class="reward-amount">+${ssdAmount} SSD</div>
        </div>
      `;
    } else {
      rewardDiv.innerHTML = `
        <div class="reward-icon">💰</div>
        <div class="reward-text">
          <div class="reward-title">SSD Earned!</div>
          <div class="reward-amount">+${ssdAmount} SSD</div>
          <div class="reward-details">${aliensKilled} aliens eliminated</div>
        </div>
      `;
    }

    document.body.appendChild(rewardDiv);

    // Animate in
    setTimeout(() => {
      rewardDiv.classList.add("show");
    }, 100);

    // Auto-hide
    setTimeout(() => {
      rewardDiv.classList.add("hide");
      setTimeout(() => {
        if (document.body.contains(rewardDiv)) {
          document.body.removeChild(rewardDiv);
        }
      }, 500);
    }, 4000);

    // Also show a regular notification
    this.showNotification(
      `🎉 Earned ${ssdAmount} SSD tokens!`,
      "success",
      2000
    );
  }

  // Update SSD balance in HUD
  async updateHUDSSDBalance() {
    try {
      const hudBalance = document.getElementById("hudSSDBalance");
      if (!hudBalance) return;

      const stats = await web3Manager.getSSDStats();
      const balance = parseFloat(stats.balance).toFixed(2);
      hudBalance.textContent = balance;
    } catch (error) {
      console.error("Failed to update HUD SSD balance:", error);
      const hudBalance = document.getElementById("hudSSDBalance");
      if (hudBalance) hudBalance.textContent = "0";
    }
  }

  // Update session SSD counter in HUD
  updateSessionSSD(amount) {
    const sessionSSDElement = document.getElementById("sessionSSD");
    if (sessionSSDElement) {
      sessionSSDElement.textContent = amount.toFixed(2);

      // Add a brief highlight effect when updated
      if (amount > 0) {
        sessionSSDElement.style.animation = "none";
        setTimeout(() => {
          sessionSSDElement.style.animation = "pulse 0.5s ease-in-out";
        }, 10);
      }
    }
  }

  // Format timestamp for display (handles both seconds and milliseconds)
  formatTimestamp(timestamp) {
    // If timestamp is in seconds (blockchain), convert to milliseconds
    // Threshold: 1e12 (represents Jan 1, 2001 in milliseconds)
    const timestampMs = timestamp < 1e12 ? timestamp * 1000 : timestamp;
    return new Date(timestampMs).toLocaleDateString();
  }

  // Refresh SSD balances in UI
  async refreshSSDBalances() {
    try {
      // Update HUD balance
      await this.updateHUDSSDBalance();

      // Update shop balance if shop is open
      const shopPanel = document.getElementById("ssdShop");
      if (shopPanel && !shopPanel.classList.contains("hidden")) {
        await this.loadSSDShop();
      }

      // Update admin panel balance if admin is open
      const adminPanel = document.getElementById("adminPanel");
      if (adminPanel && !adminPanel.classList.contains("hidden")) {
        await this.loadAdminData();
      }

      console.log("💰 SSD balances refreshed");
    } catch (error) {
      console.error("Failed to refresh SSD balances:", error);
    }
  }

  // Debug Methods
  enableDebugMode() {
    CONFIG.DEBUG.SHOW_FPS = true;
    CONFIG.DEBUG.SHOW_HITBOXES = true;
    console.log("🐛 Debug mode enabled");
  }

  disableDebugMode() {
    CONFIG.DEBUG.SHOW_FPS = false;
    CONFIG.DEBUG.SHOW_HITBOXES = false;
    console.log("🐛 Debug mode disabled");
  }

  // 🛍️ SSD SHOP FUNCTIONALITY

  showSSDShop() {
    this.hideAllPanels();
    document.getElementById("ssdShop").classList.remove("hidden");
    this.loadSSDShop();
  }

  hideSSDShop() {
    this.showGameMenu();
  }

  async loadSSDShop() {
    const shopItemsContainer = document.getElementById("shopItems");
    const ssdBalance = document.getElementById("ssdBalance");
    const ssdEarned = document.getElementById("ssdEarned");
    const ssdSpent = document.getElementById("ssdSpent");

    try {
      // Update SSD balance
      const stats = await web3Manager.getSSDStats();
      ssdBalance.textContent = stats.balance;
      ssdEarned.textContent = stats.earned;
      ssdSpent.textContent = stats.spent;

      // Load shop items
      const shopItems = await web3Manager.getShopItems();
      shopItemsContainer.innerHTML = "";

      shopItems.forEach((item, index) => {
        const itemDiv = document.createElement("div");
        itemDiv.className = "shop-item";
        itemDiv.innerHTML = `
          <h3>${item.name}</h3>
          <div class="price">${item.price} SSD</div>
          <div class="duration">${
            item.duration > 0
              ? `Duration: ${Math.round(item.duration / 60)} minutes`
              : "Permanent"
          }</div>
          <button class="btn btn-primary" onclick="gameApp.buyShopItem(${index})">
            Buy Now
          </button>
        `;
        shopItemsContainer.appendChild(itemDiv);
      });
    } catch (error) {
      console.error("Failed to load SSD shop:", error);
      shopItemsContainer.innerHTML =
        '<div class="loading">Failed to load shop items</div>';
    }
  }

  async buyShopItem(itemId) {
    try {
      // Get item details for notification
      const shopItems = await web3Manager.getShopItems();
      const item = shopItems[itemId];

      const success = await web3Manager.buyShopItem(itemId);
      if (success) {
        // Show purchase success with item details
        this.showItemPurchased(item.name, item.price);
        this.loadSSDShop(); // Refresh shop

        // Trigger balance update
        setTimeout(() => this.refreshSSDBalances(), 1000);
      } else {
        this.showNotification("Purchase failed", "error");
      }
    } catch (error) {
      console.error("Failed to buy item:", error);
      this.showNotification("Purchase failed: " + error.message, "error");
    }
  }

  // Show item purchased notification
  showItemPurchased(itemName, itemPrice) {
    // Create purchase notification
    const purchaseDiv = document.createElement("div");
    purchaseDiv.className = "ssd-reward-popup";
    purchaseDiv.innerHTML = `
      <div class="reward-icon">🛍️</div>
      <div class="reward-text">
        <div class="reward-title">Item Purchased!</div>
        <div class="reward-amount">${itemName}</div>
        <div class="reward-details">-${itemPrice} SSD</div>
      </div>
    `;

    document.body.appendChild(purchaseDiv);

    // Animate in
    setTimeout(() => {
      purchaseDiv.classList.add("show");
    }, 100);

    // Auto-hide
    setTimeout(() => {
      purchaseDiv.classList.add("hide");
      setTimeout(() => {
        if (document.body.contains(purchaseDiv)) {
          document.body.removeChild(purchaseDiv);
        }
      }, 500);
    }, 3000);

    this.showNotification(`🛍️ Purchased ${itemName}!`, "success");
  }

  // 🐦 TWITTER VERIFICATION FUNCTIONALITY

  showTwitterPanel() {
    this.hideAllPanels();
    document.getElementById("twitterPanel").classList.remove("hidden");
    this.checkTwitterStatus();
  }

  hideTwitterPanel() {
    this.showGameMenu();
  }

  async checkTwitterStatus() {
    try {
      const isVerified = await web3Manager.isTwitterVerified();
      const twitterForm = document.getElementById("twitterForm");
      const twitterVerified = document.getElementById("twitterVerified");
      const verifiedHandle = document.getElementById("verifiedHandle");

      if (isVerified) {
        const handle = await web3Manager.getTwitterHandle();
        twitterForm.classList.add("hidden");
        twitterVerified.classList.remove("hidden");
        verifiedHandle.textContent = handle;
      } else {
        twitterForm.classList.remove("hidden");
        twitterVerified.classList.add("hidden");
      }
    } catch (error) {
      console.error("Failed to check Twitter status:", error);
    }
  }

  async verifyTwitter() {
    const twitterHandle = document.getElementById("twitterHandle").value.trim();

    if (!twitterHandle) {
      this.showNotification("Please enter your Twitter handle", "warning");
      return;
    }

    // Remove @ if user included it
    const cleanHandle = twitterHandle.replace("@", "");

    try {
      const success = await web3Manager.verifyTwitter(cleanHandle);
      if (success) {
        this.showNotification("Twitter verified! 5 SSD claimed!", "success");
        this.checkTwitterStatus(); // Refresh status
      } else {
        this.showNotification("Twitter verification failed", "error");
      }
    } catch (error) {
      console.error("Failed to verify Twitter:", error);
      this.showNotification("Verification failed: " + error.message, "error");
    }
  }

  // 🚀 UPCOMING FEATURES FUNCTIONALITY

  showUpcomingFeatures() {
    this.hideAllPanels();
    document.getElementById("upcomingFeatures").classList.remove("hidden");
  }

  hideUpcomingFeatures() {
    this.showGameMenu();
  }

  // 👑 ADMIN PANEL FUNCTIONALITY

  async checkAndShowAdminPanel() {
    const isOwner = await web3Manager.isContractOwner();
    if (isOwner) {
      this.showAdminPanel();
    } else {
      this.showNotification(
        "Access denied: You are not the contract owner",
        "error"
      );
    }
  }

  showAdminPanel() {
    this.hideAllPanels();
    document.getElementById("adminPanel").classList.remove("hidden");
    this.loadAdminData();
  }

  hideAdminPanel() {
    this.showGameMenu();
  }

  async loadAdminData() {
    const contractBalance = document.getElementById("contractBalance");
    const adminSSDBalance = document.getElementById("adminSSDBalance");

    try {
      // Load contract SSD balance
      const contractSSD = await web3Manager.getContractSSDBalance();
      contractBalance.textContent = parseFloat(contractSSD).toFixed(2);

      // Load user's SSD balance
      const userStats = await web3Manager.getSSDStats();
      adminSSDBalance.textContent = parseFloat(userStats.balance).toFixed(2);
    } catch (error) {
      console.error("Failed to load admin data:", error);
      contractBalance.textContent = "Error";
      adminSSDBalance.textContent = "Error";
    }
  }

  async fundContract() {
    const fundAmount = document.getElementById("fundAmount").value;

    if (!fundAmount || parseFloat(fundAmount) <= 0) {
      this.showNotification("Please enter a valid amount", "warning");
      return;
    }

    try {
      const success = await web3Manager.fundContract(fundAmount);
      if (success) {
        this.showNotification(
          `Successfully funded contract with ${fundAmount} SSD!`,
          "success"
        );
        this.loadAdminData(); // Refresh balances
        document.getElementById("fundAmount").value = ""; // Clear input
      }
    } catch (error) {
      console.error("Failed to fund contract:", error);
      this.showNotification(
        "Failed to fund contract: " + error.message,
        "error"
      );
    }
  }

  async withdrawFromContract() {
    const withdrawAmount = document.getElementById("withdrawAmount").value;

    if (!withdrawAmount || parseFloat(withdrawAmount) <= 0) {
      this.showNotification("Please enter a valid amount", "warning");
      return;
    }

    try {
      const success = await web3Manager.withdrawFromContract(withdrawAmount);
      if (success) {
        this.showNotification(
          `Successfully withdrew ${withdrawAmount} SSD from contract!`,
          "success"
        );
        this.loadAdminData(); // Refresh balances
        document.getElementById("withdrawAmount").value = ""; // Clear input
      }
    } catch (error) {
      console.error("Failed to withdraw from contract:", error);
      this.showNotification("Failed to withdraw: " + error.message, "error");
    }
  }
}

// Initialize the application when DOM is loaded
document.addEventListener("DOMContentLoaded", () => {
  window.gameApp = new GameApp();
});

// Add some additional CSS for notifications
const notificationCSS = `
.notification {
    position: fixed;
    top: 20px;
    right: 20px;
    padding: 15px 20px;
    border-radius: 8px;
    color: white;
    font-family: 'Orbitron', monospace;
    font-weight: 600;
    z-index: 10000;
    transform: translateX(400px);
    transition: transform 0.3s ease;
    max-width: 300px;
}

.notification.show {
    transform: translateX(0);
}

.notification-info {
    background: linear-gradient(145deg, #0066ff, #0044cc);
    border: 2px solid #00aaff;
}

.notification-success {
    background: linear-gradient(145deg, #00aa00, #008800);
    border: 2px solid #00ff00;
}

.notification-warning {
    background: linear-gradient(145deg, #ffaa00, #ff8800);
    border: 2px solid #ffcc00;
}

.notification-error {
    background: linear-gradient(145deg, #aa0000, #880000);
    border: 2px solid #ff0000;
}

.level-btn.selected {
    background: linear-gradient(145deg, #00aa44, #008833);
    border-color: #00ff66;
    color: #ffffff;
    box-shadow: 0 4px 15px rgba(0, 170, 68, 0.4);
}

.level-btn.locked {
    background: linear-gradient(145deg, #333333, #222222);
    border-color: #555555;
    color: #666666;
    cursor: not-allowed;
}

.level-btn.locked:hover {
    transform: none;
    box-shadow: none;
}

.leaderboard-entry.current-user {
    background: linear-gradient(145deg, rgba(0, 255, 0, 0.1), rgba(0, 255, 0, 0.2));
    border: 1px solid rgba(0, 255, 0, 0.5);
}

.leaderboard-entry {
    display: grid;
    grid-template-columns: 40px 1fr 100px 80px;
    gap: 10px;
    align-items: center;
}

.rank {
    font-weight: bold;
    color: #ffd700;
}

.player .address {
    font-size: 0.9rem;
    color: #ffffff;
}

.player .level {
    font-size: 0.8rem;
    color: #aaaaaa;
}

.score {
    font-weight: bold;
    color: #00ffff;
    text-align: right;
}

.date {
    font-size: 0.8rem;
    color: #aaaaaa;
    text-align: right;
}
`;

// Inject notification CSS
const styleSheet = document.createElement("style");
styleSheet.textContent = notificationCSS;
document.head.appendChild(styleSheet);

// Export for debugging
window.UTILS = UTILS;
window.CONFIG = CONFIG;
window.GAME_STATES = GAME_STATES;

console.log("🎯 Main Application Loaded - Ready for Launch!");
