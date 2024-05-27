// -------------------LIB------------------ //
const { sleepForSeconds } = require("./common/localUtil");
const { getAddressByCardId } = require("./common/registryUtil");
const {
  _entry,
  getParkingStatusByAddress,
  getBalanceInParkingPaymentByUserAddress,
} = require("./common/parkPayUtil");
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
  const token_addr = TOKEN_CA;
  const web3_alchemy = getWeb3Alchemy();

  // step 4-1q : check cardId which is not used
  console.log(
    "step 4-1q : check cardId which is not used--------------------------"
  );
  try {
    const res = await getAddressByCardId(cardId);
    if (res === "0x0000000000000000000000000000000000000000") {
      console.log("cardId is NOT registerd");
      return {
        statusCode: 400,
        body: JSON.stringify({
          errorType: "CardIdError",
          errorMessage: "cardId is NOT registerd",
        }),
      };
    } else if (!res) {
      console.error("Error: Invalid card ID");
      return {
        statusCode: 500,
        body: JSON.stringify({
          errorType: "InternalError",
          errorMessage: "Error checking card ID",
        }),
      };
    }

    from_addr = res;
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

  // step 4-1B1 : check the parking status
  console.log("step 4-1B1 : check the parking status-----------------------");
  try {
    const parkingStatus = await getParkingStatusByAddress(from_addr);
    console.log("_getRegistry:parkingStatus::", parkingStatus.isParked);
    if (!parkingStatus.isParked) {
      console.log("The car has not parked yet.");
      return {
        statusCode: 400,
        body: JSON.stringify({
          errorType: "ParkingStatusError",
          errorMessage: "The car has not parked yet",
        }),
      };
    }
  } catch (error) {
    console.error("Error checking parking status: ", error);
    return {
      statusCode: 500,
      body: JSON.stringify({
        errorType: "InternalError",
        errorMessage: "Error checking parking status",
      }),
    };
  }

  /*
  // step 4-1B2 : check balance for user_addr in ParkingPayment
  console.log("step 4-1B2 : check balance for user_addr in ParkingPayment-----------------------");
  const amount = 30;
  const weiAmount = await web3_alchemy.utils.toWei(amount.toString(), "ether");
  let balanceInParkingPayment = 0;
  try {
    balanceInParkingPayment = await getBalanceInParkingPaymentByUserAddress(from_addr, token_addr);
    console.log("Entry::balanceInParkingPayment::", balanceInParkingPayment);
    if (balanceInParkingPayment === null || balanceInParkingPayment < weiAmount) {
      console.log("Insufficient balance in ParkingPayment.");
      return {
        statusCode: 400,
        body: JSON.stringify({
          errorType: "BalanceError",
          errorMessage: "Insufficient balance in ParkingPayment",
        }),
      };
    }
  } catch (error) {
    console.error("Error checking balance in ParkingPayment: ", error);
    return {
      statusCode: 500,
      body: JSON.stringify({
        errorType: "InternalError",
        errorMessage: "Error checking balance in ParkingPayment",
      }),
    };
  }
  */

  return from_addr;
}

module.exports = {
  getRegistryByCard,
};
