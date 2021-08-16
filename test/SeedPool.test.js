const truffleAssert = require('truffle-assertions');

const MockERC20 = artifacts.require('MockERC20');
const MockERC721 = artifacts.require('MockERC721');
const MockERC721NoMetadata = artifacts.require('MockERC721NoMetadata');
const NFTTokenFaucetV3 = artifacts.require('NFTTokenFaucetV3');
const TokenLockManagerV2 = artifacts.require('TokenLockManagerV2');
const SeedPool = artifacts.require('SeedPool');

const { BN, toWei, fromWei } = web3.utils;
const ZERO = '0x0000000000000000000000000000000000000000';
const INFINITY = '0xffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff';

const factory = async () => {
  const token = await MockERC20.new();
  const nft = await MockERC721.new();
  const lock = await TokenLockManagerV2.new();
  const faucet = await NFTTokenFaucetV3.new({
    token: token.address,
    lock: lock.address,
    legacy: {
      seeder: ZERO,
      faucet: ZERO,
      nft: ZERO,
      lock: ZERO,
    },
  });

  const pool = await SeedPool.new(faucet.address, {
    minDailyRate: toWei('1000'),
    maxDailyRate: toWei('2000'),
    minValue: toWei('50000'),
    maxValue: toWei('1095000'),
    requireOwnedNft: true,
    minGrant: toWei('10000')
  });

  await faucet.grantRole(await faucet.SEEDER_ROLE(), pool.address);

  // allow faucet and pool to spend token
  await token.approve(faucet.address, INFINITY);
  await token.approve(faucet.address, INFINITY);

  return { token, nft, faucet, lock, pool };
};

// gas
const MAX_DEPLOYMENT_GAS = 2500000;
const MAX_MUTATION_GAS = 310000;

contract.only('NFTTokenFaucetV3', (accounts) => {
  const [a1, a2, a3, a4, a5] = accounts;

  describe('gas constraints', () => {
    it('should deploy with less than target deployment gas', async () => {
      const { faucet } = await factory();
      let { gasUsed } = await web3.eth.getTransactionReceipt(faucet.transactionHash);
      assert.isBelow(gasUsed, MAX_DEPLOYMENT_GAS);
      console.log('deployment', gasUsed);
    });
  });

  describe('basic seeding', () => {
    it('should seed for msg sender', async () => {
      const { token, faucet, pool, nft } = await factory();
      const tokenId = '1';
      await token.mint(toWei('100000'));
      await nft.mint(tokenId, { from: a2 });
      await token.transfer(pool.address, toWei('100000'));
      await pool.setAllowances([{ seeder: a2, amount: toWei('50000') }]);
      await pool.seed(nft.address, tokenId, toWei('1000'), 50, { from: a2 });

      const view = await faucet.getToken(nft.address, tokenId);
      assert.equal(view.nft, nft.address);
      assert.equal(view.tokenId, tokenId);
      assert.equal(view.isValidToken, true);
      assert.equal(view.isSeeded, true);
      assert.equal(view.seeder, a2);
      assert.equal(view.operator, pool.address);
      assert.equal(view.dailyRate, toWei('1000'));
      assert.equal(view.isLegacyToken, false);
      assert.equal(view.balance, toWei('50000'));
    });
    it.only('should decrease allowance following a seed', async () => {
      const { token, faucet, pool, nft } = await factory();
      const tokenId = '1';
      await token.mint(toWei('100000'));
      await nft.mint(tokenId, { from: a2 });
      await token.transfer(pool.address, toWei('100000'));
      await pool.setAllowances([{ seeder: a2, amount: toWei('100000') }]);
      await pool.seed(nft.address, tokenId, toWei('1000'), 60, { from: a2 });

      const view = await pool.getInfo();
      assert.equal(view.balance, toWei('40000'));
      assert.equal(view.allowances[0].amount, toWei('40000'));
    });
  });

  describe('constraint checks', () => {
    it('should revert if allowance too low', async () => {
      const { token, faucet, pool, nft } = await factory();
      const tokenId = '1';
      await token.mint(toWei('100000'));
      await nft.mint(tokenId, { from: a2 });
      await token.transfer(pool.address, toWei('100000'));
      await pool.setAllowances([{ seeder: a2, amount: toWei('50000') }]);
      await pool.seed(nft.address, tokenId, toWei('1000'), 50, { from: a2 });
      const task = pool.seed(
        nft.address, tokenId, toWei('1000'), 55, // <-- 55 days is past allowance
        { from: a2 });
      await truffleAssert.fails(task, truffleAssert.ErrorType.REVERT, 'insufficient allowance');
    });
    it('should revert if pool balance too low', async () => {
      const { token, faucet, pool, nft } = await factory();
      const tokenId = '1';
      await token.mint(toWei('100000'));
      await nft.mint(tokenId, { from: a2 });
      await pool.setAllowances([{ seeder: a2, amount: toWei('50000') }]);
      // never filled pool
      const task = pool.seed(
        nft.address, tokenId, toWei('1000'), 50,
        { from: a2 });
      await truffleAssert.fails(task, truffleAssert.ErrorType.REVERT, 'insufficient pool balance');
    });
    it('should revert if not token owner', async () => {
      const { token, faucet, pool, nft } = await factory();
      const tokenId = '1';
      await token.mint(toWei('100000'));
      await nft.mint(tokenId); // minted by a1
      await token.transfer(pool.address, toWei('100000'));
      await pool.setAllowances([{ seeder: a2, amount: toWei('50000') }]);
      const task = pool.seed(
        nft.address, tokenId, toWei('1000'), 50,
        { from: a2 });
      await truffleAssert.fails(task, truffleAssert.ErrorType.REVERT, 'not token owner');
    });
    it('should revert if daily rate too low', async () => {
      const { token, faucet, pool, nft } = await factory();
      const tokenId = '1';
      await token.mint(toWei('100000'));
      await nft.mint(tokenId, { from: a2 });
      await token.transfer(pool.address, toWei('100000'));
      await pool.setAllowances([{ seeder: a2, amount: toWei('50000') }]);
      const task = pool.seed(
        nft.address, tokenId, toWei('500'), 100,
        { from: a2 });
      await truffleAssert.fails(task, truffleAssert.ErrorType.REVERT, 'daily rate too low');
    });
    it('should revert if daily rate too high', async () => {
      const { token, faucet, pool, nft } = await factory();
      const tokenId = '1';
      await token.mint(toWei('100000'));
      await nft.mint(tokenId, { from: a2 });
      await token.transfer(pool.address, toWei('100000'));
      await pool.setAllowances([{ seeder: a2, amount: toWei('50000') }]);
      const task = pool.seed(
        nft.address, tokenId, toWei('5000'), 10,
        { from: a2 });
      await truffleAssert.fails(task, truffleAssert.ErrorType.REVERT, 'daily rate too high');
    });
    it('should revert if lifetime value too low', async () => {
      const { token, faucet, pool, nft } = await factory();
      const tokenId = '1';
      await token.mint(toWei('100000'));
      await nft.mint(tokenId, { from: a2 });
      await token.transfer(pool.address, toWei('100000'));
      await pool.setAllowances([{ seeder: a2, amount: toWei('50000') }]);
      const task = pool.seed(
        nft.address, tokenId, toWei('1000'), 1,
        { from: a2 });
      await truffleAssert.fails(task, truffleAssert.ErrorType.REVERT, 'lifetime value too low');
    });
    it('should revert if lifetime value too high', async () => {
      const { token, faucet, pool, nft } = await factory();
      const tokenId = '1';
      await token.mint(toWei('1000000000'));
      await nft.mint(tokenId, { from: a2 });
      await token.transfer(pool.address, toWei('1000000000'));
      await pool.setAllowances([{ seeder: a2, amount: INFINITY }]);
      const task = pool.seed(
        nft.address, tokenId, toWei('1000'), 2000,
        { from: a2 });
        await truffleAssert.fails(task, truffleAssert.ErrorType.REVERT, 'lifetime value too high');
    });
  })

});
