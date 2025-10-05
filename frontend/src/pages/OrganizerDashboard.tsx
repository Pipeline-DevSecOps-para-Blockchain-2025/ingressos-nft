import React, { useState } from 'react'
import { useWallet } from '../hooks/useWallet'
import { useOrganizerRole } from '../hooks/useOrganizerRole'
import { useOrganizerEvents } from '../hooks/useOrganizerEvents'
import CreateEventForm from '../components/CreateEventForm'
import EventManagement from '../components/EventManagement'
import WalletConnection from '../components/WalletConnection'
import { formatEther } from '../utils'

const OrganizerDashboard: React.FC = () => {
  const { isConnected } = useWallet()
  const { isOrganizer, isLoading: roleLoading } = useOrganizerRole()
  const { 
    events, 
    isLoading: eventsLoading, 
    error, 
    refetch, 
    createEvent, 
    updateEventStatus, 
    withdrawRevenue 
  } = useOrganizerEvents()
  
  const [activeTab, setActiveTab] = useState<'overview' | 'events' | 'create'>('overview')
  const [isCreatingEvent, setIsCreatingEvent] = useState(false)

  const handleCreateEvent = async (params: any) => {
    setIsCreatingEvent(true)
    try {
      await createEvent(params)
      setActiveTab('events') // Switch to events tab after creation
    } catch (error) {
      console.error('Error creating event:', error)
      throw error
    } finally {
      setIsCreatingEvent(false)
    }
  }

  // Calculate dashboard stats
  const dashboardStats = React.useMemo(() => {
    const totalEvents = events.length
    const activeEvents = events.filter(e => e.status === 0).length
    const totalRevenue = events.reduce((sum, event) => sum + event.stats.totalRevenue, 0n)
    const availableRevenue = events.reduce((sum, event) => sum + event.stats.availableRevenue, 0n)
    const totalTicketsSold = events.reduce((sum, event) => sum + event.stats.ticketsSold, 0)

    return {
      totalEvents,
      activeEvents,
      totalRevenue,
      availableRevenue,
      totalTicketsSold,
    }
  }, [events])

  if (!isConnected) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-3xl font-bold text-gray-900 mb-4">Organizer Dashboard</h1>
          <p className="text-gray-600 mb-8">Connect your wallet to access the organizer dashboard</p>
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
          <p className="text-gray-600">Checking organizer permissions...</p>
        </div>
      </div>
    )
  }

  if (!isOrganizer) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center max-w-md">
          <div className="text-6xl mb-4">🚫</div>
          <h1 className="text-3xl font-bold text-gray-900 mb-4">Access Denied</h1>
          <p className="text-gray-600 mb-6">
            You don't have organizer permissions. Contact an administrator to get organizer access.
          </p>
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
            <p className="text-yellow-800 text-sm">
              <strong>Note:</strong> Organizer role is required to create and manage events on this platform.
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
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Organizer Dashboard</h1>
          <p className="text-gray-600">
            Manage your events, track sales, and withdraw revenue
          </p>
        </div>

        {/* Navigation Tabs */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 mb-6">
          <div className="border-b border-gray-200">
            <nav className="flex space-x-8 px-6">
              {[
                { key: 'overview', label: 'Overview', icon: '📊' },
                { key: 'events', label: 'My Events', icon: '🎫' },
                { key: 'create', label: 'Create Event', icon: '➕' },
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
          <div className="space-y-6">
            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <div className="bg-white rounded-lg p-6 border border-gray-200">
                <div className="flex items-center">
                  <div className="text-3xl mr-4">🎪</div>
                  <div>
                    <p className="text-sm font-medium text-gray-600">Total Events</p>
                    <p className="text-2xl font-bold text-gray-900">{dashboardStats.totalEvents}</p>
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-lg p-6 border border-gray-200">
                <div className="flex items-center">
                  <div className="text-3xl mr-4">✅</div>
                  <div>
                    <p className="text-sm font-medium text-gray-600">Active Events</p>
                    <p className="text-2xl font-bold text-green-600">{dashboardStats.activeEvents}</p>
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-lg p-6 border border-gray-200">
                <div className="flex items-center">
                  <div className="text-3xl mr-4">🎫</div>
                  <div>
                    <p className="text-sm font-medium text-gray-600">Tickets Sold</p>
                    <p className="text-2xl font-bold text-blue-600">{dashboardStats.totalTicketsSold}</p>
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-lg p-6 border border-gray-200">
                <div className="flex items-center">
                  <div className="text-3xl mr-4">💰</div>
                  <div>
                    <p className="text-sm font-medium text-gray-600">Total Revenue</p>
                    <p className="text-2xl font-bold text-purple-600">
                      {formatEther(dashboardStats.totalRevenue)} ETH
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Available Revenue */}
            {dashboardStats.availableRevenue > 0n && (
              <div className="bg-gradient-to-r from-green-500 to-green-600 rounded-lg p-6 text-white">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-lg font-semibold mb-2">Revenue Available for Withdrawal</h3>
                    <p className="text-3xl font-bold">
                      {formatEther(dashboardStats.availableRevenue)} ETH
                    </p>
                    <p className="text-green-100 mt-1">
                      Go to "My Events" to withdraw revenue from individual events
                    </p>
                  </div>
                  <div className="text-6xl opacity-20">💸</div>
                </div>
              </div>
            )}

            {/* Recent Events */}
            <div className="bg-white rounded-lg border border-gray-200">
              <div className="p-6 border-b border-gray-200">
                <h3 className="text-lg font-semibold text-gray-900">Recent Events</h3>
              </div>
              <div className="p-6">
                {events.length === 0 ? (
                  <div className="text-center py-8">
                    <div className="text-4xl mb-4">📅</div>
                    <p className="text-gray-600 mb-4">No events created yet</p>
                    <button
                      onClick={() => setActiveTab('create')}
                      className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                    >
                      Create Your First Event
                    </button>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {events.slice(0, 3).map((event) => (
                      <div key={event.eventId} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                        <div>
                          <h4 className="font-medium text-gray-900">{event.name}</h4>
                          <p className="text-sm text-gray-600">
                            {event.stats.ticketsSold} / {event.stats.totalTickets} tickets sold
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="font-medium text-gray-900">
                            {formatEther(event.stats.totalRevenue)} ETH
                          </p>
                          <p className="text-sm text-gray-600">Revenue</p>
                        </div>
                      </div>
                    ))}
                    {events.length > 3 && (
                      <button
                        onClick={() => setActiveTab('events')}
                        className="w-full py-2 text-blue-600 hover:text-blue-700 text-sm font-medium"
                      >
                        View All Events →
                      </button>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {activeTab === 'events' && (
          <div>
            {/* Header with Refresh */}
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-semibold text-gray-900">My Events</h2>
              <button
                onClick={refetch}
                disabled={eventsLoading}
                className="flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 transition-colors"
              >
                <svg className={`w-4 h-4 ${eventsLoading ? 'animate-spin' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
                Refresh
              </button>
            </div>

            {/* Error State */}
            {error && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
                <div className="flex items-center">
                  <div className="text-red-600 mr-3">
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                  <div>
                    <h3 className="text-red-800 font-medium">Error loading events</h3>
                    <p className="text-red-700 text-sm mt-1">{error.message}</p>
                  </div>
                </div>
              </div>
            )}

            {/* Events List */}
            <EventManagement
              events={events}
              onUpdateStatus={updateEventStatus}
              onWithdrawRevenue={withdrawRevenue}
              isLoading={eventsLoading}
            />
          </div>
        )}

        {activeTab === 'create' && (
          <div className="max-w-2xl mx-auto">
            <CreateEventForm
              onSubmit={handleCreateEvent}
              isLoading={isCreatingEvent}
            />
          </div>
        )}
      </div>
    </div>
  )
}

export default OrganizerDashboard