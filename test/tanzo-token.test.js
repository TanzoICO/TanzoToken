const assertRevert = require("./helpers/assertRevert");
const debug = require("debug")("tanzo");
const util = require("./util.js");

const TanzoToken = artifacts.require("TanzoTokenMock");

const TOTAL_SUPPLY = 500000000 * (10 ** 18);
const ZERO_ADDRESS = '0x0000000000000000000000000000000000000000';
//Remove the last char from valid address and assign it to SHORT_ADDRESS const
const SHORT_ADDRESS = '0xdb633765ee4ce0745f4582bae8be2b502cee897';

const ONE_TOKEN = 1000000000000000000
const TEN_THOUSAND_TOKENS = 10000 * ONE_TOKEN
const THOUSAND_TOKENS = 1000 * ONE_TOKEN
const HUNDRED_TOKENS = 100 * ONE_TOKEN
const HUNDRED_AND_ONE_TOKENS = 101 * ONE_TOKEN
const FIFTY_TOKENS = 50 * ONE_TOKEN

contract("TanzoToken", function(accounts) {

  before(() => util.measureGas(accounts));
  // after(() => util.measureGas(accounts));

  const eq = assert.equal.bind(assert);
  const owner = accounts[0];
  const acc1 = accounts[1];
  const acc2 = accounts[2];
  const acc3 = accounts[3];

  const gasPrice = 1e11;
  const logEvents= [];
  const pastEvents = [];

  let tanzo;

  before(async function () {
    tanzo = await TanzoToken.new();
    let name = await tanzo.name();
    let symbol = await tanzo.symbol();
    let decimals = await tanzo.decimals();
    let version = await tanzo.version();

    var contractInfo = '';
    contractInfo ="  " + "-".repeat(40);
    contractInfo += "\n  " + "Current date is: " + new Date().toLocaleString("en-US", {timeZone: "UTC"});
    contractInfo += "\n  " + "-".repeat(40);

    contractInfo += "\n  Token Name: " + name
    contractInfo += "     |  Token Symbol: " + symbol
    contractInfo += "\n  Decimals: " + decimals
    contractInfo += "                |  Version: " + version
    contractInfo += "\n  " + "=".repeat(40);

  console.log(contractInfo)
  });

  async function deploy() {
    tanzo = await TanzoToken.new();

    // transfer ownership
    await tanzo.setLimits(0, 1000);
    await tanzo.transferOwnership(owner);
    await tanzo.claimOwnership({from: owner});

    const eventsWatch  = tanzo.allEvents();
    eventsWatch .watch((err, res) => {
      if (err) return;
      pastEvents.push(res);
      debug(">>", res.event, res.args);
    });

    logEvents.push(eventsWatch);
  }

  after(function() {
    logEvents.forEach(ev => ev.stopWatching());
  });

  describe("Initial state", function() {
    before(deploy);

    it("should own contract", async function() {
      const ownerAddress = await tanzo.owner();
      eq(ownerAddress, owner);

      const tokenCount = await tanzo.totalSupply();
      eq(tokenCount.toNumber(), TOTAL_SUPPLY);
    });
  });

  describe('Balance', function() {
    before(deploy);

    describe('when requested account has tokens', function() {
      it('returns amount of tokens', async function() {
        const balance = await tanzo.balanceOf(owner);
        eq(balance.toNumber(), TOTAL_SUPPLY);
      })
    });

    describe('when requested account has no tokens', function() {
      it('returns zero tokens', async function() {
        const balance = await tanzo.balanceOf(acc1);
        eq(balance.toNumber(), 0);
      });
    });
  });

  describe('Transfer', function() {
    before(deploy);

    describe('when the recipient is not the zero address', function () {
      const to = acc2;

      describe('when the sender does not have enough balance', function () {
        const amount = HUNDRED_TOKENS;

        it('reverts', async function () {
          await assertRevert(tanzo.transfer(to, amount, { from: acc1 }));
        });
      });

      describe('when the sender has enough balance', function () {
        const amount = THOUSAND_TOKENS;

        it('transfers the requested amount', async function () {
          await tanzo.transfer(to, amount, { from: owner });

          const senderBalance = await tanzo.balanceOf(owner);
          eq(senderBalance, TOTAL_SUPPLY - amount);

          const recipientBalance = await tanzo.balanceOf(to);
          eq(recipientBalance, amount);
        });

        it('emits a transfer event', async function () {
          const { logs } = await tanzo.transfer(to, amount, { from: owner });

          eq(logs.length, 1);
          eq(logs[0].event, 'Transfer');
          eq(logs[0].args.from, owner);
          eq(logs[0].args.to, to);
          assert(logs[0].args.value.eq(amount));
        });
      });
    });

    describe('when the recipient is the zero address', function () {
      const to = ZERO_ADDRESS;

      it('reverts', async function () {
        await assertRevert(tanzo.transfer(to, THOUSAND_TOKENS, { from: owner }));
      });
    });

    describe('when provide short recipient address', function () {
      const to = SHORT_ADDRESS;

      it('reverts', async function () {
        try {
          await tanzo.transfer(to, THOUSAND_TOKENS, { from: owner });
        }
        catch (err) {
          assert(error.message.search('assert.fail') >= 0);
        }
      });
    });
  });

  describe('Approve', function () {
    before(deploy);

    describe('when the spender is not the zero address', function () {
      const spender = acc2;

      describe('when the sender has enough balance', function () {
        const amount = HUNDRED_TOKENS;

        beforeEach(async function () {
          await tanzo.approve(spender, 0, { from: owner });
        });

        it('emits an approval event', async function () {
          const { logs } = await tanzo.approve(spender, amount, { from: owner });

          eq(logs.length, 1);
          eq(logs[0].event, 'Approval');
          eq(logs[0].args.owner, owner);
          eq(logs[0].args.spender, spender);
          assert(logs[0].args.value.eq(amount));
        });

        describe('when there was no approved amount before', function () {
          it('approves the requested amount', async function () {
            await tanzo.approve(spender, amount, { from: owner });

            const allowance = await tanzo.allowance(owner, spender);
            eq(allowance, amount);
          });
        });

        describe('when the spender had an approved amount', function () {
          beforeEach(async function () {
            await tanzo.approve(spender, 1, { from: owner });
          });

          it('declines approval if the preveious one is not consumed', async function () {
            const allowance = await tanzo.allowance(owner, spender);
            eq(allowance, 1);

            await assertRevert(tanzo.approve(spender, amount, { from: owner }));
          });
        });
      });

    });

    describe('when the spender is the zero address', function () {
      const amount = HUNDRED_TOKENS;
      const spender = ZERO_ADDRESS;

      beforeEach(async function () {
        await tanzo.approve(spender, 0, { from: owner });
      });

      it('approves the requested amount', async function () {
        await tanzo.approve(spender, amount, { from: owner });

        const allowance = await tanzo.allowance(owner, spender);
        eq(allowance, amount);
      });

      it('emits an approval event', async function () {
        const { logs } = await tanzo.approve(spender, amount, { from: owner });

        eq(logs.length, 1);
        eq(logs[0].event, 'Approval');
        eq(logs[0].args.owner, owner);
        eq(logs[0].args.spender, spender);
        assert(logs[0].args.value.eq(amount));
      });
    });
  });

  describe('Transfer from', function () {
    before(deploy);

    const spender = acc1;

    describe('when the recipient is not the zero address', function () {
      const to = acc2;

      describe('when the spender has enough approved balance', function () {
        beforeEach(async function () {
          await tanzo.approve(spender, HUNDRED_TOKENS, { from: owner });
        });

        describe('when the owner has enough balance', function () {
          const amount = HUNDRED_TOKENS;

          it('transfers the requested amount', async function () {
            await tanzo.transferFrom(owner, to, amount, { from: spender });

            const senderBalance = await tanzo.balanceOf(owner);
            eq(senderBalance, TOTAL_SUPPLY - amount);

            const recipientBalance = await tanzo.balanceOf(to);
            eq(recipientBalance, amount);
          });

          it('decreases the spender allowance', async function () {
            await tanzo.transferFrom(owner, to, amount, { from: spender });

            const allowance = await tanzo.allowance(owner, spender);
            assert(allowance.eq(0));
          });

          it('emits a transfer event', async function () {
            const { logs } = await tanzo.transferFrom(owner, to, amount, { from: spender });

            eq(logs.length, 1);
            eq(logs[0].event, 'Transfer');
            eq(logs[0].args.from, owner);
            eq(logs[0].args.to, to);
            assert(logs[0].args.value.eq(amount));
          });
        });

        describe('when the owner does not have enough balance', function () {
          const amount = HUNDRED_AND_ONE_TOKENS;

          it('reverts', async function () {
            await assertRevert(tanzo.transferFrom(owner, to, amount, { from: spender }));
          });
        });
      });

      describe('when the spender does not have enough approved balance', function () {
        beforeEach(async function () {
          await tanzo.approve(spender, 0, { from: owner });
          await tanzo.approve(spender, 99, { from: owner });
        });

        describe('when the owner has enough balance', function () {
          const amount = HUNDRED_TOKENS;

          it('reverts', async function () {
            await assertRevert(tanzo.transferFrom(owner, to, amount, { from: spender }));
          });
        });

        describe('when the owner does not have enough balance', function () {
          const amount = HUNDRED_AND_ONE_TOKENS;

          it('reverts', async function () {
            await assertRevert(tanzo.transferFrom(owner, to, amount, { from: spender }));
          });
        });
      });
    });

    describe('when the recipient is the zero address', function () {
      const amount = TEN_THOUSAND_TOKENS;
      const to = ZERO_ADDRESS;

      beforeEach(async function () {
        await tanzo.approve(spender, 0, { from: owner });
        await tanzo.approve(spender, amount, { from: owner });
      });

      it('reverts', async function () {
        await assertRevert(tanzo.transferFrom(owner, to, amount, { from: spender }));
      });
    });

    describe('when provide short recipient address', function () {
      const amount = TEN_THOUSAND_TOKENS;
      const to = SHORT_ADDRESS;

      beforeEach(async function () {
        await tanzo.approve(spender, 0, { from: owner });
        await tanzo.approve(spender, amount, { from: owner });
      });

      it('reverts', async function () {
        try {
          await (tanzo.transferFrom(owner, to, amount, { from: spender }));
        }
        catch (err) {
          assert(error.message.search('assert.fail') >= 0);
        }
      });
    });
  });

  describe('Claim lost token', function() {
    before(deploy);

    describe('when tokens are transfered to contract\'s address', async function() {
      const amount = HUNDRED_TOKENS;

      before(async function() {
        const to = await tanzo.address;
        await tanzo.transfer(to, amount, {from: owner});
        const contractBalanceBefore = await tanzo.balanceOf(tanzo.address);
        eq(contractBalanceBefore.toNumber(), amount);
      });

      it('should return the tokens to the owner', async function() {
        const to = await tanzo.address;

        await tanzo.claimTokens(to, owner);

        const recipientBalance = await tanzo.balanceOf(owner);
        eq(recipientBalance.toNumber(), TOTAL_SUPPLY);
        const contractBalanceAfter = await tanzo.balanceOf(tanzo.address);
        eq(contractBalanceAfter.toNumber(), 0);
      });
    });
  });

  describe('Freeze and Unfreeze transfers', function() {
    before(deploy);

    describe('owner should be able to freeze and unfreeze transfers', async function() {
      const amount = THOUSAND_TOKENS;
      const to = acc3;

      it('freezes transfers', async function() {
        await tanzo.freezeTransfers();
      });

      it('attempt to transfer funds fails', async function () {
        await assertRevert(tanzo.transfer(to, amount, { from: owner }));

        const senderBalance = await tanzo.balanceOf(owner);
        eq(senderBalance, TOTAL_SUPPLY);

        const recipientBalance = await tanzo.balanceOf(to);
        eq(recipientBalance, 0);
      });

      it('unfreezes transfers', async function () {
        await tanzo.unfreezeTransfers();
      });

      it('trasnfer passes after unfreeze', async function () {
        await tanzo.transfer(to, amount, { from: owner });

        const senderBalance = await tanzo.balanceOf(owner);
        eq(senderBalance, TOTAL_SUPPLY - amount);

        const recipientBalance = await tanzo.balanceOf(to);
        eq(recipientBalance, amount);
      });
    });

    describe('account different than contract owner should not be able to freeze and unfreeze transfers', async function() {
      const nonowner = acc2;

      it('should fail when account different than contract owner attempt to freeze transfers', async function() {
        await assertRevert(tanzo.freezeTransfers({ from: nonowner }));
      });

      it('contract owner freezes transfers - success', async function () {
        await tanzo.freezeTransfers();
      });

      it('should fail when account different than contract owner attempt to unfreeze transfers', async function() {
        await assertRevert(tanzo.unfreezeTransfers({ from: nonowner }));
      });

      it('contract owner unfreezes transfers - success', async function () {
        await tanzo.freezeTransfers();
      });
    });
  });

  describe('Transfer and Claim Ownership', function() {
    beforeEach(deploy);

    it('should set claim period for the new owner', async function () {
      await tanzo.transferOwnership(acc2);
      await tanzo.setLimits(0, 1000);
      let end = await tanzo.end();
      eq(end, 1000);
      let start = await tanzo.start();
      eq(start, 0);
    });

    it('should fail to set invalid period for claim', async function () {
      await tanzo.transferOwnership(acc3);
      await assertRevert(tanzo.setLimits(1001, 1000));
    });

    it('should change ownership after successful ownership transfer and claim within defined period', async function () {
      await tanzo.transferOwnership(acc2);
      await tanzo.setLimits(0, 1000);
      let end = await tanzo.end();
      eq(end, 1000);
      let start = await tanzo.start();
      eq(start, 0);
      let pendingOwner = await tanzo.pendingOwner();
      eq(pendingOwner, acc2);
      await tanzo.claimOwnership({ from: acc2 });
      let owner = await tanzo.owner();
      eq(owner, accounts[2]);
    });

    it('should not change ownership when the claim is initiated outside defined claim period', async function () {
      await tanzo.transferOwnership(acc1);
      await tanzo.setLimits(10, 20);
      let end = await tanzo.end();
      eq(end, 20);
      let start = await tanzo.start();
      eq(start, 10);
      let pendingOwner = await tanzo.pendingOwner();
      eq(pendingOwner, acc1);
      await assertRevert(tanzo.claimOwnership({ from: acc1 }));
      let owner = await tanzo.owner();
      assert.isTrue(owner !== acc1);
    });
  });
});
