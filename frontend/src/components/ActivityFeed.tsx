import React, { useState } from 'react'
import { useContractEvents } from '../hooks/useContractEvents'
import { formatEther, formatDateTime } from '../utils'
import type { ContractEvent } from '../hooks/useContractEvents'

interface ActivityFeedProps {
  maxItems?: number
  showFilters?: boolean
  className?: string
}

const ActivityFeed: React.FC<ActivityFeedProps> = ({
  maxItems = 20,
  showFilters = true,
  className = ''
}) => {
  const { events, isListening, clearEvents } = useContractEvents()
  const [filter, setFilter] = useState<'all' | 'EventCreated' | 'TicketPurchased' | 'EventStatusChanged' | 'RevenueWithdrawn'>('all')
  const [isExpanded, setIsExpanded] = useState(false)

  const filteredEvents = events
    .filter(event => filter === 'all' || event.type === filter)
    .slice(0, maxItems)

  const getEventIcon = (type: ContractEvent['type']) => {
    switch (type) {
      case 'EventCreated':
        return '🎪'
      case 'TicketPurchased':
        return '🎫'
      case 'EventStatusChanged':
        return '📝'
      case 'RevenueWithdrawn':
        return '💰'
      default:
        return '📋'
    }
  }

  const getEventColor = (type: ContractEvent['type']) => {
    switch (type) {
      case 'EventCreated':
        return 'text-blue-600 bg-blue-50 border-blue-200'
      case 'TicketPurchased':
        return 'text-green-600 bg-green-50 border-green-200'
      case 'EventStatusChanged':
        return 'text-orange-600 bg-orange-50 border-orange-200'
      case 'RevenueWithdrawn':
        return 'text-purple-600 bg-purple-50 border-purple-200'
      default:
        return 'text-gray-600 bg-gray-50 border-gray-200'
    }
  }

  const formatEventDescription = (event: ContractEvent): string => {
    switch (event.type) {
      case 'EventCreated':
        return `New event "${event.data.name}" created by ${event.data.organizer.slice(0, 6)}...${event.data.organizer.slice(-4)}`
      case 'TicketPurchased':
        return `Ticket #${event.data.ticketNumber} purchased for ${formatEther(event.data.price)} ETH`
      case 'EventStatusChanged':
        const statusNames = ['Active', 'Paused', 'Cancelled', 'Completed']
        const newStatus = statusNames[event.data.newStatus] || 'Unknown'
        return `Event #${event.data.eventId} status changed to ${newStatus}`
      case 'RevenueWithdrawn':
        return `${formatEther(event.data.amount)} ETH withdrawn from event #${event.data.eventId}`
      default:
        return 'Unknown event'
    }
  }

  const formatTimeAgo = (timestamp: number): string => {
    const now = Date.now()
    const diff = now - timestamp
    const minutes = Math.floor(diff / 60000)
    const hours = Math.floor(diff / 3600000)
    const days = Math.floor(diff / 86400000)

    if (days > 0) return `${days}d ago`
    if (hours > 0) return `${hours}h ago`
    if (minutes > 0) return `${minutes}m ago`
    return 'Just now'
  }

  const getFilterCounts = () => {
    return {
      all: events.length,
      EventCreated: events.filter(e => e.type === 'EventCreated').length,
      TicketPurchased: events.filter(e => e.type === 'TicketPurchased').length,
      EventStatusChanged: events.filter(e => e.type === 'EventStatusChanged').length,
      RevenueWithdrawn: events.filter(e => e.type === 'RevenueWithdrawn').length,
    }
  }

  const filterCounts = getFilterCounts()

  return (
    <div className={`bg-white rounded-lg border border-gray-200 ${className}`}>
      {/* Header */}
      <div className="p-4 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <h3 className="text-lg font-semibold text-gray-900">Live Activity</h3>
            {isListening && (
              <div className="flex items-center gap-1">
                <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                <span className="text-xs text-green-600 font-medium">Live</span>
              </div>
            )}
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setIsExpanded(!isExpanded)}
              className="p-1 text-gray-400 hover:text-gray-600 transition-colors"
              title={isExpanded ? 'Collapse' : 'Expand'}
            >
              <svg
                className={`w-4 h-4 transition-transform ${isExpanded ? 'rotate-180' : ''}`}
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </button>

            {events.length > 0 && (
              <button
                onClick={clearEvents}
                className="text-xs text-gray-500 hover:text-gray-700 underline"
              >
                Clear
              </button>
            )}
          </div>
        </div>

        {/* Filters */}
        {showFilters && isExpanded && (
          <div className="mt-4 flex flex-wrap gap-2">
            {[
              { key: 'all', label: 'All', count: filterCounts.all },
              { key: 'EventCreated', label: 'Events', count: filterCounts.EventCreated },
              { key: 'TicketPurchased', label: 'Purchases', count: filterCounts.TicketPurchased },
              { key: 'EventStatusChanged', label: 'Status', count: filterCounts.EventStatusChanged },
              { key: 'RevenueWithdrawn', label: 'Withdrawals', count: filterCounts.RevenueWithdrawn },
            ].map(({ key, label, count }) => (
              <button
                key={key}
                onClick={() => setFilter(key as typeof filter)}
                className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
                  filter === key
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                {label} ({count})
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Activity List */}
      <div className={`${isExpanded ? 'max-h-96 overflow-y-auto' : 'max-h-48 overflow-hidden'}`}>
        {filteredEvents.length === 0 ? (
          <div className="p-8 text-center">
            <div className="text-4xl mb-3">📡</div>
            <p className="text-gray-600 mb-2">
              {events.length === 0 ? 'Waiting for activity...' : 'No events match the current filter'}
            </p>
            <p className="text-xs text-gray-500">
              {isListening ? 'Listening for real-time updates' : 'Event listening is paused'}
            </p>
          </div>
        ) : (
          <div className="divide-y divide-gray-100">
            {filteredEvents.map((event) => (
              <div key={event.id} className="p-4 hover:bg-gray-50 transition-colors">
                <div className="flex items-start gap-3">
                  <div className={`flex-shrink-0 w-8 h-8 rounded-full border flex items-center justify-center text-sm ${getEventColor(event.type)}`}>
                    {getEventIcon(event.type)}
                  </div>

                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-gray-900 mb-1">
                      {formatEventDescription(event)}
                    </p>

                    <div className="flex items-center gap-4 text-xs text-gray-500">
                      <span>{formatTimeAgo(event.timestamp)}</span>
                      <span>Block #{event.blockNumber}</span>
                      <button
                        onClick={() => {
                          // This would open the transaction in a block explorer
                          window.open(`https://sepolia.etherscan.io/tx/${event.transactionHash}`, '_blank')
                        }}
                        className="text-blue-600 hover:text-blue-800 underline"
                      >
                        View Tx
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Footer */}
      {!isExpanded && filteredEvents.length > 0 && (
        <div className="p-3 border-t border-gray-200 text-center">
          <button
            onClick={() => setIsExpanded(true)}
            className="text-sm text-blue-600 hover:text-blue-800 font-medium"
          >
            View All Activity ({events.length})
          </button>
        </div>
      )}
    </div>
  )
}

export default ActivityFeed
