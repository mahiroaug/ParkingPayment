//'use strict';

// -------------------LIB------------------ //
const GetterEngine = require("./lib/Z-1_getAddr");
const InfoEngine = require("./lib/Z-2_getParkPayInfo");

// -------------------ENVIRONMENT------------------ //
const path_name01 = "/Info/getAddr";
const path_name02 = "/Info/getParkPayInfo";

exports.handler = async (event) => {
  console.log("event:", event);
  console.log("path:", event.path);
  const path = event.path;

  const headers = {
    "Access-Control-Allow-Headers": "Content-Type",
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "OPTIONS,POST,GET",
  };

  // preFlight -----------------------------------------------
  // process1 get registry and check parking status and deposit balance
  const { cardId } = JSON.parse(event.body);
  const from_addr = await GetterEngine.getRegistryByCard(cardId);
  console.log("Z-1_getterRegistry::from_addr:", from_addr);

  if (from_addr.statusCode === 400 || from_addr.statusCode === 500) {
    return {
      headers,
      statusCode: from_addr.statusCode,
      body: JSON.stringify({
        message: from_addr.statusCode === 400 ? "Bad Request" : "Internal Server Error",
        details: JSON.parse(from_addr.body),
      }),
    };
  }

  // switch
  let responseBody;
  switch (path) {
    case path_name01: // getAddr
      responseBody = {
        message: `response for your request: ${path_name01}`,
        result: {
          cardId: cardId,
          from_addr: from_addr,
        },
      };
      break;

    case path_name02: // getParkPayInfo
      const parkingStatus = await InfoEngine.InfoParkingStatusByAddress(from_addr);
      const depositBalance = await InfoEngine.InfoParkingUserDepositBalanceByAddress(from_addr);
      const designatedOwner = await InfoEngine.InfoParkingDesignatedOwnerByAddress(from_addr);
      const lastDepositTime = await InfoEngine.InfoParkingLastDepositTimeByAddress(from_addr);
      const accountBalance = await InfoEngine.getAccountBalancePPC(from_addr);

      responseBody = {
        message: `response for your request: ${path_name02}`,
        result: {
          cardId: cardId,
          from_addr: from_addr,
          accountBalance: accountBalance,
          depositBalance: depositBalance,
          designatedOwner: designatedOwner,
          lastDepositTime: lastDepositTime,
          parkingStatus: parkingStatus,
        },
      };
      break;

    default:
      // return for bad request
      return {
        headers,
        statusCode: 400,
        body: JSON.stringify({
          message: "Bad Request",
          details: "Invalid path",
        }),
      };
      break;
  }

  console.log("Zx::responseBody:", responseBody);

  return {
    headers,
    statusCode: 201,
    body: JSON.stringify(responseBody),
  };
};
