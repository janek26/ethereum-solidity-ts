import { ethers } from 'ethers'
import { useState } from 'react'
import styled from 'styled-components'

import {
  addGuardian,
  createAccount,
  removeGuardian,
  sentEther,
  useAccounts,
} from '../hooks/useAccounts'
import { useWeb3 } from '../hooks/useWeb3'

const Wrapper = styled.div`
  padding: 0 3em;
`

const Title = styled.h1`
  color: red;
  font-size: 50px;
`

const Subtitle = styled.h1`
  color: lightseagreen;
  font-size: 12px;
`

const Button = styled.button``

const AccountWrapper = styled.div`
  display: grid;
  gap: 1em;
  width: 100%;
  grid-template-columns: repeat(3, 1fr);
  margin: 2em 0;
`
const Account = styled.div`
  aspect-ratio: 1/1;
  background-color: lightgreen;
  padding: 2em;
  box-sizing: border-box;
`

export default function Home() {
  const web3 = useWeb3()
  const { accounts, refetch } = useAccounts(web3.library!, !web3.active)
  const [sentValue, setSentValue] = useState<{
    [key: string]: { value: string; to: string; addGuard: string }
  }>({})
  return (
    <Wrapper>
      <Title>Your accounts</Title>
      <Subtitle>You have {accounts.length} accounts</Subtitle>
      <label htmlFor="recovery" style={{ display: 'block' }}>
        Recovery Method:
      </label>
      <select style={{ display: 'block' }} id="recovery">
        <option>Guardians (Vault)</option>
        <option disabled>Flash Account (secured by owner + AGS)</option>
        <option disabled>
          Burn Account (just secured by owner, no recovery)
        </option>
      </select>
      <label htmlFor="transactions" style={{ display: 'block' }}>
        Transactions Filter:
      </label>
      <select
        style={{ display: 'block', marginBottom: '1em' }}
        id="transactions"
      >
        <option>Allow all Transactions</option>
        <option disabled>AGS needs to approve (2 out of 2)</option>
        <option disabled>All transactions need Guardian approval</option>
      </select>
      <Button
        onClick={async () => {
          await createAccount(web3.library!, accounts.length + 1)
          refetch()
        }}
        disabled={!web3.active}
      >
        Add account
      </Button>
      <AccountWrapper>
        {accounts.map((account) => {
          return (
            <Account key={account.address}>
              <p>
                <b>Balance:</b> {ethers.utils.formatEther(account.balance)}{' '}
                Ether
              </p>
              <p>
                <b>Guardians:</b> {account.guardians.toString()}
              </p>

              <h3>Receive</h3>
              <pre>{account.address}</pre>

              <h3>Sent</h3>
              <input
                placeholder="To address"
                value={sentValue[account.address]?.to ?? ''}
                onChange={(e) =>
                  setSentValue((x) => ({
                    ...x,
                    [account.address]: {
                      ...x[account.address],
                      to: e.target.value,
                    },
                  }))
                }
              />
              <input
                placeholder="Eth Amount"
                value={sentValue[account.address]?.value ?? ''}
                onChange={(e) =>
                  setSentValue((x) => ({
                    ...x,
                    [account.address]: {
                      ...x[account.address],
                      value: e.target.value,
                    },
                  }))
                }
              />
              <Button
                disabled={
                  !/^[0-9]+\.?[0-9]*$/.test(
                    sentValue[account.address]?.value,
                  ) ||
                  isNaN(parseFloat(sentValue[account.address]?.value)) ||
                  !ethers.utils.isAddress(sentValue[account.address]?.to)
                }
                onClick={async () => {
                  const transaction = {
                    to: sentValue[account.address].to,
                    value: ethers.utils.parseEther(
                      sentValue[account.address].value,
                    ),
                  }
                  await sentEther(web3.library!, account.address, transaction)

                  setSentValue((x) => ({
                    ...x,
                    [account.address]: {
                      ...x[account.address],
                      value: '',
                      to: '',
                    },
                  }))

                  refetch()
                }}
              >
                Sent Eth
              </Button>
              <h3>Guardians</h3>
              <input
                value={sentValue[account.address]?.addGuard ?? ''}
                onChange={(e) =>
                  setSentValue((x) => ({
                    ...x,
                    [account.address]: {
                      ...x[account.address],
                      addGuard: e.target.value,
                    },
                  }))
                }
                placeholder="Guardian Address"
              />
              <Button
                disabled={
                  !ethers.utils.isAddress(sentValue[account.address]?.addGuard)
                }
                onClick={async () => {
                  await addGuardian(
                    web3.library!,
                    account.address,
                    sentValue[account.address]?.addGuard,
                  )
                  setSentValue((x) => ({
                    ...x,
                    [account.address]: {
                      ...x[account.address],
                      addGuard: '',
                    },
                  }))
                  refetch()
                }}
              >
                Add
              </Button>
              <Button
                disabled={
                  !ethers.utils.isAddress(sentValue[account.address]?.addGuard)
                }
                onClick={async () => {
                  await removeGuardian(
                    web3.library!,
                    account.address,
                    sentValue[account.address]?.addGuard,
                  )
                  setSentValue((x) => ({
                    ...x,
                    [account.address]: {
                      ...x[account.address],
                      addGuard: '',
                    },
                  }))
                  refetch()
                }}
              >
                Remove
              </Button>
            </Account>
          )
        })}
      </AccountWrapper>
    </Wrapper>
  )
}
