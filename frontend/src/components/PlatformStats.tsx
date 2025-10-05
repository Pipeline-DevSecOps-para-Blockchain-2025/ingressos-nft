import React from 'react'
import { formatEther } from '../utils'

interface PlatformStatsProps {
  className?: string
}

interface PlatformMetrics {
  totalEvents: number
  activeEvents: number
  totalTicketsSold: number
  totalRevenue: bigint
  totalUsers: number
  totalOrganizers: number
}

interface RecentActivity {
  id: string
  type: 'event_created' | 'ticket_purchased' | 'event_completed' | 'organizer_added'
  description: string
  timestamp: number
  amount?: bigint
}

const PlatformStats: React.FC<PlatformStatsProps> = ({
  className = ''
}) => {
  // Mock platform metrics - in a real app, this would be fetched from the contract/backend
  const metrics: PlatformMetrics = {
    totalEvents: 156,
    activeEvents: 23,
    totalTicketsSold: 8432,
    totalRevenue: BigInt('2847500000000000000000'), // 2847.5 ETH
    totalUsers: 1247,
    totalOrganizers: 34,
  }

  // Mock recent activity - in a real app, this would be fetched from events/logs
  const recentActivity: RecentActivity[] = [
    {
      id: '1',
      type: 'ticket_purchased',
      description: 'Ticket purchased for "Tech Conference 2025"',
      timestamp: Date.now() - 300000, // 5 minutes ago
      amount: BigInt('50000000000000000'), // 0.05 ETH
    },
    {
      id: '2',
      type: 'event_created',
      description: 'New event "Music Festival" created by organizer',
      timestamp: Date.now() - 1800000, // 30 minutes ago
    },
    {
      id: '3',
      type: 'ticket_purchased',
      description: 'Ticket purchased for "Art Exhibition"',
      timestamp: Date.now() - 3600000, // 1 hour ago
      amount: BigInt('25000000000000000'), // 0.025 ETH
    },
    {
      id: '4',
      type: 'organizer_added',
      description: 'New organizer role granted to 0x1234...5678',
      timestamp: Date.now() - 7200000, // 2 hours ago
    },
    {
      id: '5',
      type: 'event_completed',
      description: 'Event "Workshop Series" marked as completed',
      timestamp: Date.now() - 10800000, // 3 hours ago
    },
  ]

  const getActivityIcon = (type: RecentActivity['type']) => {
    switch (type) {
      case 'event_created': return '🎪'
      case 'ticket_purchased': return '🎫'
      case 'event_completed': return '✅'
      case 'organizer_added': return '👤'
      default: return '📝'
    }
  }

  const getActivityColor = (type: RecentActivity['type']) => {
    switch (type) {
      case 'event_created': return 'text-blue-600'
      case 'ticket_purchased': return 'text-green-600'
      case 'event_completed': return 'text-purple-600'
      case 'organizer_added': return 'text-orange-600'
      default: return 'text-gray-600'
    }
  }

  const formatTimeAgo = (timestamp: number): string => {
    const now = Date.now()
    const diff = now - timestamp
    const minutes = Math.floor(diff / 60000)
    const hours = Math.floor(diff / 3600000)
    const days = Math.floor(diff / 86400000)

    if (days > 0) return `${days}d ago`
    if (hours > 0) return `${hours}h ago`
    if (minutes > 0) return `${minutes}m ago`
    return 'Just now'
  }

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Platform Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <div className="bg-white rounded-lg p-6 border border-gray-200">
          <div className="flex items-center">
            <div className="text-3xl mr-4">🎪</div>
            <div>
              <p className="text-sm font-medium text-gray-600">Total Events</p>
              <p className="text-2xl font-bold text-gray-900">{metrics.totalEvents}</p>
              <p className="text-xs text-green-600 mt-1">
                {metrics.activeEvents} currently active
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg p-6 border border-gray-200">
          <div className="flex items-center">
            <div className="text-3xl mr-4">🎫</div>
            <div>
              <p className="text-sm font-medium text-gray-600">Tickets Sold</p>
              <p className="text-2xl font-bold text-blue-600">{metrics.totalTicketsSold.toLocaleString()}</p>
              <p className="text-xs text-gray-500 mt-1">
                Across all events
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg p-6 border border-gray-200">
          <div className="flex items-center">
            <div className="text-3xl mr-4">💰</div>
            <div>
              <p className="text-sm font-medium text-gray-600">Total Revenue</p>
              <p className="text-2xl font-bold text-purple-600">
                {formatEther(metrics.totalRevenue)} ETH
              </p>
              <p className="text-xs text-gray-500 mt-1">
                Platform lifetime
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg p-6 border border-gray-200">
          <div className="flex items-center">
            <div className="text-3xl mr-4">👥</div>
            <div>
              <p className="text-sm font-medium text-gray-600">Total Users</p>
              <p className="text-2xl font-bold text-green-600">{metrics.totalUsers.toLocaleString()}</p>
              <p className="text-xs text-gray-500 mt-1">
                Unique wallet addresses
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg p-6 border border-gray-200">
          <div className="flex items-center">
            <div className="text-3xl mr-4">🏢</div>
            <div>
              <p className="text-sm font-medium text-gray-600">Organizers</p>
              <p className="text-2xl font-bold text-orange-600">{metrics.totalOrganizers}</p>
              <p className="text-xs text-gray-500 mt-1">
                Active event organizers
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg p-6 border border-gray-200">
          <div className="flex items-center">
            <div className="text-3xl mr-4">📊</div>
            <div>
              <p className="text-sm font-medium text-gray-600">Avg. Ticket Price</p>
              <p className="text-2xl font-bold text-indigo-600">
                {formatEther(metrics.totalRevenue / BigInt(metrics.totalTicketsSold))} ETH
              </p>
              <p className="text-xs text-gray-500 mt-1">
                Platform average
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Recent Activity */}
      <div className="bg-white rounded-lg border border-gray-200">
        <div className="p-6 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900">Recent Platform Activity</h3>
          <p className="text-gray-600 text-sm mt-1">
            Latest events and transactions across the platform
          </p>
        </div>
        <div className="p-6">
          <div className="space-y-4">
            {recentActivity.map((activity) => (
              <div key={activity.id} className="flex items-start gap-4 p-4 bg-gray-50 rounded-lg">
                <div className="text-2xl">
                  {getActivityIcon(activity.type)}
                </div>
                <div className="flex-1 min-w-0">
                  <p className={`font-medium ${getActivityColor(activity.type)}`}>
                    {activity.description}
                  </p>
                  <div className="flex items-center gap-4 mt-1">
                    <p className="text-sm text-gray-500">
                      {formatTimeAgo(activity.timestamp)}
                    </p>
                    {activity.amount && (
                      <p className="text-sm font-medium text-green-600">
                        {formatEther(activity.amount)} ETH
                      </p>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Platform Health */}
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Platform Health</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="text-center">
            <div className="text-3xl mb-2">🟢</div>
            <p className="font-medium text-gray-900">System Status</p>
            <p className="text-sm text-green-600">All systems operational</p>
          </div>
          <div className="text-center">
            <div className="text-3xl mb-2">⚡</div>
            <p className="font-medium text-gray-900">Network</p>
            <p className="text-sm text-blue-600">Sepolia Testnet</p>
          </div>
          <div className="text-center">
            <div className="text-3xl mb-2">🔒</div>
            <p className="font-medium text-gray-900">Security</p>
            <p className="text-sm text-purple-600">Contract verified</p>
          </div>
        </div>
      </div>
    </div>
  )
}

export default PlatformStats
