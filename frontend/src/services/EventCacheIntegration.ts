import { EventListenerFactory } from './EventListenerFactory'
import { EventCacheUtils, eventCache } from './EventCache'
import type { ContractEventData } from './EventListenerService'

/**
 * Cache invalidation strategies
 */
export enum InvalidationStrategy {
  IMMEDIATE = 'immediate',
  DEBOUNCED = 'debounced',
  BATCH = 'batch',
}

/**
 * Cache integration configuration
 */
export interface CacheIntegrationConfig {
  strategy: InvalidationStrategy
  debounceMs?: number
  batchSize?: number
  enableAutoInvalidation: boolean
}

/**
 * Event-driven cache invalidation mapping
 */
const EVENT_INVALIDATION_MAP = {
  EventCreated: {
    tags: ['events', 'event-list'],
    organizerSpecific: true,
    chainSpecific: true,
  },
  TicketPurchased: {
    tags: ['events', 'event-stats', 'ticket-sales'],
    organizerSpecific: true,
    chainSpecific: true,
    eventSpecific: true,
  },
  EventStatusChanged: {
    tags: ['events', 'event-status'],
    organizerSpecific: true,
    chainSpecific: true,
    eventSpecific: true,
  },
  RevenueWithdrawn: {
    tags: ['events', 'event-stats', 'revenue'],
    organizerSpecific: true,
    chainSpecific: true,
    eventSpecific: true,
  },
} as const

/**
 * Service that integrates event cache with blockchain event listeners
 * for automatic cache invalidation
 */
export class EventCacheIntegration {
  private static isInitialized = false
  private static activeChainId: number | null = null
  private static config: CacheIntegrationConfig = {
    strategy: InvalidationStrategy.DEBOUNCED,
    debounceMs: 1000,
    batchSize: 10,
    enableAutoInvalidation: true,
  }
  private static debounceTimers: Map<string, NodeJS.Timeout> = new Map()
  private static batchedInvalidations: Map<string, Set<string>> = new Map()

  /**
   * Initialize cache integration with event listeners
   */
  static initialize(
    chainId: number,
    config: Partial<CacheIntegrationConfig> = {}
  ): void {
    if (this.isInitialized && this.activeChainId === chainId) {
      return // Already initialized for this chain
    }

    // Clean up previous initialization
    if (this.isInitialized) {
      this.cleanup()
    }

    // Update configuration
    this.config = { ...this.config, ...config }

    if (!this.config.enableAutoInvalidation) {
      return
    }

    try {
      // Set up event listener for cache invalidation
      EventListenerFactory.addListener(
        chainId,
        'cache-invalidation',
        this.handleCacheInvalidationEvent.bind(this),
        {}, // No filter - listen to all events
        { pollingInterval: 3000 } // Faster polling for cache invalidation
      )

      this.isInitialized = true
      this.activeChainId = chainId

      console.log(`Cache integration initialized for chain ${chainId}`)
    } catch (error) {
      console.error('Failed to initialize cache integration:', error)
      throw error
    }
  }

  /**
   * Handle blockchain events for cache invalidation
   */
  private static async handleCacheInvalidationEvent(event: ContractEventData): Promise<void> {
    if (!this.config.enableAutoInvalidation) return

    try {
      console.log('Processing cache invalidation for event:', event.type)

      const invalidationConfig = EVENT_INVALIDATION_MAP[event.type]
      if (!invalidationConfig) {
        console.warn(`No invalidation config for event type: ${event.type}`)
        return
      }

      // Determine what to invalidate based on event type and data
      const invalidationTargets = this.getInvalidationTargets(event, invalidationConfig)

      // Apply invalidation strategy
      switch (this.config.strategy) {
        case InvalidationStrategy.IMMEDIATE:
          this.performImmediateInvalidation(invalidationTargets)
          break

        case InvalidationStrategy.DEBOUNCED:
          this.performDebouncedInvalidation(invalidationTargets)
          break

        case InvalidationStrategy.BATCH:
          this.performBatchedInvalidation(invalidationTargets)
          break
      }
    } catch (error) {
      console.error('Error handling cache invalidation event:', error)
    }
  }

  /**
   * Get invalidation targets based on event data
   */
  private static getInvalidationTargets(
    event: ContractEventData,
    config: typeof EVENT_INVALIDATION_MAP[keyof typeof EVENT_INVALIDATION_MAP]
  ): {
    tags: string[]
    organizerAddress?: string
    eventId?: number
    chainId: number
  } {
    const targets = {
      tags: [...config.tags],
      chainId: this.activeChainId!,
    } as any

    // Add organizer-specific invalidation
    if (config.organizerSpecific) {
      const organizerAddress = this.getEventOrganizer(event)
      if (organizerAddress) {
        targets.organizerAddress = organizerAddress
        targets.tags.push(`organizer:${organizerAddress.toLowerCase()}`)
      }
    }

    // Add event-specific invalidation
    if (config.eventSpecific) {
      const eventId = this.getEventId(event)
      if (eventId !== null) {
        targets.eventId = Number(eventId)
        targets.tags.push(`event:${eventId}`)
      }
    }

    // Add chain-specific tag
    if (config.chainSpecific) {
      targets.tags.push(`chain:${this.activeChainId}`)
    }

    return targets
  }

  /**
   * Perform immediate cache invalidation
   */
  private static performImmediateInvalidation(targets: {
    tags: string[]
    organizerAddress?: string
    eventId?: number
    chainId: number
  }): void {
    let invalidatedCount = 0

    // Invalidate by tags
    invalidatedCount += EventCacheUtils.invalidateByTags(targets.tags)

    // Invalidate organizer-specific cache
    if (targets.organizerAddress) {
      EventCacheUtils.invalidateOrganizerEvents(targets.organizerAddress, targets.chainId)
      invalidatedCount += 1
    }

    console.log(`Immediately invalidated ${invalidatedCount} cache entries`)
  }

  /**
   * Perform debounced cache invalidation
   */
  private static performDebouncedInvalidation(targets: {
    tags: string[]
    organizerAddress?: string
    eventId?: number
    chainId: number
  }): void {
    const debounceKey = `${targets.chainId}:${targets.organizerAddress || 'global'}`

    // Clear existing timer
    const existingTimer = this.debounceTimers.get(debounceKey)
    if (existingTimer) {
      clearTimeout(existingTimer)
    }

    // Set new timer
    const timer = setTimeout(() => {
      this.performImmediateInvalidation(targets)
      this.debounceTimers.delete(debounceKey)
    }, this.config.debounceMs)

    this.debounceTimers.set(debounceKey, timer)
  }

  /**
   * Perform batched cache invalidation
   */
  private static performBatchedInvalidation(targets: {
    tags: string[]
    organizerAddress?: string
    eventId?: number
    chainId: number
  }): void {
    const batchKey = `${targets.chainId}:${targets.organizerAddress || 'global'}`

    // Get or create batch
    let batch = this.batchedInvalidations.get(batchKey)
    if (!batch) {
      batch = new Set()
      this.batchedInvalidations.set(batchKey, batch)
    }

    // Add tags to batch
    targets.tags.forEach(tag => batch!.add(tag))

    // Check if batch should be flushed
    if (batch.size >= (this.config.batchSize || 10)) {
      this.flushBatch(batchKey, targets.chainId, targets.organizerAddress)
    } else {
      // Set timer to flush batch
      setTimeout(() => {
        this.flushBatch(batchKey, targets.chainId, targets.organizerAddress)
      }, this.config.debounceMs || 1000)
    }
  }

  /**
   * Flush batched invalidations
   */
  private static flushBatch(
    batchKey: string,
    chainId: number,
    organizerAddress?: string
  ): void {
    const batch = this.batchedInvalidations.get(batchKey)
    if (!batch || batch.size === 0) return

    const tags = Array.from(batch)
    let invalidatedCount = EventCacheUtils.invalidateByTags(tags)

    if (organizerAddress) {
      EventCacheUtils.invalidateOrganizerEvents(organizerAddress, chainId)
      invalidatedCount += 1
    }

    this.batchedInvalidations.delete(batchKey)
    console.log(`Batch invalidated ${invalidatedCount} cache entries for ${tags.length} tags`)
  }

  /**
   * Handle network switching
   */
  static handleNetworkSwitch(oldChainId: number, newChainId: number): void {
    if (!this.isInitialized) return

    try {
      // Remove listener from old chain
      EventListenerFactory.removeListener(oldChainId, 'cache-invalidation')

      // Add listener to new chain
      EventListenerFactory.addListener(
        newChainId,
        'cache-invalidation',
        this.handleCacheInvalidationEvent.bind(this),
        {},
        { pollingInterval: 3000 }
      )

      // Invalidate cache for old chain
      EventCacheUtils.invalidateChainEvents(oldChainId)

      this.activeChainId = newChainId

      console.log(`Cache integration switched from chain ${oldChainId} to ${newChainId}`)
    } catch (error) {
      console.error('Failed to handle network switch in cache integration:', error)
    }
  }

  /**
   * Manual cache invalidation for specific event types
   */
  static invalidateForEvent(
    eventType: keyof typeof EVENT_INVALIDATION_MAP,
    eventData: {
      organizerAddress?: string
      eventId?: number
      chainId: number
    }
  ): void {
    const config = EVENT_INVALIDATION_MAP[eventType]
    if (!config) return

    const targets = {
      tags: [...config.tags],
      chainId: eventData.chainId,
      organizerAddress: eventData.organizerAddress,
      eventId: eventData.eventId,
    }

    // Add conditional tags
    if (eventData.organizerAddress) {
      targets.tags.push(`organizer:${eventData.organizerAddress.toLowerCase()}`)
    }
    if (eventData.eventId) {
      targets.tags.push(`event:${eventData.eventId}`)
    }
    targets.tags.push(`chain:${eventData.chainId}`)

    this.performImmediateInvalidation(targets)
  }

  /**
   * Update configuration
   */
  static updateConfig(config: Partial<CacheIntegrationConfig>): void {
    this.config = { ...this.config, ...config }
  }

  /**
   * Get current configuration
   */
  static getConfig(): CacheIntegrationConfig {
    return { ...this.config }
  }

  /**
   * Get integration status
   */
  static getStatus(): {
    isInitialized: boolean
    activeChainId: number | null
    pendingDebounces: number
    pendingBatches: number
    cacheStats: any
  } {
    return {
      isInitialized: this.isInitialized,
      activeChainId: this.activeChainId,
      pendingDebounces: this.debounceTimers.size,
      pendingBatches: this.batchedInvalidations.size,
      cacheStats: EventCacheUtils.getStats(),
    }
  }

  /**
   * Force flush all pending invalidations
   */
  static flushPendingInvalidations(): void {
    // Flush debounced invalidations
    for (const [key, timer] of this.debounceTimers) {
      clearTimeout(timer)
    }
    this.debounceTimers.clear()

    // Flush batched invalidations
    for (const [batchKey] of this.batchedInvalidations) {
      const [chainIdStr, organizerAddress] = batchKey.split(':')
      const chainId = parseInt(chainIdStr)
      this.flushBatch(
        batchKey,
        chainId,
        organizerAddress !== 'global' ? organizerAddress : undefined
      )
    }
  }

  /**
   * Cleanup integration
   */
  static cleanup(): void {
    if (!this.isInitialized) return

    try {
      if (this.activeChainId) {
        EventListenerFactory.removeListener(this.activeChainId, 'cache-invalidation')
      }

      // Clear pending operations
      this.flushPendingInvalidations()

      this.isInitialized = false
      this.activeChainId = null

      console.log('Cache integration cleaned up')
    } catch (error) {
      console.error('Error during cache integration cleanup:', error)
    }
  }

  /**
   * Extract organizer address from event data
   */
  private static getEventOrganizer(event: ContractEventData): string | null {
    switch (event.type) {
      case 'EventCreated':
      case 'RevenueWithdrawn':
        return event.data.organizer
      default:
        return null
    }
  }

  /**
   * Extract event ID from event data
   */
  private static getEventId(event: ContractEventData): bigint | null {
    return 'eventId' in event.data ? event.data.eventId : null
  }
}

/**
 * React hook for cache integration
 */
export function useCacheIntegration(
  chainId: number,
  config: Partial<CacheIntegrationConfig> = {}
) {
  React.useEffect(() => {
    EventCacheIntegration.initialize(chainId, config)

    return () => {
      EventCacheIntegration.cleanup()
    }
  }, [chainId])

  // Handle network switching
  const prevChainId = React.useRef<number>()
  React.useEffect(() => {
    if (prevChainId.current && prevChainId.current !== chainId) {
      EventCacheIntegration.handleNetworkSwitch(prevChainId.current, chainId)
    }
    prevChainId.current = chainId
  }, [chainId])

  return {
    getStatus: EventCacheIntegration.getStatus,
    flushPendingInvalidations: EventCacheIntegration.flushPendingInvalidations,
    invalidateForEvent: EventCacheIntegration.invalidateForEvent,
  }
}

// Add React import
import React from 'react'
