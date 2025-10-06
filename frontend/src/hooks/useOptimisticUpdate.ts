import { useState, useCallback, useRef } from 'react'

interface OptimisticUpdateOptions<T> {
  onSuccess?: (result: T) => void
  onError?: (error: Error) => void
  rollbackDelay?: number
}

interface UseOptimisticUpdateReturn<T, P> {
  data: T
  isOptimistic: boolean
  isLoading: boolean
  error: Error | null
  execute: (optimisticData: T, asyncFn: () => Promise<P>) => Promise<P | null>
  reset: () => void
}

export const useOptimisticUpdate = <T, P = any>(
  initialData: T,
  options: OptimisticUpdateOptions<P> = {}
): UseOptimisticUpdateReturn<T, P> => {
  const { onSuccess, onError, rollbackDelay = 0 } = options

  const [data, setData] = useState<T>(initialData)
  const [isOptimistic, setIsOptimistic] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<Error | null>(null)

  const originalDataRef = useRef<T>(initialData)
  const rollbackTimeoutRef = useRef<NodeJS.Timeout | null>(null)

  const execute = useCallback(async (
    optimisticData: T,
    asyncFn: () => Promise<P>
  ): Promise<P | null> => {
    // Clear any pending rollback
    if (rollbackTimeoutRef.current) {
      clearTimeout(rollbackTimeoutRef.current)
    }

    // Store original data for potential rollback
    originalDataRef.current = data

    // Apply optimistic update
    setData(optimisticData)
    setIsOptimistic(true)
    setIsLoading(true)
    setError(null)

    try {
      const result = await asyncFn()

      // Success - keep optimistic data or update with server response
      setIsOptimistic(false)
      setIsLoading(false)
      onSuccess?.(result)

      return result
    } catch (err) {
      const error = err as Error

      // Error - rollback to original data
      const rollback = () => {
        setData(originalDataRef.current)
        setIsOptimistic(false)
        setIsLoading(false)
        setError(error)
        onError?.(error)
      }

      if (rollbackDelay > 0) {
        rollbackTimeoutRef.current = setTimeout(rollback, rollbackDelay)
      } else {
        rollback()
      }

      return null
    }
  }, [data, onSuccess, onError, rollbackDelay])

  const reset = useCallback(() => {
    if (rollbackTimeoutRef.current) {
      clearTimeout(rollbackTimeoutRef.current)
    }

    setData(initialData)
    setIsOptimistic(false)
    setIsLoading(false)
    setError(null)
    originalDataRef.current = initialData
  }, [initialData])

  return {
    data,
    isOptimistic,
    isLoading,
    error,
    execute,
    reset
  }
}
