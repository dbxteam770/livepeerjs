import { HttpLink } from 'apollo-link-http'
import fetch from 'isomorphic-unfetch'
import schema from '../apollo'
import {
  mergeSchemas,
  introspectSchema,
  makeRemoteExecutableSchema,
} from 'graphql-tools'
import { detectNetwork } from './utils'

const SUBGRAPH_MAINNET =
  'https://api.thegraph.com/subgraphs/name/livepeer/livepeer'

const SUBGRAPH_RINKEBY =
  'https://api.thegraph.com/subgraphs/name/livepeer/livepeer-rinkeby'

export default async () => {
  let uri = ''
  if (typeof window === 'undefined') {
    uri = SUBGRAPH_MAINNET
  } else {
    const network = await detectNetwork(window['web3']?.currentProvider)

    if (network?.type === 'rinkeby') {
      uri = SUBGRAPH_RINKEBY
    } else {
      uri = SUBGRAPH_MAINNET
    }
  }

  const subgraphServiceLink = new HttpLink({
    uri,
    fetch,
  })

  const createSubgraphServiceSchema = async () => {
    const executableSchema = makeRemoteExecutableSchema({
      schema: await introspectSchema(subgraphServiceLink),
      link: subgraphServiceLink,
    })
    return executableSchema
  }

  const subgraphSchema = await createSubgraphServiceSchema()

  const linkTypeDefs = `
    extend type Transcoder {
      threeBoxSpace: ThreeBoxSpace
    }
    extend type ThreeBoxSpace {
      transcoder: Transcoder
    }
    extend type Protocol {
      totalStake(block: String): String
    }
    extend type Delegator {
      pendingStake: String
      pendingFees: String
      tokenBalance: String
      ethBalance: String
    }
  `

  const merged = mergeSchemas({
    schemas: [subgraphSchema, schema, linkTypeDefs],
    resolvers: {
      Transcoder: {
        threeBoxSpace: {
          async resolve(_obj, _args, _context, _info) {
            const threeBoxSpace = await _info.mergeInfo.delegateToSchema({
              schema: schema,
              operation: 'query',
              fieldName: 'threeBoxSpace',
              args: {
                id: _obj.id,
              },
              context: _context,
              info: _info,
            })
            return threeBoxSpace
          },
        },
      },
      Delegator: {
        pendingStake: {
          async resolve(_delegator, _args, _context, _info) {
            const delegator = await _context.livepeer.rpc.getDelegator(
              _delegator.id,
            )
            return delegator.pendingStake
          },
        },
        pendingFees: {
          async resolve(_delegator, _args, _context, _info) {
            const delegator = await _context.livepeer.rpc.getDelegator(
              _delegator.id,
            )
            return delegator.pendingFees
          },
        },
        tokenBalance: {
          async resolve(_delegator, _args, _context, _info) {
            return await _context.livepeer.rpc.getTokenBalance(_delegator.id)
          },
        },
        ethBalance: {
          async resolve(_delegator, _args, _context, _info) {
            return await _context.livepeer.rpc.getEthBalance(_delegator.id)
          },
        },
      },
      Protocol: {
        totalStake: {
          async resolve(_protocol, _args, _context, _info) {
            const Web3 = require('web3')
            const isRinkeby = _context.livepeer.config?.eth?.currentProvider?.host?.includes(
              'rinkeby',
            )
            let web3 = new Web3(
              `https://eth-${
                isRinkeby ? 'rinkeby' : 'mainnet'
              }.alchemyapi.io/v2/${process.env.ALCHEMY_API_KEY}`,
            )
            let contract = new web3.eth.Contract(
              _context.livepeer.config.contracts.LivepeerToken.abi,
              _context.livepeer.config.contracts.LivepeerToken.address,
            )

            return await contract.methods
              .balanceOf(_context.livepeer.config.contracts.Minter.address)
              .call({}, _args.blockNumber ? _args.blockNumber : null)
          },
        },
      },
    },
  })

  return merged
}
