import '@nomiclabs/hardhat-waffle'
import 'hardhat-typechain'
import '@nomiclabs/hardhat-etherscan'
import 'solidity-coverage'
import 'hardhat-watcher'
import 'hardhat-tracer'
import 'hardhat-gas-reporter'
import 'hardhat-abi-exporter'
import 'hardhat-log-remover'
import '@nomiclabs/hardhat-solhint'
import '@openzeppelin/hardhat-upgrades'

import { config as dotEnvConfig } from 'dotenv'
import { HardhatUserConfig } from 'hardhat/types'

dotEnvConfig()

const INFURA_API_KEY = process.env.INFURA_API_KEY || ''
const PRIVATE_KEY =
  process.env.PRIVATE_KEY ||
  '0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80' // well known private key
const ETHERSCAN_API_KEY = process.env.ETHERSCAN_API_KEY
const COINMARKETCAP_API_KEY = process.env.COINMARKETCAP_API_KEY

const config: HardhatUserConfig = {
  defaultNetwork: 'hardhat',
  solidity: {
    compilers: [
      {
        version: '0.7.6',
        settings: {
          optimizer: {
            enabled: true,
            runs: 200,
          },
        },
      },
    ],
  },
  networks: {
    hardhat: {},
    localhost: {
      url: 'http://127.0.0.1:8545',
    },
    rinkeby: {
      url: `https://rinkeby.infura.io/v3/${INFURA_API_KEY}`,
      accounts: [PRIVATE_KEY],
    },
    cevm: {
      url: `https://rpc-evm.portal.dev.cardano.org/`,
      accounts: [PRIVATE_KEY],
    },
    kevm: {
      url: `https://rpc-kevm.portal.dev.cardano.org/`,
      accounts: [PRIVATE_KEY],
    },
    moonbase: {
      url: `https://rpc.testnet.moonbeam.network`,
      chainId: 1287,
      accounts: [PRIVATE_KEY],
    },
    moondev: {
      url: `http://127.0.0.1:9933`,
      chainId: 1281,
    },
    coverage: {
      url: 'http://127.0.0.1:8555', // Coverage launches its own ganache-cli client
    },
  },
  etherscan: {
    // Your API key for Etherscan
    // Obtain one at https://etherscan.io/
    apiKey: ETHERSCAN_API_KEY,
  },
  watcher: {
    compile: {
      tasks: ['compile'],
      files: ['./contracts'],
      verbose: true,
    },
    test: {
      tasks: ['test'],
      files: ['./contracts', './test'],
      verbose: true,
    },
    ci: {
      tasks: [
        'clean',
        { command: 'compile', params: { quiet: true } },
        {
          command: 'test',
          params: { noCompile: true },
        },
      ],
    },
  },
  gasReporter: {
    coinmarketcap: COINMARKETCAP_API_KEY,
  },
}

export default config
