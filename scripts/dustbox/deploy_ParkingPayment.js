require("dotenv").config({ path: ".env" });
const { ethers } = require("hardhat");

async function main() {
  const ServiceOwner = process.env.FIREBLOCKS_VID_SERVICEOWNER_ADDR;

  const FORWARDER_CA = process.env.FORWARDER_CA;

  let parkingPayment;
  let erc1967Proxy;
  let ParkingPayment_Proxy;

  //-----------------------------------------------------------------
  // ParkingPayment
  //-----------------------------------------------------------------
  const ParkingPayment = await ethers.getContractFactory(
    "contracts/ParkingPayment/ParkingPayment.sol:ParkingPayment"
  );

  // deploy
  parkingPayment = await ParkingPayment.deploy(FORWARDER_CA); // trusted forwarder
  await parkingPayment.waitForDeployment();
  console.log("parkingPayment addr = ", parkingPayment.target);

  //-----------------------------------------------------------------
  // ERC1967 Proxy
  //-----------------------------------------------------------------

  // initializer
  const etherString = "2";
  weiPerMinute = await ethers.parseEther(etherString);
  const data = ParkingPayment.interface.encodeFunctionData("initialize", [
    ServiceOwner,
    weiPerMinute,
  ]);

  // Deploy ERC1967 Proxy
  const ERC1967Proxy = await hre.ethers.getContractFactory("ERC1967Proxy");
  erc1967Proxy = await ERC1967Proxy.deploy(parkingPayment.target, data);
  await erc1967Proxy.waitForDeployment();
  console.log("erc1967Proxy addr = ", erc1967Proxy.target);

  // check
  ParkingPayment_Proxy = await ethers.getContractAt(
    "contracts/ParkingPayment/ParkingPayment.sol:ParkingPayment",
    erc1967Proxy.target
  );
  console.log("ParkingPayment_Proxy address = ", ParkingPayment_Proxy.target);

  // check
  const ratePerMinute = await ParkingPayment_Proxy.ratePerMinute();
  console.log("ParkingPayment_Proxy ratePerMinute = ", ratePerMinute.toString());
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
