import React, { Suspense } from 'react'
import LoadingSpinner from './LoadingSpinner'
import ErrorBoundary from './ErrorBoundary'

interface LazyRouteProps {
  children: React.ReactNode
  fallback?: React.ReactNode
  errorFallback?: React.ReactNode
}

const LazyRoute: React.FC<LazyRouteProps> = ({
  children,
  fallback,
  errorFallback
}) => {
  const defaultFallback = (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="text-center">
        <LoadingSpinner size="lg" />
        <p className="mt-4 text-gray-600">Loading...</p>
      </div>
    </div>
  )

  return (
    <ErrorBoundary fallback={errorFallback}>
      <Suspense fallback={fallback || defaultFallback}>
        {children}
      </Suspense>
    </ErrorBoundary>
  )
}

export default LazyRoute
