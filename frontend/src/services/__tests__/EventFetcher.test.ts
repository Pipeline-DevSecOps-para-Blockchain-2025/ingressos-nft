import { describe, it, expect, vi, beforeEach } from 'vitest'
import { EventFetcher } from '../EventFetcher'
import { EventFetcherFactory } from '../EventFetcherFactory'

// Mock viem
vi.mock('viem', () => ({
  createPublicClient: vi.fn(() => ({
    readContract: vi.fn()
  })),
  http: vi.fn(),
}))

// Mock chains
vi.mock('viem/chains', () => ({
  mainnet: { id: 1, name: 'Ethereum' },
  sepolia: { id: 11155111, name: 'Sepolia' },
  hardhat: { id: 31337, name: 'Hardhat' },
}))

describe('EventFetcher', () => {
  let eventFetcher: EventFetcher
  const mockChainId = 11155111 // Sepolia

  beforeEach(() => {
    vi.clearAllMocks()
    eventFetcher = new EventFetcher(mockChainId)
  })

  describe('constructor', () => {
    it('should create EventFetcher instance with valid chain ID', () => {
      expect(eventFetcher).toBeInstanceOf(EventFetcher)
      expect(eventFetcher.getConfig().chainId).toBe(mockChainId)
    })

    it('should throw error for unsupported chain ID', () => {
      expect(() => new EventFetcher(999)).toThrow('Contract not deployed on chain 999')
    })

    it('should throw error for chain without deployed contract', () => {
      expect(() => new EventFetcher(1)).toThrow('Contract not deployed on chain 1')
    })
  })

  describe('getEventCount', () => {
    it('should return correct event count', async () => {
      const mockClient = eventFetcher['client']
      mockClient.readContract = vi.fn().mockResolvedValue(BigInt(5))

      const count = await eventFetcher.getEventCount()
      expect(count).toBe(4) // nextEventId - 1
    })

    it('should handle errors gracefully', async () => {
      const mockClient = eventFetcher['client']
      mockClient.readContract = vi.fn().mockRejectedValue(new Error('Network error'))

      await expect(eventFetcher.getEventCount()).rejects.toThrow('Failed to fetch event count from contract')
    })
  })

  describe('fetchEventDetails', () => {
    it('should return event details for valid event ID', async () => {
      const mockEventData = {
        name: 'Test Event',
        description: 'Test Description',
        date: BigInt(1700000000),
        venue: 'Test Venue',
        ticketPrice: BigInt('1000000000000000000'),
        maxSupply: BigInt(100),
        currentSupply: BigInt(50),
        organizer: '0x1234567890123456789012345678901234567890',
        status: 0,
        createdAt: BigInt(1699000000),
      }

      const mockClient = eventFetcher['client']
      mockClient.readContract = vi.fn().mockResolvedValue(mockEventData)

      const result = await eventFetcher.fetchEventDetails(1)

      expect(result).toEqual({
        eventId: 1,
        ...mockEventData,
      })
    })

    it('should return null for non-existent event', async () => {
      const mockClient = eventFetcher['client']
      mockClient.readContract = vi.fn().mockRejectedValue(new Error('Event not found'))

      const result = await eventFetcher.fetchEventDetails(999)
      expect(result).toBeNull()
    })
  })

  describe('fetchEventStats', () => {
    it('should return event statistics', async () => {
      const mockClient = eventFetcher['client']

      // Mock the revenue calls
      mockClient.readContract = vi.fn()
        .mockResolvedValueOnce(BigInt('5000000000000000000')) // totalRevenue
        .mockResolvedValueOnce(BigInt('3000000000000000000')) // availableRevenue
        .mockResolvedValueOnce({ // event details
          name: 'Test Event',
          description: 'Test Description',
          date: BigInt(1700000000),
          venue: 'Test Venue',
          ticketPrice: BigInt('1000000000000000000'),
          maxSupply: BigInt(100),
          currentSupply: BigInt(50),
          organizer: '0x1234567890123456789012345678901234567890',
          status: 0,
          createdAt: BigInt(1699000000),
        })

      const stats = await eventFetcher.fetchEventStats(1)

      expect(stats).toEqual({
        totalRevenue: BigInt('5000000000000000000'),
        withdrawnRevenue: BigInt('2000000000000000000'),
        availableRevenue: BigInt('3000000000000000000'),
        ticketsSold: 50,
        totalTickets: 100,
      })
    })

    it('should return default stats on error', async () => {
      const mockClient = eventFetcher['client']
      mockClient.readContract = vi.fn().mockRejectedValue(new Error('Network error'))

      const stats = await eventFetcher.fetchEventStats(1)

      expect(stats).toEqual({
        totalRevenue: 0n,
        withdrawnRevenue: 0n,
        availableRevenue: 0n,
        ticketsSold: 0,
        totalTickets: 0,
      })
    })
  })

  describe('updateChain', () => {
    it('should update chain configuration', () => {
      const newChainId = 11155111
      eventFetcher.updateChain(newChainId)

      expect(eventFetcher.getConfig().chainId).toBe(newChainId)
    })

    it('should throw error for unsupported chain', () => {
      expect(() => eventFetcher.updateChain(999)).toThrow('Contract not deployed on chain 999')
    })
  })
})

describe('EventFetcherFactory', () => {
  beforeEach(() => {
    EventFetcherFactory.clearAllInstances()
  })

  describe('getInstance', () => {
    it('should create and cache EventFetcher instances', () => {
      const instance1 = EventFetcherFactory.getInstance(11155111)
      const instance2 = EventFetcherFactory.getInstance(11155111)

      expect(instance1).toBe(instance2) // Should return same instance
    })

    it('should throw error for unsupported chain', () => {
      expect(() => EventFetcherFactory.getInstance(999)).toThrow('Unsupported chain ID: 999')
    })
  })

  describe('isChainSupported', () => {
    it('should return true for supported chains', () => {
      expect(EventFetcherFactory.isChainSupported(1)).toBe(true)
      expect(EventFetcherFactory.isChainSupported(11155111)).toBe(true)
      expect(EventFetcherFactory.isChainSupported(31337)).toBe(true)
    })

    it('should return false for unsupported chains', () => {
      expect(EventFetcherFactory.isChainSupported(999)).toBe(false)
    })
  })

  describe('clearInstance', () => {
    it('should clear specific instance', () => {
      const instance1 = EventFetcherFactory.getInstance(11155111)
      EventFetcherFactory.clearInstance(11155111)
      const instance2 = EventFetcherFactory.getInstance(11155111)

      expect(instance1).not.toBe(instance2)
    })
  })
})
