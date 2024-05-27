// -------------------LIB------------------ //
const { SQSClient, SendMessageCommand } = require("@aws-sdk/client-sqs");

// -------------------ENVIRONMENT------------------ //
const SQS4x_URL = process.env.SQS4x_URL;
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
async function _sendSQSMessage(from_addr) {
  // lane 1-8
  const source = from_addr;
  const Lane = (parseInt(source.slice(-1), 16) % 8) + 1;
  const messageGroupId = `QueueGroup4x_${Lane}`;

  const message = {
    from_addr: from_addr,
  };

  const params = {
    QueueUrl: SQS4x_URL,
    MessageBody: JSON.stringify(message),
    MessageGroupId: messageGroupId,
  };

  console.log("SQS4x:: Sending message:", params);
  if (!params.QueueUrl || !params.MessageBody || !params.MessageGroupId) {
    console.error(
      "SQS4x:: Error: Missing required parameters in message params"
    );
    return false;
  }

  try {
    const data = await sqsClient.send(new SendMessageCommand(params));
    console.log("SQS4x:: Message sent:", data);
    return data.MessageId;
  } catch (err) {
    console.error("SQS4x:: Error sending message:", err);
    return false;
  }
}

async function sendSQSMessage(from_addr) {
  await init_ENV_SQS();
  return await _sendSQSMessage(from_addr);
}

module.exports = {
  sendSQSMessage,
};
