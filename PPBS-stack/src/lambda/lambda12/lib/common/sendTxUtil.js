const {
  init_ENV,
  getIsEnvInitialized,
  getWeb3,
  getWeb3Alchemy,
  assetId,
  EXPLOERE,
} = require("./initENV");

/////////////////////////////////////////
////// send functions ///////////////////
/////////////////////////////////////////

/**
 * Function to send a transaction
 * @param {string} _to - Recipient address
 * @param {object} _tx - Transaction object
 * @param {string} _signer - Signer address
 * @param {number} _gasLimit - Gas limit
 * @returns {object} Transaction receipt
 */
const sendTx = async ({ _to, _tx, _signer, _gasLimit }) => {
  console.log(`sentTx::sendTx::to:${_to}::signer:${_signer}::gasLimit:${_gasLimit}::tx:${_tx}`);

  if (!getIsEnvInitialized()) {
    console.log("sendTx::init_ENV launch");
    await init_ENV();
  }
  const web3 = getWeb3();
  const web3_alchemy = getWeb3Alchemy();

  // check toAddress
  const toAddress = web3_alchemy.utils.toChecksumAddress(_to);
  console.log(" toAddress:", toAddress);
  const signerAddress = web3_alchemy.utils.toChecksumAddress(_signer);
  console.log(" signerAddress:", signerAddress);

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
      from: signerAddress,
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

module.exports = {
  sendTx,
};
