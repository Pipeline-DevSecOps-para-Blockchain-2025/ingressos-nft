import type { EventWithId, EventStats, OrganizerEventWithStats } from '../hooks/useOrganizerEvents'

/**
 * Raw event data structure from smart contract
 */
export interface RawEventData {
  name: string
  description: string
  date: bigint
  venue: string
  ticketPrice: bigint
  maxSupply: bigint
  currentSupply: bigint
  organizer: `0x${string}`
  status: number
  createdAt: bigint
}

/**
 * Raw statistics data from contract calls
 */
export interface RawEventStats {
  totalRevenue: bigint
  availableRevenue: bigint
  currentSupply: bigint
  maxSupply: bigint
}

/**
 * Transform raw contract event data into typed EventWithId interface
 */
export function transformRawEventData(eventId: number, rawData: RawEventData): EventWithId {
  return {
    eventId,
    name: rawData.name,
    description: rawData.description,
    date: rawData.date,
    venue: rawData.venue,
    ticketPrice: rawData.ticketPrice,
    maxSupply: rawData.maxSupply,
    currentSupply: rawData.currentSupply,
    organizer: rawData.organizer,
    status: rawData.status,
    createdAt: rawData.createdAt,
  }
}

/**
 * Transform raw statistics data into EventStats interface
 */
export function transformRawStatsData(rawStats: RawEventStats): EventStats {
  const totalRevenue = rawStats.totalRevenue
  const availableRevenue = rawStats.availableRevenue
  const withdrawnRevenue = totalRevenue - availableRevenue
  const ticketsSold = Number(rawStats.currentSupply)
  const totalTickets = Number(rawStats.maxSupply)

  return {
    totalRevenue,
    withdrawnRevenue,
    availableRevenue,
    ticketsSold,
    totalTickets,
  }
}

/**
 * Combine event data with statistics
 */
export function combineEventWithStats(
  event: EventWithId,
  stats: EventStats
): OrganizerEventWithStats {
  return {
    ...event,
    stats,
  }
}

/**
 * Validate that raw event data has all required fields
 */
export function validateRawEventData(data: any): data is RawEventData {
  return (
    data &&
    typeof data.name === 'string' &&
    typeof data.description === 'string' &&
    typeof data.date === 'bigint' &&
    typeof data.venue === 'string' &&
    typeof data.ticketPrice === 'bigint' &&
    typeof data.maxSupply === 'bigint' &&
    typeof data.currentSupply === 'bigint' &&
    typeof data.organizer === 'string' &&
    data.organizer.startsWith('0x') &&
    typeof data.status === 'number' &&
    typeof data.createdAt === 'bigint'
  )
}

/**
 * Validate event statistics data
 */
export function validateRawStatsData(data: any): data is RawEventStats {
  return (
    data &&
    typeof data.totalRevenue === 'bigint' &&
    typeof data.availableRevenue === 'bigint' &&
    typeof data.currentSupply === 'bigint' &&
    typeof data.maxSupply === 'bigint'
  )
}

/**
 * Transform multiple raw events with their statistics
 */
export function transformEventsBatch(
  rawEvents: Array<{ eventId: number; data: RawEventData; stats: RawEventStats }>
): OrganizerEventWithStats[] {
  return rawEvents
    .filter(({ data, stats }) => validateRawEventData(data) && validateRawStatsData(stats))
    .map(({ eventId, data, stats }) => {
      const event = transformRawEventData(eventId, data)
      const eventStats = transformRawStatsData(stats)
      return combineEventWithStats(event, eventStats)
    })
}

/**
 * Create default/empty event statistics
 */
export function createEmptyEventStats(): EventStats {
  return {
    totalRevenue: 0n,
    withdrawnRevenue: 0n,
    availableRevenue: 0n,
    ticketsSold: 0,
    totalTickets: 0,
  }
}

/**
 * Create a mock event for testing purposes
 */
export function createMockEvent(
  eventId: number,
  organizer: `0x${string}`,
  overrides: Partial<EventWithId> = {}
): EventWithId {
  return {
    eventId,
    name: `Mock Event ${eventId}`,
    description: `Description for mock event ${eventId}`,
    date: BigInt(Date.now() + 86400000), // Tomorrow
    venue: `Venue ${eventId}`,
    ticketPrice: BigInt('10000000000000000'), // 0.01 ETH
    maxSupply: BigInt(100),
    currentSupply: BigInt(0),
    organizer,
    status: 0, // ACTIVE
    createdAt: BigInt(Math.floor(Date.now() / 1000)),
    ...overrides,
  }
}

/**
 * Create mock event statistics
 */
export function createMockEventStats(overrides: Partial<EventStats> = {}): EventStats {
  return {
    totalRevenue: 0n,
    withdrawnRevenue: 0n,
    availableRevenue: 0n,
    ticketsSold: 0,
    totalTickets: 100,
    ...overrides,
  }
}

/**
 * Format event date for display
 */
export function formatEventDate(timestamp: bigint): string {
  const date = new Date(Number(timestamp) * 1000)
  return date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

/**
 * Check if an event is in the past
 */
export function isEventPast(eventDate: bigint): boolean {
  const now = Math.floor(Date.now() / 1000)
  return Number(eventDate) < now
}

/**
 * Check if an event is sold out
 */
export function isEventSoldOut(event: EventWithId): boolean {
  return event.currentSupply >= event.maxSupply
}

/**
 * Calculate event progress percentage
 */
export function calculateEventProgress(event: EventWithId): number {
  if (event.maxSupply === 0n) return 0
  return Math.round((Number(event.currentSupply) / Number(event.maxSupply)) * 100)
}

/**
 * Get event status label
 */
export function getEventStatusLabel(status: number): string {
  const statusLabels = {
    0: 'Active',
    1: 'Paused',
    2: 'Cancelled',
    3: 'Completed',
  }
  return statusLabels[status as keyof typeof statusLabels] || 'Unknown'
}

/**
 * Get event status color for UI
 */
export function getEventStatusColor(status: number): string {
  const statusColors = {
    0: 'green', // Active
    1: 'yellow', // Paused
    2: 'red', // Cancelled
    3: 'blue', // Completed
  }
  return statusColors[status as keyof typeof statusColors] || 'gray'
}

/**
 * Filter events by date range
 */
export function filterEventsByDateRange(
  events: OrganizerEventWithStats[],
  startDate?: Date,
  endDate?: Date
): OrganizerEventWithStats[] {
  return events.filter(event => {
    const eventDate = new Date(Number(event.date) * 1000)

    if (startDate && eventDate < startDate) return false
    if (endDate && eventDate > endDate) return false

    return true
  })
}

/**
 * Search events by name or description
 */
export function searchEvents(
  events: OrganizerEventWithStats[],
  query: string
): OrganizerEventWithStats[] {
  if (!query.trim()) return events

  const lowercaseQuery = query.toLowerCase()

  return events.filter(event =>
    event.name.toLowerCase().includes(lowercaseQuery) ||
    event.description.toLowerCase().includes(lowercaseQuery) ||
    event.venue.toLowerCase().includes(lowercaseQuery)
  )
}
