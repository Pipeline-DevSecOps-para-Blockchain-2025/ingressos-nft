import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'
import TransferTicket from '../TransferTicket'
import type { TicketMetadata } from '../../hooks/useUserTickets'

// Mock the hooks
vi.mock('../../hooks/useWallet', () => ({
  useWallet: vi.fn(() => ({
    address: '0x1234567890123456789012345678901234567890',
    isConnected: true,
  })),
}))

vi.mock('../../hooks/useIngressosContract', () => ({
  useIngressosContract: vi.fn(() => ({
    transferTicket: vi.fn(),
  })),
}))

vi.mock('../../hooks/useTransactionHandler', () => ({
  useTransactionHandler: vi.fn(() => ({
    executeTransaction: vi.fn(),
    isExecuting: false,
    executionError: null,
    transaction: { hash: null, receipt: null },
    isPending: false,
    isConfirming: false,
    isConfirmed: false,
    isFailed: false,
    getStatusMessage: vi.fn(() => 'Ready'),
    getStatusColor: vi.fn(() => 'blue'),
    resetTransaction: vi.fn(),
  })),
}))

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

describe('TransferTicket', () => {
  it('should render transfer form initially', () => {
    render(<TransferTicket ticket={mockTicket} />)

    expect(screen.getByText('Transfer Ticket')).toBeInTheDocument()
    expect(screen.getByText('Transfer your ticket to another wallet address')).toBeInTheDocument()
    expect(screen.getByText('Test Event')).toBeInTheDocument()
    expect(screen.getByText('#1')).toBeInTheDocument()
    expect(screen.getByLabelText('Recipient Address *')).toBeInTheDocument()
    expect(screen.getByText('Continue')).toBeInTheDocument()
    expect(screen.getByText('Cancel')).toBeInTheDocument()
  })

  it('should validate recipient address', async () => {
    render(<TransferTicket ticket={mockTicket} />)

    const addressInput = screen.getByLabelText('Recipient Address *')
    const continueButton = screen.getByText('Continue')

    // Test empty address
    fireEvent.click(continueButton)
    expect(continueButton).toBeDisabled()

    // Test invalid address format
    fireEvent.change(addressInput, { target: { value: 'invalid' } })
    await waitFor(() => {
      expect(screen.getByText('Address must start with 0x')).toBeInTheDocument()
    })

    // Test short address
    fireEvent.change(addressInput, { target: { value: '0x123' } })
    await waitFor(() => {
      expect(screen.getByText('Address must be 42 characters long')).toBeInTheDocument()
    })

    // Test invalid characters
    fireEvent.change(addressInput, { target: { value: '0x123456789012345678901234567890123456789g' } })
    await waitFor(() => {
      expect(screen.getByText('Invalid address format')).toBeInTheDocument()
    })

    // Test self-transfer
    fireEvent.change(addressInput, { target: { value: '0x1234567890123456789012345678901234567890' } })
    await waitFor(() => {
      expect(screen.getByText('Cannot transfer to yourself')).toBeInTheDocument()
    })

    // Test valid address
    fireEvent.change(addressInput, { target: { value: '0xabcdefabcdefabcdefabcdefabcdefabcdefabcd' } })
    await waitFor(() => {
      expect(screen.queryByText(/Address must/)).not.toBeInTheDocument()
      expect(continueButton).not.toBeDisabled()
    })
  })

  it('should proceed to confirmation step with valid address', async () => {
    render(<TransferTicket ticket={mockTicket} />)

    const addressInput = screen.getByLabelText('Recipient Address *')
    const continueButton = screen.getByText('Continue')

    fireEvent.change(addressInput, { target: { value: '0xabcdefabcdefabcdefabcdefabcdefabcdefabcd' } })
    fireEvent.click(continueButton)

    await waitFor(() => {
      expect(screen.getByText('Confirm Transfer')).toBeInTheDocument()
      expect(screen.getByText('Please review the transfer details before confirming')).toBeInTheDocument()
      expect(screen.getByText('0xabcdefabcdefabcdefabcdefabcdefabcdefabcd')).toBeInTheDocument()
      expect(screen.getByText('Confirm Transfer')).toBeInTheDocument()
      expect(screen.getByText('Back')).toBeInTheDocument()
    })
  })

  it('should go back to form from confirmation', async () => {
    render(<TransferTicket ticket={mockTicket} />)

    const addressInput = screen.getByLabelText('Recipient Address *')
    fireEvent.change(addressInput, { target: { value: '0xabcdefabcdefabcdefabcdefabcdefabcdefabcd' } })
    fireEvent.click(screen.getByText('Continue'))

    await waitFor(() => {
      expect(screen.getByText('Confirm Transfer')).toBeInTheDocument()
    })

    fireEvent.click(screen.getByText('Back'))

    await waitFor(() => {
      expect(screen.getByText('Transfer Ticket')).toBeInTheDocument()
      expect(screen.getByLabelText('Recipient Address *')).toHaveValue('0xabcdefabcdefabcdefabcdefabcdefabcdefabcd')
    })
  })

  it('should call onCancel when cancel button is clicked', () => {
    const mockOnCancel = vi.fn()
    render(<TransferTicket ticket={mockTicket} onCancel={mockOnCancel} />)

    fireEvent.click(screen.getByText('Cancel'))
    expect(mockOnCancel).toHaveBeenCalled()
  })

  it('should show warning message in confirmation step', async () => {
    render(<TransferTicket ticket={mockTicket} />)

    const addressInput = screen.getByLabelText('Recipient Address *')
    fireEvent.change(addressInput, { target: { value: '0xabcdefabcdefabcdefabcdefabcdefabcdefabcd' } })
    fireEvent.click(screen.getByText('Continue'))

    await waitFor(() => {
      expect(screen.getByText('Important Notice')).toBeInTheDocument()
      expect(screen.getByText(/This transfer is permanent and cannot be undone/)).toBeInTheDocument()
    })
  })

  it('should display ticket details correctly', () => {
    render(<TransferTicket ticket={mockTicket} />)

    expect(screen.getByText('Test Event')).toBeInTheDocument()
    expect(screen.getByText('#1')).toBeInTheDocument()
    expect(screen.getByText('1')).toBeInTheDocument() // Token ID
  })

  it('should handle address input changes', async () => {
    render(<TransferTicket ticket={mockTicket} />)

    const addressInput = screen.getByLabelText('Recipient Address *')
    
    fireEvent.change(addressInput, { target: { value: '0xtest' } })
    expect(addressInput).toHaveValue('0xtest')

    fireEvent.change(addressInput, { target: { value: '  0xabcdef  ' } })
    expect(addressInput).toHaveValue('0xabcdef') // Should trim whitespace
  })

  it('should disable continue button when wallet not connected', () => {
    const mockUseWallet = vi.fn(() => ({
      address: null,
      isConnected: false,
    }))
    
    vi.doMock('../../hooks/useWallet', () => ({
      useWallet: mockUseWallet,
    }))

    render(<TransferTicket ticket={mockTicket} />)

    const continueButton = screen.getByText('Continue')
    expect(continueButton).toBeDisabled()
  })
})