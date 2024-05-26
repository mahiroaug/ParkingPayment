const {
  init_ENV,
  getIsEnvInitialized,
  getWeb3Alchemy,
  getTokenAlc,
  assetId,
} = require("./initENV");

async function getAccountBalance(address) {
  if (!getIsEnvInitialized()) {
    console.log("getAccountBalance: init_ENV launch");
    await init_ENV();
  }
  const web3_alchemy = getWeb3Alchemy();
  const token_alc = getTokenAlc();

  console.log(`Account: ${address}`);

  // native Balance
  const balance = await web3_alchemy.eth.getBalance(address);
  console.log(`${assetId} Balance : ${web3_alchemy.utils.fromWei(balance, "ether")} ${assetId}`);

  // token Balance
  const coinBalance = await token_alc.methods.balanceOf(address).call();
  const coinName = await token_alc.methods.name().call();
  const coinSymbol = await token_alc.methods.symbol().call();

  console.log(
    `${coinName} Balance: ${web3_alchemy.utils.fromWei(coinBalance, "ether")} ${coinSymbol}`
  );
}

async function getAllowance(owner_addr, spender_addr) {
  // Call init_ENV only if token_alc is not defined
  if (!getIsEnvInitialized()) {
    console.log("getAccountBalance: init_ENV launch");
    await init_ENV();
  }
  const token_alc = getTokenAlc();
  const coinSymbol = await token_alc.methods.symbol().call();
  const allowance = await token_alc.methods.allowance(owner_addr, spender_addr).call();
  console.log(`Allowance: ${allowance} ${coinSymbol} (from ${owner_addr} to ${spender_addr})`);
}

module.exports = {
  getAccountBalance,
  getAllowance,
};
