import { useState, useEffect, useCallback } from 'react'
import { useChainId } from 'wagmi'
import { useWallet } from './useWallet'
import { useIngressosContract } from './useIngressosContract'
import { useOrganizerEventCache } from './useEventCache'
import { useRetryLogic } from './useOrganizerEventsErrorHandler'
import { EventFetcherFactory } from '../services'
import type { EventFetcher } from '../services'

export interface EventStats {
  totalRevenue: bigint
  withdrawnRevenue: bigint
  availableRevenue: bigint
  ticketsSold: number
  totalTickets: number
}

export interface EventWithId {
  eventId: number
  name: string
  description: string
  date: bigint
  venue: string
  ticketPrice: bigint
  maxSupply: bigint
  currentSupply: bigint
  organizer: `0x${string}`
  status: number
  createdAt: bigint
}

export interface OrganizerEventWithStats extends EventWithId {
  stats: EventStats
}

export interface UseOrganizerEventsReturn {
  events: OrganizerEventWithStats[]
  isLoading: boolean
  error: Error | null
  refetch: () => void
  createEvent: (params: CreateEventParams) => Promise<void>
  updateEventStatus: (eventId: number, status: number) => Promise<void>
  withdrawRevenue: (eventId: number) => Promise<void>
  // Cache-related properties
  isUsingCache: boolean
  cacheStats: any
  invalidateCache: () => void
}

export interface CreateEventParams {
  name: string
  description: string
  date: Date
  venue: string
  ticketPrice: string
  maxSupply: number
}

export const useOrganizerEvents = (): UseOrganizerEventsReturn => {
  const { address, isConnected } = useWallet()
  const chainId = useChainId()
  const {
    isContractReady,
    createEvent: contractCreateEvent,
    updateEventStatus: contractUpdateStatus,
    withdrawRevenue: contractWithdrawRevenue
  } = useIngressosContract()

  const [events, setEvents] = useState<OrganizerEventWithStats[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<Error | null>(null)
  const [eventFetcher, setEventFetcher] = useState<EventFetcher | null>(null)

  // Initialize event cache for organizer
  const {
    cachedEvents,
    hasCachedEvents,
    cacheEvents,
    invalidateCache,
    cacheStats
  } = useOrganizerEventCache(address as `0x${string}` | undefined, {
    ttl: 5 * 60 * 1000, // 5 minutes cache
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
  const fetchOrganizerEvents = useCallback(async (forceRefresh = false) => {
    if (!isConnected || !address || !eventFetcher) {
      setEvents([])
      return
    }

    // Check cache first (unless force refresh)
    if (!forceRefresh && hasCachedEvents && cachedEvents) {
      console.log('Using cached organizer events')
      setEvents(cachedEvents)
      return
    }

    setIsLoading(true)
    setError(null)

    try {
      console.log('Fetching organizer events from blockchain...')

      // Fetch events with retry logic
      const organizerEvents = await executeWithRetry(
        () => eventFetcher.fetchOrganizerEvents(address as `0x${string}`),
        3 // Max 3 retries
      )

      // Cache the fetched events
      cacheEvents(organizerEvents)

      setEvents(organizerEvents)

      console.log(`Fetched ${organizerEvents.length} events for organizer ${address}`)
    } catch (err) {
      console.error('Error fetching organizer events:', err)

      // Handle and format error
      const handledError = handleError(err)
      setError(new Error(handledError.userMessage))

      // Fall back to cached events if available
      if (cachedEvents && cachedEvents.length > 0) {
        console.log('Falling back to cached events due to error')
        setEvents(cachedEvents)
      } else {
        setEvents([])
      }
    } finally {
      setIsLoading(false)
    }
  }, [isConnected, address, eventFetcher, hasCachedEvents, cachedEvents, cacheEvents, executeWithRetry, handleError])

  // Create new event
  const createEvent = useCallback(async (params: CreateEventParams): Promise<void> => {
    if (!isContractReady) {
      throw new Error('Contract not ready')
    }

    try {
      await contractCreateEvent(params)

      // Invalidate cache immediately
      invalidateCache()

      // Refresh events after creation with a delay for block confirmation
      setTimeout(() => {
        fetchOrganizerEvents(true) // Force refresh from blockchain
      }, 3000)
    } catch (error) {
      console.error('Error creating event:', error)
      throw error
    }
  }, [isContractReady, contractCreateEvent, invalidateCache, fetchOrganizerEvents])

  // Update event status
  const updateEventStatus = useCallback(async (eventId: number, status: number): Promise<void> => {
    if (!isContractReady) {
      throw new Error('Contract not ready')
    }

    try {
      const statusMap = ['ACTIVE', 'PAUSED', 'CANCELLED', 'COMPLETED'] as const
      await contractUpdateStatus(eventId, statusMap[status])

      // Invalidate cache immediately
      invalidateCache()

      // Refresh events after status update with a delay for block confirmation
      setTimeout(() => {
        fetchOrganizerEvents(true) // Force refresh from blockchain
      }, 3000)
    } catch (error) {
      console.error('Error updating event status:', error)
      throw error
    }
  }, [isContractReady, contractUpdateStatus, invalidateCache, fetchOrganizerEvents])

  // Withdraw revenue
  const withdrawRevenue = useCallback(async (eventId: number): Promise<void> => {
    if (!isContractReady) {
      throw new Error('Contract not ready')
    }

    try {
      await contractWithdrawRevenue(eventId)

      // Invalidate cache immediately
      invalidateCache()

      // Refresh events after withdrawal with a delay for block confirmation
      setTimeout(() => {
        fetchOrganizerEvents(true) // Force refresh from blockchain
      }, 3000)
    } catch (error) {
      console.error('Error withdrawing revenue:', error)
      throw error
    }
  }, [isContractReady, contractWithdrawRevenue, invalidateCache, fetchOrganizerEvents])

  // Refetch events (force refresh from blockchain)
  const refetch = useCallback(() => {
    invalidateCache()
    fetchOrganizerEvents(true)
  }, [invalidateCache, fetchOrganizerEvents])

  // Fetch events when dependencies change
  useEffect(() => {
    fetchOrganizerEvents()
  }, [fetchOrganizerEvents])

  // Load cached events immediately on mount if available
  useEffect(() => {
    if (hasCachedEvents && cachedEvents && events.length === 0) {
      console.log('Loading cached events on mount')
      setEvents(cachedEvents)
    }
  }, [hasCachedEvents, cachedEvents, events.length])

  return {
    events,
    isLoading,
    error,
    refetch,
    createEvent,
    updateEventStatus,
    withdrawRevenue,
    // Cache-related properties
    isUsingCache: hasCachedEvents && !isLoading,
    cacheStats,
    invalidateCache,
  }
}
