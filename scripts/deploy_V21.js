require("dotenv").config({ path: ".env" });
const hre = require("hardhat");

async function main() {
  const TokenOwner = process.env.FIREBLOCKS_VAULT_ACCOUNT_ID_CONTRACTOWNER_ADDR;

  const domainName = process.env.DOMAIN_SEPARATOR_PARAM_NAME;
  const domainVersion = process.env.DOMAIN_SEPARATOR_PARAM_VERSION;

  let forwarder;
  let token;
  let erc1967Proxy;
  let delegator;
  let JST_V21_Proxy;

  console.log("TokenOwner address =      ", TokenOwner);

  // Deploy TokenDelegator
  const DelegatorFactory = await ethers.getContractFactory(
    "contracts/V21/TokenDelegator_V21.sol:TokenDelegator"
  );
  delegator = await DelegatorFactory.deploy();
  await delegator.waitForDeployment();
  console.log("delegator deployed to:    ", delegator.target);

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
  const data = ImplementContract.interface.encodeFunctionData("initialize", [
    TokenOwner,
  ]);
  erc1967Proxy = await ERC1967Proxy.deploy(token.target, data);
  await erc1967Proxy.waitForDeployment();
  console.log("erc1967Proxy deployed to: ", erc1967Proxy.target);
  JST_V21_Proxy = await ethers.getContractAt("JST_V21", erc1967Proxy.target);
  console.log("token Proxy address =   ", JST_V21_Proxy.target);

  const x = await JST_V21_Proxy.balanceOf(TokenOwner);
  console.log("initial TokenOwner balance is ", x.toString());
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
