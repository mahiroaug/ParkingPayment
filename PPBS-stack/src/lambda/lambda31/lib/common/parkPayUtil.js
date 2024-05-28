const {
  init_ENV,
  getIsEnvInitialized,
  getParkingPaymentAlc,
  PP_CA,
  apiKey,
  axios,
  apiUrl_ERC2771,
} = require("./initENV");

async function _entry(user_addr, token_addr, park_addr) {
  if (!getIsEnvInitialized()) {
    await init_ENV();
  }
  const parkingPayment_alc = getParkingPaymentAlc();

  // entry -----------------
  const data = parkingPayment_alc.methods.recordEntry(user_addr, token_addr);

  const requestParam = {
    from_addr: park_addr,
    to_addr: PP_CA,
    data: data.encodeABI(),
  };
  console.log("_entry:requestParam::", requestParam);

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

async function _exit(user_addr, park_addr) {
  if (!getIsEnvInitialized()) {
    await init_ENV();
  }
  const parkingPayment_alc = getParkingPaymentAlc();

  // exit -----------------
  const data = parkingPayment_alc.methods.recordExit(user_addr);

  const requestParam = {
    from_addr: park_addr,
    to_addr: PP_CA,
    data: data.encodeABI(),
  };
  console.log("_exit:requestParam::", requestParam);

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

async function getParkingStatusByAddress(user_addr) {
  try {
    if (!getIsEnvInitialized()) {
      await init_ENV();
    }
    const parkingPayment_alc = getParkingPaymentAlc();

    console.log(`getParkingStatusByAddress::parkingPayment.parkingStatus : user_addr=${user_addr}`);
    const result = await parkingPayment_alc.methods.parkingStatus(user_addr).call();
    console.log(`getParkingStatusByAddress::result::`, result);

    return result;
  } catch (error) {
    console.error(`getParkingStatusByAddress:: Error: ${error.message}`);
  }
}

async function getBalanceInParkingPaymentByUserAddress(user_addr, token_addr) {
  try {
    if (!getIsEnvInitialized()) {
      await init_ENV();
    }
    const parkingPayment_alc = getParkingPaymentAlc();

    console.log(
      `getBalanceInParkingPaymentByUserAddress::parkingPayment.getBalance : user_addr=${user_addr}`
    );
    const result = await parkingPayment_alc.methods.deposits(user_addr, token_addr).call();
    console.log(`getBalanceInParkingPaymentByUserAddress::result::`, result);

    return result;
  } catch (error) {
    console.error(`getBalanceInParkingPaymentByUserAddress:: Error: ${error.message}`);
  }
}

async function getDesignatedParkingOwnerByUserAddress(user_addr) {
  try {
    if (!getIsEnvInitialized()) {
      await init_ENV();
    }
    const parkingPayment_alc = getParkingPaymentAlc();

    console.log(
      `getDesignatedParkingOwnerByUserAddress::parkingPayment.designatedParkingOwner : user_addr=${user_addr}`
    );
    const result = await parkingPayment_alc.methods.designatedOwner(user_addr).call();
    console.log(`getDesignatedParkingOwnerByUserAddress::result::`, result);

    return result;
  } catch (error) {
    console.error(`getDesignatedParkingOwnerByUserAddress:: Error: ${error.message}`);
  }
}

async function getLastDepoitTimeByUserAddress(user_addr, token_addr) {
  try {
    if (!getIsEnvInitialized()) {
      await init_ENV();
    }
    const parkingPayment_alc = getParkingPaymentAlc();

    console.log(
      `getLastDepoitTimeByUserAddress::parkingPayment.lastDepositTime : user_addr=${user_addr}, token_addr=${token_addr}`
    );
    const result = await parkingPayment_alc.methods.lastDepositTime(user_addr, token_addr).call();
    console.log(`getLastDepoitTimeByUserAddress::result::`, result);

    return result;
  } catch (error) {
    console.error(`getLastDepoitTimeByUserAddress:: Error: ${error.message}`);
  }
}

module.exports = {
  _entry,
  _exit,
  getParkingStatusByAddress,
  getBalanceInParkingPaymentByUserAddress,
  getDesignatedParkingOwnerByUserAddress,
  getLastDepoitTimeByUserAddress,
};
