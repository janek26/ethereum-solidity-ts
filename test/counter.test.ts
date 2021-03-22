import { rejects } from 'assert'

import chai from 'chai'
import { solidity } from 'ethereum-waffle'
import { ethers } from 'hardhat'

import { Counter, Counter__factory } from '../typechain'

chai.use(solidity)
const { expect } = chai

describe('Counter', () => {
  let counter: Counter

  beforeEach(async () => {
    // 1
    const signers = await ethers.getSigners()

    // 2
    const counterFactory = (await ethers.getContractFactory(
      'Counter',
      signers[0],
    )) as Counter__factory
    counter = await counterFactory.deploy()
    await counter.deployed()
    const initialCount = await counter.getCount()

    // 3
    expect(initialCount).to.eq(0)
    expect(counter.address).to.properAddress
  })

  // 4
  describe('count up', async () => {
    it('should count up', async () => {
      await counter.countUp()
      let count = await counter.getCount()
      expect(count).to.eq(1)
    })
  })

  describe('count down', async () => {
    // 5
    it('should fail', async () => {
      // this test will fail
      rejects(counter.countDown())
    })

    it('should count down', async () => {
      await counter.countUp()
      const count1 = await counter.getCount()
      expect(count1).to.eq(1)

      await counter.countDown()
      const count2 = await counter.getCount()
      expect(count2).to.eq(0)
    })
  })
})
