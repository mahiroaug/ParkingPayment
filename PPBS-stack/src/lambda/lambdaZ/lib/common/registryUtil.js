const {
  init_ENV,
  getIsEnvInitialized,
  getRegistry,
  getRegistryAlc,
  REGISTRY_CA,
  SO_ID,
  SO_ADDR,
} = require("./initENV");
const { sendTx } = require("./sendTxUtil");

async function registCardId(cardId, vaultAddr) {
  try {
    console.log(`registCardId::registry.methods.addId : cardId=${cardId}, vaultAddr=${vaultAddr}`);

    if (!getIsEnvInitialized()) {
      console.log(`registCardId::init_ENV launch`);
      await init_ENV(SO_ID);
    }
    const registry = getRegistry();
    const tx = registry.methods.addId(cardId, vaultAddr);

    const requestParam = {
      _to: REGISTRY_CA,
      _tx: tx,
      _signer: SO_ADDR,
      _gasLimit: 1000000,
    };
    console.log(`registCardId::requestParam::`, requestParam);

    //const receipt = await sendTx(REGISTRY_CA, tx, SO_ADDR, 1000000);
    const receipt = await sendTx(requestParam);
    console.log(`registCardId::receipt::`, receipt);

    return receipt;
  } catch (error) {
    console.error(`registCardId:: Error: ${error.message}`);
  }
}

async function getAddressByCardId(cardId) {
  try {
    console.log(`getAddressByCardId::registry.methods.getId : cardId=${cardId}`);
    if (!cardId) {
      console.error("getAddressByCardId:: Error: cardId is null or undefined");
      return null;
    }

    if (!getIsEnvInitialized()) {
      await init_ENV();
    }
    const registry_alc = getRegistryAlc();

    if (!registry_alc) {
      console.error("getAddressByCardId:: Error: web3_alchemy is undefined after init_ENV");
      return null;
    }

    const result = await registry_alc.methods.getMapAddress(cardId).call();
    console.log(`getAddressByCardId::result::`, result);

    return result;
  } catch (error) {
    console.error(`getAddressByCardId:: Error: ${error.message}`);
  }
}

module.exports = {
  getAddressByCardId,
  registCardId,
};
