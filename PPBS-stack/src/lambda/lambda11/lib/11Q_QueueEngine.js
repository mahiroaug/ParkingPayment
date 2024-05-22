// -------------------LIB------------------ //
const { SQSClient, SendMessageCommand } = require("@aws-sdk/client-sqs");

// -------------------ENVIRONMENT------------------ //
const SQS1x_URL = process.env.SQS1x_URL;
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
  const messageGroupId = "QueueGroup1x";

  const message = {
    cardId: cardId,
    address: address,
  };

  const params = {
    QueueUrl: SQS1x_URL,
    MessageBody: JSON.stringify(message),
    MessageGroupId: messageGroupId,
  };

  console.log("SQS1x:: Sending message:", params);
  if (!params.QueueUrl || !params.MessageBody || !params.MessageGroupId) {
    console.error("SQS1x:: Error: Missing required parameters in message params");
    return false;
  }

  try {
    const data = await sqsClient.send(new SendMessageCommand(params));
    console.log("SQS1x:: Message sent:", data);
    return data.MessageId;
  } catch (err) {
    console.error("SQS1x:: Error sending message:", err);
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
