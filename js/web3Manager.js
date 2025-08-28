// Space Defender - Web3 Manager
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

    // Show checking status
    this.updateWalletStatus("checking", "🔍 Checking for wallet...");

    // Reset state first
    this.resetState();

    // Enhanced delay and MetaMask readiness check
    await this.waitForMetaMaskReady();

    // Check if MetaMask is installed and available
    if (typeof window.ethereum !== "undefined" && window.ethereum.isMetaMask) {
      this.web3 = new Web3(window.ethereum);
      this.setupEventListeners();
      this.setupNetworkSelection();

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
            // Enhanced network verification with extended retry and better error handling
            const networkResult =
              await this.verifyNetworkConnectionWithFallback();
            if (networkResult.success) {
              console.log("✅ Network verified and correct");
              this.handleNetworkChanged(this.networkId); // Update UI state

              // Update high score if game app is available
              if (window.gameApp && window.gameApp.updateHighScore) {
                console.log("🎯 Auto-updating high score on wallet connection");
                setTimeout(() => window.gameApp.updateHighScore(), 500);
              }
            } else {
              console.warn(
                `⚠️ Network verification failed: ${networkResult.error}`
              );
              // Don't immediately show error - schedule a retry
              this.scheduleNetworkRetry();
            }
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
      console.log("No Web3 wallet detected");
      this.handleNoWalletDetected();
    }
  }

  resetState() {
    this.account = null;
    this.networkId = null;
    this.gameContract = null;
    this.leaderboardContract = null;
    this.isConnected = false;
  }

  // Enhanced MetaMask readiness check
  async waitForMetaMaskReady(maxWait = 3000) {
    console.log("⏳ Waiting for MetaMask to be ready...");
    const startTime = Date.now();

    while (Date.now() - startTime < maxWait) {
      try {
        // Check if MetaMask is present and responsive
        if (
          typeof window.ethereum !== "undefined" &&
          window.ethereum.isMetaMask
        ) {
          // Try a simple request to see if MetaMask is responsive
          await window.ethereum
            .request({
              method: "eth_requestAccounts",
              params: [],
            })
            .catch(() => {
              // This will fail if not connected, but that's OK - we just want to test responsiveness
            });

          console.log("✅ MetaMask is ready and responsive");
          return true;
        }
      } catch (error) {
        // MetaMask not ready yet, continue waiting
      }

      // Wait 100ms before next check
      await new Promise((resolve) => setTimeout(resolve, 100));
    }

    console.log("⏰ MetaMask readiness check timed out, proceeding anyway");
    return false;
  }

  // Enhanced network verification with better error handling and fallbacks
  async verifyNetworkConnectionWithFallback(maxRetries = 5) {
    console.log("🌐 Starting enhanced network verification...");

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        if (!window.ethereum) {
          return { success: false, error: "No Ethereum provider found" };
        }

        console.log(`🔍 Network verification attempt ${attempt}/${maxRetries}`);

        // Try to get the current chain ID
        const chainId = await window.ethereum.request({
          method: "eth_chainId",
        });

        console.log(`📡 Retrieved chain ID: ${chainId}`);

        this.networkId = chainId;

        // Check if current network is supported
        if (NETWORK_UTILS.isSupportedNetwork(chainId)) {
          const networkName = NETWORK_UTILS.getNetworkName(chainId);
          console.log(`✅ Connected to supported network: ${networkName}`);
          return { success: true, chainId, networkName };
        } else {
          // Unsupported network detected
          const supportedNetworks = NETWORK_UTILS.getSupportedChainIds();
          return {
            success: false,
            error: `Unsupported network. Connected to ${chainId}, supported networks: ${supportedNetworks.join(", ")}`,
            wrongNetwork: true,
            currentChainId: chainId,
            supportedChainIds: supportedNetworks,
          };
        }
      } catch (error) {
        console.warn(
          `🔄 Network verification attempt ${attempt} failed:`,
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

  // Schedule a delayed network retry to handle timing issues
  scheduleNetworkRetry() {
    console.log("📅 Scheduling network retry in 2 seconds...");
    setTimeout(async () => {
      console.log("🔄 Executing scheduled network retry...");
      const networkResult = await this.verifyNetworkConnectionWithFallback();

      if (networkResult.success) {
        console.log("✅ Scheduled network retry succeeded!");
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
          "❌ Scheduled network retry also failed:",
          networkResult.error
        );

        // Only show error UI if it's actually a wrong network (not just timing)
        if (networkResult.wrongNetwork) {
          this.handleNetworkChanged(networkResult.currentChainId);
        }
      }
    }, 2000);
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

  setupNetworkSelection() {
    // Network selection buttons (initial connection screen)
    const selectRiseNetwork = document.getElementById("selectRiseNetwork");
    const selectSomniaNetwork = document.getElementById("selectSomniaNetwork");

    if (selectRiseNetwork) {
      selectRiseNetwork.addEventListener("click", () => {
        this.switchToSupportedNetwork("0xaa39db"); // RISE Testnet
      });
    }

    if (selectSomniaNetwork) {
      selectSomniaNetwork.addEventListener("click", () => {
        this.switchToSupportedNetwork("0xc488"); // Somnia Testnet
      });
    }

    // Game menu network switcher
    this.setupGameNetworkSwitcher();

    // Show network selection when appropriate
    this.updateNetworkSelectionVisibility();
  }

  setupGameNetworkSwitcher() {
    const networkSwitcherToggle = document.getElementById(
      "networkSwitcherToggle"
    );
    const networkDropdown = document.getElementById("networkDropdown");
    const currentNetworkDisplay = document.querySelector(
      ".current-network-display"
    );

    // Toggle dropdown
    if (networkSwitcherToggle && currentNetworkDisplay) {
      const toggleDropdown = () => {
        networkDropdown.classList.toggle("hidden");
      };

      networkSwitcherToggle.addEventListener("click", (e) => {
        e.stopPropagation();
        toggleDropdown();
      });

      currentNetworkDisplay.addEventListener("click", (e) => {
        e.stopPropagation();
        toggleDropdown();
      });

      // Close dropdown when clicking outside
      document.addEventListener("click", (e) => {
        if (
          !networkDropdown.classList.contains("hidden") &&
          !e.target.closest(".network-switcher")
        ) {
          networkDropdown.classList.add("hidden");
        }
      });
    }

    // Network option clicks
    const networkOptions = document.querySelectorAll(".network-option");
    networkOptions.forEach((option) => {
      option.addEventListener("click", (e) => {
        e.stopPropagation();
        const chainId = option.getAttribute("data-chain-id");
        if (chainId && chainId !== this.networkId) {
          this.switchToSupportedNetwork(chainId);
        }
        networkDropdown.classList.add("hidden");
      });
    });

    // Update the display initially
    this.updateGameNetworkDisplay();
  }

  updateNetworkSelectionVisibility() {
    const networkSelection = document.getElementById("networkSelection");
    if (!networkSelection) return;

    // Show network selection if:
    // 1. Wallet is connected but on unsupported network, OR
    // 2. No wallet connected yet (as an option)
    const shouldShow =
      (this.isConnected && !NETWORK_UTILS.isSupportedNetwork(this.networkId)) ||
      !this.isConnected;

    if (shouldShow) {
      networkSelection.classList.remove("hidden");
    } else {
      networkSelection.classList.add("hidden");
    }
  }

  updateGameNetworkDisplay() {
    const currentNetworkText = document.getElementById("currentNetworkText");
    const networkDot = document.querySelector(".network-dot");
    const networkOptions = document.querySelectorAll(".network-option");

    if (!currentNetworkText || !networkDot) return;

    // Update current network display
    if (this.isConnected && this.networkId) {
      const networkInfo = NETWORK_UTILS.getNetworkInfo(this.networkId);

      if (networkInfo) {
        // Supported network
        currentNetworkText.textContent = networkInfo.chainName;
        networkDot.className = "network-dot";
        networkDot.style.background = "#90ff90";
      } else {
        // Unsupported network
        currentNetworkText.textContent = "Unsupported Network";
        networkDot.className = "network-dot unsupported";
        networkDot.style.background = "#ffa500";
      }
    } else {
      // Not connected
      currentNetworkText.textContent = "Not Connected";
      networkDot.className = "network-dot disconnected";
      networkDot.style.background = "#ff6b6b";
    }

    // Update active state in dropdown
    networkOptions.forEach((option) => {
      const chainId = option.getAttribute("data-chain-id");
      if (chainId === this.networkId) {
        option.classList.add("active");
      } else {
        option.classList.remove("active");
      }
    });
  }

  updateDynamicNetworkResources() {
    const dynamicNetworkResources = document.getElementById(
      "dynamicNetworkResources"
    );
    const networkResourcesTitle = document.getElementById(
      "networkResourcesTitle"
    );
    const networkResourcesContent = document.getElementById(
      "networkResourcesContent"
    );

    // Only show in network selection screen, not in game menu
    const networkSelection = document.getElementById("networkSelection");
    const isNetworkSelectionVisible =
      networkSelection && !networkSelection.classList.contains("hidden");

    if (
      !dynamicNetworkResources ||
      !networkResourcesTitle ||
      !networkResourcesContent ||
      !isNetworkSelectionVisible
    ) {
      if (dynamicNetworkResources) {
        dynamicNetworkResources.classList.add("hidden");
      }
      return;
    }

    // Define network-specific resources
    const networkResources = {
      "0xaa39db": {
        // RISE Testnet
        name: "RISE Testnet",
        icon: "🚀",
        resources: [
          {
            icon: "🚰",
            label: "Get Test ETH",
            subtitle: "RISE Faucet",
            url: "https://faucet.risechain.com/",
          },
          {
            icon: "🔍",
            label: "Block Explorer",
            subtitle: "View Transactions",
            url: "https://explorer.testnet.riselabs.xyz",
          },
          {
            icon: "📚",
            label: "Documentation",
            subtitle: "Learn More",
            url: "https://docs.riselabs.xyz",
          },
          {
            icon: "💬",
            label: "Discord",
            subtitle: "Community",
            url: "https://discord.gg/rise",
          },
        ],
      },
      "0xc488": {
        // Somnia Testnet
        name: "Somnia Testnet",
        icon: "💫",
        resources: [
          {
            icon: "🚰",
            label: "Get Test STT",
            subtitle: "Official Faucet",
            url: "https://testnet.somnia.network",
          },
          {
            icon: "⛽",
            label: "Gas.zip Faucet",
            subtitle: "Alternative",
            url: "https://www.gas.zip/faucet/somnia",
          },
          {
            icon: "🔍",
            label: "Block Explorer",
            subtitle: "Shannon Explorer",
            url: "https://shannon-explorer.somnia.network",
          },
          {
            icon: "🔄",
            label: "Trade SD Tokens",
            subtitle: "Euclid Swap",
            url: "https://testnet.euclidswap.io/swap",
          },
        ],
      },
    };

    // Show/hide and populate resources based on current network
    if (
      this.isConnected &&
      this.networkId &&
      networkResources[this.networkId]
    ) {
      const currentNetwork = networkResources[this.networkId];

      // Update title with current network
      networkResourcesTitle.innerHTML = `${currentNetwork.icon} ${currentNetwork.name} Resources`;

      // Clear and populate resources
      networkResourcesContent.innerHTML = "";

      currentNetwork.resources.forEach((resource) => {
        const resourceItem = document.createElement("a");
        resourceItem.href = resource.url;
        resourceItem.target = "_blank";
        resourceItem.className = "network-resource-item";

        resourceItem.innerHTML = `
          <div class="network-resource-icon">${resource.icon}</div>
          <div class="network-resource-label">
            ${resource.label}
            <div class="network-resource-subtitle">${resource.subtitle}</div>
          </div>
        `;

        networkResourcesContent.appendChild(resourceItem);
      });

      dynamicNetworkResources.classList.remove("hidden");
    } else if (this.isConnected && this.networkId) {
      // Connected but unsupported network
      networkResourcesTitle.innerHTML = "⚠️ Unsupported Network";
      networkResourcesContent.innerHTML = `
        <div style="text-align: center; color: #ffa500; padding: 20px;">
          <p>Switch to RISE or Somnia testnet to see network resources</p>
        </div>
      `;
      dynamicNetworkResources.classList.remove("hidden");
    } else {
      // Not connected
      dynamicNetworkResources.classList.add("hidden");
    }
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
        await this.checkCurrentNetwork();
        return true;
      }
    } catch (error) {
      console.error("Failed to connect wallet:", error);
      this.showError("Failed to connect wallet: " + error.message);
      return false;
    }
    return false;
  }

  async checkCurrentNetwork() {
    try {
      const currentChainId = await window.ethereum.request({
        method: "eth_chainId",
      });

      if (!NETWORK_UTILS.isSupportedNetwork(currentChainId)) {
        console.log(
          "🔄 Current network not supported, offering to switch to RISE..."
        );
        await this.switchToSupportedNetwork("0xaa39db"); // Default to RISE
      } else {
        console.log(
          `✅ Current network is supported: ${NETWORK_UTILS.getNetworkName(currentChainId)}`
        );
      }
    } catch (error) {
      console.error("Failed to check current network:", error);
    }
  }

  async switchToSupportedNetwork(targetChainId) {
    const networkInfo = NETWORK_UTILS.getNetworkInfo(targetChainId);
    if (!networkInfo) {
      console.error("Invalid target network:", targetChainId);
      return;
    }

    // Show loading feedback
    this.showInfo(`🔄 Switching to ${networkInfo.chainName}...`);

    try {
      // Try to switch to target network
      await window.ethereum.request({
        method: "wallet_switchEthereumChain",
        params: [{ chainId: targetChainId }],
      });

      this.showSuccess(`✅ Successfully switched to ${networkInfo.chainName}!`);
    } catch (switchError) {
      // If network doesn't exist, add it
      // Error codes that indicate chain needs to be added:
      // 4902: Chain not added to wallet
      // -32603: Internal error (often means chain not recognized)
      if (
        switchError.code === 4902 ||
        switchError.code === -32603 ||
        (switchError.message &&
          switchError.message.includes("Unrecognized chain ID"))
      ) {
        try {
          this.showInfo(`🔧 Adding ${networkInfo.chainName} to your wallet...`);

          await window.ethereum.request({
            method: "wallet_addEthereumChain",
            params: [
              {
                chainId: networkInfo.chainId,
                chainName: networkInfo.chainName,
                rpcUrls: networkInfo.rpcUrls,
                nativeCurrency: networkInfo.nativeCurrency,
                blockExplorerUrls: networkInfo.blockExplorerUrls,
              },
            ],
          });

          this.showSuccess(
            `✅ Successfully added and switched to ${networkInfo.chainName}!`
          );
        } catch (addError) {
          console.error(`Failed to add ${networkInfo.chainName}:`, addError);
          this.showError(
            `❌ Failed to add ${networkInfo.chainName}. Please add it manually in your wallet settings.`
          );
        }
      } else if (switchError.code === 4001) {
        // User rejected the request
        this.showWarning(
          `⚠️ Network switch cancelled. Please switch to ${networkInfo.chainName} to continue.`
        );
      } else {
        console.error(
          `Failed to switch to ${networkInfo.chainName}:`,
          switchError
        );
        this.showError(
          `❌ Please switch to ${networkInfo.chainName} manually in your wallet.`
        );
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
      this.updateNetworkSelectionVisibility();
      this.updateGameNetworkDisplay();

      // Only update dynamic resources if in network selection screen
      this.updateDynamicNetworkResources();

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
    this.updateNetworkSelectionVisibility();
    this.updateGameNetworkDisplay();

    // Only update dynamic resources if in network selection screen
    this.updateDynamicNetworkResources();

    if (!NETWORK_UTILS.isSupportedNetwork(chainId)) {
      const supportedNetworks = NETWORK_UTILS.getSupportedChainIds()
        .map((id) => NETWORK_UTILS.getNetworkName(id))
        .join(", ");

      console.warn(
        "⚠️ Unsupported network detected:",
        chainId,
        "Supported:",
        supportedNetworks
      );
      this.showWarning(
        `Please switch to a supported network: ${supportedNetworks}`
      );

      // Disable game functionality on unsupported network
      this.onWrongNetwork();
    } else {
      const networkName = NETWORK_UTILS.getNetworkName(chainId);
      console.log("✅ Connected to supported network:", networkName);
      this.onCorrectNetwork();

      // If we're now on a supported network and have an account, enable game functionality
      if (this.account && window.gameApp) {
        console.log("🎮 Network is supported, updating game UI");
        // Small delay to let UI update
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
    this.updateNetworkSelectionVisibility();
    this.updateGameNetworkDisplay();

    // Hide dynamic resources when disconnected
    this.updateDynamicNetworkResources();

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
    const connected = this.isConnected && this.account;
    const supportedNetwork = NETWORK_UTILS.isSupportedNetwork(this.networkId);

    console.log("🎮 canPlayGame check:", {
      isConnected: this.isConnected,
      hasAccount: !!this.account,
      networkId: this.networkId,
      networkName: NETWORK_UTILS.getNetworkName(this.networkId),
      connected,
      supportedNetwork,
    });

    return connected && supportedNetwork;
  }

  // Enhanced network check with retry
  async verifyNetworkConnection(retries = 3) {
    for (let i = 0; i < retries; i++) {
      try {
        if (window.ethereum) {
          const chainId = await window.ethereum.request({
            method: "eth_chainId",
          });
          console.log(`🌐 Network verification attempt ${i + 1}: ${chainId}`);
          this.networkId = chainId;
          return NETWORK_UTILS.isSupportedNetwork(chainId);
        }
      } catch (error) {
        console.warn(`Network check attempt ${i + 1} failed:`, error);
        if (i < retries - 1) {
          await new Promise((resolve) => setTimeout(resolve, 500)); // Wait 500ms before retry
        }
      }
    }
    return false;
  }

  async loadContractABI() {
    // Complete ABI with all functions needed for the game
    return [
      // Core game functions - New submitScore for direct blockchain submission
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
      // SD Shop functions
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
      // SD stats function
      {
        inputs: [{ name: "_player", type: "address" }],
        name: "getPlayerSDStats",
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
        name: "withdrawSD",
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
        name: "updateSDToken",
        outputs: [],
        stateMutability: "nonpayable",
        type: "function",
      },
    ];
  }

  async initializeContracts() {
    try {
      // Get contracts for current network
      const currentContracts = NETWORK_UTILS.getCurrentContracts(
        this.networkId
      );
      const networkName = NETWORK_UTILS.getNetworkName(this.networkId);

      console.log(`📄 Initializing contracts for ${networkName}...`);

      // Initialize game contract if available
      if (currentContracts.GAME_SCORE && currentContracts.GAME_SCORE !== "") {
        console.log(
          "📄 Initializing game contract:",
          currentContracts.GAME_SCORE
        );

        // Load the complete ABI from artifacts
        const contractABI = await this.loadContractABI();

        // Initialize the contract instance with complete ABI
        this.gameContract = new this.web3.eth.Contract(
          contractABI,
          currentContracts.GAME_SCORE
        );

        console.log("✅ Game contract initialized successfully!");
      } else {
        console.warn(`⚠️ No game contract deployed on ${networkName}`);
        this.gameContract = null;
      }

      console.log(
        `📄 Contracts ready for ${networkName} blockchain interaction!`
      );
    } catch (error) {
      console.error("Failed to initialize contracts:", error);
    }
  }

  async saveScore(
    score,
    level,
    aliensKilled = 0,
    gameMode = "normal",
    gameSession = null,
    playTime = 0,
    powerUpsCollected = 0,
    accuracy = 0
  ) {
    try {
      // Generate session if not provided
      if (!gameSession) {
        gameSession = {
          startTime: Date.now(),
          startLevel: level,
          sessionId: apiService.generateGameSession(),
          events: [],
        };
      }

      let blockchainTxHash = null;
      let ssdReward = 0;

      // Step 1: Submit to blockchain first (if connected and has aliens killed)
      if (this.isConnected && this.gameContract && aliensKilled > 0) {
        console.log("🔗 Submitting score to blockchain...", {
          score,
          level,
          aliensKilled,
          account: this.account,
        });

        try {
          const tx = await this.gameContract.methods
            .submitScore(score, level, aliensKilled)
            .send({
              from: this.account,
              gas: 1400000, // Increased gas limit for score submission
            });

          blockchainTxHash = tx.transactionHash;
          ssdReward = aliensKilled * 0.01; // 0.01 SD per alien

          console.log("✅ Blockchain submission successful!", {
            txHash: blockchainTxHash,
            ssdReward,
          });

          // Update local high score immediately after blockchain success
          this.saveScoreLocally(score, level);

          // Show SD reward notification immediately
          this.showSDRewardNotification(ssdReward, aliensKilled);
        } catch (blockchainError) {
          console.error("❌ Blockchain submission failed:", blockchainError);
          throw new Error(
            `Blockchain submission failed: ${blockchainError.message}`
          );
        }
      } else {
        // Save locally if not connected to blockchain or no aliens killed
        console.log(
          "💾 Saving locally (no blockchain connection or no aliens killed)"
        );
        this.saveScoreLocally(score, level);
      }

      // Step 2: Submit to backend (for analytics, leaderboards, achievements)
      console.log("🔗 Submitting score to backend...", {
        score,
        level,
        aliensKilled,
        gameMode,
        playTime,
        txHash: blockchainTxHash,
      });

      const submitData = {
        score,
        level,
        aliensKilled,
        gameMode,
        gameSession,
        playTime,
        powerUpsCollected,
        accuracy,
        playerAddress:
          this.account || "0x0000000000000000000000000000000000000000",
        blockchainTxHash, // Include blockchain transaction hash
        ssdAlreadyRewarded: ssdReward > 0, // Tell backend SD was already rewarded
      };

      const result = await apiService.submitScore(submitData);

      if (result.success) {
        console.log("✅ Backend submission successful!", {
          scoreId: result.scoreId,
          blockchainTxHash,
          ssdReward,
          newAchievements: result.newAchievements,
        });

        // Show achievement notifications
        if (result.newAchievements && result.newAchievements.length > 0) {
          this.showAchievementNotifications(result.newAchievements);
        }

        this.showSuccess("Score saved successfully!");
        return {
          success: true,
          blockchainTxHash,
          ssdReward,
          ...result,
        };
      } else {
        throw new Error(result.error || "Failed to submit score");
      }
    } catch (error) {
      console.error("Score submission failed:", error);

      // Save locally as fallback if blockchain/backend failed
      this.saveScoreLocally(score, level);

      // Show user-friendly error message
      if (error.message.includes("validation failed")) {
        this.showError(`Score validation failed: ${error.message}`);
      } else if (error.message.includes("Submission cooldown")) {
        this.showWarning("Please wait before submitting another score");
      } else if (error.message.includes("timeout")) {
        this.showWarning("Score submission timed out, but saved locally");
      } else {
        this.showWarning("Failed to submit score, saved locally instead");
      }

      return {
        success: false,
        error: error.message,
      };
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

  // Get high score from backend (more reliable)
  async getHighScoreFromBackend() {
    try {
      if (!this.account) {
        console.log("🎯 No account connected, returning 0 for high score");
        return 0;
      }

      console.log("🎯 Fetching high score for account:", this.account);
      const playerStats = await apiService.getPlayerStats(this.account);
      const highScore = playerStats.stats?.highScore || 0;
      console.log("🎯 High score from backend:", highScore);
      return highScore;
    } catch (error) {
      console.warn(
        "Failed to get high score from backend, using local:",
        error
      );
      return this.getHighScore();
    }
  }

  updateWalletUI() {
    if (this.isConnected && this.account) {
      this.updateWalletStatus("detected", "✅ Wallet Connected");
      this.showWalletActions(["disconnectWallet", "refreshConnection"]);
      this.showWalletInfo();
    } else {
      // Check if wallet is available
      if (typeof window.ethereum !== "undefined") {
        this.updateWalletStatus("detected", "🦊 Wallet Detected");
        this.showWalletActions(["connectWallet"]);
      } else {
        this.updateWalletStatus("not-detected", "No wallet detected");
        this.showWalletActions(["downloadWallet"]);
      }
      this.hideWalletInfo();
    }
  }

  updateWalletStatus(status, message) {
    const walletStatus = document.getElementById("walletStatus");
    const walletStatusText = document.getElementById("walletStatusText");

    if (walletStatus && walletStatusText) {
      // Remove all status classes
      walletStatus.classList.remove("checking", "detected", "not-detected");

      // Add current status class
      walletStatus.classList.add(status);

      // Update message
      walletStatusText.textContent = message;
    }
  }

  showWalletActions(actions) {
    // Hide all buttons first
    const allButtons = [
      "connectWallet",
      "disconnectWallet",
      "refreshConnection",
      "downloadWallet",
    ];

    allButtons.forEach((buttonId) => {
      const button = document.getElementById(buttonId);
      if (button) {
        button.classList.add("hidden");
      }
    });

    // Show only requested buttons
    actions.forEach((buttonId) => {
      const button = document.getElementById(buttonId);
      if (button) {
        button.classList.remove("hidden");
      }
    });

    // Hide download options by default
    const downloadOptions = document.getElementById("walletDownloadOptions");
    if (downloadOptions) {
      downloadOptions.classList.add("hidden");
    }
  }

  showWalletInfo() {
    const walletInfo = document.getElementById("walletInfo");
    const walletAddress = document.getElementById("walletAddress");
    const networkName = document.getElementById("networkName");

    if (walletInfo && walletAddress && networkName) {
      walletInfo.classList.remove("hidden");
      walletAddress.textContent = UTILS.formatAddress(this.account);

      // Update network name
      if (NETWORK_UTILS.isSupportedNetwork(this.networkId)) {
        networkName.textContent = NETWORK_UTILS.getNetworkName(this.networkId);
        networkName.style.color = "#00ff00";
      } else {
        networkName.textContent = "Unsupported Network";
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

  handleNoWalletDetected() {
    this.isConnected = false;
    this.updateWalletStatus("not-detected", "No wallet detected");
    this.showWalletActions(["downloadWallet"]);
  }

  showError(message) {
    console.error("❌", message);
    // Show user-friendly notification instead of alert
    if (window.gameApp && window.gameApp.showNotification) {
      window.gameApp.showNotification(message, "error", 5000);
    } else {
      console.error("Error:", message);
    }
  }

  showWarning(message) {
    console.warn("⚠️", message);
    // Show user-friendly notification for warnings
    if (window.gameApp && window.gameApp.showNotification) {
      window.gameApp.showNotification(message, "warning", 4000);
    }
  }

  showSuccess(message) {
    console.log("✅", message);
    // Show user-friendly notification instead of console only
    if (window.gameApp && window.gameApp.showNotification) {
      window.gameApp.showNotification(message, "success", 3000);
    }
  }

  showInfo(message) {
    console.log("ℹ️", message);
    // Show user-friendly notification for info messages
    if (window.gameApp && window.gameApp.showNotification) {
      window.gameApp.showNotification(message, "info", 3000);
    }
  }

  // Wallet download handling
  showWalletDownloadOptions() {
    const downloadOptions = document.getElementById("walletDownloadOptions");
    const walletActions = document.getElementById("walletActions");

    if (downloadOptions && walletActions) {
      walletActions.classList.add("hidden");
      downloadOptions.classList.remove("hidden");
    }
  }

  hideWalletDownloadOptions() {
    const downloadOptions = document.getElementById("walletDownloadOptions");
    const walletActions = document.getElementById("walletActions");

    if (downloadOptions && walletActions) {
      downloadOptions.classList.add("hidden");
      walletActions.classList.remove("hidden");
    }
  }

  redirectToWalletDownload(walletType) {
    const walletUrls = {
      metamask: "https://metamask.io/download/",
      coinbase: "https://wallet.coinbase.com/",
      walletconnect: "https://explorer.walletconnect.com/?type=wallet",
    };

    const url = walletUrls[walletType];
    if (url) {
      console.log(`🔗 Redirecting to ${walletType} download page`);
      window.open(url, "_blank");

      // Show helpful message
      this.showSuccess(
        `Opening ${walletType} download page. Please install and refresh this page.`
      );
    }
  }

  // Disconnect wallet
  async disconnectWallet() {
    try {
      // Reset our state
      this.resetState();

      // Update UI
      this.updateWalletUI();

      // Call disconnect callback
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
      return 1400000; // Default gas limit
    }
  }

  isOnSupportedNetwork() {
    return NETWORK_UTILS.isSupportedNetwork(this.networkId);
  }

  getCurrentNetworkName() {
    return NETWORK_UTILS.getNetworkName(this.networkId);
  }

  // 🎉 SD REWARD NOTIFICATION SYSTEM

  showSDRewardNotification(ssdAmount, aliensKilled = 0, source = "Gameplay") {
    if (window.gameApp && window.gameApp.showSDReward) {
      window.gameApp.showSDReward(ssdAmount, aliensKilled, source);
    } else {
      // Fallback notification
      console.log(`🎉 SD REWARD: +${ssdAmount} SD from ${source}!`);
    }

    // Also trigger balance refresh
    this.triggerBalanceUpdate();
  }

  showAchievementNotifications(achievements) {
    if (window.gameApp && window.gameApp.showAchievements) {
      window.gameApp.showAchievements(achievements);
    } else {
      // Fallback notification
      achievements.forEach((achievement) => {
        console.log(
          `🏆 ACHIEVEMENT UNLOCKED: ${achievement.name} - ${achievement.description}`
        );
      });
    }
  }

  triggerBalanceUpdate() {
    if (window.gameApp && window.gameApp.refreshSDBalances) {
      setTimeout(() => {
        window.gameApp.refreshSDBalances();
      }, 1000); // Delay to allow blockchain confirmation
    }
  }

  // Check if player has an active boost from SD shop
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

  // 🛍️ SD SHOP FUNCTIONALITY

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
        `💰 Item price: ${this.web3.utils.fromWei(itemPrice, "ether")} SD`
      );

      // Step 1: Approve SD token spending
      console.log("📝 Approving SD token spending...");
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
        NETWORK_UTILS.getCurrentContracts(this.networkId).SD_TOKEN
      );

      const approveTx = await ssdContract.methods
        .approve(
          NETWORK_UTILS.getCurrentContracts(this.networkId).GAME_SCORE,
          itemPrice
        )
        .send({ from: this.account, gas: 1200000 });

      console.log("✅ SD approval successful:", approveTx.transactionHash);

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
      const twitterReward = parseFloat(CONFIG.SD.TWITTER_REWARD);
      this.showSDRewardNotification(twitterReward, 0, "Twitter Verification");

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

  // 💰 SD STATS FUNCTIONALITY

  async getSDStats() {
    if (!this.gameContract || !this.account) {
      return { earned: "0", spent: "0", balance: "0" };
    }

    try {
      const stats = await this.gameContract.methods
        .getPlayerSDStats(this.account)
        .call();
      return {
        earned: this.web3.utils.fromWei(stats.earned, "ether"),
        spent: this.web3.utils.fromWei(stats.spent, "ether"),
        balance: this.web3.utils.fromWei(stats.balance, "ether"),
      };
    } catch (error) {
      console.error("Failed to get SD stats:", error);
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

  async getContractSDBalance() {
    if (!this.gameContract) {
      throw new Error("Game contract not initialized");
    }

    try {
      // Get SD token contract
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
        NETWORK_UTILS.getCurrentContracts(this.networkId).SD_TOKEN
      );

      const balance = await ssdContract.methods
        .balanceOf(NETWORK_UTILS.getCurrentContracts(this.networkId).GAME_SCORE)
        .call();
      return this.web3.utils.fromWei(balance, "ether");
    } catch (error) {
      console.error("Failed to get contract SD balance:", error);
      return "0";
    }
  }

  async fundContract(amount) {
    if (!this.account) {
      throw new Error("Wallet not connected");
    }

    try {
      console.log(`💰 Funding contract with ${amount} SD tokens...`);

      // Get SD token contract
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
        NETWORK_UTILS.getCurrentContracts(this.networkId).SD_TOKEN
      );

      const amountWei = this.web3.utils.toWei(amount.toString(), "ether");

      const tx = await ssdContract.methods
        .transfer(
          NETWORK_UTILS.getCurrentContracts(this.networkId).GAME_SCORE,
          amountWei
        )
        .send({ from: this.account, gas: 1400000 });

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
      console.log(`💸 Withdrawing ${amount} SD from contract...`);

      const amountWei = this.web3.utils.toWei(amount.toString(), "ether");

      const tx = await this.gameContract.methods
        .withdrawSD(amountWei)
        .send({ from: this.account, gas: 1200000 });

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
