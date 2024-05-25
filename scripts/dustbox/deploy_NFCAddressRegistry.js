require("dotenv").config({ path: ".env" });
const { ethers } = require("hardhat");

async function main() {
  const SO = process.env.FIREBLOCKS_VID_SERVICEOWNER_ADDR;

  const FORWARDER_CA = process.env.FORWARDER_CA;

  let registry;
  let erc1967Proxy;
  let registry_Proxy;

  //-----------------------------------------------------------------
  // Registry
  //-----------------------------------------------------------------
  const Registry = await ethers.getContractFactory(
    "contracts/NFCAddressRegistry/NFCAddressRegistry.sol:NFCAddressRegistry"
  );

  // deploy
  registry = await Registry.deploy(FORWARDER_CA); // trusted forwarder
  await registry.waitForDeployment();
  console.log("registry addr = ", registry.target);

  //-----------------------------------------------------------------
  // ERC1967 Proxy
  //-----------------------------------------------------------------

  // initializer
  const data = Registry.interface.encodeFunctionData("initialize", [SO]);

  // Deploy ERC1967 Proxy
  const ERC1967Proxy = await hre.ethers.getContractFactory("ERC1967Proxy");
  erc1967Proxy = await ERC1967Proxy.deploy(registry.target, data);
  await erc1967Proxy.waitForDeployment();
  console.log("erc1967Proxy addr = ", erc1967Proxy.target);

  // check
  registry_Proxy = await ethers.getContractAt("NFCAddressRegistry", erc1967Proxy.target);
  console.log("registry_Proxy address = ", registry_Proxy.target);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
