// -------------------LIB------------------ //
const SecretsManager = require("lib/secretsManager_v3.js");
const fs = require("fs");
const path = require("path");
const axios = require("axios");
const { Web3 } = require("web3");
const { createAlchemyWeb3 } = require("@alch/alchemy-web3");
const { FireblocksSDK } = require("fireblocks-sdk");
const { FireblocksWeb3Provider, ChainId } = require("@fireblocks/fireblocks-web3-provider");

// -------------------CONTRACT------------------ //
const region = process.env.AWS_REGION;

//// token
const TOKEN_CA = process.env.TOKENPROXY_CA;
const TOKEN_ABI = require("lib/contracts/V21/JST_V21.sol/JST_V21.json").abi;

//// registry
const REGISTRY_CA = process.env.NFCADDRESSREGISTRYPROXY_CA;
const REGISTRY_ABI =
  require("lib/contracts/NFCAddressRegistry/NFCAddressRegistry.sol/NFCAddressRegistry.json").abi;

//// parking payment
const PP_CA = process.env.PARKINGPAYMENTPROXY_CA;
const PP_ABI = require("lib/contracts/ParkingPayment/ParkingPaymentV2.sol/ParkingPayment.json").abi;

// -------------------COMMON----------------------- //

///// vaults
const SO_ADDR = process.env.FIREBLOCKS_VID_SERVICEOWNER_ADDR;
const SO_ID = process.env.FIREBLOCKS_VID_SERVICEOWNER;

//// fireblocks
const chainId = ChainId.POLYGON_AMOY; // Polygon Testnet(amoy)
const rpcUrl = process.env.POLYGON_RPC_URL;
const BASE_ASSET_ID = process.env.FIREBLOCKS_ASSET_ID;
const TOKEN_ASSET_ID = process.env.FIREBLOCKS_ASSET_ID_MYTOKEN;
const assetId = BASE_ASSET_ID;

//// explorer
const EXPLOERE = process.env.EXPLOERE;

// -------------------definition-------------------- //
let fireblocks;
let web3;
let registry;
let web3_alchemy;
let registry_alc;
let parkingPayment_alc;
let token_alc;

// -------------------initializer-------------------- //
async function init_ENV() {
  try {
    // -------------------FIREBLOCKS SECRET KEY------------------- //
    const fb_apiSecret_secretName = "fireblocks_secret_SIGNER";
    const fb_apiSecret_secret = await SecretsManager.getSecret(fb_apiSecret_secretName, region);
    console.log(`${fb_apiSecret_secretName} : ${fb_apiSecret_secret.slice(0, 40)}`);

    // -------------------FIREBLOCKS------------------- //
    //// fireblocks - SDK
    const fb_apiSecret = fb_apiSecret_secret;
    const fb_apiKey = process.env.FIREBLOCKS_API_KEY_SIGNER;
    const fb_base_url = process.env.FIREBLOCKS_URL;
    fireblocks = new FireblocksSDK(fb_apiSecret, fb_apiKey, fb_base_url);

    //// fireblocks - web3 provider - service owner
    const fb_vaultId = SO_ID;
    const eip1193Provider = new FireblocksWeb3Provider({
      privateKey: fb_apiSecret,
      apiKey: fb_apiKey,
      vaultAccountIds: fb_vaultId,
      chainId: chainId,
      rpcUrl: rpcUrl,
    });
    web3 = new Web3(eip1193Provider);
    registry = new web3.eth.Contract(REGISTRY_ABI, REGISTRY_CA);

    //// alchemy
    const alchemyHTTPS = process.env.ALCHEMY_HTTPS;
    web3_alchemy = createAlchemyWeb3(alchemyHTTPS);
    token_alc = new web3_alchemy.eth.Contract(TOKEN_ABI, TOKEN_CA);
    parkingPayment_alc = new web3_alchemy.eth.Contract(PP_ABI, PP_CA);
  } catch (error) {
    console.error("Error init_ENV: ", error);
  }
}
/////////////////////////////////////////
////// send functions ///////////////////
/////////////////////////////////////////

/////////////////////////////////////////
////// tool function ///////////////////
/////////////////////////////////////////

async function getAddressByCardId(cardId) {
  try {
    console.log(`getAddressByCardId::registry.methods.getId : cardId=${cardId}`);
    if (!cardId) {
      console.error("getAddressByCardId:: Error: cardId is null or undefined");
      return null;
    }
    const result = await registry.methods.getMapAddress(cardId).call();
    console.log(`getAddressByCardId::result::`, result);

    return result;
  } catch (error) {
    console.error(`getAddressByCardId:: Error: ${error.message}`);
  }
}

async function sleepForSeconds(amount) {
  console.log(`Sleeping for ${amount} seconds...`);
  await new Promise((r) => setTimeout(r, amount * 1000)); // milliseconds
  console.log(`${amount} seconds have passed!`);
}

async function getAccountBalance(address) {
  console.log(`Account: ${address}`);

  // native Balance
  const balance = await web3_alchemy.eth.getBalance(address);
  console.log(`${assetId} Balance : ${web3_alchemy.utils.fromWei(balance, "ether")} ${assetId}`);

  // token Balance
  const coinBalance = await token_alc.methods.balanceOf(address).call();
  //const coinBalance_fb = await token.methods.balanceOf(address).call();
  //console.log('object type alchemy is ', typeof coinBalance, ', fb is ', typeof coinBalance_fb);

  const coinName = await token_alc.methods.name().call();
  const coinSymbol = await token_alc.methods.symbol().call();

  console.log(
    `${coinName} Balance: ${web3_alchemy.utils.fromWei(coinBalance, "ether")} ${coinSymbol}`
  );
}

async function getAllowance(owner_addr, spender_addr) {
  const coinSymbol = await token_alc.methods.symbol().call();
  const allowance = await token_alc.methods.allowance(owner_addr, spender_addr).call();
  console.log(`Allowance: ${allowance} ${coinSymbol} (from ${owner_addr} to ${spender_addr})`);
}

/////////////////////////////////////////
////// public functions /////////////////
/////////////////////////////////////////

async function _getRegistry01(cardId) {
  // step 1-1A : search from_addr
  console.log("step 1-1A : search from_addr-----------------------");
  const from_addr = await getAddressByCardId(cardId);
  console.log("_getRegistry01:from_addr::", from_addr);
  await sleepForSeconds(0.2);

  return from_addr;
}

/////////////////////////////////////////
////// public functions /////////////////
/////////////////////////////////////////

async function getRegistry(cardId) {
  await init_ENV();

  const from_addr = await _getRegistry01(cardId);
  return from_addr;
}

module.exports = {
  getRegistry,
};
