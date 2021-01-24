[![Build](https://github.com/janek26/ethereum-solidity-ts/workflows/DApp%20CI/badge.svg)](https://github.com/janek26/ethereum-solidity-ts/actions)

# Solidity Typescript Dev Starter Kit

**This was extended and updated by @janek26**

_Using Hardhat, Typescript, Waffle, Mocha and Chai_

This is a starter kit for developing, testing, and deploying smart contracts with a full Typescript environment. This stack uses [Hardhat](https://hardhat.org) as the platform layer to orchestrate all the tasks. [Ethers](https://docs.ethers.io/ethers.js/html/index.html) is used for all Ethereum interactions and testing.

[Original Blog Post](https://medium.com/@rahulsethuram/the-new-solidity-dev-stack-buidler-ethers-waffle-typescript-tutorial-f07917de48ae)

## Using this Project

Clone this repository, then install the dependencies with `yarn`. Build everything with `yarn build`. https://hardhat.org has excellent docs, and can be used as reference for extending this project.

## Available Functionality

You may want to create a `.env` file, with your own and private keys, by running `cp .env.sample .env` and editing it.

### Build Contracts and Generate Typechain Typeings

`yarn compile`

### Run Contract Tests

In one terminal run `yarn chain`

Then in another run `yarn test`

_The gas usage table may be incomplete (the gas report currently needs to run with the `--network localhost` flag; see below)_

### Run Contract Tests and Generate Gas Usage Report

In one terminal run `yarn chain`

Then in another run `yarn test --network localhost`

Notes:

- When running with this `localhost` option, you get a gas report but may not get good callstacks
- See [here](https://github.com/cgewecke/eth-gas-reporter#installation-and-config) for how to configure the gas usage report.

### Run Coverage Report for Tests

`yarn coverage`

Notes:

- running a coverage report currently deletes artifacts, so after each coverage run you will then need to run `npx buidler clean` followed by `yarn build` before re-running tests
- the branch coverage is 75%

### Deploy to Ethereum

Create/modify network config in `hardhat.config.ts` and add API key and private key, then run:

`yarn deploy --network rinkeby`

### Verify on Etherscan

Add Etherscan API key to `hardhat.config.ts`, then run:

`npx hardhat verify-contract --contract-name Counter --address <DEPLOYED ADDRESS>`

## Helpers

Additional tooling to make your DX as simple as possible.

### Prettier

This repo runs `prettier` and `prettier-plugin-solidity` to automate formatting. You can format your project by running `yarn format`.
You may want to enable "format on save" in your IDE.

### Husky and lint-staged

Using `husky` and `lint-staged` to format before every commit. It also runs tests before every push.

**PRs and feedback welcome!**
