import { useState, useEffect } from 'react'

export const useMediaQuery = (query: string): boolean => {
  const [matches, setMatches] = useState(false)

  useEffect(() => {
    if (typeof window === 'undefined') return

    const mediaQuery = window.matchMedia(query)
    setMatches(mediaQuery.matches)

    const handleChange = (event: MediaQueryListEvent) => {
      setMatches(event.matches)
    }

    mediaQuery.addEventListener('change', handleChange)
    return () => mediaQuery.removeEventListener('change', handleChange)
  }, [query])

  return matches
}

// Predefined breakpoint hooks
export const useIsMobile = () => useMediaQuery('(max-width: 768px)')
export const useIsTablet = () => useMediaQuery('(min-width: 769px) and (max-width: 1024px)')
export const useIsDesktop = () => useMediaQuery('(min-width: 1025px)')
export const useIsLargeScreen = () => useMediaQuery('(min-width: 1440px)')

// Responsive hook that returns current breakpoint
export const useBreakpoint = () => {
  const isMobile = useIsMobile()
  const isTablet = useIsTablet()
  const isDesktop = useIsDesktop()
  const isLargeScreen = useIsLargeScreen()

  if (isLargeScreen) return 'xl'
  if (isDesktop) return 'lg'
  if (isTablet) return 'md'
  if (isMobile) return 'sm'
  return 'xs'
}

// Hook for reduced motion preference
export const usePrefersReducedMotion = () => {
  return useMediaQuery('(prefers-reduced-motion: reduce)')
}

// Hook for high contrast preference
export const usePrefersHighContrast = () => {
  return useMediaQuery('(prefers-contrast: high)')
}