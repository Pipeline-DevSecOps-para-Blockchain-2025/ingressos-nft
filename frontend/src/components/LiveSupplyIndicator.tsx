import React, { useEffect, useState } from 'react'
import { useLiveUpdates } from '../hooks/useLiveUpdates'

interface LiveSupplyIndicatorProps {
  eventId: number
  currentSupply: number
  maxSupply: number
  onSupplyUpdate?: (newSupply: number) => void
  className?: string
}

const LiveSupplyIndicator: React.FC<LiveSupplyIndicatorProps> = ({
  eventId,
  currentSupply,
  maxSupply,
  onSupplyUpdate,
  className = ''
}) => {
  const [displaySupply, setDisplaySupply] = useState(currentSupply)
  const [isUpdating, setIsUpdating] = useState(false)
  const [lastUpdateTime, setLastUpdateTime] = useState<number | null>(null)

  const { isLive } = useLiveUpdates(
    {
      enableNotifications: false, // Don't show notifications for individual supply updates
      enableAutoRefresh: true,
      refreshInterval: 15000, // Check every 15 seconds
    },
    () => {
      // This would typically fetch the latest supply from the contract
      // For now, we'll simulate updates
      refreshSupply()
    }
  )

  // Simulate supply updates (in a real app, this would query the contract)
  const refreshSupply = async () => {
    setIsUpdating(true)

    try {
      // Simulate API call delay
      await new Promise(resolve => setTimeout(resolve, 500))

      // In a real app, you would call the contract here
      // const newSupply = await contract.getEventCurrentSupply(eventId)

      // For demo purposes, occasionally simulate a supply change
      const shouldUpdate = Math.random() < 0.1 // 10% chance of update
      if (shouldUpdate && displaySupply < maxSupply) {
        const newSupply = displaySupply + 1
        setDisplaySupply(newSupply)
        setLastUpdateTime(Date.now())
        onSupplyUpdate?.(newSupply)
      }
    } catch (error) {
      console.error('Error refreshing supply:', error)
    } finally {
      setIsUpdating(false)
    }
  }

  // Update display when prop changes
  useEffect(() => {
    if (currentSupply !== displaySupply) {
      setDisplaySupply(currentSupply)
      setLastUpdateTime(Date.now())
    }
  }, [currentSupply, displaySupply])

  const soldPercentage = maxSupply > 0 ? (displaySupply / maxSupply) * 100 : 0
  const remaining = maxSupply - displaySupply
  const isNearSoldOut = remaining <= 10 && remaining > 0
  const isSoldOut = remaining === 0

  const getStatusColor = () => {
    if (isSoldOut) return 'text-red-600'
    if (isNearSoldOut) return 'text-orange-600'
    return 'text-green-600'
  }

  const getProgressColor = () => {
    if (isSoldOut) return 'bg-red-500'
    if (isNearSoldOut) return 'bg-orange-500'
    return 'bg-green-500'
  }

  const formatLastUpdate = () => {
    if (!lastUpdateTime) return null

    const now = Date.now()
    const diff = now - lastUpdateTime
    const seconds = Math.floor(diff / 1000)
    const minutes = Math.floor(seconds / 60)

    if (minutes > 0) return `${minutes}m ago`
    if (seconds > 0) return `${seconds}s ago`
    return 'Just now'
  }

  return (
    <div className={`bg-white rounded-lg border border-gray-200 p-4 ${className}`}>
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <h4 className="font-medium text-gray-900">Ticket Availability</h4>
          {isLive && (
            <div className="flex items-center gap-1">
              <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
              <span className="text-xs text-green-600">Live</span>
            </div>
          )}
        </div>

        {isUpdating && (
          <div className="text-blue-600">
            <svg className="w-4 h-4 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
          </div>
        )}
      </div>

      {/* Supply Numbers */}
      <div className="flex items-center justify-between mb-3">
        <div className="text-2xl font-bold text-gray-900">
          {displaySupply.toLocaleString()} / {maxSupply.toLocaleString()}
        </div>
        <div className={`text-sm font-medium ${getStatusColor()}`}>
          {isSoldOut ? 'Sold Out' : `${remaining} left`}
        </div>
      </div>

      {/* Progress Bar */}
      <div className="w-full bg-gray-200 rounded-full h-2 mb-3">
        <div
          className={`h-2 rounded-full transition-all duration-500 ${getProgressColor()}`}
          style={{ width: `${Math.min(soldPercentage, 100)}%` }}
        ></div>
      </div>

      {/* Status Messages */}
      <div className="flex items-center justify-between text-xs text-gray-500">
        <span>{soldPercentage.toFixed(1)}% sold</span>
        {lastUpdateTime && (
          <span>Updated {formatLastUpdate()}</span>
        )}
      </div>

      {/* Availability Status */}
      {isSoldOut && (
        <div className="mt-3 p-2 bg-red-50 border border-red-200 rounded text-center">
          <span className="text-red-800 text-sm font-medium">🎫 Event Sold Out</span>
        </div>
      )}

      {isNearSoldOut && !isSoldOut && (
        <div className="mt-3 p-2 bg-orange-50 border border-orange-200 rounded text-center">
          <span className="text-orange-800 text-sm font-medium">⚡ Almost Sold Out - Only {remaining} tickets left!</span>
        </div>
      )}

      {!isNearSoldOut && !isSoldOut && remaining <= maxSupply * 0.5 && (
        <div className="mt-3 p-2 bg-blue-50 border border-blue-200 rounded text-center">
          <span className="text-blue-800 text-sm font-medium">🔥 More than half sold - Get your tickets now!</span>
        </div>
      )}
    </div>
  )
}

export default LiveSupplyIndicator
