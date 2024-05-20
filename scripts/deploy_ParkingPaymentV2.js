require("dotenv").config({ path: ".env" });
const { ethers, upgrades } = require("hardhat");

async function main() {
  const PROXY_ADDRESS = process.env.PROXY_ADDRESS;

  // ParkingPaymentの新しいバージョンをデプロイ
  const ParkingPaymentV2 = await ethers.getContractFactory(
    "contracts/ParkingPayment/ParkingPaymentV2.sol:ParkingPaymentV2"
  );
  console.log("Deploying ParkingPaymentV2...");
  const parkingPaymentV2 = await ParkingPaymentV2.deploy();
  await parkingPaymentV2.deployed();
  console.log("ParkingPaymentV2 deployed to:", parkingPaymentV2.address);

  // プロキシをアップグレード
  console.log("Upgrading ParkingPayment proxy...");
  const parkingPaymentProxy = await ethers.getContractAt(
    "ParkingPaymentV2",
    PROXY_ADDRESS
  );
  const upgradeTx = await upgrades.upgradeProxy(
    parkingPaymentProxy.address,
    ParkingPaymentV2
  );
  await upgradeTx.wait();
  console.log("ParkingPayment proxy upgraded");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
