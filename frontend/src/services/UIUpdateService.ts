import type { ContractEventData } from './EventListenerService'

/**
 * UI update callback types
 */
export type UIUpdateCallback = (event: ContractEventData) => void | Promise<void>

/**
 * UI update trigger types
 */
export type UIUpdateTrigger =
  | 'event-created'
  | 'event-updated'
  | 'ticket-purchased'
  | 'revenue-withdrawn'
  | 'event-status-changed'
  | 'all'

/**
 * UI update configuration
 */
export interface UIUpdateConfig {
  triggers: UIUpdateTrigger[]
  debounceMs?: number
  batchUpdates?: boolean
  maxBatchSize?: number
}

/**
 * Batched update information
 */
export interface BatchedUpdate {
  events: ContractEventData[]
  timestamp: number
  triggers: Set<UIUpdateTrigger>
}

/**
 * Service for managing UI updates triggered by blockchain events
 */
export class UIUpdateService {
  private callbacks: Map<string, {
    callback: UIUpdateCallback
    config: UIUpdateConfig
  }> = new Map()

  private debounceTimers: Map<string, NodeJS.Timeout> = new Map()
  private batchedUpdates: Map<string, BatchedUpdate> = new Map()

  /**
   * Register a UI update callback
   */
  registerCallback(
    callbackId: string,
    callback: UIUpdateCallback,
    config: UIUpdateConfig
  ): void {
    this.callbacks.set(callbackId, { callback, config })
  }

  /**
   * Unregister a UI update callback
   */
  unregisterCallback(callbackId: string): void {
    // Clear any pending timers
    const timer = this.debounceTimers.get(callbackId)
    if (timer) {
      clearTimeout(timer)
      this.debounceTimers.delete(callbackId)
    }

    // Clear batched updates
    this.batchedUpdates.delete(callbackId)

    // Remove callback
    this.callbacks.delete(callbackId)
  }

  /**
   * Trigger UI updates based on contract event
   */
  async triggerUpdate(event: ContractEventData): Promise<void> {
    const trigger = this.mapEventToTrigger(event)

    for (const [callbackId, { callback, config }] of this.callbacks) {
      if (this.shouldTriggerCallback(trigger, config.triggers)) {
        if (config.batchUpdates) {
          this.handleBatchedUpdate(callbackId, event, trigger, callback, config)
        } else if (config.debounceMs && config.debounceMs > 0) {
          this.handleDebouncedUpdate(callbackId, event, callback, config)
        } else {
          // Immediate update
          try {
            await callback(event)
          } catch (error) {
            console.error(`Error in UI update callback ${callbackId}:`, error)
          }
        }
      }
    }
  }

  /**
   * Map contract event to UI update trigger
   */
  private mapEventToTrigger(event: ContractEventData): UIUpdateTrigger {
    switch (event.type) {
      case 'EventCreated':
        return 'event-created'
      case 'TicketPurchased':
        return 'ticket-purchased'
      case 'EventStatusChanged':
        return 'event-status-changed'
      case 'RevenueWithdrawn':
        return 'revenue-withdrawn'
      default:
        return 'all'
    }
  }

  /**
   * Check if callback should be triggered for given trigger type
   */
  private shouldTriggerCallback(
    trigger: UIUpdateTrigger,
    configuredTriggers: UIUpdateTrigger[]
  ): boolean {
    return configuredTriggers.includes('all') || configuredTriggers.includes(trigger)
  }

  /**
   * Handle debounced UI update
   */
  private handleDebouncedUpdate(
    callbackId: string,
    event: ContractEventData,
    callback: UIUpdateCallback,
    config: UIUpdateConfig
  ): void {
    // Clear existing timer
    const existingTimer = this.debounceTimers.get(callbackId)
    if (existingTimer) {
      clearTimeout(existingTimer)
    }

    // Set new timer
    const timer = setTimeout(async () => {
      try {
        await callback(event)
      } catch (error) {
        console.error(`Error in debounced UI update callback ${callbackId}:`, error)
      } finally {
        this.debounceTimers.delete(callbackId)
      }
    }, config.debounceMs)

    this.debounceTimers.set(callbackId, timer)
  }

  /**
   * Handle batched UI update
   */
  private handleBatchedUpdate(
    callbackId: string,
    event: ContractEventData,
    trigger: UIUpdateTrigger,
    callback: UIUpdateCallback,
    config: UIUpdateConfig
  ): void {
    // Get or create batch
    let batch = this.batchedUpdates.get(callbackId)
    if (!batch) {
      batch = {
        events: [],
        timestamp: Date.now(),
        triggers: new Set(),
      }
      this.batchedUpdates.set(callbackId, batch)
    }

    // Add event to batch
    batch.events.push(event)
    batch.triggers.add(trigger)

    // Check if batch should be flushed
    const shouldFlush =
      batch.events.length >= (config.maxBatchSize || 10) ||
      (config.debounceMs && Date.now() - batch.timestamp >= config.debounceMs)

    if (shouldFlush) {
      this.flushBatch(callbackId, callback)
    } else if (config.debounceMs) {
      // Set timer to flush batch after debounce period
      const existingTimer = this.debounceTimers.get(callbackId)
      if (existingTimer) {
        clearTimeout(existingTimer)
      }

      const timer = setTimeout(() => {
        this.flushBatch(callbackId, callback)
      }, config.debounceMs)

      this.debounceTimers.set(callbackId, timer)
    }
  }

  /**
   * Flush batched updates
   */
  private async flushBatch(callbackId: string, callback: UIUpdateCallback): Promise<void> {
    const batch = this.batchedUpdates.get(callbackId)
    if (!batch || batch.events.length === 0) return

    // Clear batch and timer
    this.batchedUpdates.delete(callbackId)
    const timer = this.debounceTimers.get(callbackId)
    if (timer) {
      clearTimeout(timer)
      this.debounceTimers.delete(callbackId)
    }

    // Execute callback for each event in batch
    try {
      for (const event of batch.events) {
        await callback(event)
      }
    } catch (error) {
      console.error(`Error in batched UI update callback ${callbackId}:`, error)
    }
  }

  /**
   * Force flush all batched updates
   */
  async flushAllBatches(): Promise<void> {
    const flushPromises: Promise<void>[] = []

    for (const [callbackId, { callback }] of this.callbacks) {
      if (this.batchedUpdates.has(callbackId)) {
        flushPromises.push(this.flushBatch(callbackId, callback))
      }
    }

    await Promise.all(flushPromises)
  }

  /**
   * Get statistics about registered callbacks
   */
  getStats(): {
    totalCallbacks: number
    pendingBatches: number
    activeDebouncers: number
    batchSizes: Record<string, number>
  } {
    const batchSizes: Record<string, number> = {}

    for (const [callbackId, batch] of this.batchedUpdates) {
      batchSizes[callbackId] = batch.events.length
    }

    return {
      totalCallbacks: this.callbacks.size,
      pendingBatches: this.batchedUpdates.size,
      activeDebouncers: this.debounceTimers.size,
      batchSizes,
    }
  }

  /**
   * Clear all callbacks and pending updates
   */
  clear(): void {
    // Clear all timers
    for (const timer of this.debounceTimers.values()) {
      clearTimeout(timer)
    }

    // Clear all data
    this.callbacks.clear()
    this.debounceTimers.clear()
    this.batchedUpdates.clear()
  }
}

/**
 * Global UI update service instance
 */
export const uiUpdateService = new UIUpdateService()

/**
 * Convenience functions for common UI update patterns
 */
export class UIUpdateHelpers {
  /**
   * Register callback for event list updates
   */
  static registerEventListUpdate(
    callbackId: string,
    callback: UIUpdateCallback,
    options: {
      debounceMs?: number
      batchUpdates?: boolean
    } = {}
  ): void {
    uiUpdateService.registerCallback(callbackId, callback, {
      triggers: ['event-created', 'event-status-changed'],
      debounceMs: options.debounceMs || 1000,
      batchUpdates: options.batchUpdates || true,
      maxBatchSize: 5,
    })
  }

  /**
   * Register callback for ticket sales updates
   */
  static registerTicketSalesUpdate(
    callbackId: string,
    callback: UIUpdateCallback,
    options: {
      debounceMs?: number
      batchUpdates?: boolean
    } = {}
  ): void {
    uiUpdateService.registerCallback(callbackId, callback, {
      triggers: ['ticket-purchased'],
      debounceMs: options.debounceMs || 500,
      batchUpdates: options.batchUpdates || true,
      maxBatchSize: 10,
    })
  }

  /**
   * Register callback for revenue updates
   */
  static registerRevenueUpdate(
    callbackId: string,
    callback: UIUpdateCallback,
    options: {
      debounceMs?: number
    } = {}
  ): void {
    uiUpdateService.registerCallback(callbackId, callback, {
      triggers: ['ticket-purchased', 'revenue-withdrawn'],
      debounceMs: options.debounceMs || 1000,
      batchUpdates: false,
    })
  }

  /**
   * Register callback for all event updates
   */
  static registerAllEventsUpdate(
    callbackId: string,
    callback: UIUpdateCallback,
    options: {
      debounceMs?: number
      batchUpdates?: boolean
    } = {}
  ): void {
    uiUpdateService.registerCallback(callbackId, callback, {
      triggers: ['all'],
      debounceMs: options.debounceMs || 2000,
      batchUpdates: options.batchUpdates || true,
      maxBatchSize: 20,
    })
  }

  /**
   * Unregister callback
   */
  static unregister(callbackId: string): void {
    uiUpdateService.unregisterCallback(callbackId)
  }
}
