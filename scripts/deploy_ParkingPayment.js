require("dotenv").config({ path: ".env" });
const { ethers } = require("hardhat");

async function main() {
  const ServiceOwner =
    process.env.FIREBLOCKS_VAULT_ACCOUNT_ID_SERVICEOWNER_ADDR;

  // Deploy the ParkingPayment contract
  const etherString = "1";
  weiPerMinute = await ethers.parseEther(etherString);

  ParkingPayment = await ethers.getContractFactory("ParkingPayment");
  parkingPayment = await ParkingPayment.deploy(ServiceOwner, weiPerMinute); // wei per minute
  await parkingPayment.waitForDeployment();
  console.log("parkingPayment addr  = ", parkingPayment.target);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
