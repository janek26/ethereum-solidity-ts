import chai from 'chai'
import { solidity } from 'ethereum-waffle'
import { ethers, upgrades } from 'hardhat'

import { GuardianVault, GuardianVault__factory } from '../typechain'

chai.use(solidity)
const { expect } = chai

describe('Upgrades', function () {
  it('works', async () => {
    const [owner] = await ethers.getSigners()

    const GuardianVault = (await ethers.getContractFactory(
      'GuardianVault',
      owner,
    )) as GuardianVault__factory
    const GuardianVaultV2 = (await ethers.getContractFactory(
      'GuardianVault',
      owner,
    )) as GuardianVault__factory

    const instance = (await upgrades.deployProxy(
      GuardianVault,
      [],
    )) as GuardianVault

    expect(instance.address).to.properAddress
    // await instance.countUp()
    // const val1 = await instance.getCount()
    // expect(val1).to.eq(1)
    const ownerContract = await instance.owner()
    expect(ownerContract).to.equal(owner.address)

    const upgraded = (await upgrades.upgradeProxy(
      instance.address,
      GuardianVaultV2,
    )) as GuardianVault

    expect(upgraded.address).to.properAddress
    // await upgraded.countDown()
    // const val2 = await upgraded.getCount()
    // expect(val2).to.eq(0)
    const ownerUpgradede = await upgraded.owner()
    expect(ownerUpgradede).to.equal(owner.address)
  })
})
