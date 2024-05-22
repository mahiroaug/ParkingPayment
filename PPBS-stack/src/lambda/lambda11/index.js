//'use strict';

// -------------------LIB------------------ //
const CreateEngine = require("lib/11AB_createVregistDB.js");
const QueueEngine = require("lib/11Q_QueueEngine.js");

// -------------------ENVIRONMENT------------------ //
const path_name01 = "/CreateVandM";

exports.handler = async (event) => {
  console.log("event:", event);
  console.log("path:", event.path);
  const path = event.path;

  const headers = {
    "Access-Control-Allow-Headers": "Content-Type",
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "OPTIONS,POST,GET",
  };

  let responseBody;

  switch (path) {
    // default only -----------------------------------------------
    case path_name01:
    default:
      const { cardId, name } = JSON.parse(event.body);
      const resVault = await CreateEngine.createVaultAndRegistDB(name);
      console.log("11AB_createVregistDB::resVault:", resVault);

      const resQueue = await QueueEngine.sendSQSMessage(cardId, resVault.address);
      console.log("11AB_createVregistDB::resQueue:", resQueue);

      responseBody = {
        message: "request is received",
        result: {
          cardId: cardId,
          name: resVault.name,
          vaultId: resVault.vaultId,
          address: resVault.address,
          queue: resQueue,
        },
      };

      break;
  }

  console.log("1x::responseBody:", responseBody);

  return {
    headers,
    statusCode: 201,
    body: JSON.stringify(responseBody),
  };
};
