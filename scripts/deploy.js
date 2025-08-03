// Deploy script for Somnia Space Defender smart contract
const { ethers } = require("hardhat");

async function main() {
  console.log("🚀 Deploying Somnia Space Defender to Somnia Testnet...");

  // Get the deployer account
  const signers = await ethers.getSigners();

  if (signers.length === 0) {
    console.error("❌ No deployer account found!");
    console.error("💡 You need to set up your private key first:");
    console.error("   1. Create a .env file in the project root");
    console.error("   2. Add: PRIVATE_KEY=your_actual_private_key_here");
    console.error("   3. Make sure your account has STT tokens for deployment");
    console.error("   4. Get STT tokens from Somnia testnet faucet if needed");
    process.exit(1);
  }

  const [deployer] = signers;
  console.log("📝 Deploying contracts with account:", deployer.address);

  // Check balance
  const balance = await deployer.getBalance();
  console.log("💰 Account balance:", ethers.utils.formatEther(balance), "STT");

  if (balance.lt(ethers.utils.parseEther("0.01"))) {
    console.warn(
      "⚠️  Low balance! You may need more STT tokens for deployment."
    );
  }

  // Deploy the contract
  console.log("🔨 Compiling and deploying SomniaSpaceDefender...");
  const SomniaSpaceDefender = await ethers.getContractFactory(
    "SomniaSpaceDefender"
  );

  // SSD Token address (replace with actual address)
  const SSD_TOKEN_ADDRESS =
    process.env.SSD_TOKEN_ADDRESS ||
    "0x0000000000000000000000000000000000000000";
  console.log("🪙 SSD Token Address:", SSD_TOKEN_ADDRESS);

  // Estimate gas with constructor parameter
  const estimatedGas = await SomniaSpaceDefender.signer.estimateGas(
    SomniaSpaceDefender.getDeployTransaction(SSD_TOKEN_ADDRESS)
  );
  console.log("⛽ Estimated gas:", estimatedGas.toString());

  // Deploy with gas optimization
  const contract = await SomniaSpaceDefender.deploy(SSD_TOKEN_ADDRESS, {
    gasLimit: estimatedGas.mul(120).div(100), // 20% buffer
  });

  console.log("⏳ Waiting for deployment transaction...");
  await contract.deployed();

  console.log("✅ Contract deployed successfully!");
  console.log("📍 Contract address:", contract.address);
  console.log("🔗 Transaction hash:", contract.deployTransaction.hash);

  // Verify deployment
  console.log("🔍 Verifying deployment...");
  const contractInfo = await contract.getContractInfo();
  console.log("👤 Contract owner:", contractInfo.contractOwner);
  console.log("🎮 Game active:", contractInfo.isGameActive);
  console.log("📊 Version:", contractInfo.version);

  // Display next steps
  console.log("\n🎯 Next Steps:");
  console.log("1. Update js/config.js with the contract address:");
  console.log(`   GAME_SCORE: '${contract.address}'`);
  console.log("\n2. Verify contract on block explorer:");
  console.log(
    `   https://testnet.somniaexplorer.com/address/${contract.address}`
  );
  console.log("\n3. Test the game with the new contract!");

  // Save deployment info
  const deploymentInfo = {
    contractAddress: contract.address,
    transactionHash: contract.deployTransaction.hash,
    deployerAddress: deployer.address,
    timestamp: new Date().toISOString(),
    network: "somnia-testnet",
    gasUsed: estimatedGas.toString(),
    version: "1.0.0",
  };

  console.log("\n📄 Deployment Summary:");
  console.log(JSON.stringify(deploymentInfo, null, 2));

  return contract.address;
}

// Error handling
main()
  .then((address) => {
    console.log(`\n🎉 Deployment completed! Contract: ${address}`);
    process.exit(0);
  })
  .catch((error) => {
    console.error("❌ Deployment failed:");
    console.error(error);
    process.exit(1);
  });
