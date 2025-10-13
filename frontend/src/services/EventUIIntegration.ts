import React from 'react'
import { EventListenerFactory } from './EventListenerFactory'
import { uiUpdateService, UIUpdateHelpers } from './UIUpdateService'
import type { ContractEventData } from './EventListenerService'

/**
 * Integration service that connects blockchain event listeners with UI updates
 */
export class EventUIIntegration {
  private static isInitialized = false
  private static activeChainId: number | null = null

  /**
   * Initialize the integration for a specific chain
   */
  static initialize(chainId: number, options: {
    pollingInterval?: number
    batchSize?: number
  } = {}): void {
    if (this.isInitialized && this.activeChainId === chainId) {
      return // Already initialized for this chain
    }

    // Clean up previous initialization
    if (this.isInitialized) {
      this.cleanup()
    }

    try {
      // Set up event listener with UI update callback
      EventListenerFactory.addListener(
        chainId,
        'ui-integration',
        this.handleContractEvent.bind(this),
        {}, // No filter - listen to all events
        options
      )

      this.isInitialized = true
      this.activeChainId = chainId

      console.log(`Event-UI integration initialized for chain ${chainId}`)
    } catch (error) {
      console.error('Failed to initialize Event-UI integration:', error)
      throw error
    }
  }

  /**
   * Handle contract events and trigger UI updates
   */
  private static async handleContractEvent(event: ContractEventData): Promise<void> {
    try {
      // Log event for debugging
      console.log('Contract event received:', event.type, event.data)

      // Trigger UI updates
      await uiUpdateService.triggerUpdate(event)
    } catch (error) {
      console.error('Error handling contract event for UI updates:', error)
    }
  }

  /**
   * Handle network switching
   */
  static handleNetworkSwitch(oldChainId: number, newChainId: number): void {
    if (!this.isInitialized) return

    try {
      // Remove listener from old chain
      EventListenerFactory.removeListener(oldChainId, 'ui-integration')

      // Add listener to new chain
      EventListenerFactory.addListener(
        newChainId,
        'ui-integration',
        this.handleContractEvent.bind(this)
      )

      this.activeChainId = newChainId

      console.log(`Event-UI integration switched from chain ${oldChainId} to ${newChainId}`)
    } catch (error) {
      console.error('Failed to handle network switch in Event-UI integration:', error)
    }
  }

  /**
   * Add organizer-specific event filtering
   */
  static addOrganizerFilter(organizerAddress: `0x${string}`): void {
    if (!this.isInitialized || !this.activeChainId) return

    try {
      // Remove existing listener
      EventListenerFactory.removeListener(this.activeChainId, 'ui-integration')

      // Add new listener with organizer filter
      EventListenerFactory.addListener(
        this.activeChainId,
        'ui-integration',
        this.handleContractEvent.bind(this),
        { organizerAddress }
      )

      console.log(`Added organizer filter for ${organizerAddress}`)
    } catch (error) {
      console.error('Failed to add organizer filter:', error)
    }
  }

  /**
   * Remove organizer filter (listen to all events)
   */
  static removeOrganizerFilter(): void {
    if (!this.isInitialized || !this.activeChainId) return

    try {
      // Remove existing listener
      EventListenerFactory.removeListener(this.activeChainId, 'ui-integration')

      // Add new listener without filter
      EventListenerFactory.addListener(
        this.activeChainId,
        'ui-integration',
        this.handleContractEvent.bind(this)
      )

      console.log('Removed organizer filter')
    } catch (error) {
      console.error('Failed to remove organizer filter:', error)
    }
  }

  /**
   * Cleanup integration
   */
  static cleanup(): void {
    if (!this.isInitialized) return

    try {
      if (this.activeChainId) {
        EventListenerFactory.removeListener(this.activeChainId, 'ui-integration')
      }

      // Clear UI update service
      uiUpdateService.clear()

      this.isInitialized = false
      this.activeChainId = null

      console.log('Event-UI integration cleaned up')
    } catch (error) {
      console.error('Error during Event-UI integration cleanup:', error)
    }
  }

  /**
   * Get integration status
   */
  static getStatus(): {
    isInitialized: boolean
    activeChainId: number | null
    isListening: boolean
    uiCallbacks: number
  } {
    return {
      isInitialized: this.isInitialized,
      activeChainId: this.activeChainId,
      isListening: this.activeChainId ?
        EventListenerFactory.getInstance(this.activeChainId).isCurrentlyListening() :
        false,
      uiCallbacks: uiUpdateService.getStats().totalCallbacks,
    }
  }

  /**
   * Force trigger a manual poll and UI update
   */
  static async triggerManualUpdate(): Promise<void> {
    if (!this.isInitialized || !this.activeChainId) return

    try {
      const service = EventListenerFactory.getInstance(this.activeChainId)
      await service.triggerPoll()
      await uiUpdateService.flushAllBatches()
    } catch (error) {
      console.error('Failed to trigger manual update:', error)
    }
  }
}

/**
 * React hook for easy Event-UI integration setup
 */
export function useEventUIIntegration(
  chainId: number,
  organizerAddress?: `0x${string}`,
  options: {
    enabled?: boolean
    pollingInterval?: number
    batchSize?: number
  } = {}
) {
  const { enabled = true, ...integrationOptions } = options

  // Initialize integration
  React.useEffect(() => {
    if (!enabled || !chainId) return

    EventUIIntegration.initialize(chainId, integrationOptions)

    return () => {
      EventUIIntegration.cleanup()
    }
  }, [enabled, chainId, integrationOptions.pollingInterval, integrationOptions.batchSize])

  // Handle organizer filter
  React.useEffect(() => {
    if (!enabled || !organizerAddress) return

    EventUIIntegration.addOrganizerFilter(organizerAddress)

    return () => {
      EventUIIntegration.removeOrganizerFilter()
    }
  }, [enabled, organizerAddress])

  // Handle network switching
  const prevChainId = React.useRef<number>()
  React.useEffect(() => {
    if (prevChainId.current && prevChainId.current !== chainId) {
      EventUIIntegration.handleNetworkSwitch(prevChainId.current, chainId)
    }
    prevChainId.current = chainId
  }, [chainId])

  return {
    triggerManualUpdate: EventUIIntegration.triggerManualUpdate,
    getStatus: EventUIIntegration.getStatus,
  }
}

/**
 * Convenience functions for common integration patterns
 */
export class EventUIIntegrationHelpers {
  /**
   * Set up integration for organizer dashboard
   */
  static setupOrganizerDashboard(
    chainId: number,
    organizerAddress: `0x${string}`,
    callbacks: {
      onEventCreated?: (event: ContractEventData) => void
      onTicketPurchased?: (event: ContractEventData) => void
      onEventStatusChanged?: (event: ContractEventData) => void
      onRevenueWithdrawn?: (event: ContractEventData) => void
    }
  ): void {
    // Initialize integration
    EventUIIntegration.initialize(chainId)
    EventUIIntegration.addOrganizerFilter(organizerAddress)

    // Register UI update callbacks
    if (callbacks.onEventCreated) {
      UIUpdateHelpers.registerEventListUpdate(
        'organizer-events',
        callbacks.onEventCreated,
        { debounceMs: 1000, batchUpdates: true }
      )
    }

    if (callbacks.onTicketPurchased) {
      UIUpdateHelpers.registerTicketSalesUpdate(
        'organizer-sales',
        callbacks.onTicketPurchased,
        { debounceMs: 500, batchUpdates: true }
      )
    }

    if (callbacks.onEventStatusChanged) {
      UIUpdateHelpers.registerEventListUpdate(
        'organizer-status',
        callbacks.onEventStatusChanged,
        { debounceMs: 1000, batchUpdates: false }
      )
    }

    if (callbacks.onRevenueWithdrawn) {
      UIUpdateHelpers.registerRevenueUpdate(
        'organizer-revenue',
        callbacks.onRevenueWithdrawn,
        { debounceMs: 1000 }
      )
    }
  }

  /**
   * Clean up organizer dashboard integration
   */
  static cleanupOrganizerDashboard(): void {
    UIUpdateHelpers.unregister('organizer-events')
    UIUpdateHelpers.unregister('organizer-sales')
    UIUpdateHelpers.unregister('organizer-status')
    UIUpdateHelpers.unregister('organizer-revenue')
    EventUIIntegration.cleanup()
  }

  /**
   * Set up integration for public event browsing
   */
  static setupPublicEventBrowsing(
    chainId: number,
    callbacks: {
      onEventCreated?: (event: ContractEventData) => void
      onTicketPurchased?: (event: ContractEventData) => void
    }
  ): void {
    // Initialize integration without organizer filter
    EventUIIntegration.initialize(chainId)

    // Register UI update callbacks
    if (callbacks.onEventCreated) {
      UIUpdateHelpers.registerEventListUpdate(
        'public-events',
        callbacks.onEventCreated,
        { debounceMs: 2000, batchUpdates: true }
      )
    }

    if (callbacks.onTicketPurchased) {
      UIUpdateHelpers.registerTicketSalesUpdate(
        'public-sales',
        callbacks.onTicketPurchased,
        { debounceMs: 1000, batchUpdates: true }
      )
    }
  }

  /**
   * Clean up public event browsing integration
   */
  static cleanupPublicEventBrowsing(): void {
    UIUpdateHelpers.unregister('public-events')
    UIUpdateHelpers.unregister('public-sales')
    EventUIIntegration.cleanup()
  }
}
