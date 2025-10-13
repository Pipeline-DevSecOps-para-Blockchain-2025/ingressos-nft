import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { EventListenerService } from '../EventListenerService'
import type { ContractEventData, EventCallback } from '../EventListenerService'

// Mock viem
vi.mock('viem', () => ({
  createPublicClient: vi.fn(),
  http: vi.fn(),
  decodeEventLog: vi.fn(),
}))

// Mock chains
vi.mock('viem/chains', () => ({
  mainnet: { id: 1, name: 'Ethereum' },
  sepolia: { id: 11155111, name: 'Sepolia' },
  hardhat: { id: 31337, name: 'Hardhat' },
}))

describe('EventListenerService', () => {
  let eventListener: EventListenerService
  let mockClient: any
  let mockCreatePublicClient: any
  let mockDecodeEventLog: any
  const mockChainId = 11155111 // Sepolia

  beforeEach(() => {
    vi.clearAllMocks()

    // Get mocked functions
    const viem = await import('viem')
    mockCreatePublicClient = viem.createPublicClient as any
    mockDecodeEventLog = viem.decodeEventLog as any

    // Mock the client
    mockClient = {
      getBlockNumber: vi.fn().mockResolvedValue(BigInt(1000)),
      getLogs: vi.fn().mockResolvedValue([]),
    }

    // Mock createPublicClient to return our mock client
    mockCreatePublicClient.mockReturnValue(mockClient)

    eventListener = new EventListenerService(mockChainId)
  })

  afterEach(() => {
    if (eventListener) {
      eventListener.destroy()
    }
  })

  describe('constructor', () => {
    it('should create EventListenerService instance with valid chain ID', () => {
      expect(eventListener).toBeInstanceOf(EventListenerService)
      expect(eventListener.getConfig().chainId).toBe(mockChainId)
    })

    it('should throw error for unsupported chain ID', () => {
      expect(() => new EventListenerService(999)).toThrow('Unsupported chain ID: 999')
    })

    it('should throw error for chain without deployed contract', () => {
      expect(() => new EventListenerService(1)).toThrow('Contract not deployed on chain 1')
    })
  })

  describe('addEventListener', () => {
    it('should add event listener and start listening', async () => {
      const callback = vi.fn()
      const listenerId = 'test-listener'

      eventListener.addEventListener(listenerId, callback)

      expect(eventListener.getListenerCount()).toBe(1)
      expect(eventListener.isCurrentlyListening()).toBe(true)
    })

    it('should add multiple listeners', () => {
      const callback1 = vi.fn()
      const callback2 = vi.fn()

      eventListener.addEventListener('listener1', callback1)
      eventListener.addEventListener('listener2', callback2)

      expect(eventListener.getListenerCount()).toBe(2)
    })

    it('should filter events based on organizer address', () => {
      const callback = vi.fn()
      const organizerAddress = '0x1234567890123456789012345678901234567890' as `0x${string}`

      eventListener.addEventListener('test-listener', callback, {
        organizerAddress,
      })

      expect(eventListener.getListenerCount()).toBe(1)
    })
  })

  describe('removeEventListener', () => {
    it('should remove event listener', () => {
      const callback = vi.fn()
      eventListener.addEventListener('test-listener', callback)

      expect(eventListener.getListenerCount()).toBe(1)

      eventListener.removeEventListener('test-listener')

      expect(eventListener.getListenerCount()).toBe(0)
      expect(eventListener.isCurrentlyListening()).toBe(false)
    })

    it('should not affect other listeners when removing one', () => {
      const callback1 = vi.fn()
      const callback2 = vi.fn()

      eventListener.addEventListener('listener1', callback1)
      eventListener.addEventListener('listener2', callback2)

      eventListener.removeEventListener('listener1')

      expect(eventListener.getListenerCount()).toBe(1)
      expect(eventListener.isCurrentlyListening()).toBe(true)
    })
  })

  describe('polling', () => {
    it('should poll for events when listeners are active', async () => {
      const callback = vi.fn()
      eventListener.addEventListener('test-listener', callback)

      // Trigger manual poll
      await eventListener.triggerPoll()

      expect(mockClient.getBlockNumber).toHaveBeenCalled()
      expect(mockClient.getLogs).toHaveBeenCalled()
    })

    it('should not poll when no listeners are active', async () => {
      // No listeners added
      await eventListener.triggerPoll()

      // Should not poll if not listening
      expect(mockClient.getBlockNumber).not.toHaveBeenCalled()
    })

    it('should handle polling errors gracefully', async () => {
      const callback = vi.fn()
      eventListener.addEventListener('test-listener', callback)

      // Mock error
      mockClient.getBlockNumber.mockRejectedValue(new Error('Network error'))

      // Should not throw
      await expect(eventListener.triggerPoll()).resolves.toBeUndefined()
    })
  })

  describe('event parsing', () => {
    it('should parse EventCreated events correctly', async () => {
      // Mock decoded event
      mockDecodeEventLog.mockReturnValue({
        eventName: 'EventCreated',
        args: {
          eventId: BigInt(1),
          name: 'Test Event',
          organizer: '0x1234567890123456789012345678901234567890',
          ticketPrice: BigInt('1000000000000000000'),
          maxSupply: BigInt(100),
        }
      })

      // Mock log
      const mockLog = {
        topics: ['0x123', '0x456'],
        data: '0x789',
        blockNumber: BigInt(1000),
        logIndex: BigInt(0),
      }

      mockClient.getLogs.mockResolvedValue([mockLog])

      const callback = vi.fn()
      eventListener.addEventListener('test-listener', callback)

      await eventListener.triggerPoll()

      expect(callback).toHaveBeenCalledWith({
        type: 'EventCreated',
        data: {
          eventId: BigInt(1),
          name: 'Test Event',
          organizer: '0x1234567890123456789012345678901234567890',
          ticketPrice: BigInt('1000000000000000000'),
          maxSupply: BigInt(100),
        }
      })
    })

    it('should parse TicketPurchased events correctly', async () => {
      mockDecodeEventLog.mockReturnValue({
        eventName: 'TicketPurchased',
        args: {
          tokenId: BigInt(1),
          eventId: BigInt(1),
          buyer: '0x1234567890123456789012345678901234567890',
          ticketNumber: BigInt(1),
          price: BigInt('1000000000000000000'),
        }
      })

      const mockLog = {
        topics: ['0x123', '0x456'],
        data: '0x789',
        blockNumber: BigInt(1000),
        logIndex: BigInt(0),
      }

      mockClient.getLogs.mockResolvedValue([mockLog])

      const callback = vi.fn()
      eventListener.addEventListener('test-listener', callback)

      await eventListener.triggerPoll()

      expect(callback).toHaveBeenCalledWith({
        type: 'TicketPurchased',
        data: {
          tokenId: BigInt(1),
          eventId: BigInt(1),
          buyer: '0x1234567890123456789012345678901234567890',
          ticketNumber: BigInt(1),
          price: BigInt('1000000000000000000'),
        }
      })
    })

    it('should handle parsing errors gracefully', async () => {
      // Mock parsing error
      mockDecodeEventLog.mockImplementation(() => {
        throw new Error('Parsing error')
      })

      const mockLog = {
        topics: ['0x123', '0x456'],
        data: '0x789',
        blockNumber: BigInt(1000),
        logIndex: BigInt(0),
      }

      mockClient.getLogs.mockResolvedValue([mockLog])

      const callback = vi.fn()
      eventListener.addEventListener('test-listener', callback)

      // Should not throw
      await expect(eventListener.triggerPoll()).resolves.toBeUndefined()

      // Callback should not be called due to parsing error
      expect(callback).not.toHaveBeenCalled()
    })
  })

  describe('filtering', () => {
    it('should filter events by event types', async () => {
      // Mock EventCreated event
      mockDecodeEventLog.mockReturnValue({
        eventName: 'EventCreated',
        args: {
          eventId: BigInt(1),
          name: 'Test Event',
          organizer: '0x1234567890123456789012345678901234567890',
          ticketPrice: BigInt('1000000000000000000'),
          maxSupply: BigInt(100),
        }
      })

      const mockLog = {
        topics: ['0x123', '0x456'],
        data: '0x789',
        blockNumber: BigInt(1000),
        logIndex: BigInt(0),
      }

      mockClient.getLogs.mockResolvedValue([mockLog])

      const callback = vi.fn()

      // Only listen to TicketPurchased events
      eventListener.addEventListener('test-listener', callback, {
        eventTypes: ['TicketPurchased']
      })

      await eventListener.triggerPoll()

      // Should not call callback since we filtered out EventCreated
      expect(callback).not.toHaveBeenCalled()
    })

    it('should filter events by organizer address', async () => {
      mockDecodeEventLog.mockReturnValue({
        eventName: 'EventCreated',
        args: {
          eventId: BigInt(1),
          name: 'Test Event',
          organizer: '0x1234567890123456789012345678901234567890',
          ticketPrice: BigInt('1000000000000000000'),
          maxSupply: BigInt(100),
        }
      })

      const mockLog = {
        topics: ['0x123', '0x456'],
        data: '0x789',
        blockNumber: BigInt(1000),
        logIndex: BigInt(0),
      }

      mockClient.getLogs.mockResolvedValue([mockLog])

      const callback = vi.fn()

      // Filter by different organizer
      eventListener.addEventListener('test-listener', callback, {
        organizerAddress: '0x9876543210987654321098765432109876543210' as `0x${string}`
      })

      await eventListener.triggerPoll()

      // Should not call callback due to organizer filter
      expect(callback).not.toHaveBeenCalled()
    })
  })

  describe('configuration', () => {
    it('should update polling interval', () => {
      const newInterval = 10000
      eventListener.updatePollingInterval(newInterval)

      expect(eventListener.getConfig().pollingInterval).toBe(newInterval)
    })

    it('should set starting block', () => {
      const startBlock = BigInt(500)
      eventListener.setStartingBlock(startBlock)

      expect(eventListener.getLastProcessedBlock()).toBe(startBlock)
    })

    it('should return correct configuration', () => {
      const config = eventListener.getConfig()

      expect(config.chainId).toBe(mockChainId)
      expect(config.contractAddress).toBeDefined()
      expect(config.pollingInterval).toBeDefined()
    })
  })

  describe('cleanup', () => {
    it('should clean up resources on destroy', () => {
      const callback = vi.fn()
      eventListener.addEventListener('test-listener', callback)

      expect(eventListener.isCurrentlyListening()).toBe(true)

      eventListener.destroy()

      expect(eventListener.isCurrentlyListening()).toBe(false)
      expect(eventListener.getListenerCount()).toBe(0)
    })
  })
})
