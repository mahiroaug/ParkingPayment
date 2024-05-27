// -------------------LIB------------------ //
const { sleepForSeconds } = require("./common/localUtil");
const { getAddressByCardId, registCardId } = require("./common/registryUtil");
const { getAccountBalance, getAllowance } = require("./common/alchemyUtil");
const {
  init_ENV,
  getIsEnvInitialized,

  // vaults
  parkingOwners,
  minters,
  SO_ID,
  SO_ADDR,

  // contracts
  PP_CA,
  PP_ABI,
  REGISTRY_CA,
  REGISTRY_ABI,
  TOKEN_CA,
  TOKEN_ABI,

  // GSN
  apiKey,
  apiUrl_ERC2771,
  apiUrl_ERC2612Permit,
  apiUrl_registVault,
  DOMAIN_NAME,
  DOMAIN_VERSION,
  DOMAIN_VERIFYINGCONTRACT,

  // explorer
  EXPLOERE,
  axios,

  // Fireblocks
  assetId,
  BASE_ASSET_ID,
  TOKEN_ASSET_ID,
  getWeb3,
  getRegistry,
  getParkingPayment,

  // Alchemy
  getWeb3Alchemy,
  getTokenAlc,
  getParkingPaymentAlc,
} = require("./common/initENV");

/////////////////////////////////////////
////// tool function ///////////////////
/////////////////////////////////////////

async function mintToken(target_addr, amount) {
  console.log(`mintToken:target_addr::${target_addr}, amount::${amount}`);

  if (!getIsEnvInitialized()) {
    console.log("mintToken:initialize ENV");
    await init_ENV();
  }
  const web3_alchemy = getWeb3Alchemy();
  console.log("mintToken:web3_alchemy::", web3_alchemy);
  const token_alc = getTokenAlc();
  console.log("mintToken:token_alc::", token_alc);

  // from address (minter address)
  const source = target_addr;
  const minerIndex = parseInt(source.slice(-1), 16) % 8;
  console.log("mintToken:minerIndex::", minerIndex);
  const from_addr = minters[minerIndex].address;
  console.log("mintToken:from_addr::", from_addr);

  // to address (token address)
  const to_addr = TOKEN_CA;
  console.log(`mintToken:to_addr::${to_addr}`);

  // data
  const weiAmount = web3_alchemy.utils.toWei(amount.toString(), "ether");
  console.log(`mintToken:weiAmount::${weiAmount}`);
  const data = token_alc.methods.mint(target_addr, weiAmount);

  // set request param
  const requestParam = {
    from_addr: from_addr,
    to_addr: to_addr,
    data: data.encodeABI(),
  };

  console.log("mintToken:requestParam::", requestParam);
  if (!requestParam.from_addr || !requestParam.to_addr || !requestParam.data) {
    console.error("Error: Missing required parameters in requestParam");
    return;
  }

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

/////////////////////////////////////////
////// public functions /////////////////
/////////////////////////////////////////

async function registIDmintPPC(cardId, address) {
  await init_ENV(SO_ID);

  // step 1-1C : mint token
  console.log(
    "step 1-1C : mint token----------------------------------------------"
  );
  const resApi = await mintToken(address, 1000);
  console.log("createVaultAndMint:resApi::", resApi.data);
  await sleepForSeconds(60);

  // step 1-1D : regist cardId
  console.log(
    "step 1-1D : regist cardId-------------------------------------------"
  );
  const resTx = await registCardId(cardId, address);
  console.log("createVaultAndMint:resTx:: ", resTx);
  await sleepForSeconds(0.2);

  // step 1-1E : check registry
  console.log(
    "step 1-1E : check registry-----------------------------------------"
  );
  const resTx2 = await getAddressByCardId(cardId);
  console.log("createVaultAndMint:resTx2:: ", resTx2);
  await sleepForSeconds(0.2);
}

module.exports = {
  registIDmintPPC,
};
