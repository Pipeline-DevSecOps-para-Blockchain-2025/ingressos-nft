import React, { useRef } from 'react'
import { useVirtualizedList } from '../hooks/useVirtualization'

interface VirtualizedListProps<T> {
  items: T[]
  itemHeight: number
  height: number
  renderItem: (item: T, index: number) => React.ReactNode
  overscan?: number
  className?: string
  onScroll?: (scrollTop: number) => void
}

function VirtualizedList<T>({
  items,
  itemHeight,
  height,
  renderItem,
  overscan = 5,
  className = '',
  onScroll
}: VirtualizedListProps<T>) {
  const containerRef = useRef<HTMLDivElement>(null)

  const {
    visibleItems,
    totalHeight,
    handleScroll: internalHandleScroll
  } = useVirtualizedList(items, itemHeight, height, overscan)

  const handleScroll = (event: React.UIEvent<HTMLDivElement>) => {
    internalHandleScroll(event)
    onScroll?.(event.currentTarget.scrollTop)
  }

  return (
    <div
      ref={containerRef}
      className={`overflow-auto ${className}`}
      style={{ height }}
      onScroll={handleScroll}
    >
      <div style={{ height: totalHeight, position: 'relative' }}>
        {visibleItems.map(({ item, index, start }) => (
          <div
            key={index}
            style={{
              position: 'absolute',
              top: start,
              left: 0,
              right: 0,
              height: itemHeight
            }}
          >
            {renderItem(item, index)}
          </div>
        ))}
      </div>
    </div>
  )
}

export default VirtualizedList
