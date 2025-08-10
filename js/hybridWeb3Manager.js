// Somnia Space Defender - Hybrid Web3 Manager (MetaMask + Wagmi Fallback)
class HybridWeb3Manager {
  constructor() {
    this.primaryProvider = null; // MetaMask/Web3.js
    this.fallbackProvider = null; // Wagmi
    this.activeProvider = null; // Currently active provider
    this.providerType = null; // 'metamask' or 'wagmi'

    // Connection state
    this.web3 = null;
    this.account = null;
    this.networkId = null;
    this.gameContract = null;
    this.isConnected = false;

    // Event listeners
    this.onAccountChange = null;
    this.onNetworkChange = null;
    this.onConnect = null;
    this.onDisconnect = null;

    this.init();
  }

  async init() {
    console.log("🔗 Initializing Hybrid Web3 Manager...");
    this.updateWalletStatus(
      "checking",
      "🔍 Checking for wallet connections..."
    );

    // Initialize both providers
    await this.initializeProviders();

    // Try to connect with the best available option
    await this.attemptConnection();
  }

  async initializeProviders() {
    console.log("🔧 Initializing wallet providers...");

    // Initialize primary provider (MetaMask/Web3.js)
    if (typeof window.ethereum !== "undefined" && window.ethereum.isMetaMask) {
      console.log("🦊 MetaMask detected as primary provider");
      this.primaryProvider = {
        type: "metamask",
        web3: new Web3(window.ethereum),
        ethereum: window.ethereum,
        available: true,
      };
    } else {
      console.log("🦊 MetaMask not detected or not available");
      this.primaryProvider = {
        type: "metamask",
        web3: null,
        ethereum: null,
        available: false,
      };
    }

    // Initialize fallback provider (Wagmi)
    try {
      // Wait for Wagmi to be available
      await this.waitForWagmi();

      if (window.wagmiConfig) {
        console.log(
          "🎯 Wagmi config detected, initializing fallback provider..."
        );

        // Debug: Check what's available
        console.log("🔍 Checking WagmiManager availability:", {
          globalWagmiManager: typeof WagmiManager,
          windowWagmiManager: typeof window.WagmiManager,
          wagmiConfig: !!window.wagmiConfig,
        });

        // Use global WagmiManager if available, otherwise try dynamic import
        let WagmiManagerClass;
        if (typeof WagmiManager !== "undefined") {
          console.log("✅ Using global WagmiManager");
          WagmiManagerClass = WagmiManager;
        } else if (typeof window.WagmiManager !== "undefined") {
          console.log("✅ Using window.WagmiManager");
          WagmiManagerClass = window.WagmiManager;
        } else {
          console.warn(
            "⚠️ WagmiManager not found globally, attempting dynamic import..."
          );
          // Fallback to dynamic import
          try {
            const module = await import("./wagmiManager.js");
            WagmiManagerClass =
              module.default || module.WagmiManager || WagmiManager;
            console.log("✅ WagmiManager imported dynamically");
          } catch (importError) {
            console.error("❌ Failed to import WagmiManager:", importError);
            throw new Error("WagmiManager not available");
          }
        }

        this.fallbackProvider = {
          type: "wagmi",
          manager: new WagmiManagerClass(),
          available: true,
        };

        // Setup Wagmi event handlers
        this.fallbackProvider.manager.onConnect = (account) => {
          if (this.providerType === "wagmi") {
            this.handleAccountsChanged([account]);
          }
        };

        this.fallbackProvider.manager.onDisconnect = () => {
          if (this.providerType === "wagmi") {
            this.handleDisconnect();
          }
        };

        this.fallbackProvider.manager.onAccountChanged = (account) => {
          if (this.providerType === "wagmi") {
            this.handleAccountsChanged([account]);
          }
        };

        this.fallbackProvider.manager.onChainChanged = (chainId) => {
          if (this.providerType === "wagmi") {
            this.handleNetworkChanged(chainId);
          }
        };
      }
    } catch (error) {
      console.warn("Failed to initialize Wagmi provider:", error);
      // Mark Wagmi as unavailable so we fall back to primary provider only
      this.fallbackProvider = {
        type: "wagmi",
        manager: null,
        available: false,
      };
    }

    console.log("✅ Provider initialization complete", {
      primary: this.primaryProvider?.available || false,
      fallback: this.fallbackProvider?.available || false,
    });

    // Update UI after initialization
    this.updateWalletUI();
  }

  async waitForWagmi(maxAttempts = 20) {
    for (let i = 0; i < maxAttempts; i++) {
      if (window.wagmiConfig) {
        return true;
      }
      await new Promise((resolve) => setTimeout(resolve, 100));
    }
    return false;
  }

  async attemptConnection() {
    console.log("🔍 Attempting wallet connection...");

    // First, try to restore existing connection
    let connected = false;

    // Try MetaMask first (if available)
    if (this.primaryProvider?.available) {
      connected = await this.tryMetaMaskConnection();
    }

    // If MetaMask failed, try Wagmi fallback
    if (!connected && this.fallbackProvider?.available) {
      connected = await this.tryWagmiConnection();
    }

    // Update UI based on connection status
    if (!connected) {
      this.handleNoConnectionAvailable();
    } else {
      this.updateWalletUI();
    }

    return connected;
  }

  async tryMetaMaskConnection() {
    try {
      console.log("🦊 Trying MetaMask connection...");

      const accounts = await this.primaryProvider.ethereum.request({
        method: "eth_accounts",
      });

      if (accounts.length > 0) {
        console.log("✅ MetaMask: Existing connection found");
        this.activateProvider("metamask");
        await this.handleAccountsChanged(accounts);

        // Verify network with enhanced error handling
        const networkResult = await this.verifyNetworkConnectionWithFallback();
        if (networkResult.success) {
          console.log("✅ MetaMask: Network verified");
          return true;
        } else {
          console.warn(
            `⚠️ MetaMask: Network verification failed: ${networkResult.error}`
          );
          // Don't fail immediately - might be timing issue
          if (!networkResult.wrongNetwork) {
            console.log("🔄 Scheduling network retry for hybrid manager...");
            this.scheduleNetworkRetry();
          }
        }
      }
    } catch (error) {
      console.warn("MetaMask connection attempt failed:", error);
    }
    return false;
  }

  async tryWagmiConnection() {
    try {
      console.log("🎯 Trying Wagmi connection...");

      if (this.fallbackProvider.manager.isConnected) {
        console.log("✅ Wagmi: Existing connection found");
        this.activateProvider("wagmi");

        this.account = this.fallbackProvider.manager.account;
        this.networkId = this.fallbackProvider.manager.chainId;
        this.isConnected = true;

        await this.initializeContracts();
        this.updateWalletUI();

        if (this.onConnect) {
          this.onConnect(this.account);
        }

        return true;
      }
    } catch (error) {
      console.warn("Wagmi connection attempt failed:", error);
    }
    return false;
  }

  activateProvider(type) {
    this.providerType = type;

    if (type === "metamask") {
      this.activeProvider = this.primaryProvider;
      this.web3 = this.primaryProvider.web3;
      this.setupMetaMaskEventListeners();
      console.log("🦊 MetaMask activated as primary provider");
    } else if (type === "wagmi") {
      this.activeProvider = this.fallbackProvider;
      this.web3 = null; // Wagmi doesn't use Web3.js
      console.log("🎯 Wagmi activated as fallback provider");
    }
  }

  setupMetaMaskEventListeners() {
    if (!this.primaryProvider?.ethereum) return;

    // Remove existing listeners to prevent duplicates
    this.primaryProvider.ethereum.removeAllListeners();

    // Account changes
    this.primaryProvider.ethereum.on("accountsChanged", (accounts) => {
      if (this.providerType === "metamask") {
        this.handleAccountsChanged(accounts);
      }
    });

    // Network changes
    this.primaryProvider.ethereum.on("chainChanged", (chainId) => {
      if (this.providerType === "metamask") {
        this.handleNetworkChanged(chainId);
      }
    });

    // Connection/disconnection
    this.primaryProvider.ethereum.on("connect", (connectInfo) => {
      if (this.providerType === "metamask") {
        console.log("🔗 MetaMask connected:", connectInfo);
      }
    });

    this.primaryProvider.ethereum.on("disconnect", (error) => {
      if (this.providerType === "metamask") {
        console.log("🔌 MetaMask disconnected:", error);
        this.attemptFallbackConnection();
      }
    });
  }

  async attemptFallbackConnection() {
    console.log("🔄 Primary connection lost, attempting fallback...");

    if (this.fallbackProvider?.available && this.providerType === "metamask") {
      const connected = await this.tryWagmiConnection();
      if (connected) {
        console.log("✅ Successfully switched to fallback provider");
        this.showSuccess("Switched to backup wallet connection");
      } else {
        this.handleDisconnect();
      }
    } else {
      this.handleDisconnect();
    }
  }

  async connectWallet(preferredMethod = null) {
    console.log("🔗 Manual wallet connection requested", { preferredMethod });

    // If user specified a method, try that first
    if (preferredMethod === "metamask" && this.primaryProvider?.available) {
      return await this.connectMetaMask();
    } else if (
      preferredMethod === "wagmi" &&
      this.fallbackProvider?.available
    ) {
      return await this.connectWagmi();
    }

    // Otherwise, try the best available option
    if (this.primaryProvider?.available) {
      return await this.connectMetaMask();
    } else if (this.fallbackProvider?.available) {
      return await this.connectWagmi();
    } else {
      this.showInstallMetaMaskPrompt();
      return false;
    }
  }

  async connectMetaMask() {
    if (!this.primaryProvider?.available) {
      throw new Error("MetaMask not available");
    }

    try {
      console.log("🦊 Connecting to MetaMask...");

      const accounts = await this.primaryProvider.ethereum.request({
        method: "eth_requestAccounts",
      });

      if (accounts.length > 0) {
        this.activateProvider("metamask");
        await this.handleAccountsChanged(accounts);
        await this.ensureSomniaNetwork();
        return true;
      }
    } catch (error) {
      console.error("MetaMask connection failed:", error);
      this.showError("MetaMask connection failed: " + error.message);

      // Try fallback if available
      if (this.fallbackProvider?.available) {
        console.log("🔄 Trying Wagmi fallback...");
        return await this.connectWagmi();
      }
    }
    return false;
  }

  async connectWagmi(connectorType = "injected") {
    if (!this.fallbackProvider?.available) {
      throw new Error("Wagmi not available");
    }

    try {
      console.log(`🎯 Connecting with Wagmi (${connectorType})...`);

      let connected = false;

      switch (connectorType) {
        case "metamask":
          connected = await this.fallbackProvider.manager.connectWithMetaMask();
          break;
        case "walletconnect":
          connected =
            await this.fallbackProvider.manager.connectWithWalletConnect();
          break;
        case "coinbase":
          connected = await this.fallbackProvider.manager.connectWithCoinbase();
          break;
        default:
          connected = await this.fallbackProvider.manager.connectWithInjected();
      }

      if (connected) {
        this.activateProvider("wagmi");
        this.account = this.fallbackProvider.manager.account;
        this.networkId = this.fallbackProvider.manager.chainId;
        this.isConnected = true;

        await this.initializeContracts();
        this.updateWalletUI();

        if (this.onConnect) {
          this.onConnect(this.account);
        }

        return true;
      }
    } catch (error) {
      console.error("Wagmi connection failed:", error);
      this.showError("Wallet connection failed: " + error.message);
    }
    return false;
  }

  async ensureSomniaNetwork() {
    if (this.providerType === "metamask") {
      return await this.ensureSomniaNetworkMetaMask();
    } else if (this.providerType === "wagmi") {
      return await this.ensureSomniaNetworkWagmi();
    }
  }

  async ensureSomniaNetworkMetaMask() {
    try {
      const currentChainId = await this.primaryProvider.ethereum.request({
        method: "eth_chainId",
      });

      if (currentChainId !== CONFIG.NETWORK.chainId) {
        await this.switchToSomniaNetworkMetaMask();
      }
    } catch (error) {
      console.error("Failed to ensure Somnia network (MetaMask):", error);
    }
  }

  async ensureSomniaNetworkWagmi() {
    try {
      await this.fallbackProvider.manager.ensureSomniaNetwork();
    } catch (error) {
      console.error("Failed to ensure Somnia network (Wagmi):", error);
    }
  }

  async switchToSomniaNetworkMetaMask() {
    try {
      await this.primaryProvider.ethereum.request({
        method: "wallet_switchEthereumChain",
        params: [{ chainId: CONFIG.NETWORK.chainId }],
      });
    } catch (switchError) {
      if (switchError.code === 4902) {
        try {
          await this.primaryProvider.ethereum.request({
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

      console.log(
        `✅ Wallet connected (${this.providerType}):`,
        UTILS.formatAddress(this.account)
      );
    }
  }

  async handleNetworkChanged(chainId) {
    this.networkId = chainId;
    console.log(`🌐 Network changed to: ${chainId} (${this.providerType})`);

    this.updateWalletUI();

    const expectedChainId =
      this.providerType === "wagmi" ? 50312 : CONFIG.NETWORK.chainId;

    if (chainId !== expectedChainId) {
      console.warn(
        "⚠️ Wrong network detected:",
        chainId,
        "Expected:",
        expectedChainId
      );
      this.showWarning(
        "Please switch to Somnia testnet for full functionality."
      );
      this.onWrongNetwork();
    } else {
      console.log("✅ Connected to correct network:", CONFIG.NETWORK.chainName);
      this.onCorrectNetwork();

      if (this.account && window.gameApp) {
        setTimeout(() => {
          if (window.gameApp.updateGameAvailability) {
            window.gameApp.updateGameAvailability();
          }
        }, 100);
      }
    }

    if (this.onNetworkChange) {
      this.onNetworkChange(chainId);
    }
  }

  handleDisconnect() {
    this.resetState();
    this.updateWalletUI();

    if (this.onDisconnect) {
      this.onDisconnect();
    }

    console.log(`🔌 Wallet disconnected (${this.providerType || "unknown"})`);
  }

  resetState() {
    this.account = null;
    this.networkId = null;
    this.gameContract = null;
    this.isConnected = false;
    this.activeProvider = null;
    this.providerType = null;
  }

  handleNoConnectionAvailable() {
    console.log("❌ No wallet connections available");

    // Check what providers are actually available for debugging
    console.log("🔍 Provider availability check:", {
      metamask: this.primaryProvider?.available || false,
      wagmi: this.fallbackProvider?.available || false,
      ethereum: typeof window.ethereum !== "undefined",
      wagmiConfig: !!window.wagmiConfig,
    });

    this.updateWalletStatus("not-detected", "No wallet detected");
    this.showWalletActions(["downloadWallet"]);
  }

  // Contract operations (unified interface)
  async loadContractABI() {
    // Use the same ABI from the original Web3Manager
    return [
      {
        inputs: [
          { name: "_score", type: "uint256" },
          { name: "_level", type: "uint8" },
          { name: "_aliensKilled", type: "uint16" },
        ],
        name: "submitScore",
        outputs: [{ name: "success", type: "bool" }],
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
      // ... (include all other functions from the original ABI)
    ];
  }

  async initializeContracts() {
    try {
      if (
        CONFIG.CONTRACTS.GAME_SCORE &&
        CONFIG.CONTRACTS.GAME_SCORE !== "0x..."
      ) {
        console.log(
          `📄 Initializing game contract (${this.providerType}):`,
          CONFIG.CONTRACTS.GAME_SCORE
        );

        const contractABI = await this.loadContractABI();

        if (this.providerType === "metamask") {
          this.gameContract = new this.web3.eth.Contract(
            contractABI,
            CONFIG.CONTRACTS.GAME_SCORE
          );
        } else if (this.providerType === "wagmi") {
          // For Wagmi, we'll use the contract interaction methods directly
          this.gameContract = {
            abi: contractABI,
            address: CONFIG.CONTRACTS.GAME_SCORE,
            methods: this.createWagmiContractMethods(
              CONFIG.CONTRACTS.GAME_SCORE,
              contractABI
            ),
          };
        }

        console.log("✅ Game contract initialized successfully!");
      }
    } catch (error) {
      console.error("Failed to initialize contracts:", error);
    }
  }

  createWagmiContractMethods(contractAddress, abi) {
    const methods = {};

    // Create method wrappers for Wagmi
    const functionAbi = abi.filter((item) => item.type === "function");

    functionAbi.forEach((func) => {
      methods[func.name] = (...args) => {
        if (
          func.stateMutability === "view" ||
          func.stateMutability === "pure"
        ) {
          // Read method
          return {
            call: () =>
              this.fallbackProvider.manager.readContract(
                contractAddress,
                abi,
                func.name,
                args
              ),
          };
        } else {
          // Write method
          return {
            send: (options) =>
              this.fallbackProvider.manager.writeContract(
                contractAddress,
                abi,
                func.name,
                args,
                options.value
              ),
          };
        }
      };
    });

    return methods;
  }

  // Unified methods that work with both providers
  async getBalance() {
    if (!this.isConnected) return "0";

    try {
      if (this.providerType === "metamask") {
        const balance = await this.web3.eth.getBalance(this.account);
        return this.web3.utils.fromWei(balance, "ether");
      } else if (this.providerType === "wagmi") {
        return await this.fallbackProvider.manager.getBalance();
      }
    } catch (error) {
      console.error("Failed to get balance:", error);
      return "0";
    }
  }

  canPlayGame() {
    const connected = this.isConnected && this.account;
    const correctNetwork = this.isOnSomniaNetwork();

    return connected && correctNetwork;
  }

  isOnSomniaNetwork() {
    if (this.providerType === "metamask") {
      return this.networkId === CONFIG.NETWORK.chainId;
    } else if (this.providerType === "wagmi") {
      return this.networkId === 50312;
    }
    return false;
  }

  async disconnectWallet() {
    try {
      if (this.providerType === "wagmi") {
        await this.fallbackProvider.manager.disconnect();
      }

      this.resetState();
      this.updateWalletUI();

      if (this.onDisconnect) {
        this.onDisconnect();
      }

      this.showSuccess("Wallet disconnected successfully");
      console.log("🔌 Wallet disconnected by user");
    } catch (error) {
      console.error("Failed to disconnect wallet:", error);
      this.showError("Failed to disconnect wallet: " + error.message);
    }
  }

  // Get connection info for debugging
  getConnectionInfo() {
    return {
      account: this.account,
      networkId: this.networkId,
      isConnected: this.isConnected,
      providerType: this.providerType,
      availableProviders: {
        metamask: this.primaryProvider?.available || false,
        wagmi: this.fallbackProvider?.available || false,
      },
    };
  }

  // UI Methods (delegate to original implementation)
  updateWalletStatus(status, message) {
    const walletStatus = document.getElementById("walletStatus");
    const walletStatusText = document.getElementById("walletStatusText");

    if (walletStatus && walletStatusText) {
      walletStatus.classList.remove("checking", "detected", "not-detected");
      walletStatus.classList.add(status);
      walletStatusText.textContent = message;
    }
  }

  updateWalletUI() {
    console.log("🔄 Updating wallet UI...", {
      isConnected: this.isConnected,
      account: this.account,
      primaryAvailable: this.primaryProvider?.available,
      fallbackAvailable: this.fallbackProvider?.available,
    });

    if (this.isConnected && this.account) {
      this.updateWalletStatus(
        "detected",
        `✅ Wallet Connected (${this.providerType})`
      );
      this.showWalletActions(["disconnectWallet", "refreshConnection"]);
      this.showWalletInfo();
    } else {
      if (this.primaryProvider?.available || this.fallbackProvider?.available) {
        console.log("✅ Providers available, showing wallet options");
        this.updateWalletStatus("detected", "🔗 Wallet Options Available");
        this.showWalletActions(["connectWallet", "showAdvancedConnect"]);
      } else {
        console.log("❌ No providers available");
        this.updateWalletStatus("not-detected", "No wallet detected");
        this.showWalletActions(["downloadWallet"]);
      }
      this.hideWalletInfo();
    }
  }

  showWalletActions(actions) {
    const allButtons = [
      "connectWallet",
      "disconnectWallet",
      "refreshConnection",
      "downloadWallet",
      "showAdvancedConnect",
    ];

    allButtons.forEach((buttonId) => {
      const button = document.getElementById(buttonId);
      if (button) {
        button.classList.add("hidden");
      }
    });

    actions.forEach((buttonId) => {
      const button = document.getElementById(buttonId);
      if (button) {
        button.classList.remove("hidden");
      }
    });

    const downloadOptions = document.getElementById("walletDownloadOptions");
    if (downloadOptions) {
      downloadOptions.classList.add("hidden");
    }

    const advancedOptions = document.getElementById("advancedConnectOptions");
    if (advancedOptions) {
      advancedOptions.classList.add("hidden");
    }
  }

  showWalletInfo() {
    const walletInfo = document.getElementById("walletInfo");
    const walletAddress = document.getElementById("walletAddress");
    const networkName = document.getElementById("networkName");

    if (walletInfo && walletAddress && networkName) {
      walletInfo.classList.remove("hidden");
      walletAddress.textContent = UTILS.formatAddress(this.account);

      if (this.isOnSomniaNetwork()) {
        networkName.textContent = CONFIG.NETWORK.chainName;
        networkName.style.color = "#00ff00";
      } else {
        networkName.textContent = "Wrong Network";
        networkName.style.color = "#ff4444";
      }
    }
  }

  hideWalletInfo() {
    const walletInfo = document.getElementById("walletInfo");
    if (walletInfo) {
      walletInfo.classList.add("hidden");
    }
  }

  onWrongNetwork() {
    console.log("🚫 Game functionality limited due to wrong network");
  }

  onCorrectNetwork() {
    console.log("✅ Game functionality restored");
  }

  showError(message) {
    console.error("❌", message);
    if (window.gameApp && window.gameApp.showNotification) {
      window.gameApp.showNotification(message, "error", 5000);
    }
  }

  showWarning(message) {
    console.warn("⚠️", message);
    if (window.gameApp && window.gameApp.showNotification) {
      window.gameApp.showNotification(message, "warning", 4000);
    }
  }

  showSuccess(message) {
    console.log("✅", message);
    if (window.gameApp && window.gameApp.showNotification) {
      window.gameApp.showNotification(message, "success", 3000);
    }
  }

  showInstallMetaMaskPrompt() {
    this.updateWalletStatus("not-detected", "No wallet detected");
    this.showWalletActions(["downloadWallet"]);
  }

  async refreshConnection() {
    console.log("🔄 Refreshing connection...");
    await this.init();
  }

  // Enhanced network verification with better error handling and fallbacks (inherited from web3Manager)
  async verifyNetworkConnectionWithFallback(maxRetries = 5) {
    console.log("🌐 Starting enhanced network verification (Hybrid)...");

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        let chainId;

        if (
          this.providerType === "metamask" &&
          this.primaryProvider?.ethereum
        ) {
          chainId = await this.primaryProvider.ethereum.request({
            method: "eth_chainId",
          });
        } else if (
          this.providerType === "wagmi" &&
          this.fallbackProvider?.manager
        ) {
          // Use Wagmi to get chain ID
          chainId = await this.fallbackProvider.manager.getChainId();
        } else {
          return { success: false, error: "No active provider available" };
        }

        console.log(
          `📡 Retrieved chain ID (${this.providerType}): ${chainId}, expected: ${CONFIG.NETWORK.chainId}`
        );

        this.networkId = chainId;

        if (chainId === CONFIG.NETWORK.chainId) {
          return { success: true, chainId };
        } else {
          // Wrong network detected
          return {
            success: false,
            error: `Wrong network. Connected to ${chainId}, expected ${CONFIG.NETWORK.chainId}`,
            wrongNetwork: true,
            currentChainId: chainId,
            expectedChainId: CONFIG.NETWORK.chainId,
          };
        }
      } catch (error) {
        console.warn(
          `🔄 Network verification attempt ${attempt} failed (${this.providerType}):`,
          error
        );

        if (attempt === maxRetries) {
          return {
            success: false,
            error: `Network verification failed after ${maxRetries} attempts: ${error.message}`,
            finalError: error,
          };
        }

        // Progressive delay: 200ms, 400ms, 800ms, 1600ms
        const delay = Math.min(200 * Math.pow(2, attempt - 1), 1600);
        console.log(`⏳ Waiting ${delay}ms before retry...`);
        await new Promise((resolve) => setTimeout(resolve, delay));
      }
    }

    return {
      success: false,
      error: "Network verification failed - unknown error",
    };
  }

  // Schedule a delayed network retry to handle timing issues (inherited from web3Manager)
  scheduleNetworkRetry() {
    console.log("📅 Scheduling network retry in 2 seconds (Hybrid)...");
    setTimeout(async () => {
      console.log("🔄 Executing scheduled network retry (Hybrid)...");
      const networkResult = await this.verifyNetworkConnectionWithFallback();

      if (networkResult.success) {
        console.log("✅ Scheduled network retry succeeded (Hybrid)!");
        this.handleNetworkChanged(this.networkId);

        // Update UI to show successful connection
        if (this.isConnected) {
          this.updateWalletUI();
        }

        // Notify user of successful recovery
        if (window.gameApp && window.gameApp.showNotification) {
          window.gameApp.showNotification(
            "🌐 Network connection restored!",
            "success"
          );
        }
      } else {
        console.warn(
          "❌ Scheduled network retry also failed (Hybrid):",
          networkResult.error
        );

        // Only show error UI if it's actually a wrong network (not just timing)
        if (networkResult.wrongNetwork) {
          this.handleNetworkChanged(networkResult.currentChainId);
        }
      }
    }, 2000);
  }

  // Delegate other methods to original Web3Manager implementation
  // (Include saveScore, getLeaderboard, etc. with provider-specific adaptations)
}

// Make HybridWeb3Manager available globally
window.HybridWeb3Manager = HybridWeb3Manager;

// Create global instance
const hybridWeb3Manager = new HybridWeb3Manager();

// Export for use in other modules
if (typeof module !== "undefined" && module.exports) {
  module.exports = HybridWeb3Manager;
}

console.log("🔗 Hybrid Web3 Manager Loaded (MetaMask + Wagmi)");
