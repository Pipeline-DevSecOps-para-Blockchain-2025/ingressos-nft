import { render, screen, fireEvent } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'
import TicketCard from '../TicketCard'
import type { TicketMetadata } from '../../hooks/useUserTickets'

const mockTicket: TicketMetadata = {
  tokenId: 1,
  eventId: 1,
  ticketNumber: 1,
  purchasePrice: BigInt('100000000000000000'), // 0.1 ETH
  purchaseDate: Math.floor(Date.now() / 1000) - 86400, // Yesterday
  originalBuyer: '0x1234567890123456789012345678901234567890' as `0x${string}`,
  currentOwner: '0x1234567890123456789012345678901234567890' as `0x${string}`,
  eventName: 'Test Event',
  eventDescription: 'This is a test event',
  eventDate: Math.floor(Date.now() / 1000) + 86400, // Tomorrow
  eventVenue: 'Test Venue',
  eventStatus: 0, // Active
  isTransferred: false,
}

describe('TicketCard', () => {
  it('should render ticket information correctly', () => {
    render(<TicketCard ticket={mockTicket} />)

    expect(screen.getByText('Test Event')).toBeInTheDocument()
    expect(screen.getByText('Ticket #1')).toBeInTheDocument()
    expect(screen.getByText('Test Venue')).toBeInTheDocument()
    expect(screen.getByText('Active')).toBeInTheDocument()
    expect(screen.getByText('Token ID: 1')).toBeInTheDocument()
    expect(screen.getByText('Paid: 0.1 ETH')).toBeInTheDocument()
  })

  it('should call onClick when card is clicked', () => {
    const mockOnClick = vi.fn()
    render(<TicketCard ticket={mockTicket} onClick={mockOnClick} />)

    fireEvent.click(screen.getByText('Test Event'))
    expect(mockOnClick).toHaveBeenCalledWith(mockTicket)
  })

  it('should show transfer button for active upcoming events', () => {
    render(<TicketCard ticket={mockTicket} />)

    expect(screen.getByText('Transfer')).toBeInTheDocument()
  })

  it('should not show transfer button for past events', () => {
    const pastTicket = {
      ...mockTicket,
      eventDate: Math.floor(Date.now() / 1000) - 86400, // Yesterday
    }

    render(<TicketCard ticket={pastTicket} />)

    expect(screen.queryByText('Transfer')).not.toBeInTheDocument()
  })

  it('should not show transfer button for cancelled events', () => {
    const cancelledTicket = {
      ...mockTicket,
      eventStatus: 2, // Cancelled
    }

    render(<TicketCard ticket={cancelledTicket} />)

    expect(screen.queryByText('Transfer')).not.toBeInTheDocument()
    expect(screen.getByText('Cancelled')).toBeInTheDocument()
  })

  it('should show transferred badge when ticket is transferred', () => {
    const transferredTicket = {
      ...mockTicket,
      isTransferred: true,
      originalBuyer: '0xabcdefabcdefabcdefabcdefabcdefabcdefabcd' as `0x${string}`,
    }

    render(<TicketCard ticket={transferredTicket} />)

    expect(screen.getByText('Transferred')).toBeInTheDocument()
  })

  it('should show cancellation warning for cancelled events', () => {
    const cancelledTicket = {
      ...mockTicket,
      eventStatus: 2, // Cancelled
    }

    render(<TicketCard ticket={cancelledTicket} />)

    expect(screen.getByText(/This event has been cancelled/)).toBeInTheDocument()
  })

  it('should handle details button click without triggering card click', () => {
    const mockOnClick = vi.fn()
    render(<TicketCard ticket={mockTicket} onClick={mockOnClick} />)

    fireEvent.click(screen.getByText('View Details'))

    // onClick should be called once (from the details button)
    expect(mockOnClick).toHaveBeenCalledTimes(1)
    expect(mockOnClick).toHaveBeenCalledWith(mockTicket)
  })

  it('should handle transfer button click without triggering card click', () => {
    const mockOnClick = vi.fn()
    const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {})

    render(<TicketCard ticket={mockTicket} onClick={mockOnClick} />)

    fireEvent.click(screen.getByText('Transfer'))

    // Card onClick should not be called when transfer button is clicked
    expect(mockOnClick).not.toHaveBeenCalled()
    // Transfer functionality should log (placeholder implementation)
    expect(consoleSpy).toHaveBeenCalledWith('Transfer ticket:', 1)

    consoleSpy.mockRestore()
  })

  it('should not show actions when showActions is false', () => {
    render(<TicketCard ticket={mockTicket} showActions={false} />)

    expect(screen.queryByText('View Details')).not.toBeInTheDocument()
    expect(screen.queryByText('Transfer')).not.toBeInTheDocument()
  })

  it('should show correct status colors', () => {
    const { rerender } = render(<TicketCard ticket={mockTicket} />)

    // Active status (green)
    expect(screen.getByText('Active')).toHaveClass('text-green-800')

    // Paused status (yellow)
    const pausedTicket = { ...mockTicket, eventStatus: 1 }
    rerender(<TicketCard ticket={pausedTicket} />)
    expect(screen.getByText('Paused')).toHaveClass('text-yellow-800')

    // Cancelled status (red)
    const cancelledTicket = { ...mockTicket, eventStatus: 2 }
    rerender(<TicketCard ticket={cancelledTicket} />)
    expect(screen.getByText('Cancelled')).toHaveClass('text-red-800')

    // Completed status (gray)
    const completedTicket = { ...mockTicket, eventStatus: 3 }
    rerender(<TicketCard ticket={completedTicket} />)
    expect(screen.getByText('Completed')).toHaveClass('text-gray-800')
  })

  it('should show past event indicator', () => {
    const pastTicket = {
      ...mockTicket,
      eventDate: Math.floor(Date.now() / 1000) - 86400, // Yesterday
    }

    render(<TicketCard ticket={pastTicket} />)

    expect(screen.getByText('(Past)')).toBeInTheDocument()
  })
})
