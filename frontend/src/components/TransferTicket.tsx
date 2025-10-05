import React, { useState } from 'react'
import { useIngressosContract } from '../hooks/useIngressosContract'
import { useTransactionHandler } from '../hooks/useTransactionHandler'
import { useWallet } from '../hooks/useWallet'
import { formatEther } from '../utils'
import type { TicketMetadata } from '../hooks/useUserTickets'
import type { Address } from 'viem'

interface TransferTicketProps {
  ticket: TicketMetadata
  onSuccess?: (transactionHash: string) => void
  onCancel?: () => void
  className?: string
}

const TransferTicket: React.FC<TransferTicketProps> = ({
  ticket,
  onSuccess,
  onCancel,
  className = ''
}) => {
  const { address, isConnected } = useWallet()
  const { transferTicket } = useIngressosContract()
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

  const [recipientAddress, setRecipientAddress] = useState('')
  const [addressError, setAddressError] = useState<string | null>(null)
  const [step, setStep] = useState<'form' | 'confirm' | 'processing' | 'success' | 'error'>('form')

  // Handle transaction status changes
  React.useEffect(() => {
    if (isConfirmed && transaction.receipt) {
      setStep('success')
      onSuccess?.(transaction.hash!)
    } else if (isFailed) {
      setStep('error')
    } else if (isExecuting || isPending || isConfirming) {
      setStep('processing')
    }
  }, [isConfirmed, isFailed, isExecuting, isPending, isConfirming, transaction, onSuccess])

  const validateAddress = (addr: string): boolean => {
    if (!addr) {
      setAddressError('Recipient address is required')
      return false
    }

    if (!addr.startsWith('0x')) {
      setAddressError('Address must start with 0x')
      return false
    }

    if (addr.length !== 42) {
      setAddressError('Address must be 42 characters long')
      return false
    }

    if (!/^0x[a-fA-F0-9]{40}$/.test(addr)) {
      setAddressError('Invalid address format')
      return false
    }

    if (addr.toLowerCase() === address?.toLowerCase()) {
      setAddressError('Cannot transfer to yourself')
      return false
    }

    setAddressError(null)
    return true
  }

  const handleAddressChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.trim()
    setRecipientAddress(value)

    if (value) {
      validateAddress(value)
    } else {
      setAddressError(null)
    }
  }

  const handleConfirm = () => {
    if (validateAddress(recipientAddress)) {
      setStep('confirm')
    }
  }

  const handleTransfer = async () => {
    if (!isConnected || !address || !validateAddress(recipientAddress)) {
      return
    }

    await executeTransaction(
      transferTicket,
      [address, recipientAddress as Address, ticket.tokenId],
      {
        onSuccess: (hash) => {
          console.log('Transfer transaction submitted:', hash)
        },
        onError: (error) => {
          console.error('Transfer failed:', error)
        }
      }
    )
  }

  const handleCancel = () => {
    resetTransaction()
    setStep('form')
    setRecipientAddress('')
    setAddressError(null)
    onCancel?.()
  }

  const handleRetry = () => {
    resetTransaction()
    setStep('form')
  }

  const handleBack = () => {
    setStep('form')
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
          <div className="text-6xl mb-4">✅</div>
          <h2 className="text-2xl font-bold text-green-600 mb-2">
            Transfer Successful!
          </h2>
          <p className="text-gray-600 mb-4">
            Your ticket has been transferred successfully
          </p>

          <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-4">
            <div className="text-sm text-green-800 space-y-2">
              <div>
                <span className="font-medium">Ticket:</span> {ticket.eventName} #{ticket.ticketNumber}
              </div>
              <div>
                <span className="font-medium">Transferred to:</span>
                <div className="font-mono text-xs mt-1 break-all">
                  {recipientAddress}
                </div>
              </div>
              {transaction.hash && (
                <div>
                  <span className="font-medium">Transaction:</span>
                  <div className="font-mono text-xs mt-1 break-all">
                    {transaction.hash}
                  </div>
                </div>
              )}
            </div>
          </div>

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
            Transfer Failed
          </h2>
          <p className="text-gray-600 mb-4">
            {executionError?.message || 'An error occurred during the transfer'}
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
            Processing Transfer
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
            Please wait while your transfer is being processed...
          </p>
        </div>
      </div>
    )
  }

  if (step === 'confirm') {
    return (
      <div className={`bg-white rounded-lg p-6 ${className}`}>
        <div className="mb-6">
          <h2 className="text-2xl font-bold text-gray-900 mb-2">
            Confirm Transfer
          </h2>
          <p className="text-gray-600">
            Please review the transfer details before confirming
          </p>
        </div>

        {/* Ticket Summary */}
        <div className="bg-gray-50 rounded-lg p-4 mb-6">
          <h3 className="font-medium text-gray-900 mb-3">Ticket Details</h3>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-600">Event:</span>
              <span className="font-medium">{ticket.eventName}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Ticket Number:</span>
              <span>#{ticket.ticketNumber}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Token ID:</span>
              <span className="font-mono">{ticket.tokenId}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Original Price:</span>
              <span>{formatEther(ticket.purchasePrice)} ETH</span>
            </div>
          </div>
        </div>

        {/* Transfer Details */}
        <div className="border border-gray-200 rounded-lg p-4 mb-6">
          <h3 className="font-medium text-gray-900 mb-3">Transfer Details</h3>
          <div className="space-y-3 text-sm">
            <div>
              <label className="block text-gray-600 mb-1">From (You):</label>
              <p className="font-mono text-xs bg-gray-100 p-2 rounded">
                {address}
              </p>
            </div>
            <div>
              <label className="block text-gray-600 mb-1">To (Recipient):</label>
              <p className="font-mono text-xs bg-gray-100 p-2 rounded">
                {recipientAddress}
              </p>
            </div>
          </div>
        </div>

        {/* Warning */}
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-6">
          <div className="flex items-start">
            <div className="text-yellow-600 mr-3 mt-0.5">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div>
              <h4 className="text-yellow-800 font-medium">Important Notice</h4>
              <p className="text-yellow-700 text-sm mt-1">
                This transfer is permanent and cannot be undone. Make sure the recipient address is correct.
              </p>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex gap-3">
          <button
            onClick={handleTransfer}
            disabled={isExecuting}
            className="flex-1 py-3 px-4 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-medium"
          >
            {isExecuting ? 'Processing...' : 'Confirm Transfer'}
          </button>

          <button
            onClick={handleBack}
            disabled={isExecuting}
            className="px-6 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 disabled:opacity-50 transition-colors"
          >
            Back
          </button>
        </div>
      </div>
    )
  }

  // Form step
  return (
    <div className={`bg-white rounded-lg p-6 ${className}`}>
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-gray-900 mb-2">
          Transfer Ticket
        </h2>
        <p className="text-gray-600">
          Transfer your ticket to another wallet address
        </p>
      </div>

      {/* Ticket Summary */}
      <div className="bg-gray-50 rounded-lg p-4 mb-6">
        <h3 className="font-medium text-gray-900 mb-3">Ticket to Transfer</h3>
        <div className="space-y-2 text-sm">
          <div className="flex justify-between">
            <span className="text-gray-600">Event:</span>
            <span className="font-medium">{ticket.eventName}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-600">Ticket Number:</span>
            <span>#{ticket.ticketNumber}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-600">Token ID:</span>
            <span className="font-mono">{ticket.tokenId}</span>
          </div>
        </div>
      </div>

      {/* Recipient Address Form */}
      <div className="mb-6">
        <label htmlFor="recipient" className="block text-sm font-medium text-gray-700 mb-2">
          Recipient Address *
        </label>
        <input
          type="text"
          id="recipient"
          value={recipientAddress}
          onChange={handleAddressChange}
          placeholder="0x..."
          className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 font-mono text-sm ${
            addressError ? 'border-red-300' : 'border-gray-300'
          }`}
        />
        {addressError && (
          <p className="mt-1 text-sm text-red-600">{addressError}</p>
        )}
        <p className="mt-1 text-xs text-gray-500">
          Enter the Ethereum address of the recipient. Make sure it's correct as transfers cannot be undone.
        </p>
      </div>

      {/* Action Buttons */}
      <div className="flex gap-3">
        <button
          onClick={handleConfirm}
          disabled={!recipientAddress || !!addressError || !isConnected}
          className="flex-1 py-3 px-4 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-medium"
        >
          Continue
        </button>

        <button
          onClick={handleCancel}
          className="px-6 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
        >
          Cancel
        </button>
      </div>
    </div>
  )
}

export default TransferTicket
