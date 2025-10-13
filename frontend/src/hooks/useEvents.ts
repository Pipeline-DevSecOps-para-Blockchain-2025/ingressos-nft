import { useState, useCallback, useMemo, useEffect } from 'react'
import { useChainId } from 'wagmi'
import { useEventCache } from './useEventCache'
import { useRetryLogic } from './useOrganizerEventsErrorHandler'
import { EventFetcherFactory } from '../services'
import type { EventFetcher } from '../services'
import type { OrganizerEventWithStats } from './useOrganizerEvents'

export interface EventWithId extends OrganizerEventWithStats {
  // EventWithId is now an alias for OrganizerEventWithStats for consistency
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

  // Cache-related properties
  isUsingCache: boolean
  cacheStats: any
}

const EVENTS_PER_PAGE = 20

export const useEvents = (): UseEventsReturn => {
  const chainId = useChainId()
  const [filters, setFilters] = useState<EventFilters>({})
  const [events, setEvents] = useState<EventWithId[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<Error | null>(null)
  const [eventFetcher, setEventFetcher] = useState<EventFetcher | null>(null)
  const [currentPage, setCurrentPage] = useState(1)


  // Initialize event cache
  const {
    getCachedEvents,
    setCachedEvents,
    hasCachedEvents,
    cacheStats,
  } = useEventCache({
    ttl: 10 * 60 * 1000, // 10 minutes cache for all events
    enableAutoInvalidation: true,
  })

  // Initialize retry logic with error handling
  const { executeWithRetry, handleError } = useRetryLogic()

  // Initialize EventFetcher when chain changes
  useEffect(() => {
    if (!chainId) {
      setEventFetcher(null)
      return
    }

    try {
      const fetcher = EventFetcherFactory.getInstance(chainId)
      setEventFetcher(fetcher)
    } catch (error) {
      console.error('Failed to initialize EventFetcher:', error)
      setError(error as Error)
      setEventFetcher(null)
    }
  }, [chainId])

  // Dynamic event fetching with cache integration
  const fetchAllEvents = useCallback(async (forceRefresh = false) => {
    if (!eventFetcher) {
      setEvents([])
      return
    }

    // Check cache first (unless force refresh)
    const cacheKey = `all-events-${chainId}`
    const cachedAllEvents = getCachedEvents(cacheKey)

    if (!forceRefresh && cachedAllEvents) {
      console.log('Using cached all events')
      setEvents(cachedAllEvents)
      return
    }

    setIsLoading(true)
    setError(null)

    try {
      console.log('Fetching all events from blockchain...')

      // Fetch all events with retry logic
      const allEvents = await executeWithRetry(
        () => eventFetcher.fetchAllEvents({ limit: 100 }), // Fetch up to 100 events
        3 // Max 3 retries
      )

      // Cache the fetched events
      setCachedEvents(cacheKey, allEvents)

      setEvents(allEvents)

      console.log(`Fetched ${allEvents.length} total events`)
    } catch (err) {
      console.error('Error fetching all events:', err)

      // Handle and format error
      const handledError = handleError(err)
      setError(new Error(handledError.userMessage))

      // Fall back to cached events if available
      if (cachedAllEvents && cachedAllEvents.length > 0) {
        console.log('Falling back to cached events due to error')
        setEvents(cachedAllEvents)
      } else {
        setEvents([])
      }
    } finally {
      setIsLoading(false)
    }
  }, [eventFetcher, chainId, getCachedEvents, setCachedEvents, executeWithRetry, handleError])

  // Fetch events when dependencies change
  useEffect(() => {
    fetchAllEvents()
  }, [fetchAllEvents])

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

  // Pagination logic for filtered events
  const paginatedEvents = useMemo(() => {
    const startIndex = (currentPage - 1) * EVENTS_PER_PAGE
    const endIndex = startIndex + EVENTS_PER_PAGE
    return filteredEvents.slice(0, endIndex) // Show all events up to current page
  }, [filteredEvents, currentPage])

  // Pagination controls
  const hasNextPage = useMemo(() => {
    return filteredEvents.length > currentPage * EVENTS_PER_PAGE
  }, [filteredEvents.length, currentPage])

  const fetchNextPage = useCallback(() => {
    if (hasNextPage) {
      setCurrentPage(prev => prev + 1)
    }
  }, [hasNextPage])

  // Get individual event
  const getEvent = useCallback((eventId: number) => {
    const event = events.find(e => e.eventId === eventId)
    return {
      data: event,
      isLoading: isLoading && !event,
      error: error,
    }
  }, [events, isLoading, error])

  // Refetch events (force refresh from blockchain)
  const refetch = useCallback(() => {
    setCurrentPage(1) // Reset pagination
    fetchAllEvents(true)
  }, [fetchAllEvents])

  // Check if using cache
  const isUsingCache = useMemo(() => {
    const cacheKey = `all-events-${chainId}`
    return hasCachedEvents(cacheKey) && !isLoading
  }, [chainId, hasCachedEvents, isLoading])

  return {
    // Event data
    events: paginatedEvents,
    isLoading,
    error,

    // Pagination
    hasNextPage,
    isFetchingNextPage: false, // We don't have async pagination anymore
    fetchNextPage,

    // Filtering and search
    filters,
    setFilters,
    filteredEvents,

    // Individual event queries
    getEvent,

    // Utilities
    refetch,
    totalEvents: filteredEvents.length,

    // Cache-related properties
    isUsingCache,
    cacheStats,
  }
}
