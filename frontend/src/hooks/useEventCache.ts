import { useCallback, useEffect, useState } from 'react'
import { useChainId } from 'wagmi'
import { EventCacheUtils, eventCache, CacheKeyBuilder } from '../services/EventCache'
import { EventCacheIntegration } from '../services/EventCacheIntegration'
import type { OrganizerEventWithStats } from './useOrganizerEvents'
import type { CacheStats } from '../services/EventCache'

/**
 * Hook options for event cache
 */
export interface UseEventCacheOptions {
  ttl?: number // Time to live in milliseconds
  enableAutoInvalidation?: boolean
  organizerAddress?: `0x${string}`
}

/**
 * Hook return type for event cache
 */
export interface UseEventCacheReturn {
  // Cache operations
  getCachedEvents: (organizerAddress: string) => OrganizerEventWithStats[] | null
  setCachedEvents: (organizerAddress: string, events: OrganizerEventWithStats[], ttl?: number) => void
  invalidateEvents: (organizerAddress?: string) => void
  clearCache: () => void

  // Cache status
  cacheStats: CacheStats
  hasCachedEvents: (organizerAddress: string) => boolean

  // Utilities
  refreshStats: () => void
}

/**
 * React hook for event cache management
 */
export function useEventCache(options: UseEventCacheOptions = {}): UseEventCacheReturn {
  const chainId = useChainId()
  const {
    ttl = 5 * 60 * 1000, // 5 minutes default
    enableAutoInvalidation = true,
    organizerAddress,
  } = options

  const [cacheStats, setCacheStats] = useState<CacheStats>(EventCacheUtils.getStats())

  // Initialize cache integration
  useEffect(() => {
    if (enableAutoInvalidation && chainId) {
      EventCacheIntegration.initialize(chainId, {
        enableAutoInvalidation: true,
        strategy: 'debounced' as any,
        debounceMs: 1000,
      })
    }

    return () => {
      if (enableAutoInvalidation) {
        EventCacheIntegration.cleanup()
      }
    }
  }, [chainId, enableAutoInvalidation])

  // Refresh cache stats periodically
  useEffect(() => {
    const interval = setInterval(() => {
      setCacheStats(EventCacheUtils.getStats())
    }, 5000) // Update every 5 seconds

    return () => clearInterval(interval)
  }, [])

  // Get cached events for organizer
  const getCachedEvents = useCallback((organizerAddr: string): OrganizerEventWithStats[] | null => {
    if (!chainId) return null
    return EventCacheUtils.getCachedOrganizerEvents(organizerAddr, chainId)
  }, [chainId])

  // Set cached events for organizer
  const setCachedEvents = useCallback((
    organizerAddr: string,
    events: OrganizerEventWithStats[],
    customTtl?: number
  ): void => {
    if (!chainId) return
    EventCacheUtils.cacheOrganizerEvents(organizerAddr, chainId, events, customTtl || ttl)
    setCacheStats(EventCacheUtils.getStats())
  }, [chainId, ttl])

  // Invalidate events cache
  const invalidateEvents = useCallback((organizerAddr?: string): void => {
    if (!chainId) return

    if (organizerAddr) {
      EventCacheUtils.invalidateOrganizerEvents(organizerAddr, chainId)
    } else {
      EventCacheUtils.invalidateChainEvents(chainId)
    }

    setCacheStats(EventCacheUtils.getStats())
  }, [chainId])

  // Clear entire cache
  const clearCache = useCallback((): void => {
    eventCache.clear()
    setCacheStats(EventCacheUtils.getStats())
  }, [])

  // Check if events are cached for organizer
  const hasCachedEvents = useCallback((organizerAddr: string): boolean => {
    if (!chainId) return false
    const key = CacheKeyBuilder.organizerEvents(organizerAddr, chainId)
    return eventCache.has(key)
  }, [chainId])

  // Refresh cache statistics
  const refreshStats = useCallback((): void => {
    setCacheStats(EventCacheUtils.getStats())
  }, [])

  return {
    getCachedEvents,
    setCachedEvents,
    invalidateEvents,
    clearCache,
    cacheStats,
    hasCachedEvents,
    refreshStats,
  }
}

/**
 * Hook for caching and retrieving organizer events with automatic cache management
 */
export function useOrganizerEventCache(
  organizerAddress: `0x${string}` | undefined,
  options: UseEventCacheOptions = {}
) {
  const cache = useEventCache(options)
  const chainId = useChainId()

  // Get cached events for current organizer
  const cachedEvents = organizerAddress && chainId
    ? cache.getCachedEvents(organizerAddress)
    : null

  // Check if current organizer has cached events
  const hasCachedEvents = organizerAddress && chainId
    ? cache.hasCachedEvents(organizerAddress)
    : false

  // Cache events for current organizer
  const cacheEvents = useCallback((events: OrganizerEventWithStats[], ttl?: number) => {
    if (organizerAddress) {
      cache.setCachedEvents(organizerAddress, events, ttl)
    }
  }, [organizerAddress, cache])

  // Invalidate current organizer's cache
  const invalidateCache = useCallback(() => {
    if (organizerAddress) {
      cache.invalidateEvents(organizerAddress)
    }
  }, [organizerAddress, cache])

  return {
    cachedEvents,
    hasCachedEvents,
    cacheEvents,
    invalidateCache,
    cacheStats: cache.cacheStats,
    refreshStats: cache.refreshStats,
  }
}

/**
 * Hook for cache debugging and monitoring
 */
export function useEventCacheDebug() {
  const [cacheEntries, setCacheEntries] = useState<Array<{ key: string; entry: any }>>([])
  const [cacheStats, setCacheStats] = useState<CacheStats>(EventCacheUtils.getStats())

  const refreshData = useCallback(() => {
    setCacheEntries(eventCache.getEntries())
    setCacheStats(EventCacheUtils.getStats())
  }, [])

  const getCacheKeys = useCallback(() => {
    return eventCache.getKeys()
  }, [])

  const getIntegrationStatus = useCallback(() => {
    return EventCacheIntegration.getStatus()
  }, [])

  const performCleanup = useCallback(() => {
    const cleanedCount = EventCacheUtils.cleanup()
    refreshData()
    return cleanedCount
  }, [refreshData])

  const clearAllCache = useCallback(() => {
    eventCache.clear()
    refreshData()
  }, [refreshData])

  // Auto-refresh data
  useEffect(() => {
    const interval = setInterval(refreshData, 2000)
    return () => clearInterval(interval)
  }, [refreshData])

  return {
    cacheEntries,
    cacheStats,
    cacheKeys: getCacheKeys(),
    integrationStatus: getIntegrationStatus(),
    refreshData,
    performCleanup,
    clearAllCache,
  }
}

/**
 * Hook for cache performance monitoring
 */
export function useEventCachePerformance() {
  const [performanceMetrics, setPerformanceMetrics] = useState({
    hitRate: 0,
    averageResponseTime: 0,
    cacheSize: 0,
    memoryUsage: 0,
  })

  const measureCacheOperation = useCallback(<T>(
    operation: () => T,
    operationType: 'get' | 'set' | 'invalidate'
  ): T => {
    const startTime = performance.now()
    const result = operation()
    const endTime = performance.now()
    const responseTime = endTime - startTime

    // Update metrics (simplified - in production, you'd want more sophisticated tracking)
    setPerformanceMetrics(prev => ({
      ...prev,
      averageResponseTime: (prev.averageResponseTime + responseTime) / 2,
    }))

    console.log(`Cache ${operationType} took ${responseTime.toFixed(2)}ms`)
    return result
  }, [])

  // Update metrics periodically
  useEffect(() => {
    const interval = setInterval(() => {
      const stats = EventCacheUtils.getStats()
      setPerformanceMetrics(prev => ({
        ...prev,
        hitRate: stats.hitRate,
        cacheSize: stats.size,
        memoryUsage: stats.memoryUsage,
      }))
    }, 5000)

    return () => clearInterval(interval)
  }, [])

  return {
    performanceMetrics,
    measureCacheOperation,
  }
}
