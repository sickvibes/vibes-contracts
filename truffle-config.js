/* eslint-disable @typescript-eslint/no-var-requires */

const HDWalletProvider = require('@truffle/hdwallet-provider');

require('dotenv').config();

const { POLYGONSCAN_API_KEY } = process.env;

module.exports = {
  networks: {
    development: {
      host: '127.0.0.1',
      port: 7545,
      network_id: 5777,
      skipDryRun: true,
    },
    polygon: {
      provider: () => new HDWalletProvider({ provider: 'https://rpc-mainnet.matic.network' }),
      network_id: 137,
      networkCheckTimeout: 1000000,
      timeoutBlocks: 200,
      skipDryRun: true,
    },
  },
  compilers: {
    solc: {
      version: '0.8.1',
      settings: {
        optimizer: {
          enabled: true,
          runs: 1,
        },
      },
    },
  },
  plugins: ['truffle-plugin-verify'],
  api_keys: {
    polygonscan: POLYGONSCAN_API_KEY,
  },
};
