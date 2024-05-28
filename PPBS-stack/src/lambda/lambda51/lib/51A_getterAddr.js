// -------------------LIB------------------ //
const { sleepForSeconds } = require("./common/localUtil");
const { getAddressByCardId, registCardId } = require("./common/registryUtil");
const { getAccountBalance, getAllowance } = require("./common/alchemyUtil");
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
////// public functions /////////////////
/////////////////////////////////////////

async function getRegistryByCard(cardId) {
  if (!getIsEnvInitialized()) {
    await init_ENV();
  }
  let from_addr;

  // step 2-1q : check cardId which is not used
  console.log("step 2-1q : check cardId which is not used--------------------------");
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
    } else if (res === "0x0000000000000000000000000000000000000000") {
      console.log("cardId is not used");
      return {
        statusCode: 400,
        body: JSON.stringify({
          errorType: "CardIdError",
          errorMessage: "Card ID is NOT used",
        }),
      };
    } else {
      console.log("cardId linked address: ", res);
      from_addr = res;
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
  return from_addr;
}

module.exports = {
  getRegistryByCard,
};
