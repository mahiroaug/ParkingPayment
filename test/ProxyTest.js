const { ethers } = require("hardhat");
const { expect } = require("chai");

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

describe("TokenDelegator", function () {
  let TokenOwner;
  let owner;
  let owner2;
  let spender;
  let minter;
  let relayer;
  let recipient;

  let forwarder;
  let token;
  let erc1967Proxy;
  let delegator;
  let JST_V21_Proxy;

  const domainName = process.env.DOMAIN_SEPARATOR_NAME;
  const domainVersion = process.env.DOMAIN_SEPARATOR_VERSION;

  beforeEach(async function () {
    // Get signers
    [TokenOwner, owner, owner2, spender, minter, recipient, relayer] = await ethers.getSigners();
    console.log("TokenOwner address= ", TokenOwner.address);
    console.log("owner address     = ", owner.address);
    console.log("owner2 address    = ", owner2.address);
    console.log("spender address   = ", spender.address);
    console.log("minter address    = ", minter.address);
    console.log("relayer address   = ", relayer.address);
    console.log("recipient address = ", recipient.address);

    // Deploy forwarder
    const Forwarder = await hre.ethers.getContractFactory(
      "contracts/V21/Forwarder_V21.sol:Forwarder"
    );
    forwarder = await Forwarder.deploy();
    await forwarder.waitForDeployment();
    console.log("Forwarder deployed to:    ", forwarder.target);
    const tx = await forwarder.registerDomainSeparator(domainName, domainVersion);
    await tx.wait();
    console.log("DomainSeparator registered");

    // Deploy JSTv2_Token
    const ImplementContract = await ethers.getContractFactory("JST_V21");
    token = await ImplementContract.deploy(forwarder.target);
    await token.waitForDeployment();
    console.log("token deployed to:        ", token.target);

    // Deploy ERC1967 Proxy
    const ERC1967Proxy = await hre.ethers.getContractFactory("ERC1967Proxy");
    const data = ImplementContract.interface.encodeFunctionData("initialize", [TokenOwner.address]);
    erc1967Proxy = await ERC1967Proxy.deploy(token.target, data);
    await erc1967Proxy.waitForDeployment();
    console.log("erc1967Proxy deployed to: ", erc1967Proxy.target);
    JST_V21_Proxy = await ethers.getContractAt("JST_V21", erc1967Proxy.target);
    console.log("JST_V21_Proxy address =   ", JST_V21_Proxy.target);

    // Deploy TokenDelegator
    const DelegatorFactory = await ethers.getContractFactory(
      "contracts/V21/TokenDelegator_V21.sol:TokenDelegator"
    );
    delegator = await DelegatorFactory.deploy();
    await delegator.waitForDeployment();
    console.log("delegator deployed to:    ", delegator.target);

    // add minter
    await JST_V21_Proxy.connect(TokenOwner).addMinter(minter.address);

    // mint
    await JST_V21_Proxy.connect(minter).mint(owner.address, ethers.parseEther("2000"));
    await JST_V21_Proxy.connect(minter).mint(owner2.address, ethers.parseEther("3000"));

    log_balance("owner initialBalance  ", await JST_V21_Proxy.balanceOf(owner.address));
    log_balance("owner2 initialBalance ", await JST_V21_Proxy.balanceOf(owner2.address));
  });

  //----------------------------------------------------------------
  // ERC2612 for delegator
  //----------------------------------------------------------------
  it("should transfer tokens using delegator(ERC2612)", async function () {
    const amount = ethers.parseEther("100");
    const deadline = Math.floor(Date.now() / 1000) + 3600; // 1 hour from now

    // User signs the permit
    const nonce = await JST_V21_Proxy.nonces(owner.address);
    const domain = {
      name: await JST_V21_Proxy.name(),
      version: "1",
      chainId: parseInt((await ethers.provider.getNetwork()).chainId),
      verifyingContract: JST_V21_Proxy.target,
    };
    const types = {
      Permit: [
        { name: "owner", type: "address" },
        { name: "spender", type: "address" },
        { name: "value", type: "uint256" },
        { name: "nonce", type: "uint256" },
        { name: "deadline", type: "uint256" },
      ],
    };
    const message = {
      owner: owner.address,
      spender: delegator.target,
      value: amount.toString(),
      nonce: nonce.toString(),
      deadline,
    };

    console.log("Domain:", domain);
    console.log("Message:", message);

    const signature = await owner.signTypedData(domain, types, message);
    const splitSig = ethers.Signature.from(signature);

    console.log("Signature v:", splitSig.v);
    console.log("Signature r:", splitSig.r);
    console.log("Signature s:", splitSig.s);

    // Perform the permit and transferFrom
    await delegator
      .connect(relayer)
      .permitAndTransfer(
        JST_V21_Proxy.target,
        owner.address,
        recipient.address,
        amount,
        deadline,
        splitSig.v,
        splitSig.r,
        splitSig.s
      );

    log_balance("owner      ", await JST_V21_Proxy.balanceOf(owner.address));
    log_balance("recipient  ", await JST_V21_Proxy.balanceOf(recipient.address));
    log_balance("owner allow", await JST_V21_Proxy.allowance(owner.address, delegator.target));

    expect(await JST_V21_Proxy.balanceOf(recipient.address)).to.equal(amount);
  });

  //----------------------------------------------------------------
  // ERC2612(permitSpender) for delegator
  //----------------------------------------------------------------
  it("should transfer tokens using delegator(ERC2612) permitSpender", async function () {
    const amount = ethers.parseEther("100");
    const deadline = Math.floor(Date.now() / 1000) + 3600; // 1 hour from now

    // User signs the permit
    const nonce = await JST_V21_Proxy.nonces(owner.address);
    const domain = {
      name: await JST_V21_Proxy.name(),
      version: "1",
      chainId: parseInt((await ethers.provider.getNetwork()).chainId),
      verifyingContract: JST_V21_Proxy.target,
    };
    const types = {
      Permit: [
        { name: "owner", type: "address" },
        { name: "spender", type: "address" },
        { name: "value", type: "uint256" },
        { name: "nonce", type: "uint256" },
        { name: "deadline", type: "uint256" },
      ],
    };
    const message = {
      owner: owner.address,
      spender: spender.address,
      value: amount.toString(),
      nonce: nonce.toString(),
      deadline,
    };

    console.log("Domain:", domain);
    console.log("Message:", message);

    const signature = await owner.signTypedData(domain, types, message);
    const splitSig = ethers.Signature.from(signature);

    console.log("Signature v:", splitSig.v);
    console.log("Signature r:", splitSig.r);
    console.log("Signature s:", splitSig.s);

    // Perform the permit and transferFrom
    await delegator
      .connect(relayer)
      .permitSpender(
        JST_V21_Proxy.target,
        owner.address,
        spender.address,
        amount,
        deadline,
        splitSig.v,
        splitSig.r,
        splitSig.s
      );

    log_balance("owner      ", await JST_V21_Proxy.balanceOf(owner.address));
    log_balance("recipient  ", await JST_V21_Proxy.balanceOf(recipient.address));
    log_balance(
      "owner allow spender",
      await JST_V21_Proxy.allowance(owner.address, spender.address)
    );

    expect(await JST_V21_Proxy.allowance(owner.address, spender.address)).to.equal(amount);
  });

  //----------------------------------------------------------------
  // ERC2771 for forwarder
  //----------------------------------------------------------------
  it("should transfer tokens using forwarder(ERC2771)", async function () {
    const weiAmount = ethers.parseEther("200");
    const data = JST_V21_Proxy.interface.encodeFunctionData("transfer", [
      recipient.address,
      weiAmount,
    ]);
    const deadline = Math.floor(Date.now() / 1000) + 3600; // 1 hour from now

    // User signs the permit
    const nonce = await forwarder.getNonce(owner.address);
    const domain = {
      name: domainName,
      version: domainVersion,
      chainId: parseInt((await ethers.provider.getNetwork()).chainId),
      verifyingContract: forwarder.target,
    };
    const types = {
      ForwardRequest: [
        { name: "from", type: "address" },
        { name: "to", type: "address" },
        { name: "value", type: "uint256" },
        { name: "gas", type: "uint256" },
        { name: "nonce", type: "uint256" },
        { name: "data", type: "bytes" },
        { name: "validUntilTime", type: "uint256" },
      ],
    };
    const message = {
      from: owner.address,
      to: JST_V21_Proxy.target,
      value: 0,
      gas: 1000000,
      nonce: nonce.toString(),
      data: data,
      validUntilTime: deadline,
    };

    console.log("Domain:", domain);
    console.log("Message:", message);

    const signature = await owner.signTypedData(domain, types, message);
    const splitSig = ethers.Signature.from(signature);

    console.log("Signature  :", signature);
    console.log("Signature v:", splitSig.v);
    console.log("Signature r:", splitSig.r);
    console.log("Signature s:", splitSig.s);

    const EIP712_DOMAIN_TYPE =
      "EIP712Domain(string name,string version,uint256 chainId,address verifyingContract)";
    const GENERIC_PARAMS =
      "address from,address to,uint256 value,uint256 gas,uint256 nonce,bytes data,uint256 validUntilTime";
    const REQUEST_TYPE = "ForwardRequest(" + GENERIC_PARAMS + ")";
    const requestTypeHash = ethers.keccak256(ethers.toUtf8Bytes(REQUEST_TYPE));
    const abi = ethers.AbiCoder.defaultAbiCoder();
    const domainValue = abi.encode(
      ["bytes32", "bytes32", "bytes32", "uint256", "address"],
      [
        ethers.keccak256(ethers.toUtf8Bytes(EIP712_DOMAIN_TYPE)),
        ethers.keccak256(ethers.toUtf8Bytes(domainName)),
        ethers.keccak256(ethers.toUtf8Bytes(domainVersion)),
        parseInt((await ethers.provider.getNetwork()).chainId),
        forwarder.target,
      ]
    );
    const domainSeparator = ethers.keccak256(domainValue);

    // execute transfer via forwarder
    await forwarder
      .connect(relayer)
      .execute(message, domainSeparator, requestTypeHash, "0x", signature);

    const ownerBalAfter = await JST_V21_Proxy.balanceOf(owner.address);
    const receiptBalAfter = await JST_V21_Proxy.balanceOf(recipient.address);

    log_balance("owner      ", ownerBalAfter);
    log_balance("recipient  ", receiptBalAfter);

    expect(receiptBalAfter).to.equal(
      weiAmount,
      "The balance of the recipient does not match the expected value."
    );
  });
});
