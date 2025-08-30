const { ethers } = require("hardhat");

async function main() {
  const [deployer, government, auditor, oracle, producer] = await ethers.getSigners();

  console.log("Deploying contracts with the account:", deployer.address);
  console.log("Account balance:", (await deployer.getBalance()).toString());

  // Deploy DataOracle first
  console.log("\n=== Deploying DataOracle ===");
  const DataOracle = await ethers.getContractFactory("DataOracle");
  const dataOracle = await DataOracle.deploy();
  await dataOracle.deployed();
  console.log("DataOracle deployed to:", dataOracle.address);

  // Deploy GreenHydrogenSubsidy
  console.log("\n=== Deploying GreenHydrogenSubsidy ===");
  const GreenHydrogenSubsidy = await ethers.getContractFactory("GreenHydrogenSubsidy");
  const subsidyContract = await GreenHydrogenSubsidy.deploy();
  await subsidyContract.deployed();
  console.log("GreenHydrogenSubsidy deployed to:", subsidyContract.address);

  // Setup initial roles and configuration
  console.log("\n=== Setting up initial configuration ===");
  
  // Grant roles to different accounts for testing
  if (government.address !== deployer.address) {
    await subsidyContract.grantRole(await subsidyContract.GOVERNMENT_ROLE(), government.address);
    console.log("Government role granted to:", government.address);
  }

  if (auditor.address && auditor.address !== deployer.address) {
    await subsidyContract.grantRole(await subsidyContract.AUDITOR_ROLE(), auditor.address);
    await dataOracle.grantRole(await dataOracle.ORACLE_OPERATOR_ROLE(), auditor.address);
    console.log("Auditor role granted to:", auditor.address);
  }

  if (oracle.address && oracle.address !== deployer.address) {
    await subsidyContract.grantRole(await subsidyContract.ORACLE_ROLE(), oracle.address);
    await dataOracle.grantRole(await dataOracle.DATA_PROVIDER_ROLE(), oracle.address);
    console.log("Oracle role granted to:", oracle.address);
  }

  // Add some trusted data sources to the oracle
  await dataOracle.addTrustedSource("hydrogen-meter-001", 0); // IoTDevice
  await dataOracle.addTrustedSource("government-energy-db", 1); // GovernmentDB
  await dataOracle.addTrustedSource("third-party-verifier-alpha", 2); // ThirdPartyVerifier
  console.log("Added trusted data sources to oracle");

  // Add initial funds to subsidy contract (0.1 ETH for testing)
  const initialFunds = ethers.utils.parseEther("0.1");
  await subsidyContract.addFunds({ value: initialFunds });
  console.log("Added initial funds:", ethers.utils.formatEther(initialFunds), "ETH");

  // Save deployment addresses
  const deploymentInfo = {
    network: hardhat.network.name,
    deployer: deployer.address,
    contracts: {
      DataOracle: dataOracle.address,
      GreenHydrogenSubsidy: subsidyContract.address
    },
    accounts: {
      government: government.address,
      auditor: auditor?.address,
      oracle: oracle?.address,
      producer: producer?.address
    },
    timestamp: new Date().toISOString()
  };

  console.log("\n=== Deployment Summary ===");
  console.log(JSON.stringify(deploymentInfo, null, 2));

  // Verify contracts on Etherscan if on testnet/mainnet
  if (hardhat.network.name !== "hardhat" && hardhat.network.name !== "localhost") {
    console.log("\n=== Verifying contracts on Etherscan ===");
    try {
      await hardhat.run("verify:verify", {
        address: dataOracle.address,
        constructorArguments: [],
      });
      console.log("DataOracle verified on Etherscan");

      await hardhat.run("verify:verify", {
        address: subsidyContract.address,
        constructorArguments: [],
      });
      console.log("GreenHydrogenSubsidy verified on Etherscan");
    } catch (error) {
      console.log("Verification failed:", error.message);
    }
  }

  return deploymentInfo;
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
