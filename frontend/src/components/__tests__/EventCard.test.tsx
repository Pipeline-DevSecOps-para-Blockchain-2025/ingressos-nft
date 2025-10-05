import { render, screen, fireEvent } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'
import EventCard from '../EventCard'
import type { EventWithId } from '../../hooks/useEvents'

// Mock the useIngressosContract hook
vi.mock('../../hooks/useIngressosContract', () => ({
  useIngressosContract: vi.fn(() => ({
    getEventStatusName: vi.fn((status: number) => {
      switch (status) {
        case 0: return 'Active'
        case 1: return 'Paused'
        case 2: return 'Cancelled'
        case 3: return 'Completed'
        default: return 'Unknown'
      }
    }),
    formatPrice: vi.fn((price: bigint) => (Number(price) / 1e18).toString()),
    purchaseTicket: vi.fn(),
    contractAddress: '0x1234567890123456789012345678901234567890',
  })),
}))

const mockEvent: EventWithId = {
  eventId: 1,
  name: 'Test Event',
  description: 'This is a test event description',
  date: BigInt(Math.floor(Date.now() / 1000) + 86400), // Tomorrow
  venue: 'Test Venue',
  ticketPrice: BigInt('100000000000000000'), // 0.1 ETH
  maxSupply: BigInt(100),
  currentSupply: BigInt(25),
  organizer: '0x1234567890123456789012345678901234567890' as `0x${string}`,
  status: 0, // Active
  createdAt: BigInt(Math.floor(Date.now() / 1000) - 86400), // Yesterday
}

describe('EventCard', () => {
  it('should render event information correctly', () => {
    render(<EventCard event={mockEvent} />)

    expect(screen.getByText('Test Event')).toBeInTheDocument()
    expect(screen.getByText('This is a test event description')).toBeInTheDocument()
    expect(screen.getByText('Test Venue')).toBeInTheDocument()
    expect(screen.getByText('0.1 ETH')).toBeInTheDocument()
    expect(screen.getByText('Active')).toBeInTheDocument()
  })

  it('should show ticket availability correctly', () => {
    render(<EventCard event={mockEvent} />)

    expect(screen.getByText('75 / 100')).toBeInTheDocument()
  })

  it('should call onClick when card is clicked', () => {
    const mockOnClick = vi.fn()
    render(<EventCard event={mockEvent} onClick={mockOnClick} />)

    fireEvent.click(screen.getByText('Test Event'))
    expect(mockOnClick).toHaveBeenCalledWith(mockEvent)
  })

  it('should show sold out badge when event is sold out', () => {
    const soldOutEvent = {
      ...mockEvent,
      currentSupply: BigInt(100), // Same as maxSupply
    }

    render(<EventCard event={soldOutEvent} />)

    expect(screen.getAllByText('Sold Out')).toHaveLength(2) // Badge and button
    expect(screen.getByRole('button', { name: 'Sold Out' })).toBeDisabled()
  })

  it('should disable buy button for past events', () => {
    const pastEvent = {
      ...mockEvent,
      date: BigInt(Math.floor(Date.now() / 1000) - 86400), // Yesterday
    }

    render(<EventCard event={pastEvent} />)

    const buyButton = screen.getByText('Event Ended')
    expect(buyButton).toBeDisabled()
  })

  it('should disable buy button for paused events', () => {
    const pausedEvent = {
      ...mockEvent,
      status: 1, // Paused
    }

    render(<EventCard event={pausedEvent} />)

    const buyButton = screen.getByText('Not Available')
    expect(buyButton).toBeDisabled()
  })

  it('should show organizer address truncated', () => {
    render(<EventCard event={mockEvent} />)

    expect(screen.getByText('0x1234...7890')).toBeInTheDocument()
  })

  it('should not show actions when showActions is false', () => {
    render(<EventCard event={mockEvent} showActions={false} />)

    expect(screen.queryByText('Buy Ticket')).not.toBeInTheDocument()
    expect(screen.queryByText('Details')).not.toBeInTheDocument()
  })

  it('should handle details button click without triggering card click', () => {
    const mockOnClick = vi.fn()
    render(<EventCard event={mockEvent} onClick={mockOnClick} />)

    fireEvent.click(screen.getByText('Details'))

    // Card onClick should not be called when details button is clicked
    expect(mockOnClick).not.toHaveBeenCalled()
  })

  it('should handle buy button click without triggering card click', () => {
    const mockOnClick = vi.fn()
    render(<EventCard event={mockEvent} onClick={mockOnClick} />)

    fireEvent.click(screen.getByText('Buy Ticket'))

    // Card onClick should not be called when buy button is clicked
    expect(mockOnClick).not.toHaveBeenCalled()
  })
})
