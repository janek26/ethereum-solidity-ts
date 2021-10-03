import { BigNumber, BigNumberish, ethers } from 'ethers'
import { useEffect, useState } from 'react'

import {
  Factory__factory,
  InfraGuardianVault__factory,
  WalletVault__factory,
} from '../typechain'

const NEXT_PUBLIC_FACTORY_ADDRESS = process.env.NEXT_PUBLIC_FACTORY_ADDRESS!
const NEXT_PUBLIC_GUARDIAN_VAULT_ADDRESS = process.env
  .NEXT_PUBLIC_GUARDIAN_VAULT_ADDRESS!

export const removeGuardian = async (
  web3: ethers.providers.Web3Provider,
  accountAddress: string,
  guardian: string,
) => {
  return invokeAccount(web3, accountAddress, {
    to: NEXT_PUBLIC_GUARDIAN_VAULT_ADDRESS,
    value: 0,
    data: InfraGuardianVault__factory.connect(
      NEXT_PUBLIC_GUARDIAN_VAULT_ADDRESS,
      web3,
    ).interface.encodeFunctionData('removeGuardian', [
      accountAddress,
      guardian,
    ]),
  })
}
export const addGuardian = async (
  web3: ethers.providers.Web3Provider,
  accountAddress: string,
  guardian: string,
) => {
  return invokeAccount(web3, accountAddress, {
    to: NEXT_PUBLIC_GUARDIAN_VAULT_ADDRESS,
    value: 0,
    data: InfraGuardianVault__factory.connect(
      NEXT_PUBLIC_GUARDIAN_VAULT_ADDRESS,
      web3,
    ).interface.encodeFunctionData('addGuardian', [accountAddress, guardian]),
  })
}

export const sentEther = (
  web3: ethers.providers.Web3Provider,
  accountAddress: string,
  transaction: {
    to: string
    value: BigNumberish
  },
) => {
  return invokeAccount(web3, accountAddress, { ...transaction, data: '0x' })
}

export const invokeAccount = async (
  web3: ethers.providers.Web3Provider,
  accountAddress: string,
  transaction: {
    to: string
    value: BigNumberish
    data: string
  },
) => {
  const signer = web3.getSigner(0)
  const wallet = WalletVault__factory.connect(accountAddress, signer)

  const tx = await wallet.invoke(
    transaction.to,
    transaction.value,
    transaction.data,
  )
  return tx.wait()
}

export const createAccount = async (
  web3: ethers.providers.Web3Provider,
  nonce: number,
) => {
  if (!NEXT_PUBLIC_FACTORY_ADDRESS)
    throw new Error('No NEXT_PUBLIC_FACTORY_ADDRESS set')
  if (!NEXT_PUBLIC_GUARDIAN_VAULT_ADDRESS)
    throw new Error('No NEXT_PUBLIC_GUARDIAN_VAULT_ADDRESS set')
  const signer = web3.getSigner(0)
  const signerAddress = await signer.getAddress()
  const signature = await signer.signMessage(
    ethers.utils.arrayify(
      ethers.utils.solidityKeccak256(
        ['address', 'address', 'uint256'],
        [signerAddress, NEXT_PUBLIC_GUARDIAN_VAULT_ADDRESS, nonce],
      ),
    ),
  )
  console.log('signed', signature)
  const { v, r, s } = ethers.utils.splitSignature(signature)

  const factory = Factory__factory.connect(NEXT_PUBLIC_FACTORY_ADDRESS, signer)
  console.log({
    to: NEXT_PUBLIC_FACTORY_ADDRESS,
    from: signerAddress,
    value: 0,
    data: factory.interface.encodeFunctionData('deploy', [
      signerAddress,
      NEXT_PUBLIC_GUARDIAN_VAULT_ADDRESS,
      nonce,
      v,
      r,
      s,
    ]),
  })
  const tx = await signer.sendTransaction({
    to: NEXT_PUBLIC_FACTORY_ADDRESS,
    from: signerAddress,
    value: 0,
    data: factory.interface.encodeFunctionData('deploy', [
      signerAddress,
      NEXT_PUBLIC_GUARDIAN_VAULT_ADDRESS,
      nonce,
      v,
      r,
      s,
    ]),
  })
  const conf = await tx.wait()
  console.log(conf.logs)
}

interface Account {
  address: string
  balance: BigNumber
  guardians: BigNumber
}

export const useAccounts = (
  web3: ethers.providers.Web3Provider,
  skip: boolean = false,
) => {
  const [accounts, setAccounts] = useState<Account[]>([])
  const [refetch, setRefetch] = useState(0)

  useEffect(() => {
    if (skip) return
    if (!NEXT_PUBLIC_FACTORY_ADDRESS)
      throw new Error('No NEXT_PUBLIC_FACTORY_ADDRESS set')
    if (!NEXT_PUBLIC_GUARDIAN_VAULT_ADDRESS)
      throw new Error('No NEXT_PUBLIC_GUARDIAN_VAULT_ADDRESS set')
    setAccounts([])

    const signer = web3.getSigner(0)
    const factory = Factory__factory.connect(NEXT_PUBLIC_FACTORY_ADDRESS, web3)

    let searching = true
    let nonce = 0

    const guardianVault = InfraGuardianVault__factory.connect(
      NEXT_PUBLIC_GUARDIAN_VAULT_ADDRESS,
      web3,
    )

    signer.getAddress().then(async (addr) => {
      while (searching) {
        nonce++
        const address = await factory.computeAddress(
          addr,
          NEXT_PUBLIC_GUARDIAN_VAULT_ADDRESS,
          nonce,
        )
        const contractCode = await web3.getCode(address)
        console.log('contractCode', contractCode)
        if (contractCode === '0x') {
          searching = false
        } else {
          const balance = await web3.getBalance(address)
          const guardians = await guardianVault.getGuardianLength(address)
          setAccounts((accs) => [...accs, { address, balance, guardians }])
        }
      }
    })
  }, [skip, refetch])

  return {
    accounts,
    refetch: () => {
      setRefetch((i) => ++i)
    },
  }
}
