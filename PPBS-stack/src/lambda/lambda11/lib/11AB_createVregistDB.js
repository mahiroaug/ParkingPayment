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
//// token
const TOKEN_CA = process.env.TOKENPROXY_CA;
const TOKEN_ABI = require("lib/contracts/V21/JST_V21.sol/JST_V21.json").abi;

//// registry
const REGISTRY_CA = process.env.NFCADDRESSREGISTRYPROXY_CA;
const REGISTRY_ABI =
  require("lib/contracts/NFCAddressRegistry/NFCAddressRegistry.sol/NFCAddressRegistry.json").abi;

// -------------------COMMON----------------------- //
const region = process.env.AWS_REGION;
//// GSN
const apiKey = process.env.API_GATEWAY_APIKEY;
const apiUrl = process.env.API_GATEWAY_URL;
const apiUrl_registVault = `${apiUrl}/vaults/bulkInsert`;

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
let token_alc;

// -------------------initializer-------------------- //
async function init_ENV() {
  try {
    // -------------------FIREBLOCKS SECRET KEY------------------- //
    console.log("region: ", region);
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
    registry_alc = new web3_alchemy.eth.Contract(REGISTRY_ABI, REGISTRY_CA);
    token_alc = new web3_alchemy.eth.Contract(TOKEN_ABI, TOKEN_CA);
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

async function _createVaultAccounts(assetId, vaultAccountNamePrefix) {
  let vaultRes;
  let vault;
  let vaultWallet;

  vaultRes = await fireblocks.createVaultAccount(vaultAccountNamePrefix.toString());
  vault = {
    vaultName: vaultRes.name,
    vaultID: vaultRes.id,
  };
  vaultWallet = await fireblocks.createVaultAsset(Number(vault.vaultID), assetId);
  return { vault, vaultWallet };
}

async function _createVaultAsset(vaultId, assetId) {
  const Res = await fireblocks.createVaultAsset(vaultId, assetId);
  return Res;
}

async function createVault(assetId, accountName, tokenId) {
  const { vault, vaultWallet } = await _createVaultAccounts(assetId, accountName);
  await _createVaultAsset(vault.vaultID, tokenId);

  console.log(
    `{vaultName: ${accountName}, vaultID: ${vault.vaultID}, address: ${vaultWallet.address}},`
  );

  resVault = {
    vaultId: vault.vaultID,
    name: accountName,
    address: vaultWallet.address,
  };

  return resVault;
}

async function bulkInsertVault(vault) {
  const requestParam = {
    vaultId: vault.vaultId,
    name: vault.name,
    address: vault.address,
  };
  console.log("bulkInsertVault:requestParam::", requestParam);

  try {
    const response = await axios.post(apiUrl_registVault, requestParam, {
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey,
      },
    });
    console.log(`Request:: Status Code: ${response.status}`);
    //console.log("--response:", response);

    return response;
  } catch (error) {
    console.error(`Request:: Error: ${error.message}`);
  }
}

async function getAddressByCardId(cardId) {
  try {
    console.log(`getAddressByCardId::registry.methods.getId : cardId=${cardId}`);
    const result = await registry_alc.methods.getMapAddress(cardId).call();
    //const result = await registry.methods.idMap(cardId).call();
    console.log(`result type: ${typeof result}`);
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

/////////////////////////////////////////
////// public functions /////////////////
/////////////////////////////////////////

async function createVaultAndRegistDB(cardId, name) {
  await init_ENV();

  // step 1-1q : check cardId which is not used
  console.log("step 1-1q : check cardId which is not used--------------------------");
  try {
    const res = await getAddressByCardId(cardId);
    if (res !== "0x0000000000000000000000000000000000000000") {
      console.log("cardId is already used");
      return {
        statusCode: 400,
        body: JSON.stringify({
          errorType: "CardIdError",
          errorMessage: "Card ID is already used",
        }),
      };
    }
  } catch (error) {
    console.error("Error checking card ID: ", error);
    return {
      statusCode: 500,
      body: JSON.stringify({
        errorType: "InternalError",
        errorMessage: "Error checking card ID",
      }),
    };
  }

  // step 1-1A : create vault
  console.log("step 1-1A : create vault--------------------------------------------");
  const resVault = await createVault(BASE_ASSET_ID, name, TOKEN_ASSET_ID);
  console.log("createVaultAndMint:resVault::", resVault);
  await sleepForSeconds(0.2);

  // step 1-1B : vaults bulk insert
  console.log("step 1-1B : vaults bulk insert--------------------------------------");
  const resInsert = await bulkInsertVault(resVault);
  console.log("createVaultAndMint:resInsert::", resInsert.data);

  return resVault;
}

module.exports = {
  createVaultAndRegistDB,
};
