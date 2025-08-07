const { ethers } = require("ethers");
require("dotenv").config();

class Web3Service {
  constructor() {
    this.provider = new ethers.JsonRpcProvider(process.env.SOMNIA_RPC_URL);
    this.wallet = new ethers.Wallet(process.env.PRIVATE_KEY, this.provider);
    this.contractAddress = process.env.CONTRACT_ADDRESS;
    this.ssdTokenAddress = process.env.SSD_TOKEN_ADDRESS;

    // Minimal contract ABI for SSD rewards
    this.contractABI = [
      "function claimSSDReward(address player, uint16 aliensKilled) external",
      "function getPlayerSSDStats(address player) external view returns (uint256 earned, uint256 spent, uint256 balance)",
      "function fundContract(uint256 amount) external",
      "function withdrawSSD(uint256 amount) external",
      "function getContractInfo() external view returns (address contractOwner, bool isActive, address tokenAddress, uint256 contractBalance, string memory version)",
      "event SSDRewardClaimed(address indexed player, uint256 aliensKilled, uint256 ssdAmount)",
    ];

    this.contract = new ethers.Contract(
      this.contractAddress,
      this.contractABI,
      this.wallet
    );
    this.SSD_PER_KILL = ethers.parseEther("0.01"); // 0.01 SSD per kill
  }

  /**
   * Reward SSD tokens to player for aliens killed
   */
  async rewardSSD(playerAddress, aliensKilled) {
    try {
      if (!ethers.isAddress(playerAddress)) {
        throw new Error("Invalid player address");
      }

      if (aliensKilled <= 0 || aliensKilled > 10000) {
        throw new Error("Invalid aliens killed count");
      }

      console.log(
        `💰 Rewarding SSD to ${playerAddress} for ${aliensKilled} aliens killed`
      );

      // Check contract balance first
      const contractInfo = await this.contract.getContractInfo();
      const contractBalance = contractInfo.contractBalance;
      const rewardAmount = this.SSD_PER_KILL.mul(aliensKilled);

      if (contractBalance.lt(rewardAmount)) {
        console.warn("⚠️ Insufficient contract balance for SSD reward");
        return {
          success: false,
          error: "Insufficient contract balance",
          amount: 0,
        };
      }

      // Execute the reward transaction
      const tx = await this.contract.claimSSDReward(
        playerAddress,
        aliensKilled,
        {
          gasLimit: 1200000, // Lower gas limit for simple reward
        }
      );

      console.log(`🔗 SSD reward transaction sent: ${tx.hash}`);

      // Wait for confirmation
      const receipt = await tx.wait();

      if (receipt.status === 1) {
        const ssdAmount = parseFloat(ethers.formatEther(rewardAmount));
        console.log(`✅ SSD reward successful: ${ssdAmount} SSD`);

        return {
          success: true,
          txHash: tx.hash,
          amount: ssdAmount,
          blockNumber: receipt.blockNumber,
        };
      } else {
        throw new Error("Transaction failed");
      }
    } catch (error) {
      console.error("❌ SSD reward failed:", error);

      // Return graceful failure - don't break score submission
      return {
        success: false,
        error: error.message,
        amount: 0,
      };
    }
  }

  /**
   * Get player's SSD statistics from contract
   */
  async getPlayerSSDStats(playerAddress) {
    try {
      if (!ethers.isAddress(playerAddress)) {
        throw new Error("Invalid player address");
      }

      const [earned, spent, balance] = await this.contract.getPlayerSSDStats(
        playerAddress
      );

      return {
        earned: parseFloat(ethers.formatEther(earned)),
        spent: parseFloat(ethers.formatEther(spent)),
        balance: parseFloat(ethers.formatEther(balance)),
      };
    } catch (error) {
      console.error("Failed to get player SSD stats:", error);
      return {
        earned: 0,
        spent: 0,
        balance: 0,
      };
    }
  }

  /**
   * Fund the contract with SSD tokens (admin function)
   */
  async fundContract(amount) {
    try {
      const amountWei = ethers.parseEther(amount.toString());

      // First approve the tokens
      const ssdContract = new ethers.Contract(
        this.ssdTokenAddress,
        [
          "function approve(address spender, uint256 amount) external returns (bool)",
        ],
        this.wallet
      );

      const approveTx = await ssdContract.approve(
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
