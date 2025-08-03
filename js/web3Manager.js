// Somnia Space Defender - Web3 Manager
class Web3Manager {
  constructor() {
    this.web3 = null;
    this.account = null;
    this.networkId = null;
    this.gameContract = null;
    this.leaderboardContract = null;
    this.isConnected = false;

    // Event listeners
    this.onAccountChange = null;
    this.onNetworkChange = null;
    this.onConnect = null;
    this.onDisconnect = null;

    this.init();
  }

  async init() {
    console.log("🔗 Initializing Web3 Manager...");

    // Reset state first
    this.resetState();

    // Check if MetaMask is installed and available
    if (typeof window.ethereum !== "undefined" && window.ethereum.isMetaMask) {
      this.web3 = new Web3(window.ethereum);
      this.setupEventListeners();

      // Check if already connected and verify state
      try {
        const accounts = await window.ethereum.request({
          method: "eth_accounts",
        });

        if (accounts.length > 0) {
          // Verify the connection is still valid
          const isConnected = await this.verifyConnection();
          if (isConnected) {
            await this.handleAccountsChanged(accounts);
            // Also check the network
            const chainId = await window.ethereum.request({
              method: "eth_chainId",
            });
            this.handleNetworkChanged(chainId);
          } else {
            this.handleDisconnect();
          }
        } else {
          this.handleDisconnect();
        }
      } catch (error) {
        console.warn("Failed to check existing connection:", error);
        this.handleDisconnect();
      }
    } else {
      console.error("MetaMask not detected");
      this.handleDisconnect();
      this.showInstallMetaMaskPrompt();
    }
  }

  resetState() {
    this.account = null;
    this.networkId = null;
    this.gameContract = null;
    this.leaderboardContract = null;
    this.isConnected = false;
  }

  async verifyConnection() {
    try {
      // Try to make a simple request to verify MetaMask is responsive
      const accounts = await window.ethereum.request({
        method: "eth_accounts",
      });
      return accounts.length > 0;
    } catch (error) {
      console.warn("Connection verification failed:", error);
      return false;
    }
  }

  setupEventListeners() {
    // Account changes
    window.ethereum.on("accountsChanged", (accounts) => {
      this.handleAccountsChanged(accounts);
    });

    // Network changes
    window.ethereum.on("chainChanged", (chainId) => {
      this.handleNetworkChanged(chainId);
    });

    // Connection/disconnection
    window.ethereum.on("connect", (connectInfo) => {
      console.log("🔗 MetaMask connected:", connectInfo);
    });

    window.ethereum.on("disconnect", (error) => {
      console.log("🔌 MetaMask disconnected:", error);
      this.handleDisconnect();
    });
  }

  async connectWallet() {
    if (!window.ethereum) {
      this.showInstallMetaMaskPrompt();
      return false;
    }

    try {
      // Request account access
      const accounts = await window.ethereum.request({
        method: "eth_requestAccounts",
      });

      if (accounts.length > 0) {
        await this.handleAccountsChanged(accounts);
        await this.ensureSomniaNetwork();
        return true;
      }
    } catch (error) {
      console.error("Failed to connect wallet:", error);
      this.showError("Failed to connect wallet: " + error.message);
      return false;
    }
    return false;
  }

  async ensureSomniaNetwork() {
    try {
      const currentChainId = await window.ethereum.request({
        method: "eth_chainId",
      });

      if (currentChainId !== CONFIG.NETWORK.chainId) {
        await this.switchToSomniaNetwork();
      }
    } catch (error) {
      console.error("Failed to ensure Somnia network:", error);
    }
  }

  async switchToSomniaNetwork() {
    try {
      // Try to switch to Somnia testnet
      await window.ethereum.request({
        method: "wallet_switchEthereumChain",
        params: [{ chainId: CONFIG.NETWORK.chainId }],
      });
    } catch (switchError) {
      // If network doesn't exist, add it
      if (switchError.code === 4902) {
        try {
          await window.ethereum.request({
            method: "wallet_addEthereumChain",
            params: [
              {
                chainId: CONFIG.NETWORK.chainId,
                chainName: CONFIG.NETWORK.chainName,
                rpcUrls: CONFIG.NETWORK.rpcUrls,
                nativeCurrency: CONFIG.NETWORK.nativeCurrency,
                blockExplorerUrls: CONFIG.NETWORK.blockExplorerUrls,
              },
            ],
          });
        } catch (addError) {
          console.error("Failed to add Somnia network:", addError);
          this.showError(
            "Failed to add Somnia network. Please add it manually."
          );
        }
      } else {
        console.error("Failed to switch to Somnia network:", switchError);
        this.showError("Please switch to Somnia testnet manually.");
      }
    }
  }

  async handleAccountsChanged(accounts) {
    if (accounts.length === 0) {
      this.handleDisconnect();
    } else {
      this.account = accounts[0];
      this.isConnected = true;

      // Update UI
      this.updateWalletUI();

      // Initialize contracts
      await this.initializeContracts();

      // Trigger callback
      if (this.onConnect) {
        this.onConnect(this.account);
      }

      console.log("✅ Wallet connected:", UTILS.formatAddress(this.account));
    }
  }

  async handleNetworkChanged(chainId) {
    this.networkId = chainId;
    console.log("🌐 Network changed to:", chainId);

    // Update UI to reflect network status
    this.updateWalletUI();

    if (chainId !== CONFIG.NETWORK.chainId) {
      console.warn(
        "⚠️ Wrong network detected:",
        chainId,
        "Expected:",
        CONFIG.NETWORK.chainId
      );
      this.showWarning(
        "Please switch to Somnia testnet for full functionality."
      );

      // Disable game functionality on wrong network
      this.onWrongNetwork();
    } else {
      console.log("✅ Connected to correct network:", CONFIG.NETWORK.chainName);
      this.onCorrectNetwork();
    }

    if (this.onNetworkChange) {
      this.onNetworkChange(chainId);
    }
  }

  onWrongNetwork() {
    // You can add logic here to disable game functionality
    console.log("🚫 Game functionality limited due to wrong network");
  }

  onCorrectNetwork() {
    // Re-enable game functionality
    console.log("✅ Game functionality restored");
  }

  handleDisconnect() {
    this.resetState();
    this.updateWalletUI();

    if (this.onDisconnect) {
      this.onDisconnect();
    }

    console.log("🔌 Wallet disconnected");
  }

  // Manual refresh method to check current state
  async refreshConnection() {
    console.log("🔄 Refreshing Web3 connection...");
    await this.init();
  }

  // Check if we can proceed with game functionality
  canPlayGame() {
    return this.isConnected && this.networkId === CONFIG.NETWORK.chainId;
  }

  async loadContractABI() {
    // Complete ABI with all functions needed for the game
    return [
      // Core game functions
      {
        inputs: [
          { name: "_score", type: "uint256" },
          { name: "_level", type: "uint8" },
          { name: "_aliensKilled", type: "uint16" },
          { name: "_gameMode", type: "string" },
        ],
        name: "submitScore",
        outputs: [],
        stateMutability: "nonpayable",
        type: "function",
      },
      {
        inputs: [{ name: "_count", type: "uint256" }],
        name: "getTopScores",
        outputs: [
          {
            components: [
              { name: "player", type: "address" },
              { name: "score", type: "uint256" },
              { name: "level", type: "uint8" },
              { name: "timestamp", type: "uint256" },
              { name: "aliensKilled", type: "uint16" },
              { name: "gameMode", type: "string" },
            ],
            name: "",
            type: "tuple[]",
          },
        ],
        stateMutability: "view",
        type: "function",
      },
      // SSD Shop functions
      {
        inputs: [{ name: "_itemId", type: "uint256" }],
        name: "buyShopItem",
        outputs: [],
        stateMutability: "nonpayable",
        type: "function",
      },
      {
        inputs: [
          { name: "_player", type: "address" },
          { name: "_itemId", type: "uint256" },
        ],
        name: "hasActiveBoost",
        outputs: [{ name: "", type: "bool" }],
        stateMutability: "view",
        type: "function",
      },
      {
        inputs: [{ name: "_itemId", type: "uint256" }],
        name: "getShopItem",
        outputs: [
          {
            components: [
              { name: "name", type: "string" },
              { name: "price", type: "uint256" },
              { name: "duration", type: "uint256" },
              { name: "active", type: "bool" },
            ],
            name: "",
            type: "tuple",
          },
        ],
        stateMutability: "view",
        type: "function",
      },
      {
        inputs: [],
        name: "getAllShopItems",
        outputs: [
          {
            components: [
              { name: "name", type: "string" },
              { name: "price", type: "uint256" },
              { name: "duration", type: "uint256" },
              { name: "active", type: "bool" },
            ],
            name: "",
            type: "tuple[]",
          },
        ],
        stateMutability: "view",
        type: "function",
      },
      // Twitter verification functions
      {
        inputs: [{ name: "_twitterHandle", type: "string" }],
        name: "verifyTwitter",
        outputs: [],
        stateMutability: "nonpayable",
        type: "function",
      },
      {
        inputs: [{ name: "_player", type: "address" }],
        name: "isTwitterVerified",
        outputs: [{ name: "", type: "bool" }],
        stateMutability: "view",
        type: "function",
      },
      // SSD stats function
      {
        inputs: [{ name: "_player", type: "address" }],
        name: "getPlayerSSDStats",
        outputs: [
          { name: "earned", type: "uint256" },
          { name: "spent", type: "uint256" },
          { name: "balance", type: "uint256" },
        ],
        stateMutability: "view",
        type: "function",
      },
      // Admin functions
      {
        inputs: [{ name: "_amount", type: "uint256" }],
        name: "withdrawSSD",
        outputs: [],
        stateMutability: "nonpayable",
        type: "function",
      },
      {
        inputs: [],
        name: "owner",
        outputs: [{ name: "", type: "address" }],
        stateMutability: "view",
        type: "function",
      },
      // Additional needed functions
      {
        inputs: [{ name: "_newTokenAddress", type: "address" }],
        name: "updateSSDToken",
        outputs: [],
        stateMutability: "nonpayable",
        type: "function",
      },
    ];
  }

  async initializeContracts() {
    try {
      // Initialize game contract (now deployed!)
      if (
        CONFIG.CONTRACTS.GAME_SCORE &&
        CONFIG.CONTRACTS.GAME_SCORE !== "0x..."
      ) {
        console.log(
          "📄 Initializing game contract:",
          CONFIG.CONTRACTS.GAME_SCORE
        );

        // Load the complete ABI from artifacts
        const contractABI = await this.loadContractABI();

        // Initialize the contract instance with complete ABI
        this.gameContract = new this.web3.eth.Contract(
          contractABI,
          CONFIG.CONTRACTS.GAME_SCORE
        );

        console.log("✅ Game contract initialized successfully!");
      }

      console.log("📄 Contracts ready for blockchain interaction!");
    } catch (error) {
      console.error("Failed to initialize contracts:", error);
    }
  }

  async saveScore(
    score,
    level,
    aliensKilled = 0,
    gameMode = "normal",
    gameSession = null
  ) {
    if (!this.isConnected) {
      console.warn("Wallet not connected, saving score locally");
      this.saveScoreLocally(score, level);
      return;
    }

    // 🛡️ ANTI-CHEAT VALIDATION
    const validationResult = this.validateScore(
      score,
      level,
      aliensKilled,
      gameSession
    );
    if (!validationResult.valid) {
      console.error("🚨 Score validation failed:", validationResult.reason);
      this.showError(`Score validation failed: ${validationResult.reason}`);
      return false;
    }

    try {
      // Save locally as backup
      this.saveScoreLocally(score, level);

      // Save to blockchain if contract is available
      if (this.gameContract) {
        console.log("🔗 Saving score to blockchain...", {
          score,
          level,
          aliensKilled,
          gameMode,
          validation: "✅ Passed",
        });

        const tx = await this.gameContract.methods
          .submitScore(score, level, aliensKilled, gameMode)
          .send({
            from: this.account,
            gas: 500000, // Increased gas limit for more complex function
          });

        console.log("✅ Score saved to blockchain!", tx.transactionHash);

        // 🎉 Calculate and show SSD reward
        const ssdReward = aliensKilled * parseFloat(CONFIG.SSD.REWARD_PER_KILL);
        if (ssdReward > 0) {
          console.log(
            `💰 SSD Reward: ${ssdReward} SSD for ${aliensKilled} aliens killed`
          );
          this.showSSDRewardNotification(ssdReward, aliensKilled);
        }

        this.showSuccess("Score saved to blockchain!");
        return true;
      } else {
        console.log("💾 Score saved locally (contract not initialized)");
        return true;
      }
    } catch (error) {
      console.error("Failed to save score to blockchain:", error);
      console.log("💾 Score saved locally as fallback");

      // Show user-friendly error message
      if (error.message.includes("User denied")) {
        this.showWarning("Transaction cancelled by user");
      } else {
        this.showWarning("Failed to save to blockchain, saved locally instead");
      }

      return false;
    }
  }

  // 🛡️ ANTI-CHEAT: Score validation
  validateScore(score, level, aliensKilled, gameSession) {
    const now = Date.now();

    // 1. Basic bounds checking
    if (score < 0 || score > 1000000) {
      return { valid: false, reason: "Score out of reasonable range" };
    }

    if (level < 1 || level > 10) {
      return { valid: false, reason: "Invalid level" };
    }

    if (aliensKilled < 0 || aliensKilled > 10000) {
      return { valid: false, reason: "Aliens killed count unrealistic" };
    }

    // 2. Score-to-aliens ratio validation
    const minScorePerAlien = 5; // Minimum points per alien
    const maxScorePerAlien = 150; // Maximum points per alien (with power-ups)

    if (aliensKilled > 0) {
      const scorePerAlien = score / aliensKilled;
      if (
        scorePerAlien < minScorePerAlien ||
        scorePerAlien > maxScorePerAlien
      ) {
        return { valid: false, reason: "Score-to-aliens ratio suspicious" };
      }
    } else if (score > 100) {
      // Can't have high score with 0 aliens killed
      return { valid: false, reason: "High score with no aliens killed" };
    }

    // 3. Level-based maximum score validation
    const maxScorePerLevel = [
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

    const maxAllowedScore = maxScorePerLevel[level - 1] || 200000;
    if (score > maxAllowedScore) {
      return { valid: false, reason: `Score too high for level ${level}` };
    }

    // 4. Session validation (if provided)
    if (gameSession) {
      const sessionDuration = now - gameSession.startTime;
      const minGameTime = 10000; // 10 seconds minimum
      const maxGameTime = 1800000; // 30 minutes maximum

      if (sessionDuration < minGameTime) {
        return { valid: false, reason: "Game completed too quickly" };
      }

      if (sessionDuration > maxGameTime) {
        return { valid: false, reason: "Game session too long" };
      }

      // Score-to-time ratio validation (rough)
      const scorePerSecond = score / (sessionDuration / 1000);
      if (scorePerSecond > 100) {
        return { valid: false, reason: "Score accumulation rate too high" };
      }
    }

    // 5. Rate limiting - prevent spam submissions
    const lastSubmissionKey = `lastScore_${this.account}`;
    const lastSubmission = localStorage.getItem(lastSubmissionKey);
    if (lastSubmission) {
      const timeSinceLastSubmission = now - parseInt(lastSubmission);
      if (timeSinceLastSubmission < 5000) {
        // 5 second minimum between submissions
        return {
          valid: false,
          reason: "Please wait before submitting another score",
        };
      }
    }
    localStorage.setItem(lastSubmissionKey, now.toString());

    console.log("✅ Score validation passed");
    return { valid: true };
  }

  saveScoreLocally(score, level) {
    const scores = this.getLocalScores();
    const newScore = {
      score: score,
      level: level,
      address: this.account || "Anonymous",
      timestamp: Date.now(),
      id: UTILS.generateId(),
    };

    scores.push(newScore);
    scores.sort((a, b) => b.score - a.score);

    // Keep only top 100 scores
    if (scores.length > 100) {
      scores.splice(100);
    }

    localStorage.setItem("somniaSpaceDefender_scores", JSON.stringify(scores));
  }

  getLocalScores() {
    try {
      const scores = localStorage.getItem("somniaSpaceDefender_scores");
      return scores ? JSON.parse(scores) : [];
    } catch (error) {
      console.error("Failed to load local scores:", error);
      return [];
    }
  }

  async getLeaderboard() {
    try {
      // Try to fetch from blockchain first
      if (this.gameContract) {
        console.log("🔗 Fetching leaderboard from blockchain...");

        const blockchainScores = await this.gameContract.methods
          .getTopScores(10)
          .call();

        if (blockchainScores && blockchainScores.length > 0) {
          console.log("📊 Fetched", blockchainScores, "scores from blockchain");

          return blockchainScores.map((score, index) => ({
            rank: index + 1,
            address: score.player,
            score: parseInt(score.score),
            level: parseInt(score.level),
            timestamp: parseInt(score.timestamp),
            aliensKilled: parseInt(score.aliensKilled || 0),
            gameMode: score.gameMode || "normal",
          }));
        }
      }

      // Fallback to local scores
      console.log("💾 Using local scores as fallback");
      const localScores = this.getLocalScores();

      return localScores.slice(0, 10).map((score, index) => ({
        rank: index + 1,
        address: score.address,
        score: score.score,
        level: score.level,
        timestamp: score.timestamp,
      }));
    } catch (error) {
      console.error("Failed to fetch leaderboard:", error);

      // Return local scores as final fallback
      const localScores = this.getLocalScores();
      return localScores.slice(0, 10).map((score, index) => ({
        rank: index + 1,
        address: score.address,
        score: score.score,
        level: score.level,
        timestamp: score.timestamp,
      }));
    }
  }

  getHighScore() {
    const scores = this.getLocalScores();
    if (scores.length === 0) return 0;

    // Get the highest score for the current account ONLY
    const userScores = scores.filter((s) => s.address === this.account);
    if (userScores.length === 0) return 0; // New player starts at 0

    return Math.max(...userScores.map((s) => s.score));
  }

  updateWalletUI() {
    const connectBtn = document.getElementById("connectWallet");
    const walletInfo = document.getElementById("walletInfo");
    const walletAddress = document.getElementById("walletAddress");
    const networkName = document.getElementById("networkName");

    if (this.isConnected && this.account) {
      connectBtn.textContent = "Connected ✅";
      connectBtn.disabled = true;
      connectBtn.classList.add("btn-secondary");

      walletInfo.classList.remove("hidden");
      walletAddress.textContent = UTILS.formatAddress(this.account);

      // Update network name
      if (this.networkId === CONFIG.NETWORK.chainId) {
        networkName.textContent = CONFIG.NETWORK.chainName;
        networkName.style.color = "#00ff00";
      } else {
        networkName.textContent = "Wrong Network";
        networkName.style.color = "#ff4444";
      }
    } else {
      connectBtn.textContent = "Connect Wallet";
      connectBtn.disabled = false;
      connectBtn.classList.remove("btn-secondary");
      walletInfo.classList.add("hidden");
    }
  }

  showInstallMetaMaskPrompt() {
    this.showError(
      "MetaMask is required to play. Please install MetaMask and refresh the page."
    );
  }

  showError(message) {
    console.error("❌", message);
    // You can implement a toast notification system here
    alert("Error: " + message);
  }

  showWarning(message) {
    console.warn("⚠️", message);
    // You can implement a toast notification system here
  }

  showSuccess(message) {
    console.log("✅", message);
    // You can implement a toast notification system here
  }

  // Utility methods
  async getBalance() {
    if (!this.isConnected) return "0";

    try {
      const balance = await this.web3.eth.getBalance(this.account);
      return this.web3.utils.fromWei(balance, "ether");
    } catch (error) {
      console.error("Failed to get balance:", error);
      return "0";
    }
  }

  async estimateGas(transaction) {
    try {
      return await this.web3.eth.estimateGas(transaction);
    } catch (error) {
      console.error("Failed to estimate gas:", error);
      return 100000; // Default gas limit
    }
  }

  isOnSomniaNetwork() {
    return this.networkId === CONFIG.NETWORK.chainId;
  }

  // 🎉 SSD REWARD NOTIFICATION SYSTEM

  showSSDRewardNotification(ssdAmount, aliensKilled = 0, source = "Gameplay") {
    if (window.gameApp && window.gameApp.showSSDReward) {
      window.gameApp.showSSDReward(ssdAmount, aliensKilled, source);
    } else {
      // Fallback notification
      console.log(`🎉 SSD REWARD: +${ssdAmount} SSD from ${source}!`);
    }

    // Also trigger balance refresh
    this.triggerBalanceUpdate();
  }

  triggerBalanceUpdate() {
    if (window.gameApp && window.gameApp.refreshSSDBalances) {
      setTimeout(() => {
        window.gameApp.refreshSSDBalances();
      }, 1000); // Delay to allow blockchain confirmation
    }
  }

  // Check if player has an active boost from SSD shop
  async hasActiveBoost(itemId) {
    if (!this.gameContract || !this.account) {
      return false;
    }

    try {
      const hasBoost = await this.gameContract.methods
        .hasActiveBoost(this.account, itemId)
        .call();

      return hasBoost;
    } catch (error) {
      console.error(`Failed to check boost ${itemId}:`, error);
      return false;
    }
  }

  // 🛍️ SSD SHOP FUNCTIONALITY

  async getShopItems() {
    if (!this.gameContract) {
      throw new Error("Game contract not initialized");
    }

    try {
      const items = await this.gameContract.methods.getAllShopItems().call();
      return items.map((item, index) => ({
        id: index,
        name: item.name,
        price: this.web3.utils.fromWei(item.price, "ether"),
        duration: parseInt(item.duration),
        active: item.active,
      }));
    } catch (error) {
      console.error("Failed to get shop items:", error);
      throw error;
    }
  }

  async buyShopItem(itemId) {
    if (!this.gameContract || !this.account) {
      throw new Error("Not connected or contract not initialized");
    }

    try {
      console.log(`🛍️ Purchasing shop item ${itemId}...`);

      // First get the item details to know the price
      const item = await this.gameContract.methods.getShopItem(itemId).call();
      const itemPrice = item.price;

      console.log(
        `💰 Item price: ${this.web3.utils.fromWei(itemPrice, "ether")} SSD`
      );

      // Step 1: Approve SSD token spending
      console.log("📝 Approving SSD token spending...");
      const ssdContract = new this.web3.eth.Contract(
        [
          {
            inputs: [
              { name: "spender", type: "address" },
              { name: "amount", type: "uint256" },
            ],
            name: "approve",
            outputs: [{ name: "", type: "bool" }],
            stateMutability: "nonpayable",
            type: "function",
          },
        ],
        CONFIG.CONTRACTS.SSD_TOKEN
      );

      const approveTx = await ssdContract.methods
        .approve(CONFIG.CONTRACTS.GAME_SCORE, itemPrice)
        .send({ from: this.account, gas: 100000 });

      console.log("✅ SSD approval successful:", approveTx.transactionHash);

      // Step 2: Purchase the item
      console.log("🛒 Purchasing item...");
      const tx = await this.gameContract.methods
        .buyShopItem(itemId)
        .send({ from: this.account, gas: 300000 });

      console.log("✅ Shop item purchased:", tx.transactionHash);
      return true;
    } catch (error) {
      console.error("Failed to buy shop item:", error);
      throw error;
    }
  }

  async hasActiveBoost(itemId) {
    if (!this.gameContract || !this.account) {
      return false;
    }

    try {
      return await this.gameContract.methods
        .hasActiveBoost(this.account, itemId)
        .call();
    } catch (error) {
      console.error("Failed to check boost status:", error);
      return false;
    }
  }

  // 🐦 TWITTER VERIFICATION FUNCTIONALITY

  async verifyTwitter(twitterHandle) {
    if (!this.gameContract || !this.account) {
      throw new Error("Not connected or contract not initialized");
    }

    try {
      console.log(`🐦 Verifying Twitter handle: @${twitterHandle}...`);

      const tx = await this.gameContract.methods
        .verifyTwitter(twitterHandle)
        .send({ from: this.account, gas: 200000 });

      console.log("✅ Twitter verified:", tx.transactionHash);

      // 🎉 Show Twitter reward notification
      const twitterReward = parseFloat(CONFIG.SSD.TWITTER_REWARD);
      this.showSSDRewardNotification(twitterReward, 0, "Twitter Verification");

      return true;
    } catch (error) {
      console.error("Failed to verify Twitter:", error);
      throw error;
    }
  }

  async isTwitterVerified() {
    if (!this.gameContract || !this.account) {
      return false;
    }

    try {
      return await this.gameContract.methods
        .isTwitterVerified(this.account)
        .call();
    } catch (error) {
      console.error("Failed to check Twitter verification:", error);
      return false;
    }
  }

  async getTwitterHandle() {
    if (!this.gameContract || !this.account) {
      return "";
    }

    try {
      // Note: This would need to be added to the smart contract if we want to retrieve handles
      // For now, we'll store it locally or in the contract's mapping
      return ""; // Placeholder
    } catch (error) {
      console.error("Failed to get Twitter handle:", error);
      return "";
    }
  }

  // 💰 SSD STATS FUNCTIONALITY

  async getSSDStats() {
    if (!this.gameContract || !this.account) {
      return { earned: "0", spent: "0", balance: "0" };
    }

    try {
      const stats = await this.gameContract.methods
        .getPlayerSSDStats(this.account)
        .call();
      return {
        earned: this.web3.utils.fromWei(stats.earned, "ether"),
        spent: this.web3.utils.fromWei(stats.spent, "ether"),
        balance: this.web3.utils.fromWei(stats.balance, "ether"),
      };
    } catch (error) {
      console.error("Failed to get SSD stats:", error);
      return { earned: "0", spent: "0", balance: "0" };
    }
  }

  // 🎮 ENHANCED GAME FUNCTIONALITY

  async getPlayerBoosts() {
    if (!this.account) {
      return {};
    }

    try {
      const boosts = {};
      // Check all 5 shop items for active boosts
      for (let i = 0; i < 5; i++) {
        boosts[i] = await this.hasActiveBoost(i);
      }
      return boosts;
    } catch (error) {
      console.error("Failed to get player boosts:", error);
      return {};
    }
  }

  // Apply boosts to game mechanics
  applyGameBoosts(baseValue, boostType) {
    // This would be called from the game engine to apply active boosts
    // boostType: 'scoreMultiplier', 'rapidFire', 'energyShield', 'multiShot', 'extraLife'

    // For now, return base value - the game engine would check active boosts
    return baseValue;
  }

  // 🔒 ADMIN SECURITY FUNCTIONS

  async isContractOwner() {
    if (!this.gameContract || !this.account) {
      return false;
    }

    try {
      const owner = await this.gameContract.methods.owner().call();
      return owner.toLowerCase() === this.account.toLowerCase();
    } catch (error) {
      console.error("Failed to check contract owner:", error);
      return false;
    }
  }

  // 👑 ADMIN FUNCTIONS FOR CONTRACT MANAGEMENT

  async getContractSSDBalance() {
    if (!this.gameContract) {
      throw new Error("Game contract not initialized");
    }

    try {
      // Get SSD token contract
      const ssdContract = new this.web3.eth.Contract(
        [
          {
            inputs: [{ name: "account", type: "address" }],
            name: "balanceOf",
            outputs: [{ name: "", type: "uint256" }],
            stateMutability: "view",
            type: "function",
          },
        ],
        CONFIG.CONTRACTS.SSD_TOKEN
      );

      const balance = await ssdContract.methods
        .balanceOf(CONFIG.CONTRACTS.GAME_SCORE)
        .call();
      return this.web3.utils.fromWei(balance, "ether");
    } catch (error) {
      console.error("Failed to get contract SSD balance:", error);
      return "0";
    }
  }

  async fundContract(amount) {
    if (!this.account) {
      throw new Error("Wallet not connected");
    }

    try {
      console.log(`💰 Funding contract with ${amount} SSD tokens...`);

      // Get SSD token contract
      const ssdContract = new this.web3.eth.Contract(
        [
          {
            inputs: [
              { name: "to", type: "address" },
              { name: "amount", type: "uint256" },
            ],
            name: "transfer",
            outputs: [{ name: "", type: "bool" }],
            stateMutability: "nonpayable",
            type: "function",
          },
        ],
        CONFIG.CONTRACTS.SSD_TOKEN
      );

      const amountWei = this.web3.utils.toWei(amount.toString(), "ether");

      const tx = await ssdContract.methods
        .transfer(CONFIG.CONTRACTS.GAME_SCORE, amountWei)
        .send({ from: this.account, gas: 100000 });

      console.log("✅ Contract funded:", tx.transactionHash);
      return true;
    } catch (error) {
      console.error("Failed to fund contract:", error);
      throw error;
    }
  }

  async withdrawFromContract(amount) {
    if (!this.gameContract || !this.account) {
      throw new Error("Not connected or contract not initialized");
    }

    try {
      console.log(`💸 Withdrawing ${amount} SSD from contract...`);

      const amountWei = this.web3.utils.toWei(amount.toString(), "ether");

      const tx = await this.gameContract.methods
        .withdrawSSD(amountWei)
        .send({ from: this.account, gas: 200000 });

      console.log("✅ Withdrawal successful:", tx.transactionHash);
      return true;
    } catch (error) {
      console.error("Failed to withdraw from contract:", error);
      throw error;
    }
  }
}

// Create global instance
const web3Manager = new Web3Manager();

// Export for use in other modules
if (typeof module !== "undefined" && module.exports) {
  module.exports = Web3Manager;
}

console.log("🔗 Web3 Manager Loaded");
