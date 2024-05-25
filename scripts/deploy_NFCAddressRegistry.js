require("dotenv").config({ path: ".env" });
const { ethers, upgrades } = require("hardhat");

async function main() {
  const ServiceOwner = process.env.FIREBLOCKS_VID_SERVICEOWNER_ADDR;

  const FORWARDER_CA = process.env.FORWARDER_CA;

  //-----------------------------------------------------------------
  // Registry
  //-----------------------------------------------------------------
  const Registry = await ethers.getContractFactory(
    "contracts/NFCAddressRegistry/NFCAddressRegistry.sol:NFCAddressRegistry"
  );

  //-----------------------------------------------------------------
  // ERC1967 Proxy
  //-----------------------------------------------------------------
  console.log("Deploying Registry...");
  const registry_Proxy = await upgrades.deployProxy(Registry, [ServiceOwner], {
    initializer: "initialize",
    constructorArgs: [FORWARDER_CA],
    kind: "uups",
  });
  await registry_Proxy.waitForDeployment();
  console.log("registry addr = ", registry_Proxy.target);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
