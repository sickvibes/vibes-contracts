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
    maxDailyRate: toWei('1000'),
    minValue: toWei('50000'),
    maxValue: toWei('1095000'),
    requireOwnedNft: true,
    minGrant: toWei('10000')
  });

  // allow faucet and pool to spend token
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

});
