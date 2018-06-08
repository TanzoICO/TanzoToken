var Tanzo = artifacts.require("TanzoToken");
var MathLib = artifacts.require("SafeMath");

module.exports = function(deployer, network, accounts) {
  // Main account which have the ownable permissions
  var TanzoAcc = accounts[0];

  deployer.deploy(MathLib, {from: TanzoAcc});
  deployer.link(MathLib, Tanzo);
  deployer.deploy(Tanzo, {from: TanzoAcc});
}
