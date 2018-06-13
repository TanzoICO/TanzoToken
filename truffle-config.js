const Web3 = require("web3");
const web3 = new Web3();
const WalletProvider = require("truffle-wallet-provider");
const Wallet = require('ethereumjs-wallet');

var privateNetPrivateKey = new Buffer("", "hex")
var privateNetWallet = Wallet.fromPrivateKey(privateNetPrivateKey);
var privateNetProvider = new WalletProvider(privateNetWallet, "http://10.128.1.248:8545");

var mainNetPrivateKey = new Buffer("", "hex")
var mainNetWallet = Wallet.fromPrivateKey(mainNetPrivateKey);
var mainNetProvider = new WalletProvider(mainNetWallet, "https://mainnet.infura.io/");

module.exports = {
  networks: {
    development: {
      host: "127.0.0.1",
      port: 8545,
      network_id: "*"
    },
    parity: {
      host: "10.128.1.78",
      port: 8545,
      network_id: "*"
    },
    privatenet: {
      provider: privateNetProvider,
      gas: 4600000,
      gasPrice: web3.toWei("30", "gwei"),
      network_id: "15"
    },
    mainnet: {
      provider: mainNetProvider,
      gas: 7984340,
      gasPrice: web3.toWei("30", "gwei"),
      network_id: "1"
    },
    coverage: {
      host: "localhost",
      network_id: "*",
      port: 8555,         // <-- If you change this, also set the port option in .solcover.js.
      gas: 0xfffffffffff, // <-- Use this high gas value
      gasPrice: 0x01      // <-- Use this low gas price
    }
  },
  solc: {
    optimizer: {
      enabled: true,
      runs: 200
    }
  },
  mocha: {
    useColors: true
  }
};
