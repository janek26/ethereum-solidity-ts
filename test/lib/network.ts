import { network } from 'hardhat'

export const waitSecondsOnChain: (seconds: number) => Promise<void> = async (
  seconds,
) => {
  await network.provider.send('evm_increaseTime', [seconds])
  await network.provider.send('evm_mine')
}
