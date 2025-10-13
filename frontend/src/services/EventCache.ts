import type { OrganizerEventWithStats } from '../hooks/useOrganizerEvents'

/**
 * Cache entry with TTL and metadata
 */
export interface CacheEntry<T = any> {
  data: T
  timestamp: number
  ttl: number // Time to live in milliseconds
  key: string
  tags?: string[] // For cache invalidation by tags
  accessCount: number
  lastAccessed: number
}

/**
 * Cache configuration options
 */
export interface CacheConfig {
  defaultTtl: number // Default TTL in milliseconds
  maxSize: number // Maximum number of entries
  enablePersistence: boolean // Enable browser storage persistence
  storagePrefix: string // Prefix for storage keys
  cleanupInterval: number // Cleanup interval in milliseconds
}

/**
 * Cache statistics
 */
export interface CacheStats {
  hits: number
  misses: number
  size: number
  hitRate: number
  memoryUsage: number // Estimated memory usage in bytes
}

/**
 * Cache invalidation options
 */
export interface InvalidationOptions {
  keys?: string[]
  tags?: string[]
  pattern?: RegExp
  olderThan?: number // Timestamp
}

/**
 * Event-specific cache keys and utilities
 */
export class CacheKeyBuilder {
  private static readonly PREFIXES = {
    EVENT_LIST: 'events:list',
    EVENT_DETAILS: 'events:details',
    EVENT_STATS: 'events:stats',
    ORGANIZER_EVENTS: 'organizer:events',
    EVENT_COUNT: 'events:count',
  } as const

  /**
   * Generate cache key for organizer events
   */
  static organizerEvents(organizerAddress: string, chainId: number): string {
    return `${this.PREFIXES.ORGANIZER_EVENTS}:${chainId}:${organizerAddress.toLowerCase()}`
  }

  /**
   * Generate cache key for event details
   */
  static eventDetails(eventId: number, chainId: number): string {
    return `${this.PREFIXES.EVENT_DETAILS}:${chainId}:${eventId}`
  }

  /**
   * Generate cache key for event statistics
   */
  static eventStats(eventId: number, chainId: number): string {
    return `${this.PREFIXES.EVENT_STATS}:${chainId}:${eventId}`
  }

  /**
   * Generate cache key for event count
   */
  static eventCount(chainId: number): string {
    return `${this.PREFIXES.EVENT_COUNT}:${chainId}`
  }

  /**
   * Generate cache key for event list with filters
   */
  static eventList(chainId: number, filters: Record<string, any> = {}): string {
    const filterStr = Object.keys(filters)
      .sort()
      .map(key => `${key}:${filters[key]}`)
      .join('|')
    return `${this.PREFIXES.EVENT_LIST}:${chainId}:${filterStr}`
  }

  /**
   * Get all keys for a specific chain
   */
  static getChainKeys(chainId: number): string[] {
    return Object.values(this.PREFIXES).map(prefix => `${prefix}:${chainId}:*`)
  }

  /**
   * Get all keys for a specific organizer
   */
  static getOrganizerKeys(organizerAddress: string, chainId: number): string[] {
    const addr = organizerAddress.toLowerCase()
    return [
      `${this.PREFIXES.ORGANIZER_EVENTS}:${chainId}:${addr}`,
      `${this.PREFIXES.EVENT_LIST}:${chainId}:*organizer*${addr}*`,
    ]
  }
}

/**
 * Event cache management system with in-memory and browser storage layers
 */
export class EventCache {
  private memoryCache: Map<string, CacheEntry> = new Map()
  private config: CacheConfig
  private stats: CacheStats = {
    hits: 0,
    misses: 0,
    size: 0,
    hitRate: 0,
    memoryUsage: 0,
  }
  private cleanupTimer: NodeJS.Timeout | null = null

  constructor(config: Partial<CacheConfig> = {}) {
    this.config = {
      defaultTtl: 5 * 60 * 1000, // 5 minutes
      maxSize: 1000,
      enablePersistence: true,
      storagePrefix: 'event-cache',
      cleanupInterval: 60 * 1000, // 1 minute
      ...config,
    }

    this.startCleanupTimer()
    this.loadFromStorage()
  }

  /**
   * Get item from cache
   */
  get<T>(key: string): T | null {
    // Check memory cache first
    const memoryEntry = this.memoryCache.get(key)
    if (memoryEntry && !this.isExpired(memoryEntry)) {
      memoryEntry.accessCount++
      memoryEntry.lastAccessed = Date.now()
      this.stats.hits++
      this.updateStats()
      return memoryEntry.data as T
    }

    // Check browser storage if enabled
    if (this.config.enablePersistence) {
      const storageEntry = this.getFromStorage<T>(key)
      if (storageEntry && !this.isExpired(storageEntry)) {
        // Promote to memory cache
        this.memoryCache.set(key, storageEntry)
        storageEntry.accessCount++
        storageEntry.lastAccessed = Date.now()
        this.stats.hits++
        this.updateStats()
        return storageEntry.data as T
      }
    }

    this.stats.misses++
    this.updateStats()
    return null
  }

  /**
   * Set item in cache
   */
  set<T>(key: string, data: T, options: {
    ttl?: number
    tags?: string[]
  } = {}): void {
    const ttl = options.ttl || this.config.defaultTtl
    const entry: CacheEntry<T> = {
      data,
      timestamp: Date.now(),
      ttl,
      key,
      tags: options.tags || [],
      accessCount: 0,
      lastAccessed: Date.now(),
    }

    // Add to memory cache
    this.memoryCache.set(key, entry)

    // Add to browser storage if enabled
    if (this.config.enablePersistence) {
      this.setInStorage(key, entry)
    }

    // Enforce size limit
    this.enforceSizeLimit()
    this.updateStats()
  }

  /**
   * Delete item from cache
   */
  delete(key: string): boolean {
    const deleted = this.memoryCache.delete(key)

    if (this.config.enablePersistence) {
      this.deleteFromStorage(key)
    }

    this.updateStats()
    return deleted
  }

  /**
   * Check if item exists in cache
   */
  has(key: string): boolean {
    const memoryEntry = this.memoryCache.get(key)
    if (memoryEntry && !this.isExpired(memoryEntry)) {
      return true
    }

    if (this.config.enablePersistence) {
      const storageEntry = this.getFromStorage(key)
      return storageEntry !== null && !this.isExpired(storageEntry)
    }

    return false
  }

  /**
   * Clear all cache entries
   */
  clear(): void {
    this.memoryCache.clear()

    if (this.config.enablePersistence) {
      this.clearStorage()
    }

    this.stats = {
      hits: 0,
      misses: 0,
      size: 0,
      hitRate: 0,
      memoryUsage: 0,
    }
  }

  /**
   * Invalidate cache entries based on options
   */
  invalidate(options: InvalidationOptions): number {
    let invalidatedCount = 0

    // Collect keys to invalidate
    const keysToInvalidate = new Set<string>()

    // Add specific keys
    if (options.keys) {
      options.keys.forEach(key => keysToInvalidate.add(key))
    }

    // Add keys by tags
    if (options.tags) {
      for (const [key, entry] of this.memoryCache) {
        if (entry.tags && entry.tags.some(tag => options.tags!.includes(tag))) {
          keysToInvalidate.add(key)
        }
      }
    }

    // Add keys by pattern
    if (options.pattern) {
      for (const key of this.memoryCache.keys()) {
        if (options.pattern.test(key)) {
          keysToInvalidate.add(key)
        }
      }
    }

    // Add keys older than timestamp
    if (options.olderThan) {
      for (const [key, entry] of this.memoryCache) {
        if (entry.timestamp < options.olderThan) {
          keysToInvalidate.add(key)
        }
      }
    }

    // Delete collected keys
    for (const key of keysToInvalidate) {
      if (this.delete(key)) {
        invalidatedCount++
      }
    }

    return invalidatedCount
  }

  /**
   * Invalidate cache entries for a specific chain
   */
  invalidateChain(chainId: number): number {
    const pattern = new RegExp(`:${chainId}:`)
    return this.invalidate({ pattern })
  }

  /**
   * Invalidate cache entries for a specific organizer
   */
  invalidateOrganizer(organizerAddress: string, chainId: number): number {
    const keys = CacheKeyBuilder.getOrganizerKeys(organizerAddress, chainId)
    const patterns = keys.map(key => new RegExp(key.replace('*', '.*')))

    let invalidatedCount = 0
    for (const pattern of patterns) {
      invalidatedCount += this.invalidate({ pattern })
    }

    return invalidatedCount
  }

  /**
   * Get cache statistics
   */
  getStats(): CacheStats {
    return { ...this.stats }
  }

  /**
   * Get all cache keys
   */
  getKeys(): string[] {
    return Array.from(this.memoryCache.keys())
  }

  /**
   * Get cache entries (for debugging)
   */
  getEntries(): Array<{ key: string; entry: CacheEntry }> {
    return Array.from(this.memoryCache.entries()).map(([key, entry]) => ({
      key,
      entry: { ...entry },
    }))
  }

  /**
   * Cleanup expired entries
   */
  cleanup(): number {
    let cleanedCount = 0
    const now = Date.now()

    for (const [key, entry] of this.memoryCache) {
      if (this.isExpired(entry)) {
        this.memoryCache.delete(key)
        cleanedCount++
      }
    }

    // Cleanup storage
    if (this.config.enablePersistence) {
      cleanedCount += this.cleanupStorage()
    }

    this.updateStats()
    return cleanedCount
  }

  /**
   * Destroy cache and cleanup resources
   */
  destroy(): void {
    if (this.cleanupTimer) {
      clearInterval(this.cleanupTimer)
      this.cleanupTimer = null
    }
    this.clear()
  }

  /**
   * Check if cache entry is expired
   */
  private isExpired(entry: CacheEntry): boolean {
    return Date.now() > entry.timestamp + entry.ttl
  }

  /**
   * Start cleanup timer
   */
  private startCleanupTimer(): void {
    this.cleanupTimer = setInterval(() => {
      this.cleanup()
    }, this.config.cleanupInterval)
  }

  /**
   * Enforce cache size limit using LRU eviction
   */
  private enforceSizeLimit(): void {
    if (this.memoryCache.size <= this.config.maxSize) {
      return
    }

    // Sort by last accessed time (LRU)
    const entries = Array.from(this.memoryCache.entries())
      .sort(([, a], [, b]) => a.lastAccessed - b.lastAccessed)

    // Remove oldest entries
    const toRemove = this.memoryCache.size - this.config.maxSize
    for (let i = 0; i < toRemove; i++) {
      const [key] = entries[i]
      this.memoryCache.delete(key)
      if (this.config.enablePersistence) {
        this.deleteFromStorage(key)
      }
    }
  }

  /**
   * Update cache statistics
   */
  private updateStats(): void {
    this.stats.size = this.memoryCache.size
    this.stats.hitRate = this.stats.hits / (this.stats.hits + this.stats.misses) || 0
    this.stats.memoryUsage = this.estimateMemoryUsage()
  }

  /**
   * Estimate memory usage
   */
  private estimateMemoryUsage(): number {
    let usage = 0
    for (const [key, entry] of this.memoryCache) {
      usage += key.length * 2 // UTF-16 characters
      try {
        usage += JSON.stringify(entry.data, this.bigIntReplacer).length * 2
      } catch {
        usage += 1000 // Fallback estimate for non-serializable data
      }
      usage += 100 // Overhead for entry metadata
    }
    return usage
  }

  /**
   * Get storage key with prefix
   */
  private getStorageKey(key: string): string {
    return `${this.config.storagePrefix}:${key}`
  }

  /**
   * Get item from browser storage
   */
  private getFromStorage<T>(key: string): CacheEntry<T> | null {
    try {
      const storageKey = this.getStorageKey(key)
      const item = localStorage.getItem(storageKey)
      if (!item) return null

      const entry = JSON.parse(item, this.bigIntReviver) as CacheEntry<T>
      return entry
    } catch (error) {
      console.warn('Failed to get item from storage:', error)
      return null
    }
  }

  /**
   * Set item in browser storage
   */
  private setInStorage<T>(key: string, entry: CacheEntry<T>): void {
    try {
      const storageKey = this.getStorageKey(key)
      const serializedEntry = JSON.stringify(entry, this.bigIntReplacer)
      localStorage.setItem(storageKey, serializedEntry)
    } catch (error) {
      console.warn('Failed to set item in storage:', error)
    }
  }

  /**
   * Delete item from browser storage
   */
  private deleteFromStorage(key: string): void {
    try {
      const storageKey = this.getStorageKey(key)
      localStorage.removeItem(storageKey)
    } catch (error) {
      console.warn('Failed to delete item from storage:', error)
    }
  }

  /**
   * Clear all items from browser storage
   */
  private clearStorage(): void {
    try {
      const keysToRemove: string[] = []
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i)
        if (key && key.startsWith(this.config.storagePrefix)) {
          keysToRemove.push(key)
        }
      }
      keysToRemove.forEach(key => localStorage.removeItem(key))
    } catch (error) {
      console.warn('Failed to clear storage:', error)
    }
  }

  /**
   * Load cache from browser storage
   */
  private loadFromStorage(): void {
    if (!this.config.enablePersistence) return

    try {
      for (let i = 0; i < localStorage.length; i++) {
        const storageKey = localStorage.key(i)
        if (!storageKey || !storageKey.startsWith(this.config.storagePrefix)) {
          continue
        }

        const key = storageKey.replace(`${this.config.storagePrefix}:`, '')
        const item = localStorage.getItem(storageKey)
        if (!item) continue

        const entry = JSON.parse(item, this.bigIntReviver) as CacheEntry
        if (!this.isExpired(entry)) {
          this.memoryCache.set(key, entry)
        } else {
          localStorage.removeItem(storageKey)
        }
      }
    } catch (error) {
      console.warn('Failed to load cache from storage:', error)
    }

    this.updateStats()
  }

  /**
   * BigInt replacer for JSON.stringify
   */
  private bigIntReplacer(key: string, value: any): any {
    if (typeof value === 'bigint') {
      return { __type: 'bigint', value: value.toString() }
    }
    return value
  }

  /**
   * BigInt reviver for JSON.parse
   */
  private bigIntReviver(key: string, value: any): any {
    if (value && typeof value === 'object' && value.__type === 'bigint') {
      return BigInt(value.value)
    }
    return value
  }

  /**
   * Cleanup expired items from browser storage
   */
  private cleanupStorage(): number {
    let cleanedCount = 0

    try {
      const keysToRemove: string[] = []
      for (let i = 0; i < localStorage.length; i++) {
        const storageKey = localStorage.key(i)
        if (!storageKey || !storageKey.startsWith(this.config.storagePrefix)) {
          continue
        }

        const item = localStorage.getItem(storageKey)
        if (!item) continue

        const entry = JSON.parse(item, this.bigIntReviver) as CacheEntry
        if (this.isExpired(entry)) {
          keysToRemove.push(storageKey)
        }
      }

      keysToRemove.forEach(key => {
        localStorage.removeItem(key)
        cleanedCount++
      })
    } catch (error) {
      console.warn('Failed to cleanup storage:', error)
    }

    return cleanedCount
  }
}

/**
 * Global event cache instance
 */
export const eventCache = new EventCache({
  defaultTtl: 5 * 60 * 1000, // 5 minutes
  maxSize: 500,
  enablePersistence: true,
  storagePrefix: 'ingressos-event-cache',
  cleanupInterval: 2 * 60 * 1000, // 2 minutes
})

/**
 * Event-specific cache utilities
 */
export class EventCacheUtils {
  /**
   * Cache organizer events with automatic invalidation tags
   */
  static cacheOrganizerEvents(
    organizerAddress: string,
    chainId: number,
    events: OrganizerEventWithStats[],
    ttl?: number
  ): void {
    const key = CacheKeyBuilder.organizerEvents(organizerAddress, chainId)
    const tags = [
      `organizer:${organizerAddress.toLowerCase()}`,
      `chain:${chainId}`,
      'events',
    ]

    eventCache.set(key, events, { ttl, tags })
  }

  /**
   * Get cached organizer events
   */
  static getCachedOrganizerEvents(
    organizerAddress: string,
    chainId: number
  ): OrganizerEventWithStats[] | null {
    const key = CacheKeyBuilder.organizerEvents(organizerAddress, chainId)
    return eventCache.get<OrganizerEventWithStats[]>(key)
  }

  /**
   * Invalidate organizer events cache
   */
  static invalidateOrganizerEvents(organizerAddress: string, chainId: number): void {
    eventCache.invalidateOrganizer(organizerAddress, chainId)
  }

  /**
   * Invalidate all events for a chain
   */
  static invalidateChainEvents(chainId: number): void {
    eventCache.invalidateChain(chainId)
  }

  /**
   * Invalidate events by tags
   */
  static invalidateByTags(tags: string[]): number {
    return eventCache.invalidate({ tags })
  }

  /**
   * Get cache statistics
   */
  static getStats(): CacheStats {
    return eventCache.getStats()
  }

  /**
   * Cleanup expired entries
   */
  static cleanup(): number {
    return eventCache.cleanup()
  }
}
