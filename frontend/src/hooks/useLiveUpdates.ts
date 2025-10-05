import { useEffect, useCallback, useState } from 'react'
import { useContractEvents } from './useContractEvents'
import { useNotifications } from './useNotifications'
import { formatEther } from '../utils'

export interface LiveUpdateConfig {
  enableNotifications?: boolean
  enableAutoRefresh?: boolean
  refreshInterval?: number // in milliseconds
}

export interface UseLiveUpdatesReturn {
  isLive: boolean
  lastUpdate: number | null
  eventCount: number
  startLiveUpdates: () => void
  stopLiveUpdates: () => void
  refreshData: () => void
}

export const useLiveUpdates = (
  config: LiveUpdateConfig = {},
  onDataUpdate?: () => void
): UseLiveUpdatesReturn => {
  const {
    enableNotifications = true,
    enableAutoRefresh = true,
    refreshInterval = 30000 // 30 seconds
  } = config

  const { events: contractEvents, isListening, startListening, stopListening } = useContractEvents()
  const { addSuccess, addInfo, addWarning } = useNotifications()
  
  const [isLive, setIsLive] = useState(false)
  const [lastUpdate, setLastUpdate] = useState<number | null>(null)
  const [refreshTimer, setRefreshTimer] = useState<NodeJS.Timeout | null>(null)

  // Handle new contract events
  useEffect(() => {
    if (!isLive || contractEvents.length === 0) return

    const latestEvent = contractEvents[0]
    setLastUpdate(Date.now())

    // Trigger data refresh callback
    if (onDataUpdate) {
      onDataUpdate()
    }

    // Show notifications if enabled
    if (enableNotifications) {
      switch (latestEvent.type) {
        case 'EventCreated':
          addInfo(
            'New Event Available',
            `"${latestEvent.data.name}" is now accepting ticket purchases`,
            {
              label: 'View Event',
              onClick: () => {
                // This would navigate to the specific event
                console.log('Navigate to event:', latestEvent.data.eventId)
              }
            }
          )
          break
          
        case 'TicketPurchased':
          addSuccess(
            'Ticket Sale',
            `Ticket #${latestEvent.data.ticketNumber} sold for ${formatEther(latestEvent.data.price)} ETH`
          )
          break
          
        case 'EventStatusChanged':
          const statusNames = ['Active', 'Paused', 'Cancelled', 'Completed']
          const newStatus = statusNames[latestEvent.data.newStatus] || 'Unknown'
          addWarning(
            'Event Status Update',
            `Event #${latestEvent.data.eventId} is now ${newStatus}`
          )
          break
          
        case 'RevenueWithdrawn':
          addSuccess(
            'Revenue Withdrawal',
            `${formatEther(latestEvent.data.amount)} ETH withdrawn from event #${latestEvent.data.eventId}`
          )
          break
      }
    }
  }, [contractEvents, isLive, onDataUpdate, enableNotifications, addSuccess, addInfo, addWarning])

  // Auto-refresh timer
  useEffect(() => {
    if (!isLive || !enableAutoRefresh) {
      if (refreshTimer) {
        clearInterval(refreshTimer)
        setRefreshTimer(null)
      }
      return
    }

    const timer = setInterval(() => {
      if (onDataUpdate) {
        onDataUpdate()
        setLastUpdate(Date.now())
      }
    }, refreshInterval)

    setRefreshTimer(timer)

    return () => {
      clearInterval(timer)
    }
  }, [isLive, enableAutoRefresh, refreshInterval, onDataUpdate])

  // Start live updates
  const startLiveUpdates = useCallback(() => {
    setIsLive(true)
    startListening()
    setLastUpdate(Date.now())
  }, [startListening])

  // Stop live updates
  const stopLiveUpdates = useCallback(() => {
    setIsLive(false)
    stopListening()
    if (refreshTimer) {
      clearInterval(refreshTimer)
      setRefreshTimer(null)
    }
  }, [stopListening, refreshTimer])

  // Manual refresh
  const refreshData = useCallback(() => {
    if (onDataUpdate) {
      onDataUpdate()
      setLastUpdate(Date.now())
    }
  }, [onDataUpdate])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (refreshTimer) {
        clearInterval(refreshTimer)
      }
    }
  }, [refreshTimer])

  return {
    isLive: isLive && isListening,
    lastUpdate,
    eventCount: contractEvents.length,
    startLiveUpdates,
    stopLiveUpdates,
    refreshData,
  }
}