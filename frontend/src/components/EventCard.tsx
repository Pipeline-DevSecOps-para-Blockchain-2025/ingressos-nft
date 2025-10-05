import React, { useState } from 'react'
import type { EventWithId } from '../hooks/useEvents'
import { formatEther, formatDateTime } from '../utils'
import { useIngressosContract } from '../hooks/useIngressosContract'
import PurchaseConfirmation from './PurchaseConfirmation'

interface EventCardProps {
  event: EventWithId
  onClick?: (event: EventWithId) => void
  className?: string
  showActions?: boolean
}

const EventCard: React.FC<EventCardProps> = ({
  event,
  onClick,
  className = '',
  showActions = true
}) => {
  const { getEventStatusName } = useIngressosContract()
  const [showPurchaseModal, setShowPurchaseModal] = useState(false)

  const handleClick = () => {
    onClick?.(event)
  }

  const isClickable = !!onClick
  const ticketPrice = formatEther(event.ticketPrice)
  const eventDate = new Date(Number(event.date) * 1000)
  const isUpcoming = eventDate > new Date()
  const isSoldOut = event.currentSupply >= event.maxSupply
  const availableTickets = Number(event.maxSupply - event.currentSupply)
  const statusName = getEventStatusName(event.status)

  // Status color mapping
  const getStatusColor = (status: number) => {
    switch (status) {
      case 0: return 'bg-green-100 text-green-800' // Active
      case 1: return 'bg-yellow-100 text-yellow-800' // Paused
      case 2: return 'bg-red-100 text-red-800' // Cancelled
      case 3: return 'bg-gray-100 text-gray-800' // Completed
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  return (
    <div
      className={`bg-white rounded-lg shadow-md border border-gray-200 overflow-hidden transition-all duration-200 ${
        isClickable ? 'hover:shadow-lg hover:border-blue-300 cursor-pointer' : ''
      } ${className}`}
      onClick={handleClick}
    >
      {/* Event Image Placeholder */}
      <div className="h-48 bg-gradient-to-br from-blue-500 to-purple-600 relative">
        <div className="absolute inset-0 bg-black bg-opacity-20 flex items-center justify-center">
          <div className="text-white text-center">
            <div className="text-2xl font-bold mb-2">🎫</div>
            <div className="text-sm opacity-90">Event #{event.eventId}</div>
          </div>
        </div>

        {/* Status Badge */}
        <div className="absolute top-3 right-3">
          <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(event.status)}`}>
            {statusName}
          </span>
        </div>

        {/* Sold Out Badge */}
        {isSoldOut && (
          <div className="absolute top-3 left-3">
            <span className="px-2 py-1 rounded-full text-xs font-medium bg-red-500 text-white">
              Sold Out
            </span>
          </div>
        )}
      </div>

      {/* Event Content */}
      <div className="p-4">
        {/* Event Title */}
        <h3 className="text-lg font-semibold text-gray-900 mb-2 line-clamp-2">
          {event.name}
        </h3>

        {/* Event Description */}
        <p className="text-gray-600 text-sm mb-3 line-clamp-2">
          {event.description}
        </p>

        {/* Event Details */}
        <div className="space-y-2 mb-4">
          {/* Date and Time */}
          <div className="flex items-center text-sm text-gray-600">
            <span className="mr-2">📅</span>
            <span>{formatDateTime(Number(event.date))}</span>
            {!isUpcoming && (
              <span className="ml-2 text-red-500 text-xs">(Past Event)</span>
            )}
          </div>

          {/* Venue */}
          <div className="flex items-center text-sm text-gray-600">
            <span className="mr-2">📍</span>
            <span className="truncate">{event.venue}</span>
          </div>

          {/* Price */}
          <div className="flex items-center text-sm text-gray-600">
            <span className="mr-2">💰</span>
            <span className="font-medium">{ticketPrice} ETH</span>
          </div>
        </div>

        {/* Ticket Availability */}
        <div className="mb-4">
          <div className="flex justify-between items-center text-sm text-gray-600 mb-1">
            <span>Tickets Available</span>
            <span>{availableTickets} / {Number(event.maxSupply)}</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div
              className={`h-2 rounded-full transition-all duration-300 ${
                isSoldOut ? 'bg-red-500' : 'bg-blue-500'
              }`}
              style={{
                width: `${(Number(event.currentSupply) / Number(event.maxSupply)) * 100}%`
              }}
            />
          </div>
        </div>

        {/* Organizer */}
        <div className="text-xs text-gray-500 mb-3">
          <span>Organizer: </span>
          <span className="font-mono">
            {event.organizer.slice(0, 6)}...{event.organizer.slice(-4)}
          </span>
        </div>

        {/* Actions */}
        {showActions && (
          <div className="flex gap-2">
            <button
              className={`flex-1 py-2 px-4 rounded-lg text-sm font-medium transition-colors ${
                event.status === 0 && !isSoldOut && isUpcoming
                  ? 'bg-blue-600 text-white hover:bg-blue-700'
                  : 'bg-gray-100 text-gray-400 cursor-not-allowed'
              }`}
              disabled={event.status !== 0 || isSoldOut || !isUpcoming}
              onClick={(e) => {
                e.stopPropagation()
                setShowPurchaseModal(true)
              }}
            >
              {isSoldOut ? 'Sold Out' :
               !isUpcoming ? 'Event Ended' :
               event.status !== 0 ? 'Not Available' :
               'Buy Ticket'}
            </button>

            <button
              className="px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
              onClick={(e) => {
                e.stopPropagation()
                // Handle view details
                console.log('View details for event:', event.eventId)
              }}
            >
              Details
            </button>
          </div>
        )}
      </div>

      {/* Purchase Modal */}
      <PurchaseConfirmation
        isOpen={showPurchaseModal}
        event={event}
        onClose={() => setShowPurchaseModal(false)}
        onSuccess={(hash, tokenId) => {
          console.log('Purchase successful:', hash, tokenId)
          setShowPurchaseModal(false)
        }}
      />
    </div>
  )
}

export default EventCard
