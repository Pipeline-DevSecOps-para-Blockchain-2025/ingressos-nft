import { createPublicClient, http } from 'viem'
import { mainnet, sepolia, hardhat } from 'viem/chains'
import { INGRESSOS_ABI, INGRESSOS_CONTRACT_ADDRESS } from '../contracts'
import type { EventWithId, EventStats, OrganizerEventWithStats } from '../hooks/useOrganizerEvents'

export interface EventFetcherConfig {
  chainId: number
  contractAddress: `0x${string}`
}

export interface BatchFetchOptions {
  batchSize?: number
  startId?: number
  endId?: number
}

export interface EventQueryParams {
  organizer?: `0x${string}`
  status?: number[]
  limit?: number
  offset?: number
}

/**
 * EventFetcher class provides methods to query events from the smart contract
 * with batch fetching capabilities and data transformation utilities
 */
export class EventFetcher {
  private config: EventFetcherConfig

  private client: any

  constructor(chainId: number) {
    const contractAddress = INGRESSOS_CONTRACT_ADDRESS[chainId as keyof typeof INGRESSOS_CONTRACT_ADDRESS]

    if (!contractAddress || contractAddress === '0x0000000000000000000000000000000000000000') {
      throw new Error(`Contract not deployed on chain ${chainId}`)
    }

    this.config = {
      chainId,
      contractAddress: contractAddress as `0x${string}`
    }

    // Create viem client for the specific chain
    const chain = this.getChainConfig(chainId)
    this.client = createPublicClient({
      chain,
      transport: http()
    })
  }

  private getChainConfig(chainId: number) {
    switch (chainId) {
      case 1:
        return mainnet
      case 11155111:
        return sepolia
      case 31337:
        return hardhat
      default:
        throw new Error(`Unsupported chain ID: ${chainId}`)
    }
  }

  /**
   * Get the total number of events created
   */
  async getEventCount(): Promise<number> {
    try {
      const nextEventId = await this.client.readContract({
        address: this.config.contractAddress,
        abi: INGRESSOS_ABI,
        functionName: 'nextEventId',
      }) as bigint

      return Number(nextEventId) - 1 // nextEventId is 1-based, so subtract 1 for count
    } catch (error) {
      console.error('Error fetching event count:', error)
      throw new Error('Failed to fetch event count from contract')
    }
  }

  /**
   * Fetch a single event's details by ID
   */
  async fetchEventDetails(eventId: number): Promise<EventWithId | null> {
    try {
      const eventData = await this.client.readContract({
        address: this.config.contractAddress,
        abi: INGRESSOS_ABI,
        functionName: 'getEventDetails',
        args: [BigInt(eventId)],
      }) as any

      return this.transformEventData(eventId, eventData)
    } catch (error) {
      console.error(`Error fetching event ${eventId}:`, error)
      return null // Return null for non-existent events
    }
  }

  /**
   * Fetch event statistics (revenue, tickets sold, etc.)
   */
  async fetchEventStats(eventId: number): Promise<EventStats> {
    try {
      // Fetch revenue data in parallel
      const [totalRevenue, availableRevenue] = await Promise.all([
        this.client.readContract({
          address: this.config.contractAddress,
          abi: INGRESSOS_ABI,
          functionName: 'getTotalRevenue',
          args: [BigInt(eventId)],
        }) as Promise<bigint>,
        this.client.readContract({
          address: this.config.contractAddress,
          abi: INGRESSOS_ABI,
          functionName: 'getWithdrawableAmount',
          args: [BigInt(eventId)],
        }) as Promise<bigint>
      ])
      const withdrawnRevenue = totalRevenue - availableRevenue

      // Get event details to calculate ticket statistics
      const eventDetails = await this.fetchEventDetails(eventId)
      const ticketsSold = eventDetails ? Number(eventDetails.currentSupply) : 0
      const totalTickets = eventDetails ? Number(eventDetails.maxSupply) : 0

      return {
        totalRevenue,
        withdrawnRevenue,
        availableRevenue,
        ticketsSold,
        totalTickets,
      }
    } catch (error) {
      console.error(`Error fetching stats for event ${eventId}:`, error)
      // Return default stats on error
      return {
        totalRevenue: 0n,
        withdrawnRevenue: 0n,
        availableRevenue: 0n,
        ticketsSold: 0,
        totalTickets: 0,
      }
    }
  }

  /**
   * Fetch events in batches for performance optimization
   */
  async fetchEventsBatch(startId: number, endId: number): Promise<EventWithId[]> {
    const events: EventWithId[] = []
    const batchSize = 10 // Process 10 events at a time to avoid RPC limits

    for (let i = startId; i <= endId; i += batchSize) {
      const batchEnd = Math.min(i + batchSize - 1, endId)
      const batchPromises: Promise<EventWithId | null>[] = []

      // Create batch of promises for parallel execution
      for (let eventId = i; eventId <= batchEnd; eventId++) {
        batchPromises.push(this.fetchEventDetails(eventId))
      }

      try {
        const batchResults = await Promise.all(batchPromises)

        // Filter out null results (non-existent events)
        const validEvents = batchResults.filter((event): event is EventWithId => event !== null)
        events.push(...validEvents)
      } catch (error) {
        console.error(`Error fetching batch ${i}-${batchEnd}:`, error)
        // Continue with next batch even if current batch fails
      }
    }

    return events
  }

  /**
   * Fetch all events for a specific organizer with statistics
   */
  async fetchOrganizerEvents(organizerAddress: `0x${string}`): Promise<OrganizerEventWithStats[]> {
    try {
      const totalEvents = await this.getEventCount()

      if (totalEvents === 0) {
        return []
      }

      // Fetch all events in batches
      const allEvents = await this.fetchEventsBatch(1, totalEvents)

      // Filter events by organizer
      const organizerEvents = allEvents.filter(
        event => event.organizer.toLowerCase() === organizerAddress.toLowerCase()
      )

      // Fetch statistics for each organizer event
      const eventsWithStats = await Promise.all(
        organizerEvents.map(async (event) => {
          const stats = await this.fetchEventStats(event.eventId)
          return {
            ...event,
            stats
          }
        })
      )

      return eventsWithStats
    } catch (error) {
      console.error('Error fetching organizer events:', error)
      throw new Error('Failed to fetch organizer events')
    }
  }

  /**
   * Fetch all events with optional filtering
   */
  async fetchAllEvents(params: EventQueryParams = {}): Promise<OrganizerEventWithStats[]> {
    try {
      const totalEvents = await this.getEventCount()

      if (totalEvents === 0) {
        return []
      }

      const { limit, offset = 0 } = params
      const startId = offset + 1
      const endId = limit ? Math.min(startId + limit - 1, totalEvents) : totalEvents

      // Fetch events in the specified range
      const events = await this.fetchEventsBatch(startId, endId)

      // Apply filters
      let filteredEvents = events

      if (params.organizer) {
        filteredEvents = filteredEvents.filter(
          event => event.organizer.toLowerCase() === params.organizer!.toLowerCase()
        )
      }

      if (params.status && params.status.length > 0) {
        filteredEvents = filteredEvents.filter(
          event => params.status!.includes(event.status)
        )
      }

      // Fetch statistics for filtered events
      const eventsWithStats = await Promise.all(
        filteredEvents.map(async (event) => {
          const stats = await this.fetchEventStats(event.eventId)
          return {
            ...event,
            stats
          }
        })
      )

      return eventsWithStats
    } catch (error) {
      console.error('Error fetching all events:', error)
      throw new Error('Failed to fetch events')
    }
  }

  /**
   * Batch fetch events with their statistics efficiently
   */
  async fetchEventsWithStatsBatch(eventIds: number[]): Promise<OrganizerEventWithStats[]> {
    try {
      // Fetch event details in parallel
      const eventPromises = eventIds.map(id => this.fetchEventDetails(id))
      const events = await Promise.all(eventPromises)

      // Filter out null results
      const validEvents = events.filter((event): event is EventWithId => event !== null)

      // Fetch statistics in parallel
      const statsPromises = validEvents.map(event => this.fetchEventStats(event.eventId))
      const stats = await Promise.all(statsPromises)

      // Combine events with their statistics
      return validEvents.map((event, index) => ({
        ...event,
        stats: stats[index]
      }))
    } catch (error) {
      console.error('Error batch fetching events with stats:', error)
      throw new Error('Failed to batch fetch events with statistics')
    }
  }

  /**
   * Transform raw contract event data into typed interface
   */
  private transformEventData(eventId: number, rawData: any): EventWithId {
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
   * Get the current contract configuration
   */
  getConfig(): EventFetcherConfig {
    return { ...this.config }
  }

  /**
   * Update the chain ID and contract address
   */
  updateChain(chainId: number): void {
    const contractAddress = INGRESSOS_CONTRACT_ADDRESS[chainId as keyof typeof INGRESSOS_CONTRACT_ADDRESS]

    if (!contractAddress || contractAddress === '0x0000000000000000000000000000000000000000') {
      throw new Error(`Contract not deployed on chain ${chainId}`)
    }

    this.config = {
      chainId,
      contractAddress: contractAddress as `0x${string}`
    }

    // Recreate client for new chain
    const chain = this.getChainConfig(chainId)
    this.client = createPublicClient({
      chain,
      transport: http()
    })
  }
}

/**
 * Helper function to create an EventFetcher instance for the current chain
 */
export function createEventFetcher(chainId: number): EventFetcher {
  return new EventFetcher(chainId)
}

/**
 * Helper function to validate event data
 */
export function validateEventData(event: any): event is EventWithId {
  return (
    typeof event === 'object' &&
    event !== null &&
    typeof event.eventId === 'number' &&
    typeof event.name === 'string' &&
    typeof event.organizer === 'string' &&
    event.organizer.startsWith('0x')
  )
}

/**
 * Helper function to sort events by different criteria
 */
export function sortEvents(
  events: OrganizerEventWithStats[],
  sortBy: 'date' | 'created' | 'name' | 'revenue' = 'created',
  order: 'asc' | 'desc' = 'desc'
): OrganizerEventWithStats[] {
  return [...events].sort((a, b) => {
    let comparison = 0

    switch (sortBy) {
      case 'date':
        comparison = Number(a.date) - Number(b.date)
        break
      case 'created':
        comparison = Number(a.createdAt) - Number(b.createdAt)
        break
      case 'name':
        comparison = a.name.localeCompare(b.name)
        break
      case 'revenue':
        comparison = Number(a.stats.totalRevenue) - Number(b.stats.totalRevenue)
        break
    }

    return order === 'asc' ? comparison : -comparison
  })
}

/**
 * Helper function to filter events by status
 */
export function filterEventsByStatus(
  events: OrganizerEventWithStats[],
  statuses: number[]
): OrganizerEventWithStats[] {
  if (statuses.length === 0) return events
  return events.filter(event => statuses.includes(event.status))
}

/**
 * Helper function to calculate aggregate statistics
 */
export function calculateAggregateStats(events: OrganizerEventWithStats[]) {
  return events.reduce(
    (acc, event) => ({
      totalEvents: acc.totalEvents + 1,
      totalRevenue: acc.totalRevenue + event.stats.totalRevenue,
      totalTicketsSold: acc.totalTicketsSold + event.stats.ticketsSold,
      totalTicketsAvailable: acc.totalTicketsAvailable + event.stats.totalTickets,
      availableRevenue: acc.availableRevenue + event.stats.availableRevenue,
    }),
    {
      totalEvents: 0,
      totalRevenue: 0n,
      totalTicketsSold: 0,
      totalTicketsAvailable: 0,
      availableRevenue: 0n,
    }
  )
}
