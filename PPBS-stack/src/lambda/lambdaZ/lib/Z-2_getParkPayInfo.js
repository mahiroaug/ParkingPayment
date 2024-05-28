// -------------------LIB------------------ //
const { sleepForSeconds } = require("./common/localUtil");
const { getAddressByCardId } = require("./common/registryUtil");
const {
  _entry,
  _exit,
  getParkingStatusByAddress,
  getBalanceInParkingPaymentByUserAddress,
  getDesignatedParkingOwnerByUserAddress,
  getLastDepoitTimeByUserAddress,
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

async function InfoParkingStatusByAddress(address) {
  if (!getIsEnvInitialized()) {
    await init_ENV();
  }
  let parkingStatus = await getParkingStatusByAddress(address);
  if (parkingStatus) {
    const { isParked, entryTime, tokenAddress } = parkingStatus;
    let entryTime_str = "";
    if (entryTime > 0) {
      const date = new Date(entryTime * 1000);
      entryTime_str = date.toLocaleString();
    }
    parkingStatus = {
      isParked,
      entryTime,
      entryTime_str,
      tokenAddress,
    };
  }

  return parkingStatus;
}

async function InfoParkingUserDepositBalanceByAddress(address) {
  if (!getIsEnvInitialized()) {
    await init_ENV();
  }
  const web3_alchemy = getWeb3Alchemy();

  const depositBalance = await getBalanceInParkingPaymentByUserAddress(address, TOKEN_CA);
  const depositBalanceETHER = await web3_alchemy.utils.fromWei(depositBalance, "ether");
  return { PPC: depositBalanceETHER };
}

async function InfoParkingDesignatedOwnerByAddress(address) {
  if (!getIsEnvInitialized()) {
    await init_ENV();
  }
  const designatedOwner = await getDesignatedParkingOwnerByUserAddress(address);
  return designatedOwner;
}

async function InfoParkingLastDepositTimeByAddress(address) {
  if (!getIsEnvInitialized()) {
    await init_ENV();
  }
  const lastDepositTime = await getLastDepoitTimeByUserAddress(address, TOKEN_CA);
  let lastDepositTime_str = "";
  if (lastDepositTime > 0) {
    const date = new Date(lastDepositTime * 1000);
    lastDepositTime_str = date.toLocaleString();
  }
  console.log(`InfoParkingLastDepositTimeByAddress::lastDepositTime_str::`, lastDepositTime_str);
  return {
    lastDepositTime,
    lastDepositTime_str,
  };
}

async function getAccountBalancePPC(address) {
  if (!getIsEnvInitialized()) {
    console.log("getAccountBalancePPC: init_ENV launch");
    await init_ENV();
  }
  const web3_alchemy = getWeb3Alchemy();
  const token_alc = getTokenAlc();

  console.log(`Account: ${address}`);

  // native Balance
  const balance = await web3_alchemy.eth.getBalance(address);
  const balanceETHER = await web3_alchemy.utils.fromWei(balance, "ether");
  console.log(`Native Balance : ${balanceETHER} ${assetId}`);

  // token Balance
  const coinBalance = await token_alc.methods.balanceOf(address).call();
  const coinBalanceETHER = await web3_alchemy.utils.fromWei(coinBalance, "ether");
  console.log(`Token Balance: ${coinBalanceETHER} ${TOKEN_ASSET_ID}`);

  return {
    MATIC: balanceETHER,
    PPC: coinBalanceETHER,
  };
}

module.exports = {
  InfoParkingStatusByAddress,
  InfoParkingUserDepositBalanceByAddress,
  InfoParkingDesignatedOwnerByAddress,
  InfoParkingLastDepositTimeByAddress,
  getAccountBalancePPC,
};
