import { ethers, upgrades } from 'hardhat'

import main from './lib/main'

const { BOX_ADDRESS = '' } = process.env

main(async () => {
  const GuardianVault = await ethers.getContractFactory('GuardianVault')
  const box = await upgrades.upgradeProxy(BOX_ADDRESS, GuardianVault)
  console.log('Box upgraded')
})
