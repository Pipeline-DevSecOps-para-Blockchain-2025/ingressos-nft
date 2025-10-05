import React from 'react'

interface ErrorMessageProps {
  title?: string
  message: string
  variant?: 'error' | 'warning' | 'info'
  onRetry?: () => void
  onDismiss?: () => void
  retryText?: string
  className?: string
}

const ErrorMessage: React.FC<ErrorMessageProps> = ({
  title,
  message,
  variant = 'error',
  onRetry,
  onDismiss,
  retryText = 'Try Again',
  className = ''
}) => {
  const getVariantStyles = () => {
    switch (variant) {
      case 'error':
        return {
          container: 'bg-red-50 border-red-200',
          icon: 'text-red-600',
          title: 'text-red-800',
          message: 'text-red-700',
          button: 'bg-red-600 hover:bg-red-700 text-white'
        }
      case 'warning':
        return {
          container: 'bg-yellow-50 border-yellow-200',
          icon: 'text-yellow-600',
          title: 'text-yellow-800',
          message: 'text-yellow-700',
          button: 'bg-yellow-600 hover:bg-yellow-700 text-white'
        }
      case 'info':
        return {
          container: 'bg-blue-50 border-blue-200',
          icon: 'text-blue-600',
          title: 'text-blue-800',
          message: 'text-blue-700',
          button: 'bg-blue-600 hover:bg-blue-700 text-white'
        }
    }
  }

  const getIcon = () => {
    switch (variant) {
      case 'error':
        return (
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        )
      case 'warning':
        return (
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
          </svg>
        )
      case 'info':
        return (
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        )
    }
  }

  const styles = getVariantStyles()

  return (
    <div className={`border rounded-lg p-4 ${styles.container} ${className}`}>
      <div className="flex items-start">
        <div className={`flex-shrink-0 mr-3 ${styles.icon}`}>
          {getIcon()}
        </div>

        <div className="flex-1 min-w-0">
          {title && (
            <h3 className={`font-medium mb-1 ${styles.title}`}>
              {title}
            </h3>
          )}

          <p className={`text-sm ${styles.message}`}>
            {message}
          </p>

          {onRetry && (
            <button
              onClick={onRetry}
              className={`mt-3 px-3 py-1 rounded text-sm font-medium transition-colors ${styles.button}`}
            >
              {retryText}
            </button>
          )}
        </div>

        {onDismiss && (
          <button
            onClick={onDismiss}
            className={`flex-shrink-0 ml-2 ${styles.icon} hover:opacity-75 transition-opacity`}
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        )}
      </div>
    </div>
  )
}

export default ErrorMessage
