//'use strict';

// -------------------LIB------------------ //
const registEngine = require("lib/12CD_registIDmintPPC.js");

// -------------------ENVIRONMENT------------------ //

// -------------------handler------------ //
exports.handler = async (event) => {
  const msg = event.Records[0].body;
  const queue = event.Records[0].eventSourceARN;

  console.log("msg:", msg);
  console.log("queue:", queue);

  const json = JSON.parse(msg);
  console.log("json:", json);

  const cardId = json.cardId;
  const address = json.address;
  console.log("cardId:", cardId);
  console.log("address:", address);

  await registEngine.registIDmintPPC(cardId, address);
};
