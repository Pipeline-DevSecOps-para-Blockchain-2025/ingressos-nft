import React, { useState } from 'react'
import type { EventWithId } from '../hooks/useEvents'
import { formatEther, formatDateTime, formatAddress, copyToClipboard } from '../utils'
import { useIngressosContract } from '../hooks/useIngressosContract'
import { useWallet } from '../hooks/useWallet'
import PurchaseConfirmation from './PurchaseConfirmation'
import TransactionReceipt from './TransactionReceipt'

interface EventDetailProps {
  event: EventWithId
  onClose?: () => void
  onPurchaseTicket?: (event: EventWithId) => void
  className?: string
}

const EventDetail: React.FC<EventDetailProps> = ({ 
  event, 
  onClose, 
  onPurchaseTicket,
  className = '' 
}) => {
  const { getEventStatusName } = useIngressosContract()
  const { isConnected } = useWallet()
  const [copiedField, setCopiedField] = useState<string | null>(null)
  const [showPurchaseModal, setShowPurchaseModal] = useState(false)
  const [purchaseResult, setPurchaseResult] = useState<{
    transactionHash: string
    tokenId: number
  } | null>(null)

  const ticketPrice = formatEther(event.ticketPrice)
  const eventDate = new Date(Number(event.date) * 1000)
  // const createdDate = new Date(Number(event.createdAt) * 1000)
  const isUpcoming = eventDate > new Date()
  const isSoldOut = event.currentSupply >= event.maxSupply
  const availableTickets = Number(event.maxSupply - event.currentSupply)
  const statusName = getEventStatusName(event.status)
  const soldPercentage = (Number(event.currentSupply) / Number(event.maxSupply)) * 100

  // Handle copy to clipboard
  const handleCopy = async (text: string, field: string) => {
    const success = await copyToClipboard(text)
    if (success) {
      setCopiedField(field)
      setTimeout(() => setCopiedField(null), 2000)
    }
  }

  // Status color mapping
  const getStatusColor = (status: number) => {
    switch (status) {
      case 0: return 'bg-green-100 text-green-800 border-green-200' // Active
      case 1: return 'bg-yellow-100 text-yellow-800 border-yellow-200' // Paused
      case 2: return 'bg-red-100 text-red-800 border-red-200' // Cancelled
      case 3: return 'bg-gray-100 text-gray-800 border-gray-200' // Completed
      default: return 'bg-gray-100 text-gray-800 border-gray-200'
    }
  }

  const canPurchase = isConnected && event.status === 0 && !isSoldOut && isUpcoming

  const handlePurchaseClick = () => {
    if (onPurchaseTicket) {
      onPurchaseTicket(event)
    } else {
      setShowPurchaseModal(true)
    }
  }

  const handlePurchaseSuccess = (transactionHash: string, tokenId: number) => {
    setPurchaseResult({ transactionHash, tokenId })
    setShowPurchaseModal(false)
  }

  const handleClosePurchaseModal = () => {
    setShowPurchaseModal(false)
  }

  const handleCloseReceipt = () => {
    setPurchaseResult(null)
    onClose?.()
  }

  return (
    <div className={`bg-white rounded-lg shadow-lg border border-gray-200 overflow-hidden ${className}`}>
      {/* Header */}
      <div className="relative">
        {/* Event Image/Banner */}
        <div className="h-64 bg-gradient-to-br from-blue-500 to-purple-600 relative">
          <div className="absolute inset-0 bg-black bg-opacity-30 flex items-center justify-center">
            <div className="text-white text-center">
              <div className="text-4xl font-bold mb-2">🎫</div>
              <div className="text-lg opacity-90">Event #{event.eventId}</div>
            </div>
          </div>
          
          {/* Close Button */}
          {onClose && (
            <button
              onClick={onClose}
              className="absolute top-4 right-4 w-8 h-8 bg-black bg-opacity-50 text-white rounded-full flex items-center justify-center hover:bg-opacity-70 transition-colors"
            >
              ✕
            </button>
          )}

          {/* Status Badge */}
          <div className="absolute top-4 left-4">
            <span className={`px-3 py-1 rounded-full text-sm font-medium border ${getStatusColor(event.status)}`}>
              {statusName}
            </span>
          </div>

          {/* Sold Out Badge */}
          {isSoldOut && (
            <div className="absolute bottom-4 left-4">
              <span className="px-3 py-1 rounded-full text-sm font-medium bg-red-500 text-white">
                Sold Out
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Content */}
      <div className="p-6">
        {/* Event Title and Description */}
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-gray-900 mb-3">{event.name}</h1>
          <p className="text-gray-600 text-lg leading-relaxed">{event.description}</p>
        </div>

        {/* Event Details Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
          {/* Left Column */}
          <div className="space-y-4">
            {/* Date and Time */}
            <div className="flex items-start">
              <span className="text-2xl mr-3 mt-1">📅</span>
              <div>
                <h3 className="font-medium text-gray-900">Date & Time</h3>
                <p className="text-gray-600">{formatDateTime(Number(event.date))}</p>
                {!isUpcoming && (
                  <p className="text-red-500 text-sm mt-1">This event has ended</p>
                )}
              </div>
            </div>

            {/* Venue */}
            <div className="flex items-start">
              <span className="text-2xl mr-3 mt-1">📍</span>
              <div>
                <h3 className="font-medium text-gray-900">Venue</h3>
                <p className="text-gray-600">{event.venue}</p>
              </div>
            </div>

            {/* Price */}
            <div className="flex items-start">
              <span className="text-2xl mr-3 mt-1">💰</span>
              <div>
                <h3 className="font-medium text-gray-900">Ticket Price</h3>
                <p className="text-gray-600 text-xl font-semibold">{ticketPrice} ETH</p>
              </div>
            </div>
          </div>

          {/* Right Column */}
          <div className="space-y-4">
            {/* Organizer */}
            <div className="flex items-start">
              <span className="text-2xl mr-3 mt-1">👤</span>
              <div className="flex-1">
                <h3 className="font-medium text-gray-900">Organizer</h3>
                <div className="flex items-center gap-2">
                  <p className="text-gray-600 font-mono text-sm">{formatAddress(event.organizer)}</p>
                  <button
                    onClick={() => handleCopy(event.organizer, 'organizer')}
                    className="text-blue-600 hover:text-blue-800 text-sm"
                  >
                    {copiedField === 'organizer' ? '✓' : '📋'}
                  </button>
                </div>
              </div>
            </div>

            {/* Created Date */}
            <div className="flex items-start">
              <span className="text-2xl mr-3 mt-1">🕒</span>
              <div>
                <h3 className="font-medium text-gray-900">Created</h3>
                <p className="text-gray-600">{formatDateTime(Number(event.createdAt))}</p>
              </div>
            </div>

            {/* Event ID */}
            <div className="flex items-start">
              <span className="text-2xl mr-3 mt-1">🔢</span>
              <div className="flex-1">
                <h3 className="font-medium text-gray-900">Event ID</h3>
                <div className="flex items-center gap-2">
                  <p className="text-gray-600">#{event.eventId}</p>
                  <button
                    onClick={() => handleCopy(event.eventId.toString(), 'eventId')}
                    className="text-blue-600 hover:text-blue-800 text-sm"
                  >
                    {copiedField === 'eventId' ? '✓' : '📋'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Ticket Availability */}
        <div className="mb-6">
          <h3 className="font-medium text-gray-900 mb-3">Ticket Availability</h3>
          <div className="bg-gray-50 rounded-lg p-4">
            <div className="flex justify-between items-center mb-2">
              <span className="text-gray-600">Tickets Sold</span>
              <span className="font-medium">
                {Number(event.currentSupply)} / {Number(event.maxSupply)}
              </span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-3 mb-2">
              <div 
                className={`h-3 rounded-full transition-all duration-300 ${
                  isSoldOut ? 'bg-red-500' : soldPercentage > 80 ? 'bg-yellow-500' : 'bg-green-500'
                }`}
                style={{ width: `${soldPercentage}%` }}
              />
            </div>
            <div className="flex justify-between text-sm text-gray-600">
              <span>{availableTickets} tickets remaining</span>
              <span>{soldPercentage.toFixed(1)}% sold</span>
            </div>
          </div>
        </div>

        {/* Purchase Section */}
        <div className="border-t border-gray-200 pt-6">
          {!isConnected ? (
            <div className="text-center py-4">
              <p className="text-gray-600 mb-4">Connect your wallet to purchase tickets</p>
              <div className="text-sm text-gray-500">
                Use the wallet connection button in the header
              </div>
            </div>
          ) : !canPurchase ? (
            <div className="text-center py-4">
              <p className="text-gray-600 mb-2">
                {isSoldOut ? 'This event is sold out' :
                 !isUpcoming ? 'This event has ended' :
                 event.status !== 0 ? `Event is ${statusName.toLowerCase()}` :
                 'Tickets not available'}
              </p>
              <div className="text-sm text-gray-500">
                {isSoldOut ? 'Check back for potential resales' :
                 !isUpcoming ? 'Browse other upcoming events' :
                 'Contact the organizer for more information'}
              </div>
            </div>
          ) : (
            <div className="text-center">
              <div className="mb-4">
                <div className="text-2xl font-bold text-gray-900 mb-1">
                  {ticketPrice} ETH
                </div>
                <div className="text-sm text-gray-600">per ticket</div>
              </div>
              
              <button
                onClick={handlePurchaseClick}
                className="w-full md:w-auto px-8 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium text-lg"
              >
                Purchase Ticket
              </button>
              
              <div className="mt-3 text-xs text-gray-500">
                You will be prompted to confirm the transaction in your wallet
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Purchase Modal */}
      <PurchaseConfirmation
        isOpen={showPurchaseModal}
        event={event}
        onClose={handleClosePurchaseModal}
        onSuccess={handlePurchaseSuccess}
      />

      {/* Transaction Receipt Modal */}
      {purchaseResult && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="fixed inset-0 bg-black bg-opacity-50" onClick={handleCloseReceipt} />
          <div className="flex min-h-full items-center justify-center p-4">
            <div className="relative w-full max-w-lg">
              <TransactionReceipt
                transactionHash={purchaseResult.transactionHash}
                tokenId={purchaseResult.tokenId}
                event={event}
                onClose={handleCloseReceipt}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default EventDetail