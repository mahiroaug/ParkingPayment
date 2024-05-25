// test/ParkingPayment.test.js
const { expect } = require("chai");
const { ethers } = require("hardhat");
// read .env
require("dotenv").config();

function log_balance(name, balance) {
  const balanceString = formatBigInt(balance, 24);
  console.log(
    name,
    "balance =",
    //balance.toLocaleString("de-DE"),
    balanceString,
    " type =",
    typeof balance
  );
}

function formatBigInt(value, targetLength) {
  let stringValue = value.toString();
  let paddingSize = targetLength - stringValue.length;
  let padding = "0".repeat(paddingSize > 0 ? paddingSize : 0);
  stringValue = padding + stringValue;

  // 3桁ごとにカンマを挿入
  return stringValue.replace(/\B(?=(\d{3})+(?!\d))/g, ",");
}

describe("ParkingPayment Contract", function () {
  let ParkingPayment;
  let parkingPayment;
  let tokenOwner;
  let serviceOwner;
  let parkingOwner;
  let user;
  let token;
  let weiPerMinute;
  let forwarder;
  let ParkingPayment_Proxy;

  beforeEach(async function () {
    [tokenOwner, serviceOwner, parkingOwner, user, forwarder] = await ethers.getSigners();
    console.log("tokenOwner address   = ", tokenOwner.address);
    console.log("serviceOwner address = ", serviceOwner.address);
    console.log("parkingOwner address = ", parkingOwner.address);
    console.log("user address         = ", user.address);
    console.log("forwarder address    = ", forwarder.address);

    //-----------------------------------------------------------------
    // Token
    //-----------------------------------------------------------------
    const Token = await ethers.getContractFactory("Token");
    token = await Token.deploy(tokenOwner.address);
    await token.waitForDeployment();
    console.log("token address        = ", token.target);

    //-----------------------------------------------------------------
    // ParkingPayment
    //-----------------------------------------------------------------
    ParkingPayment = await ethers.getContractFactory(
      "contracts/ParkingPayment/ParkingPaymentV2.sol:ParkingPayment"
    );
    parkingPayment = await ParkingPayment.deploy(forwarder.address);
    await parkingPayment.waitForDeployment();
    console.log("parkingPayment addr  = ", parkingPayment.target);

    //-----------------------------------------------------------------
    // ERC1967 Proxy
    //-----------------------------------------------------------------
    // initializer
    const etherString = "2";
    weiPerMinute = await ethers.parseEther(etherString);
    const data = ParkingPayment.interface.encodeFunctionData("initialize", [
      serviceOwner.address,
      weiPerMinute,
    ]);

    // Deploy ERC1967 Proxy
    const ERC1967Proxy = await hre.ethers.getContractFactory("ERC1967Proxy");
    const erc1967Proxy = await ERC1967Proxy.deploy(parkingPayment.target, data);
    await erc1967Proxy.waitForDeployment();
    console.log("erc1967Proxy addr = ", erc1967Proxy.target);

    // check
    ParkingPayment_Proxy = await ethers.getContractAt(
      "contracts/ParkingPayment/ParkingPaymentV2.sol:ParkingPayment",
      erc1967Proxy.target
    );
    console.log("ParkingPayment_Proxy address = ", ParkingPayment_Proxy.target);

    // check
    const ratePerMinute = await ParkingPayment_Proxy.ratePerMinute();
    console.log("ParkingPayment_Proxy ratePerMinute = ", ratePerMinute.toString());

    //-----------------------------------------------------------------
    // Register the parking owner
    //-----------------------------------------------------------------
    await ParkingPayment_Proxy.connect(serviceOwner).addParkingOwner(parkingOwner.address);

    // Initial charge of the user
    await token.connect(tokenOwner).transfer(user.address, await ethers.parseEther("10000"));
    const initialBalance = await token.balanceOf(user.address);
    log_balance("user", initialBalance);
  });

  // -------------------------------------------------------------------------------
  // TEST 01
  // -------------------------------------------------------------------------------
  it("TEST01 should allow users to deposit tokens", async function () {
    const depositAmount = await ethers.parseEther("123.456");

    // User approves the contract to spend tokens
    await token.connect(user).approve(ParkingPayment_Proxy.target, depositAmount);

    // check allowance
    const allowance = await token.allowance(user.address, ParkingPayment_Proxy.target);
    console.log("allowance = ", allowance.toLocaleString("de-DE"));
    expect(allowance).to.be.at.least(depositAmount);

    // User deposits tokens
    await ParkingPayment_Proxy.connect(user).depositTokens(
      token.target,
      depositAmount,
      parkingOwner.address
    );

    // Check the deposit record
    expect(await ParkingPayment_Proxy.getDepositBalance(user.address, token.target)).to.equal(
      depositAmount
    );
  });

  // -------------------------------------------------------------------------------
  // TEST 02
  // -------------------------------------------------------------------------------
  it("TEST02 should record a parking entry", async function () {
    const depositAmount = await ethers.parseEther("123.456");

    // User approves the contract to spend tokens
    await token.connect(user).approve(ParkingPayment_Proxy.target, depositAmount);

    // check allowance
    const allowance = await token.allowance(user.address, ParkingPayment_Proxy.target);
    console.log("allowance = ", allowance.toLocaleString("de-DE"));

    // User deposits tokens
    await ParkingPayment_Proxy.connect(user).depositTokens(
      token.target,
      depositAmount,
      parkingOwner.address
    );

    // Record entry
    console.log("recordEntry execute");
    await ParkingPayment_Proxy.connect(parkingOwner).recordEntry(user.address, token.target);

    // Check parking status
    console.log("check parking status");
    const parkingStatus = await ParkingPayment_Proxy.parkingStatus(user.address);
    console.log("parkingStatus = ", parkingStatus);
    expect(parkingStatus.isParked).to.be.true;
    expect(parkingStatus.tokenAddress).to.equal(token.target);
  });

  // -------------------------------------------------------------------------------
  // TEST 03
  // -------------------------------------------------------------------------------
  it("TEST03 should handle parking exit and payment correctly", async function () {
    const parkedMinutes = 60;
    console.log("");
    // ----------------------------------------------------------------------------
    console.log("token balance :: 01:before deposit");
    log_balance("user         ", await token.balanceOf(user.address));
    log_balance("contract     ", await token.balanceOf(ParkingPayment_Proxy.target));
    log_balance("parkOwner    ", await token.balanceOf(parkingOwner.address));
    log_balance("serviceOwner ", await token.balanceOf(serviceOwner.address));
    // ----------------------------------------------------------------------------

    console.log("");
    console.log("tx >>>>>>> deposit 2000 tokens");
    console.log("");
    const depositAmount = await ethers.parseEther("2000");
    await token.connect(user).approve(ParkingPayment_Proxy.target, depositAmount);
    await ParkingPayment_Proxy.connect(user).depositTokens(
      token.target,
      depositAmount,
      parkingOwner.address
    );

    // ----------------------------------------------------------------------------
    console.log("token balance :: 02:before Entry");
    log_balance("user         ", await token.balanceOf(user.address));
    log_balance("contract     ", await token.balanceOf(ParkingPayment_Proxy.target));
    log_balance("parkOwner    ", await token.balanceOf(parkingOwner.address));
    log_balance("serviceOwner ", await token.balanceOf(serviceOwner.address));
    // ----------------------------------------------------------------------------

    // Record entry
    console.log("");
    console.log("tx >>>>>>> recordEntry execute");
    console.log("");
    await ParkingPayment_Proxy.connect(parkingOwner).recordEntry(user.address, token.target);

    // Manipulate time to simulate parking duration
    console.log("increase time by 60 minutes");
    await ethers.provider.send("evm_increaseTime", [parkedMinutes * 60]); // increase time by 60 minutes
    await ethers.provider.send("evm_mine");

    // Record exit
    console.log("");
    console.log("tx >>>>>> recordExit execute");
    console.log("");
    await ParkingPayment_Proxy.connect(parkingOwner).recordExit(user.address);

    // ----------------------------------------------------------------------------
    console.log("token balance :: 03:after exit");
    log_balance("user         ", await token.balanceOf(user.address));
    log_balance("contract     ", await token.balanceOf(ParkingPayment_Proxy.target));
    log_balance("parkOwner    ", await token.balanceOf(parkingOwner.address));
    log_balance("serviceOwner ", await token.balanceOf(serviceOwner.address));
    // ----------------------------------------------------------------------------

    const tmp_contract_bal = await token.balanceOf(ParkingPayment_Proxy.target);
    const tmp_parkOwner_bal = await token.balanceOf(parkingOwner.address);
    const tmp_serviceOwner_bal = await token.balanceOf(serviceOwner.address);
    const parkingFee = BigInt(parkedMinutes) * weiPerMinute;
    const systemFee = (parkingFee * BigInt(3)) / BigInt(100);
    const netFee = parkingFee - systemFee;
    expect(tmp_parkOwner_bal).to.equal(netFee);
    expect(tmp_serviceOwner_bal).to.equal(systemFee);
    expect(tmp_contract_bal).to.equal(depositAmount - parkingFee);

    const parkingStatus = await ParkingPayment_Proxy.parkingStatus(user.address);
    expect(parkingStatus.isParked).to.be.false;
  });

  // -------------------------------------------------------------------------------
  // TEST 04
  // -------------------------------------------------------------------------------
  it("TEST04 should allow the owner to set the parking rate", async function () {
    const currentRate = await ParkingPayment_Proxy.ratePerMinute();
    console.log("currentRate = ", currentRate.toString());
    const newRate = await ethers.parseEther("3");
    await ParkingPayment_Proxy.connect(serviceOwner).setParkingRate(newRate);
    const updatedRate = await ParkingPayment_Proxy.ratePerMinute();
    console.log("updatedRate = ", updatedRate.toString());
    expect(updatedRate).to.equal(newRate);
  });

  // -------------------------------------------------------------------------------
  // TEST 05
  // -------------------------------------------------------------------------------
  it("TEST05 should allow the owner to set the withdrawal delay", async function () {
    const currentDelay = await ParkingPayment_Proxy.WITHDRAWAL_DELAY();
    console.log("currentDelay = ", currentDelay.toString());
    const newDelay = 60 * 60 * 24; // 1 day in seconds
    await ParkingPayment_Proxy.connect(serviceOwner).setWithdrawalDelay(newDelay);
    const updatedDelay = await ParkingPayment_Proxy.WITHDRAWAL_DELAY();
    console.log("updatedDelay = ", updatedDelay.toString());
    expect(updatedDelay).to.equal(newDelay);
  });

  // -------------------------------------------------------------------------------
  // TEST 06
  // -------------------------------------------------------------------------------
  it("TEST06 should allow users to withdraw remaining funds after the delay", async function () {
    // current balance
    const currentUserBalance = await token.balanceOf(user.address);
    log_balance("current user", currentUserBalance);
    const currentPPBalance = await token.balanceOf(ParkingPayment_Proxy.target);
    log_balance("current PP  ", currentPPBalance);

    // Deposit tokens
    const depositAmount = await ethers.parseEther("500");
    await token.connect(user).approve(ParkingPayment_Proxy.target, depositAmount);
    await ParkingPayment_Proxy.connect(user).depositTokens(
      token.target,
      depositAmount,
      parkingOwner.address
    );

    // after deposit
    const afterDepositUserBalance = await token.balanceOf(user.address);
    log_balance("afterDep user", afterDepositUserBalance);
    const afterDepositPPBalance = await token.balanceOf(ParkingPayment_Proxy.target);
    log_balance("afterDep PP  ", afterDepositPPBalance);

    // Simulate parking entry and exit
    await ParkingPayment_Proxy.connect(parkingOwner).recordEntry(user.address, token.target);
    await ethers.provider.send("evm_increaseTime", [60 * 60]); // increase time by 60 minutes
    await ethers.provider.send("evm_mine");
    await ParkingPayment_Proxy.connect(parkingOwner).recordExit(user.address);

    // after exit
    const afterExitUserBalance = await token.balanceOf(user.address);
    log_balance("afterExi user", afterExitUserBalance);
    const afterExitPPBalance = await token.balanceOf(ParkingPayment_Proxy.target);
    log_balance("afterExi PP  ", afterExitPPBalance);
    const afterExitPOBalance = await token.balanceOf(parkingOwner.address);
    log_balance("afterExi PO  ", afterExitPOBalance);

    // Wait for the withdrawal delay
    await ethers.provider.send("evm_increaseTime", [30 * 60]); // increase time by 30 minutes
    await ethers.provider.send("evm_mine");

    // Withdraw remaining funds
    const initialBalance = await token.balanceOf(user.address);
    log_balance("initial user", initialBalance);
    await ParkingPayment_Proxy.connect(user).withdrawRemainingFunds(user.address, token.target);
    const finalBalance = await token.balanceOf(user.address);
    log_balance("final   user", finalBalance);
    const remainingBalance = await token.balanceOf(ParkingPayment_Proxy.target);
    log_balance("final   PP  ", remainingBalance);
    expect(finalBalance).to.be.above(initialBalance);
  });

  // -------------------------------------------------------------------------------
  // TEST 07
  // -------------------------------------------------------------------------------
  it("TEST07 should not allow users to withdraw remaining funds before the delay", async function () {
    const depositAmount = await ethers.parseEther("500");
    await token.connect(user).approve(ParkingPayment_Proxy.target, depositAmount);
    await ParkingPayment_Proxy.connect(user).depositTokens(
      token.target,
      depositAmount,
      parkingOwner.address
    );

    // after deposit
    const afterDepositUserBalance = await token.balanceOf(user.address);
    log_balance("afterDep user", afterDepositUserBalance);
    const afterDepositPPBalance = await token.balanceOf(ParkingPayment_Proxy.target);
    log_balance("afterDep PP  ", afterDepositPPBalance);

    // Simulate parking entry and exit
    await ParkingPayment_Proxy.connect(parkingOwner).recordEntry(user.address, token.target);
    await ethers.provider.send("evm_increaseTime", [15 * 60]); // increase time by 15 minutes
    await ethers.provider.send("evm_mine");
    await ParkingPayment_Proxy.connect(parkingOwner).recordExit(user.address);

    // after exit
    const afterExitUserBalance = await token.balanceOf(user.address);
    log_balance("afterExi user", afterExitUserBalance);
    const afterExitPPBalance = await token.balanceOf(ParkingPayment_Proxy.target);
    log_balance("afterExi PP  ", afterExitPPBalance);
    const afterExitPOBalance = await token.balanceOf(parkingOwner.address);
    log_balance("afterExi PO  ", afterExitPOBalance);

    // Withdraw remaining funds
    const initialBalance = await token.balanceOf(user.address);
    log_balance("initial user", initialBalance);

    try {
      await ParkingPayment_Proxy.connect(user).withdrawRemainingFunds(user.address, token.target);
    } catch (error) {
      console.log("Expected error: ", error.message);
    }

    const finalBalance = await token.balanceOf(user.address);
    log_balance("final   user", finalBalance);
    const remainingBalance = await token.balanceOf(ParkingPayment_Proxy.target);
    log_balance("final   PP  ", remainingBalance);

    // Ensure balances have not changed
    expect(finalBalance).to.equal(initialBalance);
    expect(remainingBalance).to.equal(afterExitPPBalance);
  });

  // -------------------------------------------------------------------------------
  // TEST 08
  // -------------------------------------------------------------------------------
  it("TEST08 should handle multiple parking entries and exits correctly", async function () {
    const depositAmount = await ethers.parseEther("1000");
    await token.connect(user).approve(ParkingPayment_Proxy.target, depositAmount);
    await ParkingPayment_Proxy.connect(user).depositTokens(
      token.target,
      depositAmount,
      parkingOwner.address
    );

    // after deposit
    const afterDepositUserBalance = await token.balanceOf(user.address);
    log_balance("afterDep user", afterDepositUserBalance);
    const afterDepositPPBalance = await token.balanceOf(ParkingPayment_Proxy.target);
    log_balance("afterDep PP  ", afterDepositPPBalance);

    const entryExitCycles = 3;
    const parkedMinutes = 30;

    for (let i = 0; i < entryExitCycles; i++) {
      console.log(`Entry-Exit repate Cycle ${i + 1}------------------`);

      // Record entry
      await ParkingPayment_Proxy.connect(parkingOwner).recordEntry(user.address, token.target);

      // Manipulate time to simulate parking duration
      await ethers.provider.send("evm_increaseTime", [parkedMinutes * 60]);
      await ethers.provider.send("evm_mine");

      // Record exit
      await ParkingPayment_Proxy.connect(parkingOwner).recordExit(user.address);

      // after exit
      const afterExitUserBalance = await token.balanceOf(user.address);
      log_balance("afterExi user", afterExitUserBalance);
      const afterExitPPBalance = await token.balanceOf(ParkingPayment_Proxy.target);
      log_balance("afterExi PP  ", afterExitPPBalance);
      const afterExitPOBalance = await token.balanceOf(parkingOwner.address);
      log_balance("afterExi PO  ", afterExitPOBalance);

      // Manipulate time to simulate parking duration
      await ethers.provider.send("evm_increaseTime", [10 * 60]);
      await ethers.provider.send("evm_mine");
    }

    // Check final balances
    const finalUserBalance = await token.balanceOf(user.address);
    log_balance("final user", finalUserBalance);
    const finalPPBalance = await token.balanceOf(ParkingPayment_Proxy.target);
    log_balance("final PP", finalPPBalance);
    const finalPOBalance = await token.balanceOf(parkingOwner.address);
    log_balance("final PO", finalPOBalance);
    const finalSOBalance = await token.balanceOf(serviceOwner.address);
    log_balance("final SO", finalSOBalance);

    // Calculate expected balances
    const totalParkedMinutes = parkedMinutes * entryExitCycles;
    const totalParkingFee = BigInt(totalParkedMinutes) * weiPerMinute;
    const totalSystemFee = (totalParkingFee * BigInt(3)) / BigInt(100);
    const totalNetFee = totalParkingFee - totalSystemFee;

    expect(finalPOBalance).to.equal(totalNetFee);
    expect(finalSOBalance).to.equal(totalSystemFee);
    expect(finalPPBalance).to.equal(depositAmount - totalParkingFee);

    const parkingStatus = await ParkingPayment_Proxy.parkingStatus(user.address);
    expect(parkingStatus.isParked).to.be.false;
  });

  // -------------------------------------------------------------------------------
  // TEST 09
  // -------------------------------------------------------------------------------
  it("TEST09 should handle multiple deposits and withdrawals correctly", async function () {
    const depositAmount = await ethers.parseEther("500");
    const withdrawalDelay = 60 * 60; // 1 hour in seconds

    for (let i = 0; i < 3; i++) {
      console.log(`Cycle ${i + 1}------------------`);

      // Deposit tokens
      await token.connect(user).approve(ParkingPayment_Proxy.target, depositAmount);
      await ParkingPayment_Proxy.connect(user).depositTokens(
        token.target,
        depositAmount,
        parkingOwner.address
      );

      // after deposit
      const afterDepositUserBalance = await token.balanceOf(user.address);
      log_balance("afterDep user", afterDepositUserBalance);
      const afterDepositPPBalance = await token.balanceOf(ParkingPayment_Proxy.target);
      log_balance("afterDep PP  ", afterDepositPPBalance);

      // Simulate parking entry and exit
      await ParkingPayment_Proxy.connect(parkingOwner).recordEntry(user.address, token.target);
      await ethers.provider.send("evm_increaseTime", [15 * 60]); // increase time by 15 minutes
      await ethers.provider.send("evm_mine");
      await ParkingPayment_Proxy.connect(parkingOwner).recordExit(user.address);

      // after exit
      const afterExitUserBalance = await token.balanceOf(user.address);
      log_balance("afterExi user", afterExitUserBalance);
      const afterExitPPBalance = await token.balanceOf(ParkingPayment_Proxy.target);
      log_balance("afterExi PP  ", afterExitPPBalance);
      const afterExitPOBalance = await token.balanceOf(parkingOwner.address);
      log_balance("afterExi PO  ", afterExitPOBalance);

      // Wait for the withdrawal delay
      await ethers.provider.send("evm_increaseTime", [withdrawalDelay]);
      await ethers.provider.send("evm_mine");

      // Withdraw remaining funds
      const initialBalance = await token.balanceOf(user.address);
      log_balance("initial user", initialBalance);
      await ParkingPayment_Proxy.connect(user).withdrawRemainingFunds(user.address, token.target);
      const finalBalance = await token.balanceOf(user.address);
      log_balance("final   user", finalBalance);
      const remainingBalance = await token.balanceOf(ParkingPayment_Proxy.target);
      log_balance("final   PP  ", remainingBalance);
      expect(finalBalance).to.be.above(initialBalance);
    }
  });
});
