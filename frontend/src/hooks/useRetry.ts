import { useState, useCallback } from 'react'

interface UseRetryOptions {
  maxAttempts?: number
  delay?: number
  backoff?: 'linear' | 'exponential'
  onError?: (error: Error, attempt: number) => void
  onSuccess?: (result: any, attempt: number) => void
}

interface UseRetryReturn<T> {
  execute: () => Promise<T>
  retry: () => Promise<T>
  reset: () => void
  isLoading: boolean
  error: Error | null
  attempt: number
  canRetry: boolean
}

export const useRetry = <T>(
  asyncFunction: () => Promise<T>,
  options: UseRetryOptions = {}
): UseRetryReturn<T> => {
  const {
    maxAttempts = 3,
    delay = 1000,
    backoff = 'exponential',
    onError,
    onSuccess
  } = options

  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<Error | null>(null)
  const [attempt, setAttempt] = useState(0)

  const calculateDelay = useCallback((attemptNumber: number): number => {
    if (backoff === 'exponential') {
      return delay * Math.pow(2, attemptNumber - 1)
    }
    return delay * attemptNumber
  }, [delay, backoff])

  const sleep = (ms: number): Promise<void> => {
    return new Promise(resolve => setTimeout(resolve, ms))
  }

  const executeWithRetry = useCallback(async (attemptNumber: number = 1): Promise<T> => {
    setIsLoading(true)
    setAttempt(attemptNumber)

    try {
      const result = await asyncFunction()
      setError(null)
      setIsLoading(false)
      onSuccess?.(result, attemptNumber)
      return result
    } catch (err) {
      const error = err as Error
      setError(error)
      onError?.(error, attemptNumber)

      if (attemptNumber < maxAttempts) {
        const delayMs = calculateDelay(attemptNumber)
        await sleep(delayMs)
        return executeWithRetry(attemptNumber + 1)
      } else {
        setIsLoading(false)
        throw error
      }
    }
  }, [asyncFunction, maxAttempts, calculateDelay, onError, onSuccess])

  const execute = useCallback(async (): Promise<T> => {
    setAttempt(0)
    setError(null)
    return executeWithRetry(1)
  }, [executeWithRetry])

  const retry = useCallback(async (): Promise<T> => {
    if (attempt >= maxAttempts) {
      setAttempt(0)
      setError(null)
      return executeWithRetry(1)
    }
    return executeWithRetry(attempt + 1)
  }, [executeWithRetry, attempt, maxAttempts])

  const reset = useCallback(() => {
    setIsLoading(false)
    setError(null)
    setAttempt(0)
  }, [])

  const canRetry = attempt < maxAttempts || (attempt >= maxAttempts && !isLoading)

  return {
    execute,
    retry,
    reset,
    isLoading,
    error,
    attempt,
    canRetry
  }
}
