// -------------------LIB------------------ //
const { SQSClient, SendMessageCommand } = require("@aws-sdk/client-sqs");

// -------------------ENVIRONMENT------------------ //
const SQSxx_URL = process.env.SQSxx_URL;
const region = process.env.AWS_REGION;

// -------------------global definition------------ //
let sqsClient;

async function init_ENV_SQS() {
  try {
    // -------------------SQS definition------------------ //
    sqsClient = new SQSClient({ region: region });
  } catch (error) {
    console.error("Error init_ENV_SQS: ", error);
  }
}

// SQS:::SEND MESSAGE
async function _sendSQSMessage(cardId, address) {
  // lane 1-8
  const source = address;
  const Lane = (parseInt(source.slice(-1), 16) % 8) + 1;
  const messageGroupId = `QueueGroupxx_${Lane}`;

  const message = {
    cardId: cardId,
    address: address,
  };

  const params = {
    QueueUrl: SQSxx_URL,
    MessageBody: JSON.stringify(message),
    MessageGroupId: messageGroupId,
  };

  console.log("SQSxx:: Sending message:", params);
  if (!params.QueueUrl || !params.MessageBody || !params.MessageGroupId) {
    console.error("SQSxx:: Error: Missing required parameters in message params");
    return false;
  }

  try {
    const data = await sqsClient.send(new SendMessageCommand(params));
    console.log("SQSxx:: Message sent:", data);
    return data.MessageId;
  } catch (err) {
    console.error("SQSxx:: Error sending message:", err);
    return false;
  }
}

async function sendSQSMessage(cardId, address) {
  await init_ENV_SQS();
  return await _sendSQSMessage(cardId, address);
}

module.exports = {
  sendSQSMessage,
};
