import { lazy } from 'react'

// Lazy load page components for code splitting
export const LazyEvents = lazy(() => import('../pages/Events'))
export const LazyMyTickets = lazy(() => import('../pages/MyTickets'))
export const LazyOrganizerDashboard = lazy(() => import('../pages/OrganizerDashboard'))
export const LazyAdminPanel = lazy(() => import('../pages/AdminPanel'))

// Lazy load large components
export const LazyActivityFeed = lazy(() => import('../components/ActivityFeed'))
export const LazyRealTimeDashboard = lazy(() => import('../components/RealTimeDashboard'))
export const LazyPlatformStats = lazy(() => import('../components/PlatformStats'))

// Preload functions for better UX
export const preloadEvents = () => import('../pages/Events')
export const preloadMyTickets = () => import('../pages/MyTickets')
export const preloadOrganizerDashboard = () => import('../pages/OrganizerDashboard')
export const preloadAdminPanel = () => import('../pages/AdminPanel')

// Preload on hover/focus for better perceived performance
export const usePreloadOnHover = () => {
  const preloadOnHover = (preloadFn: () => Promise<any>) => ({
    onMouseEnter: preloadFn,
    onFocus: preloadFn
  })

  return { preloadOnHover }
}