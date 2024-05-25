require("dotenv").config({ path: ".env" });
const { ethers, upgrades } = require("hardhat");

async function main() {
  const PARKINGPAYMENTPROXY_CA = process.env.PARKINGPAYMENTPROXY_CA;
  const FORWARDER_CA = process.env.FORWARDER_CA;

  console.log("current PARKINGPAYMENTPROXY_CA = ", PARKINGPAYMENTPROXY_CA);
  console.log("current FORWARDER_CA           = ", FORWARDER_CA);

  const ServiceOwner = process.env.FIREBLOCKS_VID_SERVICEOWNER_ADDR;

  //-----------------------------------------------------------------
  // ParkingPayment
  //-----------------------------------------------------------------
  console.log("Deploying ParkingPaymentV2...");
  const ParkingPaymentV2 = await ethers.getContractFactory(
    "contracts/ParkingPayment/ParkingPaymentV2.sol:ParkingPayment"
  );

  //-----------------------------------------------------------------
  // ERC1967 Proxy
  //-----------------------------------------------------------------
  const etherString = "1";
  weiPerMinute = await ethers.parseEther(etherString);

  const parkingPayment_Proxy = await upgrades.upgradeProxy(
    PARKINGPAYMENTPROXY_CA,
    ParkingPaymentV2,
    {
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

  //-----------------------------------------------------------------
  // TEST:: setWithdrawalDelay
  //-----------------------------------------------------------------

  /*
  const parkingPayment_Proxy = await ethers.getContractAt(
    "contracts/ParkingPayment/ParkingPaymentV2.sol:ParkingPayment",
    PARKINGPAYMENTPROXY_CA
  );
  */

  console.log("TEST:: Setting WITHDRAWAL_DELAY to 1 hour...");

  const currentWithdrawalDelay = await parkingPayment_Proxy.WITHDRAWAL_DELAY();
  console.log("Current WITHDRAWAL_DELAY = ", currentWithdrawalDelay.toString());

  await parkingPayment_Proxy.setWithdrawalDelay(3600).then((tx) => tx.wait());
  console.log("WITHDRAWAL_DELAY set to 1 hour");

  const newWithdrawalDelay = await parkingPayment_Proxy.WITHDRAWAL_DELAY();
  console.log("New WITHDRAWAL_DELAY = ", newWithdrawalDelay.toString());
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
