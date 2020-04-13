import gql from 'graphql-tag'
import { useWeb3Mutation } from '../../hooks'
import Button from '../Button'
import { useWeb3React } from '@web3-react/core'
import { MAXIUMUM_VALUE_UINT256 } from '../../lib/utils'
import { useEffect } from 'react'
import { useApolloClient, useQuery } from '@apollo/react-hooks'

const GET_TRANSACTIONS = gql`
  {
    transactions @client {
      __typename
      confirmed
      txHash
      title
      startTime
      estimate
      gasPrice
    }
  }
`

export default () => {
  const context = useWeb3React()
  const client = useApolloClient()
  const APPROVE = gql`
    mutation approve($type: String!, $amount: String!) {
      txHash: approve(type: $type, amount: $amount)
    }
  `
  const { result, reset } = useWeb3Mutation(APPROVE, {
    context: {
      library: context?.library,
      provider: context?.library?._web3Provider,
      account: context?.account?.toLowerCase(),
      returnTxHash: true,
    },
  })
  const { mutate: approve, isBroadcasted, gasPrice, isMined, txHash } = result
  const { data: transactionsData } = useQuery(GET_TRANSACTIONS)

  useEffect(() => {
    if (result.txHash) {
      client.writeData({
        data: {
          transactions: [
            ...transactionsData.transactions.filter(t => t.txHash !== txHash),
            {
              __typename: 'Transaction',
              confirmed: isMined,
              txHash,
              title: 'Unlocking LPT for poll creation',
              startTime: 1587910633,
              estimate: 10000,
              gasPrice,
            },
          ],
        },
      })
    }
  }, [result])

  return (
    <>
      <Button
        onClick={async () => {
          try {
            reset()
            await approve({
              chainId: context.chainId,
              variables: { type: 'createPoll', amount: '1' },
            })
          } catch (e) {
            console.log(e)
          }
        }}
      >
        Unlock LPT for poll creation
      </Button>
    </>
  )
}
