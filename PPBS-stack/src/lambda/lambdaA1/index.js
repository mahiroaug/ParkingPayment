//'use strict';

// -------------------LIB------------------ //
const GetterEngine = require("./lib/A1A_getAddr");
const QueueEngine = require("./lib/A1Q_QueueEngine");

// -------------------ENVIRONMENT------------------ //
const path_name01 = "/PPC/mint";

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
      // process1 get registry and check parking status and deposit balance
      const { cardId } = JSON.parse(event.body);
      const from_addr = await GetterEngine.getRegistryByCard(cardId);
      console.log("31A_getterRegistry::from_addr:", from_addr);

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

      // process2 send SQS message
      const resQueue = await QueueEngine.sendSQSMessage(from_addr);
      console.log("31Q_QueueEngine::resQueue:", resQueue);

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

  console.log("3x::responseBody:", responseBody);

  return {
    headers,
    statusCode: 201,
    body: JSON.stringify(responseBody),
  };
};
