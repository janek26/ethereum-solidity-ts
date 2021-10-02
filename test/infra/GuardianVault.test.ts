import { rejects } from 'assert'

import chai from 'chai'
import { solidity } from 'ethereum-waffle'
import { ethers, upgrades } from 'hardhat'

import {
  InfraGuardianVault,
  InfraGuardianVault__factory,
} from '../../typechain'
import { waitSecondsOnChain } from '../lib/network'

chai.use(solidity)
const { expect } = chai

describe('InfraGuardianVault', () => {
  let guardianVault: InfraGuardianVault

  beforeEach(async () => {
    const [owner] = await ethers.getSigners()

    const GuardianVault = (await ethers.getContractFactory(
      'InfraGuardianVault',
      owner,
    )) as InfraGuardianVault__factory

    const tx = await GuardianVault.deploy()
    guardianVault = await tx.deployed()

    expect(guardianVault.address).to.properAddress
  })

  describe('Register', () => {
    it('allows a user to register with a guardian', async () => {
      const [owner, g1] = await ethers.getSigners()
      const GUARDIANS: string[] = [g1.address]
      await guardianVault.register(owner.address, GUARDIANS, [])

      const guardiansLength = await guardianVault.getGuardianLength(
        owner.address,
      )
      expect(guardiansLength).to.eq(GUARDIANS.length)
    })
    it('allows a user to register with multiple guardians', async () => {
      const [owner, g1, g2, g3] = await ethers.getSigners()
      const GUARDIANS: string[] = [g1.address, g2.address, g3.address]
      await guardianVault.register(owner.address, GUARDIANS, [])

      const guardiansLength = await guardianVault.getGuardianLength(
        owner.address,
      )
      expect(guardiansLength).to.eq(GUARDIANS.length)
    })
    it('denies registration without guardian', async () => {
      const [owner] = await ethers.getSigners()
      const GUARDIANS: string[] = []

      rejects(
        guardianVault.register(owner.address, GUARDIANS, []),
        'Ward needs at least one Guardian',
      )
    })
    it('denies registration for other address', async () => {
      const [_evil, g1, target] = await ethers.getSigners()
      const GUARDIANS: string[] = [g1.address]

      rejects(
        guardianVault.register(target.address, GUARDIANS, []),
        'Sender not target',
      )
    })
    it('denies registration for existing ward', async () => {
      const [owner, g1] = await ethers.getSigners()
      const GUARDIANS: string[] = [g1.address]
      await guardianVault.register(owner.address, GUARDIANS, [])

      rejects(
        guardianVault.register(owner.address, GUARDIANS, []),
        'Ward exists already',
      )
    })
  })

  describe('Config', () => {
    describe('Timelock', () => {
      it('detects when a user doesnt exist', async () => {
        const [owner] = await ethers.getSigners()
        await rejects(
          guardianVault.getTimelockPeriod(owner.address),
          'Ward doesnt exist',
        )
      })
      it('allows get of time period', async () => {
        const ONE_DAY = 1 * 24 * 60 * 60
        const [owner, g1] = await ethers.getSigners()
        await guardianVault.register(owner.address, [g1.address], [])

        const lockPeriod = await guardianVault.getTimelockPeriod(owner.address)

        expect(lockPeriod).to.eq(ONE_DAY)
      })
      it('allows to set timelock by owner', async () => {
        const [owner, g1] = await ethers.getSigners()
        const HALF_DAY = (24 * 60 * 60) / 2
        await guardianVault.register(owner.address, [g1.address], [])

        await guardianVault.setTimelockPeriod(owner.address, HALF_DAY)
        const lockPeriod = await guardianVault.getTimelockPeriod(owner.address)

        expect(lockPeriod).to.eq(HALF_DAY)
      })
      it('allows to set timelock by trusted module', async () => {
        const [owner, g1, m1] = await ethers.getSigners()
        const HALF_DAY = (24 * 60 * 60) / 2
        await guardianVault.register(owner.address, [g1.address], [m1.address])

        const trustedModule = guardianVault.connect(m1)
        await trustedModule.setTimelockPeriod(owner.address, HALF_DAY)
        const lockPeriod = await trustedModule.getTimelockPeriod(owner.address)

        expect(lockPeriod).to.eq(HALF_DAY)
      })
      it('rejects to set timelock by somebody else', async () => {
        const [owner, g1] = await ethers.getSigners()
        const HALF_DAY = (24 * 60 * 60) / 2
        await guardianVault.register(owner.address, [g1.address], [])

        await rejects(
          guardianVault.connect(g1).setTimelockPeriod(owner.address, HALF_DAY),
          'Sender not authorized',
        )
      })
    })
  })
  describe('Guardians', () => {
    it('ZeroAddress is not a guardian', async () => {
      const isGuardian = await guardianVault['isGuardian(address)'](
        ethers.constants.AddressZero,
      )
      expect(isGuardian).to.eq(false)
    })
    describe('Read', () => {
      it('allows guardian to read own state on existing ward', async () => {
        const [ward, g1] = await ethers.getSigners()
        await guardianVault.register(ward.address, [g1.address], [])

        const isGuardian = await guardianVault
          .connect(g1)
          ['isGuardian(address)'](ward.address)
        expect(isGuardian).to.eq(true)
      })
      it('allows others to read guardian state on existing ward', async () => {
        const [ward, g1, nobody] = await ethers.getSigners()
        await guardianVault.register(ward.address, [g1.address], [])

        const isGuardian = await guardianVault
          .connect(nobody)
          ['isGuardian(address,address)'](ward.address, g1.address)
        expect(isGuardian).to.eq(true)
      })
      it('returns false on read with non existent guardian on existing ward', async () => {
        const [ward, g1, nobody] = await ethers.getSigners()
        await guardianVault.register(ward.address, [g1.address], [])

        const isGuardian = await guardianVault['isGuardian(address,address)'](
          ward.address,
          nobody.address,
        )
        expect(isGuardian).to.eq(false)
      })
      it('returns false on read on non-existing ward', async () => {
        const [nobody] = await ethers.getSigners()

        const isGuardian = await guardianVault['isGuardian(address)'](
          nobody.address,
        )
        expect(isGuardian).to.eq(false)
      })
    })
    describe('Add', () => {
      it('adds guardians when done by the owner', async () => {
        const [ward, g1, g2] = await ethers.getSigners()
        await guardianVault.register(ward.address, [g1.address], [])

        // set timelock to 0; so we can check the result fast
        await guardianVault.setTimelockPeriod(ward.address, 0)

        await guardianVault.addGuardian(ward.address, g2.address)
        await waitSecondsOnChain(60)

        const isG2GuardianByOwner = await guardianVault[
          'isGuardian(address,address)'
        ](ward.address, g2.address)
        expect(isG2GuardianByOwner).to.eq(true)

        const isG2GuardianByG2 = await guardianVault
          .connect(g2)
          ['isGuardian(address)'](ward.address)
        expect(isG2GuardianByG2).to.eq(true)
      })

      it('works with timelock', async () => {
        const [ward, g1, g2] = await ethers.getSigners()
        await guardianVault.register(ward.address, [g1.address], [])
        await guardianVault.setTimelockPeriod(ward.address, 100)

        // set addr1 as guardian by owner
        // default timelock is 1 day
        await guardianVault.addGuardian(ward.address, g2.address)

        // wait some time <timelock
        await waitSecondsOnChain(60)

        // let G2 check if he is a guardian
        const isG2Guardian = await guardianVault
          .connect(g2)
          ['isGuardian(address)'](ward.address)
        expect(isG2Guardian).to.eq(false)

        await waitSecondsOnChain(60)

        // let G2 check if he is a guardian
        const isG2GuardianAfter = await guardianVault
          .connect(g2)
          ['isGuardian(address)'](ward.address)
        expect(isG2GuardianAfter).to.eq(true)
      })

      it('emits event when adding', async () => {
        const [ward, g1, g2] = await ethers.getSigners()
        await guardianVault.register(ward.address, [g1.address], [])
        const tx = await guardianVault.addGuardian(ward.address, g2.address)
        const receipt = await tx.wait()
        const event = receipt.events?.find((e) => e.event === 'GuardianAdded')
        expect(event).to.not.be.undefined
        expect(event?.args).to.deep.eq([ward.address, g2.address])
      })

      it('rejects attempt to add ZeroAddress as Guardian', async () => {
        const [ward, g1] = await ethers.getSigners()
        await guardianVault.register(ward.address, [g1.address], [])

        await rejects(
          guardianVault.addGuardian(ward.address, ethers.constants.AddressZero),
          'Cant use ZeroAddress as Guardian',
        )
      })

      it('rejects attempt to add already added address as Guardian', async () => {
        const [ward, g1, g2] = await ethers.getSigners()
        await guardianVault.register(ward.address, [g1.address], [])

        await guardianVault.addGuardian(ward.address, g2.address)
        await rejects(
          guardianVault.addGuardian(ward.address, g2.address),
          'Guardian is already added',
        )
      })

      it('rejects attempt to add Guardian by not owner', async () => {
        const [ward, g1, g2] = await ethers.getSigners()
        await guardianVault.register(ward.address, [g1.address], [])

        const notOwner = guardianVault.connect(g2)
        await rejects(
          notOwner.addGuardian(ward.address, g2.address),
          'revert Ownable: caller is not the owner',
        )
      })
    })
    describe('Remove', () => {
      async function addGuardianNow(ward: string, address: string) {
        const timelockPeriod = await guardianVault.getTimelockPeriod(ward)
        await guardianVault.addGuardian(ward, address)
        // add 10s delay to make sure
        await waitSecondsOnChain(timelockPeriod.toNumber() + 10)
      }
      it('removes an existing guardian correctly', async () => {
        const [ward, g1, g2] = await ethers.getSigners()
        await guardianVault.register(ward.address, [g1.address], [])

        await addGuardianNow(ward.address, g2.address)
        const isG2GuardianByOwnerBefore = await guardianVault[
          'isGuardian(address,address)'
        ](ward.address, g2.address)
        expect(isG2GuardianByOwnerBefore).to.eq(true)

        await guardianVault.removeGuardian(ward.address, g2.address)
        const isG2GuardianByOwnerAfter = await guardianVault[
          'isGuardian(address,address)'
        ](ward.address, g2.address)
        expect(isG2GuardianByOwnerAfter).to.eq(false)
      })
      it('emits event when removing', async () => {
        const [ward, g1, g2] = await ethers.getSigners()
        await guardianVault.register(ward.address, [g1.address], [])

        await addGuardianNow(ward.address, g2.address)
        const tx = await guardianVault.removeGuardian(ward.address, g2.address)
        const receipt = await tx.wait()
        const event = receipt.events?.find((e) => e.event === 'GuardianRemoved')
        expect(event).to.not.be.undefined
        expect(event?.args).to.deep.eq([ward.address, g2.address])
      })
      it('rejects when removing non existent guardian', async () => {
        const [ward, g1, g2] = await ethers.getSigners()
        await guardianVault.register(ward.address, [g1.address], [])

        await rejects(
          guardianVault.removeGuardian(ward.address, g2.address),
          'Guardian does not exist',
        )
      })
      it('rejects attempt to remove last Guardian', async () => {
        const [ward, g1] = await ethers.getSigners()
        await guardianVault.register(ward.address, [g1.address], [])

        await rejects(
          guardianVault.removeGuardian(ward.address, g1.address),
          'Cant remove last Guardian',
        )
      })
      it('rejects attempt to remove Guardian by not owner', async () => {
        const [ward, g1] = await ethers.getSigners()
        await guardianVault.register(ward.address, [g1.address], [])

        const notOwner = guardianVault.connect(g1)
        await rejects(
          notOwner.removeGuardian(ward.address, g1.address),
          'Sender not trusted',
        )
      })
    })
  })
  describe('Trustees', () => {
    it('ZeroAddress is not a trustee', async () => {
      const isTrusted = await guardianVault['isTrusted(address)'](
        ethers.constants.AddressZero,
      )
      expect(isTrusted).to.eq(false)
    })
    describe('Read', () => {
      it('allows trustee to read own state on existing ward', async () => {
        const [ward, t1, g1] = await ethers.getSigners()
        await guardianVault.register(ward.address, [g1.address], [t1.address])

        const isTrusted = await guardianVault
          .connect(t1)
          ['isTrusted(address)'](ward.address)
        expect(isTrusted).to.eq(true)
      })
      it('allows others to read trustee state on existing ward', async () => {
        const [ward, t1, g1, nobody] = await ethers.getSigners()
        await guardianVault.register(ward.address, [g1.address], [t1.address])

        const isTrusted = await guardianVault
          .connect(nobody)
          ['isTrusted(address,address)'](ward.address, t1.address)
        expect(isTrusted).to.eq(true)
      })
      it('returns false on read with non existent trustee on existing ward', async () => {
        const [ward, g1, t1, nobody] = await ethers.getSigners()
        await guardianVault.register(ward.address, [g1.address], [t1.address])

        const isTrusted = await guardianVault['isTrusted(address,address)'](
          ward.address,
          nobody.address,
        )
        expect(isTrusted).to.eq(false)
      })
      it('returns false on read on non-existing ward', async () => {
        const [_self, nobody] = await ethers.getSigners()

        const isTrusted = await guardianVault['isTrusted(address)'](
          nobody.address,
        )
        expect(isTrusted).to.eq(false)
      })
      it('returns true on read by self', async () => {
        const [self] = await ethers.getSigners()

        const isTrusted = await guardianVault['isTrusted(address)'](
          self.address,
        )
        expect(isTrusted).to.eq(true)
      })
    })
    describe('Add', () => {
      it('adds trustee when done by the owner', async () => {
        const [ward, g1, t1] = await ethers.getSigners()
        await guardianVault.register(ward.address, [g1.address], [])

        // set timelock to 0; so we can check the result fast
        await guardianVault.setTimelockPeriod(ward.address, 0)

        await guardianVault.addTrustee(ward.address, t1.address)
        await waitSecondsOnChain(60)

        const isT1TrustedByOwner = await guardianVault[
          'isTrusted(address,address)'
        ](ward.address, t1.address)
        expect(isT1TrustedByOwner).to.eq(true)

        const isT1TrustedByT1 = await guardianVault
          .connect(t1)
          ['isTrusted(address)'](ward.address)
        expect(isT1TrustedByT1).to.eq(true)
      })

      it('works with timelock', async () => {
        const [ward, g1, t1] = await ethers.getSigners()
        await guardianVault.register(ward.address, [g1.address], [])
        await guardianVault.setTimelockPeriod(ward.address, 100)

        // set addr1 as guardian by owner
        // default timelock is 1 day
        await guardianVault.addTrustee(ward.address, t1.address)

        // wait some time <timelock
        await waitSecondsOnChain(60)

        // let T1 check if he is a guardian
        const isT1Trusted = await guardianVault
          .connect(t1)
          ['isTrusted(address)'](ward.address)
        expect(isT1Trusted).to.eq(false)

        await waitSecondsOnChain(60)

        // let T1 check if he is a guardian
        const isT1TrustedAfter = await guardianVault
          .connect(t1)
          ['isTrusted(address)'](ward.address)
        expect(isT1TrustedAfter).to.eq(true)
      })

      it('emits event when adding', async () => {
        const [ward, g1, t1] = await ethers.getSigners()
        await guardianVault.register(ward.address, [g1.address], [])
        const tx = await guardianVault.addTrustee(ward.address, t1.address)
        const receipt = await tx.wait()
        const event = receipt.events?.find((e) => e.event === 'TrusteeAdded')
        expect(event).to.not.be.undefined
        expect(event?.args).to.deep.eq([ward.address, t1.address])
      })

      it('rejects attempt to add ZeroAddress as Trustee', async () => {
        const [ward, g1] = await ethers.getSigners()
        await guardianVault.register(ward.address, [g1.address], [])

        await rejects(
          guardianVault.addTrustee(ward.address, ethers.constants.AddressZero),
          'Cant use ZeroAddress as Trustee',
        )
      })

      it('rejects attempt to add already added address as Trustee', async () => {
        const [ward, g1, t1] = await ethers.getSigners()
        await guardianVault.register(ward.address, [g1.address], [])

        await guardianVault.addTrustee(ward.address, t1.address)
        await rejects(
          guardianVault.addTrustee(ward.address, t1.address),
          'Trustee is already added',
        )
      })

      it('rejects attempt to add Trustee by not owner', async () => {
        const [ward, g1, t1] = await ethers.getSigners()
        await guardianVault.register(ward.address, [g1.address], [])

        const notOwner = guardianVault.connect(t1)
        await rejects(
          notOwner.addTrustee(ward.address, t1.address),
          'revert Ownable: caller is not the owner',
        )
      })
    })
    describe('Remove', () => {
      async function addTrusteeNow(ward: string, address: string) {
        const timelockPeriod = await guardianVault.getTimelockPeriod(ward)
        await guardianVault.addTrustee(ward, address)
        // add 10s delay to make sure
        await waitSecondsOnChain(timelockPeriod.toNumber() + 10)
      }
      it('removes an existing guardian correctly', async () => {
        const [ward, g1, t1] = await ethers.getSigners()
        await guardianVault.register(ward.address, [g1.address], [])

        await addTrusteeNow(ward.address, t1.address)
        const isT1TrustedByOwnerBefore = await guardianVault[
          'isTrusted(address,address)'
        ](ward.address, t1.address)
        expect(isT1TrustedByOwnerBefore).to.eq(true)

        await guardianVault.removeTrustee(ward.address, t1.address)
        const isT1TrustedByOwnerAfter = await guardianVault[
          'isTrusted(address,address)'
        ](ward.address, t1.address)
        expect(isT1TrustedByOwnerAfter).to.eq(false)
      })
      it('emits event when removing', async () => {
        const [ward, g1, t1] = await ethers.getSigners()
        await guardianVault.register(ward.address, [g1.address], [])

        await addTrusteeNow(ward.address, t1.address)
        const tx = await guardianVault.removeTrustee(ward.address, t1.address)
        const receipt = await tx.wait()
        const event = receipt.events?.find((e) => e.event === 'TrusteeRemoved')
        expect(event).to.not.be.undefined
        expect(event?.args).to.deep.eq([ward.address, t1.address])
      })
      it('rejects when removing non existent guardian', async () => {
        const [ward, g1, t1] = await ethers.getSigners()
        await guardianVault.register(ward.address, [g1.address], [])

        await rejects(
          guardianVault.removeTrustee(ward.address, t1.address),
          'Trustee does not exist',
        )
      })
      it('rejects attempt to remove Guardian by not owner', async () => {
        const [ward, g1] = await ethers.getSigners()
        await guardianVault.register(ward.address, [g1.address], [])

        const notOwner = guardianVault.connect(g1)
        await rejects(
          notOwner.removeTrustee(ward.address, g1.address),
          'Sender not trusted',
        )
      })
    })
    describe('can run function with access restrictions', () => {
      it('can set timelock', async () => {
        const ZERO = 0
        const [ward, g1, t1] = await ethers.getSigners()
        await guardianVault.register(ward.address, [g1.address], [t1.address])

        // set timelock to 0
        await guardianVault.connect(t1).setTimelockPeriod(ward.address, ZERO)

        // check timelock value by owner
        const lockPeriod = await guardianVault.getTimelockPeriod(ward.address)

        expect(lockPeriod).to.eq(ZERO)
      })
    })
  })
  describe('Consensus', () => {
    describe('Read', () => {
      it('defaults to false', async () => {
        const [ward, g1] = await ethers.getSigners()
        await guardianVault.register(ward.address, [g1.address], [])

        const ACTION_HASH = ethers.utils.keccak256(ethers.utils.randomBytes(8))

        const isApproved = await guardianVault.isApproved(
          ward.address,
          ACTION_HASH,
        )
        expect(isApproved).to.eq(false)
      })
      it('is true if 1/1', async () => {
        const [ward, g1] = await ethers.getSigners()
        await guardianVault.register(ward.address, [g1.address], [])

        const ACTION_HASH = ethers.utils.keccak256(ethers.utils.randomBytes(8))

        await guardianVault.approve(g1.address, ward.address, ACTION_HASH)

        const isApproved = await guardianVault.isApproved(
          ward.address,
          ACTION_HASH,
        )
        expect(isApproved).to.eq(true)
      })
      it('is true if 1/2', async () => {
        const [ward, g1, g2] = await ethers.getSigners()
        await guardianVault.register(ward.address, [g1.address, g2.address], [])

        const ACTION_HASH = ethers.utils.keccak256(ethers.utils.randomBytes(8))

        await guardianVault.approve(g1.address, ward.address, ACTION_HASH)

        const isApproved = await guardianVault.isApproved(
          ward.address,
          ACTION_HASH,
        )
        expect(isApproved).to.eq(true)
      })
      it('is false if 1/3', async () => {
        const [ward, g1, g2, g3] = await ethers.getSigners()
        await guardianVault.register(
          ward.address,
          [g1.address, g2.address, g3.address],
          [],
        )

        const ACTION_HASH = ethers.utils.keccak256(ethers.utils.randomBytes(8))

        await guardianVault.approve(g1.address, ward.address, ACTION_HASH)

        const isApproved = await guardianVault.isApproved(
          ward.address,
          ACTION_HASH,
        )
        expect(isApproved).to.eq(false)
      })
      it('is true if 2/3', async () => {
        const [ward, g1, g2, g3] = await ethers.getSigners()
        await guardianVault.register(
          ward.address,
          [g1.address, g2.address, g3.address],
          [],
        )

        const ACTION_HASH = ethers.utils.keccak256(ethers.utils.randomBytes(8))

        await guardianVault.approve(g1.address, ward.address, ACTION_HASH)
        await guardianVault.approve(g2.address, ward.address, ACTION_HASH)

        const isApproved = await guardianVault.isApproved(
          ward.address,
          ACTION_HASH,
        )
        expect(isApproved).to.eq(true)
      })
    })
  })
})
