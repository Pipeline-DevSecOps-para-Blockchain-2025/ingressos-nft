import { useState, useCallback, useEffect } from 'react'

export interface Notification {
  id: string
  type: 'success' | 'error' | 'info' | 'warning'
  title: string
  message: string
  timestamp: number
  duration?: number // Auto-dismiss after this many ms
  action?: {
    label: string
    onClick: () => void
  }
}

export interface UseNotificationsReturn {
  notifications: Notification[]
  addNotification: (notification: Omit<Notification, 'id' | 'timestamp'>) => string
  removeNotification: (id: string) => void
  clearAll: () => void
  addSuccess: (title: string, message: string, action?: Notification['action']) => string
  addError: (title: string, message: string, action?: Notification['action']) => string
  addInfo: (title: string, message: string, action?: Notification['action']) => string
  addWarning: (title: string, message: string, action?: Notification['action']) => string
}

export const useNotifications = (): UseNotificationsReturn => {
  const [notifications, setNotifications] = useState<Notification[]>([])

  // Generate unique ID
  const generateId = useCallback((): string => {
    return `notification-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
  }, [])

  // Add notification
  const addNotification = useCallback((notification: Omit<Notification, 'id' | 'timestamp'>): string => {
    const id = generateId()
    const newNotification: Notification = {
      ...notification,
      id,
      timestamp: Date.now(),
    }

    setNotifications(prev => [newNotification, ...prev])

    // Auto-dismiss if duration is specified
    if (notification.duration) {
      setTimeout(() => {
        removeNotification(id)
      }, notification.duration)
    }

    return id
  }, [generateId])

  // Remove notification
  const removeNotification = useCallback((id: string) => {
    setNotifications(prev => prev.filter(n => n.id !== id))
  }, [])

  // Clear all notifications
  const clearAll = useCallback(() => {
    setNotifications([])
  }, [])

  // Convenience methods
  const addSuccess = useCallback((title: string, message: string, action?: Notification['action']): string => {
    return addNotification({
      type: 'success',
      title,
      message,
      duration: 5000, // Auto-dismiss after 5 seconds
      action,
    })
  }, [addNotification])

  const addError = useCallback((title: string, message: string, action?: Notification['action']): string => {
    return addNotification({
      type: 'error',
      title,
      message,
      action,
    })
  }, [addNotification])

  const addInfo = useCallback((title: string, message: string, action?: Notification['action']): string => {
    return addNotification({
      type: 'info',
      title,
      message,
      duration: 4000,
      action,
    })
  }, [addNotification])

  const addWarning = useCallback((title: string, message: string, action?: Notification['action']): string => {
    return addNotification({
      type: 'warning',
      title,
      message,
      duration: 6000,
      action,
    })
  }, [addNotification])

  // Auto-cleanup old notifications (keep max 10)
  useEffect(() => {
    if (notifications.length > 10) {
      setNotifications(prev => prev.slice(0, 10))
    }
  }, [notifications.length])

  return {
    notifications,
    addNotification,
    removeNotification,
    clearAll,
    addSuccess,
    addError,
    addInfo,
    addWarning,
  }
}
