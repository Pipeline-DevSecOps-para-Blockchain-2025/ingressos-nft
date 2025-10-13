import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { EventCache, CacheKeyBuilder, EventCacheUtils } from '../EventCache'
import type { OrganizerEventWithStats } from '../../hooks/useOrganizerEvents'

// Mock localStorage
const localStorageMock = {
  getItem: vi.fn(),
  setItem: vi.fn(),
  removeItem: vi.fn(),
  clear: vi.fn(),
  length: 0,
  key: vi.fn(),
}

Object.defineProperty(window, 'localStorage', {
  value: localStorageMock,
})

describe('EventCache', () => {
  let cache: EventCache

  beforeEach(() => {
    vi.clearAllMocks()
    localStorageMock.getItem.mockReturnValue(null)
    localStorageMock.length = 0

    cache = new EventCache({
      defaultTtl: 5000, // 5 seconds for testing
      maxSize: 10,
      enablePersistence: true,
      storagePrefix: 'test-cache',
      cleanupInterval: 1000,
    })
  })

  afterEach(() => {
    cache.destroy()
  })

  describe('basic operations', () => {
    it('should set and get cache entries', () => {
      const key = 'test-key'
      const data = { id: 1, name: 'Test Event' }

      cache.set(key, data)
      const result = cache.get(key)

      expect(result).toEqual(data)
    })

    it('should return null for non-existent keys', () => {
      const result = cache.get('non-existent-key')
      expect(result).toBeNull()
    })

    it('should check if key exists', () => {
      const key = 'test-key'
      const data = { id: 1, name: 'Test Event' }

      expect(cache.has(key)).toBe(false)

      cache.set(key, data)
      expect(cache.has(key)).toBe(true)
    })

    it('should delete cache entries', () => {
      const key = 'test-key'
      const data = { id: 1, name: 'Test Event' }

      cache.set(key, data)
      expect(cache.has(key)).toBe(true)

      const deleted = cache.delete(key)
      expect(deleted).toBe(true)
      expect(cache.has(key)).toBe(false)
    })

    it('should clear all cache entries', () => {
      cache.set('key1', { data: 1 })
      cache.set('key2', { data: 2 })

      expect(cache.getStats().size).toBe(2)

      cache.clear()
      expect(cache.getStats().size).toBe(0)
    })
  })

  describe('TTL and expiration', () => {
    it('should respect TTL and expire entries', async () => {
      const key = 'test-key'
      const data = { id: 1, name: 'Test Event' }

      cache.set(key, data, { ttl: 100 }) // 100ms TTL
      expect(cache.get(key)).toEqual(data)

      // Wait for expiration
      await new Promise(resolve => setTimeout(resolve, 150))

      expect(cache.get(key)).toBeNull()
    })

    it('should use default TTL when not specified', () => {
      const key = 'test-key'
      const data = { id: 1, name: 'Test Event' }

      cache.set(key, data)
      const entries = cache.getEntries()
      const entry = entries.find(e => e.key === key)

      expect(entry?.entry.ttl).toBe(5000) // Default TTL from config
    })

    it('should cleanup expired entries', async () => {
      cache.set('key1', { data: 1 }, { ttl: 50 })
      cache.set('key2', { data: 2 }, { ttl: 5000 })

      expect(cache.getStats().size).toBe(2)

      // Wait for first entry to expire
      await new Promise(resolve => setTimeout(resolve, 100))

      const cleanedCount = cache.cleanup()
      expect(cleanedCount).toBe(1)
      expect(cache.getStats().size).toBe(1)
      expect(cache.has('key2')).toBe(true)
    })
  })

  describe('cache invalidation', () => {
    it('should invalidate by specific keys', () => {
      cache.set('key1', { data: 1 }, { tags: ['tag1'] })
      cache.set('key2', { data: 2 }, { tags: ['tag2'] })
      cache.set('key3', { data: 3 }, { tags: ['tag1'] })

      const invalidatedCount = cache.invalidate({ keys: ['key1', 'key3'] })

      expect(invalidatedCount).toBe(2)
      expect(cache.has('key1')).toBe(false)
      expect(cache.has('key2')).toBe(true)
      expect(cache.has('key3')).toBe(false)
    })

    it('should invalidate by tags', () => {
      cache.set('key1', { data: 1 }, { tags: ['events', 'organizer1'] })
      cache.set('key2', { data: 2 }, { tags: ['events', 'organizer2'] })
      cache.set('key3', { data: 3 }, { tags: ['stats'] })

      const invalidatedCount = cache.invalidate({ tags: ['events'] })

      expect(invalidatedCount).toBe(2)
      expect(cache.has('key1')).toBe(false)
      expect(cache.has('key2')).toBe(false)
      expect(cache.has('key3')).toBe(true)
    })

    it('should invalidate by pattern', () => {
      cache.set('events:1:details', { data: 1 })
      cache.set('events:2:details', { data: 2 })
      cache.set('stats:1:revenue', { data: 3 })

      const pattern = /^events:/
      const invalidatedCount = cache.invalidate({ pattern })

      expect(invalidatedCount).toBe(2)
      expect(cache.has('events:1:details')).toBe(false)
      expect(cache.has('events:2:details')).toBe(false)
      expect(cache.has('stats:1:revenue')).toBe(true)
    })

    it('should invalidate by timestamp', () => {
      const now = Date.now()

      cache.set('old-key', { data: 1 })

      // Manually modify the timestamp by accessing the internal cache
      const memoryCache = (cache as any).memoryCache
      const oldEntry = memoryCache.get('old-key')
      if (oldEntry) {
        oldEntry.timestamp = now - 10000 // 10 seconds ago
      }

      cache.set('new-key', { data: 2 })

      const invalidatedCount = cache.invalidate({ olderThan: now - 5000 })

      expect(invalidatedCount).toBe(1)
      expect(cache.has('old-key')).toBe(false)
      expect(cache.has('new-key')).toBe(true)
    })
  })

  describe('size management', () => {
    it('should enforce maximum size with LRU eviction', () => {
      // Fill cache to max size
      for (let i = 0; i < 10; i++) {
        cache.set(`key${i}`, { data: i })
      }

      expect(cache.getStats().size).toBe(10)

      // Add one more item to trigger eviction
      cache.set('key10', { data: 10 })

      expect(cache.getStats().size).toBe(10)
      expect(cache.has('key0')).toBe(false) // Oldest should be evicted
      expect(cache.has('key10')).toBe(true) // Newest should be present
    })

    it('should update access time when getting items', () => {
      // Fill cache to near capacity
      for (let i = 0; i < 9; i++) {
        cache.set(`key${i}`, { data: i })
      }

      // Access key0 to update its access time
      cache.get('key0')

      // Add one more item to trigger eviction
      cache.set('key9', { data: 9 })

      // key0 should still be present due to recent access
      // key1 should be evicted as it's the least recently used
      expect(cache.has('key0')).toBe(true)
      expect(cache.has('key1')).toBe(false)
    })
  })

  describe('statistics', () => {
    it('should track cache hits and misses', () => {
      cache.set('key1', { data: 1 })

      // Hit
      cache.get('key1')

      // Miss
      cache.get('non-existent')

      const stats = cache.getStats()
      expect(stats.hits).toBe(1)
      expect(stats.misses).toBe(1)
      expect(stats.hitRate).toBe(0.5)
    })

    it('should track cache size', () => {
      expect(cache.getStats().size).toBe(0)

      cache.set('key1', { data: 1 })
      cache.set('key2', { data: 2 })

      expect(cache.getStats().size).toBe(2)
    })

    it('should estimate memory usage', () => {
      const initialUsage = cache.getStats().memoryUsage

      cache.set('key1', { data: 'some data' })

      const newUsage = cache.getStats().memoryUsage
      expect(newUsage).toBeGreaterThan(initialUsage)
    })
  })

  describe('persistence', () => {
    it('should save to localStorage when persistence is enabled', () => {
      cache.set('test-key', { data: 'test' })

      expect(localStorageMock.setItem).toHaveBeenCalledWith(
        'test-cache:test-key',
        expect.stringContaining('"data":"test"')
      )
    })

    it('should load from localStorage on initialization', () => {
      const cacheData = {
        data: { id: 1, name: 'Test' },
        timestamp: Date.now(),
        ttl: 10000,
        key: 'test-key',
        tags: [],
        accessCount: 0,
        lastAccessed: Date.now(),
      }

      localStorageMock.getItem.mockReturnValue(JSON.stringify(cacheData))
      localStorageMock.length = 1
      localStorageMock.key.mockReturnValue('test-cache:test-key')

      const newCache = new EventCache({
        enablePersistence: true,
        storagePrefix: 'test-cache',
      })

      expect(newCache.has('test-key')).toBe(true)
      expect(newCache.get('test-key')).toEqual(cacheData.data)

      newCache.destroy()
    })
  })
})

describe('CacheKeyBuilder', () => {
  it('should generate organizer events key', () => {
    const key = CacheKeyBuilder.organizerEvents('0x123', 1)
    expect(key).toBe('organizer:events:1:0x123')
  })

  it('should generate event details key', () => {
    const key = CacheKeyBuilder.eventDetails(1, 11155111)
    expect(key).toBe('events:details:11155111:1')
  })

  it('should generate event stats key', () => {
    const key = CacheKeyBuilder.eventStats(1, 11155111)
    expect(key).toBe('events:stats:11155111:1')
  })

  it('should generate event count key', () => {
    const key = CacheKeyBuilder.eventCount(11155111)
    expect(key).toBe('events:count:11155111')
  })

  it('should generate event list key with filters', () => {
    const filters = { status: 'active', organizer: '0x123' }
    const key = CacheKeyBuilder.eventList(11155111, filters)
    expect(key).toBe('events:list:11155111:organizer:0x123|status:active')
  })

  it('should normalize organizer addresses to lowercase', () => {
    const key1 = CacheKeyBuilder.organizerEvents('0xABC123', 1)
    const key2 = CacheKeyBuilder.organizerEvents('0xabc123', 1)
    expect(key1).toBe(key2)
  })
})

describe('EventCacheUtils', () => {
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
      organizer: '0x123' as `0x${string}`,
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
  })

  it('should cache and retrieve organizer events', () => {
    const organizerAddress = '0x123'
    const chainId = 11155111

    EventCacheUtils.cacheOrganizerEvents(organizerAddress, chainId, mockEvents)
    const cached = EventCacheUtils.getCachedOrganizerEvents(organizerAddress, chainId)

    expect(cached).toEqual(mockEvents)
  })

  it('should return null for non-cached organizer events', () => {
    const cached = EventCacheUtils.getCachedOrganizerEvents('0x456', 11155111)
    expect(cached).toBeNull()
  })

  it('should invalidate organizer events', () => {
    const organizerAddress = '0x123'
    const chainId = 11155111

    EventCacheUtils.cacheOrganizerEvents(organizerAddress, chainId, mockEvents)
    expect(EventCacheUtils.getCachedOrganizerEvents(organizerAddress, chainId)).toEqual(mockEvents)

    EventCacheUtils.invalidateOrganizerEvents(organizerAddress, chainId)
    expect(EventCacheUtils.getCachedOrganizerEvents(organizerAddress, chainId)).toBeNull()
  })

  it('should invalidate chain events', () => {
    const chainId = 11155111

    EventCacheUtils.cacheOrganizerEvents('0x123', chainId, mockEvents)
    EventCacheUtils.cacheOrganizerEvents('0x456', chainId, mockEvents)

    expect(EventCacheUtils.getCachedOrganizerEvents('0x123', chainId)).toEqual(mockEvents)
    expect(EventCacheUtils.getCachedOrganizerEvents('0x456', chainId)).toEqual(mockEvents)

    EventCacheUtils.invalidateChainEvents(chainId)

    expect(EventCacheUtils.getCachedOrganizerEvents('0x123', chainId)).toBeNull()
    expect(EventCacheUtils.getCachedOrganizerEvents('0x456', chainId)).toBeNull()
  })

  it('should get cache statistics', () => {
    const stats = EventCacheUtils.getStats()

    expect(stats).toHaveProperty('hits')
    expect(stats).toHaveProperty('misses')
    expect(stats).toHaveProperty('size')
    expect(stats).toHaveProperty('hitRate')
    expect(stats).toHaveProperty('memoryUsage')
  })
})
