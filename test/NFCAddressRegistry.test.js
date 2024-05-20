const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("NFCAddressRegistry", function () {
  let nfcAddressRegistry;
  let ContractOwner;
  let addr1;
  let addr2;
  let trustedforwarder;
  let RegistryProxy;

  beforeEach(async function () {
    [ContractOwner, addr1, addr2, trustedforwarder] = await ethers.getSigners();
    console.log("ContractOwner address = ", ContractOwner.address);
    console.log("addr1 address = ", addr1.address);
    console.log("addr2 address = ", addr2.address);
    console.log("trustedforwarder address = ", trustedforwarder.address);

    // Deploy Registry
    const NFCAddressRegistry = await ethers.getContractFactory(
      "NFCAddressRegistry"
    );
    nfcAddressRegistry = await NFCAddressRegistry.deploy(
      trustedforwarder.address
    );
    await nfcAddressRegistry.waitForDeployment();
    console.log("nfcCA address = ", nfcAddressRegistry.target);

    // Deploy ERC1967 Proxy
    const ERC1967Proxy = await hre.ethers.getContractFactory("ERC1967Proxy");
    const data = NFCAddressRegistry.interface.encodeFunctionData("initialize", [
      ContractOwner.address,
    ]);
    const erc1967Proxy = await ERC1967Proxy.deploy(
      nfcAddressRegistry.target,
      data
    );
    await erc1967Proxy.waitForDeployment();
    console.log("erc1967Proxy deployed to: ", erc1967Proxy.target);
    RegistryProxy = await ethers.getContractAt(
      "NFCAddressRegistry",
      erc1967Proxy.target
    );
    console.log("RegistryProxy address =   ", RegistryProxy.target);
  });

  //----------------------------------------------------------------
  // TEST 1
  //----------------------------------------------------------------
  describe("TEST 1::: Deployment", function () {
    it("TEST 1: Should set the right ContractOwner", async function () {
      expect(await RegistryProxy.owner()).to.equal(ContractOwner.address);
    });
  });

  //----------------------------------------------------------------
  // TEST 2
  //----------------------------------------------------------------
  describe("TEST 2::: addId", function () {
    it("TEST 2-1: Should let the owner add a new ID", async function () {
      await RegistryProxy.addId("123456", addr1.address);
      expect(
        await RegistryProxy.connect(addr2).getMapAddress("123456")
      ).to.equal(addr1.address);
    });

    it("TEST 2-2: Should emit an event on adding ID", async function () {
      await expect(RegistryProxy.addId("123456", addr1.address))
        .to.emit(RegistryProxy, "IdAdded")
        .withArgs("123456", addr1.address);
    });

    it("TEST 2-3: Should fail if non-owner tries to add ID", async function () {
      await expect(RegistryProxy.connect(addr1).addId("123456", addr1.address))
        .to.be.reverted;
    });
  });

  //----------------------------------------------------------------
  // TEST 3
  //----------------------------------------------------------------
  describe("TEST 3::: removeId", function () {
    beforeEach(async function () {
      await RegistryProxy.addId("id-123456", addr1.address);
    });

    it("TEST 3-1: Should let the owner remove an ID", async function () {
      await RegistryProxy.removeId("id-123456");
      expect(await RegistryProxy.getMapAddress("id-123456")).to.equal(
        ethers.ZeroAddress
      );
    });

    it("TEST 3-2: Should emit an event on removing ID", async function () {
      await expect(RegistryProxy.removeId("id-123456"))
        .to.emit(RegistryProxy, "IdRemoved")
        .withArgs("id-123456");
    });

    it("TEST 3-3: Should fail if non-owner tries to remove ID", async function () {
      await expect(RegistryProxy.connect(addr1).removeId("id-123456")).to.be
        .reverted;
    });
  });
});
