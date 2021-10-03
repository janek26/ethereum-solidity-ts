import chai from 'chai'
import { solidity } from 'ethereum-waffle'
import { ethers } from 'hardhat'

import {
  Factory,
  Factory__factory,
  InfraGuardianVault,
  InfraGuardianVault__factory,
} from '../typechain'

chai.use(solidity)
const { expect } = chai

describe('WalletVault', () => {
  let factory: Factory
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

    // deploy WalletVault
    const Factory = (await ethers.getContractFactory(
      'Factory',
      owner,
    )) as Factory__factory

    factory = await (await Factory.deploy()).deployed()

    expect(factory.address).to.properAddress

    console.log('xxx GuardianVault', guardianVault.address)
    console.log('xxx Factory', factory.address)
  })

  describe('Can calc addresses', () => {
    it('calc address for wallet1 for g1', async () => {
      const [, g1] = await ethers.getSigners()
      const predictedAddress = await factory.computeAddress(
        g1.address,
        guardianVault.address,
        1,
      )
      expect(predictedAddress).to.be.properAddress
    })
    it('calc address for wallet2 for g1', async () => {
      const [, g1] = await ethers.getSigners()
      const predictedAddress = await factory.computeAddress(
        g1.address,
        guardianVault.address,
        2,
      )
      expect(predictedAddress).to.be.properAddress
    })
  })

  describe('Can deploy wallets', () => {
    it('calc address and deploy for wallet1 for g1', async () => {
      const [, g1] = await ethers.getSigners()
      const predictedAddress = await factory.computeAddress(
        g1.address,
        guardianVault.address,
        1,
      )
      expect(predictedAddress).to.be.properAddress

      const signature = await g1.signMessage(
        ethers.utils.arrayify(
          ethers.utils.solidityKeccak256(
            ['address', 'address', 'uint256'],
            [g1.address, guardianVault.address, 1],
          ),
        ),
      )
      const { v, r, s } = ethers.utils.splitSignature(signature)
      const tx = await factory.deploy(
        g1.address,
        guardianVault.address,
        1,
        v,
        r,
        s,
      )
      const re = await tx.wait()

      expect(re.events?.some((ev) => ev.event === 'WalletCreated')).to.eq(true)
      expect(
        re.events?.find((ev) => ev.event === 'WalletCreated')?.args?.[0] ===
          predictedAddress,
      ).to.eq(true)
    })

    it('calc address and deploy for wallet2 for g1 by g1', async () => {
      const [, g1] = await ethers.getSigners()
      const predictedAddress = await factory.computeAddress(
        g1.address,
        guardianVault.address,
        2,
      )
      expect(predictedAddress).to.be.properAddress

      const signature = await g1.signMessage(
        ethers.utils.arrayify(
          ethers.utils.solidityKeccak256(
            ['address', 'address', 'uint256'],
            [g1.address, guardianVault.address, 2],
          ),
        ),
      )
      const { v, r, s } = ethers.utils.splitSignature(signature)
      const tx = await factory
        .connect(g1)
        .deploy(g1.address, guardianVault.address, 2, v, r, s)
      const re = await tx.wait()

      expect(re.events?.some((ev) => ev.event === 'WalletCreated')).to.eq(true)
      expect(
        re.events?.find((ev) => ev.event === 'WalletCreated')?.args?.[0] ===
          predictedAddress,
      ).to.eq(true)
    })

    describe('Can not deploy wallet of different user', () => {
      it('deploy for wallet1 for g1 with g2 sign', async () => {
        const [, g1, g2] = await ethers.getSigners()

        const signature = await g2.signMessage(
          ethers.utils.arrayify(
            ethers.utils.solidityKeccak256(
              ['address', 'address', 'uint256'],
              [g1.address, guardianVault.address, 1],
            ),
          ),
        )
        const { v, r, s } = ethers.utils.splitSignature(signature)
        expect(
          factory.deploy(g1.address, guardianVault.address, 1, v, r, s),
        ).to.revertedWith('Not allowed')
      })
    })
  })
})
