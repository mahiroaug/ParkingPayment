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
      // process1 create vault and regist DB
      const { cardId, name } = JSON.parse(event.body);
      const resVault = await CreateEngine.createVaultAndRegistDB(cardId, name);
      console.log("11AB_createVregistDB::resVault:", resVault);

      if (resVault.statusCode === 400 || resVault.statusCode === 500) {
        return {
          headers,
          statusCode: resVault.statusCode,
          body: JSON.stringify({
            message:
              resVault.statusCode === 400
                ? "Bad Request"
                : "Internal Server Error",
            details: JSON.parse(resVault.body),
          }),
        };
      }

      // process2 send SQS message
      const resQueue = await QueueEngine.sendSQSMessage(
        cardId,
        resVault.address
      );
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
