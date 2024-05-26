// load modules ---------------------------------
const SecretsManager = require("./secretsManager_v3");
const { FireblocksSDK } = require("fireblocks-sdk");
const region = process.env.AWS_REGION;

// variables -----------------------------------
let isEnvInitialized = false;
let fireblocks;

// initializer ---------------------------------
async function fireblocksSDK_ENV() {
  if (isEnvInitialized) {
    console.log(`fireblocksSDK_ENV: already initialized`);
    return;
  }

  try {
    const fb_apiSecret_secretName = "fireblocks_secret_SIGNER";
    const fb_apiSecret_secret = await SecretsManager.getSecret(fb_apiSecret_secretName, region);
    console.log(`${fb_apiSecret_secretName} : ${fb_apiSecret_secret.slice(0, 40)}`);

    // Fireblocks SDK
    const fb_apiSecret = fb_apiSecret_secret;
    const fb_apiKey = process.env.FIREBLOCKS_API_KEY_SIGNER;
    const fb_base_url = process.env.FIREBLOCKS_URL;
    fireblocks = new FireblocksSDK(fb_apiSecret, fb_apiKey, fb_base_url);

    isEnvInitialized = true;
  } catch (error) {
    console.error("Error fireblocksSDK_ENV: ", error);
  }
}

module.exports = {
  fireblocksSDK_ENV,
  getFBSDK: () => fireblocks,
  getFBSDKIsEnvInitialized: () => isEnvInitialized,
};
