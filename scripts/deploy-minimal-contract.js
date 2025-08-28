const hre = require("hardhat");

async function main() {
  console.log("🚀 Deploying Minimal Space Defender Contract...");

  // Get the contract factory
  const SpaceDefenderMinimal = await hre.ethers.getContractFactory(
    "SpaceDefenderMinimal"
  );

  // SD Token address on Rise testnet
  const sdTokenAddress = "0x01582e0Dd198cEb501010103bD92FE7221C3A33C";

  console.log("📄 Deploying with SD Token address:", sdTokenAddress);

  // Deploy the contract
  const contract = await SpaceDefenderMinimal.deploy(sdTokenAddress);

  await contract.deployed();

  console.log("✅ Contract deployed to:", contract.address);
  console.log("🔗 Transaction hash:", contract.deployTransaction.hash);

  // Wait for a few block confirmations
  console.log("⏳ Waiting for block confirmations...");
  await contract.deployTransaction.wait(3);

  console.log("🎉 Deployment completed!");
  console.log("");
  console.log("📋 Contract Details:");
  console.log("  Address:", contract.address);
  console.log("  SD Token:", sdTokenAddress);
  console.log("  Network: Rise Testnet");
  console.log("");
  console.log("🔧 Next Steps:");
  console.log("1. Update CONFIG.CONTRACTS.GAME_SCORE in js/config.js");
  console.log("2. Update CONTRACT_ADDRESS in backend/.env");
  console.log("3. Fund the contract with SD tokens for rewards");
  console.log("4. Start the backend server");
  console.log("");
  console.log("💰 To fund the contract:");
  console.log(`   - Use the admin panel in the game`);
  console.log(`   - Or call fundContract() directly`);

  // Try to verify the contract on explorer (if available)
  if (process.env.VERIFY_CONTRACT === "true") {
    console.log("🔍 Verifying contract on explorer...");
    try {
      await hre.run("verify:verify", {
        address: contract.address,
        constructorArguments: [sdTokenAddress],
      });
      console.log("✅ Contract verified on explorer");
    } catch (error) {
      console.log("⚠️ Contract verification failed:", error.message);
    }
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("❌ Deployment failed:", error);
    process.exit(1);
  });
