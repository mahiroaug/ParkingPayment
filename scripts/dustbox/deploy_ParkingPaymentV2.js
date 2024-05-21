require("dotenv").config({ path: ".env" });
const { ethers, upgrades } = require("hardhat");

async function main() {
  const PARKINGPAYMENT_CA = process.env.PARKINGPAYMENT_CA;
  const PARKINGPAYMENTPROXY_CA = process.env.PARKINGPAYMENTPROXY_CA;
  const FORWARDER_CA = process.env.FORWARDER_CA;

  console.log("current PARKINGPAYMENT_CA      = ", PARKINGPAYMENT_CA);
  console.log("current PARKINGPAYMENTPROXY_CA = ", PARKINGPAYMENTPROXY_CA);
  console.log("current FORWARDER_CA           = ", FORWARDER_CA);

  const ServiceOwner =
    process.env.FIREBLOCKS_VAULT_ACCOUNT_ID_SERVICEOWNER_ADDR;

  //-----------------------------------------------------------------
  // ParkingPayment
  //-----------------------------------------------------------------
  console.log("Deploying ParkingPaymentV2...");
  const ParkingPaymentV2 = await ethers.getContractFactory(
    "contracts/ParkingPayment/ParkingPaymentV2.sol:ParkingPayment"
  );

  /*
  // deploy
  const parkingPaymentv2 = await ParkingPaymentV2.deploy(FORWARDER_CA); // trusted forwarder
  await parkingPaymentv2.waitForDeployment();
  console.log("parkingPaymentV2 addr = ", parkingPaymentv2.target);
*/
  const parkingPaymentV2_CA = process.env.parkingPaymentV2_CA;

  //-----------------------------------------------------------------
  // ERC1967 Proxy Upgrade
  //-----------------------------------------------------------------

  // initializer
  const etherString = "2";
  weiPerMinute = await ethers.parseEther(etherString);
  const data = ParkingPaymentV2.interface.encodeFunctionData("initialize", [
    ServiceOwner,
    weiPerMinute,
  ]);

  // get Proxy
  console.log("Upgrading ParkingPayment proxy...");
  const Proxy = await ethers.getContractAt(
    "contracts/ParkingPayment/ParkingPayment.sol:ParkingPayment",
    PARKINGPAYMENTPROXY_CA
  );
  console.log("ParkingPayment_Proxy address = ", Proxy.target);

  // upgrade
  //const tx = await Proxy.upgradeToAndCall(parkingPaymentv2.target, data);
  const tx = await Proxy.upgradeToAndCall(parkingPaymentV2_CA, data);
  //const tx = await Proxy.upgradeTo(parkingPaymentV2_CA);
  await tx.wait();
  console.log(
    "ParkingPayment has been upgraded to a new version at:",
    parkingPaymentv2.target
  );
  console.log("proxy addr = ", proxy.address);

  // check
  const ratePerMinute = await Proxy.ratePerMinute();
  console.log(
    "ParkingPayment_Proxy ratePerMinute = ",
    ratePerMinute.toString()
  );
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
