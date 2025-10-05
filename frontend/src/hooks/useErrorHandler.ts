import { useCallback } from 'react'
import { useNotifications } from './useNotifications'

interface ErrorHandlerOptions {
  showNotification?: boolean
  logError?: boolean
  fallbackMessage?: string
}

interface UseErrorHandlerReturn {
  handleError: (error: unknown, context?: string, options?: ErrorHandlerOptions) => void
  handleAsyncError: <T>(
    asyncFn: () => Promise<T>,
    context?: string,
    options?: ErrorHandlerOptions
  ) => Promise<T | null>
}

export const useErrorHandler = (): UseErrorHandlerReturn => {
  const { addError } = useNotifications()

  const getErrorMessage = useCallback((error: unknown): string => {
    if (error instanceof Error) {
      return error.message
    }
    
    if (typeof error === 'string') {
      return error
    }
    
    if (error && typeof error === 'object' && 'message' in error) {
      return String((error as any).message)
    }
    
    return 'An unexpected error occurred'
  }, [])

  const getContextualMessage = useCallback((error: unknown, context?: string): string => {
    const baseMessage = getErrorMessage(error)
    
    // Handle common Web3/blockchain errors
    if (baseMessage.includes('user rejected')) {
      return 'Transaction was cancelled by user'
    }
    
    if (baseMessage.includes('insufficient funds')) {
      return 'Insufficient funds to complete transaction'
    }
    
    if (baseMessage.includes('gas')) {
      return 'Transaction failed due to gas issues. Please try again with higher gas limit.'
    }
    
    if (baseMessage.includes('network')) {
      return 'Network error. Please check your connection and try again.'
    }
    
    if (baseMessage.includes('contract')) {
      return 'Smart contract error. Please try again later.'
    }
    
    // Add context if provided
    if (context) {
      return `${context}: ${baseMessage}`
    }
    
    return baseMessage
  }, [getErrorMessage])

  const handleError = useCallback((
    error: unknown,
    context?: string,
    options: ErrorHandlerOptions = {}
  ) => {
    const {
      showNotification = true,
      logError = true,
      fallbackMessage = 'Something went wrong. Please try again.'
    } = options

    const message = getContextualMessage(error, context) || fallbackMessage

    if (logError) {
      console.error(`Error${context ? ` in ${context}` : ''}:`, error)
    }

    if (showNotification) {
      addError('Error', message)
    }
  }, [getContextualMessage, addError])

  const handleAsyncError = useCallback(async <T>(
    asyncFn: () => Promise<T>,
    context?: string,
    options: ErrorHandlerOptions = {}
  ): Promise<T | null> => {
    try {
      return await asyncFn()
    } catch (error) {
      handleError(error, context, options)
      return null
    }
  }, [handleError])

  return {
    handleError,
    handleAsyncError
  }
}