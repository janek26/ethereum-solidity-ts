import { rejects } from 'assert'

import chai from 'chai'
import { solidity } from 'ethereum-waffle'
import { ethers, upgrades } from 'hardhat'

import {
  ERC20Mock,
  ERC20Mock__factory,
  WalletVault,
  WalletVault__factory,
} from '../typechain'

chai.use(solidity)
const { expect } = chai

describe('WalletVault', () => {
  const TOTAL_SUPPLY_20_1 = 1000
  let walletVault: WalletVault
  let erc20Mock1: ERC20Mock

  beforeEach(async () => {
    // deploy WalletVault
    const [owner] = await ethers.getSigners()

    const WalletVault = (await ethers.getContractFactory(
      'WalletVault',
      owner,
    )) as WalletVault__factory

    walletVault = (await upgrades.deployProxy(WalletVault, [[]])) as WalletVault

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
  })
})
