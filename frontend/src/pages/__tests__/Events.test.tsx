import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import Events from '../Events'
import type { EventWithId } from '../../hooks/useEvents'

// Mock the useEvents hook
vi.mock('../../hooks/useEvents', () => ({
  useEvents: vi.fn(),
}))

// Mock components
vi.mock('../../components/EventList', () => ({
  default: ({ events, onEventClick, isLoading }: any) => (
    <div data-testid="event-list">
      {isLoading ? (
        <div>Loading events...</div>
      ) : (
        <div>
          {events?.map((event: EventWithId) => (
            <div
              key={event.eventId}
              onClick={() => onEventClick(event)}
              data-testid={`event-${event.eventId}`}
            >
              {event.name}
            </div>
          ))}
        </div>
      )}
    </div>
  ),
}))

vi.mock('../../components/EventDetail', () => ({
  default: ({ event, onClose }: any) => (
    <div data-testid="event-detail">
      <h2>{event.name}</h2>
      <button onClick={onClose} data-testid="close-modal">Close</button>
    </div>
  ),
}))

vi.mock('../../components/ActivityFeed', () => ({
  default: () => <div data-testid="activity-feed">Activity Feed</div>,
}))

vi.mock('../../components/Modal', () => ({
  default: ({ isOpen, children, onClose }: any) =>
    isOpen ? (
      <div data-testid="modal" onClick={onClose}>
        {children}
      </div>
    ) : null,
}))

describe('Events Page', () => {
  const mockEvents: EventWithId[] = [
    {
      eventId: 1,
      name: 'Test Event 1',
      description: 'Test Description 1',
      date: BigInt(Date.now()),
      venue: 'Test Venue 1',
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
    {
      eventId: 2,
      name: 'Test Event 2',
      description: 'Test Description 2',
      date: BigInt(Date.now()),
      venue: 'Test Venue 2',
      ticketPrice: BigInt('2000000000000000000'),
      maxSupply: BigInt(200),
      currentSupply: BigInt(75),
      organizer: '0x1234567890123456789012345678901234567890' as `0x${string}`,
      status: 0,
      createdAt: BigInt(Date.now()),
      stats: {
        totalRevenue: BigInt('150000000000000000000'),
        withdrawnRevenue: BigInt(0),
        availableRevenue: BigInt('150000000000000000000'),
        ticketsSold: 75,
        totalTickets: 200,
      },
    },
  ]

  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should render loading state', () => {
    const { useEvents } = require('../../hooks/useEvents')
    useEvents.mockReturnValue({
      events: [],
      isLoading: true,
      error: null,
      refetch: vi.fn(),
      isUsingCache: false,
      cacheStats: { hitRate: 0 },
    })

    render(<Events />)

    expect(screen.getByText('Loading events from blockchain...')).toBeInTheDocument()
  })

  it('should render events when loaded', () => {
    const { useEvents } = require('../../hooks/useEvents')
    useEvents.mockReturnValue({
      events: mockEvents,
      isLoading: false,
      error: null,
      refetch: vi.fn(),
      isUsingCache: false,
      cacheStats: { hitRate: 0 },
    })

    render(<Events />)

    expect(screen.getByText('Discover Events')).toBeInTheDocument()
    expect(screen.getByText('Found 2 events')).toBeInTheDocument()
    expect(screen.getByTestId('event-list')).toBeInTheDocument()
  })

  it('should show cache status when using cache', () => {
    const { useEvents } = require('../../hooks/useEvents')
    useEvents.mockReturnValue({
      events: mockEvents,
      isLoading: false,
      error: null,
      refetch: vi.fn(),
      isUsingCache: true,
      cacheStats: { hitRate: 0.85 },
    })

    render(<Events />)

    expect(screen.getByText('📋 Using cached data')).toBeInTheDocument()
    expect(screen.getByText('(Cache hit rate: 85%)')).toBeInTheDocument()
  })

  it('should display error message when there is an error', () => {
    const { useEvents } = require('../../hooks/useEvents')
    useEvents.mockReturnValue({
      events: [],
      isLoading: false,
      error: new Error('Network connection failed'),
      refetch: vi.fn(),
      isUsingCache: false,
      cacheStats: { hitRate: 0 },
    })

    render(<Events />)

    expect(screen.getByText('Error loading events')).toBeInTheDocument()
    expect(screen.getByText('Network connection failed')).toBeInTheDocument()
  })

  it('should show empty state when no events are found', () => {
    const { useEvents } = require('../../hooks/useEvents')
    useEvents.mockReturnValue({
      events: [],
      isLoading: false,
      error: null,
      refetch: vi.fn(),
      isUsingCache: false,
      cacheStats: { hitRate: 0 },
    })

    render(<Events />)

    expect(screen.getByText('No events found')).toBeInTheDocument()
    expect(screen.getByText('There are no events available at the moment. Check back later or create your own event!')).toBeInTheDocument()
  })

  it('should call refetch when refresh button is clicked', () => {
    const mockRefetch = vi.fn()
    const { useEvents } = require('../../hooks/useEvents')
    useEvents.mockReturnValue({
      events: mockEvents,
      isLoading: false,
      error: null,
      refetch: mockRefetch,
      isUsingCache: false,
      cacheStats: { hitRate: 0 },
    })

    render(<Events />)

    const refreshButton = screen.getByText('Refresh')
    fireEvent.click(refreshButton)

    expect(mockRefetch).toHaveBeenCalledTimes(1)
  })

  it('should open event detail modal when event is clicked', () => {
    const { useEvents } = require('../../hooks/useEvents')
    useEvents.mockReturnValue({
      events: mockEvents,
      isLoading: false,
      error: null,
      refetch: vi.fn(),
      isUsingCache: false,
      cacheStats: { hitRate: 0 },
    })

    render(<Events />)

    const eventElement = screen.getByTestId('event-1')
    fireEvent.click(eventElement)

    expect(screen.getByTestId('modal')).toBeInTheDocument()
    expect(screen.getByTestId('event-detail')).toBeInTheDocument()
    expect(screen.getByText('Test Event 1')).toBeInTheDocument()
  })

  it('should close modal when close button is clicked', () => {
    const { useEvents } = require('../../hooks/useEvents')
    useEvents.mockReturnValue({
      events: mockEvents,
      isLoading: false,
      error: null,
      refetch: vi.fn(),
      isUsingCache: false,
      cacheStats: { hitRate: 0 },
    })

    render(<Events />)

    // Open modal
    const eventElement = screen.getByTestId('event-1')
    fireEvent.click(eventElement)

    expect(screen.getByTestId('modal')).toBeInTheDocument()

    // Close modal
    const closeButton = screen.getByTestId('close-modal')
    fireEvent.click(closeButton)

    expect(screen.queryByTestId('modal')).not.toBeInTheDocument()
  })

  it('should render activity feed in sidebar', () => {
    const { useEvents } = require('../../hooks/useEvents')
    useEvents.mockReturnValue({
      events: mockEvents,
      isLoading: false,
      error: null,
      refetch: vi.fn(),
      isUsingCache: false,
      cacheStats: { hitRate: 0 },
    })

    render(<Events />)

    expect(screen.getByTestId('activity-feed')).toBeInTheDocument()
  })
})
