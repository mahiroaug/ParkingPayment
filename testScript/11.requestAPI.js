require("dotenv").config({ path: ".env" });

const { createAlchemyWeb3 } = require("@alch/alchemy-web3");

// environment variables------------------------------------------
const axios = require("axios");
const apiKey = process.env.API_GATEWAY_APIKEY;
const API_GATEWAY_PATH = process.env.API_GATEWAY_PATH;
const apiUrl = `https://${API_GATEWAY_PATH}.execute-api.ap-northeast-1.amazonaws.com/v1/raw/token/ERC2612Permit`;

// include vaults file
const vaultsRaw = require("../.env.vaults");
const vaults = vaultsRaw.vaults;

const TOKEN_CA = process.env.TOKENPROXY_CA;
const TOKEN_ABI =
  require("../artifacts/contracts/V21/JST_V21.sol/JST_V21.json").abi;

//// alchemy
const alchemyHTTPS = process.env.ALCHEMY_HTTPS;
const web3_alchemy = createAlchemyWeb3(alchemyHTTPS);
const token = new web3_alchemy.eth.Contract(TOKEN_ABI, TOKEN_CA);

// transfer-----------------------------------------------------
async function sendRequest_raw() {
  // payload
  const DOMAIN_SEPARATOR_PARAM_NAME_TOKEN =
    process.env.DOMAIN_SEPARATOR_PARAM_NAME_TOKEN;
  const DOMAIN_SEPARATOR_PARAM_VERSION_TOKEN =
    process.env.DOMAIN_SEPARATOR_PARAM_VERSION_TOKEN;
  const DOMAIN_VERIFYINGCONTRACT = process.env.TOKENPROXY_CA;
  const owner_addr = vaults[0].address;
  const spender_addr = vaults[1].address;

  const amount = 1000;
  const weiAmount = await web3_alchemy.utils.toWei(amount.toString(), "ether");
  const value = weiAmount;

  const nonceStr = await token.methods.nonces(owner_addr).call();
  const nonce = parseInt(nonceStr);

  const payload = {
    DOMAIN_NAME: DOMAIN_SEPARATOR_PARAM_NAME_TOKEN,
    DOMAIN_VERSION: DOMAIN_SEPARATOR_PARAM_VERSION_TOKEN,
    DOMAIN_VERIFYINGCONTRACT: DOMAIN_VERIFYINGCONTRACT,
    owner: owner_addr,
    spender: spender_addr,
    value: value,
    nonce: nonce,
  };
  console.log("payload:: ", payload);

  return;

  try {
    const response = await axios.post(apiUrl, requestData, {
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey,
      },
    });
    console.log(`Request:: Status Code: ${response.status}`);
  } catch (error) {
    console.error(`Request:: Error: ${error.message}`);
  }
}

// main function-------------------------------------------
(async () => {
  console.log("Number of vaults:", vaults.length);

  sendRequest_raw().then(() => {
    console.log("requests sent.");
  });

  // シグナルハンドリングでプロセスを停止
  process.on("SIGINT", () => {
    console.log("Process terminated.");
    process.exit(0);
  });
})().catch((e) => {
  console.error(`Failed: ${e}`);
  exit(-1);
});
