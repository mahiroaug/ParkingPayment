require("dotenv").config({ path: ".env" });
const { ethers, upgrades } = require("hardhat");

async function main() {
  const ServiceOwner = process.env.FIREBLOCKS_VID_SERVICEOWNER_ADDR;

  const FORWARDER_CA = process.env.FORWARDER_CA;

  //-----------------------------------------------------------------
  // ParkingPayment
  //-----------------------------------------------------------------
  const ParkingPayment = await ethers.getContractFactory(
    "contracts/ParkingPayment/ParkingPayment.sol:ParkingPayment"
  );

  //-----------------------------------------------------------------
  // ERC1967 Proxy
  //-----------------------------------------------------------------
  const etherString = "2";
  weiPerMinute = await ethers.parseEther(etherString);

  console.log("Deploying ParkingPayment...");
  const parkingPayment_Proxy = await upgrades.deployProxy(
    ParkingPayment,
    [ServiceOwner, weiPerMinute],
    {
      initializer: "initialize",
      constructorArgs: [FORWARDER_CA],
      kind: "uups",
    }
  );
  await parkingPayment_Proxy.waitForDeployment();
  console.log("parkingPayment addr = ", parkingPayment_Proxy.target);

  // check
  const ratePerMinute = await parkingPayment_Proxy.ratePerMinute();
  console.log("ParkingPayment_Proxy ratePerMinute = ", ratePerMinute.toString());
  const trustedForwarder = await parkingPayment_Proxy.trustedForwarder();
  console.log("ParkingPayment_Proxy trustedForwarder = ", trustedForwarder);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
