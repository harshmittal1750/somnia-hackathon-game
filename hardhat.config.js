require("@nomiclabs/hardhat-ethers");
require("@nomiclabs/hardhat-waffle");

// Load environment variables from .env file
require("dotenv").config();

// Ensure your private key is stored securely
// You can use environment variables or a .env file
const PRIVATE_KEY = process.env.PRIVATE_KEY || "your-private-key-here";

/**
 * @type import('hardhat/config').HardhatUserConfig
 */
module.exports = {
  solidity: {
    version: "0.8.19",
    settings: {
      optimizer: {
        enabled: true,
        runs: 200,
      },
    },
  },
  networks: {
    // Somnia Testnet configuration
    somnia: {
      url: "https://dream-rpc.somnia.network",
      accounts: PRIVATE_KEY !== "your-private-key-here" ? [PRIVATE_KEY] : [],
      chainId: 50312,
      gasPrice: "auto",
      gas: "auto",
      timeout: 60000,
    },
    // Local development network
    localhost: {
      url: "http://127.0.0.1:8545",
      chainId: 31337,
    },
    // Hardhat network for testing
    hardhat: {
      chainId: 31337,
    },
  },
  paths: {
    sources: "./contracts",
    tests: "./test",
    cache: "./cache",
    artifacts: "./artifacts",
  },
  mocha: {
    timeout: 40000,
  },
};
