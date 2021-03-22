import { rejects } from 'assert'

import chai from 'chai'
import { solidity } from 'ethereum-waffle'
import { ethers, upgrades } from 'hardhat'

import { GuardianVault, GuardianVault__factory } from '../typechain'

chai.use(solidity)
const { expect } = chai

describe('Upgrades', function () {
  it('works', async () => {
    const [owner, _addr1, addr2] = await ethers.getSigners()

    const GuardianVault = (await ethers.getContractFactory(
      'GuardianVault',
      owner,
    )) as GuardianVault__factory
    const GuardianVaultV2 = (await ethers.getContractFactory(
      'GuardianVault',
      owner,
    )) as GuardianVault__factory

    const instance = (await upgrades.deployProxy(GuardianVault, [
      [addr2.address],
    ])) as GuardianVault

    expect(instance.address).to.properAddress
    const ownerContract = await instance.owner()
    expect(ownerContract).to.equal(owner.address)
    const isAddr2Guardian = await instance['isGuardian(address)'](addr2.address)
    expect(isAddr2Guardian).to.equal(true)

    const upgraded = (await upgrades.upgradeProxy(
      instance.address,
      GuardianVaultV2,
    )) as GuardianVault

    expect(upgraded.address).to.properAddress
    const ownerUpgradede = await upgraded.owner()
    expect(ownerUpgradede).to.equal(owner.address)
    const isAddr2GuardianUpgraded = await upgraded['isGuardian(address)'](
      addr2.address,
    )
    expect(isAddr2GuardianUpgraded).to.equal(true)
  })

  it('crashed when you try to set ZeroAddress as Guardian', async () => {
    const [owner] = await ethers.getSigners()

    const GuardianVault = (await ethers.getContractFactory(
      'GuardianVault',
      owner,
    )) as GuardianVault__factory

    await rejects(
      upgrades.deployProxy(GuardianVault, [[ethers.constants.AddressZero]]),
      'Cant use ZeroAddress as Guardian',
    )
  })
})
