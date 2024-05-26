async function sleepForSeconds(amount) {
  console.log(`Sleeping for ${amount} seconds...`);
  await new Promise((r) => setTimeout(r, amount * 1000)); // milliseconds
  console.log(`${amount} seconds have passed!`);
}

module.exports = {
  sleepForSeconds,
};
