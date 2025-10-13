import { createPublicClient, http, decodeEventLog } from 'viem'
import type { Log } from 'viem'
import { mainnet, sepolia, hardhat } from 'viem/chains'
import { INGRESSOS_ABI, INGRESSOS_CONTRACT_ADDRESS } from '../contracts'

/**
 * Event types that can be listened to from the smart contract
 */
export type ContractEventType = 'EventCreated' | 'TicketPurchased' | 'EventStatusChanged' | 'RevenueWithdrawn'

/**
 * Parsed event data structures
 */
export interface EventCreatedData {
  eventId: bigint
  name: string
  organizer: `0x${string}`
  ticketPrice: bigint
  maxSupply: bigint
}

export interface TicketPurchasedData {
  tokenId: bigint
  eventId: bigint
  buyer: `0x${string}`
  ticketNumber: bigint
  price: bigint
}

export interface EventStatusChangedData {
  eventId: bigint
  oldStatus: number
  newStatus: number
}

export interface RevenueWithdrawnData {
  eventId: bigint
  organizer: `0x${string}`
  amount: bigint
}

/**
 * Union type for all event data
 */
export type ContractEventData =
  | { type: 'EventCreated'; data: EventCreatedData }
  | { type: 'TicketPurchased'; data: TicketPurchasedData }
  | { type: 'EventStatusChanged'; data: EventStatusChangedData }
  | { type: 'RevenueWithdrawn'; data: RevenueWithdrawnData }

/**
 * Event listener callback function type
 */
export type EventCallback = (event: ContractEventData) => void | Promise<void>

/**
 * Event filter configuration
 */
export interface EventFilter {
  eventTypes?: ContractEventType[]
  organizerAddress?: `0x${string}`
  eventIds?: bigint[]
  fromBlock?: bigint
  toBlock?: bigint
}

/**
 * Event listener configuration
 */
export interface EventListenerConfig {
  chainId: number
  contractAddress: `0x${string}`
  pollingInterval?: number // in milliseconds
  batchSize?: number
}

/**
 * Event listener service for monitoring blockchain events
 */
export class EventListenerService {
  private config: EventListenerConfig
  private client: any
  private listeners: Map<string, EventCallback> = new Map()
  private isListening: boolean = false
  private pollingInterval: NodeJS.Timeout | null = null
  private lastProcessedBlock: bigint = 0n

  constructor(chainId: number, options: { pollingInterval?: number; batchSize?: number } = {}) {
    const contractAddress = INGRESSOS_CONTRACT_ADDRESS[chainId as keyof typeof INGRESSOS_CONTRACT_ADDRESS]

    if (!contractAddress || contractAddress === '0x0000000000000000000000000000000000000000') {
      throw new Error(`Contract not deployed on chain ${chainId}`)
    }

    this.config = {
      chainId,
      contractAddress: contractAddress as `0x${string}`,
      pollingInterval: options.pollingInterval || 5000, // 5 seconds default
      batchSize: options.batchSize || 100,
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
   * Add an event listener with optional filtering
   */
  addEventListener(
    listenerId: string,
    callback: EventCallback,
    filter: EventFilter = {}
  ): void {
    // Store the callback with filter information
    const wrappedCallback: EventCallback = (event) => {
      if (this.shouldProcessEvent(event, filter)) {
        callback(event)
      }
    }

    this.listeners.set(listenerId, wrappedCallback)

    // Start listening if this is the first listener
    if (this.listeners.size === 1 && !this.isListening) {
      this.startListening()
    }
  }

  /**
   * Remove an event listener
   */
  removeEventListener(listenerId: string): void {
    this.listeners.delete(listenerId)

    // Stop listening if no more listeners
    if (this.listeners.size === 0) {
      this.stopListening()
    }
  }

  /**
   * Remove all event listeners
   */
  removeAllListeners(): void {
    this.listeners.clear()
    this.stopListening()
  }

  /**
   * Start listening for events
   */
  private async startListening(): Promise<void> {
    if (this.isListening) return

    this.isListening = true

    try {
      // Get current block number as starting point
      this.lastProcessedBlock = await this.client.getBlockNumber()
    } catch (error) {
      console.error('Failed to get current block number:', error)
      this.lastProcessedBlock = 0n
    }

    // Start polling for events
    this.pollingInterval = setInterval(() => {
      this.pollForEvents().catch(error => {
        console.error('Error polling for events:', error)
      })
    }, this.config.pollingInterval)

    console.log(`Started listening for events on chain ${this.config.chainId}`)
  }

  /**
   * Stop listening for events
   */
  private stopListening(): void {
    if (!this.isListening) return

    this.isListening = false

    if (this.pollingInterval) {
      clearInterval(this.pollingInterval)
      this.pollingInterval = null
    }

    console.log(`Stopped listening for events on chain ${this.config.chainId}`)
  }

  /**
   * Poll for new events since last processed block
   */
  private async pollForEvents(): Promise<void> {
    try {
      const currentBlock = await this.client.getBlockNumber()

      if (currentBlock <= this.lastProcessedBlock) {
        return // No new blocks
      }

      const fromBlock = this.lastProcessedBlock + 1n
      const toBlock = currentBlock

      // Fetch events for each event type
      const eventPromises = [
        this.fetchEventLogs('EventCreated', fromBlock, toBlock),
        this.fetchEventLogs('TicketPurchased', fromBlock, toBlock),
        this.fetchEventLogs('EventStatusChanged', fromBlock, toBlock),
        this.fetchEventLogs('RevenueWithdrawn', fromBlock, toBlock),
      ]

      const eventResults = await Promise.all(eventPromises)
      const allEvents = eventResults.flat()

      // Sort events by block number and log index
      allEvents.sort((a, b) => {
        const blockDiff = Number(a.blockNumber) - Number(b.blockNumber)
        if (blockDiff !== 0) return blockDiff
        return Number(a.logIndex) - Number(b.logIndex)
      })

      // Process each event
      for (const log of allEvents) {
        try {
          const parsedEvent = this.parseEventLog(log)
          if (parsedEvent) {
            // Notify all listeners
            for (const callback of this.listeners.values()) {
              try {
                await callback(parsedEvent)
              } catch (error) {
                console.error('Error in event callback:', error)
              }
            }
          }
        } catch (error) {
          console.error('Error parsing event log:', error)
        }
      }

      this.lastProcessedBlock = currentBlock

    } catch (error) {
      console.error('Error polling for events:', error)
    }
  }

  /**
   * Fetch event logs for a specific event type
   */
  private async fetchEventLogs(
    eventName: ContractEventType,
    fromBlock: bigint,
    toBlock: bigint
  ): Promise<Log[]> {
    try {
      const eventAbi = INGRESSOS_ABI.find(
        item => item.type === 'event' && item.name === eventName
      )

      if (!eventAbi) {
        throw new Error(`Event ${eventName} not found in ABI`)
      }

      const logs = await this.client.getLogs({
        address: this.config.contractAddress,
        event: eventAbi,
        fromBlock,
        toBlock,
      })

      return logs
    } catch (error) {
      console.error(`Error fetching ${eventName} logs:`, error)
      return []
    }
  }

  /**
   * Parse a raw event log into typed event data
   */
  private parseEventLog(log: Log): ContractEventData | null {
    try {
      // Use viem's decodeEventLog for proper parsing
      const decoded = decodeEventLog({
        abi: INGRESSOS_ABI,
        data: log.data,
        topics: log.topics,
      })

      const eventName = decoded.eventName as ContractEventType

      switch (eventName) {
        case 'EventCreated':
          const eventCreatedArgs = decoded.args as any
          return {
            type: 'EventCreated',
            data: {
              eventId: eventCreatedArgs.eventId,
              name: eventCreatedArgs.name,
              organizer: eventCreatedArgs.organizer,
              ticketPrice: eventCreatedArgs.ticketPrice,
              maxSupply: eventCreatedArgs.maxSupply,
            }
          }

        case 'TicketPurchased':
          const ticketPurchasedArgs = decoded.args as any
          return {
            type: 'TicketPurchased',
            data: {
              tokenId: ticketPurchasedArgs.tokenId,
              eventId: ticketPurchasedArgs.eventId,
              buyer: ticketPurchasedArgs.buyer,
              ticketNumber: ticketPurchasedArgs.ticketNumber,
              price: ticketPurchasedArgs.price,
            }
          }

        case 'EventStatusChanged':
          const statusChangedArgs = decoded.args as any
          return {
            type: 'EventStatusChanged',
            data: {
              eventId: statusChangedArgs.eventId,
              oldStatus: statusChangedArgs.oldStatus,
              newStatus: statusChangedArgs.newStatus,
            }
          }

        case 'RevenueWithdrawn':
          const revenueWithdrawnArgs = decoded.args as any
          return {
            type: 'RevenueWithdrawn',
            data: {
              eventId: revenueWithdrawnArgs.eventId,
              organizer: revenueWithdrawnArgs.organizer,
              amount: revenueWithdrawnArgs.amount,
            }
          }

        default:
          return null
      }
    } catch (error) {
      console.error('Error parsing event log:', error)
      return null
    }
  }



  /**
   * Check if an event should be processed based on filter
   */
  private shouldProcessEvent(event: ContractEventData, filter: EventFilter): boolean {
    // Filter by event types
    if (filter.eventTypes && !filter.eventTypes.includes(event.type)) {
      return false
    }

    // Filter by organizer address
    if (filter.organizerAddress) {
      const eventOrganizer = this.getEventOrganizer(event)
      if (eventOrganizer && eventOrganizer.toLowerCase() !== filter.organizerAddress.toLowerCase()) {
        return false
      }
    }

    // Filter by event IDs
    if (filter.eventIds && filter.eventIds.length > 0) {
      const eventId = this.getEventId(event)
      if (eventId !== null && !filter.eventIds.includes(eventId)) {
        return false
      }
    }

    return true
  }

  /**
   * Extract organizer address from event data
   */
  private getEventOrganizer(event: ContractEventData): `0x${string}` | null {
    switch (event.type) {
      case 'EventCreated':
      case 'RevenueWithdrawn':
        return event.data.organizer
      default:
        return null
    }
  }

  /**
   * Extract event ID from event data
   */
  private getEventId(event: ContractEventData): bigint | null {
    return 'eventId' in event.data ? event.data.eventId : null
  }

  /**
   * Get current configuration
   */
  getConfig(): EventListenerConfig {
    return { ...this.config }
  }

  /**
   * Check if currently listening
   */
  isCurrentlyListening(): boolean {
    return this.isListening
  }

  /**
   * Get number of active listeners
   */
  getListenerCount(): number {
    return this.listeners.size
  }

  /**
   * Update polling interval
   */
  updatePollingInterval(intervalMs: number): void {
    this.config.pollingInterval = intervalMs

    if (this.isListening) {
      this.stopListening()
      this.startListening()
    }
  }

  /**
   * Manually trigger event polling (useful for testing)
   */
  async triggerPoll(): Promise<void> {
    if (this.isListening) {
      await this.pollForEvents()
    }
  }

  /**
   * Get the last processed block number
   */
  getLastProcessedBlock(): bigint {
    return this.lastProcessedBlock
  }

  /**
   * Set the starting block for event listening
   */
  setStartingBlock(blockNumber: bigint): void {
    this.lastProcessedBlock = blockNumber
  }

  /**
   * Cleanup resources
   */
  destroy(): void {
    this.removeAllListeners()
    this.stopListening()
  }
}
