// Space Defender - Bridge Manager for Multi-Chain SD Token
class BridgeManager {
  constructor() {
    this.supportedChains = CONFIG.SD.BRIDGE.SUPPORTED_CHAINS;
    this.supportedNetworks = CONFIG.SUPPORTED_NETWORKS;
    this.currentChain = null;
    this.bridgeContract = null;
    this.isInitialized = false;

    this.init();
  }

  async init() {
    console.log("🌉 Initializing Bridge Manager...");

    try {
      // Get current chain information
      if (window.ethereum && web3Manager.isConnected) {
        const chainId = await window.ethereum.request({
          method: "eth_chainId",
        });

        // Check if current chain is supported for the game
        if (NETWORK_UTILS.isSupportedNetwork(chainId)) {
          this.currentChain = this.supportedNetworks[chainId];
          console.log(
            `✅ Current chain supported: ${this.currentChain.chainName}`
          );
          this.isInitialized = true;
        } else {
          console.warn("⚠️ Current chain not supported");
        }
      }
    } catch (error) {
      console.error("❌ Failed to initialize bridge manager:", error);
    }
  }

  /**
   * Get supported chain configuration by chain ID
   */
  getSupportedChain(chainId) {
    return this.supportedNetworks[chainId] || null;
  }

  /**
   * Check if bridging is available
   */
  isBridgeAvailable() {
    return (
      CONFIG.SD.BRIDGE.ENABLED &&
      this.isInitialized &&
      this.currentChain &&
      web3Manager.isConnected
    );
  }

  /**
   * Get available target chains for bridging
   */
  getAvailableTargetChains() {
    if (!this.currentChain) return [];

    return Object.values(this.supportedNetworks).filter(
      (network) => network.chainId !== this.currentChain.chainId
    );
  }

  /**
   * Estimate bridge fee
   */
  async estimateBridgeFee(targetChainId, amount) {
    try {
      // This would typically call a bridge contract or API
      // For now, return a mock fee structure
      const baseFee = 0.001; // ETH
      const percentageFee = parseFloat(amount) * 0.001; // 0.1% of amount

      return {
        baseFee: baseFee.toString(),
        percentageFee: percentageFee.toString(),
        totalFee: (baseFee + percentageFee).toString(),
        estimatedTime: "5-10 minutes",
      };
    } catch (error) {
      console.error("Failed to estimate bridge fee:", error);
      throw error;
    }
  }

  /**
   * Bridge SD tokens to another chain
   */
  async bridgeTokens(targetChainId, amount) {
    if (!this.isBridgeAvailable()) {
      throw new Error("Bridge not available");
    }

    if (!amount || parseFloat(amount) <= 0) {
      throw new Error("Invalid amount");
    }

    const targetChain = this.getSupportedChain(targetChainId);
    if (!targetChain) {
      throw new Error("Target chain not supported");
    }

    try {
      console.log(
        `🌉 Initiating bridge: ${amount} SD from ${this.currentChain.chainName} to ${targetChain.chainName}`
      );

      // Get bridge fee estimate
      const feeEstimate = await this.estimateBridgeFee(targetChainId, amount);
      console.log("💰 Bridge fee estimate:", feeEstimate);

      // Check SD token balance
      const sdBalance = await this.getSDBalance();
      if (parseFloat(sdBalance) < parseFloat(amount)) {
        throw new Error("Insufficient SD balance");
      }

      // Check ETH balance for fees
      const ethBalance = await web3Manager.getBalance();
      if (parseFloat(ethBalance) < parseFloat(feeEstimate.totalFee)) {
        throw new Error("Insufficient ETH for bridge fees");
      }

      // Execute bridge transaction via web3Manager
      const result = await web3Manager.bridgeTokens(amount, targetChainId);

      if (result.success) {
        console.log("✅ Bridge transaction successful:", result.txHash);

        // Show success notification
        if (window.gameApp && window.gameApp.showNotification) {
          window.gameApp.showNotification(
            `🌉 Bridge initiated! ${amount} SD tokens are being transferred to ${targetChain.chainName}`,
            "success",
            8000
          );
        }

        // Track bridge transaction
        this.trackBridgeTransaction(result.txHash, targetChainId, amount);

        return {
          success: true,
          txHash: result.txHash,
          targetChain: targetChain.chainName,
          amount: amount,
          estimatedArrival: "5-10 minutes",
        };
      } else {
        throw new Error(result.error || "Bridge transaction failed");
      }
    } catch (error) {
      console.error("❌ Bridge failed:", error);

      // Show error notification
      if (window.gameApp && window.gameApp.showNotification) {
        window.gameApp.showNotification(
          `❌ Bridge failed: ${error.message}`,
          "error",
          5000
        );
      }

      throw error;
    }
  }

  /**
   * Get SD token balance on current chain
   */
  async getSDBalance() {
    try {
      if (!web3Manager.isConnected) return "0";

      const stats = await web3Manager.getSDStats();
      return stats.balance || "0";
    } catch (error) {
      console.error("Failed to get SD balance:", error);
      return "0";
    }
  }

  /**
   * Track bridge transaction status
   */
  trackBridgeTransaction(txHash, targetChainId, amount) {
    const bridgeData = {
      txHash,
      targetChainId,
      amount,
      timestamp: Date.now(),
      status: "pending",
    };

    // Store in localStorage for tracking
    const existingBridges = this.getBridgeHistory();
    existingBridges.push(bridgeData);

    localStorage.setItem(
      "riseSpaceDefender_bridges",
      JSON.stringify(existingBridges)
    );

    // Start monitoring (mock implementation)
    this.monitorBridgeTransaction(txHash, targetChainId);
  }

  /**
   * Monitor bridge transaction completion
   */
  async monitorBridgeTransaction(txHash, targetChainId) {
    // Mock monitoring - in a real implementation, this would check bridge status
    setTimeout(() => {
      console.log(`✅ Bridge transaction ${txHash} completed`);

      if (window.gameApp && window.gameApp.showNotification) {
        const targetChain = this.getSupportedChain(targetChainId);
        window.gameApp.showNotification(
          `🎉 Bridge completed! Your SD tokens are now available on ${targetChain?.chainName || "target chain"}`,
          "success",
          6000
        );
      }

      // Update bridge history
      this.updateBridgeStatus(txHash, "completed");
    }, 30000); // Mock 30 second completion time
  }

  /**
   * Update bridge transaction status
   */
  updateBridgeStatus(txHash, status) {
    const bridges = this.getBridgeHistory();
    const bridgeIndex = bridges.findIndex((b) => b.txHash === txHash);

    if (bridgeIndex !== -1) {
      bridges[bridgeIndex].status = status;
      bridges[bridgeIndex].completedAt = Date.now();
      localStorage.setItem(
        "riseSpaceDefender_bridges",
        JSON.stringify(bridges)
      );
    }
  }

  /**
   * Get bridge transaction history
   */
  getBridgeHistory() {
    try {
      const history = localStorage.getItem("riseSpaceDefender_bridges");
      return history ? JSON.parse(history) : [];
    } catch (error) {
      console.error("Failed to get bridge history:", error);
      return [];
    }
  }

  /**
   * Get pending bridge transactions
   */
  getPendingBridges() {
    return this.getBridgeHistory().filter(
      (bridge) => bridge.status === "pending"
    );
  }

  /**
   * Switch to a supported chain
   */
  async switchToChain(chainId) {
    const targetChain = this.getSupportedChain(chainId);
    if (!targetChain) {
      throw new Error("Chain not supported");
    }

    try {
      console.log(`🔄 Switching to ${targetChain.chainName}...`);

      // Try to switch to the target chain
      await window.ethereum.request({
        method: "wallet_switchEthereumChain",
        params: [{ chainId: targetChain.chainId }],
      });

      // Update current chain
      this.currentChain = targetChain;

      console.log(`✅ Switched to ${targetChain.chainName}`);
      return true;
    } catch (switchError) {
      // If chain doesn't exist in wallet, add it
      if (switchError.code === 4902) {
        try {
          await window.ethereum.request({
            method: "wallet_addEthereumChain",
            params: [
              {
                chainId: targetChain.chainId,
                chainName: targetChain.chainName,
                rpcUrls: targetChain.rpcUrls,
                nativeCurrency: targetChain.nativeCurrency,
                blockExplorerUrls: targetChain.blockExplorerUrls,
              },
            ],
          });

          this.currentChain = targetChain;
          console.log(`✅ Added and switched to ${targetChain.chainName}`);
          return true;
        } catch (addError) {
          console.error(`Failed to add ${targetChain.chainName}:`, addError);
          throw new Error(`Failed to add ${targetChain.chainName} to wallet`);
        }
      } else {
        console.error(
          `Failed to switch to ${targetChain.chainName}:`,
          switchError
        );
        throw new Error(`Failed to switch to ${targetChain.chainName}`);
      }
    }
  }

  /**
   * Open bridge UI in external window
   */
  openBridgeUI() {
    const bridgeUrl = CONFIG.SD.BRIDGE.BRIDGE_UI_URL;
    if (bridgeUrl) {
      console.log("🌉 Opening bridge UI:", bridgeUrl);
      window.open(bridgeUrl, "_blank");
    } else {
      console.warn("Bridge UI URL not configured");
    }
  }

  /**
   * Get bridge status summary
   */
  getBridgeStatus() {
    const pendingBridges = this.getPendingBridges();
    const totalBridges = this.getBridgeHistory().length;

    return {
      available: this.isBridgeAvailable(),
      currentChain: this.currentChain?.chainName || "Unknown",
      supportedChains: Object.keys(this.supportedNetworks).length,
      pendingTransactions: pendingBridges.length,
      totalBridges: totalBridges,
    };
  }
}

// Create global bridge manager instance
const bridgeManager = new BridgeManager();

// Export for use in other modules
if (typeof module !== "undefined" && module.exports) {
  module.exports = BridgeManager;
}

console.log("🌉 Bridge Manager Loaded - Multi-Chain SD Token Ready!");
