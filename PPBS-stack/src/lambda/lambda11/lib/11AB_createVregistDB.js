// -------------------LIB------------------ //
const { sleepForSeconds } = require("./common/localUtil");
const { getAddressByCardId } = require("./common/registryUtil");
const { getAccountBalance, getAllowance } = require("./common/alchemyUtil");
const { fireblocksSDK_ENV, getFBSDK, getFBSDKIsEnvInitialized } = require("./common/fireblocksSDK");
const {
  init_ENV,
  getIsEnvInitialized,

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
  getWeb3,
  getRegistry,
  getParkingPayment,

  // Alchemy
  getWeb3Alchemy,
  getTokenAlc,
  getParkingPaymentAlc,
} = require("./common/initENV");

/////////////////////////////////////////
////// tool function ///////////////////
/////////////////////////////////////////
let fireblocks;

async function _createVaultAccounts(assetId, vaultAccountNamePrefix) {
  let vaultRes;
  let vault;
  let vaultWallet;

  vaultRes = await fireblocks.createVaultAccount(vaultAccountNamePrefix.toString());
  vault = {
    vaultName: vaultRes.name,
    vaultID: vaultRes.id,
  };
  console.log(`_createVaultAccounts::vault::${vault}`);
  vaultWallet = await fireblocks.createVaultAsset(Number(vault.vaultID), assetId);
  return { vault, vaultWallet };
}

async function _createVaultAsset(vaultId, assetId) {
  const Res = await fireblocks.createVaultAsset(vaultId, assetId);
  return Res;
}

async function createVault(assetId, accountName, tokenId) {
  console.log(`createVault:assetId::${assetId}, accountName::${accountName}, tokenId::${tokenId}`);

  const { vault, vaultWallet } = await _createVaultAccounts(assetId, accountName);
  console.log(`createVault: vault::${vault}, vaultWallet::${vaultWallet}`);

  await _createVaultAsset(vault.vaultID, tokenId);

  console.log(
    `{vaultName: ${accountName}, vaultID: ${vault.vaultID}, address: ${vaultWallet.address}},`
  );

  const resVault = {
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

/////////////////////////////////////////
////// public functions /////////////////
/////////////////////////////////////////

async function createVaultAndRegistDB(cardId, name) {
  await init_ENV(SO_ID);
  await fireblocksSDK_ENV();
  fireblocks = getFBSDK();
  console.log("createVaultAndMint::fireblocks::", fireblocks);

  // step 1-1q : check cardId which is not used
  console.log("step 1-1q : check cardId which is not used--------------------------");
  try {
    const res = await getAddressByCardId(cardId);
    if (!res) {
      console.error("Error: Invalid card ID");
      return {
        statusCode: 500,
        body: JSON.stringify({
          errorType: "InternalError",
          errorMessage: "Error checking card ID",
        }),
      };
    } else if (res !== "0x0000000000000000000000000000000000000000") {
      console.log("cardId is already used");
      return {
        statusCode: 400,
        body: JSON.stringify({
          errorType: "CardIdError",
          errorMessage: "Card ID is ALREADY used",
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
