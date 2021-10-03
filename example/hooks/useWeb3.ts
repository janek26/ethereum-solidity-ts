import { useWeb3React } from '@web3-react/core'
import { InjectedConnector } from '@web3-react/injected-connector'
import { ethers } from 'ethers'
import { useEffect } from 'react'

export const useWeb3 = (key?: string, skip: boolean = false) => {
  const web3 = useWeb3React<ethers.providers.Web3Provider>(key)

  useEffect(() => {
    if (!web3.active && !skip) {
      web3.activate(new InjectedConnector({}))
    }
  }, [web3.active, skip])

  return web3
}
