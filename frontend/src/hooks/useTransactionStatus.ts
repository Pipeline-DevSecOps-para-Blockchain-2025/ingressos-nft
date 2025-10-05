import { useWaitForTransactionReceipt } from 'wagmi'
import { useState, useCallback, useEffect } from 'react'

export interface TransactionState {
  hash: `0x${string}` | null
  status: 'idle' | 'pending' | 'confirming' | 'confirmed' | 'failed'
  error: Error | null
  receipt: any | null
  confirmations: number
}

export interface UseTransactionStatusReturn {
  // Current transaction state
  transaction: TransactionState

  // Actions
  startTransaction: (hash: `0x${string}`) => void
  resetTransaction: () => void

  // Status checks
  isPending: boolean
  isConfirming: boolean
  isConfirmed: boolean
  isFailed: boolean

  // Utilities
  getStatusMessage: () => string
  getStatusColor: () => 'blue' | 'yellow' | 'green' | 'red' | 'gray'
}

const initialState: TransactionState = {
  hash: null,
  status: 'idle',
  error: null,
  receipt: null,
  confirmations: 0,
}

export const useTransactionStatus = (): UseTransactionStatusReturn => {
  const [transaction, setTransaction] = useState<TransactionState>(initialState)

  // Wait for transaction receipt
  const {
    data: receipt,
    error: receiptError,
    isSuccess: isReceiptSuccess,
    isError: isReceiptError,
  } = useWaitForTransactionReceipt({
    hash: transaction.hash || undefined,
    query: {
      enabled: !!transaction.hash && transaction.status === 'confirming',
    },
  })

  // Update transaction state based on receipt status
  useEffect(() => {
    if (transaction.status === 'confirming') {
      if (isReceiptSuccess && receipt) {
        setTransaction(prev => ({
          ...prev,
          status: 'confirmed',
          receipt,
          confirmations: receipt.blockNumber ? 1 : 0,
        }))
      } else if (isReceiptError && receiptError) {
        setTransaction(prev => ({
          ...prev,
          status: 'failed',
          error: receiptError,
        }))
      }
    }
  }, [isReceiptSuccess, isReceiptError, receipt, receiptError, transaction.status])

  // Start tracking a new transaction
  const startTransaction = useCallback((hash: `0x${string}`) => {
    setTransaction({
      hash,
      status: 'confirming',
      error: null,
      receipt: null,
      confirmations: 0,
    })
  }, [])

  // Reset transaction state
  const resetTransaction = useCallback(() => {
    setTransaction(initialState)
  }, [])

  // Status checks
  const isPending = transaction.status === 'pending'
  const isConfirming = transaction.status === 'confirming'
  const isConfirmed = transaction.status === 'confirmed'
  const isFailed = transaction.status === 'failed'

  // Get status message
  const getStatusMessage = useCallback((): string => {
    switch (transaction.status) {
      case 'idle':
        return 'Ready'
      case 'pending':
        return 'Preparing transaction...'
      case 'confirming':
        return 'Waiting for confirmation...'
      case 'confirmed':
        return 'Transaction confirmed!'
      case 'failed':
        return transaction.error?.message || 'Transaction failed'
      default:
        return 'Unknown status'
    }
  }, [transaction.status, transaction.error])

  // Get status color for UI
  const getStatusColor = useCallback((): 'blue' | 'yellow' | 'green' | 'red' | 'gray' => {
    switch (transaction.status) {
      case 'idle':
        return 'gray'
      case 'pending':
        return 'blue'
      case 'confirming':
        return 'yellow'
      case 'confirmed':
        return 'green'
      case 'failed':
        return 'red'
      default:
        return 'gray'
    }
  }, [transaction.status])

  return {
    // Current transaction state
    transaction,

    // Actions
    startTransaction,
    resetTransaction,

    // Status checks
    isPending,
    isConfirming,
    isConfirmed,
    isFailed,

    // Utilities
    getStatusMessage,
    getStatusColor,
  }
}
