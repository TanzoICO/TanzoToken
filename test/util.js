const promisify = inner =>
  new Promise((resolve, reject) =>
    inner((err, res) => {
      if (err) {
        reject(err);
      }
      resolve(res);
    })
);

const getBalance = async addr => {
  const res = await promisify(cb => web3.eth.getBalance(addr, cb));
  return new web3.BigNumber(res);
};

const getGasPrice = () => {
  return promisify(web3.eth.getGasPrice);
}

let lastBalance;
// First call stores the balance sum, second call prints the difference
const measureGas = async accounts => {
  let balanceSum = new web3.BigNumber(0);
  // only checks the first 8 accounts
  for (let i = 0; i <= 7; i++) {
    balanceSum = balanceSum.add(await getBalance(accounts[i]));
  }
  // first run of this function
  if (!lastBalance) {
    lastBalance = balanceSum;
  } else {
    // diff and inform the difference
    console.log(
      "Gas spent on test suite:",
      lastBalance.sub(balanceSum).toString()
    );
    lastBalance = null;
  }
};

module.exports = {
  getBalance,
  getGasPrice,
  measureGas
};
