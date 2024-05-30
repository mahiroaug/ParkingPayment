require("dotenv").config({ path: ".env" });

const fs = require("fs");
const path = require("path");
const { Web3 } = require("web3");
const { ethers } = require("ethers");

//const { inspect } = require('util');
const {
  FireblocksSDK,
  PeerType,
  TransactionOperation,
  TransactionStatus,
} = require("fireblocks-sdk");
const {
  FireblocksWeb3Provider,
  ChainId,
} = require("@fireblocks/fireblocks-web3-provider");
//const { sign } = require('crypto');
const { createAlchemyWeb3 } = require("@alch/alchemy-web3");

// -------------------COMMON----------------------- //
//// common environment

const vaultsRaw = require("../.env.vaults");
const { exit, addListener } = require("process");
const parkingOwners = vaultsRaw.parkingOwners;

const chainId = ChainId.POLYGON_AMOY; // Polygon Testnet(amoy)
const rpcUrl = process.env.POLYGON_RPC_URL;
const EXPLOERE = process.env.EXPLOERE;

//// token
const TOKEN_CA = process.env.TOKENPROXY_CA;
const TOKEN_ABI =
  require("../artifacts/contracts/V21/JST_V21.sol/JST_V21.json").abi;

//// parking payment
const PP_CA = process.env.PARKINGPAYMENTPROXY_CA;
const PP_ABI =
  require("../artifacts/contracts/ParkingPayment/ParkingPaymentV2.sol/ParkingPayment.json").abi;
const PO_ADDR = process.env.FIREBLOCKS_VID_PARKOWNER_ADDR;

// -------------------FIREBLOCKS------------------- //
//// fireblocks - SDK
const fb_apiSecret = fs.readFileSync(
  path.resolve("fireblocks_secret_SIGNER.key"),
  "utf8"
);
const fb_apiKey = process.env.FIREBLOCKS_API_KEY_SIGNER;
const fb_base_url = process.env.FIREBLOCKS_URL;
const fireblocks = new FireblocksSDK(fb_apiSecret, fb_apiKey, fb_base_url);
const assetId = process.env.FIREBLOCKS_ASSET_ID;

//// fireblocks - web3 provider - signer account
const CO_ADDR = process.env.FIREBLOCKS_VID_CONTRACTOWNER_ADDR;
const fb_vaultId = process.env.FIREBLOCKS_VID_CONTRACTOWNER;
const eip1193Provider = new FireblocksWeb3Provider({
  privateKey: fb_apiSecret,
  apiKey: fb_apiKey,
  vaultAccountIds: fb_vaultId,
  chainId: chainId,
  rpcUrl: rpcUrl,
});
const web3 = new Web3(eip1193Provider);

//// alchemy
const alchemyHTTPS = process.env.ALCHEMY_HTTPS;
const web3_alchemy = createAlchemyWeb3(alchemyHTTPS);
const parkingPayment_alc = new web3_alchemy.eth.Contract(PP_ABI, PP_CA);

/////////////////////////////////////////
////// send functions ///////////////////
/////////////////////////////////////////

const sendTx = async (_to, _tx, _signer, _gasLimit) => {
  // check toAddress
  const toAddress = web3_alchemy.utils.toChecksumAddress(_to);
  console.log(" toAddress:", toAddress);

  // gasLimit
  const setGasLimit = _gasLimit;
  console.log(" setGasLimit:", setGasLimit);

  // gasPrice
  const gasPrice = await web3_alchemy.eth.getGasPrice();
  const gasPriceInGwei = await web3_alchemy.utils.fromWei(gasPrice, "gwei");
  console.log(" gasPrice:", gasPrice, "(", gasPriceInGwei, "Gwei)");

  // estimate max Transaction Fee
  const estimateMaxTxFee = setGasLimit * gasPrice;
  const estimateMaxTxFeeETH = await web3_alchemy.utils.fromWei(
    estimateMaxTxFee.toString(),
    "ether"
  );
  console.log(
    ` estimate MAX Tx Fee:${estimateMaxTxFee} (${estimateMaxTxFeeETH} ${assetId})`
  );

  // gasHex
  const gasHex = await web3_alchemy.utils.toHex(setGasLimit);
  console.log(` gasHex: ${gasHex}`);

  // dataABI
  const dataABI = _tx.encodeABI();
  console.log(`dataABI: ${dataABI}`);

  const createReceipt = await web3.eth
    .sendTransaction({
      to: toAddress,
      from: _signer,
      data: dataABI,
      gas: gasHex,
    })
    .once("transactionHash", (txhash) => {
      console.log(` Send transaction ...`);
      console.log(` ${EXPLOERE}/tx/${txhash}`);
    });
  console.log(
    ` Tx successful with hash: ${createReceipt.transactionHash} in block ${createReceipt.blockNumber}`
  );

  return createReceipt;
};

async function sleepForSeconds(amount) {
  console.log(`Sleeping for ${amount} seconds...`);
  await new Promise((r) => setTimeout(r, amount * 1000)); // milliseconds
  console.log(`${amount} seconds have passed!`);
}

/////////////////////////////////////////
////// main functions ///////////////////
/////////////////////////////////////////

(async () => {
  /*
  console.log("---------ADD PARKING OWNERS---------");
  for (i = 1; i < parkingOwners.length; i++) {
    const vaultName = parkingOwners[i].name;
    const vaultId = parkingOwners[i].vaultId;
    const addr = parkingOwners[i].address;

    const tx = parkingPayment_alc.methods.addParkingOwner(addr);
    const receipt = await sendTx(PP_CA, tx, CO_ADDR, 2000000);

    console.log(
      `index: ${i}, vaultId: ${vaultId}, name:${vaultName} address: ${addr}, addParkingOwner pushed`
    );
    sleepForSeconds(20);
  }
*/

  console.log("---------CHANGE PP RATE---------");

  //check rate
  const beforRate = await parkingPayment_alc.methods.ratePerMinute().call();
  console.log(`before ratePerMinute: ${beforRate.toString()}`);

  const etherString = "1";
  weiPerMinute = await ethers.parseEther(etherString);
  const tx = parkingPayment_alc.methods.setParkingRate(weiPerMinute);
  const receipt = await sendTx(PP_CA, tx, CO_ADDR, 2000000);

  console.log(`weiPerMinute set to: ${weiPerMinute.toString()}`);

  //check rate
  const afterRate = await parkingPayment_alc.methods.ratePerMinute().call();
  console.log(`new ratePerMinute: ${afterRate.toString()}`);
})().catch((error) => {
  console.log(error);
});
