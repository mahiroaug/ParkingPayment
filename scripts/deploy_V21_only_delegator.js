require("dotenv").config({ path: ".env" });
const hre = require("hardhat");

async function main() {
  let delegator;

  // Deploy TokenDelegator
  const DelegatorFactory = await ethers.getContractFactory(
    "contracts/V21/TokenDelegator_V21.sol:TokenDelegator"
  );
  delegator = await DelegatorFactory.deploy();
  await delegator.waitForDeployment();
  console.log("delegator deployed to:    ", delegator.target);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
