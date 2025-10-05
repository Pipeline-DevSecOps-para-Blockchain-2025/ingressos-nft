import React, { useState } from 'react'
import { useWallet } from '../hooks/useWallet'
import { useUserTickets } from '../hooks/useUserTickets'
import TicketCard from '../components/TicketCard'
import TicketDetailModal from '../components/TicketDetailModal'
import WalletConnection from '../components/WalletConnection'
import type { TicketMetadata } from '../hooks/useUserTickets'

const MyTickets: React.FC = () => {
  const { isConnected } = useWallet()
  const { tickets, isLoading, error, refetch } = useUserTickets()
  const [selectedTicket, setSelectedTicket] = useState<TicketMetadata | null>(null)
  const [showTicketDetail, setShowTicketDetail] = useState(false)
  const [filter, setFilter] = useState<'all' | 'upcoming' | 'past' | 'cancelled'>('all')
  const [sortBy, setSortBy] = useState<'date' | 'purchase' | 'name'>('date')

  const handleTicketClick = (ticket: TicketMetadata) => {
    setSelectedTicket(ticket)
    setShowTicketDetail(true)
  }

  const handleCloseModal = () => {
    setShowTicketDetail(false)
    setSelectedTicket(null)
  }

  const handleTransfer = (tokenId: number) => {
    console.log('Ticket transferred:', tokenId)
    // Refresh tickets after transfer
    refetch()
    // Close modal if it's open
    if (selectedTicket?.tokenId === tokenId) {
      handleCloseModal()
    }
  }

  // Filter tickets based on selected filter
  const filteredTickets = tickets.filter(ticket => {
    const now = Math.floor(Date.now() / 1000)
    
    switch (filter) {
      case 'upcoming':
        return ticket.eventDate > now && ticket.eventStatus === 0
      case 'past':
        return ticket.eventDate <= now || ticket.eventStatus === 3
      case 'cancelled':
        return ticket.eventStatus === 2
      default:
        return true
    }
  })

  // Sort tickets
  const sortedTickets = [...filteredTickets].sort((a, b) => {
    switch (sortBy) {
      case 'date':
        return b.eventDate - a.eventDate // Newest first
      case 'purchase':
        return b.purchaseDate - a.purchaseDate // Most recent purchase first
      case 'name':
        return a.eventName.localeCompare(b.eventName)
      default:
        return 0
    }
  })

  // Get filter counts
  const getFilterCounts = () => {
    const now = Math.floor(Date.now() / 1000)
    return {
      all: tickets.length,
      upcoming: tickets.filter(t => t.eventDate > now && t.eventStatus === 0).length,
      past: tickets.filter(t => t.eventDate <= now || t.eventStatus === 3).length,
      cancelled: tickets.filter(t => t.eventStatus === 2).length,
    }
  }

  const filterCounts = getFilterCounts()

  if (!isConnected) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-3xl font-bold text-gray-900 mb-4">My Tickets</h1>
          <p className="text-gray-600 mb-8">Connect your wallet to view your tickets</p>
          <WalletConnection />
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">My Tickets</h1>
          <p className="text-gray-600">
            Manage your NFT tickets and view event details
          </p>
        </div>

        {/* Filters and Controls */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            {/* Filter tabs */}
            <div className="flex flex-wrap gap-2">
              {[
                { key: 'all', label: 'All', count: filterCounts.all },
                { key: 'upcoming', label: 'Upcoming', count: filterCounts.upcoming },
                { key: 'past', label: 'Past', count: filterCounts.past },
                { key: 'cancelled', label: 'Cancelled', count: filterCounts.cancelled },
              ].map(({ key, label, count }) => (
                <button
                  key={key}
                  onClick={() => setFilter(key as typeof filter)}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                    filter === key
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  {label} ({count})
                </button>
              ))}
            </div>

            {/* Sort dropdown */}
            <div className="flex items-center gap-2">
              <label htmlFor="sort" className="text-sm text-gray-600">
                Sort by:
              </label>
              <select
                id="sort"
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as typeof sortBy)}
                className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="date">Event Date</option>
                <option value="purchase">Purchase Date</option>
                <option value="name">Event Name</option>
              </select>

              <button
                onClick={refetch}
                className="ml-2 p-2 text-gray-600 hover:text-gray-900 transition-colors"
                title="Refresh tickets"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
              </button>
            </div>
          </div>
        </div>

        {/* Loading state */}
        {isLoading && (
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p className="text-gray-600">Loading your tickets...</p>
          </div>
        )}

        {/* Error state */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-6 mb-6">
            <div className="flex items-center">
              <div className="text-red-600 mr-3">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <div>
                <h3 className="text-red-800 font-medium">Error loading tickets</h3>
                <p className="text-red-700 text-sm mt-1">{error.message}</p>
                <button
                  onClick={refetch}
                  className="text-red-600 hover:text-red-800 text-sm underline mt-2"
                >
                  Try again
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Empty state */}
        {!isLoading && !error && sortedTickets.length === 0 && (
          <div className="text-center py-12">
            <div className="text-6xl mb-4">🎫</div>
            <h3 className="text-xl font-medium text-gray-900 mb-2">
              {filter === 'all' ? 'No tickets yet' : `No ${filter} tickets`}
            </h3>
            <p className="text-gray-600 mb-6">
              {filter === 'all' 
                ? 'Purchase your first ticket to get started!'
                : `You don't have any ${filter} tickets.`
              }
            </p>
            {filter !== 'all' && (
              <button
                onClick={() => setFilter('all')}
                className="text-blue-600 hover:text-blue-800 underline"
              >
                View all tickets
              </button>
            )}
          </div>
        )}

        {/* Tickets grid */}
        {!isLoading && !error && sortedTickets.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {sortedTickets.map((ticket) => (
              <TicketCard
                key={ticket.tokenId}
                ticket={ticket}
                onClick={handleTicketClick}
                onTransfer={handleTransfer}
              />
            ))}
          </div>
        )}

        {/* Ticket Detail Modal */}
        <TicketDetailModal
          isOpen={showTicketDetail}
          ticket={selectedTicket}
          onClose={handleCloseModal}
          onTransfer={handleTransfer}
        />
      </div>
    </div>
  )
}

export default MyTickets