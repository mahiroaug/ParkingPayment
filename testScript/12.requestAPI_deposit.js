require("dotenv").config({ path: ".env" });

const fs = require("fs");
const path = require("path");
const axios = require("axios");
const { Web3 } = require("web3");
const {
  FireblocksSDK,
  PeerType,
  TransactionOperation,
  TransactionStatus,
} = require("fireblocks-sdk");
const {
  FireblocksWeb3Provider,
  ChainId,
} = require("@fireblocks/fireblocks-web3-provider");
const { createAlchemyWeb3 } = require("@alch/alchemy-web3");

// -------------------COMMON----------------------- //
//// GSN
const apiKey = process.env.API_GATEWAY_APIKEY;
const apiUrl = process.env.API_GATEWAY_URL;
const apiUrl_registVault = `${apiUrl}/vaults/bulkInsert`;
const apiUrl_ERC2771 = `${apiUrl}/raw/token/ERC2771`;
const apiUrl_ERC2612Permit = `${apiUrl}/raw/token/ERC2612Permit`;
const DOMAIN_NAME = process.env.DOMAIN_SEPARATOR_PARAM_NAME_TOKEN;
const DOMAIN_VERSION = process.env.DOMAIN_SEPARATOR_PARAM_VERSION_TOKEN;
const DOMAIN_VERIFYINGCONTRACT = process.env.TOKENPROXY_CA;

///// vaults
const vaultsRaw = require("../.env.vaults");
const minters = vaultsRaw.minters;

//// token
const TOKEN_CA = process.env.TOKENPROXY_CA;
const TOKEN_ABI =
  require("../artifacts/contracts/V21/JST_V21.sol/JST_V21.json").abi;

//// parking payment
const PP_CA = process.env.PARKINGPAYMENT_CA;
const PP_ABI =
  require("../artifacts/contracts/ParkingPayment.sol/ParkingPayment.json").abi;
const PO_ADDR = process.env.FIREBLOCKS_VAULT_ACCOUNT_ID_PARKOWNER_ADDR;

//// explorer
const EXPLOERE = process.env.EXPLOERE;

//// fireblocks
const chainId = ChainId.POLYGON_AMOY; // Polygon Testnet(amoy)
const rpcUrl = process.env.POLYGON_RPC_URL;
const BASE_ASSET_ID = process.env.FIREBLOCKS_ASSET_ID;
const TOKEN_ASSET_ID = process.env.FIREBLOCKS_ASSET_ID_MYTOKEN;

// -------------------FIREBLOCKS------------------- //
//// fireblocks - SDK
const fb_apiSecret = fs.readFileSync(
  path.resolve("fireblocks_secret_SIGNER.key"),
  "utf8"
);
const fb_apiKey = process.env.FIREBLOCKS_API_KEY_SIGNER;
const fb_base_url = process.env.FIREBLOCKS_URL;
const fireblocks = new FireblocksSDK(fb_apiSecret, fb_apiKey, fb_base_url);

//// alchemy
const alchemyHTTPS = process.env.ALCHEMY_HTTPS;
const web3_alchemy = createAlchemyWeb3(alchemyHTTPS);
const token = new web3_alchemy.eth.Contract(TOKEN_ABI, TOKEN_CA);
const parkingPayment = new web3_alchemy.eth.Contract(PP_ABI, PP_CA);

/////////////////////////////////////////
////// tool function ///////////////////
/////////////////////////////////////////

async function _permitSpender(from_addr, token_addr, amount) {
  // permitSpender -----------------
  const nonceStr = await token.methods.nonces(from_addr).call();
  const nonce = parseInt(nonceStr);

  const requestParam = {
    DOMAIN_NAME: DOMAIN_NAME,
    DOMAIN_VERSION: DOMAIN_VERSION,
    DOMAIN_VERIFYINGCONTRACT: token_addr,
    owner_addr: from_addr,
    spender_addr: PP_CA,
    value: amount,
    nonce: nonce,
  };

  console.log("_permitSpender:requestParam::", requestParam);

  try {
    const response = await axios.post(apiUrl_ERC2612Permit, requestParam, {
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey,
      },
    });
    console.log(`Request:: Status Code: ${response.status}`);
    //console.log("--response:", response);

    return response;
  } catch (error) {
    console.error(`Request:: Error: ${error.message}`);
  }
}

async function _deposit(from_addr, po_addr, token_addr, amount) {
  // deposit -----------------
  const data = token.methods.depositTokens(token_addr, amount, po_addr);

  const requestParam = {
    from_addr: from_addr,
    to_addr: PP_CA,
    data: data.encodeABI(),
  };
  console.log("_deposit:requestParam::", requestParam);

  try {
    const response = await axios.post(apiUrl_ERC2771, requestParam, {
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey,
      },
    });
    console.log(`Request:: Status Code: ${response.status}`);
    //console.log("--response:", response);

    return response;
  } catch (error) {
    console.error(`Request:: Error: ${error.message}`);
  }
}

async function sleepForSeconds(amount) {
  console.log(`Sleeping for ${amount} seconds...`);
  await new Promise((r) => setTimeout(r, amount * 1000)); // milliseconds
  console.log(`${amount} seconds have passed!`);
}

/////////////////////////////////////////
////// public functions /////////////////
/////////////////////////////////////////

async function Deposit(cardId, from_addr, po_addr, token_addr, amount) {
  // step 1-1A : search from_addr

  // step 1-1B : permitSpender
  console.log("step 1-1B : permitSpender-------------------------");
  const resApi1B = await _permitSpender(from_addr, token_addr, amount);
  console.log("Deposit:permitSpender::", resApi1B);
  await sleepForSeconds(4);

  // step 1-1C : deposit
  console.log("step 1-1C : deposit-------------------------------");
  const resApi1C = await _deposit(from_addr, po_addr, token_addr, amount);
  console.log("Deposit:deposit::", resApi1C);
  await sleepForSeconds(2);
}

/////////////////////////////////////////
////// main functions /////////////////
/////////////////////////////////////////

(async () => {
  await Deposit({
    cardId: "id-123456789",
    from_addr: null,
    park_addr: PO_ADDR,
    token_addr: TOKEN_CA,
    amount: "1000000000000000000000",
  });

  console.log("Done!");
})().catch((e) => {
  console.error(`Failed: ${e}`);
  exit(-1);
});
