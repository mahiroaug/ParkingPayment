require("dotenv").config({ path: ".env" });

const fs = require("fs");
const path = require("path");
const axios = require("axios");
const { Web3 } = require("web3");
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
const { createAlchemyWeb3 } = require("@alch/alchemy-web3");

// -------------------COMMON----------------------- //
//// GSN
const apiKey = process.env.API_GATEWAY_APIKEY;
const apiUrl = process.env.API_GATEWAY_URL;
const apiUrl_registVault = `${apiUrl}/vaults/bulkInsert`;
const apiUrl_ERC2771 = `${apiUrl}/raw/token/ERC2771`;
const apiUrl_ERC2612Permit = `${apiUrl}/raw/token/ERC2612Permit`;
const DOMAIN_NAME = process.env.DOMAIN_SEPARATOR_PARAM_NAME_TOKEN;
const DOMAIN_VERSION = process.env.DOMAIN_SEPARATOR_PARAM_VERSION_TOKEN;
const DOMAIN_VERIFYINGCONTRACT = process.env.TOKENPROXY_CA;

///// vaults
const vaultsRaw = require("../.env.vaults");
const minters = vaultsRaw.minters;

//// token
const TOKEN_CA = process.env.TOKENPROXY_CA;
const TOKEN_ABI =
  require("../artifacts/contracts/V21/JST_V21.sol/JST_V21.json").abi;

//// explorer
const EXPLOERE = process.env.EXPLOERE;

//// fireblocks
const chainId = ChainId.POLYGON_AMOY; // Polygon Testnet(amoy)
const rpcUrl = process.env.POLYGON_RPC_URL;
const BASE_ASSET_ID = process.env.FIREBLOCKS_ASSET_ID;
const TOKEN_ASSET_ID = process.env.FIREBLOCKS_ASSET_ID_MYTOKEN;

// -------------------FIREBLOCKS------------------- //
//// fireblocks - SDK
const fb_apiSecret = fs.readFileSync(
  path.resolve("fireblocks_secret_SIGNER.key"),
  "utf8"
);
const fb_apiKey = process.env.FIREBLOCKS_API_KEY_SIGNER;
const fb_base_url = process.env.FIREBLOCKS_URL;
const fireblocks = new FireblocksSDK(fb_apiSecret, fb_apiKey, fb_base_url);

//// alchemy
const alchemyHTTPS = process.env.ALCHEMY_HTTPS;
const web3_alchemy = createAlchemyWeb3(alchemyHTTPS);
const token = new web3_alchemy.eth.Contract(TOKEN_ABI, TOKEN_CA);

/////////////////////////////////////////
////// tool function ///////////////////
/////////////////////////////////////////

async function _createVaultAccounts(assetId, vaultAccountNamePrefix) {
  let vaultRes;
  let vault;
  let vaultWallet;

  vaultRes = await fireblocks.createVaultAccount(
    vaultAccountNamePrefix.toString()
  );
  vault = {
    vaultName: vaultRes.name,
    vaultID: vaultRes.id,
  };
  vaultWallet = await fireblocks.createVaultAsset(
    Number(vault.vaultID),
    assetId
  );
  return { vault, vaultWallet };
}

async function _createVaultAsset(vaultId, assetId) {
  const Res = await fireblocks.createVaultAsset(vaultId, assetId);
  return Res;
}

async function createVault(assetId, accountName, tokenId) {
  const { vault, vaultWallet } = await _createVaultAccounts(
    assetId,
    accountName
  );
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

async function mintToken(target_addr, amount) {
  // from address (minter address)
  const source = target_addr;
  const minerIndex = parseInt(source.slice(-1), 16) % 8;
  const from_addr = minters[minerIndex].address;

  // to address (token address)
  const to_addr = TOKEN_CA;

  // data
  const weiAmount = web3_alchemy.utils.toWei(amount.toString(), "ether");
  const data = token.methods.mint(target_addr, weiAmount);

  // set request param
  const requestParam = {
    from_addr: from_addr,
    to_addr: to_addr,
    data: data.encodeABI(),
  };

  console.log("mintToken:requestParam::", requestParam);

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

async function sleepForSeconds(amount) {
  console.log(`Sleeping for ${amount} seconds...`);
  await new Promise((r) => setTimeout(r, amount * 1000)); // milliseconds
  console.log(`${amount} seconds have passed!`);
}

/////////////////////////////////////////
////// public functions /////////////////
/////////////////////////////////////////

async function createVaultAndMint(cardId, name) {
  // step 1-1A : create vault
  console.log(
    "step 1-1A : create vault--------------------------------------------"
  );
  const resVault = await createVault(BASE_ASSET_ID, name, TOKEN_ASSET_ID);
  console.log("createVaultAndMint:resVault::", resVault);
  await sleepForSeconds(4);

  // step 1-1B : vaults bulk insert
  console.log(
    "step 1-1B : vaults bulk insert--------------------------------------"
  );
  const resInsert = await bulkInsertVault(resVault);
  console.log("createVaultAndMint:resInsert::", resInsert.data);
  await sleepForSeconds(4);

  // step 1-1C : mint token
  console.log(
    "step 1-1C : mint token----------------------------------------------"
  );
  const resApi = await mintToken(resVault.address, 1000);
  console.log("createVaultAndMint:resApi::", resApi.data);
  await sleepForSeconds(2);
}

/////////////////////////////////////////
////// main functions /////////////////
/////////////////////////////////////////

(async () => {
  await createVaultAndMint("id-123456789", "testName0008");

  console.log("Done!");
})().catch((e) => {
  console.error(`Failed: ${e}`);
  exit(-1);
});
