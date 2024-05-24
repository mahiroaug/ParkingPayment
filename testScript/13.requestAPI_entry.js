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
const { FireblocksWeb3Provider, ChainId } = require("@fireblocks/fireblocks-web3-provider");
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
const TOKEN_ABI = require("../artifacts/contracts/V21/JST_V21.sol/JST_V21.json").abi;

//// parking payment
const PP_CA = process.env.PARKINGPAYMENTPROXY_CA;
const PP_ABI =
  require("../artifacts/contracts/ParkingPayment/ParkingPayment.sol/ParkingPayment.json").abi;
const PO_ADDR = process.env.FIREBLOCKS_VAULT_ACCOUNT_ID_PARKOWNER_ADDR;
const PO_ID = process.env.FIREBLOCKS_VAULT_ACCOUNT_ID_PARKOWNER;

//// registry
const REGISTRY_CA = process.env.NFCADDRESSREGISTRYPROXY_CA;
const REGISTRY_ABI =
  require("../artifacts/contracts/NFCAddressRegistry/NFCAddressRegistry.sol/NFCAddressRegistry.json").abi;
const SO_ADDR = process.env.FIREBLOCKS_VAULT_ACCOUNT_ID_SERVICEOWNER_ADDR;
const SO_ID = process.env.FIREBLOCKS_VAULT_ACCOUNT_ID_SERVICEOWNER;

//// explorer
const EXPLOERE = process.env.EXPLOERE;

//// fireblocks
const chainId = ChainId.POLYGON_AMOY; // Polygon Testnet(amoy)
const rpcUrl = process.env.POLYGON_RPC_URL;
const BASE_ASSET_ID = process.env.FIREBLOCKS_ASSET_ID;
const TOKEN_ASSET_ID = process.env.FIREBLOCKS_ASSET_ID_MYTOKEN;
const assetId = BASE_ASSET_ID;

// -------------------FIREBLOCKS------------------- //
//// fireblocks - SDK
const fb_apiSecret = fs.readFileSync(path.resolve("fireblocks_secret_SIGNER.key"), "utf8");
const fb_apiKey = process.env.FIREBLOCKS_API_KEY_SIGNER;
const fb_base_url = process.env.FIREBLOCKS_URL;
const fireblocks = new FireblocksSDK(fb_apiSecret, fb_apiKey, fb_base_url);

//// fireblocks - web3 provider - service owner
const fb_vaultId = PO_ID;
const eip1193Provider = new FireblocksWeb3Provider({
  privateKey: fb_apiSecret,
  apiKey: fb_apiKey,
  vaultAccountIds: fb_vaultId,
  chainId: chainId,
  rpcUrl: rpcUrl,
});
const web3 = new Web3(eip1193Provider);
const registry = new web3.eth.Contract(REGISTRY_ABI, REGISTRY_CA);

//// alchemy
const alchemyHTTPS = process.env.ALCHEMY_HTTPS;
const web3_alchemy = createAlchemyWeb3(alchemyHTTPS);
const token_alc = new web3_alchemy.eth.Contract(TOKEN_ABI, TOKEN_CA);
const parkingPayment_alc = new web3_alchemy.eth.Contract(PP_ABI, PP_CA);

/////////////////////////////////////////
////// send functions ///////////////////
/////////////////////////////////////////

const sendTx = async (_to, _tx, _signer, _gasLimit) => {
  // check toAddress
  const toAddress = web3_alchemy.utils.toChecksumAddress(_to);
  console.log(" toAddress:", toAddress);

  // gasLimit
  const setGasLimit = _gasLimit;
  console.log(" setGasLimit:", setGasLimit);

  // gasPrice
  const gasPrice = await web3_alchemy.eth.getGasPrice();
  const gasPriceInGwei = await web3_alchemy.utils.fromWei(gasPrice, "gwei");
  console.log(" gasPrice:", gasPrice, "(", gasPriceInGwei, "Gwei)");

  // estimate max Transaction Fee
  const estimateMaxTxFee = setGasLimit * gasPrice;
  const estimateMaxTxFeeETH = await web3_alchemy.utils.fromWei(
    estimateMaxTxFee.toString(),
    "ether"
  );
  console.log(` estimate MAX Tx Fee:${estimateMaxTxFee} (${estimateMaxTxFeeETH} ${assetId})`);

  // gasHex
  const gasHex = await web3_alchemy.utils.toHex(setGasLimit);
  console.log(` gasHex: ${gasHex}`);

  // dataABI
  const dataABI = _tx.encodeABI();
  console.log(`dataABI: ${dataABI}`);

  const createReceipt = await web3.eth
    .sendTransaction({
      to: toAddress,
      from: _signer,
      data: dataABI,
      gas: gasHex,
    })
    .once("transactionHash", (txhash) => {
      console.log(` Send transaction ...`);
      console.log(` ${EXPLOERE}/tx/${txhash}`);
    });
  console.log(
    ` Tx successful with hash: ${createReceipt.transactionHash} in block ${createReceipt.blockNumber}`
  );

  return createReceipt;
};

/////////////////////////////////////////
////// tool function ///////////////////
/////////////////////////////////////////

async function _entry(user_addr, token_addr) {
  // entry -----------------

  try {
    console.log(`_entry::user_addr::${user_addr}, token_addr::${token_addr}`);
    const tx = parkingPayment_alc.methods.recordEntry(user_addr, token_addr);
    const receipt = await sendTx(PP_CA, tx, PO_ADDR, 1000000);
    console.log(`_entry::receipt::`, receipt);

    return receipt;
  } catch (error) {
    console.error(`_entry:: Error: ${error.message}`);
  }
}

async function getParkingStatusByAddress(user_addr) {
  try {
    console.log(`getParkingStatusByAddress::parkingPayment.parkingStatus : user_addr=${user_addr}`);
    const result = await parkingPayment_alc.methods.parkingStatus(user_addr).call();
    console.log(`getParkingStatusByAddress::result::`, result);

    return result;
  } catch (error) {
    console.error(`getParkingStatusByAddress:: Error: ${error.message}`);
  }
}

async function getBalanceInParkingPaymentByUserAddress(user_addr, token_addr) {
  try {
    console.log(
      `getBalanceInParkingPaymentByUserAddress::parkingPayment.getBalance : user_addr=${user_addr}`
    );
    const result = await parkingPayment_alc.methods.deposits(user_addr, token_addr).call();
    console.log(`getBalanceInParkingPaymentByUserAddress::result::`, result);

    return result;
  } catch (error) {
    console.error(`getBalanceInParkingPaymentByUserAddress:: Error: ${error.message}`);
  }
}

async function validParkingOwner(parkingOwner) {
  try {
    console.log(`validParkingOwner::parkingPayment. : parkingOwner=${parkingOwner}`);
    const result = await parkingPayment_alc.methods.validParkingOwners(parkingOwner).call();
    console.log(`validParkingOwner::result::`, result);

    return result;
  } catch (error) {
    console.error(`validParkingOwner:: Error: ${error.message}`);
  }
}

async function getAddressByCardId(cardId) {
  try {
    console.log(`getAddressByCardId::registry.methods.getId : cardId=${cardId}`);
    const result = await registry.methods.getMapAddress(cardId).call();
    console.log(`getAddressByCardId::result::`, result);

    return result;
  } catch (error) {
    console.error(`getAddressByCardId:: Error: ${error.message}`);
  }
}

async function sleepForSeconds(amount) {
  console.log(`Sleeping for ${amount} seconds...`);
  await new Promise((r) => setTimeout(r, amount * 1000)); // milliseconds
  console.log(`${amount} seconds have passed!`);
}

async function getAccountBalance(address) {
  console.log(`Account: ${address}`);

  // native Balance
  const balance = await web3_alchemy.eth.getBalance(address);
  console.log(`${assetId} Balance : ${web3_alchemy.utils.fromWei(balance, "ether")} ${assetId}`);

  // token Balance
  const coinBalance = await token_alc.methods.balanceOf(address).call();
  //const coinBalance_fb = await token.methods.balanceOf(address).call();
  //console.log('object type alchemy is ', typeof coinBalance, ', fb is ', typeof coinBalance_fb);

  const coinName = await token_alc.methods.name().call();
  const coinSymbol = await token_alc.methods.symbol().call();

  console.log(
    `${coinName} Balance: ${web3_alchemy.utils.fromWei(coinBalance, "ether")} ${coinSymbol}`
  );
}

async function getAllowance(owner_addr, spender_addr) {
  const coinSymbol = await token_alc.methods.symbol().call();
  const allowance = await token_alc.methods.allowance(owner_addr, spender_addr).call();
  console.log(`Allowance: ${allowance} ${coinSymbol} (from ${owner_addr} to ${spender_addr})`);
}

/////////////////////////////////////////
////// public functions /////////////////
/////////////////////////////////////////

async function Entry(requsetParam) {
  console.log("Entry::requsetParam::", requsetParam);
  const { cardId, token_addr } = requsetParam;
  let user_addr = "";

  // step 3-1Q : validParkingOwner
  console.log("step 3-1Q: validParkingOwner-----------------------");
  try {
    const validParkingOwnerResult = await validParkingOwner(PO_ADDR);
    console.log("Entry::validParkingOwnerResult::", validParkingOwnerResult);
    if (validParkingOwnerResult === false) {
      throw new Error("Error: PO_ADDR is not a valid parking owner.");
    }
  } catch (error) {
    console.error(`Error checking parking owner: ${error.message}`);
    throw error;
  }

  // step 1-1A : search user_addr
  console.log("step 3-1A : search user_addr-----------------------");
  try {
    user_addr = await getAddressByCardId(cardId);
    console.log("Entry:user_addr::", user_addr);
    if (user_addr === "0x0000000000000000000000000000000000000000") {
      throw new Error("Error: user_addr is the zero address.");
    }
  } catch (error) {
    console.error(`Error retrieving user address: ${error.message}`);
    throw error; // Re-throw the error to handle it further up the call stack if necessary
  }
  await sleepForSeconds(1);

  // step 1-1B1 : check balance for user_addr in ParkingPayment
  console.log("step 3-1B1 : check balance for user_addr in ParkingPayment-----------------------");
  const amount = 30;
  const weiAmount = await web3_alchemy.utils.toWei(amount.toString(), "ether");
  let balanceInParkingPayment = 0;
  try {
    balanceInParkingPayment = await getBalanceInParkingPaymentByUserAddress(user_addr, token_addr);
    console.log("Entry::balanceInParkingPayment::", balanceInParkingPayment);
    if (balanceInParkingPayment === null || balanceInParkingPayment < weiAmount) {
      throw new Error("Error: Insufficient balance. Minimum required is 60 PPC.");
    }
  } catch (error) {
    console.error(`Error retrieving or validating balance: ${error.message}`);
    throw error;
  }

  let parkingStatus;

  // step 1-1B2 : check the parking status
  console.log("step 3-1B2 : check the parking status-----------------------");
  parkingStatus = await getParkingStatusByAddress(user_addr);
  console.log("Entry::parkingStatus::", parkingStatus.isParked);
  if (parkingStatus.isParked === true) {
    throw new Error("Error: The user is already parked.");
  }

  console.log("Entry::user_addr::", user_addr, "--->>>Get Balance");
  await getAccountBalance(user_addr);
  console.log("Entry::PP_CA::", PP_CA, "--->>>Get Balance");
  await getAccountBalance(PP_CA);
  await getAllowance(user_addr, PP_CA);

  // step 3-1B : Entry
  console.log("step 3-1C : Entry-------------------------");
  const resApi1B = await _entry(user_addr, token_addr);
  console.log("Entry:: PASS");
  await sleepForSeconds(35);

  // step 3-1C : check parking status
  console.log("step 3-1D : check parking status-------------------------");
  parkingStatus = await getParkingStatusByAddress(user_addr);
  //console.log("Entry::parkingStatus::", parkingStatus);
  await sleepForSeconds(1);

  console.log("-------------------------");
  console.log("Entry::user_addr::", user_addr, "--->>>Get Balance");
  await getAccountBalance(user_addr);
  console.log("Entry::PP_CA::", PP_CA, "--->>>Get Balance");
  await getAccountBalance(PP_CA);
  await getAllowance(user_addr, PP_CA);
}

/////////////////////////////////////////
////// main functions /////////////////
/////////////////////////////////////////

(async () => {
  await Entry({
    cardId: "id-2116",
    token_addr: TOKEN_CA,
  });

  console.log("Done!");
})().catch((e) => {
  console.error(`Failed: ${e}`);
  exit(-1);
});
