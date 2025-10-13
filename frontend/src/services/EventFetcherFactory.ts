import { EventFetcher } from './EventFetcher'
import { SUPPORTED_CHAINS } from '../contracts'

/**
 * Factory class for creating and managing EventFetcher instances
 */
export class EventFetcherFactory {
  private static instances: Map<number, EventFetcher> = new Map()

  /**
   * Get or create an EventFetcher instance for the specified chain
   */
  static getInstance(chainId: number): EventFetcher {
    // Check if we already have an instance for this chain
    if (this.instances.has(chainId)) {
      return this.instances.get(chainId)!
    }

    // Validate that the chain is supported
    if (!this.isChainSupported(chainId)) {
      throw new Error(`Unsupported chain ID: ${chainId}`)
    }

    // Create new instance
    const fetcher = new EventFetcher(chainId)
    this.instances.set(chainId, fetcher)

    return fetcher
  }

  /**
   * Clear cached instance for a specific chain (useful when contract address changes)
   */
  static clearInstance(chainId: number): void {
    this.instances.delete(chainId)
  }

  /**
   * Clear all cached instances
   */
  static clearAllInstances(): void {
    this.instances.clear()
  }

  /**
   * Check if a chain ID is supported
   */
  static isChainSupported(chainId: number): boolean {
    return Object.values(SUPPORTED_CHAINS).includes(chainId as any)
  }

  /**
   * Get all supported chain IDs
   */
  static getSupportedChains(): number[] {
    return Object.values(SUPPORTED_CHAINS) as number[]
  }

  /**
   * Update instance when chain changes (recreates the instance)
   */
  static updateChain(oldChainId: number, newChainId: number): EventFetcher {
    // Clear old instance
    this.clearInstance(oldChainId)

    // Return new instance for new chain
    return this.getInstance(newChainId)
  }
}

/**
 * Error types for event fetching operations
 */
export const EventFetcherErrorType = {
  NETWORK_ERROR: 'NETWORK_ERROR',
  CONTRACT_ERROR: 'CONTRACT_ERROR',
  VALIDATION_ERROR: 'VALIDATION_ERROR',
  CHAIN_NOT_SUPPORTED: 'CHAIN_NOT_SUPPORTED',
  CONTRACT_NOT_DEPLOYED: 'CONTRACT_NOT_DEPLOYED',
  RATE_LIMIT_ERROR: 'RATE_LIMIT_ERROR',
  TIMEOUT_ERROR: 'TIMEOUT_ERROR',
} as const

export type EventFetcherErrorType = typeof EventFetcherErrorType[keyof typeof EventFetcherErrorType]

/**
 * Custom error class for EventFetcher operations
 */
export class EventFetcherError extends Error {
  public readonly type: EventFetcherErrorType
  public readonly chainId?: number
  public readonly eventId?: number
  public readonly originalError?: Error

  constructor(
    type: EventFetcherErrorType,
    message: string,
    options: {
      chainId?: number
      eventId?: number
      originalError?: Error
    } = {}
  ) {
    super(message)
    this.name = 'EventFetcherError'
    this.type = type
    this.chainId = options.chainId
    this.eventId = options.eventId
    this.originalError = options.originalError
  }

  /**
   * Create a network error
   */
  static networkError(message: string, chainId?: number, originalError?: Error): EventFetcherError {
    return new EventFetcherError(
      EventFetcherErrorType.NETWORK_ERROR,
      message,
      { chainId, originalError }
    )
  }

  /**
   * Create a contract error
   */
  static contractError(message: string, chainId?: number, originalError?: Error): EventFetcherError {
    return new EventFetcherError(
      EventFetcherErrorType.CONTRACT_ERROR,
      message,
      { chainId, originalError }
    )
  }

  /**
   * Create a validation error
   */
  static validationError(message: string, eventId?: number): EventFetcherError {
    return new EventFetcherError(
      EventFetcherErrorType.VALIDATION_ERROR,
      message,
      { eventId }
    )
  }

  /**
   * Create a chain not supported error
   */
  static chainNotSupported(chainId: number): EventFetcherError {
    return new EventFetcherError(
      EventFetcherErrorType.CHAIN_NOT_SUPPORTED,
      `Chain ID ${chainId} is not supported`,
      { chainId }
    )
  }

  /**
   * Create a contract not deployed error
   */
  static contractNotDeployed(chainId: number): EventFetcherError {
    return new EventFetcherError(
      EventFetcherErrorType.CONTRACT_NOT_DEPLOYED,
      `Contract not deployed on chain ${chainId}`,
      { chainId }
    )
  }

  /**
   * Get user-friendly error message
   */
  getUserFriendlyMessage(): string {
    switch (this.type) {
      case EventFetcherErrorType.NETWORK_ERROR:
        return 'Network connection error. Please check your internet connection and try again.'

      case EventFetcherErrorType.CONTRACT_ERROR:
        return 'Smart contract error. The contract may not be available on this network.'

      case EventFetcherErrorType.VALIDATION_ERROR:
        return 'Data validation error. The event data may be corrupted.'

      case EventFetcherErrorType.CHAIN_NOT_SUPPORTED:
        return `This network (Chain ID: ${this.chainId}) is not supported. Please switch to a supported network.`

      case EventFetcherErrorType.CONTRACT_NOT_DEPLOYED:
        return `The contract is not deployed on this network (Chain ID: ${this.chainId}).`

      case EventFetcherErrorType.RATE_LIMIT_ERROR:
        return 'Too many requests. Please wait a moment and try again.'

      case EventFetcherErrorType.TIMEOUT_ERROR:
        return 'Request timed out. Please try again.'

      default:
        return this.message || 'An unknown error occurred.'
    }
  }
}

/**
 * Retry utility with exponential backoff
 */
export class RetryUtility {
  /**
   * Retry a function with exponential backoff
   */
  static async withExponentialBackoff<T>(
    fn: () => Promise<T>,
    options: {
      maxRetries?: number
      initialDelay?: number
      maxDelay?: number
      backoffFactor?: number
    } = {}
  ): Promise<T> {
    const {
      maxRetries = 3,
      initialDelay = 1000,
      maxDelay = 10000,
      backoffFactor = 2,
    } = options

    let lastError: Error
    let delay = initialDelay

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        return await fn()
      } catch (error) {
        lastError = error as Error

        // Don't retry on the last attempt
        if (attempt === maxRetries) {
          break
        }

        // Don't retry certain types of errors
        if (error instanceof EventFetcherError) {
          if (
            error.type === EventFetcherErrorType.CHAIN_NOT_SUPPORTED ||
            error.type === EventFetcherErrorType.CONTRACT_NOT_DEPLOYED ||
            error.type === EventFetcherErrorType.VALIDATION_ERROR
          ) {
            throw error
          }
        }

        // Wait before retrying
        await new Promise(resolve => setTimeout(resolve, delay))

        // Increase delay for next attempt
        delay = Math.min(delay * backoffFactor, maxDelay)
      }
    }

    throw lastError!
  }

  /**
   * Retry with linear backoff
   */
  static async withLinearBackoff<T>(
    fn: () => Promise<T>,
    options: {
      maxRetries?: number
      delay?: number
    } = {}
  ): Promise<T> {
    const { maxRetries = 3, delay = 1000 } = options

    let lastError: Error

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        return await fn()
      } catch (error) {
        lastError = error as Error

        if (attempt === maxRetries) {
          break
        }

        await new Promise(resolve => setTimeout(resolve, delay))
      }
    }

    throw lastError!
  }
}

/**
 * Utility functions for common EventFetcher operations
 */
export class EventFetcherUtils {
  /**
   * Safely get an EventFetcher instance with error handling
   */
  static async safeGetInstance(chainId: number): Promise<EventFetcher> {
    try {
      return EventFetcherFactory.getInstance(chainId)
    } catch (error) {
      if (error instanceof Error && error.message.includes('not deployed')) {
        throw EventFetcherError.contractNotDeployed(chainId)
      }

      if (!EventFetcherFactory.isChainSupported(chainId)) {
        throw EventFetcherError.chainNotSupported(chainId)
      }

      throw EventFetcherError.contractError(
        'Failed to create EventFetcher instance',
        chainId,
        error as Error
      )
    }
  }

  /**
   * Fetch events with automatic retry and error handling
   */
  static async fetchWithRetry<T>(
    chainId: number,
    operation: (fetcher: EventFetcher) => Promise<T>,
    retryOptions?: Parameters<typeof RetryUtility.withExponentialBackoff>[1]
  ): Promise<T> {
    return RetryUtility.withExponentialBackoff(async () => {
      const fetcher = await this.safeGetInstance(chainId)
      return operation(fetcher)
    }, retryOptions)
  }

  /**
   * Validate chain and get fetcher instance
   */
  static validateAndGetFetcher(chainId: number): EventFetcher {
    if (!EventFetcherFactory.isChainSupported(chainId)) {
      throw EventFetcherError.chainNotSupported(chainId)
    }

    try {
      return EventFetcherFactory.getInstance(chainId)
    } catch (error) {
      throw EventFetcherError.contractError(
        'Failed to get EventFetcher instance',
        chainId,
        error as Error
      )
    }
  }
}
