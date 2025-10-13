// Event fetching services
export { EventFetcher } from './EventFetcher'
export {
  EventFetcherFactory,
  EventFetcherError,
  EventFetcherErrorType,
  RetryUtility,
  EventFetcherUtils
} from './EventFetcherFactory'

// Event listener services
export { EventListenerService } from './EventListenerService'
export { EventListenerFactory, GlobalEventListener } from './EventListenerFactory'

// UI update services
export { UIUpdateService, uiUpdateService, UIUpdateHelpers } from './UIUpdateService'
export { EventUIIntegration, EventUIIntegrationHelpers } from './EventUIIntegration'

// Cache services
export { EventCache, CacheKeyBuilder, EventCacheUtils, eventCache } from './EventCache'
export { EventCacheIntegration } from './EventCacheIntegration'

// Event transformation utilities
export {
  transformRawEventData,
  transformRawStatsData,
  combineEventWithStats,
  validateRawEventData,
  validateRawStatsData,
  transformEventsBatch,
  createEmptyEventStats,
  createMockEvent,
  createMockEventStats,
  formatEventDate,
  isEventPast,
  isEventSoldOut,
  calculateEventProgress,
  getEventStatusLabel,
  getEventStatusColor,
  filterEventsByDateRange,
  searchEvents,
} from '../utils/eventTransforms'

// Re-export types for convenience
export type {
  EventFetcherConfig,
  BatchFetchOptions,
  EventQueryParams,
} from './EventFetcher'

export type {
  RawEventData,
  RawEventStats,
} from '../utils/eventTransforms'

export type {
  ContractEventType,
  ContractEventData,
  EventCallback,
  EventFilter,
  EventCreatedData,
  TicketPurchasedData,
  EventStatusChangedData,
  RevenueWithdrawnData,
} from './EventListenerService'

export type {
  UIUpdateCallback,
  UIUpdateTrigger,
  UIUpdateConfig,
} from './UIUpdateService'

export type {
  CacheEntry,
  CacheConfig,
  CacheStats,
  InvalidationOptions,
} from './EventCache'
