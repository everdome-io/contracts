import * as dotenv from "dotenv";

import { HardhatUserConfig } from "hardhat/config";
import "@nomiclabs/hardhat-etherscan";
import "@nomiclabs/hardhat-waffle";
import "@typechain/hardhat"
import "hardhat-gas-reporter";
import "solidity-coverage";

dotenv.config();

// You need to export an object to set up your config
// Go to https://hardhat.org/config/ to learn more

let blockNumber = process.env.BLOCK_NUMBER?process.env.BLOCK_NUMBER:"1";

const config: HardhatUserConfig = {
  solidity: {
    version: "0.8.4",
    settings: {
      optimizer: {
        enabled: true,
        runs: 1000,
      },
    },
  },
  networks: {
    local: {
      url: 'http://127.0.0.1:8545',
      timeout: 100000,
      initialBaseFeePerGas: 0,
    },
    hardhat: {
      gasPrice: 0,
      initialBaseFeePerGas: 0,
    },
    bsc: {
      url: process.env.RPC_MAINNET,
      accounts: [process.env.PRIVATE_KEY as string],
      gasPrice: 5000000000,
    },
    bsctest: {
      url: process.env.RPC_TESTNET,
      accounts: [process.env.PRIVATE_KEY as string],
      gasPrice: 50000000000,

    },
  },
  etherscan: {
    apiKey: process.env.ETHERSCAN_API_KEY,
  },
  mocha: {
    timeout: 200000
  }
  
};

export default config;
