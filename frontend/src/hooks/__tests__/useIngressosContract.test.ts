import { renderHook } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { useIngressosContract } from '../useIngressosContract'

// Mock wagmi hooks
const mockWriteContractAsync = vi.fn()

vi.mock('wagmi', () => ({
  useReadContract: vi.fn(() => ({
    data: null,
    error: null,
    isLoading: false,
  })),
  useWriteContract: vi.fn(() => ({
    writeContractAsync: mockWriteContractAsync,
    isPending: false,
    error: null,
  })),
  useChainId: vi.fn(() => 31337), // Hardhat local
  useWaitForTransactionReceipt: vi.fn(),
}))

// Mock contract configuration
vi.mock('../../contracts', () => ({
  INGRESSOS_ABI: [],
  INGRESSOS_CONTRACT_ADDRESS: {
    31337: '0x1234567890123456789012345678901234567890',
  },
  EVENT_STATUS: {
    ACTIVE: 0,
    PAUSED: 1,
    CANCELLED: 2,
    COMPLETED: 3,
  },
}))

describe('useIngressosContract', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should return contract address for supported chain', () => {
    const { result } = renderHook(() => useIngressosContract())

    expect(result.current.contractAddress).toBe('0x1234567890123456789012345678901234567890')
    expect(result.current.isContractReady).toBe(true)
  })

  it('should format and parse prices correctly', () => {
    const { result } = renderHook(() => useIngressosContract())

    const price = BigInt('1000000000000000000') // 1 ETH in wei
    const formatted = result.current.formatPrice(price)
    expect(formatted).toBe('1')

    const parsed = result.current.parsePrice('1')
    expect(parsed).toBe(BigInt('1000000000000000000'))
  })

  it('should get event status names correctly', () => {
    const { result } = renderHook(() => useIngressosContract())

    expect(result.current.getEventStatusName(0)).toBe('Active')
    expect(result.current.getEventStatusName(1)).toBe('Paused')
    expect(result.current.getEventStatusName(2)).toBe('Cancelled')
    expect(result.current.getEventStatusName(3)).toBe('Completed')
    expect(result.current.getEventStatusName(999)).toBe('Unknown')
  })

  it('should call createEvent with correct parameters', async () => {
    mockWriteContractAsync.mockResolvedValue('0xhash123')
    
    const { result } = renderHook(() => useIngressosContract())

    const eventParams = {
      name: 'Test Event',
      description: 'Test Description',
      date: new Date('2024-12-31'),
      venue: 'Test Venue',
      ticketPrice: '0.1',
      maxSupply: 100,
    }

    await result.current.createEvent(eventParams)

    expect(mockWriteContractAsync).toHaveBeenCalledWith({
      address: '0x1234567890123456789012345678901234567890',
      abi: [],
      functionName: 'createEvent',
      args: [
        'Test Event',
        'Test Description',
        BigInt(Math.floor(eventParams.date.getTime() / 1000)),
        'Test Venue',
        BigInt('100000000000000000'), // 0.1 ETH in wei
        BigInt(100),
      ],
    })
  })

  it('should call purchaseTicket with correct parameters', async () => {
    mockWriteContractAsync.mockResolvedValue('0xhash123')
    
    const { result } = renderHook(() => useIngressosContract())

    await result.current.purchaseTicket(1, '0.1')

    expect(mockWriteContractAsync).toHaveBeenCalledWith({
      address: '0x1234567890123456789012345678901234567890',
      abi: [],
      functionName: 'purchaseTicket',
      args: [BigInt(1)],
      value: BigInt('100000000000000000'), // 0.1 ETH in wei
    })
  })

  it('should throw error when contract not ready', async () => {
    // Mock unsupported chain
    const { useChainId } = await import('wagmi')
    vi.mocked(useChainId).mockReturnValue(999)
    
    const { result } = renderHook(() => useIngressosContract())

    expect(result.current.isContractReady).toBe(false)

    await expect(result.current.createEvent({
      name: 'Test',
      description: 'Test',
      date: new Date(),
      venue: 'Test',
      ticketPrice: '0.1',
      maxSupply: 100,
    })).rejects.toThrow('Contract not ready')
  })

  it('should handle role management functions', async () => {
    // Ensure we're on a supported chain
    const { useChainId } = await import('wagmi')
    vi.mocked(useChainId).mockReturnValue(31337)
    
    mockWriteContractAsync.mockResolvedValue('0xhash123')
    
    const { result } = renderHook(() => useIngressosContract())
    const testAddress = '0x1234567890123456789012345678901234567890'

    await result.current.grantOrganizerRole(testAddress)
    expect(mockWriteContractAsync).toHaveBeenCalledWith({
      address: '0x1234567890123456789012345678901234567890',
      abi: [],
      functionName: 'grantOrganizerRole',
      args: [testAddress],
    })

    await result.current.revokeOrganizerRole(testAddress)
    expect(mockWriteContractAsync).toHaveBeenCalledWith({
      address: '0x1234567890123456789012345678901234567890',
      abi: [],
      functionName: 'revokeOrganizerRole',
      args: [testAddress],
    })
  })
})