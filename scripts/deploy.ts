import { ethers, upgrades } from 'hardhat'

import main from './lib/main'

main(async () => {
  const Counter = await ethers.getContractFactory('Counter')
  const counter = await upgrades.deployProxy(Counter, [0])
  await counter.deployed()
  console.log('Box deployed to:', counter.address)
})
