require("dotenv").config({ path: ".env" });
const { ethers, upgrades } = require("hardhat");

async function main() {
  const TokenOwner = process.env.FIREBLOCKS_VID_CONTRACTOWNER_ADDR;
  const domainName = process.env.DOMAIN_SEPARATOR_NAME;
  const domainVersion = process.env.DOMAIN_SEPARATOR_VERSION;

  console.log("TokenOwner address = ", TokenOwner);
  console.log("domainName =         ", domainName);
  console.log("domainVersion =      ", domainVersion);

  //const FORWARDER_CA = process.env.FORWARDER_CA;

  //-----------------------------------------------------------------
  // TokenDelegator
  //-----------------------------------------------------------------
  const DelegatorFactory = await ethers.getContractFactory(
    "contracts/V21/TokenDelegator_V21.sol:TokenDelegator"
  );
  const delegator = await DelegatorFactory.deploy();
  await delegator.waitForDeployment();
  console.log("delegator deployed to:    ", delegator.target);

  //-----------------------------------------------------------------
  // Forwarder
  //-----------------------------------------------------------------
  const Forwarder = await ethers.getContractFactory("contracts/V21/Forwarder_V21.sol:Forwarder");
  const forwarder = await Forwarder.deploy();
  await forwarder.waitForDeployment();
  console.log("Forwarder deployed to:    ", forwarder.target);
  const tx = await forwarder.registerDomainSeparator(domainName, domainVersion);
  await tx.wait();
  console.log("DomainSeparator registered");

  // set FORWARDER_CA
  const FORWARDER_CA = forwarder.target;

  //-----------------------------------------------------------------
  // JSTv21_Token
  //-----------------------------------------------------------------
  const Token = await ethers.getContractFactory("contracts/V21/JST_V21.sol:JST_V21");

  //-----------------------------------------------------------------
  // ERC1967 Proxy
  //-----------------------------------------------------------------
  console.log("Deploying Token...");
  const token_Proxy = await upgrades.deployProxy(Token, [TokenOwner], {
    initializer: "initialize",
    constructorArgs: [FORWARDER_CA],
    kind: "uups",
  });
  await token_Proxy.waitForDeployment();
  console.log("token addr = ", token_Proxy.target);

  // check
  const trustedForwarder = await token_Proxy.trustedForwarder();
  console.log("Token_Proxy trustedForwarder = ", trustedForwarder);
  const x = await token_Proxy.balanceOf(TokenOwner);
  console.log("initial TokenOwner balance is ", x.toString());
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
