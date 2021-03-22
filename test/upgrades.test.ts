import chai from 'chai'
import { solidity } from 'ethereum-waffle'
import { ethers, upgrades } from 'hardhat'

import { Counter, Counter__factory } from '../typechain'

chai.use(solidity)
const { expect } = chai

describe('Upgrades', function () {
  it('works', async () => {
    const Counter = (await ethers.getContractFactory(
      'Counter',
    )) as Counter__factory
    const CounterV2 = (await ethers.getContractFactory(
      'Counter',
    )) as Counter__factory

    const instance = (await upgrades.deployProxy(Counter, [0])) as Counter

    await instance.countUp()
    const val1 = await instance.getCount()
    expect(val1).to.eq(1)

    const upgraded = (await upgrades.upgradeProxy(
      instance.address,
      CounterV2,
    )) as Counter

    await upgraded.countDown()
    const val2 = await upgraded.getCount()
    expect(val2).to.eq(0)
  })
})
