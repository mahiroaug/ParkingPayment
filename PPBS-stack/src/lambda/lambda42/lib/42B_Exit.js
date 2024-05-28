// -------------------LIB------------------ //
const { sleepForSeconds } = require("./common/localUtil");
const { getAddressByCardId } = require("./common/registryUtil");
const {
  _exit,
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
////// tool function ///////////////////
/////////////////////////////////////////

/////////////////////////////////////////
////// public functions /////////////////
/////////////////////////////////////////

async function _ExitExecute(requsetParam) {
  const { from_addr, park_addr } = requsetParam;

  // step 4-2B : exit
  console.log("step 4-2B : exit--------------------------");
  const resApi1B = await _exit(from_addr, park_addr);
  console.log(`_ExitExecute:permitSpender:: ${resApi1B}`);
  await sleepForSeconds(60);

  console.log("_ExitExecute::from_addr::", from_addr, "--->>>Get Balance");
  await getAccountBalance(from_addr);
  console.log("_ExitExecute::PP_CA::", PP_CA, "--->>>Get Balance");
  await getAccountBalance(PP_CA);
  await getAllowance(from_addr, PP_CA);
}

/////////////////////////////////////////
////// public functions /////////////////
/////////////////////////////////////////

async function ExitExecute(from_addr) {
  if (!getIsEnvInitialized()) {
    await init_ENV();
  }

  // park address(parking owner address)
  const source = from_addr;
  const poIndex = parseInt(source.slice(-1), 16) % 8;
  const po_addr = parkingOwners[poIndex].address;

  // set request param
  const requestParam = {
    from_addr: from_addr,
    park_addr: po_addr,
  };

  // check requestParam
  console.log("ExitExecute:requestParam::", requestParam);
  if (!requestParam.from_addr || !requestParam.park_addr) {
    console.error("ExitExecute: Error - Missing required parameters in requestParam");
    return;
  }

  // call Deposit02
  await _ExitExecute(requestParam);
}

module.exports = {
  ExitExecute,
};
