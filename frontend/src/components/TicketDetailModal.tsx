import React, { useState } from 'react'
import Modal from './Modal'
import TransferTicketModal from './TransferTicketModal'
import { formatEther, formatDateTime } from '../utils'
import type { TicketMetadata } from '../hooks/useUserTickets'

interface TicketDetailModalProps {
  isOpen: boolean
  ticket: TicketMetadata | null
  onClose: () => void
  onTransfer?: (tokenId: number) => void
}

const TicketDetailModal: React.FC<TicketDetailModalProps> = ({
  isOpen,
  ticket,
  onClose,
  onTransfer
}) => {
  const [showTransferModal, setShowTransferModal] = useState(false)

  if (!ticket) return null

  const handleTransferClick = () => {
    setShowTransferModal(true)
  }

  const handleTransferSuccess = (_transactionHash: string) => {
    setShowTransferModal(false)
    onTransfer?.(ticket.tokenId)
    onClose()
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
  const canTransfer = !isEventPast && ticket.eventStatus !== 2 // Can't transfer past or cancelled events

  return (
    <>
      <Modal
        isOpen={isOpen}
        onClose={onClose}
        size="lg"
        className="max-w-2xl"
      >
        <div className="bg-white rounded-lg overflow-hidden">
          {/* Header */}
          <div className="bg-gradient-to-r from-blue-500 to-purple-600 text-white p-6">
            <div className="flex justify-between items-start">
              <div>
                <h2 className="text-2xl font-bold mb-2">{ticket.eventName}</h2>
                <p className="text-blue-100">NFT Ticket #{ticket.tokenId}</p>
              </div>
              <span className={`px-3 py-1 rounded-full text-sm font-medium border ${getStatusColor(ticket.eventStatus)}`}>
                {getStatusText(ticket.eventStatus)}
              </span>
            </div>
          </div>

          {/* Content */}
          <div className="p-6">
            {/* Ticket Information */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
              <div className="space-y-4">
                <h3 className="text-lg font-semibold text-gray-900">Event Details</h3>

                <div className="space-y-3 text-sm">
                  <div>
                    <span className="text-gray-600">Description:</span>
                    <p className="text-gray-900 mt-1">{ticket.eventDescription}</p>
                  </div>

                  <div>
                    <span className="text-gray-600">Venue:</span>
                    <p className="text-gray-900">{ticket.eventVenue}</p>
                  </div>

                  <div>
                    <span className="text-gray-600">Date & Time:</span>
                    <p className="text-gray-900">
                      {formatDateTime(ticket.eventDate)}
                      {isEventPast && <span className="text-red-600 ml-2">(Past)</span>}
                    </p>
                  </div>

                  <div>
                    <span className="text-gray-600">Event ID:</span>
                    <p className="text-gray-900 font-semibold">#{ticket.eventId}</p>
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <h3 className="text-lg font-semibold text-gray-900">Ticket Information</h3>

                <div className="space-y-3 text-sm">
                  <div>
                    <span className="text-gray-600">Token ID:</span>
                    <p className="text-gray-900 font-semibold">#{ticket.tokenId}</p>
                  </div>

                  <div>
                    <span className="text-gray-600">Ticket Number:</span>
                    <p className="text-gray-900 font-semibold">#{ticket.ticketNumber}</p>
                  </div>

                  <div>
                    <span className="text-gray-600">Purchase Price:</span>
                    <p className="text-gray-900 font-semibold">{formatEther(ticket.purchasePrice)} ETH</p>
                  </div>

                  <div>
                    <span className="text-gray-600">Purchase Date:</span>
                    <p className="text-gray-900">{formatDateTime(ticket.purchaseDate)}</p>
                  </div>

                  <div>
                    <span className="text-gray-600">Current Owner:</span>
                    <p className="text-gray-900 font-mono text-xs">
                      {ticket.currentOwner.slice(0, 6)}...{ticket.currentOwner.slice(-4)}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Additional Ticket Information */}
            <div className="mb-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-3">Additional Information</h3>
              <div className="bg-gray-50 rounded-lg p-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-gray-600">Original Buyer:</span>
                    <p className="text-gray-900 font-mono text-xs">
                      {ticket.originalBuyer.slice(0, 6)}...{ticket.originalBuyer.slice(-4)}
                    </p>
                  </div>

                  <div>
                    <span className="text-gray-600">Transfer Status:</span>
                    <p className="text-gray-900">
                      {ticket.isTransferred ? (
                        <span className="text-orange-600">Transferred</span>
                      ) : (
                        <span className="text-green-600">Original Owner</span>
                      )}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Event Status Messages */}
            {ticket.eventStatus === 2 && (
              <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
                <div className="flex items-center">
                  <div className="text-red-600 mr-3">
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                  <div>
                    <h4 className="text-red-800 font-medium">Event Cancelled</h4>
                    <p className="text-red-700 text-sm mt-1">
                      This event has been cancelled. Contact the organizer for refund information.
                    </p>
                  </div>
                </div>
              </div>
            )}

            {isEventPast && ticket.eventStatus !== 2 && (
              <div className="mb-6 p-4 bg-gray-50 border border-gray-200 rounded-lg">
                <div className="flex items-center">
                  <div className="text-gray-600 mr-3">
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                  <div>
                    <h4 className="text-gray-800 font-medium">Past Event</h4>
                    <p className="text-gray-700 text-sm mt-1">
                      This event has already taken place. Keep this ticket as a collectible NFT!
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Actions */}
            <div className="flex gap-3 pt-4 border-t border-gray-200">
              {canTransfer && (
                <button
                  onClick={handleTransferClick}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
                >
                  Transfer Ticket
                </button>
              )}

              <button
                onClick={() => {
                  // This would open the transaction or token in a block explorer
                  // For now, we'll just show an alert since we don't have the contract address
                  alert(`Token ID: ${ticket.tokenId}\nEvent ID: ${ticket.eventId}\nTicket Number: ${ticket.ticketNumber}`)
                }}
                className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
              >
                View Details
              </button>

              <button
                onClick={onClose}
                className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      </Modal>

      {/* Transfer Modal */}
      <TransferTicketModal
        isOpen={showTransferModal}
        ticket={ticket}
        onClose={() => setShowTransferModal(false)}
        onSuccess={handleTransferSuccess}
      />
    </>
  )
}

export default TicketDetailModal