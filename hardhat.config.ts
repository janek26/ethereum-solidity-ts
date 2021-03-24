import '@nomiclabs/hardhat-waffle'
import 'hardhat-typechain'
import '@nomiclabs/hardhat-etherscan'
import 'solidity-coverage'
import 'hardhat-watcher'
import 'hardhat-tracer'
import 'hardhat-gas-reporter'
import 'hardhat-abi-exporter'
import '@nomiclabs/hardhat-solhint'
import '@openzeppelin/hardhat-upgrades'

import { config as dotEnvConfig } from 'dotenv'
import { HardhatUserConfig } from 'hardhat/types'

dotEnvConfig()

const INFURA_API_KEY = process.env.INFURA_API_KEY || ''
const RINKEBY_PRIVATE_KEY =
  process.env.RINKEBY_PRIVATE_KEY! ||
  '0xc87509a1c067bbde78beb793e6fa76530b6382a4c0241e5e4a9ec0a0f44dc0d3' // well known private key
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
      url: 'http://127.0.0.1:7545',
    },
    rinkeby: {
      url: `https://rinkeby.infura.io/v3/${INFURA_API_KEY}`,
      accounts: [RINKEBY_PRIVATE_KEY],
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
