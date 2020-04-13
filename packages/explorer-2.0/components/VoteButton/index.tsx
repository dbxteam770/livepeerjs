import { useWeb3React } from '@web3-react/core'
import gql from 'graphql-tag'
import { useWeb3Mutation } from '../../hooks'
import Button from '../Button'

export default ({ pollAddress, choiceId, children, ...props }) => {
  const context = useWeb3React()

  const VOTE = gql`
    mutation vote($pollAddress: String!, $choiceId: Int!) {
      txHash: vote(pollAddress: $pollAddress, choiceId: $choiceId)
    }
  `

  const {
    result: { mutate: vote, isBroadcasted, isMined, txHash },
    reset,
  } = useWeb3Mutation(VOTE, {
    context: {
      chainId: context.chainId,
      provider: context.library._web3Provider,
      account: context.account.toLowerCase(),
      returnTxHash: true,
    },
  })

  if (!context.active) {
    return null
  }

  return (
    <Button
      onClick={() => vote({ variables: { pollAddress, choiceId } })}
      {...props}
    >
      {children}
    </Button>
  )
}
