import { render, screen, fireEvent } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'
import TicketDetailModal from '../TicketDetailModal'
import type { TicketMetadata } from '../../hooks/useUserTickets'

// Mock the copyToClipboard utility
vi.mock('../../utils', async () => {
  const actual = await vi.importActual('../../utils')
  return {
    ...actual,
    copyToClipboard: vi.fn().mockResolvedValue(true),
  }
})

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

describe('TicketDetailModal', () => {
  it('should not render when ticket is null', () => {
    render(
      <TicketDetailModal
        isOpen={true}
        ticket={null}
        onClose={vi.fn()}
      />
    )

    expect(screen.queryByText('Test Event')).not.toBeInTheDocument()
  })

  it('should not render when isOpen is false', () => {
    render(
      <TicketDetailModal
        isOpen={false}
        ticket={mockTicket}
        onClose={vi.fn()}
      />
    )

    expect(screen.queryByText('Test Event')).not.toBeInTheDocument()
  })

  it('should render ticket details when open', () => {
    render(
      <TicketDetailModal
        isOpen={true}
        ticket={mockTicket}
        onClose={vi.fn()}
      />
    )

    expect(screen.getAllByText('Test Event')).toHaveLength(2) // Header and form field
    expect(screen.getByText('Ticket #1')).toBeInTheDocument()
    expect(screen.getByText('Test Venue')).toBeInTheDocument()
    expect(screen.getByText('This is a test event')).toBeInTheDocument()
    expect(screen.getAllByText('Active')).toHaveLength(2) // Header badge and status field
    expect(screen.getByText('0.1 ETH')).toBeInTheDocument()
  })

  it('should call onClose when close button is clicked', () => {
    const mockOnClose = vi.fn()
    render(
      <TicketDetailModal
        isOpen={true}
        ticket={mockTicket}
        onClose={mockOnClose}
      />
    )

    fireEvent.click(screen.getByText('Close'))
    expect(mockOnClose).toHaveBeenCalled()
  })

  it('should show transfer button for active upcoming events', () => {
    render(
      <TicketDetailModal
        isOpen={true}
        ticket={mockTicket}
        onClose={vi.fn()}
        onTransfer={vi.fn()}
      />
    )

    expect(screen.getByText('Transfer Ticket')).toBeInTheDocument()
  })

  it('should not show transfer button for past events', () => {
    const pastTicket = {
      ...mockTicket,
      eventDate: Math.floor(Date.now() / 1000) - 86400, // Yesterday
    }

    render(
      <TicketDetailModal
        isOpen={true}
        ticket={pastTicket}
        onClose={vi.fn()}
        onTransfer={vi.fn()}
      />
    )

    expect(screen.queryByText('Transfer Ticket')).not.toBeInTheDocument()
  })

  it('should not show transfer button for cancelled events', () => {
    const cancelledTicket = {
      ...mockTicket,
      eventStatus: 2, // Cancelled
    }

    render(
      <TicketDetailModal
        isOpen={true}
        ticket={cancelledTicket}
        onClose={vi.fn()}
        onTransfer={vi.fn()}
      />
    )

    expect(screen.queryByText('Transfer Ticket')).not.toBeInTheDocument()
  })

  it('should call onTransfer when transfer button is clicked', () => {
    const mockOnTransfer = vi.fn()
    render(
      <TicketDetailModal
        isOpen={true}
        ticket={mockTicket}
        onClose={vi.fn()}
        onTransfer={mockOnTransfer}
      />
    )

    fireEvent.click(screen.getByText('Transfer Ticket'))
    expect(mockOnTransfer).toHaveBeenCalledWith(1)
  })

  it('should show transferred badge and original buyer when ticket is transferred', () => {
    const transferredTicket = {
      ...mockTicket,
      isTransferred: true,
      originalBuyer: '0xabcdefabcdefabcdefabcdefabcdefabcdefabcd' as `0x${string}`,
    }

    render(
      <TicketDetailModal
        isOpen={true}
        ticket={transferredTicket}
        onClose={vi.fn()}
      />
    )

    expect(screen.getByText('Transferred')).toBeInTheDocument()
    expect(screen.getByText('Original Buyer')).toBeInTheDocument()
    expect(screen.getByText('0xabcd...abcd')).toBeInTheDocument()
  })

  it('should show cancellation warning for cancelled events', () => {
    const cancelledTicket = {
      ...mockTicket,
      eventStatus: 2, // Cancelled
    }

    render(
      <TicketDetailModal
        isOpen={true}
        ticket={cancelledTicket}
        onClose={vi.fn()}
      />
    )

    expect(screen.getByText('Event Cancelled')).toBeInTheDocument()
    expect(screen.getByText(/This event has been cancelled/)).toBeInTheDocument()
  })

  it('should handle copy functionality for token ID', async () => {
    const { copyToClipboard } = await import('../../utils')
    
    render(
      <TicketDetailModal
        isOpen={true}
        ticket={mockTicket}
        onClose={vi.fn()}
      />
    )

    const copyButtons = screen.getAllByTitle('Copy Token ID')
    fireEvent.click(copyButtons[0])

    expect(copyToClipboard).toHaveBeenCalledWith('1')
  })

  it('should handle copy functionality for addresses', async () => {
    const { copyToClipboard } = await import('../../utils')
    
    render(
      <TicketDetailModal
        isOpen={true}
        ticket={mockTicket}
        onClose={vi.fn()}
      />
    )

    const copyButtons = screen.getAllByTitle('Copy Address')
    fireEvent.click(copyButtons[0])

    expect(copyToClipboard).toHaveBeenCalledWith(mockTicket.currentOwner)
  })

  it('should show correct status colors', () => {
    const { rerender } = render(
      <TicketDetailModal
        isOpen={true}
        ticket={mockTicket}
        onClose={vi.fn()}
      />
    )
    
    // Active status (green) - use getAllByText since there are multiple "Active" elements
    expect(screen.getAllByText('Active')[0]).toHaveClass('text-green-800')

    // Paused status (yellow)
    const pausedTicket = { ...mockTicket, eventStatus: 1 }
    rerender(
      <TicketDetailModal
        isOpen={true}
        ticket={pausedTicket}
        onClose={vi.fn()}
      />
    )
    expect(screen.getAllByText('Paused')[0]).toHaveClass('text-yellow-800')

    // Cancelled status (red)
    const cancelledTicket = { ...mockTicket, eventStatus: 2 }
    rerender(
      <TicketDetailModal
        isOpen={true}
        ticket={cancelledTicket}
        onClose={vi.fn()}
      />
    )
    expect(screen.getAllByText('Cancelled')[0]).toHaveClass('text-red-800')

    // Completed status (gray)
    const completedTicket = { ...mockTicket, eventStatus: 3 }
    rerender(
      <TicketDetailModal
        isOpen={true}
        ticket={completedTicket}
        onClose={vi.fn()}
      />
    )
    expect(screen.getAllByText('Completed')[0]).toHaveClass('text-gray-800')
  })

  it('should display truncated addresses correctly', () => {
    render(
      <TicketDetailModal
        isOpen={true}
        ticket={mockTicket}
        onClose={vi.fn()}
      />
    )

    expect(screen.getByText('0x1234...7890')).toBeInTheDocument()
  })
})