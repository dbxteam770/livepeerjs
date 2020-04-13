import { useState, useEffect, useCallback, useRef } from 'react'
import { useQuery, useMutation } from '@apollo/react-hooks'
import gql from 'graphql-tag'
import { useWeb3React } from '@web3-react/core'
import { Injected } from '../lib/connectors'
import { isMobile } from 'react-device-detect'

export function useWeb3Mutation(mutation, options) {
  const initialState = {
    mutate: null,
    isBroadcasted: false,
    isMining: false,
    isMined: false,
    txHash: null,
    error: null,
    gasPrice: null,
  }

  const [result, setResult] = useState(initialState)

  const reset = useCallback(() => {
    setResult({ ...initialState, mutate: result.mutate })
  }, [initialState])

  const [
    mutate,
    { data, loading: dataLoading, error: mutationError },
  ] = useMutation(mutation, options)

  const GET_TRANSACTION_STATUS = gql`
    query getTxReceiptStatus($txHash: String) {
      getTxReceiptStatus: getTxReceiptStatus(txHash: $txHash) {
        status
      }
    }
  `

  const {
    data: transactionStatus,
    loading: transactionStatusLoading,
    error: queryError,
  } = useQuery(GET_TRANSACTION_STATUS, {
    variables: {
      txHash: data?.txHash,
    },
    notifyOnNetworkStatusChange: true,
    // skip query if tx hasn't yet been broadcasted or has been mined
    skip: !result.isBroadcasted || result.isMined,
    context: options?.context,
    ...options,
  })

  const GET_TRANSACTION = gql`
    query transaction($txHash: String) {
      transaction: transaction(txHash: $txHash)
    }
  `

  const { data: transactionData, loading: transactionLoading } = useQuery(
    GET_TRANSACTION,
    {
      variables: {
        txHash: data?.txHash,
      },
      notifyOnNetworkStatusChange: true,
      // skip query if no txHash
      skip: !data?.txHash,
      ...options,
    },
  )

  useEffect(() => {
    if (mutate) {
      setResult({ ...result, mutate })
    }
    if (data) {
      setResult({
        ...result,
        isBroadcasted: true,
        isMining: true,
        txHash: data.txHash,
      })
    }
    if (mutationError) {
      setResult({
        ...result,
        error: mutationError,
      })
    }
    if (transactionData) {
      setResult({
        ...result,
        gasPrice: transactionData.transaction.gasPrice.toString(),
      })
    }
    if (queryError) {
      setResult({
        ...result,
        error: queryError,
      })
    }
    if (transactionStatus) {
      setResult({
        ...result,
        isMined: true,
        isMining: false,
      })
    }
  }, [dataLoading, transactionLoading, transactionStatusLoading])
  return { result, reset }
}

// modified from https://usehooks.com/usePrevious/
export function usePrevious(value) {
  // The ref object is a generic container whose current property is mutable ...
  // ... and can hold any value, similar to an instance property on a class
  const ref = useRef()

  // Store current value in ref
  useEffect(() => {
    ref.current = value
  }, [value]) // Only re-run if value changes

  // Return previous value (happens before update in useEffect above)
  return ref.current
}

export function useEagerConnect() {
  const { activate, active } = useWeb3React()
  const [tried, setTried] = useState(false)

  useEffect(() => {
    Injected.isAuthorized().then((isAuthorized: boolean) => {
      if (isAuthorized) {
        activate(Injected, undefined, true).catch(() => {
          setTried(true)
        })
      } else {
        if (isMobile && window['ethereum']) {
          activate(Injected, undefined, true).catch(() => {
            setTried(true)
          })
        } else {
          setTried(true)
        }
      }
    })
  }, []) // intentionally only running on mount (make sure it's only mounted once :))

  // if the connection worked, wait until we get confirmation of that to flip the flag
  useEffect(() => {
    if (!tried && active) {
      setTried(true)
    }
  }, [tried, active])

  return tried
}

export function useInactiveListener(suppress = false) {
  const { active, error, activate } = useWeb3React()

  useEffect(() => {
    const ethereum = window['ethereum']

    if (ethereum && ethereum.on && !active && !error && !suppress) {
      const handleChainChanged = () => {
        // eat errors
        activate(Injected, undefined, true).catch(() => {})
      }

      const handleAccountsChanged = accounts => {
        if (accounts.length > 0) {
          // eat errors
          activate(Injected, undefined, true).catch(() => {})
        }
      }

      const handleNetworkChanged = () => {
        // eat errors
        activate(Injected, undefined, true).catch(() => {})
      }

      ethereum.on('chainChanged', handleChainChanged)
      ethereum.on('networkChanged', handleNetworkChanged)
      ethereum.on('accountsChanged', handleAccountsChanged)

      return () => {
        if (ethereum.removeListener) {
          ethereum.removeListener('chainChanged', handleChainChanged)
          ethereum.removeListener('networkChanged', handleNetworkChanged)
          ethereum.removeListener('accountsChanged', handleAccountsChanged)
        }
      }
    }

    return () => {}
  }, [active, error, suppress, activate])
}
