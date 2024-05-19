require("dotenv").config({ path: ".env" });
const { ethers } = require("hardhat");

async function main() {
  const SO = process.env.FIREBLOCKS_VAULT_ACCOUNT_ID_SERVICEOWNER_ADDR;

  // Deploy contract
  const Registry = await ethers.getContractFactory("NFCAddressRegistry");
  const registry = await Registry.deploy(SO);
  await registry.waitForDeployment();
  console.log("registry addr  = ", registry.target);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
