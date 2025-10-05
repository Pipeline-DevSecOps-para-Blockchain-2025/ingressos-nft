import React, { useState } from 'react'
import EventList from '../components/EventList'
import EventDetail from '../components/EventDetail'
import ActivityFeed from '../components/ActivityFeed'
import Modal from '../components/Modal'
import type { EventWithId } from '../hooks/useEvents'

const Events: React.FC = () => {
  const [selectedEvent, setSelectedEvent] = useState<EventWithId | null>(null)

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
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Discover Events
          </h1>
          <p className="text-gray-600">
            Browse and purchase tickets for upcoming events on the blockchain
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Main Content */}
          <div className="lg:col-span-3">
            <EventList onEventClick={handleEventClick} />
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