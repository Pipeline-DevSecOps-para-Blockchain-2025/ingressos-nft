import React, { useState } from 'react'
import { formatEther, formatDateTime } from '../utils'
import TransferTicketModal from './TransferTicketModal'
import type { TicketMetadata } from '../hooks/useUserTickets'

interface TicketCardProps {
  ticket: TicketMetadata
  onClick?: (ticket: TicketMetadata) => void
  onTransfer?: (tokenId: number) => void
  showActions?: boolean
  className?: string
}

const TicketCard: React.FC<TicketCardProps> = ({
  ticket,
  onClick,
  onTransfer,
  showActions = true,
  className = ''
}) => {
  const [showTransferModal, setShowTransferModal] = useState(false)
  const handleCardClick = () => {
    onClick?.(ticket)
  }

  const handleDetailsClick = (e: React.MouseEvent) => {
    e.stopPropagation()
    onClick?.(ticket)
  }

  const getStatusColor = (status: number) => {
    switch (status) {
      case 0: return 'bg-green-100 text-green-800 border-green-200'
      case 1: return 'bg-yellow-100 text-yellow-800 border-yellow-200'
      case 2: return 'bg-red-100 text-red-800 border-red-200'
      case 3: return 'bg-gray-100 text-gray-800 border-gray-200'
      default: return 'bg-gray-100 text-gray-800 border-gray-200'
    }
  }

  const getStatusText = (status: number) => {
    switch (status) {
      case 0: return 'Active'
      case 1: return 'Paused'
      case 2: return 'Cancelled'
      case 3: return 'Completed'
      default: return 'Unknown'
    }
  }

  const isEventPast = ticket.eventDate < Math.floor(Date.now() / 1000)
  const isEventCancelled = ticket.eventStatus === 2

  return (
    <div
      className={`bg-white rounded-lg shadow-md border border-gray-200 hover:shadow-lg transition-shadow duration-200 overflow-hidden ${
        onClick ? 'cursor-pointer' : ''
      } ${className}`}
      onClick={handleCardClick}
    >
      {/* Header with ticket number and status */}
      <div className="bg-gradient-to-r from-blue-500 to-purple-600 text-white p-4">
        <div className="flex justify-between items-start">
          <div>
            <h3 className="text-lg font-bold truncate">
              {ticket.eventName}
            </h3>
            <p className="text-blue-100 text-sm">
              Ticket #{ticket.ticketNumber}
            </p>
          </div>
          <div className="flex flex-col items-end gap-2">
            <span className={`px-2 py-1 rounded-full text-xs font-medium border ${getStatusColor(ticket.eventStatus)}`}>
              {getStatusText(ticket.eventStatus)}
            </span>
            {ticket.isTransferred && (
              <span className="px-2 py-1 rounded-full text-xs font-medium bg-orange-100 text-orange-800 border border-orange-200">
                Transferred
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="p-4">
        {/* Event details */}
        <div className="space-y-2 mb-4">
          <div className="flex items-center text-sm text-gray-600">
            <span className="mr-2">📍</span>
            <span className="truncate">{ticket.eventVenue}</span>
          </div>

          <div className="flex items-center text-sm text-gray-600">
            <span className="mr-2">📅</span>
            <span>{formatDateTime(ticket.eventDate)}</span>
            {isEventPast && (
              <span className="ml-2 text-xs text-gray-500">(Past)</span>
            )}
          </div>

          <div className="flex items-center text-sm text-gray-600">
            <span className="mr-2">💰</span>
            <span>Paid: {formatEther(ticket.purchasePrice)} ETH</span>
          </div>

          <div className="flex items-center text-sm text-gray-600">
            <span className="mr-2">🏷️</span>
            <span>Token ID: {ticket.tokenId}</span>
          </div>
        </div>

        {/* Purchase info */}
        <div className="border-t border-gray-200 pt-3 mb-4">
          <div className="text-xs text-gray-500 space-y-1">
            <div>Purchased: {formatDateTime(ticket.purchaseDate)}</div>
            {ticket.isTransferred && (
              <div className="text-orange-600">
                Originally bought by: {ticket.originalBuyer.slice(0, 6)}...{ticket.originalBuyer.slice(-4)}
              </div>
            )}
          </div>
        </div>

        {/* Actions */}
        {showActions && (
          <div className="flex gap-2">
            <button
              onClick={handleDetailsClick}
              className="flex-1 py-2 px-3 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 transition-colors font-medium"
            >
              View Details
            </button>

            {!isEventPast && !isEventCancelled && (
              <button
                onClick={(e) => {
                  e.stopPropagation()
                  setShowTransferModal(true)
                }}
                className="py-2 px-3 border border-gray-300 text-gray-700 text-sm rounded-lg hover:bg-gray-50 transition-colors"
              >
                Transfer
              </button>
            )}
          </div>
        )}

        {/* Warning messages */}
        {isEventCancelled && (
          <div className="mt-3 p-2 bg-red-50 border border-red-200 rounded-lg">
            <p className="text-red-800 text-xs">
              ⚠️ This event has been cancelled. You may be eligible for a refund.
            </p>
          </div>
        )}

        {/* Transfer Modal */}
        <TransferTicketModal
          isOpen={showTransferModal}
          ticket={ticket}
          onClose={() => setShowTransferModal(false)}
          onSuccess={(transactionHash) => {
            console.log('Transfer successful:', transactionHash)
            setShowTransferModal(false)
            onTransfer?.(ticket.tokenId)
          }}
        />
      </div>
    </div>
  )
}

export default TicketCard
