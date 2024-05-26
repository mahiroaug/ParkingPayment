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
////// tool function ///////////////////
/////////////////////////////////////////

/////////////////////////////////////////
////// public functions /////////////////
/////////////////////////////////////////

async function _EntryExecute(requsetParam) {
  const { from_addr, park_addr, token_addr } = requsetParam;

  // step 3-2B : entry
  console.log("step 3-2B : entry--------------------------");
  const resApi1B = await _entry(from_addr, token_addr, park_addr);
  console.log("Deposit:permitSpender:: PASS");
  await sleepForSeconds(60);

  console.log("Deposit::from_addr::", from_addr, "--->>>Get Balance");
  await getAccountBalance(from_addr);
  console.log("Deposit::PP_CA::", PP_CA, "--->>>Get Balance");
  await getAccountBalance(PP_CA);
  await getAllowance(from_addr, PP_CA);
}

/////////////////////////////////////////
////// public functions /////////////////
/////////////////////////////////////////

async function EntryExecute(from_addr) {
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
    token_addr: TOKEN_CA,
  };

  // check requestParam
  console.log("EntryExecute:requestParam::", requestParam);
  if (!requestParam.from_addr || !requestParam.park_addr || !requestParam.token_addr) {
    console.error("EntryExecute: Error - Missing required parameters in requestParam");
    return;
  }

  // call Deposit02
  await _EntryExecute(requestParam);
}

module.exports = {
  EntryExecute,
};
