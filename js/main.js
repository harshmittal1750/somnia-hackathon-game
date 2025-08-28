// Space Defender - Main Application Controller
class GameApp {
  constructor() {
    this.currentState = GAME_STATES.LOADING;
    this.selectedLevel = 1;
    this.isInitialized = false;
    this.loadingProgress = 0;
    this.audioLoaded = false;
    this.cachedHighScore = 0; // Cache high score for when HUD is shown

    this.init();
  }

  async init() {
    console.log("🚀 Initializing Space Defender...");

    try {
      // Mobile optimizations
      this.setupMobileOptimizations();

      // Loading screen is already visible by default
      this.updateLoadingProgress(10, "Loading game assets...");

      // Initialize components step by step
      await this.loadAssets();
      this.updateLoadingProgress(40, "Initializing components...");

      await this.initializeComponents();
      this.updateLoadingProgress(70, "Setting up event listeners...");

      this.setupEventListeners();
      this.updateLoadingProgress(85, "Finalizing UI...");

      await this.initializeUI();
      this.updateLoadingProgress(95, "Connecting to wallet...");

      // Check wallet connection status
      this.checkWalletConnection();

      this.updateLoadingProgress(100, "Ready to launch!");

      // Hide loading screen after a brief moment to show completion
      setTimeout(() => {
        this.hideLoadingScreen();
      }, 500);

      this.isInitialized = true;
      console.log("✅ Game fully initialized!");
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

    // Disconnect wallet
    document
      .getElementById("disconnectWallet")
      ?.addEventListener("click", () => {
        this.disconnectWallet();
      });

    // Refresh connection
    document
      .getElementById("refreshConnection")
      ?.addEventListener("click", () => {
        this.refreshConnection();
      });

    // Download wallet
    document.getElementById("downloadWallet")?.addEventListener("click", () => {
      this.showWalletDownloadOptions();
    });

    // Advanced connection options
    document
      .getElementById("showAdvancedConnect")
      ?.addEventListener("click", () => {
        this.showAdvancedConnectOptions();
      });

    // Specific connection methods
    document
      .getElementById("connectMetaMask")
      ?.addEventListener("click", () => {
        this.connectSpecificWallet("metamask");
      });

    document
      .getElementById("connectWalletConnect")
      ?.addEventListener("click", () => {
        this.connectSpecificWallet("walletconnect");
      });

    document
      .getElementById("connectCoinbase")
      ?.addEventListener("click", () => {
        this.connectSpecificWallet("coinbase");
      });

    document
      .getElementById("connectInjected")
      ?.addEventListener("click", () => {
        this.connectSpecificWallet("injected");
      });

    // Back to connect (from download options)
    document.getElementById("backToConnect")?.addEventListener("click", () => {
      this.hideWalletDownloadOptions();
    });

    // Wallet download option buttons
    document.querySelectorAll(".wallet-option-btn").forEach((btn) => {
      btn.addEventListener("click", (e) => {
        const walletType = e.target.dataset.wallet;
        this.downloadWallet(walletType);
      });
    });

    // Somnia Resources Dropdown
    document
      .getElementById("somniaResourcesBtn")
      ?.addEventListener("click", () => {
        this.toggleSomniaDropdown();
      });

    // Tutorial from wallet page
    document
      .getElementById("openTutorialFromWallet")
      ?.addEventListener("click", () => {
        this.startTutorial();
      });

    // Close dropdown when clicking outside
    document.addEventListener("click", (e) => {
      const dropdown = document.getElementById("somniaDropdown");
      const button = document.getElementById("somniaResourcesBtn");
      if (
        dropdown &&
        !dropdown.contains(e.target) &&
        !button.contains(e.target)
      ) {
        dropdown.classList.add("hidden");
      }
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

    // Tutorial
    document.getElementById("openTutorial")?.addEventListener("click", () => {
      this.startTutorial();
    });

    // SD Shop event listeners
    document.getElementById("openShop")?.addEventListener("click", () => {
      this.showSDShop();
    });

    document.getElementById("closeShop")?.addEventListener("click", () => {
      this.hideSDShop();
    });

    // Twitter verification event listeners
    document.getElementById("openTwitter")?.addEventListener("click", () => {
      this.showTwitterPanel();
    });

    document.getElementById("closeTwitter")?.addEventListener("click", () => {
      this.hideTwitterPanel();
    });

    // Faucet panel event listeners
    document.getElementById("openFaucets")?.addEventListener("click", () => {
      this.showFaucetPanel();
    });

    document.getElementById("closeFaucets")?.addEventListener("click", () => {
      this.hideFaucetPanel();
    });

    document
      .getElementById("addSomniaNetwork")
      ?.addEventListener("click", () => {
        this.addSomniaNetworkToWallet();
      });

    document.getElementById("generateCode")?.addEventListener("click", () => {
      this.generateTwitterCode();
    });

    document.getElementById("copyTweet")?.addEventListener("click", () => {
      this.copyTweetText();
    });

    document.getElementById("postTweet")?.addEventListener("click", () => {
      this.openTwitterPost();
    });

    document.getElementById("verifyTweet")?.addEventListener("click", () => {
      this.verifyTwitterTweet();
    });

    // Support contact event listeners
    document.getElementById("contactSupport")?.addEventListener("click", () => {
      this.openSupportContact();
    });

    document.getElementById("twitterSupport")?.addEventListener("click", () => {
      this.openSupportContact();
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

    // Tutorial event listeners
    document.getElementById("tutorialNext")?.addEventListener("click", () => {
      this.nextTutorialStep();
    });

    document.getElementById("tutorialPrev")?.addEventListener("click", () => {
      this.prevTutorialStep();
    });

    document.getElementById("tutorialSkip")?.addEventListener("click", () => {
      this.skipTutorial();
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

  async initializeUI() {
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

    // Only show wallet panel if we're not already connected and in game menu
    if (!web3Manager.canPlayGame()) {
      this.showWalletPanel();
    }
    // If wallet is connected, the checkWalletConnection() already handled showing the right screen
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

  setupMobileOptimizations() {
    console.log("📱 Setting up mobile optimizations...");

    // Detect mobile device
    this.isMobile = this.detectMobileDevice();

    if (this.isMobile) {
      // Prevent zoom on double tap
      document.addEventListener(
        "touchstart",
        function (event) {
          if (event.touches.length > 1) {
            event.preventDefault();
          }
        },
        { passive: false }
      );

      // Prevent zoom on double tap for specific elements
      let lastTouchEnd = 0;
      document.addEventListener(
        "touchend",
        function (event) {
          const now = new Date().getTime();
          if (now - lastTouchEnd <= 300) {
            event.preventDefault();
          }
          lastTouchEnd = now;
        },
        false
      );

      // Handle orientation changes
      window.addEventListener("orientationchange", () => {
        setTimeout(() => {
          this.handleOrientationChange();
        }, 100);
      });

      // Improve touch scrolling for panels
      this.setupTouchScrolling();

      // Add mobile-specific CSS class
      document.body.classList.add("mobile-device");

      console.log("✅ Mobile optimizations applied");
    }
  }

  detectMobileDevice() {
    return (
      /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
        navigator.userAgent
      ) ||
      (navigator.maxTouchPoints &&
        navigator.maxTouchPoints > 2 &&
        /MacIntel/.test(navigator.platform))
    );
  }

  handleOrientationChange() {
    // Force a reflow to handle orientation changes properly
    const gameContainer = document.getElementById("gameContainer");
    if (gameContainer) {
      gameContainer.style.display = "none";
      gameContainer.offsetHeight; // Force reflow
      gameContainer.style.display = "flex";
    }

    // Close any open dropdowns on orientation change
    const dropdown = document.getElementById("somniaDropdown");
    if (dropdown && !dropdown.classList.contains("hidden")) {
      dropdown.classList.add("hidden");
    }
  }

  setupTouchScrolling() {
    // Improve touch scrolling for panels with overflow
    const panels = document.querySelectorAll(".panel");
    panels.forEach((panel) => {
      panel.style.webkitOverflowScrolling = "touch";
      panel.style.overflowScrolling = "touch";
    });

    // Improve dropdown touch scrolling
    const dropdownContent = document.getElementById("somniaDropdown");
    if (dropdownContent) {
      dropdownContent.style.webkitOverflowScrolling = "touch";
      dropdownContent.style.overflowScrolling = "touch";
    }
  }

  // Wallet Management
  async connectWallet() {
    try {
      const manager = this.getActiveWeb3Manager();
      const success = await manager.connectWallet();
      if (success) {
        this.showGameMenu();
      }
    } catch (error) {
      console.error("Failed to connect wallet:", error);
      this.showNotification(
        "Failed to connect wallet: " + error.message,
        "error"
      );
    }
  }

  async connectSpecificWallet(method) {
    console.log(`🔗 Attempting connection with ${method}...`);

    try {
      const manager = this.getActiveWeb3Manager();
      let success = false;

      // Try the hybrid manager first if available
      if (
        manager.connectWagmi &&
        (method === "walletconnect" ||
          method === "coinbase" ||
          method === "injected")
      ) {
        success = await manager.connectWagmi(method);
      } else if (manager.connectMetaMask && method === "metamask") {
        success = await manager.connectMetaMask();
      } else {
        // Fallback to generic connect
        success = await manager.connectWallet(method);
      }

      if (success) {
        console.log(`✅ ${method} connected successfully`);
        this.showNotification(`${method} connected successfully!`, "success");
        this.hideAdvancedConnectOptions();
        this.showGameMenu();
      } else {
        console.warn(`⚠️ ${method} connection failed`);
        this.showNotification(`Failed to connect with ${method}`, "error");
      }
    } catch (error) {
      console.error(`❌ ${method} connection error:`, error);
      this.showNotification(
        `${method} connection error: ${error.message}`,
        "error"
      );
    }
  }

  showAdvancedConnectOptions() {
    const advancedOptions = document.getElementById("advancedConnectOptions");
    const connectWallet = document.getElementById("connectWallet");
    const showAdvanced = document.getElementById("showAdvancedConnect");

    if (advancedOptions && connectWallet && showAdvanced) {
      advancedOptions.classList.remove("hidden");
      connectWallet.classList.add("hidden");
      showAdvanced.classList.add("hidden");
    }
  }

  hideAdvancedConnectOptions() {
    const advancedOptions = document.getElementById("advancedConnectOptions");
    const connectWallet = document.getElementById("connectWallet");
    const showAdvanced = document.getElementById("showAdvanced");

    if (advancedOptions && connectWallet && showAdvanced) {
      advancedOptions.classList.add("hidden");
      connectWallet.classList.remove("hidden");
      showAdvanced.classList.remove("hidden");
    }
  }

  async disconnectWallet() {
    try {
      const manager = this.getActiveWeb3Manager();
      await manager.disconnectWallet();
      // Stay on wallet panel to show disconnected state
      this.showWalletPanel();
    } catch (error) {
      console.error("Failed to disconnect wallet:", error);
      this.showNotification(
        "Failed to disconnect wallet: " + error.message,
        "error"
      );
    }
  }

  showWalletDownloadOptions() {
    const manager = this.getActiveWeb3Manager();
    if (manager.showWalletDownloadOptions) {
      manager.showWalletDownloadOptions();
    }
  }

  hideWalletDownloadOptions() {
    const manager = this.getActiveWeb3Manager();
    if (manager.hideWalletDownloadOptions) {
      manager.hideWalletDownloadOptions();
    }
  }

  downloadWallet(walletType) {
    const manager = this.getActiveWeb3Manager();
    if (manager.redirectToWalletDownload) {
      manager.redirectToWalletDownload(walletType);
    }
  }

  toggleSomniaDropdown() {
    const dropdown = document.getElementById("somniaDropdown");
    if (dropdown) {
      dropdown.classList.toggle("hidden");
    }
  }

  async refreshConnection() {
    console.log("🔄 Manually refreshing connection...");
    try {
      // Show immediate feedback
      this.showNotification("🔄 Refreshing connection...", "info", 1000);

      // Get the active manager and force a network recheck
      const manager = this.getActiveWeb3Manager();

      // Force a fresh network verification
      if (manager.verifyNetworkConnectionWithFallback) {
        console.log("🌐 Forcing fresh network verification...");
        const networkResult =
          await manager.verifyNetworkConnectionWithFallback();

        if (networkResult.success) {
          console.log("✅ Manual network refresh succeeded!");
          this.showNotification("✅ Network connection verified!", "success");

          // Update the UI state
          if (manager.isConnected) {
            manager.updateWalletUI();
            this.onWalletConnected(manager.account);
          }
        } else {
          console.warn(
            "❌ Manual network refresh failed:",
            networkResult.error
          );
          this.showNotification(
            `❌ ${
              networkResult.wrongNetwork
                ? "Wrong network detected"
                : "Network verification failed"
            }`,
            "error"
          );
        }
      } else {
        // Fallback to old method
        await this.checkWalletConnection();
      }

      // Show success message
      console.log("✅ Connection refresh completed");
    } catch (error) {
      console.error("Failed to refresh connection:", error);
      this.showNotification(
        "Failed to refresh connection: " + error.message,
        "error"
      );
    }
  }

  async checkWalletConnection() {
    console.log("🔍 Checking wallet connection status...");

    // Use hybrid manager if available, otherwise fallback to original
    const manager = this.getActiveWeb3Manager();
    console.log("🔧 Using manager:", manager.constructor.name);

    if (manager.getConnectionInfo) {
      console.log("📊 Connection info:", manager.getConnectionInfo());
    }

    // Show checking status to user
    this.showNotification("🔍 Verifying network connection...", "info", 1000);

    // Refresh the Web3 connection state
    await manager.refreshConnection();

    // Check if we can actually play the game
    if (manager.canPlayGame()) {
      this.onWalletConnected(manager.account);
    } else if (
      manager.isConnected &&
      manager.networkId !== CONFIG.NETWORK.chainId
    ) {
      // Connected but wrong network - be more specific about the issue
      console.warn("⚠️ Connected to wrong network");
      const currentChainId = manager.networkId;
      const expectedChainId = CONFIG.NETWORK.chainId;

      // Check if it's likely a timing issue (networkId is null or undefined)
      if (!currentChainId || currentChainId === "0x" || currentChainId === "") {
        console.log("📡 Network ID appears unresolved, may be timing issue");
        this.showNotification(
          "🔄 Network detection in progress...",
          "warning",
          2000
        );

        // Schedule a recheck
        setTimeout(() => {
          this.checkWalletConnection();
        }, 1500);
      } else {
        console.log(
          `❌ Definite wrong network: ${currentChainId} vs ${expectedChainId}`
        );
        this.showWalletPanel(); // Stay on wallet panel with network warning
      }
    } else {
      // Not connected or other issues
      this.onWalletDisconnected();
    }
  }

  // Helper method to get the active Web3 manager
  getActiveWeb3Manager() {
    // Try hybrid manager first
    if (
      typeof hybridWeb3Manager !== "undefined" &&
      hybridWeb3Manager.primaryProvider
    ) {
      console.log("🔗 Using HybridWeb3Manager");
      return hybridWeb3Manager;
    }
    // Fallback to original web3Manager
    else if (typeof web3Manager !== "undefined") {
      console.log("🔗 Using fallback Web3Manager");
      return web3Manager;
    }
    // If neither is available, show helpful error
    else {
      console.error("❌ No Web3 manager available", {
        hybridWeb3Manager: typeof hybridWeb3Manager,
        web3Manager: typeof web3Manager,
        ethereum: typeof window.ethereum,
        wagmiConfig: typeof window.wagmiConfig,
      });
      this.showNotification(
        "Web3 connection system not available. Please refresh the page.",
        "error",
        5000
      );
      throw new Error("No Web3 manager available");
    }
  }

  async onWalletConnected(account) {
    console.log("✅ Wallet connected:", account);
    await this.updateHighScore(); // Load high score from backend
    this.showGameMenu();

    // Initialize SD balance in HUD
    this.updateHUDSDBalance();

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

    // Update wallet UI to show proper buttons
    try {
      const manager = this.getActiveWeb3Manager();
      if (manager && manager.updateWalletUI) {
        console.log("🔄 Updating wallet UI from showWalletPanel");
        manager.updateWalletUI();
      }
    } catch (error) {
      console.warn("Failed to update wallet UI:", error);
    }

    // Check if tutorial should be shown for new users
    this.checkTutorialForNewUsers();
  }

  checkTutorialForNewUsers() {
    // Only show tutorial prompt if user hasn't completed it and hasn't been prompted recently
    if (!levelManager.isTutorialCompleted()) {
      const lastTutorialPrompt = localStorage.getItem("lastTutorialPrompt");
      const now = Date.now();
      const oneHour = 60 * 60 * 1000; // 1 hour in milliseconds

      // Show tutorial if never prompted, or if it's been more than 1 hour since last prompt
      if (!lastTutorialPrompt || now - parseInt(lastTutorialPrompt) > oneHour) {
        localStorage.setItem("lastTutorialPrompt", now.toString());

        // Delay the tutorial prompt slightly to let the UI settle
        setTimeout(() => {
          if (this.currentState === GAME_STATES.CONNECTING) {
            this.showTutorialPrompt();
          }
        }, 1000);
      }
    }
  }

  async showGameMenu() {
    this.currentState = GAME_STATES.MENU;
    this.hideAllPanels();
    document.getElementById("gameMenu").classList.remove("hidden");
    this.updateLevelSelection();

    // Update high score when showing game menu (ensures it's always current)
    await this.updateHighScore();
  }

  async showGameUI() {
    this.currentState = GAME_STATES.PLAYING;
    this.hideAllPanels();
    document.getElementById("gameUI").classList.remove("hidden");

    // Immediately update HUD with cached high score (fast)
    if (this.cachedHighScore > 0) {
      this.updateHighScoreElements(this.cachedHighScore);
    }

    // Also fetch fresh high score from backend (ensures accuracy)
    await this.updateHighScore();
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
      "faucetPanel",
      "upcomingFeatures",
      "adminPanel",
      "tutorialPanel",
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
  async startGame() {
    if (!this.isInitialized) {
      console.warn("Game not fully initialized yet");
      return;
    }

    // Enhanced game start check with network verification
    const canPlay = web3Manager.canPlayGame();

    if (!canPlay) {
      console.warn("⚠️ Initial game check failed, verifying network...");

      // Try to verify network connection one more time
      try {
        const networkVerified = await web3Manager.verifyNetworkConnection(2);
        if (networkVerified && web3Manager.canPlayGame()) {
          console.log("✅ Network verified on retry, proceeding with game");
        } else {
          console.warn("⚠️ Cannot start game: Wrong network or not connected");
          alert("Please connect to the Somnia Testnet to play the game!");
          this.showWalletPanel();
          return;
        }
      } catch (error) {
        console.error("Network verification failed:", error);
        alert("Please connect to the Somnia Testnet to play the game!");
        this.showWalletPanel();
        return;
      }
    }

    // Ensure we have the latest high score before starting
    await this.updateHighScore();

    // Reset session SD counter
    this.updateSessionSD(0);

    this.showGameUI();
    gameEngine.startGame(this.selectedLevel);
    console.log(`🚀 Starting game at level ${this.selectedLevel}`);
  }

  restartGame() {
    // Reset session SD counter
    this.updateSessionSD(0);

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
      const result = await apiService.getLeaderboardCached("normal", 100);
      this.renderLeaderboard(result.leaderboard || []);
    } catch (error) {
      console.error("Failed to load leaderboard:", error);
      leaderboardList.innerHTML =
        '<div class="error">Failed to load leaderboard. Using cached data...</div>';

      // Try to get cached data as fallback
      const cached = apiService.getCachedData("leaderboard_normal_100");
      if (cached && cached.leaderboard) {
        this.renderLeaderboard(cached.leaderboard);
      }
    }
  }

  hideLeaderboard() {
    document.getElementById("leaderboardPanel").classList.add("hidden");
  }

  renderLeaderboard(scores) {
    const leaderboardList = document.getElementById("leaderboardList");

    if (!scores || scores.length === 0) {
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
                        <div class="games">${score.totalGames} games</div>
                        ${
                          score.twitterHandle
                            ? `<div class="twitter">@${score.twitterHandle}</div>`
                            : ""
                        }
                    </div>
                    <div class="score">${UTILS.formatScore(
                      score.highScore
                    )}</div>
                    <div class="stats">
                        <div class="aliens">${
                          score.totalAliensKilled
                        } aliens</div>
                        <div class="date">${this.formatTimestamp(
                          score.lastPlayed
                        )}</div>
                    </div>
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
        // Hide the dialog after successful save and reset button
        setTimeout(() => {
          document.getElementById("newHighScore").classList.add("hidden");
          // Reset button for next time
          saveBtn.textContent = originalText;
          saveBtn.disabled = false;
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

  async updateHighScore() {
    // Get high score from backend (more reliable than local storage)
    const highScore = await web3Manager.getHighScoreFromBackend();

    // Cache the high score value
    this.cachedHighScore = highScore;

    const highScoreElements = document.querySelectorAll("#highScore");

    console.log("🎯 Updating high score:", {
      highScore,
      cached: this.cachedHighScore,
      elementsFound: highScoreElements.length,
      walletConnected: web3Manager.isConnected,
      account: web3Manager.account,
      gameUIVisible: !document
        .getElementById("gameUI")
        .classList.contains("hidden"),
    });

    // Update all high score elements immediately
    this.updateHighScoreElements(highScore);

    // Force update even if elements weren't found initially (timing issue)
    if (highScoreElements.length === 0) {
      console.log("🎯 No elements found, scheduling retry...");
      setTimeout(() => {
        this.updateHighScoreElements(this.cachedHighScore);
      }, 1000);
    }
  }

  // Helper method to update high score elements
  updateHighScoreElements(highScore) {
    const highScoreElements = document.querySelectorAll("#highScore");
    highScoreElements.forEach((element) => {
      element.textContent = UTILS.formatScore(highScore);
      console.log(
        "🎯 GameApp updated element:",
        element,
        "to:",
        UTILS.formatScore(highScore)
      );
    });
  }

  // Tutorial System
  showTutorialPrompt() {
    this.startTutorial();
  }

  startTutorial() {
    this.currentTutorialStep = 0;
    this.tutorialSteps = this.getTutorialSteps();
    this.showTutorialPanel();
    this.updateTutorialStep();
  }

  showTutorialPanel() {
    this.hideAllPanels();
    document.getElementById("tutorialPanel").classList.remove("hidden");
  }

  hideTutorialPanel() {
    document.getElementById("tutorialPanel").classList.add("hidden");
  }

  getTutorialSteps() {
    return [
      {
        step: 1,
        icon: "🚀",
        title: "Welcome to Space Defender!",
        description:
          "Use WASD or arrow keys to move your spaceship around the battlefield",
        visual: this.createMovementDemo(),
      },
      {
        step: 2,
        icon: "💥",
        title: "Shooting Aliens",
        description:
          "Press SPACE or J to shoot powerful lasers at incoming alien invaders",
        visual: this.createShootingDemo(),
      },
      {
        step: 3,
        icon: "⚡",
        title: "Power-ups",
        description:
          "Collect glowing power-ups to enhance your ship's abilities temporarily",
        visual: this.createPowerupDemo(),
      },
      {
        step: 4,
        icon: "❤️",
        title: "Health & Lives",
        description:
          "Avoid alien contact or you'll take damage. Keep track of your health!",
        visual: this.createHealthDemo(),
      },
      {
        step: 5,
        icon: "🎯",
        title: "Level Progression",
        description:
          "Kill aliens to advance through 10 increasingly difficult levels",
        visual: this.createLevelDemo(),
      },
      {
        step: 6,
        icon: "💰",
        title: "Web3 Integration",
        description:
          "Connect your wallet to earn SD tokens and save high scores on Somnia blockchain",
        visual: this.createWeb3Demo(),
      },
    ];
  }

  updateTutorialStep() {
    const step = this.tutorialSteps[this.currentTutorialStep];

    // Update content
    document.getElementById("tutorialStepTitle").textContent = step.title;
    document.getElementById("tutorialStepDescription").textContent =
      step.description;
    document.querySelector(".tutorial-icon").textContent = step.icon;

    // Update visual
    const visualContainer = document.getElementById("tutorialVisual");
    visualContainer.innerHTML = step.visual;

    // Update progress
    const progress =
      ((this.currentTutorialStep + 1) / this.tutorialSteps.length) * 100;
    document.getElementById("tutorialProgressBar").style.width = `${progress}%`;
    document.getElementById("tutorialStepIndicator").textContent = `Step ${
      this.currentTutorialStep + 1
    } of ${this.tutorialSteps.length}`;

    // Update buttons
    const prevBtn = document.getElementById("tutorialPrev");
    const nextBtn = document.getElementById("tutorialNext");

    prevBtn.disabled = this.currentTutorialStep === 0;
    nextBtn.textContent =
      this.currentTutorialStep === this.tutorialSteps.length - 1
        ? "Finish"
        : "Next →";
  }

  nextTutorialStep() {
    if (this.currentTutorialStep < this.tutorialSteps.length - 1) {
      this.currentTutorialStep++;
      this.updateTutorialStep();
    } else {
      // Tutorial completed
      this.completeTutorial();
    }
  }

  prevTutorialStep() {
    if (this.currentTutorialStep > 0) {
      this.currentTutorialStep--;
      this.updateTutorialStep();
    }
  }

  skipTutorial() {
    this.completeTutorial();
  }

  completeTutorial() {
    levelManager.markTutorialCompleted();
    this.hideTutorialPanel();

    // Return to appropriate screen based on wallet connection status
    if (web3Manager.isConnected && web3Manager.canPlayGame()) {
      this.showGameMenu();
    } else {
      this.showWalletPanel();
    }

    this.showNotification(
      "🎉 Tutorial completed! Ready to defend the galaxy!",
      "success",
      3000
    );
  }

  // Create visual demonstrations for each tutorial step
  createMovementDemo() {
    return `
      <div class="key-demo">
        <div class="key-row">
          <div class="key">W</div>
        </div>
        <div class="key-row">
          <div class="key">A</div>
          <div class="key">S</div>
          <div class="key">D</div>
        </div>
        <div class="key-text">Movement Keys</div>
      </div>
    `;
  }

  createShootingDemo() {
    return `
      <div class="weapon-demo">
        <div class="space-key">SPACE</div>
        <div class="key-text">Fire Weapons</div>
      </div>
    `;
  }

  createPowerupDemo() {
    return `
      <div class="powerup-demo">
        <div class="powerup-item">
          <div class="powerup-icon">⚡</div>
          <div class="powerup-name">Rapid Fire</div>
        </div>
        <div class="powerup-item">
          <div class="powerup-icon">🛡️</div>
          <div class="powerup-name">Shield</div>
        </div>
        <div class="powerup-item">
          <div class="powerup-icon">🔫</div>
          <div class="powerup-name">Multi-Shot</div>
        </div>
        <div class="powerup-item">
          <div class="powerup-icon">❤️</div>
          <div class="powerup-name">Health</div>
        </div>
      </div>
    `;
  }

  createHealthDemo() {
    return `
      <div class="health-demo">
        <div class="health-bar">
          <div class="health-heart">❤️</div>
          <div class="health-heart">❤️</div>
          <div class="health-heart">❤️</div>
        </div>
        <div class="key-text">Lives Remaining</div>
      </div>
    `;
  }

  createLevelDemo() {
    return `
      <div class="level-demo">
        <div class="level-progression">
          <div class="level-badge">1</div>
          <div class="level-arrow">→</div>
          <div class="level-badge">2</div>
          <div class="level-arrow">→</div>
          <div class="level-badge">10</div>
        </div>
        <div class="key-text">Level Progression</div>
      </div>
    `;
  }

  createWeb3Demo() {
    return `
      <div class="web3-demo">
        <div class="wallet-icon">🔗</div>
        <div class="blockchain-benefits">
          <div class="benefit-item">💰 Earn SD</div>
          <div class="benefit-item">🏆 Save Scores</div>
          <div class="benefit-item">🛍️ Shop Items</div>
          <div class="benefit-item">🐦 Verify Twitter (1 SD)</div>
        </div>
      </div>
    `;
  }

  // Global Event Handlers
  handleGlobalKeyDown(e) {
    // Handle canvas restoration shortcut globally (F5 key as alternative to Ctrl+R)
    if (e.code === "F5") {
      e.preventDefault();
      this.restoreCanvas();
      return;
    }

    // Handle performance mode toggle (F3 key)
    if (e.code === "F3") {
      e.preventDefault();
      this.togglePerformanceMode();
      return;
    }

    // Only handle other global shortcuts when not in game
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

  // 🎉 SD REWARD NOTIFICATION SYSTEM

  showSDReward(ssdAmount, aliensKilled = 0, source = "Gameplay") {
    // Create animated SD reward notification
    const rewardDiv = document.createElement("div");
    rewardDiv.className = "ssd-reward-popup";

    if (source === "Twitter Verification") {
      rewardDiv.innerHTML = `
        <div class="reward-icon">🐦</div>
        <div class="reward-text">
          <div class="reward-title">Twitter Verified!</div>
          <div class="reward-amount">+${ssdAmount} SD</div>
        </div>
      `;
    } else {
      rewardDiv.innerHTML = `
        <div class="reward-icon">💰</div>
        <div class="reward-text">
          <div class="reward-title">SD Earned!</div>
          <div class="reward-amount">+${ssdAmount} SD</div>
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
    this.showNotification(`🎉 Earned ${ssdAmount} SD tokens!`, "success", 2000);
  }

  // Update SD balance in HUD
  async updateHUDSDBalance() {
    try {
      const hudBalance = document.getElementById("hudSDBalance");
      if (!hudBalance) return;

      const stats = await web3Manager.getSDStats();
      const balance = parseFloat(stats.balance).toFixed(2);
      hudBalance.textContent = balance;
    } catch (error) {
      console.error("Failed to update HUD SD balance:", error);
      const hudBalance = document.getElementById("hudSDBalance");
      if (hudBalance) hudBalance.textContent = "0";
    }
  }

  // Update session SD counter in HUD
  updateSessionSD(amount) {
    const sessionSDElement = document.getElementById("sessionSD");
    if (sessionSDElement) {
      sessionSDElement.textContent = amount.toFixed(2);

      // Add a brief highlight effect when updated
      if (amount > 0) {
        sessionSDElement.style.animation = "none";
        setTimeout(() => {
          sessionSDElement.style.animation = "pulse 0.5s ease-in-out";
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

  // Refresh SD balances in UI
  async refreshSDBalances() {
    try {
      // Update HUD balance
      await this.updateHUDSDBalance();

      // Update shop balance if shop is open
      const shopPanel = document.getElementById("ssdShop");
      if (shopPanel && !shopPanel.classList.contains("hidden")) {
        await this.loadSDShop();
      }

      // Update admin panel balance if admin is open
      const adminPanel = document.getElementById("adminPanel");
      if (adminPanel && !adminPanel.classList.contains("hidden")) {
        await this.loadAdminData();
      }

      console.log("💰 SD balances refreshed");
    } catch (error) {
      console.error("Failed to refresh SD balances:", error);
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

  // Performance Methods
  togglePerformanceMode() {
    CONFIG.PERFORMANCE.FORCE_PERFORMANCE_MODE =
      !CONFIG.PERFORMANCE.FORCE_PERFORMANCE_MODE;

    if (typeof gameEngine !== "undefined") {
      gameEngine.performanceMode = CONFIG.PERFORMANCE.FORCE_PERFORMANCE_MODE;

      if (CONFIG.PERFORMANCE.FORCE_PERFORMANCE_MODE) {
        gameEngine.enablePerformanceOptimizations();
        console.log(
          "🚀 Performance mode enabled - optimized for low-end hardware"
        );
        this.showNotification("🚀 Performance mode enabled", "success");
      } else {
        console.log(
          "⚡ Performance mode disabled - full visual effects restored"
        );
        this.showNotification("⚡ Performance mode disabled", "info");
      }
    }

    return CONFIG.PERFORMANCE.FORCE_PERFORMANCE_MODE;
  }

  enablePerformanceMode() {
    CONFIG.PERFORMANCE.FORCE_PERFORMANCE_MODE = true;
    if (typeof gameEngine !== "undefined") {
      gameEngine.performanceMode = true;
      gameEngine.enablePerformanceOptimizations();
    }
    console.log("🚀 Performance mode enabled manually");
    this.showNotification(
      "🚀 Performance mode enabled for low-end hardware",
      "success",
      4000
    );
  }

  // 🔧 Canvas Recovery Methods
  restoreCanvas() {
    console.log("🔧 Manual canvas restoration triggered from main app");

    if (
      typeof gameEngine !== "undefined" &&
      gameEngine.restoreCanvasVisibility
    ) {
      const success = gameEngine.restoreCanvasVisibility();
      if (success) {
        this.showNotification(
          "🔧 Canvas visibility restored!",
          "success",
          2000
        );
      } else {
        this.showNotification("❌ Failed to restore canvas", "error", 3000);
      }
      return success;
    } else {
      console.error("Game engine not available for canvas restoration");
      this.showNotification("❌ Game engine not available", "error", 3000);
      return false;
    }
  }

  // 🛍️ SD SHOP FUNCTIONALITY

  showSDShop() {
    this.hideAllPanels();
    document.getElementById("ssdShop").classList.remove("hidden");
    this.loadSDShop();
  }

  hideSDShop() {
    this.showGameMenu();
  }

  async loadSDShop() {
    const shopItemsContainer = document.getElementById("shopItems");
    const ssdBalance = document.getElementById("ssdBalance");
    const ssdEarned = document.getElementById("ssdEarned");
    const ssdSpent = document.getElementById("ssdSpent");

    try {
      // Update SD balance
      const stats = await web3Manager.getSDStats();
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
          <div class="price">${item.price} SD</div>
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
      console.error("Failed to load SD shop:", error);
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
        this.loadSDShop(); // Refresh shop

        // Trigger balance update
        setTimeout(() => this.refreshSDBalances(), 1000);
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
        <div class="reward-details">-${itemPrice} SD</div>
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

  // Update game availability based on current connection state
  updateGameAvailability() {
    console.log("🔄 Updating game availability");
    const canPlay = web3Manager.canPlayGame();

    // Update UI elements that depend on network state
    const playButtons = document.querySelectorAll(
      ".play-button, .start-game-btn"
    );
    playButtons.forEach((button) => {
      if (canPlay) {
        button.disabled = false;
        button.style.opacity = "1";
        button.style.cursor = "pointer";
      } else {
        button.disabled = true;
        button.style.opacity = "0.5";
        button.style.cursor = "not-allowed";
      }
    });

    // Update wallet status display
    web3Manager.updateWalletUI();
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
      if (!web3Manager.account) {
        this.showNotification("Please connect your wallet first", "warning");
        return;
      }

      const response = await fetch(
        `${CONFIG.API.BASE_URL}/twitter/status/${web3Manager.account}`
      );
      const data = await response.json();

      if (data.isVerified) {
        this.showTwitterVerified(data.twitterHandle, data.verifiedAt);
      } else {
        this.showTwitterStepGenerate();
      }
    } catch (error) {
      console.error("Failed to check Twitter status:", error);
      this.showTwitterStepGenerate();
    }
  }

  showTwitterStepGenerate() {
    const stepGenerate = document.getElementById("twitterStepGenerate");
    const stepTweet = document.getElementById("twitterStepTweet");
    const stepSubmit = document.getElementById("twitterStepSubmit");
    const verified = document.getElementById("twitterVerified");

    if (!stepGenerate) {
      console.error("Twitter UI elements not found - HTML not deployed yet");
      this.showNotification(
        "Twitter verification UI not available. Please refresh the page.",
        "error"
      );
      return;
    }

    stepGenerate.classList.remove("hidden");
    stepTweet?.classList.add("hidden");
    stepSubmit?.classList.add("hidden");
    verified?.classList.add("hidden");
    this.hideTwitterMessages();
  }

  showTwitterStepTweet(verificationCode, requiredTweet, tweetUrl) {
    document.getElementById("twitterStepGenerate").classList.add("hidden");
    document.getElementById("twitterStepTweet").classList.remove("hidden");
    document.getElementById("twitterStepSubmit").classList.remove("hidden");
    document.getElementById("twitterVerified").classList.add("hidden");

    // Store tweet text and URL for copying and posting
    this.currentTweetText = requiredTweet;
    this.currentTweetUrl = tweetUrl;

    document.getElementById("tweetTemplate").innerHTML = `
      <div style="font-size: 14px; line-height: 1.6; white-space: pre-line;">
${requiredTweet}
      </div>
    `;

    this.hideTwitterMessages();
  }

  showTwitterVerified(handle, verifiedAt) {
    document.getElementById("twitterStepGenerate").classList.add("hidden");
    document.getElementById("twitterStepTweet").classList.add("hidden");
    document.getElementById("twitterStepSubmit").classList.add("hidden");
    document.getElementById("twitterVerified").classList.remove("hidden");

    document.getElementById("verifiedHandle").textContent = `@${handle}`;
    if (verifiedAt) {
      document.getElementById("verifiedDate").textContent = new Date(
        verifiedAt
      ).toLocaleDateString();
    }

    this.hideTwitterMessages();
  }

  hideTwitterMessages() {
    const errorEl = document.getElementById("twitterError");
    const loadingEl = document.getElementById("twitterLoading");

    errorEl?.classList.add("hidden");
    loadingEl?.classList.add("hidden");
  }

  showTwitterError(message) {
    document.getElementById("twitterError").textContent = message;
    document.getElementById("twitterError").classList.remove("hidden");
    document.getElementById("twitterLoading").classList.add("hidden");
  }

  showTwitterLoading() {
    document.getElementById("twitterLoading").classList.remove("hidden");
    document.getElementById("twitterError").classList.add("hidden");
  }

  async generateTwitterCode() {
    try {
      if (!web3Manager.account) {
        this.showNotification("Please connect your wallet first", "warning");
        return;
      }

      const twitterHandle = document
        .getElementById("twitterHandle")
        .value.trim();
      if (!twitterHandle) {
        this.showTwitterError("Please enter your Twitter handle");
        return;
      }

      this.showTwitterLoading();

      console.log("🐦 Generating Twitter verification code...");
      console.log("API URL:", `${CONFIG.API.BASE_URL}/twitter/generate-code`);
      console.log("Wallet Address:", web3Manager.account);

      const response = await fetch(
        `${CONFIG.API.BASE_URL}/twitter/generate-code`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            walletAddress: web3Manager.account,
          }),
        }
      );

      console.log("📡 Response status:", response.status);
      console.log("📡 Response headers:", response.headers);

      const data = await response.json();

      if (data.success) {
        this.showTwitterStepTweet(
          data.verificationCode,
          data.requiredTweet,
          data.tweetUrl
        );
      } else {
        this.showTwitterError(
          data.error || "Failed to generate verification code"
        );
      }
    } catch (error) {
      console.error("Failed to generate code:", error);
      console.error("Error details:", {
        message: error.message,
        stack: error.stack,
        name: error.name,
      });
      this.showTwitterError(
        `Failed to generate verification code: ${error.message}`
      );
    }
  }

  openTwitterPost() {
    if (this.currentTweetUrl) {
      window.open(this.currentTweetUrl, "_blank");
      this.showNotification(
        "Opening Twitter to post your verification tweet!",
        "info"
      );
    } else {
      this.showNotification("Tweet URL not available", "error");
    }
  }

  openSupportContact() {
    // Open the @chainalphaai Twitter profile where users can click DM
    const supportUrl = "https://x.com/chainalphaai";
    window.open(supportUrl, "_blank");
    this.showNotification(
      "Opening @chainalphaai Twitter profile. Click 'Message' to send a DM for support!",
      "info"
    );
  }

  copyTweetText() {
    if (this.currentTweetText) {
      navigator.clipboard
        .writeText(this.currentTweetText)
        .then(() => {
          this.showNotification("Tweet text copied to clipboard!", "success");
        })
        .catch(() => {
          // Fallback for older browsers
          const textArea = document.createElement("textarea");
          textArea.value = this.currentTweetText;
          document.body.appendChild(textArea);
          textArea.select();
          document.execCommand("copy");
          document.body.removeChild(textArea);
          this.showNotification("Tweet text copied to clipboard!", "success");
        });
    }
  }

  async verifyTwitterTweet() {
    try {
      if (!web3Manager.account) {
        this.showNotification("Please connect your wallet first", "warning");
        return;
      }

      const tweetUrl = document.getElementById("tweetUrl").value.trim();
      const twitterHandle = document
        .getElementById("twitterHandle")
        .value.trim();

      if (!tweetUrl) {
        this.showTwitterError("Please enter your tweet URL");
        return;
      }

      if (!twitterHandle) {
        this.showTwitterError("Please enter your Twitter handle");
        return;
      }

      this.showTwitterLoading();

      const response = await fetch(`${CONFIG.API.BASE_URL}/twitter/verify`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          walletAddress: web3Manager.account,
          tweetUrl: tweetUrl,
          twitterHandle: twitterHandle,
        }),
      });

      const data = await response.json();

      if (data.success) {
        this.showNotification(
          "Twitter verified! 1 SD token credited to your account!",
          "success"
        );
        this.showTwitterVerified(
          data.player.twitterHandle,
          data.verification.verifiedAt
        );

        // Refresh SD balance
        if (this.refreshSDBalances) {
          this.refreshSDBalances();
        }
      } else {
        this.showTwitterError(data.error || "Verification failed");
      }
    } catch (error) {
      console.error("Failed to verify tweet:", error);
      this.showTwitterError("Failed to verify tweet. Please try again.");
    }
  }

  // 🚰 FAUCET PANEL FUNCTIONALITY

  showFaucetPanel() {
    this.hideAllPanels();
    document.getElementById("faucetPanel").classList.remove("hidden");
  }

  hideFaucetPanel() {
    this.showGameMenu();
  }

  async addSomniaNetworkToWallet() {
    try {
      if (!window.ethereum) {
        this.showNotification(
          "MetaMask or compatible wallet required",
          "error"
        );
        return;
      }

      // Somnia testnet network configuration
      const somniaNetwork = {
        chainId: "0xc488", // 50312 in hex
        chainName: "Somnia Testnet",
        rpcUrls: ["https://dream-rpc.somnia.network"],
        nativeCurrency: {
          name: "STT",
          symbol: "STT",
          decimals: 18,
        },
        blockExplorerUrls: ["https://shannon-explorer.somnia.network/"],
      };

      await window.ethereum.request({
        method: "wallet_addEthereumChain",
        params: [somniaNetwork],
      });

      this.showNotification(
        "✅ Somnia network added to your wallet!",
        "success"
      );
    } catch (error) {
      console.error("Failed to add Somnia network:", error);
      if (error.code === 4001) {
        this.showNotification("Network addition was cancelled", "warning");
      } else {
        this.showNotification(
          "Failed to add network. Please add manually.",
          "error"
        );
      }
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
    const adminSDBalance = document.getElementById("adminSDBalance");

    try {
      // Load contract SD balance
      const contractSD = await web3Manager.getContractSDBalance();
      contractBalance.textContent = parseFloat(contractSD).toFixed(2);

      // Load user's SD balance
      const userStats = await web3Manager.getSDStats();
      adminSDBalance.textContent = parseFloat(userStats.balance).toFixed(2);
    } catch (error) {
      console.error("Failed to load admin data:", error);
      contractBalance.textContent = "Error";
      adminSDBalance.textContent = "Error";
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
          `Successfully funded contract with ${fundAmount} SD!`,
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
          `Successfully withdrew ${withdrawAmount} SD from contract!`,
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
