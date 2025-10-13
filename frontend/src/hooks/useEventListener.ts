import { useEffect, useCallback, useRef } from 'react'
import { useChainId } from 'wagmi'
import { EventListenerFactory, GlobalEventListener } from '../services/EventListenerFactory'
import type {
  EventCallback,
  EventFilter,
  ContractEventType
} from '../services/EventListenerService'

/**
 * Hook configuration options
 */
export interface UseEventListenerOptions {
  enabled?: boolean
  pollingInterval?: number
  batchSize?: number
  filter?: EventFilter
  onError?: (error: Error) => void
}

/**
 * Hook return type
 */
export interface UseEventListenerReturn {
  isListening: boolean
  listenerCount: number
  lastProcessedBlock: bigint
  addListener: (listenerId: string, callback: EventCallback, filter?: EventFilter) => void
  removeListener: (listenerId: string) => void
  triggerPoll: () => Promise<void>
}

/**
 * React hook for listening to smart contract events
 */
export function useEventListener(
  eventTypes: ContractEventType[] = ['EventCreated', 'TicketPurchased', 'EventStatusChanged', 'RevenueWithdrawn'],
  options: UseEventListenerOptions = {}
): UseEventListenerReturn {
  const chainId = useChainId()
  const {
    enabled = true,
    pollingInterval = 5000,
    batchSize = 100,
    filter = {},
    onError,
  } = options

  const listenerServiceRef = useRef<any>(null)
  const listenersRef = useRef<Map<string, EventCallback>>(new Map())

  // Initialize event listener service
  useEffect(() => {
    if (!enabled || !chainId) return

    try {
      listenerServiceRef.current = EventListenerFactory.getInstance(chainId, {
        pollingInterval,
        batchSize,
      })
    } catch (error) {
      console.error('Failed to initialize event listener:', error)
      onError?.(error as Error)
    }

    return () => {
      // Cleanup is handled by the factory
    }
  }, [chainId, enabled, pollingInterval, batchSize, onError])

  // Handle network switching
  useEffect(() => {
    if (!enabled) return

    const previousChainId = listenerServiceRef.current?.getConfig().chainId

    if (previousChainId && previousChainId !== chainId) {
      // Migrate listeners to new chain
      const listenersToMigrate = Array.from(listenersRef.current.entries()).map(
        ([listenerId, callback]) => ({
          listenerId,
          callback,
          filter: { ...filter, eventTypes },
        })
      )

      if (listenersToMigrate.length > 0) {
        EventListenerFactory.handleNetworkSwitch(
          previousChainId,
          chainId,
          listenersToMigrate,
          { pollingInterval, batchSize }
        )
      }

      // Update service reference
      listenerServiceRef.current = EventListenerFactory.getInstance(chainId, {
        pollingInterval,
        batchSize,
      })
    }
  }, [chainId, enabled, eventTypes, filter, pollingInterval, batchSize])

  // Add event listener
  const addListener = useCallback((
    listenerId: string,
    callback: EventCallback,
    customFilter?: EventFilter
  ) => {
    if (!listenerServiceRef.current) return

    const combinedFilter = {
      ...filter,
      ...customFilter,
      eventTypes: customFilter?.eventTypes || eventTypes,
    }

    try {
      listenerServiceRef.current.addEventListener(listenerId, callback, combinedFilter)
      listenersRef.current.set(listenerId, callback)
    } catch (error) {
      console.error('Failed to add event listener:', error)
      onError?.(error as Error)
    }
  }, [eventTypes, filter, onError])

  // Remove event listener
  const removeListener = useCallback((listenerId: string) => {
    if (!listenerServiceRef.current) return

    try {
      listenerServiceRef.current.removeEventListener(listenerId)
      listenersRef.current.delete(listenerId)
    } catch (error) {
      console.error('Failed to remove event listener:', error)
      onError?.(error as Error)
    }
  }, [onError])

  // Trigger manual poll
  const triggerPoll = useCallback(async () => {
    if (!listenerServiceRef.current) return

    try {
      await listenerServiceRef.current.triggerPoll()
    } catch (error) {
      console.error('Failed to trigger poll:', error)
      onError?.(error as Error)
    }
  }, [onError])

  // Get current status
  const isListening = listenerServiceRef.current?.isCurrentlyListening() || false
  const listenerCount = listenerServiceRef.current?.getListenerCount() || 0
  const lastProcessedBlock = listenerServiceRef.current?.getLastProcessedBlock() || 0n

  return {
    isListening,
    listenerCount,
    lastProcessedBlock,
    addListener,
    removeListener,
    triggerPoll,
  }
}

/**
 * Hook for listening to specific event types with automatic callback management
 */
export function useContractEvents(
  callback: EventCallback,
  eventTypes: ContractEventType[] = ['EventCreated', 'TicketPurchased', 'EventStatusChanged', 'RevenueWithdrawn'],
  options: UseEventListenerOptions = {}
) {
  const { addListener, removeListener, ...rest } = useEventListener(eventTypes, options)
  const callbackRef = useRef(callback)
  const listenerIdRef = useRef(`contract-events-${Date.now()}-${Math.random()}`)

  // Update callback reference
  useEffect(() => {
    callbackRef.current = callback
  }, [callback])

  // Add listener on mount, remove on unmount
  useEffect(() => {
    const listenerId = listenerIdRef.current

    addListener(listenerId, (event) => {
      callbackRef.current(event)
    })

    return () => {
      removeListener(listenerId)
    }
  }, [addListener, removeListener])

  return rest
}

/**
 * Hook for listening to organizer-specific events
 */
export function useOrganizerEvents(
  organizerAddress: `0x${string}` | undefined,
  callback: EventCallback,
  options: UseEventListenerOptions = {}
) {
  const filter: EventFilter = {
    ...options.filter,
    organizerAddress,
  }

  return useContractEvents(callback, undefined, {
    ...options,
    filter,
    enabled: options.enabled && !!organizerAddress,
  })
}

/**
 * Hook for listening to specific event ID events
 */
export function useEventSpecificEvents(
  eventIds: bigint[],
  callback: EventCallback,
  options: UseEventListenerOptions = {}
) {
  const filter: EventFilter = {
    ...options.filter,
    eventIds,
  }

  return useContractEvents(callback, undefined, {
    ...options,
    filter,
    enabled: options.enabled && eventIds.length > 0,
  })
}

/**
 * Hook for global event listening that persists across network switches
 */
export function useGlobalEventListener(
  listenerId: string,
  callback: EventCallback,
  options: UseEventListenerOptions & {
    eventTypes?: ContractEventType[]
    filter?: EventFilter
  } = {}
) {
  const chainId = useChainId()
  const {
    enabled = true,
    eventTypes = ['EventCreated', 'TicketPurchased', 'EventStatusChanged', 'RevenueWithdrawn'],
    filter = {},
    onError,
  } = options

  const callbackRef = useRef(callback)

  // Update callback reference
  useEffect(() => {
    callbackRef.current = callback
  }, [callback])

  // Add global listener
  useEffect(() => {
    if (!enabled || !chainId) return

    try {
      GlobalEventListener.addGlobalListener(
        listenerId,
        chainId,
        (event) => callbackRef.current(event),
        { ...filter, eventTypes }
      )
    } catch (error) {
      console.error('Failed to add global event listener:', error)
      onError?.(error as Error)
    }

    return () => {
      GlobalEventListener.removeGlobalListener(listenerId)
    }
  }, [listenerId, chainId, enabled, eventTypes, filter, onError])

  // Handle network switching
  useEffect(() => {
    const handleNetworkChange = (oldChainId: number, newChainId: number) => {
      try {
        GlobalEventListener.handleNetworkSwitch(oldChainId, newChainId)
      } catch (error) {
        console.error('Failed to handle network switch:', error)
        onError?.(error as Error)
      }
    }

    // This would be called by your network switching logic
    // For now, it's just a placeholder
    return () => {
      // Cleanup if needed
    }
  }, [onError])
}

/**
 * Utility hook for debugging event listeners
 */
export function useEventListenerDebug() {
  const getStatus = useCallback(() => {
    return EventListenerFactory.getStatus()
  }, [])

  const getTotalListeners = useCallback(() => {
    return EventListenerFactory.getTotalListenerCount()
  }, [])

  const isAnyListening = useCallback(() => {
    return EventListenerFactory.isAnyInstanceListening()
  }, [])

  const triggerPollAll = useCallback(async () => {
    await EventListenerFactory.triggerPollForAll()
  }, [])

  return {
    getStatus,
    getTotalListeners,
    isAnyListening,
    triggerPollAll,
  }
}
