const { ethers } = require("hardhat");

async function main() {
  console.log("🚀 Deploying Space Defender contracts to RISE Testnet...");

  const [deployer] = await ethers.getSigners();
  console.log("Deploying contracts with the account:", deployer.address);

  const balance = await deployer.provider.getBalance(deployer.address);
  console.log("Account balance:", ethers.utils.formatEther(balance), "ETH");

  // Deploy SD Token first
  console.log("\n📄 Deploying SD Token...");
  const SDToken = await ethers.getContractFactory("SDToken");
  const sdToken = await SDToken.deploy(
    "Space Defender Token", // name
    "SD", // symbol
    18, // decimals
    1000000 // initial supply (1M tokens)
  );

  await sdToken.deployed();
  console.log("✅ SD Token deployed to:", sdToken.address);

  // Deploy Space Defender contract
  console.log("\n🛡️ Deploying Space Defender Game Contract...");
  const RISESpaceDefender = await ethers.getContractFactory(
    "RISESpaceDefender"
  );
  const gameContract = await RISESpaceDefender.deploy(sdToken.address);

  await gameContract.deployed();
  console.log("✅ Space Defender deployed to:", gameContract.address);

  // Setup initial configuration
  console.log("\n⚙️ Setting up initial configuration...");

  // Transfer some SD tokens to the game contract for rewards
  const rewardAmount = ethers.utils.parseEther("50000"); // 50k SD tokens
  console.log(
    "Transferring",
    ethers.utils.formatEther(rewardAmount),
    "SD tokens to game contract..."
  );
  await sdToken.transfer(gameContract.address, rewardAmount);

  // Add RISE Testnet as supported chain for bridging
  console.log("Adding RISE Testnet as supported chain...");
  await sdToken.addSupportedChain(11155931); // RISE Testnet chain ID

  // Authorize the game contract to mint/burn tokens for rewards
  console.log("Authorizing game contract for SD token operations...");
  await sdToken.authorizeBridge(gameContract.address, true);

  // Verify contract setup
  console.log("\n🔍 Verifying deployment...");

  const tokenInfo = await sdToken.getTokenInfo();
  console.log("SD Token Info:");
  console.log("- Name:", tokenInfo.tokenName);
  console.log("- Symbol:", tokenInfo.tokenSymbol);
  console.log(
    "- Total Supply:",
    ethers.utils.formatEther(tokenInfo.tokenTotalSupply)
  );
  console.log("- Owner:", tokenInfo.tokenOwner);

  const contractInfo = await gameContract.getContractInfo();
  console.log("\nGame Contract Info:");
  console.log("- Owner:", contractInfo.contractOwner);
  console.log("- Active:", contractInfo.isActive);
  console.log("- Token Address:", contractInfo.tokenAddress);
  console.log(
    "- Contract Balance:",
    ethers.utils.formatEther(contractInfo.contractBalance),
    "SD"
  );
  console.log("- Version:", contractInfo.version);

  console.log("\n🎉 Deployment completed successfully!");
  console.log("\n📋 Contract Addresses:");
  console.log("SD Token:", sdToken.address);
  console.log("Space Defender:", gameContract.address);

  console.log("\n🔧 Environment Variables for backend:");
  console.log(`SD_TOKEN_ADDRESS=${sdToken.address}`);
  console.log(`CONTRACT_ADDRESS=${gameContract.address}`);
  console.log(`RISE_RPC_URL=https://testnet.riselabs.xyz`);

  console.log("\n📝 Update your frontend config with these addresses:");
  console.log(`"0xaa39db": {`);
  console.log(`  GAME_SCORE: "${gameContract.address}",`);
  console.log(`  SD_TOKEN: "${sdToken.address}",`);
  console.log(`},`);

  // Test a simple transaction to ensure everything works
  console.log("\n🧪 Testing contract functionality...");
  try {
    const testTx = await gameContract.getGameStats();
    console.log(
      "✅ Contract is responsive - Game Stats retrieved successfully"
    );
    console.log("- Total Games:", testTx.totalGames.toString());
    console.log("- Total Players:", testTx.totalPlayers.toString());
  } catch (error) {
    console.log("⚠️ Contract test failed:", error.message);
  }

  console.log("\n🌉 Bridge Configuration:");
  console.log("- Bridge functionality is ready for integration");
  console.log("- Supported chains can be added via addSupportedChain()");
  console.log("- Bridge contracts can be authorized via authorizeBridge()");

  console.log("\n✨ Ready to start gaming on RISE Network!");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("❌ Deployment failed:", error);
    process.exit(1);
  });
