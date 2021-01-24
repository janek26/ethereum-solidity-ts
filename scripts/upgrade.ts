import { ethers, upgrades } from 'hardhat'

import main from './lib/main'

const { BOX_ADDRESS = '' } = process.env

main(async () => {
  const Counter = await ethers.getContractFactory('Counter')
  const box = await upgrades.upgradeProxy(BOX_ADDRESS, Counter)
  console.log('Box upgraded')
})
