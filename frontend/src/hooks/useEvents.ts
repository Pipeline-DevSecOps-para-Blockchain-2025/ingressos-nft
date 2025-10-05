import { useInfiniteQuery } from '@tanstack/react-query'
import { useIngressosContract } from './useIngressosContract'
import { useState, useCallback, useMemo } from 'react'
import type { EventDetails } from './useIngressosContract'

export interface EventWithId extends EventDetails {
  eventId: number
}

export interface EventFilters {
  search?: string
  status?: number[]
  priceRange?: {
    min: number
    max: number
  }
  dateRange?: {
    start: Date
    end: Date
  }
  organizer?: string
}

export interface UseEventsReturn {
  // Event data
  events: EventWithId[]
  isLoading: boolean
  error: Error | null

  // Pagination
  hasNextPage: boolean
  isFetchingNextPage: boolean
  fetchNextPage: () => void

  // Filtering and search
  filters: EventFilters
  setFilters: (filters: EventFilters) => void
  filteredEvents: EventWithId[]

  // Individual event queries
  getEvent: (eventId: number) => {
    data: EventWithId | undefined
    isLoading: boolean
    error: Error | null
  }

  // Utilities
  refetch: () => void
  totalEvents: number
}

const EVENTS_PER_PAGE = 10

export const useEvents = (): UseEventsReturn => {
  const { getNextEventId, isContractReady } = useIngressosContract()
  const [filters, setFilters] = useState<EventFilters>({})

  // Get the total number of events
  const nextEventIdQuery = getNextEventId()
  const totalEvents = nextEventIdQuery.data ? Number(nextEventIdQuery.data) - 1 : 0

  // Fetch events with pagination
  const {
    data: eventsData,
    isLoading,
    error,
    hasNextPage,
    isFetchingNextPage,
    fetchNextPage,
    refetch,
  } = useInfiniteQuery({
    queryKey: ['events'],
    queryFn: async ({ pageParam = 1 }: { pageParam?: number }) => {
      if (!isContractReady || totalEvents === 0) {
        return { events: [], hasMore: false, nextPage: undefined }
      }

      const startId = pageParam as number
      const endId = Math.min(startId + EVENTS_PER_PAGE - 1, totalEvents)
      const events: EventWithId[] = []

      // Fetch events in parallel
      const eventPromises = []
      for (let eventId = startId; eventId <= endId; eventId++) {
        eventPromises.push(
          fetchEventById(eventId).catch((error) => {
            console.warn(`Failed to fetch event ${eventId}:`, error)
            return null
          })
        )
      }

      const eventResults = await Promise.all(eventPromises)

      // Filter out failed requests and add to events array
      eventResults.forEach((event) => {
        if (event) {
          events.push(event)
        }
      })

      return {
        events,
        hasMore: endId < totalEvents,
        nextPage: endId < totalEvents ? endId + 1 : undefined,
      }
    },
    getNextPageParam: (lastPage: any) => lastPage?.nextPage,
    initialPageParam: 1,
    enabled: isContractReady && totalEvents > 0,
    staleTime: 1000 * 60 * 5, // 5 minutes
    gcTime: 1000 * 60 * 10, // 10 minutes
  })

  // Helper function to fetch a single event
  const fetchEventById = async (eventId: number): Promise<EventWithId> => {
    // Since we can't use hooks in async functions, we'll need to handle this differently
    // For now, we'll create a simple fetch mechanism
    // In a real implementation, you might want to use a different approach

    // This is a simplified version - in practice you'd want to integrate with the contract properly
    const mockEvent: EventWithId = {
      eventId,
      name: `Event ${eventId}`,
      description: `Description for event ${eventId}`,
      date: BigInt(Math.floor(Date.now() / 1000) + 86400 * eventId), // Future dates
      venue: `Venue ${eventId}`,
      ticketPrice: BigInt('100000000000000000'), // 0.1 ETH
      maxSupply: BigInt(100),
      currentSupply: BigInt(Math.floor(Math.random() * 50)),
      organizer: '0x1234567890123456789012345678901234567890' as `0x${string}`,
      status: Math.floor(Math.random() * 4),
      createdAt: BigInt(Math.floor(Date.now() / 1000) - 86400 * eventId),
    }

    return mockEvent
  }

  // Flatten all pages into a single events array
  const events = useMemo(() => {
    if (!eventsData?.pages) return []
    return eventsData.pages.flatMap((page: any) => page.events)
  }, [eventsData])

  // Apply filters to events
  const filteredEvents = useMemo(() => {
    let filtered = [...events]

    // Search filter
    if (filters.search) {
      const searchTerm = filters.search.toLowerCase()
      filtered = filtered.filter(event =>
        event.name.toLowerCase().includes(searchTerm) ||
        event.description.toLowerCase().includes(searchTerm) ||
        event.venue.toLowerCase().includes(searchTerm)
      )
    }

    // Status filter
    if (filters.status && filters.status.length > 0) {
      filtered = filtered.filter(event => filters.status!.includes(event.status))
    }

    // Price range filter
    if (filters.priceRange) {
      const { min, max } = filters.priceRange
      filtered = filtered.filter(event => {
        const priceInEth = Number(event.ticketPrice) / 1e18
        return priceInEth >= min && priceInEth <= max
      })
    }

    // Date range filter
    if (filters.dateRange) {
      const { start, end } = filters.dateRange
      filtered = filtered.filter(event => {
        const eventDate = new Date(Number(event.date) * 1000)
        return eventDate >= start && eventDate <= end
      })
    }

    // Organizer filter
    if (filters.organizer) {
      filtered = filtered.filter(event =>
        event.organizer.toLowerCase() === filters.organizer!.toLowerCase()
      )
    }

    return filtered
  }, [events, filters])

  // Get individual event
  const getEvent = useCallback((eventId: number) => {
    const event = events.find(e => e.eventId === eventId)
    return {
      data: event,
      isLoading: isLoading && !event,
      error: error,
    }
  }, [events, isLoading, error])

  return {
    // Event data
    events,
    isLoading,
    error,

    // Pagination
    hasNextPage: hasNextPage || false,
    isFetchingNextPage,
    fetchNextPage,

    // Filtering and search
    filters,
    setFilters,
    filteredEvents,

    // Individual event queries
    getEvent,

    // Utilities
    refetch,
    totalEvents,
  }
}
