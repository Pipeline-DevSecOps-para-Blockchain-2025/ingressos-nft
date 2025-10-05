import { useState, useEffect, useCallback, useMemo } from 'react'

interface UseVirtualizationOptions {
  itemHeight: number
  containerHeight: number
  overscan?: number
  scrollTop?: number
}

interface VirtualItem {
  index: number
  start: number
  end: number
}

interface UseVirtualizationReturn {
  virtualItems: VirtualItem[]
  totalHeight: number
  startIndex: number
  endIndex: number
}

export const useVirtualization = (
  itemCount: number,
  options: UseVirtualizationOptions
): UseVirtualizationReturn => {
  const { itemHeight, containerHeight, overscan = 5, scrollTop = 0 } = options

  const virtualItems = useMemo(() => {
    const startIndex = Math.max(0, Math.floor(scrollTop / itemHeight) - overscan)
    const endIndex = Math.min(
      itemCount - 1,
      Math.ceil((scrollTop + containerHeight) / itemHeight) + overscan
    )

    const items: VirtualItem[] = []
    for (let i = startIndex; i <= endIndex; i++) {
      items.push({
        index: i,
        start: i * itemHeight,
        end: (i + 1) * itemHeight
      })
    }

    return items
  }, [itemCount, itemHeight, containerHeight, scrollTop, overscan])

  const totalHeight = itemCount * itemHeight
  const startIndex = virtualItems[0]?.index ?? 0
  const endIndex = virtualItems[virtualItems.length - 1]?.index ?? 0

  return {
    virtualItems,
    totalHeight,
    startIndex,
    endIndex
  }
}

// Hook for virtualized list with scroll handling
export const useVirtualizedList = <T>(
  items: T[],
  itemHeight: number,
  containerHeight: number,
  overscan = 5
) => {
  const [scrollTop, setScrollTop] = useState(0)

  const handleScroll = useCallback((event: React.UIEvent<HTMLDivElement>) => {
    setScrollTop(event.currentTarget.scrollTop)
  }, [])

  const virtualization = useVirtualization(items.length, {
    itemHeight,
    containerHeight,
    overscan,
    scrollTop
  })

  const visibleItems = useMemo(() => {
    return virtualization.virtualItems.map(virtualItem => ({
      ...virtualItem,
      item: items[virtualItem.index]
    }))
  }, [virtualization.virtualItems, items])

  return {
    ...virtualization,
    visibleItems,
    handleScroll
  }
}
