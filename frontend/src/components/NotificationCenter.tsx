import React from 'react'
import { useNotifications } from '../hooks/useNotifications'
import type { Notification } from '../hooks/useNotifications'

interface NotificationCenterProps {
  className?: string
}

const NotificationCenter: React.FC<NotificationCenterProps> = ({
  className = ''
}) => {
  const { notifications, removeNotification } = useNotifications()

  const getNotificationIcon = (type: Notification['type']) => {
    switch (type) {
      case 'success':
        return (
          <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
        )
      case 'error':
        return (
          <svg className="w-5 h-5 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        )
      case 'warning':
        return (
          <svg className="w-5 h-5 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        )
      case 'info':
        return (
          <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        )
    }
  }

  const getNotificationColors = (type: Notification['type']) => {
    switch (type) {
      case 'success':
        return 'bg-green-50 border-green-200'
      case 'error':
        return 'bg-red-50 border-red-200'
      case 'warning':
        return 'bg-yellow-50 border-yellow-200'
      case 'info':
        return 'bg-blue-50 border-blue-200'
    }
  }

  const formatTimeAgo = (timestamp: number): string => {
    const now = Date.now()
    const diff = now - timestamp
    const minutes = Math.floor(diff / 60000)
    const hours = Math.floor(diff / 3600000)

    if (hours > 0) return `${hours}h ago`
    if (minutes > 0) return `${minutes}m ago`
    return 'Just now'
  }

  if (notifications.length === 0) {
    return null
  }

  return (
    <div className={`fixed top-4 right-4 z-50 space-y-2 max-w-sm ${className}`}>
      {notifications.map((notification) => (
        <div
          key={notification.id}
          className={`border rounded-lg shadow-lg p-4 transition-all duration-300 ${getNotificationColors(notification.type)}`}
        >
          <div className="flex items-start">
            <div className="flex-shrink-0 mr-3 mt-0.5">
              {getNotificationIcon(notification.type)}
            </div>

            <div className="flex-1 min-w-0">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <h4 className="text-sm font-medium text-gray-900">
                    {notification.title}
                  </h4>
                  <p className="text-sm text-gray-700 mt-1">
                    {notification.message}
                  </p>
                  <p className="text-xs text-gray-500 mt-2">
                    {formatTimeAgo(notification.timestamp)}
                  </p>
                </div>

                <button
                  onClick={() => removeNotification(notification.id)}
                  className="ml-2 text-gray-400 hover:text-gray-600 transition-colors"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              {/* Action button */}
              {notification.action && (
                <button
                  onClick={notification.action.onClick}
                  className="mt-3 text-sm font-medium text-blue-600 hover:text-blue-700 underline"
                >
                  {notification.action.label}
                </button>
              )}
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}

export default NotificationCenter
