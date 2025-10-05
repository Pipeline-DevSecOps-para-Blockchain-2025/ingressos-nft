import React from 'react'
import { formatEther, formatDateTime, copyToClipboard } from '../utils'
import type { EventWithId } from '../hooks/useEvents'

interface TransactionReceiptProps {
  transactionHash: string
  tokenId: number
  event: EventWithId
  gasUsed?: bigint
  gasPrice?: bigint
  blockNumber?: number
  timestamp?: number
  onClose?: () => void
  className?: string
}

const TransactionReceipt: React.FC<TransactionReceiptProps> = ({
  transactionHash,
  tokenId,
  event,
  gasUsed,
  gasPrice,
  blockNumber,
  timestamp,
  onClose,
  className = ''
}) => {
  const [copiedField, setCopiedField] = React.useState<string | null>(null)

  const handleCopy = async (text: string, field: string) => {
    const success = await copyToClipboard(text)
    if (success) {
      setCopiedField(field)
      setTimeout(() => setCopiedField(null), 2000)
    }
  }

  const totalGasCost = gasUsed && gasPrice ? gasUsed * gasPrice : null
  const ticketPrice = formatEther(event.ticketPrice)

  return (
    <div className={`bg-white rounded-lg shadow-lg border border-gray-200 ${className}`}>
      {/* Header */}
      <div className="bg-green-50 border-b border-green-200 p-6 rounded-t-lg">
        <div className="flex items-center justify-between">
          <div className="flex items-center">
            <div className="text-3xl mr-3">🎫</div>
            <div>
              <h2 className="text-xl font-bold text-green-800">
                Ticket Purchased Successfully!
              </h2>
              <p className="text-green-600 text-sm">
                Your NFT ticket has been minted
              </p>
            </div>
          </div>
          {onClose && (
            <button
              onClick={onClose}
              className="text-green-600 hover:text-green-800 text-xl"
            >
              ✕
            </button>
          )}
        </div>
      </div>

      {/* Content */}
      <div className="p-6">
        {/* Ticket Information */}
        <div className="mb-6">
          <h3 className="font-semibold text-gray-900 mb-3">Ticket Details</h3>
          <div className="bg-gray-50 rounded-lg p-4 space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-gray-600">Event:</span>
              <span className="font-medium text-right">{event.name}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-gray-600">Venue:</span>
              <span className="text-right">{event.venue}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-gray-600">Date:</span>
              <span className="text-right">
                {formatDateTime(Number(event.date))}
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-gray-600">Token ID:</span>
              <div className="flex items-center gap-2">
                <span className="font-mono">#{tokenId}</span>
                <button
                  onClick={() => handleCopy(tokenId.toString(), 'tokenId')}
                  className="text-blue-600 hover:text-blue-800 text-sm"
                >
                  {copiedField === 'tokenId' ? '✓' : '📋'}
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Transaction Information */}
        <div className="mb-6">
          <h3 className="font-semibold text-gray-900 mb-3">Transaction Details</h3>
          <div className="space-y-3">
            {/* Transaction Hash */}
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <div className="flex justify-between items-start mb-2">
                <span className="text-blue-800 font-medium">Transaction Hash:</span>
                <button
                  onClick={() => handleCopy(transactionHash, 'hash')}
                  className="text-blue-600 hover:text-blue-800 text-sm"
                >
                  {copiedField === 'hash' ? '✓ Copied' : '📋 Copy'}
                </button>
              </div>
              <p className="font-mono text-sm text-blue-700 break-all">
                {transactionHash}
              </p>
            </div>

            {/* Block Information */}
            {blockNumber && (
              <div className="flex justify-between items-center">
                <span className="text-gray-600">Block Number:</span>
                <span className="font-mono">#{blockNumber}</span>
              </div>
            )}

            {/* Timestamp */}
            {timestamp && (
              <div className="flex justify-between items-center">
                <span className="text-gray-600">Confirmed At:</span>
                <span>{formatDateTime(timestamp)}</span>
              </div>
            )}
          </div>
        </div>

        {/* Cost Breakdown */}
        <div className="mb-6">
          <h3 className="font-semibold text-gray-900 mb-3">Cost Breakdown</h3>
          <div className="border border-gray-200 rounded-lg p-4 space-y-2">
            <div className="flex justify-between">
              <span className="text-gray-600">Ticket Price:</span>
              <span className="font-medium">{ticketPrice} ETH</span>
            </div>
            
            {totalGasCost && (
              <div className="flex justify-between">
                <span className="text-gray-600">Gas Fee:</span>
                <span>{formatEther(totalGasCost)} ETH</span>
              </div>
            )}
            
            {gasUsed && (
              <div className="flex justify-between text-sm text-gray-500">
                <span>Gas Used:</span>
                <span>{gasUsed.toLocaleString()}</span>
              </div>
            )}
            
            {gasPrice && (
              <div className="flex justify-between text-sm text-gray-500">
                <span>Gas Price:</span>
                <span>{formatEther(gasPrice)} ETH</span>
              </div>
            )}

            {totalGasCost && (
              <div className="border-t border-gray-200 pt-2 mt-2">
                <div className="flex justify-between font-semibold">
                  <span>Total Paid:</span>
                  <span>{formatEther(event.ticketPrice + totalGasCost)} ETH</span>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Next Steps */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
          <h4 className="font-medium text-blue-900 mb-2">What's Next?</h4>
          <ul className="text-blue-800 text-sm space-y-1">
            <li>• Your ticket is now stored in your wallet as an NFT</li>
            <li>• You can view it in the "My Tickets" section</li>
            <li>• Present this NFT at the event for entry</li>
            <li>• You can transfer or sell your ticket if needed</li>
          </ul>
        </div>

        {/* Action Buttons */}
        <div className="flex gap-3">
          <button
            onClick={() => {
              // Navigate to My Tickets - will be implemented in next task
              console.log('Navigate to My Tickets')
            }}
            className="flex-1 py-2 px-4 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            View My Tickets
          </button>
          
          <button
            onClick={() => {
              // Open blockchain explorer
              const explorerUrl = `https://etherscan.io/tx/${transactionHash}`
              window.open(explorerUrl, '_blank')
            }}
            className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
          >
            View on Explorer
          </button>
        </div>
      </div>
    </div>
  )
}

export default TransactionReceipt