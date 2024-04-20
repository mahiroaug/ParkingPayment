// test/ParkingPayment.test.js
const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("ParkingPayment Contract", function () {
  let ParkingPayment;
  let parkingPayment;
  let owner;
  let user;
  let parkingOwner;
  let token;

  beforeEach(async function () {
    [owner, user, parkingOwner] = await ethers.getSigners();

    // Deploy a mock ERC20 token
    const Token = await ethers.getContractFactory("Token");
    token = await Token.deploy(
      "TestToken",
      "TT",
      ethers.utils.parseEther("1000")
    );
    await token.deployed();

    // Deploy the ParkingPayment contract
    ParkingPayment = await ethers.getContractFactory("ParkingPayment");
    parkingPayment = await ParkingPayment.deploy(parkingOwner.address, 1); // 1 wei per minute
    await parkingPayment.deployed();

    // Register the parking owner
    await parkingPayment.connect(owner).addParkingOwner(parkingOwner.address);
  });

  it("should allow users to deposit tokens", async function () {
    const depositAmount = ethers.utils.parseEther("10");

    // User approves the contract to spend tokens
    await token.connect(user).approve(parkingPayment.address, depositAmount);

    // User deposits tokens
    await parkingPayment
      .connect(user)
      .depositTokens(token.address, depositAmount, parkingOwner.address);

    // Check the deposit record
    expect(await parkingPayment.deposits(user.address, token.address)).to.equal(
      depositAmount
    );
  });

  it("should record a parking entry", async function () {
    const depositAmount = ethers.utils.parseEther("10");

    // User approves and deposits tokens
    await token.connect(user).approve(parkingPayment.address, depositAmount);
    await parkingPayment
      .connect(user)
      .depositTokens(token.address, depositAmount, parkingOwner.address);

    // Record entry
    await parkingPayment
      .connect(parkingOwner)
      .recordEntry(user.address, token.address);

    // Check parking status
    const parkingStatus = await parkingPayment.parkingStatus(user.address);
    expect(parkingStatus.isParked).to.be.true;
    expect(parkingStatus.tokenAddress).to.equal(token.address);
  });

  it("should handle parking exit and payment correctly", async function () {
    const depositAmount = ethers.utils.parseEther("10");
    const parkedMinutes = 60;

    // User approves and deposits tokens
    await token.connect(user).approve(parkingPayment.address, depositAmount);
    await parkingPayment
      .connect(user)
      .depositTokens(token.address, depositAmount, parkingOwner.address);

    // Record entry
    await parkingPayment
      .connect(parkingOwner)
      .recordEntry(user.address, token.address);

    // Manipulate time to simulate parking duration
    await ethers.provider.send("evm_increaseTime", [parkedMinutes * 60]); // increase time by 60 minutes
    await ethers.provider.send("evm_mine");

    // Record exit
    await parkingPayment.connect(parkingOwner).recordExit(user.address);

    // Check final token balances and parking status
    const finalBalance = await token.balanceOf(user.address);
    const parkingFee = parkedMinutes; // Since rate is 1 wei per minute
    expect(finalBalance).to.equal(
      ethers.utils.parseEther("1000").sub(parkingFee)
    );
    const parkingStatus = await parkingPayment.parkingStatus(user.address);
    expect(parkingStatus.isParked).to.be.false;
  });
});
