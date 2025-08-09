// Somnia Space Defender - Wagmi Connection Manager
class WagmiManager {
  constructor() {
    this.config = null;
    this.account = null;
    this.chainId = null;
    this.isConnected = false;
    this.connector = null;

    // Event handlers
    this.onConnect = null;
    this.onDisconnect = null;
    this.onAccountChanged = null;
    this.onChainChanged = null;

    this.init();
  }

  async init() {
    console.log("🎯 Initializing Wagmi Manager...");

    // Wait for Wagmi config to be available
    await this.waitForWagmiConfig();

    if (this.config) {
      console.log("✅ Wagmi config loaded successfully");
      await this.checkExistingConnection();
    } else {
      console.warn("❌ Failed to load Wagmi config");
    }
  }

  async waitForWagmiConfig(maxAttempts = 10) {
    for (let i = 0; i < maxAttempts; i++) {
      if (window.wagmiConfig) {
        this.config = window.wagmiConfig;
        return true;
      }
      await new Promise((resolve) => setTimeout(resolve, 100));
    }
    return false;
  }

  async checkExistingConnection() {
    try {
      // Import Wagmi functions dynamically
      const { getAccount, getChainId } = await import(
        "https://esm.sh/@wagmi/core@2.x"
      );

      const account = getAccount(this.config);
      const chainId = getChainId(this.config);

      if (account.isConnected) {
        this.account = account.address;
        this.chainId = chainId;
        this.isConnected = true;
        this.connector = account.connector;

        console.log("✅ Wagmi: Existing connection found", {
          address: this.account,
          chainId: this.chainId,
          connector: this.connector?.name,
        });

        this.setupEventListeners();

        if (this.onConnect) {
          this.onConnect(this.account);
        }
      }
    } catch (error) {
      console.warn("Wagmi: Failed to check existing connection:", error);
    }
  }

  setupEventListeners() {
    if (!this.config) return;

    try {
      // Import watchAccount and watchNetwork
      import("https://esm.sh/@wagmi/core@2.x").then(
        ({ watchAccount, watchNetwork }) => {
          // Watch for account changes
          watchAccount(this.config, {
            onChange: (account) => {
              console.log("🎯 Wagmi: Account changed", account);

              if (account.isConnected) {
                this.account = account.address;
                this.isConnected = true;
                this.connector = account.connector;

                if (this.onAccountChanged) {
                  this.onAccountChanged(account.address);
                }
              } else {
                this.handleDisconnect();
              }
            },
          });

          // Watch for chain changes
          watchNetwork(this.config, {
            onChange: (network) => {
              console.log("🎯 Wagmi: Chain changed", network);
              this.chainId = network.chain?.id;

              if (this.onChainChanged) {
                this.onChainChanged(this.chainId);
              }
            },
          });
        }
      );
    } catch (error) {
      console.warn("Failed to setup Wagmi event listeners:", error);
    }
  }

  async getAvailableConnectors() {
    try {
      const { getConnectors } = await import("https://esm.sh/@wagmi/core@2.x");
      return getConnectors(this.config);
    } catch (error) {
      console.error("Failed to get available connectors:", error);
      return [];
    }
  }

  async connectWithConnector(connectorId) {
    try {
      const { connect, getConnectors } = await import(
        "https://esm.sh/@wagmi/core@2.x"
      );

      const connectors = getConnectors(this.config);
      const connector = connectors.find(
        (c) =>
          c.id === connectorId ||
          c.name.toLowerCase().includes(connectorId.toLowerCase())
      );

      if (!connector) {
        throw new Error(`Connector ${connectorId} not found`);
      }

      console.log(`🎯 Connecting with ${connector.name}...`);

      const result = await connect(this.config, { connector });

      this.account = result.accounts[0];
      this.chainId = result.chainId;
      this.isConnected = true;
      this.connector = connector;

      console.log("✅ Wagmi: Connected successfully", {
        address: this.account,
        chainId: this.chainId,
        connector: connector.name,
      });

      // Setup listeners after connection
      this.setupEventListeners();

      // Ensure we're on the right network
      await this.ensureSomniaNetwork();

      if (this.onConnect) {
        this.onConnect(this.account);
      }

      return true;
    } catch (error) {
      console.error("Wagmi: Failed to connect:", error);
      throw error;
    }
  }

  async connectWithMetaMask() {
    return this.connectWithConnector("metaMask");
  }

  async connectWithWalletConnect() {
    return this.connectWithConnector("walletConnect");
  }

  async connectWithCoinbase() {
    return this.connectWithConnector("coinbaseWallet");
  }

  async connectWithInjected() {
    return this.connectWithConnector("injected");
  }

  async ensureSomniaNetwork() {
    try {
      const { switchChain, addChain } = await import(
        "https://esm.sh/@wagmi/core@2.x"
      );

      const targetChainId = 50312; // Somnia testnet

      if (this.chainId !== targetChainId) {
        console.log("🌐 Wagmi: Switching to Somnia network...");

        try {
          await switchChain(this.config, { chainId: targetChainId });
        } catch (switchError) {
          // If network doesn't exist, add it
          if (switchError.code === 4902) {
            console.log("🌐 Wagmi: Adding Somnia network...");

            if (window.somniaChain) {
              await addChain(this.config, { chain: window.somniaChain });
            } else {
              throw new Error("Somnia chain configuration not available");
            }
          } else {
            throw switchError;
          }
        }
      }
    } catch (error) {
      console.error("Wagmi: Failed to ensure Somnia network:", error);
      throw error;
    }
  }

  async disconnect() {
    try {
      const { disconnect } = await import("https://esm.sh/@wagmi/core@2.x");

      await disconnect(this.config);
      this.handleDisconnect();

      console.log("🔌 Wagmi: Disconnected successfully");
      return true;
    } catch (error) {
      console.error("Wagmi: Failed to disconnect:", error);
      this.handleDisconnect(); // Force local disconnect
      return false;
    }
  }

  handleDisconnect() {
    this.account = null;
    this.chainId = null;
    this.isConnected = false;
    this.connector = null;

    if (this.onDisconnect) {
      this.onDisconnect();
    }
  }

  async getBalance() {
    if (!this.account || !this.isConnected) return "0";

    try {
      const { getBalance } = await import("https://esm.sh/@wagmi/core@2.x");

      const balance = await getBalance(this.config, {
        address: this.account,
      });

      return balance.formatted;
    } catch (error) {
      console.error("Wagmi: Failed to get balance:", error);
      return "0";
    }
  }

  async readContract(contractAddress, abi, functionName, args = []) {
    try {
      const { readContract } = await import("https://esm.sh/@wagmi/core@2.x");

      return await readContract(this.config, {
        address: contractAddress,
        abi: abi,
        functionName: functionName,
        args: args,
      });
    } catch (error) {
      console.error("Wagmi: Failed to read contract:", error);
      throw error;
    }
  }

  async writeContract(
    contractAddress,
    abi,
    functionName,
    args = [],
    value = null
  ) {
    if (!this.account || !this.isConnected) {
      throw new Error("Not connected");
    }

    try {
      const { writeContract } = await import("https://esm.sh/@wagmi/core@2.x");

      const config = {
        address: contractAddress,
        abi: abi,
        functionName: functionName,
        args: args,
      };

      if (value) {
        config.value = value;
      }

      const hash = await writeContract(this.config, config);

      console.log("✅ Wagmi: Transaction sent:", hash);

      // Wait for transaction confirmation
      const { waitForTransactionReceipt } = await import(
        "https://esm.sh/@wagmi/core@2.x"
      );
      const receipt = await waitForTransactionReceipt(this.config, { hash });

      console.log("✅ Wagmi: Transaction confirmed:", receipt);

      return {
        transactionHash: hash,
        receipt: receipt,
      };
    } catch (error) {
      console.error("Wagmi: Failed to write contract:", error);
      throw error;
    }
  }

  async estimateGas(
    contractAddress,
    abi,
    functionName,
    args = [],
    value = null
  ) {
    try {
      const { estimateGas } = await import("https://esm.sh/@wagmi/core@2.x");

      const config = {
        account: this.account,
        to: contractAddress,
        data: this.encodeFunctionData(abi, functionName, args),
      };

      if (value) {
        config.value = value;
      }

      return await estimateGas(this.config, config);
    } catch (error) {
      console.error("Wagmi: Failed to estimate gas:", error);
      return 1200000n; // Default gas limit
    }
  }

  encodeFunctionData(abi, functionName, args) {
    try {
      const { encodeFunctionData } = import("https://esm.sh/viem@2.x");
      return encodeFunctionData({
        abi: abi,
        functionName: functionName,
        args: args,
      });
    } catch (error) {
      console.error("Failed to encode function data:", error);
      return "0x";
    }
  }

  isOnSomniaNetwork() {
    return this.chainId === 50312;
  }

  getConnectionInfo() {
    return {
      account: this.account,
      chainId: this.chainId,
      isConnected: this.isConnected,
      connector: this.connector?.name || "Unknown",
      provider: "Wagmi",
    };
  }

  // Utility method to check if Wagmi is available
  static isAvailable() {
    return typeof window !== "undefined" && window.wagmiConfig;
  }

  // Get supported wallets
  async getSupportedWallets() {
    try {
      const connectors = await this.getAvailableConnectors();
      return connectors.map((connector) => ({
        id: connector.id,
        name: connector.name,
        icon: connector.icon,
        available: true, // Wagmi handles availability checking
      }));
    } catch (error) {
      console.error("Failed to get supported wallets:", error);
      return [];
    }
  }
}

// Make WagmiManager available globally
window.WagmiManager = WagmiManager;

// Export for use in other modules
if (typeof module !== "undefined" && module.exports) {
  module.exports = WagmiManager;
}

console.log("🎯 Wagmi Manager Loaded");
