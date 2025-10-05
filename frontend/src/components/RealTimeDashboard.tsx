import React, { useState } from 'react'
import ActivityFeed from './ActivityFeed'
import LiveSupplyIndicator from './LiveSupplyIndicator'
import { useLiveUpdates } from '../hooks/useLiveUpdates'
import { useEvents } from '../hooks/useEvents'
import { formatEther } from '../utils'

interface RealTimeDashboardProps {
  variant?: 'full' | 'compact' | 'sidebar'
  showActivityFeed?: boolean
  showSupplyIndicators?: boolean
  showLiveStats?: boolean
  className?: string
}

const RealTimeDashboard: React.FC<RealTimeDashboardProps> = ({
  variant = 'full',
  showActivityFeed = true,
  showSupplyIndicators = true,
  showLiveStats = true,
  className = ''
}) => {
  const { events, refetch } = useEvents()
  const [refreshCount, setRefreshCount] = useState(0)
  
  const { isLive, lastUpdate, eventCount, startLiveUpdates, stopLiveUpdates, refreshData } = useLiveUpdates(
    {
      enableNotifications: false, // Notifications are handled at the app level
      enableAutoRefresh: true,
      refreshInterval: 30000, // 30 seconds
    },
    () => {
      refetch()
      setRefreshCount(prev => prev + 1)
    }
  )

  const formatLastUpdate = () => {
    if (!lastUpdate) return 'Never'
    
    const now = Date.now()
    const diff = now - lastUpdate
    const minutes = Math.floor(diff / 60000)
    const seconds = Math.floor((diff % 60000) / 1000)
    
    if (minutes > 0) return `${minutes}m ${seconds}s ago`
    return `${seconds}s ago`
  }

  const activeEvents = events.filter(event => event.status === 0)
  const totalTicketsSold = events.reduce((sum, event) => sum + Number(event.currentSupply), 0)
  const totalRevenue = events.reduce((sum, event) => sum + (event.ticketPrice * event.currentSupply), 0n)

  if (variant === 'compact') {
    return (
      <div className={`bg-white rounded-lg border border-gray-200 p-4 ${className}`}>
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold text-gray-900">Live Updates</h3>
          <div className="flex items-center gap-2">
            {isLive ? (
              <div className="flex items-center gap-1">
                <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                <span className="text-xs text-green-600">Live</span>
              </div>
            ) : (
              <button
                onClick={startLiveUpdates}
                className="text-xs text-blue-600 hover:text-blue-800 underline"
              >
                Start Live Updates
              </button>
            )}
          </div>
        </div>
        
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <p className="text-gray-600">Events Tracked</p>
            <p className="font-semibold">{eventCount}</p>
          </div>
          <div>
            <p className="text-gray-600">Last Update</p>
            <p className="font-semibold">{formatLastUpdate()}</p>
          </div>
        </div>
      </div>
    )
  }

  if (variant === 'sidebar') {
    return (
      <div className={`space-y-4 ${className}`}>
        {/* Live Stats */}
        {showLiveStats && (
          <div className="bg-white rounded-lg border border-gray-200 p-4">
            <div className="flex items-center justify-between mb-3">
              <h4 className="font-medium text-gray-900">Live Stats</h4>
              {isLive && (
                <div className="flex items-center gap-1">
                  <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                  <span className="text-xs text-green-600">Live</span>
                </div>
              )}
            </div>
            
            <div className="space-y-3 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-600">Active Events</span>
                <span className="font-semibold">{activeEvents.length}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Tickets Sold</span>
                <span className="font-semibold">{totalTicketsSold.toLocaleString()}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Total Revenue</span>
                <span className="font-semibold">{formatEther(totalRevenue)} ETH</span>
              </div>
            </div>
          </div>
        )}

        {/* Activity Feed */}
        {showActivityFeed && (
          <ActivityFeed maxItems={5} showFilters={false} />
        )}

        {/* Supply Indicators for Active Events */}
        {showSupplyIndicators && activeEvents.slice(0, 3).map((event) => (
          <LiveSupplyIndicator
            key={event.eventId}
            eventId={event.eventId}
            currentSupply={Number(event.currentSupply)}
            maxSupply={Number(event.maxSupply)}
          />
        ))}
      </div>
    )
  }

  // Full variant
  return (
    <div className={`space-y-6 ${className}`}>
      {/* Header */}
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-xl font-semibold text-gray-900">Real-Time Dashboard</h2>
            <p className="text-gray-600 text-sm mt-1">
              Live updates and monitoring for platform activity
            </p>
          </div>
          
          <div className="flex items-center gap-4">
            <div className="text-right text-sm">
              <p className="text-gray-600">Last Update</p>
              <p className="font-medium">{formatLastUpdate()}</p>
            </div>
            
            <div className="flex items-center gap-2">
              {isLive ? (
                <button
                  onClick={stopLiveUpdates}
                  className="px-3 py-1 bg-red-100 text-red-700 rounded text-sm hover:bg-red-200 transition-colors"
                >
                  Stop Live Updates
                </button>
              ) : (
                <button
                  onClick={startLiveUpdates}
                  className="px-3 py-1 bg-green-100 text-green-700 rounded text-sm hover:bg-green-200 transition-colors"
                >
                  Start Live Updates
                </button>
              )}
              
              <button
                onClick={refreshData}
                className="p-2 text-gray-600 hover:text-gray-900 transition-colors"
                title="Manual refresh"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
              </button>
            </div>
          </div>
        </div>

        {/* Live Stats Grid */}
        {showLiveStats && (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="bg-blue-50 rounded-lg p-4">
              <div className="flex items-center">
                <div className="text-2xl mr-3">🎪</div>
                <div>
                  <p className="text-sm text-blue-600">Active Events</p>
                  <p className="text-xl font-bold text-blue-900">{activeEvents.length}</p>
                </div>
              </div>
            </div>
            
            <div className="bg-green-50 rounded-lg p-4">
              <div className="flex items-center">
                <div className="text-2xl mr-3">🎫</div>
                <div>
                  <p className="text-sm text-green-600">Tickets Sold</p>
                  <p className="text-xl font-bold text-green-900">{totalTicketsSold.toLocaleString()}</p>
                </div>
              </div>
            </div>
            
            <div className="bg-purple-50 rounded-lg p-4">
              <div className="flex items-center">
                <div className="text-2xl mr-3">💰</div>
                <div>
                  <p className="text-sm text-purple-600">Total Revenue</p>
                  <p className="text-xl font-bold text-purple-900">{formatEther(totalRevenue)} ETH</p>
                </div>
              </div>
            </div>
            
            <div className="bg-orange-50 rounded-lg p-4">
              <div className="flex items-center">
                <div className="text-2xl mr-3">📡</div>
                <div>
                  <p className="text-sm text-orange-600">Live Events</p>
                  <p className="text-xl font-bold text-orange-900">{eventCount}</p>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Activity Feed */}
        {showActivityFeed && (
          <div className="lg:col-span-2">
            <ActivityFeed maxItems={20} showFilters={true} />
          </div>
        )}

        {/* Supply Indicators */}
        {showSupplyIndicators && (
          <div className="space-y-4">
            <h3 className="font-semibold text-gray-900">Live Supply Updates</h3>
            {activeEvents.slice(0, 5).map((event) => (
              <LiveSupplyIndicator
                key={event.eventId}
                eventId={event.eventId}
                currentSupply={Number(event.currentSupply)}
                maxSupply={Number(event.maxSupply)}
              />
            ))}
            
            {activeEvents.length === 0 && (
              <div className="text-center py-8 text-gray-500">
                <div className="text-4xl mb-2">📊</div>
                <p>No active events to monitor</p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

export default RealTimeDashboard