import React, { useState } from 'react'
import EventList from '../components/EventList'
import EventDetail from '../components/EventDetail'
import ActivityFeed from '../components/ActivityFeed'
import Modal from '../components/Modal'
import { useEvents } from '../hooks/useEvents'
import type { EventWithId } from '../hooks/useEvents'

const Events: React.FC = () => {
  const [selectedEvent, setSelectedEvent] = useState<EventWithId | null>(null)

  // Use the dynamic events hook
  const {
    events,
    isLoading,
    error,
    refetch,
    isUsingCache,
    cacheStats
  } = useEvents()

  const handleEventClick = (event: EventWithId) => {
    setSelectedEvent(event)
  }

  const handleCloseModal = () => {
    setSelectedEvent(null)
  }

  const handlePurchaseTicket = (event: EventWithId) => {
    // This will be implemented in the ticket purchasing task
    console.log('Purchase ticket for event:', event.eventId)
    // For now, just close the modal
    setSelectedEvent(null)
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto px-4 py-8">
        {/* Page Header */}
        <div className="mb-8">
          <div className="flex justify-between items-start">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 mb-2">
                Discover Events
              </h1>
              <p className="text-gray-600">
                Browse and purchase tickets for upcoming events on the blockchain
              </p>
            </div>

            {/* Cache Status and Refresh Button */}
            <div className="flex items-center gap-4">
              {isUsingCache && (
                <div className="text-sm text-green-600 bg-green-50 px-3 py-1 rounded-full">
                  📋 Using cached data
                </div>
              )}

              <button
                onClick={refetch}
                disabled={isLoading}
                className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                <svg
                  className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`}
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
                {isLoading ? 'Refreshing...' : 'Refresh'}
              </button>
            </div>
          </div>

          {/* Error Display */}
          {error && (
            <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-lg">
              <div className="flex items-center">
                <div className="text-red-600 mr-3">
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <div>
                  <h3 className="text-red-800 font-medium">Error loading events</h3>
                  <p className="text-red-700 text-sm mt-1">{error.message}</p>
                </div>
              </div>
            </div>
          )}

          {/* Events Count */}
          {!isLoading && !error && (
            <div className="mt-4 text-sm text-gray-600">
              Found {events.length} events
              {isUsingCache && (
                <span className="ml-2 text-green-600">
                  (Cache hit rate: {Math.round(cacheStats.hitRate * 100)}%)
                </span>
              )}
            </div>
          )}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Main Content */}
          <div className="lg:col-span-3">
            {isLoading ? (
              <div className="flex items-center justify-center py-12">
                <div className="text-center">
                  <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
                  <p className="text-gray-600">Loading events from blockchain...</p>
                </div>
              </div>
            ) : events.length === 0 && !error ? (
              <div className="text-center py-12">
                <div className="text-6xl mb-4">🎪</div>
                <h3 className="text-xl font-semibold text-gray-900 mb-2">No events found</h3>
                <p className="text-gray-600 mb-6">
                  There are no events available at the moment. Check back later or create your own event!
                </p>
                <button
                  onClick={refetch}
                  className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                  Refresh Events
                </button>
              </div>
            ) : (
              <EventList
                onEventClick={handleEventClick}
              />
            )}
          </div>

          {/* Sidebar */}
          <div className="lg:col-span-1">
            <div className="sticky top-4">
              <ActivityFeed maxItems={10} className="mb-6" />
            </div>
          </div>
        </div>

        {/* Event Detail Modal */}
        <Modal
          isOpen={!!selectedEvent}
          onClose={handleCloseModal}
          size="xl"
        >
          {selectedEvent && (
            <EventDetail
              event={selectedEvent}
              onClose={handleCloseModal}
              onPurchaseTicket={handlePurchaseTicket}
            />
          )}
        </Modal>
      </div>
    </div>
  )
}

export default Events
