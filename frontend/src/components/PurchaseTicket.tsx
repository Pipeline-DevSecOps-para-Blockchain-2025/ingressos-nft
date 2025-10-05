import React, { useState, useEffect } from 'react'
import type { EventWithId } from '../hooks/useEvents'
import { useIngressosContract } from '../hooks/useIngressosContract'
import { useTransactionHandler } from '../hooks/useTransactionHandler'
import { useWallet } from '../hooks/useWallet'
import { formatEther } from '../utils'

interface PurchaseTicketProps {
  event: EventWithId
  onSuccess?: (transactionHash: string, tokenId: number) => void
  onCancel?: () => void
  className?: string
}

interface GasEstimate {
  gasLimit: bigint
  gasPrice: bigint
  totalCost: bigint
}

const PurchaseTicket: React.FC<PurchaseTicketProps> = ({
  event,
  onSuccess,
  onCancel,
  className = ''
}) => {
  const { address, isConnected } = useWallet()
  const balance = BigInt('1000000000000000000') // Mock balance for now
  const { purchaseTicket, formatPrice } = useIngressosContract()
  const {
    executeTransaction,
    isExecuting,
    executionError,
    transaction,
    isPending,
    isConfirming,
    isConfirmed,
    isFailed,
    getStatusMessage,
    getStatusColor,
    resetTransaction
  } = useTransactionHandler()

  const [gasEstimate, setGasEstimate] = useState<GasEstimate | null>(null)
  const [isEstimatingGas, setIsEstimatingGas] = useState(false)
  const [gasError, setGasError] = useState<string | null>(null)
  const [step, setStep] = useState<'confirm' | 'processing' | 'success' | 'error'>('confirm')

  const ticketPrice = formatPrice(event.ticketPrice)
  const ticketPriceWei = event.ticketPrice
  const hasInsufficientFunds = balance < ticketPriceWei

  // Estimate gas on component mount
  useEffect(() => {
    if (isConnected && address) {
      estimateGas()
    }
  }, [isConnected, address, event.eventId])

  // Handle transaction status changes
  useEffect(() => {
    if (isConfirmed && transaction.receipt) {
      setStep('success')
      // Extract token ID from transaction receipt if available
      const tokenId = 1 // This would be extracted from the transaction receipt in a real implementation
      onSuccess?.(transaction.hash!, tokenId)
    } else if (isFailed) {
      setStep('error')
    } else if (isExecuting || isPending || isConfirming) {
      setStep('processing')
    }
  }, [isConfirmed, isFailed, isExecuting, isPending, isConfirming, transaction, onSuccess])

  const estimateGas = async () => {
    if (!address) return

    setIsEstimatingGas(true)
    setGasError(null)

    try {
      // In a real implementation, you would estimate gas using the contract
      // For now, we'll use mock values
      const mockGasLimit = BigInt(150000) // Typical gas limit for NFT minting
      const mockGasPrice = BigInt(20000000000) // 20 gwei
      const gasCost = mockGasLimit * mockGasPrice
      const totalCost = ticketPriceWei + gasCost

      setGasEstimate({
        gasLimit: mockGasLimit,
        gasPrice: mockGasPrice,
        totalCost
      })
    } catch (error) {
      console.error('Gas estimation failed:', error)
      setGasError('Failed to estimate gas fees')
    } finally {
      setIsEstimatingGas(false)
    }
  }

  const handlePurchase = async () => {
    if (!isConnected || !address) {
      return
    }

    await executeTransaction(
      purchaseTicket,
      [event.eventId, ticketPrice],
      {
        onSuccess: (hash) => {
          console.log('Purchase transaction submitted:', hash)
        },
        onError: (error) => {
          console.error('Purchase failed:', error)
        }
      }
    )
  }

  const handleCancel = () => {
    resetTransaction()
    setStep('confirm')
    onCancel?.()
  }

  const handleRetry = () => {
    resetTransaction()
    setStep('confirm')
    estimateGas()
  }

  // Get status color for UI
  const statusColorClasses = {
    blue: 'bg-blue-100 text-blue-800 border-blue-200',
    yellow: 'bg-yellow-100 text-yellow-800 border-yellow-200',
    green: 'bg-green-100 text-green-800 border-green-200',
    red: 'bg-red-100 text-red-800 border-red-200',
    gray: 'bg-gray-100 text-gray-800 border-gray-200'
  }

  if (step === 'success') {
    return (
      <div className={`bg-white rounded-lg p-6 ${className}`}>
        <div className="text-center">
          <div className="text-6xl mb-4">🎉</div>
          <h2 className="text-2xl font-bold text-green-600 mb-2">
            Purchase Successful!
          </h2>
          <p className="text-gray-600 mb-4">
            Your ticket has been minted successfully
          </p>
          
          {transaction.hash && (
            <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-4">
              <p className="text-sm text-green-800 mb-2">Transaction Hash:</p>
              <p className="font-mono text-xs text-green-700 break-all">
                {transaction.hash}
              </p>
            </div>
          )}

          <button
            onClick={handleCancel}
            className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    )
  }

  if (step === 'error') {
    return (
      <div className={`bg-white rounded-lg p-6 ${className}`}>
        <div className="text-center">
          <div className="text-6xl mb-4">❌</div>
          <h2 className="text-2xl font-bold text-red-600 mb-2">
            Purchase Failed
          </h2>
          <p className="text-gray-600 mb-4">
            {executionError?.message || 'An error occurred during the purchase'}
          </p>

          <div className="flex gap-3 justify-center">
            <button
              onClick={handleRetry}
              className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              Try Again
            </button>
            <button
              onClick={handleCancel}
              className="px-6 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
            >
              Cancel
            </button>
          </div>
        </div>
      </div>
    )
  }

  if (step === 'processing') {
    const statusColor = getStatusColor()
    return (
      <div className={`bg-white rounded-lg p-6 ${className}`}>
        <div className="text-center">
          <div className="text-6xl mb-4">⏳</div>
          <h2 className="text-2xl font-bold text-gray-800 mb-2">
            Processing Purchase
          </h2>
          
          <div className={`inline-flex items-center px-4 py-2 rounded-lg border mb-4 ${statusColorClasses[statusColor]}`}>
            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-current mr-2"></div>
            {getStatusMessage()}
          </div>

          {transaction.hash && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
              <p className="text-sm text-blue-800 mb-2">Transaction Hash:</p>
              <p className="font-mono text-xs text-blue-700 break-all">
                {transaction.hash}
              </p>
            </div>
          )}

          <p className="text-gray-600 text-sm">
            Please wait while your transaction is being processed...
          </p>
        </div>
      </div>
    )
  }

  // Confirmation step
  return (
    <div className={`bg-white rounded-lg p-6 ${className}`}>
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-gray-900 mb-2">
          Purchase Ticket
        </h2>
        <p className="text-gray-600">
          Confirm your ticket purchase for {event.name}
        </p>
      </div>

      {/* Event Summary */}
      <div className="bg-gray-50 rounded-lg p-4 mb-6">
        <h3 className="font-medium text-gray-900 mb-3">Event Details</h3>
        <div className="space-y-2 text-sm">
          <div className="flex justify-between">
            <span className="text-gray-600">Event:</span>
            <span className="font-medium">{event.name}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-600">Venue:</span>
            <span>{event.venue}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-600">Date:</span>
            <span>{new Date(Number(event.date) * 1000).toLocaleDateString()}</span>
          </div>
        </div>
      </div>

      {/* Price Breakdown */}
      <div className="border border-gray-200 rounded-lg p-4 mb-6">
        <h3 className="font-medium text-gray-900 mb-3">Price Breakdown</h3>
        <div className="space-y-2 text-sm">
          <div className="flex justify-between">
            <span className="text-gray-600">Ticket Price:</span>
            <span className="font-medium">{ticketPrice} ETH</span>
          </div>
          
          {isEstimatingGas ? (
            <div className="flex justify-between">
              <span className="text-gray-600">Gas Fee:</span>
              <span className="text-gray-400">Estimating...</span>
            </div>
          ) : gasError ? (
            <div className="flex justify-between">
              <span className="text-gray-600">Gas Fee:</span>
              <span className="text-red-500 text-xs">Failed to estimate</span>
            </div>
          ) : gasEstimate ? (
            <>
              <div className="flex justify-between">
                <span className="text-gray-600">Gas Fee:</span>
                <span>{formatEther(gasEstimate.totalCost - ticketPriceWei)} ETH</span>
              </div>
              <div className="border-t border-gray-200 pt-2 mt-2">
                <div className="flex justify-between font-medium">
                  <span>Total Cost:</span>
                  <span>{formatEther(gasEstimate.totalCost)} ETH</span>
                </div>
              </div>
            </>
          ) : null}
        </div>
      </div>

      {/* Wallet Balance */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
        <div className="flex justify-between items-center">
          <span className="text-blue-800 font-medium">Your Balance:</span>
          <span className="text-blue-900 font-medium">{formatEther(balance)} ETH</span>
        </div>
        {hasInsufficientFunds && (
          <p className="text-red-600 text-sm mt-2">
            Insufficient funds for this purchase
          </p>
        )}
      </div>

      {/* Warnings */}
      {gasError && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-6">
          <p className="text-yellow-800 text-sm">
            ⚠️ Could not estimate gas fees. The transaction may fail or cost more than expected.
          </p>
          <button
            onClick={estimateGas}
            className="text-yellow-700 underline text-sm mt-1"
          >
            Try estimating again
          </button>
        </div>
      )}

      {/* Action Buttons */}
      <div className="flex gap-3">
        <button
          onClick={handlePurchase}
          disabled={!isConnected || hasInsufficientFunds || isExecuting}
          className="flex-1 py-3 px-4 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-medium"
        >
          {isExecuting ? 'Processing...' : 'Confirm Purchase'}
        </button>
        
        <button
          onClick={handleCancel}
          disabled={isExecuting}
          className="px-6 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 disabled:opacity-50 transition-colors"
        >
          Cancel
        </button>
      </div>

      {/* Additional Info */}
      <div className="mt-4 text-xs text-gray-500 text-center">
        By purchasing this ticket, you agree to the event terms and conditions.
        Your ticket will be minted as an NFT to your wallet.
      </div>
    </div>
  )
}

export default PurchaseTicket