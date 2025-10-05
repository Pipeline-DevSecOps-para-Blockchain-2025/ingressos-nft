import { renderHook, act } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { useEvents } from '../useEvents'

// Mock the useIngressosContract hook
const mockGetEventDetails = vi.fn()
const mockGetNextEventId = vi.fn()

vi.mock('../useIngressosContract', () => ({
  useIngressosContract: vi.fn(() => ({
    getEventDetails: mockGetEventDetails,
    getNextEventId: mockGetNextEventId,
    isContractReady: true,
    getEventStatusName: vi.fn((status: number) => {
      switch (status) {
        case 0: return 'Active'
        case 1: return 'Paused'
        case 2: return 'Cancelled'
        case 3: return 'Completed'
        default: return 'Unknown'
      }
    }),
  })),
}))

// Mock React Query
vi.mock('@tanstack/react-query', () => ({
  useQuery: vi.fn(),
  useInfiniteQuery: vi.fn(() => ({
    data: {
      pages: [{
        events: [
          {
            eventId: 1,
            name: 'Test Event 1',
            description: 'Test Description 1',
            date: BigInt(Math.floor(Date.now() / 1000) + 86400),
            venue: 'Test Venue 1',
            ticketPrice: BigInt('100000000000000000'),
            maxSupply: BigInt(100),
            currentSupply: BigInt(25),
            organizer: '0x1234567890123456789012345678901234567890',
            status: 0,
            createdAt: BigInt(Math.floor(Date.now() / 1000) - 86400),
          },
          {
            eventId: 2,
            name: 'Test Event 2',
            description: 'Test Description 2',
            date: BigInt(Math.floor(Date.now() / 1000) + 172800),
            venue: 'Test Venue 2',
            ticketPrice: BigInt('200000000000000000'),
            maxSupply: BigInt(50),
            currentSupply: BigInt(50),
            organizer: '0x1234567890123456789012345678901234567890',
            status: 0,
            createdAt: BigInt(Math.floor(Date.now() / 1000) - 172800),
          }
        ],
        hasMore: false,
      }]
    },
    isLoading: false,
    error: null,
    hasNextPage: false,
    isFetchingNextPage: false,
    fetchNextPage: vi.fn(),
    refetch: vi.fn(),
  })),
}))

describe('useEvents', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockGetNextEventId.mockReturnValue({
      data: BigInt(3),
      isLoading: false,
      error: null,
    })
  })

  it('should return events data', () => {
    const { result } = renderHook(() => useEvents())

    expect(result.current.events).toHaveLength(2)
    expect(result.current.events[0].name).toBe('Test Event 1')
    expect(result.current.events[1].name).toBe('Test Event 2')
    expect(result.current.totalEvents).toBe(2)
  })

  it('should filter events by search term', () => {
    const { result } = renderHook(() => useEvents())

    act(() => {
      result.current.setFilters({ search: 'Event 1' })
    })

    expect(result.current.filteredEvents).toHaveLength(1)
    expect(result.current.filteredEvents[0].name).toBe('Test Event 1')
  })

  it('should filter events by status', () => {
    const { result } = renderHook(() => useEvents())

    act(() => {
      result.current.setFilters({ status: [0] })
    })

    expect(result.current.filteredEvents).toHaveLength(2)
    expect(result.current.filteredEvents.every(event => event.status === 0)).toBe(true)
  })

  it('should filter events by price range', () => {
    const { result } = renderHook(() => useEvents())

    act(() => {
      result.current.setFilters({ 
        priceRange: { min: 0.15, max: 0.25 } 
      })
    })

    expect(result.current.filteredEvents).toHaveLength(1)
    expect(result.current.filteredEvents[0].name).toBe('Test Event 2')
  })

  it('should filter events by organizer', () => {
    const { result } = renderHook(() => useEvents())

    act(() => {
      result.current.setFilters({ 
        organizer: '0x1234567890123456789012345678901234567890' 
      })
    })

    expect(result.current.filteredEvents).toHaveLength(2)
  })

  it('should get individual event by ID', () => {
    const { result } = renderHook(() => useEvents())

    const eventQuery = result.current.getEvent(1)
    
    expect(eventQuery.data).toBeDefined()
    expect(eventQuery.data?.eventId).toBe(1)
    expect(eventQuery.data?.name).toBe('Test Event 1')
  })

  it('should return undefined for non-existent event', () => {
    const { result } = renderHook(() => useEvents())

    const eventQuery = result.current.getEvent(999)
    
    expect(eventQuery.data).toBeUndefined()
  })

  it('should handle multiple filters simultaneously', () => {
    const { result } = renderHook(() => useEvents())

    act(() => {
      result.current.setFilters({ 
        search: 'Test',
        status: [0],
        priceRange: { min: 0, max: 1 }
      })
    })

    expect(result.current.filteredEvents).toHaveLength(2)
    expect(result.current.filters.search).toBe('Test')
    expect(result.current.filters.status).toEqual([0])
    expect(result.current.filters.priceRange).toEqual({ min: 0, max: 1 })
  })

  it('should clear filters when set to empty object', () => {
    const { result } = renderHook(() => useEvents())

    act(() => {
      result.current.setFilters({ search: 'Test' })
    })

    expect(result.current.filters.search).toBe('Test')

    act(() => {
      result.current.setFilters({})
    })

    expect(result.current.filters.search).toBeUndefined()
    expect(result.current.filteredEvents).toHaveLength(2)
  })
})