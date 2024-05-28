// -------------------LIB------------------ //
const { sleepForSeconds } = require("./common/localUtil");
const { getAddressByCardId } = require("./common/registryUtil");
const { getAccountBalance, getAllowance } = require("./common/alchemyUtil");
const {
  _entry,
  getParkingStatusByAddress,
  getBalanceInParkingPaymentByUserAddress,
  getDesignatedParkingOwnerByUserAddress,
} = require("./common/parkPayUtil");
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

// -------------------ENVIRONMENT------------------ //
let web3_alchemy;
let parkingPayment_alc;

/////////////////////////////////////////
////// tool function ///////////////////
/////////////////////////////////////////

async function _withdraw(from_addr, token_addr) {
  // deposit -----------------
  const data = parkingPayment_alc.methods.withdrawRemainingFunds(from_addr, token_addr);

  const requestParam = {
    from_addr: from_addr,
    to_addr: PP_CA,
    data: data.encodeABI(),
  };
  console.log("_deposit:requestParam::", requestParam);

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

/////////////////////////////////////////
////// public functions /////////////////
/////////////////////////////////////////

async function _Withdraw02(requsetParam) {
  const { from_addr, token_addr } = requsetParam;

  // step 2-1C : deposit
  console.log("step 5-1C : withdraw-------------------------------");
  const resApi1C = await _withdraw(from_addr, token_addr);
  console.log("Deposit:deposit::resApi::", resApi1C);
  await sleepForSeconds(60);

  console.log("Deposit::from_addr::", from_addr, "--->>>Get Balance");
  await getAccountBalance(from_addr);
  console.log("Deposit::PP_CA::", PP_CA, "--->>>Get Balance");
  await getAccountBalance(PP_CA);
  await getAllowance(from_addr, PP_CA);
}

async function _CheckParkPayment(requsetParam) {
  const { from_addr, park_addr, token_addr, amount } = requsetParam;

  // step 2-2D: check parking payment
  console.log("step 2-2D: check parking payment-------------------------");
  const designatedParkingOwner = await getDesignatedParkingOwnerByUserAddress(from_addr);
  console.log("_CheckParkPayment:designatedParkingOwner::", designatedParkingOwner);
  const balanceInParkingPayment = await getBalanceInParkingPaymentByUserAddress(
    from_addr,
    token_addr
  );
  console.log("_CheckParkPayment:balanceInParkingPayment::", balanceInParkingPayment);
}

/////////////////////////////////////////
////// public functions /////////////////
/////////////////////////////////////////

async function Withdraw(from_addr) {
  if (!getIsEnvInitialized()) {
    await init_ENV();
  }
  web3_alchemy = getWeb3Alchemy();
  parkingPayment_alc = getParkingPaymentAlc();

  // set request param
  const requestParam = {
    from_addr: from_addr,
    token_addr: TOKEN_CA,
  };

  // check requestParam
  console.log("Withdraw:requestParam::", requestParam);
  if (
    !requestParam.from_addr ||
    !requestParam.park_addr ||
    !requestParam.token_addr ||
    !requestParam.amount
  ) {
    console.error("Withdraw: Error - Missing required parameters in requestParam");
    return;
  }

  // call Deposit02
  await _Withdraw02(requestParam);

  // check parking payment
  await _CheckParkPayment(requestParam);
}

module.exports = {
  Withdraw,
};
