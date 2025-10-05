import React, { useState } from 'react'
import EventCard from './EventCard'
import { useEvents, type EventWithId } from '../hooks/useEvents'
import { EVENT_STATUS } from '../contracts'

interface EventListProps {
  onEventClick?: (event: EventWithId) => void
  className?: string
}

const EventList: React.FC<EventListProps> = ({ onEventClick, className = '' }) => {
  const {
    filteredEvents,
    isLoading,
    error,
    hasNextPage,
    isFetchingNextPage,
    fetchNextPage,
    filters,
    setFilters,
    totalEvents
  } = useEvents()

  const [showFilters, setShowFilters] = useState(false)

  // Handle search input
  const handleSearchChange = (search: string) => {
    setFilters({ ...filters, search: search || undefined })
  }

  // Handle status filter
  const handleStatusFilter = (status: number, checked: boolean) => {
    const currentStatus = filters.status || []
    const newStatus = checked
      ? [...currentStatus, status]
      : currentStatus.filter(s => s !== status)

    setFilters({
      ...filters,
      status: newStatus.length > 0 ? newStatus : undefined
    })
  }

  // Handle price range filter
  const handlePriceRangeFilter = (min: number, max: number) => {
    setFilters({
      ...filters,
      priceRange: min > 0 || max < 10 ? { min, max } : undefined
    })
  }

  // Clear all filters
  const clearFilters = () => {
    setFilters({})
  }

  // Get active filter count
  const activeFilterCount = Object.keys(filters).length

  if (error) {
    return (
      <div className={`text-center py-12 ${className}`}>
        <div className="text-red-600 mb-4">
          <div className="text-4xl mb-2">⚠️</div>
          <h3 className="text-lg font-medium">Failed to load events</h3>
          <p className="text-sm text-gray-600 mt-1">
            {error.message || 'An error occurred while fetching events'}
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className={className}>
      {/* Header with Search and Filters */}
      <div className="mb-6">
        <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between mb-4">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">Events</h2>
            <p className="text-gray-600 text-sm">
              {isLoading ? 'Loading...' : `${filteredEvents.length} of ${totalEvents} events`}
            </p>
          </div>

          <div className="flex gap-2">
            <button
              onClick={() => setShowFilters(!showFilters)}
              className={`px-4 py-2 border rounded-lg text-sm font-medium transition-colors ${
                showFilters || activeFilterCount > 0
                  ? 'bg-blue-50 border-blue-300 text-blue-700'
                  : 'border-gray-300 text-gray-700 hover:bg-gray-50'
              }`}
            >
              Filters {activeFilterCount > 0 && `(${activeFilterCount})`}
            </button>
          </div>
        </div>

        {/* Search Bar */}
        <div className="relative mb-4">
          <input
            type="text"
            placeholder="Search events by name, description, or venue..."
            value={filters.search || ''}
            onChange={(e) => handleSearchChange(e.target.value)}
            className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          />
          <div className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400">
            🔍
          </div>
        </div>

        {/* Filters Panel */}
        {showFilters && (
          <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 mb-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Status Filter */}
              <div>
                <h4 className="font-medium text-gray-900 mb-2">Event Status</h4>
                <div className="space-y-2">
                  {Object.entries(EVENT_STATUS).map(([key, value]) => (
                    <label key={key} className="flex items-center">
                      <input
                        type="checkbox"
                        checked={(filters.status || []).includes(value)}
                        onChange={(e) => handleStatusFilter(value, e.target.checked)}
                        className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                      />
                      <span className="ml-2 text-sm text-gray-700 capitalize">
                        {key.toLowerCase()}
                      </span>
                    </label>
                  ))}
                </div>
              </div>

              {/* Price Range Filter */}
              <div>
                <h4 className="font-medium text-gray-900 mb-2">Price Range (ETH)</h4>
                <div className="space-y-2">
                  <div className="flex gap-2">
                    <input
                      type="number"
                      placeholder="Min"
                      min="0"
                      step="0.01"
                      value={filters.priceRange?.min || ''}
                      onChange={(e) => {
                        const min = parseFloat(e.target.value) || 0
                        const max = filters.priceRange?.max || 10
                        handlePriceRangeFilter(min, max)
                      }}
                      className="flex-1 px-3 py-2 border border-gray-300 rounded text-sm"
                    />
                    <input
                      type="number"
                      placeholder="Max"
                      min="0"
                      step="0.01"
                      value={filters.priceRange?.max || ''}
                      onChange={(e) => {
                        const max = parseFloat(e.target.value) || 10
                        const min = filters.priceRange?.min || 0
                        handlePriceRangeFilter(min, max)
                      }}
                      className="flex-1 px-3 py-2 border border-gray-300 rounded text-sm"
                    />
                  </div>
                </div>
              </div>

              {/* Clear Filters */}
              <div className="flex items-end">
                <button
                  onClick={clearFilters}
                  disabled={activeFilterCount === 0}
                  className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Clear All Filters
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Loading State */}
      {isLoading && filteredEvents.length === 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="bg-white rounded-lg shadow-md border border-gray-200 overflow-hidden animate-pulse">
              <div className="h-48 bg-gray-300" />
              <div className="p-4">
                <div className="h-4 bg-gray-300 rounded mb-2" />
                <div className="h-3 bg-gray-300 rounded mb-3 w-3/4" />
                <div className="space-y-2">
                  <div className="h-3 bg-gray-300 rounded w-1/2" />
                  <div className="h-3 bg-gray-300 rounded w-2/3" />
                  <div className="h-3 bg-gray-300 rounded w-1/3" />
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Events Grid */}
      {filteredEvents.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredEvents.map((event) => (
            <EventCard
              key={event.eventId}
              event={event}
              onClick={onEventClick}
            />
          ))}
        </div>
      )}

      {/* No Events Found */}
      {!isLoading && filteredEvents.length === 0 && totalEvents > 0 && (
        <div className="text-center py-12">
          <div className="text-gray-400 mb-4">
            <div className="text-4xl mb-2">🔍</div>
            <h3 className="text-lg font-medium text-gray-600">No events found</h3>
            <p className="text-sm text-gray-500 mt-1">
              Try adjusting your search or filters
            </p>
          </div>
          {activeFilterCount > 0 && (
            <button
              onClick={clearFilters}
              className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              Clear Filters
            </button>
          )}
        </div>
      )}

      {/* No Events at All */}
      {!isLoading && totalEvents === 0 && (
        <div className="text-center py-12">
          <div className="text-gray-400 mb-4">
            <div className="text-4xl mb-2">🎫</div>
            <h3 className="text-lg font-medium text-gray-600">No events available</h3>
            <p className="text-sm text-gray-500 mt-1">
              Check back later for upcoming events
            </p>
          </div>
        </div>
      )}

      {/* Load More Button */}
      {hasNextPage && (
        <div className="text-center mt-8">
          <button
            onClick={() => fetchNextPage()}
            disabled={isFetchingNextPage}
            className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {isFetchingNextPage ? 'Loading...' : 'Load More Events'}
          </button>
        </div>
      )}
    </div>
  )
}

export default EventList
