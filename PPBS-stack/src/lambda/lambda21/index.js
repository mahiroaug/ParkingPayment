//'use strict';

// -------------------LIB------------------ //
const GetterEngine = require("lib/21A_getterRegistry.js");
const QueueEngine = require("lib/21Q_QueueEngine.js");

// -------------------ENVIRONMENT------------------ //
const path_name01 = "/Deposit";

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
      const { cardId } = JSON.parse(event.body);
      const from_addr = await GetterEngine.getRegistry(cardId);
      console.log("21A_getterRegistry::from_addr:", from_addr);

      const resQueue = await QueueEngine.sendSQSMessage(from_addr);
      console.log("21Q_QueueEngine::resQueue:", resQueue);

      responseBody = {
        message: "request is received",
        result: {
          cardId: cardId,
          from_addr: from_addr,
          queue: resQueue,
        },
      };

      break;
  }

  console.log("2x::responseBody:", responseBody);

  return {
    headers,
    statusCode: 201,
    body: JSON.stringify(responseBody),
  };
};
