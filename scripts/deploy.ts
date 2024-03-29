import { ethers, upgrades } from 'hardhat'

import main from './lib/main'

main(async () => {
  const [deployer] = await ethers.getSigners()
  console.log('Deployer: ' + deployer.address)
  console.log(
    'Deployer Balance: ' +
      ethers.utils.formatEther(await deployer.getBalance()) +
      ' ETH',
  )
  const GuardianVault = await ethers.getContractFactory('GuardianVault')
  const guardianVault = await upgrades.deployProxy(GuardianVault, [[]])
  await guardianVault.deployed()
  console.log('Box deployed to:', guardianVault.address)
})
