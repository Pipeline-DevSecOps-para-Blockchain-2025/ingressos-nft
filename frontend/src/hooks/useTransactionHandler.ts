import React, { useState, useCallback } from 'react'
import { useTransactionStatus } from './useTransactionStatus'
import { useIngressosContract } from './useIngressosContract'

export interface TransactionOptions {
  onSuccess?: (hash: `0x${string}`) => void
  onError?: (error: Error) => void
  onConfirmed?: (receipt: any) => void
}

export interface UseTransactionHandlerReturn {
  // Transaction execution
  executeTransaction: <T extends any[]>(
    contractMethod: (...args: T) => Promise<`0x${string}`>,
    args: T,
    options?: TransactionOptions
  ) => Promise<void>

  // Transaction state
  isExecuting: boolean
  executionError: Error | null

  // Transaction status (from useTransactionStatus)
  transaction: ReturnType<typeof useTransactionStatus>['transaction']
  isPending: boolean
  isConfirming: boolean
  isConfirmed: boolean
  isFailed: boolean
  getStatusMessage: () => string
  getStatusColor: () => 'blue' | 'yellow' | 'green' | 'red' | 'gray'
  resetTransaction: () => void
}

export const useTransactionHandler = (): UseTransactionHandlerReturn => {
  const [isExecuting, setIsExecuting] = useState(false)
  const [executionError, setExecutionError] = useState<Error | null>(null)

  const transactionStatus = useTransactionStatus()
  const { isWritePending } = useIngressosContract()

  const executeTransaction = useCallback(async <T extends any[]>(
    contractMethod: (...args: T) => Promise<`0x${string}`>,
    args: T,
    options?: TransactionOptions
  ) => {
    try {
      setIsExecuting(true)
      setExecutionError(null)
      transactionStatus.resetTransaction()

      // Execute the contract method
      const hash = await contractMethod(...args)

      // Start tracking the transaction
      transactionStatus.startTransaction(hash)

      // Call success callback
      options?.onSuccess?.(hash)

    } catch (error) {
      const err = error as Error
      setExecutionError(err)
      options?.onError?.(err)
    } finally {
      setIsExecuting(false)
    }
  }, [transactionStatus])

  // Call confirmed callback when transaction is confirmed
  React.useEffect(() => {
    if (transactionStatus.isConfirmed && transactionStatus.transaction.receipt) {
      // This would be called when transaction is confirmed
      // For now, we'll leave it as a placeholder since we don't have the callback in the current state
    }
  }, [transactionStatus.isConfirmed, transactionStatus.transaction.receipt])

  return {
    // Transaction execution
    executeTransaction,

    // Transaction state
    isExecuting: isExecuting || isWritePending,
    executionError,

    // Transaction status
    transaction: transactionStatus.transaction,
    isPending: transactionStatus.isPending,
    isConfirming: transactionStatus.isConfirming,
    isConfirmed: transactionStatus.isConfirmed,
    isFailed: transactionStatus.isFailed,
    getStatusMessage: transactionStatus.getStatusMessage,
    getStatusColor: transactionStatus.getStatusColor,
    resetTransaction: transactionStatus.resetTransaction,
  }
}
