// -------------------LIB------------------ //
const SecretsManager = require("lib/secretsManager_v3.js");
const vaultsRaw = require("lib/.env.vaults");
const fs = require("fs");
const path = require("path");
const axios = require("axios");
const { Web3 } = require("web3");
const { createAlchemyWeb3 } = require("@alch/alchemy-web3");
const { FireblocksSDK } = require("fireblocks-sdk");
const {
  FireblocksWeb3Provider,
  ChainId,
} = require("@fireblocks/fireblocks-web3-provider");

// -------------------CONTRACT------------------ //
const region = process.env.AWS_REGION;
//// token
const TOKEN_CA = process.env.TOKENPROXY_CA;
const TOKEN_ABI = require("lib/contracts/V21/JST_V21.sol/JST_V21.json").abi;

//// registry
const REGISTRY_CA = process.env.NFCADDRESSREGISTRYPROXY_CA;
const REGISTRY_ABI =
  require("lib/contracts/NFCAddressRegistry/NFCAddressRegistry.sol/NFCAddressRegistry.json").abi;

// -------------------COMMON----------------------- //
//// GSN
const apiKey = process.env.API_GATEWAY_APIKEY;
const apiUrl = process.env.API_GATEWAY_URL;
const apiUrl_registVault = `${apiUrl}/vaults/bulkInsert`;
const apiUrl_ERC2771 = `${apiUrl}/raw/token/ERC2771`;

///// vaults
const minters = vaultsRaw.minters;
const SO_ADDR = process.env.FIREBLOCKS_VAULT_ACCOUNT_ID_SERVICEOWNER_ADDR;
const SO_ID = process.env.FIREBLOCKS_VAULT_ACCOUNT_ID_SERVICEOWNER;

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
    const fb_apiSecret_secretName = "fireblocks_secret_SIGNER";
    const fb_apiSecret_secret = await SecretsManager.getSecret(
      fb_apiSecret_secretName,
      region
    );
    console.log(
      `${fb_apiSecret_secretName} : ${fb_apiSecret_secret.slice(0, 40)}`
    );

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

/////////////////////////////////////////
////// tool function ///////////////////
/////////////////////////////////////////

async function mintToken(target_addr, amount) {
  // from address (minter address)
  const source = target_addr;
  const minerIndex = parseInt(source.slice(-1), 16) % 8;
  const from_addr = minters[minerIndex].address;

  // to address (token address)
  const to_addr = TOKEN_CA;

  // data
  const weiAmount = web3_alchemy.utils.toWei(amount.toString(), "ether");
  const data = token_alc.methods.mint(target_addr, weiAmount);

  // set request param
  const requestParam = {
    from_addr: from_addr,
    to_addr: to_addr,
    data: data.encodeABI(),
  };

  console.log("mintToken:requestParam::", requestParam);
  if (!requestParam.from_addr || !requestParam.to_addr || !requestParam.data) {
    console.error("Error: Missing required parameters in requestParam");
    return;
  }

  try {
    const response = await axios.post(apiUrl_ERC2771, requestParam, {
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

async function registCardId(cardId, vaultAddr) {
  try {
    console.log(
      `registCardId::registry.methods.addId : cardId=${cardId}, vaultAddr=${vaultAddr}`
    );
    const tx = registry.methods.addId(cardId, vaultAddr);
    const receipt = await sendTx(REGISTRY_CA, tx, SO_ADDR, 1000000);
    console.log(`registCardId::receipt::`, receipt);

    return receipt;
  } catch (error) {
    console.error(`registCardId:: Error: ${error.message}`);
  }
}

async function getAddressByCardId(cardId) {
  try {
    console.log(
      `getAddressByCardId::registry.methods.getId : cardId=${cardId}`
    );
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

async function registIDmintPPC(cardId, address) {
  await init_ENV();

  // step 1-1C : mint token
  console.log(
    "step 1-1C : mint token----------------------------------------------"
  );
  const resApi = await mintToken(address, 1000);
  console.log("createVaultAndMint:resApi::", resApi.data);
  await sleepForSeconds(60);

  // step 1-1D : regist cardId
  console.log(
    "step 1-1D : regist cardId-------------------------------------------"
  );
  const resTx = await registCardId(cardId, address);
  console.log("createVaultAndMint:resTx:: ", resTx);
  await sleepForSeconds(0.2);

  // step 1-1E : check registry
  console.log(
    "step 1-1E : check registry-----------------------------------------"
  );
  const resTx2 = await getAddressByCardId(cardId);
  console.log("createVaultAndMint:resTx2:: ", resTx2);
  await sleepForSeconds(0.2);
}

module.exports = {
  registIDmintPPC,
};
