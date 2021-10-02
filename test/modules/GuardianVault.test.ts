import { rejects } from 'assert'

import chai from 'chai'
import { solidity } from 'ethereum-waffle'
import { ethers, upgrades } from 'hardhat'

import { GuardianVault, GuardianVault__factory } from '../../typechain'
import { waitSecondsOnChain } from '../lib/network'

chai.use(solidity)
const { expect } = chai

describe('GuardianVault', () => {
  let guardianVault: GuardianVault

  beforeEach(async () => {
    const [owner] = await ethers.getSigners()

    const GuardianVault = (await ethers.getContractFactory(
      'GuardianVault',
      owner,
    )) as GuardianVault__factory

    guardianVault = (await upgrades.deployProxy(GuardianVault, [
      [],
    ])) as GuardianVault

    expect(guardianVault.address).to.properAddress
  })

  describe('Config', async () => {
    describe('Timelock', () => {
      it('initializes with a timelock of 1 day', async () => {
        const timelockPeriod = await guardianVault.getTimelockPeriod()
        const ONE_DAY = 24 * 60 * 60
        expect(timelockPeriod).to.eq(ONE_DAY)
      })
      it('allows to set timelock by owner', async () => {
        const HALF_DAY = (24 * 60 * 60) / 2

        await guardianVault.setTimelockPeriod(HALF_DAY)
        const timelockPeriod = await guardianVault.getTimelockPeriod()
        expect(timelockPeriod).to.eq(HALF_DAY)
      })
      it('rejects to set timelock by somebody else', async () => {
        const [_, addr1] = await ethers.getSigners()
        const HALF_DAY = (24 * 60 * 60) / 2

        await rejects(
          guardianVault.connect(addr1).setTimelockPeriod(HALF_DAY),
          'revert Ownable: caller is not the owner',
        )
      })
    })
    describe('Bond', () => {
      it('initializes with a bond of 0 ether', async () => {
        const bond = await guardianVault.getRequiredBond()
        const ZERO_ETHER = ethers.utils.parseEther('0')
        expect(bond).to.eq(ZERO_ETHER)
      })
      it('allows to set bond by owner', async () => {
        const TWO_ETHER = ethers.utils.parseEther('2')

        await guardianVault.setRequiredBond(TWO_ETHER)
        const timelockPeriod = await guardianVault.getRequiredBond()
        expect(timelockPeriod).to.eq(TWO_ETHER)
      })
      it('rejects to set bond by somebody else', async () => {
        const [_, addr1] = await ethers.getSigners()
        const TWO_ETHER = ethers.utils.parseEther('2')

        await rejects(
          guardianVault.connect(addr1).setRequiredBond(TWO_ETHER),
          'revert Ownable: caller is not the owner',
        )
      })
    })
  })

  describe('Guardians', () => {
    it('ZeroAddress is not a guardian', async () => {
      const isOwner = await guardianVault['isGuardian(address)'](
        ethers.constants.AddressZero,
      )
      expect(isOwner).to.eq(false)
    })
    describe('Add', () => {
      it('adds guardians when done by the owner', async () => {
        const [_, addr1] = await ethers.getSigners()

        // set timelock to 0; so we can check the result fast
        await guardianVault.setTimelockPeriod(0)

        // set addr1 as guardian by owner
        await guardianVault.addGuardian(addr1.address)

        // do some airbatrary actions on the blockchain to move further
        await waitSecondsOnChain(60)

        // confirm that addr1 is guardian
        const isAddr1GuardianByOwner = await guardianVault[
          'isGuardian(address)'
        ](addr1.address)
        expect(isAddr1GuardianByOwner).to.eq(true)

        // let addr1 check if he is guardian
        const isAddr1GuardianByAddr1 = await guardianVault
          .connect(addr1)
          ['isGuardian()']()
        expect(isAddr1GuardianByAddr1).to.eq(true)
      })

      it('works with timelock', async () => {
        const [_, addr1] = await ethers.getSigners()

        // set addr1 as guardian by owner
        // default timelock is 1 day
        await guardianVault.addGuardian(addr1.address)

        // wait some time <timelock
        await waitSecondsOnChain(60)

        // let addr1 check if he is a guardian
        const isAddr1GuardianByAddr1 = await guardianVault
          .connect(addr1)
          ['isGuardian()']()
        expect(isAddr1GuardianByAddr1).to.eq(false)
      })

      it('emits event when adding', async () => {
        const [_, addr1] = await ethers.getSigners()
        const tx = await guardianVault.addGuardian(addr1.address)
        const receipt = await tx.wait()
        const event = receipt.events?.find((e) => e.event === 'GuardianAdded')
        expect(event).to.not.be.undefined
        expect(event?.args).to.deep.eq([addr1.address])
      })

      it('rejects attempt to add ZeroAddress as Guardian', async () => {
        await rejects(
          guardianVault.addGuardian(ethers.constants.AddressZero),
          'Cant use ZeroAddress as Guardian',
        )
      })

      it('rejects attempt to add already added address as Guardian', async () => {
        const [_, addr1] = await ethers.getSigners()
        await guardianVault.addGuardian(addr1.address)
        await rejects(
          guardianVault.addGuardian(addr1.address),
          'Guardian is already added',
        )
      })

      it('rejects attempt to add Guardian by not owner', async () => {
        const [_, addr1] = await ethers.getSigners()
        const notOwner = guardianVault.connect(addr1)
        await rejects(
          notOwner.addGuardian(addr1.address),
          'revert Ownable: caller is not the owner',
        )
      })
    })
    describe('Remove', () => {
      async function addGuardianNow(address: string) {
        const timelockPeriod = await guardianVault.getTimelockPeriod()
        await guardianVault.addGuardian(address)
        // add 10s delay to make sure
        await waitSecondsOnChain(timelockPeriod.toNumber() + 10)
      }

      it('removes an existing guardian correctly', async () => {
        const [_, addr1] = await ethers.getSigners()
        await addGuardianNow(addr1.address)

        const isAddr1GuardianByOwnerBefore = await guardianVault[
          'isGuardian(address)'
        ](addr1.address)

        expect(isAddr1GuardianByOwnerBefore).to.eq(true)

        await guardianVault.removeGuardian(addr1.address)

        const isAddr1GuardianByOwnerAfter = await guardianVault[
          'isGuardian(address)'
        ](addr1.address)
        expect(isAddr1GuardianByOwnerAfter).to.eq(false)
        const isAddr1GuardianByAddr1After = await guardianVault[
          'isGuardian()'
        ]()
        expect(isAddr1GuardianByAddr1After).to.eq(false)
      })

      it('emits event when removing', async () => {
        const [_, addr1] = await ethers.getSigners()
        await addGuardianNow(addr1.address)

        const tx = await guardianVault.removeGuardian(addr1.address)
        const receipt = await tx.wait()
        const event = receipt.events?.find((e) => e.event === 'GuardianRemoved')
        expect(event).to.not.be.undefined
        expect(event?.args).to.deep.eq([addr1.address])
      })

      it('rejects when removing non existent guardian', async () => {
        const [_, addr1] = await ethers.getSigners()
        await rejects(
          guardianVault.removeGuardian(addr1.address),
          'Guardian does not exist',
        )
      })

      it('rejects attempt to remove Guardian by not owner', async () => {
        const [_, addr1] = await ethers.getSigners()
        const notOwner = guardianVault.connect(addr1)

        await rejects(
          notOwner.removeGuardian(addr1.address),
          'revert Ownable: caller is not the owner',
        )
      })
    })
  })
})
