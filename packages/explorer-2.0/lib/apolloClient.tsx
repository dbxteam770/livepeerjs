import { ApolloClient } from 'apollo-client'
import {
  InMemoryCache,
  defaultDataIdFromObject,
  IntrospectionFragmentMatcher,
} from 'apollo-cache-inmemory'
import { ApolloLink, Observable } from 'apollo-link'
import createSchema from './createSchema'
import { execute } from 'graphql/execution/execute'
import LivepeerSDK from '@livepeer/sdk'
import { detectNetwork } from './utils'

export default function createApolloClient(initialState, ctx) {
  const fragmentMatcher = new IntrospectionFragmentMatcher({
    introspectionQueryResultData: {
      __schema: { types: [] },
    },
  })

  const cache = new InMemoryCache({
    fragmentMatcher,
    dataIdFromObject: object => {
      switch (object.__typename) {
        case 'ThreeBoxSpace':
          return object.id // use the `id` field as the identifier
        default:
          return defaultDataIdFromObject(object) // fall back to default handling
      }
    },
  }).restore(initialState || {})

  cache.writeData({
    data: {
      walletModalOpen: false,
      stakingWidgetModalOpen: false,
      selectedStakingAction: '',
      uniswapModalOpen: false,
      roundStatusModalOpen: false,
      transactions: [],
      tourOpen: false,
      roi: 0.0,
      principle: 0.0,
      selectedTranscoder: {
        __typename: 'Transcoder',
        index: 0,
        rewardCut: null,
        id: null,
        threeBoxSpace: {
          __typename: 'ThreeBoxSpace',
          name: '',
          image: '',
          website: '',
          description: '',
        },
      },
    },
  })

  const link = new ApolloLink(operation => {
    return new Observable(observer => {
      Promise.resolve(createSchema())
        .then(async data => {
          const context = operation.getContext()
          const network = await detectNetwork(window['web3']?.currentProvider)
          let provider = ''
          let controllerAddress = ''
          if (network?.type === 'rinkeby') {
            provider = process.env.RPC_URL_4
            controllerAddress = process.env.CONTROLLER_ADDRESS_RINKEBY
          } else {
            provider = process.env.RPC_URL_1
            controllerAddress = process.env.CONTROLLER_ADDRESS_MAINNET
          }

          const sdk = await LivepeerSDK({
            provider,
            controllerAddress,
            ...(context.provider && {
              provider: context.provider,
            }),
            ...(context.account && { account: context.account }),
          })

          return execute(
            data,
            operation.query,
            null,
            {
              livepeer: sdk,
              ...context,
            },
            operation.variables,
            operation.operationName,
          )
        })
        .then(data => {
          if (!observer.closed) {
            observer.next(data)
            observer.complete()
          }
        })
        .catch(error => {
          if (!observer.closed) {
            observer.error(error)
          }
        })
    })
  })

  return new ApolloClient({
    ssrMode: Boolean(ctx),
    link,
    resolvers: {},
    cache,
  })
}
