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
  const GuardianVault = await ethers.getContractFactory('InfraGuardianVault')
  const guardianVault = await GuardianVault.deploy()
  await guardianVault.deployed()
  console.log('Box deployed to:', guardianVault.address)
})
