// Performance monitoring utilities

interface PerformanceMetrics {
  name: string
  duration: number
  timestamp: number
}

class PerformanceMonitor {
  private metrics: PerformanceMetrics[] = []
  private observers: PerformanceObserver[] = []

  constructor() {
    this.initializeObservers()
  }

  private initializeObservers() {
    if (typeof window === 'undefined' || !window.PerformanceObserver) return

    // Observe navigation timing
    try {
      const navObserver = new PerformanceObserver((list) => {
        const entries = list.getEntries()
        entries.forEach((entry) => {
          if (entry.entryType === 'navigation') {
            this.recordMetric('page-load', entry.duration)
          }
        })
      })
      navObserver.observe({ entryTypes: ['navigation'] })
      this.observers.push(navObserver)
    } catch (e) {
      console.warn('Navigation timing observer not supported')
    }

    // Observe resource timing
    try {
      const resourceObserver = new PerformanceObserver((list) => {
        const entries = list.getEntries()
        entries.forEach((entry) => {
          if (entry.entryType === 'resource') {
            this.recordMetric(`resource-${entry.name}`, entry.duration)
          }
        })
      })
      resourceObserver.observe({ entryTypes: ['resource'] })
      this.observers.push(resourceObserver)
    } catch (e) {
      console.warn('Resource timing observer not supported')
    }

    // Observe largest contentful paint
    try {
      const lcpObserver = new PerformanceObserver((list) => {
        const entries = list.getEntries()
        const lastEntry = entries[entries.length - 1]
        if (lastEntry) {
          this.recordMetric('largest-contentful-paint', lastEntry.startTime)
        }
      })
      lcpObserver.observe({ entryTypes: ['largest-contentful-paint'] })
      this.observers.push(lcpObserver)
    } catch (e) {
      console.warn('LCP observer not supported')
    }

    // Observe first input delay
    try {
      const fidObserver = new PerformanceObserver((list) => {
        const entries = list.getEntries()
        entries.forEach((entry) => {
          this.recordMetric('first-input-delay', entry.processingStart - entry.startTime)
        })
      })
      fidObserver.observe({ entryTypes: ['first-input'] })
      this.observers.push(fidObserver)
    } catch (e) {
      console.warn('FID observer not supported')
    }
  }

  recordMetric(name: string, duration: number) {
    this.metrics.push({
      name,
      duration,
      timestamp: Date.now()
    })

    // Keep only last 100 metrics to prevent memory leaks
    if (this.metrics.length > 100) {
      this.metrics = this.metrics.slice(-100)
    }
  }

  getMetrics(): PerformanceMetrics[] {
    return [...this.metrics]
  }

  getMetricsByName(name: string): PerformanceMetrics[] {
    return this.metrics.filter(metric => metric.name === name)
  }

  getAverageMetric(name: string): number {
    const metrics = this.getMetricsByName(name)
    if (metrics.length === 0) return 0
    
    const sum = metrics.reduce((acc, metric) => acc + metric.duration, 0)
    return sum / metrics.length
  }

  clearMetrics() {
    this.metrics = []
  }

  destroy() {
    this.observers.forEach(observer => observer.disconnect())
    this.observers = []
    this.metrics = []
  }
}

// Singleton instance
export const performanceMonitor = new PerformanceMonitor()

// Utility functions
export const measureAsync = async <T>(
  name: string,
  asyncFn: () => Promise<T>
): Promise<T> => {
  const start = performance.now()
  try {
    const result = await asyncFn()
    const duration = performance.now() - start
    performanceMonitor.recordMetric(name, duration)
    return result
  } catch (error) {
    const duration = performance.now() - start
    performanceMonitor.recordMetric(`${name}-error`, duration)
    throw error
  }
}

export const measureSync = <T>(
  name: string,
  syncFn: () => T
): T => {
  const start = performance.now()
  try {
    const result = syncFn()
    const duration = performance.now() - start
    performanceMonitor.recordMetric(name, duration)
    return result
  } catch (error) {
    const duration = performance.now() - start
    performanceMonitor.recordMetric(`${name}-error`, duration)
    throw error
  }
}

// React component performance measurement
export const withPerformanceTracking = <P extends object>(
  Component: React.ComponentType<P>,
  componentName: string
) => {
  return React.memo((props: P) => {
    const renderStart = performance.now()
    
    React.useEffect(() => {
      const renderDuration = performance.now() - renderStart
      performanceMonitor.recordMetric(`component-${componentName}-render`, renderDuration)
    })

    return <Component {...props} />
  })
}

// Bundle size analysis
export const analyzeBundleSize = () => {
  if (typeof window === 'undefined') return

  const resources = performance.getEntriesByType('resource') as PerformanceResourceTiming[]
  const jsResources = resources.filter(resource => 
    resource.name.endsWith('.js') || resource.name.includes('chunk')
  )

  const bundleAnalysis = jsResources.map(resource => ({
    name: resource.name,
    size: resource.transferSize || resource.encodedBodySize || 0,
    loadTime: resource.duration,
    cached: resource.transferSize === 0
  }))

  console.table(bundleAnalysis)
  return bundleAnalysis
}

// Memory usage monitoring
export const getMemoryUsage = () => {
  if (typeof window === 'undefined' || !(performance as any).memory) {
    return null
  }

  const memory = (performance as any).memory
  return {
    usedJSHeapSize: memory.usedJSHeapSize,
    totalJSHeapSize: memory.totalJSHeapSize,
    jsHeapSizeLimit: memory.jsHeapSizeLimit,
    usagePercentage: (memory.usedJSHeapSize / memory.jsHeapSizeLimit) * 100
  }
}