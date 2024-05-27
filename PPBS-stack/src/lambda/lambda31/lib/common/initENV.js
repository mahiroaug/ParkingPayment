// load modules ---------------------------------
const SecretsManager = require("./secretsManager_v3");
const vaultsRaw = require("./.env.vaults");

const TOKEN_ABI = require("./contracts/V21/JST_V21.sol/JST_V21.json").abi;
const REGISTRY_ABI =
  require("./contracts/NFCAddressRegistry/NFCAddressRegistry.sol/NFCAddressRegistry.json").abi;
const PP_ABI =
  require("./contracts/ParkingPayment/ParkingPaymentV2.sol/ParkingPayment.json").abi;

// contracts ------------------------------------
const PP_CA = process.env.PARKINGPAYMENTPROXY_CA;
const TOKEN_CA = process.env.TOKENPROXY_CA;
const REGISTRY_CA = process.env.NFCADDRESSREGISTRYPROXY_CA;

// Fireblocks -----------------------------------
const { Web3 } = require("web3");
const { createAlchemyWeb3 } = require("@alch/alchemy-web3");
const { FireblocksSDK } = require("fireblocks-sdk");
const {
  FireblocksWeb3Provider,
  ChainId,
} = require("@fireblocks/fireblocks-web3-provider");
const region = process.env.AWS_REGION;
const chainId = ChainId.POLYGON_AMOY;
const rpcUrl = process.env.POLYGON_RPC_URL;
const assetId = process.env.FIREBLOCKS_ASSET_ID;
const BASE_ASSET_ID = process.env.FIREBLOCKS_ASSET_ID;
const TOKEN_ASSET_ID = process.env.FIREBLOCKS_ASSET_ID_MYTOKEN;

///// vaults
const parkingOwners = vaultsRaw.parkingOwners;
const minters = vaultsRaw.minters;
const SO_ID = process.env.FIREBLOCKS_VID_SERVICEOWNER;
const SO_ADDR = process.env.FIREBLOCKS_VID_SERVICEOWNER_ADDR;

//// GSN ----------------------------------------
const apiKey = process.env.API_GATEWAY_APIKEY;
const apiUrl = process.env.API_GATEWAY_URL;
const apiUrl_ERC2771 = `${apiUrl}/raw/token/ERC2771`;
const apiUrl_ERC2612Permit = `${apiUrl}/raw/token/ERC2612Permit`;
const apiUrl_registVault = `${apiUrl}/vaults/bulkInsert`;
const DOMAIN_NAME = process.env.DOMAIN_SEPARATOR_NAME_TOKEN;
const DOMAIN_VERSION = process.env.DOMAIN_SEPARATOR_VERSION_TOKEN;
const DOMAIN_VERIFYINGCONTRACT = process.env.TOKENPROXY_CA;

//// explorer
const EXPLOERE = process.env.EXPLOERE;
const axios = require("axios");

//// variables -----------------------------------

// Fireblocks
let fireblocks;
let web3;
let registry;
let parkingPayment;

// Alchemy
let web3_alchemy;
let token_alc;
let registry_alc;
let parkingPayment_alc;

let isEnvInitialized = false;

async function init_ENV(fb_vaultId = SO_ID) {
  if (isEnvInitialized) {
    console.log(`init_ENV: already initialized with VID is ${fb_vaultId}`);
    return;
  }

  try {
    const fb_apiSecret_secretName = "fireblocks_secret_SIGNER";
    const fb_apiSecret_secret = await SecretsManager.getSecret(
      fb_apiSecret_secretName,
      region
    );
    console.log(
      `${fb_apiSecret_secretName} : ${fb_apiSecret_secret.slice(0, 40)}`
    );
    const fb_apiKey = process.env.FIREBLOCKS_API_KEY_SIGNER;

    // web3 provider for Fireblocks
    const eip1193Provider = new FireblocksWeb3Provider({
      privateKey: fb_apiSecret_secret,
      apiKey: fb_apiKey,
      vaultAccountIds: fb_vaultId,
      chainId: chainId,
      rpcUrl: rpcUrl,
    });
    web3 = new Web3(eip1193Provider);
    registry = new web3.eth.Contract(REGISTRY_ABI, REGISTRY_CA);

    // web3 provider for Alchemy
    const alchemyHTTPS = process.env.ALCHEMY_HTTPS;
    web3_alchemy = createAlchemyWeb3(alchemyHTTPS);
    token_alc = new web3_alchemy.eth.Contract(TOKEN_ABI, TOKEN_CA);
    registry_alc = new web3_alchemy.eth.Contract(REGISTRY_ABI, REGISTRY_CA);
    parkingPayment_alc = new web3_alchemy.eth.Contract(PP_ABI, PP_CA);

    isEnvInitialized = true;

    // error handling
  } catch (error) {
    console.error("Error init_ENV: ", error);
  }
}

module.exports = {
  init_ENV,

  // vaults
  parkingOwners,
  minters,
  SO_ID,
  SO_ADDR,

  // contracts
  PP_CA,
  PP_ABI,
  REGISTRY_CA,
  REGISTRY_ABI,
  TOKEN_CA,
  TOKEN_ABI,

  // GSN
  apiKey,
  apiUrl_ERC2771,
  apiUrl_ERC2612Permit,
  apiUrl_registVault,
  DOMAIN_NAME,
  DOMAIN_VERSION,
  DOMAIN_VERIFYINGCONTRACT,

  // explorer
  EXPLOERE,
  axios,

  // Fireblocks
  assetId,
  BASE_ASSET_ID,
  TOKEN_ASSET_ID,
  getWeb3: () => web3,
  getRegistry: () => registry,
  getParkingPayment: () => parkingPayment,

  // Alchemy
  getWeb3Alchemy: () => web3_alchemy,
  getTokenAlc: () => token_alc,
  getRegistryAlc: () => registry_alc,
  getParkingPaymentAlc: () => parkingPayment_alc,

  // isEnvInitialized
  getIsEnvInitialized: () => isEnvInitialized,
};
