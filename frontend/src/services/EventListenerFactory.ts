import { EventListenerService } from './EventListenerService'
import type { EventCallback, EventFilter } from './EventListenerService'

/**
 * Factory for managing EventListenerService instances across different chains
 */
export class EventListenerFactory {
  private static instances: Map<number, EventListenerService> = new Map()

  /**
   * Get or create an EventListenerService instance for the specified chain
   */
  static getInstance(
    chainId: number,
    options: { pollingInterval?: number; batchSize?: number } = {}
  ): EventListenerService {
    // Check if we already have an instance for this chain
    if (this.instances.has(chainId)) {
      const instance = this.instances.get(chainId)!

      // Update polling interval if provided
      if (options.pollingInterval && options.pollingInterval !== instance.getConfig().pollingInterval) {
        instance.updatePollingInterval(options.pollingInterval)
      }

      return instance
    }

    // Create new instance
    const service = new EventListenerService(chainId, options)
    this.instances.set(chainId, service)

    return service
  }

  /**
   * Clear cached instance for a specific chain
   */
  static clearInstance(chainId: number): void {
    const instance = this.instances.get(chainId)
    if (instance) {
      instance.destroy()
      this.instances.delete(chainId)
    }
  }

  /**
   * Clear all cached instances
   */
  static clearAllInstances(): void {
    for (const [chainId, instance] of this.instances) {
      instance.destroy()
    }
    this.instances.clear()
  }

  /**
   * Get all active chain IDs
   */
  static getActiveChains(): number[] {
    return Array.from(this.instances.keys())
  }

  /**
   * Get total number of listeners across all chains
   */
  static getTotalListenerCount(): number {
    let total = 0
    for (const instance of this.instances.values()) {
      total += instance.getListenerCount()
    }
    return total
  }

  /**
   * Check if any instance is currently listening
   */
  static isAnyInstanceListening(): boolean {
    for (const instance of this.instances.values()) {
      if (instance.isCurrentlyListening()) {
        return true
      }
    }
    return false
  }

  /**
   * Add a listener to a specific chain with automatic instance creation
   */
  static addListener(
    chainId: number,
    listenerId: string,
    callback: EventCallback,
    filter: EventFilter = {},
    options: { pollingInterval?: number; batchSize?: number } = {}
  ): EventListenerService {
    const instance = this.getInstance(chainId, options)
    instance.addEventListener(listenerId, callback, filter)
    return instance
  }

  /**
   * Remove a listener from a specific chain
   */
  static removeListener(chainId: number, listenerId: string): void {
    const instance = this.instances.get(chainId)
    if (instance) {
      instance.removeEventListener(listenerId)

      // Clean up instance if no more listeners
      if (instance.getListenerCount() === 0) {
        this.clearInstance(chainId)
      }
    }
  }

  /**
   * Remove a listener from all chains
   */
  static removeListenerFromAllChains(listenerId: string): void {
    for (const chainId of this.instances.keys()) {
      this.removeListener(chainId, listenerId)
    }
  }

  /**
   * Update polling interval for all instances
   */
  static updatePollingIntervalForAll(intervalMs: number): void {
    for (const instance of this.instances.values()) {
      instance.updatePollingInterval(intervalMs)
    }
  }

  /**
   * Trigger manual polling for all instances
   */
  static async triggerPollForAll(): Promise<void> {
    const promises = Array.from(this.instances.values()).map(instance =>
      instance.triggerPoll()
    )
    await Promise.all(promises)
  }

  /**
   * Get status information for all instances
   */
  static getStatus(): Array<{
    chainId: number
    isListening: boolean
    listenerCount: number
    lastProcessedBlock: bigint
    pollingInterval: number
  }> {
    return Array.from(this.instances.entries()).map(([chainId, instance]) => ({
      chainId,
      isListening: instance.isCurrentlyListening(),
      listenerCount: instance.getListenerCount(),
      lastProcessedBlock: instance.getLastProcessedBlock(),
      pollingInterval: instance.getConfig().pollingInterval || 5000,
    }))
  }

  /**
   * Handle network switching by cleaning up old chain and setting up new one
   */
  static handleNetworkSwitch(
    oldChainId: number,
    newChainId: number,
    listeners: Array<{
      listenerId: string
      callback: EventCallback
      filter?: EventFilter
    }>,
    options: { pollingInterval?: number; batchSize?: number } = {}
  ): EventListenerService {
    // Clear old chain instance
    this.clearInstance(oldChainId)

    // Create new instance and restore listeners
    const newInstance = this.getInstance(newChainId, options)

    for (const { listenerId, callback, filter } of listeners) {
      newInstance.addEventListener(listenerId, callback, filter || {})
    }

    return newInstance
  }
}

/**
 * Global event listener manager for easier usage
 */
export class GlobalEventListener {
  private static listenerConfigs: Map<string, {
    chainId: number
    callback: EventCallback
    filter: EventFilter
  }> = new Map()

  /**
   * Add a global listener that persists across network switches
   */
  static addGlobalListener(
    listenerId: string,
    chainId: number,
    callback: EventCallback,
    filter: EventFilter = {}
  ): void {
    // Store configuration for network switching
    this.listenerConfigs.set(listenerId, { chainId, callback, filter })

    // Add to current chain
    EventListenerFactory.addListener(chainId, listenerId, callback, filter)
  }

  /**
   * Remove a global listener
   */
  static removeGlobalListener(listenerId: string): void {
    const config = this.listenerConfigs.get(listenerId)
    if (config) {
      EventListenerFactory.removeListener(config.chainId, listenerId)
      this.listenerConfigs.delete(listenerId)
    }
  }

  /**
   * Handle network switching for all global listeners
   */
  static handleNetworkSwitch(oldChainId: number, newChainId: number): void {
    const listenersToMigrate: Array<{
      listenerId: string
      callback: EventCallback
      filter: EventFilter
    }> = []

    // Collect listeners that need to be migrated
    for (const [listenerId, config] of this.listenerConfigs) {
      if (config.chainId === oldChainId) {
        listenersToMigrate.push({
          listenerId,
          callback: config.callback,
          filter: config.filter,
        })

        // Update stored configuration
        config.chainId = newChainId
      }
    }

    // Migrate listeners to new chain
    if (listenersToMigrate.length > 0) {
      EventListenerFactory.handleNetworkSwitch(
        oldChainId,
        newChainId,
        listenersToMigrate
      )
    }
  }

  /**
   * Get all global listener configurations
   */
  static getGlobalListeners(): Array<{
    listenerId: string
    chainId: number
    filter: EventFilter
  }> {
    return Array.from(this.listenerConfigs.entries()).map(([listenerId, config]) => ({
      listenerId,
      chainId: config.chainId,
      filter: config.filter,
    }))
  }

  /**
   * Clear all global listeners
   */
  static clearAllGlobalListeners(): void {
    for (const listenerId of this.listenerConfigs.keys()) {
      this.removeGlobalListener(listenerId)
    }
  }
}
