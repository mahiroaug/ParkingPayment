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

  beforeEach(async function () {
    [tokenOwner, serviceOwner, parkingOwner, user] = await ethers.getSigners();
    console.log("tokenOwner address   = ", tokenOwner.address);
    console.log("serviceOwner address = ", serviceOwner.address);
    console.log("parkingOwner address = ", parkingOwner.address);
    console.log("user address         = ", user.address);

    // Deploy a mock ERC20 token
    const Token = await ethers.getContractFactory("Token");
    token = await Token.deploy(tokenOwner.address);
    await token.waitForDeployment();
    console.log("token address        = ", token.target);

    // Deploy the ParkingPayment contract
    const etherString = "2";
    weiPerMinute = await ethers.parseEther(etherString);

    ParkingPayment = await ethers.getContractFactory("ParkingPayment");
    parkingPayment = await ParkingPayment.deploy(
      serviceOwner.address,
      weiPerMinute
    ); // wei per minute
    await parkingPayment.waitForDeployment();
    console.log("parkingPayment addr  = ", parkingPayment.target);

    // Register the parking ownerowner
    await parkingPayment
      .connect(serviceOwner)
      .addParkingOwner(parkingOwner.address);

    // Initial charge of the user
    await token
      .connect(tokenOwner)
      .transfer(user.address, await ethers.parseEther("10000"));
    const initialBalance = await token.balanceOf(user.address);
    log_balance("user", initialBalance);
  });

  // -------------------------------------------------------------------------------
  // TEST 01
  // -------------------------------------------------------------------------------
  it("TEST01 should allow users to deposit tokens", async function () {
    const depositAmount = await ethers.parseEther("123.456");

    // User approves the contract to spend tokens
    await token.connect(user).approve(parkingPayment.target, depositAmount);

    // check allowance
    const allowance = await token.allowance(
      user.address,
      parkingPayment.target
    );
    console.log("allowance = ", allowance.toLocaleString("de-DE"));
    expect(allowance).to.be.at.least(depositAmount);

    // User deposits tokens
    await parkingPayment
      .connect(user)
      .depositTokens(token.target, depositAmount, parkingOwner.address);

    // Check the deposit record
    expect(
      await parkingPayment.getDepositBalance(user.address, token.target)
    ).to.equal(depositAmount);
  });

  // -------------------------------------------------------------------------------
  // TEST 02
  // -------------------------------------------------------------------------------
  it("TEST02 should record a parking entry", async function () {
    const depositAmount = await ethers.parseEther("123.456");

    // User approves the contract to spend tokens
    await token.connect(user).approve(parkingPayment.target, depositAmount);

    // check allowance
    const allowance = await token.allowance(
      user.address,
      parkingPayment.target
    );
    console.log("allowance = ", allowance.toLocaleString("de-DE"));

    // User deposits tokens
    await parkingPayment
      .connect(user)
      .depositTokens(token.target, depositAmount, parkingOwner.address);

    // Record entry
    console.log("recordEntry execute");
    await parkingPayment
      .connect(parkingOwner)
      .recordEntry(user.address, token.target);

    // Check parking status
    console.log("check parking status");
    const parkingStatus = await parkingPayment.parkingStatus(user.address);
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
    log_balance("contract     ", await token.balanceOf(parkingPayment.target));
    log_balance("parkOwner    ", await token.balanceOf(parkingOwner.address));
    log_balance("serviceOwner ", await token.balanceOf(serviceOwner.address));
    // ----------------------------------------------------------------------------

    console.log("");
    console.log("tx >>>>>>> deposit 2000 tokens");
    console.log("");
    const depositAmount = await ethers.parseEther("2000");
    await token.connect(user).approve(parkingPayment.target, depositAmount);
    await parkingPayment
      .connect(user)
      .depositTokens(token.target, depositAmount, parkingOwner.address);

    // ----------------------------------------------------------------------------
    console.log("token balance :: 02:before Entry");
    log_balance("user         ", await token.balanceOf(user.address));
    log_balance("contract     ", await token.balanceOf(parkingPayment.target));
    log_balance("parkOwner    ", await token.balanceOf(parkingOwner.address));
    log_balance("serviceOwner ", await token.balanceOf(serviceOwner.address));
    // ----------------------------------------------------------------------------

    // Record entry
    console.log("");
    console.log("tx >>>>>>> recordEntry execute");
    console.log("");
    await parkingPayment
      .connect(parkingOwner)
      .recordEntry(user.address, token.target);

    // Manipulate time to simulate parking duration
    console.log("increase time by 60 minutes");
    await ethers.provider.send("evm_increaseTime", [parkedMinutes * 60]); // increase time by 60 minutes
    await ethers.provider.send("evm_mine");

    // Record exit
    console.log("");
    console.log("tx >>>>>> recordExit execute");
    console.log("");
    await parkingPayment.connect(parkingOwner).recordExit(user.address);

    // ----------------------------------------------------------------------------
    console.log("token balance :: 03:after exit");
    log_balance("user         ", await token.balanceOf(user.address));
    log_balance("contract     ", await token.balanceOf(parkingPayment.target));
    log_balance("parkOwner    ", await token.balanceOf(parkingOwner.address));
    log_balance("serviceOwner ", await token.balanceOf(serviceOwner.address));
    // ----------------------------------------------------------------------------

    const tmp_contract_bal = await token.balanceOf(parkingPayment.target);
    const tmp_parkOwner_bal = await token.balanceOf(parkingOwner.address);
    const tmp_serviceOwner_bal = await token.balanceOf(serviceOwner.address);
    const parkingFee = BigInt(parkedMinutes) * weiPerMinute;
    const systemFee = (parkingFee * BigInt(3)) / BigInt(100);
    const netFee = parkingFee - systemFee;
    expect(tmp_parkOwner_bal).to.equal(netFee);
    expect(tmp_serviceOwner_bal).to.equal(systemFee);
    expect(tmp_contract_bal).to.equal(depositAmount - parkingFee);

    const parkingStatus = await parkingPayment.parkingStatus(user.address);
    expect(parkingStatus.isParked).to.be.false;
  });
});
