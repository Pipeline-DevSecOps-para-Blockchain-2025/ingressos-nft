import React from 'react'

interface SkeletonLoaderProps {
  variant?: 'text' | 'rectangular' | 'circular' | 'card' | 'list'
  width?: string | number
  height?: string | number
  lines?: number
  className?: string
}

const SkeletonLoader: React.FC<SkeletonLoaderProps> = ({
  variant = 'text',
  width,
  height,
  lines = 1,
  className = ''
}) => {
  const baseClasses = 'animate-pulse bg-gray-200 rounded'

  const getVariantClasses = () => {
    switch (variant) {
      case 'text':
        return 'h-4 rounded'
      case 'rectangular':
        return 'rounded-lg'
      case 'circular':
        return 'rounded-full'
      case 'card':
        return 'h-48 rounded-lg'
      case 'list':
        return 'h-16 rounded-lg'
      default:
        return 'h-4 rounded'
    }
  }

  const getStyle = () => {
    const style: React.CSSProperties = {}
    if (width) style.width = typeof width === 'number' ? `${width}px` : width
    if (height) style.height = typeof height === 'number' ? `${height}px` : height
    return style
  }

  if (variant === 'text' && lines > 1) {
    return (
      <div className={`space-y-2 ${className}`}>
        {Array.from({ length: lines }).map((_, index) => (
          <div
            key={index}
            className={`${baseClasses} ${getVariantClasses()}`}
            style={{
              ...getStyle(),
              width: index === lines - 1 ? '75%' : '100%'
            }}
          />
        ))}
      </div>
    )
  }

  return (
    <div
      className={`${baseClasses} ${getVariantClasses()} ${className}`}
      style={getStyle()}
    />
  )
}

// Pre-built skeleton components for common use cases
export const EventCardSkeleton: React.FC = () => (
  <div className="bg-white rounded-lg border border-gray-200 p-6 animate-pulse">
    <div className="flex items-start justify-between mb-4">
      <div className="flex-1">
        <SkeletonLoader variant="text" width="60%" className="mb-2" />
        <SkeletonLoader variant="text" width="40%" />
      </div>
      <SkeletonLoader variant="rectangular" width={60} height={24} />
    </div>

    <SkeletonLoader variant="text" lines={2} className="mb-4" />

    <div className="flex items-center justify-between">
      <SkeletonLoader variant="text" width="30%" />
      <SkeletonLoader variant="rectangular" width={80} height={32} />
    </div>
  </div>
)

export const TicketCardSkeleton: React.FC = () => (
  <div className="bg-white rounded-lg border border-gray-200 p-6 animate-pulse">
    <div className="flex items-center justify-between mb-4">
      <SkeletonLoader variant="text" width="50%" />
      <SkeletonLoader variant="circular" width={40} height={40} />
    </div>

    <SkeletonLoader variant="text" lines={3} className="mb-4" />

    <div className="flex items-center justify-between">
      <SkeletonLoader variant="text" width="40%" />
      <SkeletonLoader variant="rectangular" width={100} height={32} />
    </div>
  </div>
)

export const TableSkeleton: React.FC<{ rows?: number; columns?: number }> = ({
  rows = 5,
  columns = 4
}) => (
  <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
    {/* Header */}
    <div className="border-b border-gray-200 p-4">
      <div className="grid gap-4" style={{ gridTemplateColumns: `repeat(${columns}, 1fr)` }}>
        {Array.from({ length: columns }).map((_, index) => (
          <SkeletonLoader key={index} variant="text" width="80%" />
        ))}
      </div>
    </div>

    {/* Rows */}
    {Array.from({ length: rows }).map((_, rowIndex) => (
      <div key={rowIndex} className="border-b border-gray-100 p-4 last:border-b-0">
        <div className="grid gap-4" style={{ gridTemplateColumns: `repeat(${columns}, 1fr)` }}>
          {Array.from({ length: columns }).map((_, colIndex) => (
            <SkeletonLoader key={colIndex} variant="text" width="90%" />
          ))}
        </div>
      </div>
    ))}
  </div>
)

export default SkeletonLoader
