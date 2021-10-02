import chai from 'chai'
import { solidity } from 'ethereum-waffle'
import { ethers } from 'hardhat'

import {
  ERC20Mock,
  ERC20Mock__factory,
  InfraGuardianVault,
  InfraGuardianVault__factory,
  WalletVault,
  WalletVault__factory,
} from '../typechain'

chai.use(solidity)
const { expect } = chai

describe('WalletVault', () => {
  const TOTAL_SUPPLY_20_1 = 1000
  let walletVault: WalletVault
  let erc20Mock1: ERC20Mock
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
    const WalletVault = (await ethers.getContractFactory(
      'WalletVault',
      owner,
    )) as WalletVault__factory

    walletVault = await (
      await WalletVault.deploy(guardianVault.address, owner.address)
    ).deployed()

    expect(walletVault.address).to.properAddress

    const ERC20Mock = (await ethers.getContractFactory(
      'ERC20Mock',
      owner,
    )) as ERC20Mock__factory
    const deployment = await ERC20Mock.deploy(
      'ERC20Mock',
      '20-1',
      owner.address,
      TOTAL_SUPPLY_20_1,
    )
    erc20Mock1 = await deployment.deployed()

    expect(erc20Mock1.address).to.properAddress
  })

  describe('Ether', () => {
    it('can receive Ether', async () => {
      const ETHER_TO_TRANSFER = ethers.utils.parseEther('1')
      const [owner] = await ethers.getSigners()
      const initialOwnerBalance = await owner.getBalance()
      const tx = await owner.sendTransaction({
        to: walletVault.address,
        value: ETHER_TO_TRANSFER,
      })
      const receipt = await tx.wait()

      const walletVaultBalance = await ethers.provider.getBalance(
        walletVault.address,
      )

      expect(walletVaultBalance).to.eq(ETHER_TO_TRANSFER)

      const ownerBalance = await owner.getBalance()
      const txCosts = receipt.cumulativeGasUsed.mul(tx.gasPrice)

      expect(ownerBalance).to.eq(
        initialOwnerBalance.sub(txCosts).sub(ETHER_TO_TRANSFER),
      )
    })

    it('can sent Ether', async () => {
      const ETHER_TO_TRANSFER = ethers.utils.parseEther('1')
      const [owner] = await ethers.getSigners()
      const initialOwnerBalance = await owner.getBalance()
      const tx = await owner.sendTransaction({
        to: walletVault.address,
        value: ETHER_TO_TRANSFER,
      })
      const receipt = await tx.wait()

      const walletVaultBalance = await ethers.provider.getBalance(
        walletVault.address,
      )

      expect(walletVaultBalance).to.eq(ETHER_TO_TRANSFER)

      const ownerBalance = await owner.getBalance()
      const txCosts = receipt.cumulativeGasUsed.mul(tx.gasPrice)

      expect(ownerBalance).to.eq(
        initialOwnerBalance.sub(txCosts).sub(ETHER_TO_TRANSFER),
      )

      // sent back
      const tx2 = await walletVault.invoke(owner.address, ETHER_TO_TRANSFER, [])
      const receipt2 = await tx2.wait()
      const txCosts2 = receipt2.cumulativeGasUsed.mul(tx.gasPrice)

      const walletVaultBalanceAfter = await ethers.provider.getBalance(
        walletVault.address,
      )
      expect(walletVaultBalanceAfter).to.eq(
        walletVaultBalance.sub(ETHER_TO_TRANSFER),
      )
      const ownerBalanceAfter = await owner.getBalance()
      expect(ownerBalanceAfter).to.eq(
        initialOwnerBalance.sub(txCosts).sub(txCosts2),
      )

      console.log('Owner: ', ethers.utils.formatEther(initialOwnerBalance))
      console.log('Vault: ', '0')
      console.log('')
      console.log('Owner: ', ethers.utils.formatEther(ownerBalance))
      console.log('Vault: ', ethers.utils.formatEther(walletVaultBalance))
      console.log('')
      console.log('Owner: ', ethers.utils.formatEther(ownerBalanceAfter))
      console.log('Vault: ', ethers.utils.formatEther(walletVaultBalanceAfter))
    })

    it('can blocks sent Ether by unknown', async () => {
      const ETHER_TO_TRANSFER = ethers.utils.parseEther('1')
      const [owner, unknown] = await ethers.getSigners()

      // sent ether

      expect(
        walletVault
          .connect(unknown)
          .invoke(owner.address, ETHER_TO_TRANSFER, []),
      ).to.revertedWith('Sender not trusted')
    })
  })

  describe('ERC20', () => {
    it('can receive ERC20', async () => {
      const AMOUNT_TO_TRANSFER = 1
      const [owner] = await ethers.getSigners()
      await erc20Mock1.transfer(walletVault.address, AMOUNT_TO_TRANSFER)

      const walletVaultBalance = await erc20Mock1.balanceOf(walletVault.address)
      expect(walletVaultBalance).to.eq(AMOUNT_TO_TRANSFER)
      const ownerBalance = await erc20Mock1.balanceOf(owner.address)
      expect(ownerBalance).to.eq(TOTAL_SUPPLY_20_1 - AMOUNT_TO_TRANSFER)
    })

    it('can sent ERC20', async () => {
      const AMOUNT_TO_TRANSFER = 1
      const [owner] = await ethers.getSigners()

      // sent test token
      await erc20Mock1.transfer(walletVault.address, AMOUNT_TO_TRANSFER)

      const walletVaultBalance = await erc20Mock1.balanceOf(walletVault.address)
      expect(walletVaultBalance).to.eq(AMOUNT_TO_TRANSFER)
      const ownerBalance = await erc20Mock1.balanceOf(owner.address)
      expect(ownerBalance).to.eq(TOTAL_SUPPLY_20_1 - AMOUNT_TO_TRANSFER)

      // sent back
      await walletVault.invoke(
        erc20Mock1.address,
        0,
        erc20Mock1.interface.encodeFunctionData('transfer', [
          owner.address,
          AMOUNT_TO_TRANSFER,
        ]),
      )

      const walletVaultBalanceAfter = await erc20Mock1.balanceOf(
        walletVault.address,
      )
      expect(walletVaultBalanceAfter).to.eq(
        walletVaultBalance.sub(AMOUNT_TO_TRANSFER),
      )
      const ownerBalanceAfter = await erc20Mock1.balanceOf(owner.address)
      expect(ownerBalanceAfter).to.eq(ownerBalance.add(AMOUNT_TO_TRANSFER))

      console.log('Owner: ', '0')
      console.log('Vault: ', '0')
      console.log('')
      console.log('Owner: ', ownerBalance.toString())
      console.log('Vault: ', walletVaultBalance.toString())
      console.log('')
      console.log('Owner: ', ownerBalanceAfter.toString())
      console.log('Vault: ', walletVaultBalanceAfter.toString())
    })

    it('can blocks sent ERC20 by unknown', async () => {
      const AMOUNT_TO_TRANSFER = 1
      const [owner, unknown] = await ethers.getSigners()

      // sent ether

      expect(
        walletVault
          .connect(unknown)
          .invoke(
            erc20Mock1.address,
            0,
            erc20Mock1.interface.encodeFunctionData('transfer', [
              owner.address,
              AMOUNT_TO_TRANSFER,
            ]),
          ),
      ).to.revertedWith('Sender not trusted')
    })
  })
})
