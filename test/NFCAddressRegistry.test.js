const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("NFCAddressRegistry", function () {
  let NFCAddressRegistry;
  let nfcAddressRegistry;
  let owner;
  let addr1;
  let addr2;

  beforeEach(async function () {
    [owner, addr1, addr2] = await ethers.getSigners();
    console.log("owner address = ", owner.address);
    console.log("addr1 address = ", addr1.address);
    console.log("addr2 address = ", addr2.address);
    NFCAddressRegistry = await ethers.getContractFactory("NFCAddressRegistry");
    nfcAddressRegistry = await NFCAddressRegistry.deploy(owner.address);
    await nfcAddressRegistry.waitForDeployment();
    console.log("nfcCA address = ", nfcAddressRegistry.target);
  });

  describe("Deployment", function () {
    it("Should set the right owner", async function () {
      expect(await nfcAddressRegistry.owner()).to.equal(owner.address);
    });
  });

  describe("addId", function () {
    it("Should let the owner add a new ID", async function () {
      await nfcAddressRegistry.addId("123456", addr1.address);
      expect(
        await nfcAddressRegistry.connect(addr2).getMapAddress("123456")
      ).to.equal(addr1.address);
    });

    it("Should emit an event on adding ID", async function () {
      await expect(nfcAddressRegistry.addId("123456", addr1.address))
        .to.emit(nfcAddressRegistry, "IdAdded")
        .withArgs("123456", addr1.address);
    });

    it("Should fail if non-owner tries to add ID", async function () {
      await expect(
        nfcAddressRegistry.connect(addr1).addId("123456", addr1.address)
      ).to.be.reverted;
    });
  });

  describe("removeId", function () {
    beforeEach(async function () {
      await nfcAddressRegistry.addId("123456", addr1.address);
    });

    it("Should let the owner remove an ID", async function () {
      await nfcAddressRegistry.removeId("123456");
      expect(await nfcAddressRegistry.getMapAddress("123456")).to.equal(
        ethers.ZeroAddress
      );
    });

    it("Should emit an event on removing ID", async function () {
      await expect(nfcAddressRegistry.removeId("123456"))
        .to.emit(nfcAddressRegistry, "IdRemoved")
        .withArgs("123456");
    });

    it("Should fail if non-owner tries to remove ID", async function () {
      await expect(nfcAddressRegistry.connect(addr1).removeId("123456")).to.be
        .reverted;
    });
  });
});
