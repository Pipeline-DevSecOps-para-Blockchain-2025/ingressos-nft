import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'
import { useOrganizerEvents } from '../useOrganizerEvents'
import type { OrganizerEventWithStats } from '../useOrganizerEvents'

// Mock dependencies
vi.mock('wagmi', () => ({
  useChainId: vi.fn(() => 11155111),
}))

vi.mock('../useWallet', () => ({
  useWallet: vi.fn(() => ({
    address: '0x1234567890123456789012345678901234567890',
    isConnected: true,
  })),
}))

vi.mock('../useIngressosContract', () => ({
  useIngressosContract: vi.fn(() => ({
    isContractReady: true,
    createEvent: vi.fn(),
    updateEventStatus: vi.fn(),
    withdrawRevenue: vi.fn(),
  })),
}))

vi.mock('../useEventCache', () => ({
  useOrganizerEventCache: vi.fn(() => ({
    cachedEvents: null,
    hasCachedEvents: false,
    cacheEvents: vi.fn(),
    invalidateCache: vi.fn(),
    cacheStats: { hits: 0, misses: 0, size: 0, hitRate: 0, memoryUsage: 0 },
  })),
}))

vi.mock('../useOrganizerEventsErrorHandler', () => ({
  useRetryLogic: vi.fn(() => ({
    executeWithRetry: vi.fn(),
    handleError: vi.fn(),
  })),
}))

vi.mock('../../services', () => ({
  EventFetcherFactory: {
    getInstance: vi.fn(),
  },
}))

describe('useOrganizerEvents', () => {
  const mockEventFetcher = {
    fetchOrganizerEvents: vi.fn(),
  }

  const mockEvents: OrganizerEventWithStats[] = [
    {
      eventId: 1,
      name: 'Test Event',
      description: 'Test Description',
      date: BigInt(Date.now()),
      venue: 'Test Venue',
      ticketPrice: BigInt('1000000000000000000'),
      maxSupply: BigInt(100),
      currentSupply: BigInt(50),
      organizer: '0x1234567890123456789012345678901234567890' as `0x${string}`,
      status: 0,
      createdAt: BigInt(Date.now()),
      stats: {
        totalRevenue: BigInt('50000000000000000000'),
        withdrawnRevenue: BigInt(0),
        availableRevenue: BigInt('50000000000000000000'),
        ticketsSold: 50,
        totalTickets: 100,
      },
    },
  ]

  beforeEach(() => {
    vi.clearAllMocks()

    // Mock EventFetcherFactory
    const { EventFetcherFactory } = require('../../services')
    EventFetcherFactory.getInstance.mockReturnValue(mockEventFetcher)

    // Mock executeWithRetry to just call the function
    const { useRetryLogic } = require('../useOrganizerEventsErrorHandler')
    useRetryLogic.mockReturnValue({
      executeWithRetry: vi.fn((fn) => fn()),
      handleError: vi.fn((error) => ({
        type: 'unknown',
        message: error.message,
        userMessage: 'An error occurred',
        retryable: true,
        originalError: error,
      })),
    })
  })

  it('should initialize with empty events', () => {
    const { result } = renderHook(() => useOrganizerEvents())

    expect(result.current.events).toEqual([])
    expect(result.current.isLoading).toBe(false)
    expect(result.current.error).toBeNull()
  })

  it('should fetch events from blockchain when not cached', async () => {
    mockEventFetcher.fetchOrganizerEvents.mockResolvedValue(mockEvents)

    const { result } = renderHook(() => useOrganizerEvents())

    await waitFor(() => {
      expect(result.current.events).toEqual(mockEvents)
    })

    expect(mockEventFetcher.fetchOrganizerEvents).toHaveBeenCalledWith(
      '0x1234567890123456789012345678901234567890'
    )
  })

  it('should use cached events when available', () => {
    const { useOrganizerEventCache } = require('../useEventCache')
    useOrganizerEventCache.mockReturnValue({
      cachedEvents: mockEvents,
      hasCachedEvents: true,
      cacheEvents: vi.fn(),
      invalidateCache: vi.fn(),
      cacheStats: { hits: 1, misses: 0, size: 1, hitRate: 1, memoryUsage: 1000 },
    })

    const { result } = renderHook(() => useOrganizerEvents())

    expect(result.current.events).toEqual(mockEvents)
    expect(result.current.isUsingCache).toBe(true)
    expect(mockEventFetcher.fetchOrganizerEvents).not.toHaveBeenCalled()
  })

  it('should handle fetch errors gracefully', async () => {
    const error = new Error('Network error')
    mockEventFetcher.fetchOrganizerEvents.mockRejectedValue(error)

    const { result } = renderHook(() => useOrganizerEvents())

    await waitFor(() => {
      expect(result.current.error).toBeTruthy()
    })

    expect(result.current.events).toEqual([])
    expect(result.current.isLoading).toBe(false)
  })

  it('should fall back to cached events on error', async () => {
    const error = new Error('Network error')
    mockEventFetcher.fetchOrganizerEvents.mockRejectedValue(error)

    const { useOrganizerEventCache } = require('../useEventCache')
    useOrganizerEventCache.mockReturnValue({
      cachedEvents: mockEvents,
      hasCachedEvents: true,
      cacheEvents: vi.fn(),
      invalidateCache: vi.fn(),
      cacheStats: { hits: 1, misses: 1, size: 1, hitRate: 0.5, memoryUsage: 1000 },
    })

    const { result } = renderHook(() => useOrganizerEvents())

    await waitFor(() => {
      expect(result.current.events).toEqual(mockEvents)
    })

    expect(result.current.error).toBeTruthy()
  })

  it('should refetch events when refetch is called', async () => {
    mockEventFetcher.fetchOrganizerEvents.mockResolvedValue(mockEvents)

    const { result } = renderHook(() => useOrganizerEvents())

    // Wait for initial fetch
    await waitFor(() => {
      expect(result.current.events).toEqual(mockEvents)
    })

    // Clear the mock and call refetch
    mockEventFetcher.fetchOrganizerEvents.mockClear()
    mockEventFetcher.fetchOrganizerEvents.mockResolvedValue([])

    result.current.refetch()

    await waitFor(() => {
      expect(mockEventFetcher.fetchOrganizerEvents).toHaveBeenCalledTimes(1)
    })
  })

  it('should invalidate cache when creating event', async () => {
    const { useIngressosContract } = require('../useIngressosContract')
    const mockCreateEvent = vi.fn().mockResolvedValue(undefined)

    useIngressosContract.mockReturnValue({
      isContractReady: true,
      createEvent: mockCreateEvent,
      updateEventStatus: vi.fn(),
      withdrawRevenue: vi.fn(),
    })

    const mockInvalidateCache = vi.fn()
    const { useOrganizerEventCache } = require('../useEventCache')
    useOrganizerEventCache.mockReturnValue({
      cachedEvents: null,
      hasCachedEvents: false,
      cacheEvents: vi.fn(),
      invalidateCache: mockInvalidateCache,
      cacheStats: { hits: 0, misses: 0, size: 0, hitRate: 0, memoryUsage: 0 },
    })

    const { result } = renderHook(() => useOrganizerEvents())

    const eventParams = {
      name: 'New Event',
      description: 'New Description',
      date: new Date(),
      venue: 'New Venue',
      ticketPrice: '1000000000000000000',
      maxSupply: 100,
    }

    await result.current.createEvent(eventParams)

    expect(mockCreateEvent).toHaveBeenCalledWith(eventParams)
    expect(mockInvalidateCache).toHaveBeenCalled()
  })

  it('should handle contract not ready error', async () => {
    const { useIngressosContract } = require('../useIngressosContract')
    useIngressosContract.mockReturnValue({
      isContractReady: false,
      createEvent: vi.fn(),
      updateEventStatus: vi.fn(),
      withdrawRevenue: vi.fn(),
    })

    const { result } = renderHook(() => useOrganizerEvents())

    const eventParams = {
      name: 'New Event',
      description: 'New Description',
      date: new Date(),
      venue: 'New Venue',
      ticketPrice: '1000000000000000000',
      maxSupply: 100,
    }

    await expect(result.current.createEvent(eventParams)).rejects.toThrow('Contract not ready')
  })

  it('should return cache statistics', () => {
    const mockCacheStats = { hits: 5, misses: 2, size: 3, hitRate: 0.71, memoryUsage: 2048 }

    const { useOrganizerEventCache } = require('../useEventCache')
    useOrganizerEventCache.mockReturnValue({
      cachedEvents: null,
      hasCachedEvents: false,
      cacheEvents: vi.fn(),
      invalidateCache: vi.fn(),
      cacheStats: mockCacheStats,
    })

    const { result } = renderHook(() => useOrganizerEvents())

    expect(result.current.cacheStats).toEqual(mockCacheStats)
  })

  it('should not fetch events when wallet is not connected', () => {
    const { useWallet } = require('../useWallet')
    useWallet.mockReturnValue({
      address: undefined,
      isConnected: false,
    })

    const { result } = renderHook(() => useOrganizerEvents())

    expect(result.current.events).toEqual([])
    expect(mockEventFetcher.fetchOrganizerEvents).not.toHaveBeenCalled()
  })
})
