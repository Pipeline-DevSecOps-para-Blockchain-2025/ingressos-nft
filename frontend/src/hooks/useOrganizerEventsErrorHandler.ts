import { useCallback } from 'react'
import { EventFetcherError, EventFetcherErrorType } from '../services'

/**
 * Error types specific to organizer events
 */
export interface OrganizerEventsError {
  type: 'network' | 'contract' | 'cache' | 'validation' | 'unknown'
  message: string
  userMessage: string
  retryable: boolean
  originalError?: Error
}

/**
 * Hook for handling organizer events errors with user-friendly messages
 */
export function useOrganizerEventsErrorHandler() {
  const handleError = useCallback((error: unknown): OrganizerEventsError => {
    if (error instanceof EventFetcherError) {
      switch (error.type) {
        case EventFetcherErrorType.NETWORK_ERROR:
          return {
            type: 'network',
            message: 'Network connection failed',
            userMessage: 'Unable to connect to the blockchain. Please check your internet connection and try again.',
            retryable: true,
            originalError: error,
          }

        case EventFetcherErrorType.CONTRACT_ERROR:
          return {
            type: 'contract',
            message: 'Smart contract error',
            userMessage: 'There was an issue with the smart contract. Please try again in a few moments.',
            retryable: true,
            originalError: error,
          }

        case EventFetcherErrorType.CHAIN_NOT_SUPPORTED:
          return {
            type: 'network',
            message: 'Unsupported network',
            userMessage: 'This network is not supported. Please switch to Ethereum Mainnet or Sepolia testnet.',
            retryable: false,
            originalError: error,
          }

        case EventFetcherErrorType.CONTRACT_NOT_DEPLOYED:
          return {
            type: 'contract',
            message: 'Contract not deployed',
            userMessage: 'The smart contract is not available on this network. Please switch to a supported network.',
            retryable: false,
            originalError: error,
          }

        case EventFetcherErrorType.RATE_LIMIT_ERROR:
          return {
            type: 'network',
            message: 'Rate limit exceeded',
            userMessage: 'Too many requests. Please wait a moment and try again.',
            retryable: true,
            originalError: error,
          }

        case EventFetcherErrorType.TIMEOUT_ERROR:
          return {
            type: 'network',
            message: 'Request timeout',
            userMessage: 'The request timed out. Please check your connection and try again.',
            retryable: true,
            originalError: error,
          }

        case EventFetcherErrorType.VALIDATION_ERROR:
          return {
            type: 'validation',
            message: 'Data validation error',
            userMessage: 'The event data appears to be corrupted. Please refresh and try again.',
            retryable: true,
            originalError: error,
          }

        default:
          return {
            type: 'unknown',
            message: 'Unknown EventFetcher error',
            userMessage: 'An unexpected error occurred. Please try again.',
            retryable: true,
            originalError: error,
          }
      }
    }

    // Handle standard JavaScript errors
    if (error instanceof Error) {
      // Check for specific error messages
      if (error.message.includes('Contract not ready')) {
        return {
          type: 'contract',
          message: 'Contract not ready',
          userMessage: 'Please connect your wallet and ensure you\'re on the correct network.',
          retryable: true,
          originalError: error,
        }
      }

      if (error.message.includes('User rejected')) {
        return {
          type: 'validation',
          message: 'User rejected transaction',
          userMessage: 'Transaction was cancelled. Please try again if you want to proceed.',
          retryable: true,
          originalError: error,
        }
      }

      if (error.message.includes('insufficient funds')) {
        return {
          type: 'validation',
          message: 'Insufficient funds',
          userMessage: 'You don\'t have enough funds to complete this transaction.',
          retryable: false,
          originalError: error,
        }
      }

      if (error.message.includes('nonce')) {
        return {
          type: 'network',
          message: 'Nonce error',
          userMessage: 'Transaction nonce error. Please try again.',
          retryable: true,
          originalError: error,
        }
      }

      // Generic error handling
      return {
        type: 'unknown',
        message: error.message,
        userMessage: 'An error occurred while fetching events. Please try again.',
        retryable: true,
        originalError: error,
      }
    }

    // Handle unknown error types
    return {
      type: 'unknown',
      message: 'Unknown error',
      userMessage: 'An unexpected error occurred. Please refresh the page and try again.',
      retryable: true,
      originalError: error instanceof Error ? error : new Error(String(error)),
    }
  }, [])

  const getRetryDelay = useCallback((error: OrganizerEventsError, attemptCount: number): number => {
    if (!error.retryable) return 0

    switch (error.type) {
      case 'network':
        // Exponential backoff for network errors
        return Math.min(1000 * Math.pow(2, attemptCount), 30000) // Max 30 seconds

      case 'contract':
        // Fixed delay for contract errors
        return 5000 // 5 seconds

      case 'cache':
        // Short delay for cache errors
        return 1000 // 1 second

      default:
        // Default exponential backoff
        return Math.min(2000 * Math.pow(1.5, attemptCount), 15000) // Max 15 seconds
    }
  }, [])

  const shouldRetry = useCallback((error: OrganizerEventsError, attemptCount: number): boolean => {
    if (!error.retryable) return false

    const maxRetries = {
      network: 3,
      contract: 2,
      cache: 5,
      validation: 1,
      unknown: 2,
    }

    return attemptCount < maxRetries[error.type]
  }, [])

  return {
    handleError,
    getRetryDelay,
    shouldRetry,
  }
}

/**
 * Hook for retry logic with exponential backoff
 */
export function useRetryLogic() {
  const { handleError, getRetryDelay, shouldRetry } = useOrganizerEventsErrorHandler()

  const executeWithRetry = useCallback(async <T>(
    operation: () => Promise<T>,
    maxRetries = 3
  ): Promise<T> => {
    let lastError: OrganizerEventsError | null = null

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        return await operation()
      } catch (error) {
        const handledError = handleError(error)
        lastError = handledError

        // Don't retry if it's the last attempt or error is not retryable
        if (attempt === maxRetries || !shouldRetry(handledError, attempt)) {
          break
        }

        // Wait before retrying
        const delay = getRetryDelay(handledError, attempt)
        if (delay > 0) {
          await new Promise(resolve => setTimeout(resolve, delay))
        }

        console.log(`Retrying operation (attempt ${attempt + 1}/${maxRetries}) after ${delay}ms delay`)
      }
    }

    // If we get here, all retries failed
    throw lastError?.originalError || new Error('All retry attempts failed')
  }, [handleError, getRetryDelay, shouldRetry])

  return {
    executeWithRetry,
    handleError,
  }
}
