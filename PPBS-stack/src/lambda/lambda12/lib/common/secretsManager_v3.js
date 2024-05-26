"use strict";

const { GetSecretValueCommand, SecretsManagerClient } = require("@aws-sdk/client-secrets-manager");

class SecretsManager {
  static async getSecret(secret_name, region) {
    console.log("secret_name::", secret_name);

    const config = { region: region };
    const client = new SecretsManagerClient(config);
    let response;

    try {
      response = await client.send(
        new GetSecretValueCommand({
          SecretId: secret_name,
          VersionStage: "AWSCURRENT",
        })
      );
    } catch (error) {
      throw error;
    }

    if (response.SecretString) {
      console.log("response:: SecretString Mode");
      return response.SecretString;
    }

    if (response.SecretBinary) {
      console.log("response:: SecretBinary Mode");
      let buff = new Buffer.from(response.SecretBinary, "base64");
      return await buff.toString("ascii");
    }
  }
}
module.exports = SecretsManager;
