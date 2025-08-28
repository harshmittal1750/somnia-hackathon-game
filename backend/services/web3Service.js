const { ethers } = require("ethers");
require("dotenv").config();

class Web3Service {
  constructor() {
    // Default to RISE Testnet, but allow override via environment
    const rpcUrl =
      process.env.RPC_URL ||
      process.env.RISE_RPC_URL ||
      "https://testnet.riselabs.xyz";
    this.provider = new ethers.JsonRpcProvider(rpcUrl);

    // Check if private key is valid before creating wallet
    if (
      !process.env.PRIVATE_KEY ||
      process.env.PRIVATE_KEY === "your_private_key_here"
    ) {
      console.warn(
        "⚠️ PRIVATE_KEY not set or invalid - Web3 functionality will be disabled"
      );
      this.wallet = null;
      this.contract = null;
      this.isEnabled = false;
      return;
    }

    try {
      this.wallet = new ethers.Wallet(process.env.PRIVATE_KEY, this.provider);
      this.isEnabled = true;
    } catch (error) {
      console.error("❌ Invalid PRIVATE_KEY format:", error.message);
      this.wallet = null;
      this.contract = null;
      this.isEnabled = false;
      return;
    }

    this.contractAddress = process.env.CONTRACT_ADDRESS;
    this.sdTokenAddress =
      process.env.SD_TOKEN_ADDRESS || process.env.SSD_TOKEN_ADDRESS; // Backward compatibility

    // Minimal contract ABI for SD rewards (Multi-chain compatible)
    this.contractABI = [
      "function claimSDReward(address player, uint16 aliensKilled) external",
      "function verifyTwitter(string memory _twitterHandle) external",
      "function isTwitterVerified(address _player) external view returns (bool)",
      "function getPlayerSDStats(address player) external view returns (uint256 earned, uint256 spent, uint256 balance)",
      "function fundContract(uint256 amount) external",
      "function withdrawSD(uint256 amount) external",
      "function getContractInfo() external view returns (address contractOwner, bool isActive, address tokenAddress, uint256 contractBalance, string memory version)",
      // Bridge-related functions for multi-chain support
      "function bridgeTokens(uint256 amount, uint256 targetChainId) external",
      "function getBridgeInfo() external view returns (bool isActive, uint256[] memory supportedChains)",
      "event SDRewardClaimed(address indexed player, uint256 aliensKilled, uint256 sdAmount)",
      "event TwitterRewardClaimed(address indexed player, string twitterHandle, uint256 sdAmount)",
      "event TokensBridged(address indexed user, uint256 amount, uint256 targetChainId)",
    ];

    if (this.wallet) {
      this.contract = new ethers.Contract(
        this.contractAddress,
        this.contractABI,
        this.wallet
      );
    }

    this.SD_PER_KILL = ethers.parseEther("0.01"); // 0.01 SD per kill
  }

  /**
   * Reward SD tokens to player for aliens killed
   */
  async rewardSD(playerAddress, aliensKilled) {
    try {
      if (!this.isEnabled) {
        console.warn("⚠️ Web3 service disabled - skipping SD reward");
        return {
          success: false,
          message: "Web3 service not configured",
          txHash: null,
        };
      }

      if (!ethers.isAddress(playerAddress)) {
        throw new Error("Invalid player address");
      }

      if (aliensKilled <= 0 || aliensKilled > 10000) {
        throw new Error("Invalid aliens killed count");
      }

      console.log(
        `💰 Rewarding SD to ${playerAddress} for ${aliensKilled} aliens killed`
      );

      // Check contract balance first
      const contractInfo = await this.contract.getContractInfo();
      const contractBalance = contractInfo.contractBalance;
      const rewardAmount = this.SD_PER_KILL * BigInt(aliensKilled);

      if (contractBalance < rewardAmount) {
        console.warn("⚠️ Insufficient contract balance for SD reward");
        return {
          success: false,
          error: "Insufficient contract balance",
          amount: 0,
        };
      }

      // Execute the reward transaction
      const tx = await this.contract.claimSDReward(
        playerAddress,
        aliensKilled,
        {
          gasLimit: 1400000, // Lower gas limit for simple reward
        }
      );

      console.log(`🔗 SD reward transaction sent: ${tx.hash}`);

      // Wait for confirmation
      const receipt = await tx.wait();

      if (receipt.status === 1) {
        const sdAmount = parseFloat(ethers.formatEther(rewardAmount));
        console.log(`✅ SD reward successful: ${sdAmount} SD`);

        return {
          success: true,
          txHash: tx.hash,
          amount: sdAmount,
          blockNumber: receipt.blockNumber,
        };
      } else {
        throw new Error("Transaction failed");
      }
    } catch (error) {
      console.error("❌ SD reward failed:", error);

      // Return graceful failure - don't break score submission
      return {
        success: false,
        error: error.message,
        amount: 0,
      };
    }
  }

  /**
   * Verify Twitter account and reward SD tokens
   */
  async verifyTwitter(playerAddress, twitterHandle) {
    try {
      if (!this.isEnabled) {
        console.warn(
          "⚠️ Web3 service disabled - skipping Twitter verification"
        );
        return {
          success: false,
          message: "Web3 service not configured",
          txHash: null,
        };
      }

      if (!ethers.isAddress(playerAddress)) {
        throw new Error("Invalid player address");
      }

      if (!twitterHandle || twitterHandle.length === 0) {
        throw new Error("Invalid Twitter handle");
      }

      console.log(
        `🐦 Verifying Twitter for ${playerAddress} with handle: @${twitterHandle}`
      );

      // Execute the Twitter verification transaction
      const tx = await this.contract.verifyTwitter(twitterHandle, {
        gasLimit: 300000,
      });

      console.log(`⏳ Transaction submitted: ${tx.hash}`);
      const receipt = await tx.wait();

      if (receipt.status === 1) {
        console.log(`✅ Twitter verification successful: ${tx.hash}`);
        return {
          success: true,
          txHash: tx.hash,
          message: "Twitter verification successful",
        };
      } else {
        throw new Error("Transaction failed");
      }
    } catch (error) {
      console.error("Twitter verification failed:", error);

      // Return graceful failure
      return {
        success: false,
        error: error.message,
        txHash: null,
      };
    }
  }

  /**
   * Get player's SD statistics from contract
   */
  async getPlayerSDStats(playerAddress) {
    try {
      if (!ethers.isAddress(playerAddress)) {
        throw new Error("Invalid player address");
      }

      const [earned, spent, balance] =
        await this.contract.getPlayerSDStats(playerAddress);

      return {
        earned: parseFloat(ethers.formatEther(earned)),
        spent: parseFloat(ethers.formatEther(spent)),
        balance: parseFloat(ethers.formatEther(balance)),
      };
    } catch (error) {
      console.error("Failed to get player SD stats:", error);
      return {
        earned: 0,
        spent: 0,
        balance: 0,
      };
    }
  }

  /**
   * Fund the contract with SD tokens (admin function)
   */
  async fundContract(amount) {
    try {
      const amountWei = ethers.parseEther(amount.toString());

      // First approve the tokens
      const sdContract = new ethers.Contract(
        this.sdTokenAddress,
        [
          "function approve(address spender, uint256 amount) external returns (bool)",
        ],
        this.wallet
      );

      const approveTx = await sdContract.approve(
        this.contractAddress,
        amountWei
      );
      await approveTx.wait();

      // Then fund the contract
      const fundTx = await this.contract.fundContract(amountWei);
      const receipt = await fundTx.wait();

      return {
        success: true,
        txHash: fundTx.hash,
        amount: amount,
      };
    } catch (error) {
      console.error("Failed to fund contract:", error);
      throw error;
    }
  }

  /**
   * Get contract information
   */
  async getContractInfo() {
    try {
      const info = await this.contract.getContractInfo();
      return {
        owner: info.contractOwner,
        isActive: info.isActive,
        tokenAddress: info.tokenAddress,
        balance: parseFloat(ethers.formatEther(info.contractBalance)),
        version: info.version,
      };
    } catch (error) {
      console.error("Failed to get contract info:", error);
      throw error;
    }
  }

  /**
   * Check if address is valid Ethereum address
   */
  isValidAddress(address) {
    return ethers.isAddress(address);
  }

  /**
   * Bridge SD tokens to another chain
   */
  async bridgeTokens(amount, targetChainId) {
    try {
      if (!this.isEnabled) {
        console.warn("⚠️ Web3 service disabled - skipping bridge");
        return {
          success: false,
          message: "Web3 service not configured",
          txHash: null,
        };
      }

      const amountWei = ethers.parseEther(amount.toString());

      console.log(`🌉 Bridging ${amount} SD tokens to chain ${targetChainId}`);

      // Execute the bridge transaction
      const tx = await this.contract.bridgeTokens(amountWei, targetChainId, {
        gasLimit: 500000,
      });

      console.log(`🔗 Bridge transaction sent: ${tx.hash}`);

      // Wait for confirmation
      const receipt = await tx.wait();

      if (receipt.status === 1) {
        console.log(`✅ Bridge successful: ${amount} SD`);

        return {
          success: true,
          txHash: tx.hash,
          amount: parseFloat(amount),
          targetChainId: targetChainId,
          blockNumber: receipt.blockNumber,
        };
      } else {
        throw new Error("Bridge transaction failed");
      }
    } catch (error) {
      console.error("❌ Bridge failed:", error);
      return {
        success: false,
        error: error.message,
        amount: 0,
      };
    }
  }

  /**
   * Get bridge information
   */
  async getBridgeInfo() {
    try {
      if (!this.isEnabled) {
        return {
          isActive: false,
          supportedChains: [],
        };
      }

      const [isActive, supportedChains] = await this.contract.getBridgeInfo();

      return {
        isActive,
        supportedChains: supportedChains.map((chain) => Number(chain)),
      };
    } catch (error) {
      console.error("Failed to get bridge info:", error);
      return {
        isActive: false,
        supportedChains: [],
      };
    }
  }

  /**
   * Get current gas price
   */
  async getGasPrice() {
    try {
      return await this.provider.getGasPrice();
    } catch (error) {
      console.error("Failed to get gas price:", error);
      return ethers.parseUnits("20", "gwei"); // Fallback
    }
  }

  /**
   * Get network information
   */
  async getNetworkInfo() {
    try {
      const network = await this.provider.getNetwork();
      const block = await this.provider.getBlockNumber();

      return {
        chainId: network.chainId,
        name: network.name,
        latestBlock: block,
      };
    } catch (error) {
      console.error("Failed to get network info:", error);
      throw error;
    }
  }
}

module.exports = new Web3Service();
