import React, { useState } from 'react'
import { formatEther, formatDateTime } from '../utils'
import type { OrganizerEventWithStats } from '../hooks/useOrganizerEvents'

interface EventManagementProps {
  events: OrganizerEventWithStats[]
  onUpdateStatus: (eventId: number, status: number) => Promise<void>
  onWithdrawRevenue: (eventId: number) => Promise<void>
  isLoading?: boolean
  className?: string
}

const EventManagement: React.FC<EventManagementProps> = ({
  events,
  onUpdateStatus,
  onWithdrawRevenue,
  isLoading = false,
  className = ''
}) => {
  const [processingEvents, setProcessingEvents] = useState<Set<number>>(new Set())

  const getStatusColor = (status: number) => {
    switch (status) {
      case 0: return 'bg-green-100 text-green-800 border-green-200'
      case 1: return 'bg-yellow-100 text-yellow-800 border-yellow-200'
      case 2: return 'bg-red-100 text-red-800 border-red-200'
      case 3: return 'bg-gray-100 text-gray-800 border-gray-200'
      default: return 'bg-gray-100 text-gray-800 border-gray-200'
    }
  }

  const getStatusText = (status: number) => {
    switch (status) {
      case 0: return 'Active'
      case 1: return 'Paused'
      case 2: return 'Cancelled'
      case 3: return 'Completed'
      default: return 'Unknown'
    }
  }

  const handleStatusUpdate = async (eventId: number, newStatus: number) => {
    setProcessingEvents(prev => new Set(prev).add(eventId))
    try {
      await onUpdateStatus(eventId, newStatus)
    } catch (error) {
      console.error('Error updating status:', error)
    } finally {
      setProcessingEvents(prev => {
        const newSet = new Set(prev)
        newSet.delete(eventId)
        return newSet
      })
    }
  }

  const handleWithdraw = async (eventId: number) => {
    setProcessingEvents(prev => new Set(prev).add(eventId))
    try {
      await onWithdrawRevenue(eventId)
    } catch (error) {
      console.error('Error withdrawing revenue:', error)
    } finally {
      setProcessingEvents(prev => {
        const newSet = new Set(prev)
        newSet.delete(eventId)
        return newSet
      })
    }
  }

  const getAvailableStatusOptions = (currentStatus: number) => {
    switch (currentStatus) {
      case 0: // Active
        return [
          { value: 1, label: 'Pause Event' },
          { value: 2, label: 'Cancel Event' },
          { value: 3, label: 'Mark Complete' }
        ]
      case 1: // Paused
        return [
          { value: 0, label: 'Resume Event' },
          { value: 2, label: 'Cancel Event' }
        ]
      case 2: // Cancelled
      case 3: // Completed
        return []
      default:
        return []
    }
  }

  const calculateSalesPercentage = (sold: number, total: number): number => {
    return total > 0 ? Math.round((sold / total) * 100) : 0
  }

  if (events.length === 0) {
    return (
      <div className={`bg-white rounded-lg p-8 text-center ${className}`}>
        <div className="text-6xl mb-4">📅</div>
        <h3 className="text-xl font-medium text-gray-900 mb-2">
          No Events Created Yet
        </h3>
        <p className="text-gray-600">
          Create your first event to start selling tickets
        </p>
      </div>
    )
  }

  return (
    <div className={`space-y-6 ${className}`}>
      {events.map((event) => {
        const isProcessing = processingEvents.has(event.eventId)
        const salesPercentage = calculateSalesPercentage(event.stats.ticketsSold, event.stats.totalTickets)
        const statusOptions = getAvailableStatusOptions(event.status)
        const canWithdraw = event.stats.availableRevenue > 0n

        return (
          <div key={event.eventId} className="bg-white rounded-lg border border-gray-200 overflow-hidden">
            {/* Header */}
            <div className="p-6 border-b border-gray-200">
              <div className="flex justify-between items-start">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <h3 className="text-xl font-semibold text-gray-900">
                      {event.name}
                    </h3>
                    <span className={`px-3 py-1 rounded-full text-sm font-medium border ${getStatusColor(event.status)}`}>
                      {getStatusText(event.status)}
                    </span>
                  </div>
                  <p className="text-gray-600 mb-3">{event.description}</p>
                  <div className="flex flex-wrap gap-4 text-sm text-gray-500">
                    <div className="flex items-center">
                      <span className="mr-1">📅</span>
                      {formatDateTime(Number(event.date))}
                    </div>
                    <div className="flex items-center">
                      <span className="mr-1">📍</span>
                      {event.venue}
                    </div>
                    <div className="flex items-center">
                      <span className="mr-1">💰</span>
                      {formatEther(event.ticketPrice)} ETH per ticket
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Stats */}
            <div className="p-6 bg-gray-50">
              <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                {/* Ticket Sales */}
                <div>
                  <h4 className="text-sm font-medium text-gray-700 mb-2">Ticket Sales</h4>
                  <div className="text-2xl font-bold text-gray-900 mb-1">
                    {event.stats.ticketsSold} / {event.stats.totalTickets}
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2 mb-2">
                    <div
                      className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                      style={{ width: `${salesPercentage}%` }}
                    ></div>
                  </div>
                  <p className="text-sm text-gray-600">{salesPercentage}% sold</p>
                </div>

                {/* Total Revenue */}
                <div>
                  <h4 className="text-sm font-medium text-gray-700 mb-2">Total Revenue</h4>
                  <div className="text-2xl font-bold text-gray-900 mb-1">
                    {formatEther(event.stats.totalRevenue)} ETH
                  </div>
                  <p className="text-sm text-gray-600">
                    From {event.stats.ticketsSold} tickets
                  </p>
                </div>

                {/* Available to Withdraw */}
                <div>
                  <h4 className="text-sm font-medium text-gray-700 mb-2">Available</h4>
                  <div className="text-2xl font-bold text-green-600 mb-1">
                    {formatEther(event.stats.availableRevenue)} ETH
                  </div>
                  <p className="text-sm text-gray-600">
                    Ready to withdraw
                  </p>
                </div>

                {/* Withdrawn */}
                <div>
                  <h4 className="text-sm font-medium text-gray-700 mb-2">Withdrawn</h4>
                  <div className="text-2xl font-bold text-gray-600 mb-1">
                    {formatEther(event.stats.withdrawnRevenue)} ETH
                  </div>
                  <p className="text-sm text-gray-600">
                    Already withdrawn
                  </p>
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="p-6 border-t border-gray-200">
              <div className="flex flex-wrap gap-3">
                {/* Status Update Dropdown */}
                {statusOptions.length > 0 && (
                  <div className="relative">
                    <select
                      onChange={(e) => {
                        const newStatus = parseInt(e.target.value)
                        if (!isNaN(newStatus)) {
                          handleStatusUpdate(event.eventId, newStatus)
                        }
                        e.target.value = '' // Reset select
                      }}
                      disabled={isProcessing || isLoading}
                      className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
                      defaultValue=""
                    >
                      <option value="" disabled>Update Status</option>
                      {statusOptions.map((option) => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                {/* Withdraw Button */}
                {canWithdraw && (
                  <button
                    onClick={() => handleWithdraw(event.eventId)}
                    disabled={isProcessing || isLoading}
                    className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-medium"
                  >
                    {isProcessing ? 'Processing...' : `Withdraw ${formatEther(event.stats.availableRevenue)} ETH`}
                  </button>
                )}

                {/* Event Details Link */}
                <button
                  onClick={() => {
                    // This would navigate to event details page
                    console.log('View event details:', event.eventId)
                  }}
                  className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  View Details
                </button>
              </div>

              {/* Processing Indicator */}
              {isProcessing && (
                <div className="mt-3 flex items-center text-sm text-blue-600">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600 mr-2"></div>
                  Processing transaction...
                </div>
              )}
            </div>
          </div>
        )
      })}
    </div>
  )
}

export default EventManagement
