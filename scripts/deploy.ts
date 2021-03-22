import { ethers, upgrades } from 'hardhat'

import main from './lib/main'

main(async () => {
  const GuardianVault = await ethers.getContractFactory('GuardianVault')
  const guardianVault = await upgrades.deployProxy(GuardianVault, [])
  await guardianVault.deployed()
  console.log('Box deployed to:', guardianVault.address)
})
