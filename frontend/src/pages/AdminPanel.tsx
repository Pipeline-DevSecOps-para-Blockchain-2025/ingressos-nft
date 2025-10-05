import React, { useState } from 'react'
import { useWallet } from '../hooks/useWallet'
import { useAdminRole } from '../hooks/useAdminRole'
import { useOrganizerRole } from '../hooks/useOrganizerRole'
import RoleManagement from '../components/RoleManagement'
import PlatformStats from '../components/PlatformStats'
import ActivityFeed from '../components/ActivityFeed'
import WalletConnection from '../components/WalletConnection'

const AdminPanel: React.FC = () => {
  const { isConnected } = useWallet()
  const { isAdmin, isLoading: adminLoading } = useAdminRole()
  const { isOrganizer, isLoading: organizerLoading } = useOrganizerRole()
  
  const roleLoading = adminLoading || organizerLoading
  const hasAccess = isAdmin || isOrganizer
  const [activeTab, setActiveTab] = useState<'overview' | 'roles' | 'activity'>('overview')

  if (!isConnected) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-3xl font-bold text-gray-900 mb-4">Admin Panel</h1>
          <p className="text-gray-600 mb-8">Connect your wallet to access the admin panel</p>
          <WalletConnection />
        </div>
      </div>
    )
  }

  if (roleLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Checking admin permissions...</p>
        </div>
      </div>
    )
  }

  if (!hasAccess) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center max-w-md">
          <div className="text-6xl mb-4">🔒</div>
          <h1 className="text-3xl font-bold text-gray-900 mb-4">Access Denied</h1>
          <p className="text-gray-600 mb-6">
            You don't have administrator permissions. Only contract administrators can access this panel.
          </p>
          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <p className="text-red-800 text-sm">
              <strong>Admin or Organizer Access Required:</strong> This panel is restricted to users with the ADMIN_ROLE or ORGANIZER_ROLE on the smart contract.
            </p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Admin Panel</h1>
          <p className="text-gray-600">
            Manage platform settings, user roles, and monitor system activity
          </p>
        </div>

        {/* Navigation Tabs */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 mb-6">
          <div className="border-b border-gray-200">
            <nav className="flex space-x-8 px-6">
              {[
                { key: 'overview', label: 'Platform Overview', icon: '📊' },
                ...(isAdmin ? [{ key: 'roles', label: 'Role Management', icon: '👥' }] : []),
                { key: 'activity', label: 'Activity Monitor', icon: '📈' },
              ].map(({ key, label, icon }) => (
                <button
                  key={key}
                  onClick={() => setActiveTab(key as any)}
                  className={`flex items-center gap-2 py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
                    activeTab === key
                      ? 'border-blue-500 text-blue-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  <span>{icon}</span>
                  {label}
                </button>
              ))}
            </nav>
          </div>
        </div>

        {/* Tab Content */}
        {activeTab === 'overview' && (
          <div>
            <div className="mb-6">
              <h2 className="text-xl font-semibold text-gray-900 mb-2">Platform Overview</h2>
              <p className="text-gray-600">
                Monitor key metrics and platform health across all events and users.
              </p>
            </div>
            <PlatformStats />
          </div>
        )}

        {activeTab === 'roles' && (
          <div>
            <div className="mb-6">
              <h2 className="text-xl font-semibold text-gray-900 mb-2">Role Management</h2>
              <p className="text-gray-600">
                Grant and revoke organizer permissions for event creators.
              </p>
            </div>
            <RoleManagement />
          </div>
        )}

        {activeTab === 'activity' && (
          <div>
            <div className="mb-6">
              <h2 className="text-xl font-semibold text-gray-900 mb-2">Activity Monitor</h2>
              <p className="text-gray-600">
                Real-time monitoring of platform activity and recent transactions.
              </p>
            </div>
            
            {/* Activity Feed */}
            <ActivityFeed maxItems={50} showFilters={true} />
          </div>
        )}

        {/* Admin Actions */}
        <div className="mt-8 bg-gradient-to-r from-purple-500 to-purple-600 rounded-lg p-6 text-white">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-semibold mb-2">
                {isAdmin ? 'Administrator Privileges' : 'Organizer Privileges'}
              </h3>
              <p className="text-purple-100">
                {isAdmin 
                  ? 'You have full administrative access to manage the platform, grant roles, and monitor all activities.'
                  : 'You have organizer access to create events, manage tickets, and view platform statistics.'
                }
              </p>
            </div>
            <div className="text-6xl opacity-20">{isAdmin ? '🛡️' : '🎫'}</div>
          </div>
        </div>

        {/* Quick Stats Summary */}
        <div className="mt-6 grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="bg-white rounded-lg p-4 border border-gray-200 text-center">
            <div className="text-2xl font-bold text-blue-600">156</div>
            <div className="text-sm text-gray-600">Total Events</div>
          </div>
          <div className="bg-white rounded-lg p-4 border border-gray-200 text-center">
            <div className="text-2xl font-bold text-green-600">8,432</div>
            <div className="text-sm text-gray-600">Tickets Sold</div>
          </div>
          <div className="bg-white rounded-lg p-4 border border-gray-200 text-center">
            <div className="text-2xl font-bold text-purple-600">2,847</div>
            <div className="text-sm text-gray-600">ETH Revenue</div>
          </div>
          <div className="bg-white rounded-lg p-4 border border-gray-200 text-center">
            <div className="text-2xl font-bold text-orange-600">34</div>
            <div className="text-sm text-gray-600">Organizers</div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default AdminPanel