import { ethers } from 'hardhat'

import main from './lib/main'

main(async () => {
  const [deployer] = await ethers.getSigners()
  console.log('Deployer: ' + deployer.address)
  console.log(
    'Deployer Balance: ' +
      ethers.utils.formatEther(await deployer.getBalance()) +
      ' ETH',
  )
  const Factory = await ethers.getContractFactory('Factory')
  const factory = await Factory.deploy()
  await factory.deployed()
  console.log('Factory deployed to:', factory.address)
})
