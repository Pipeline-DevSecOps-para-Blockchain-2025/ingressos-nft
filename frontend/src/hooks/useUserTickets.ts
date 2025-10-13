import { useState, useEffect, useCallback } from 'react'
import { useChainId } from 'wagmi'
import { useWallet } from './useWallet'
import { useIngressosContract } from './useIngressosContract'
import { useRetryLogic } from './useOrganizerEventsErrorHandler'
import { EventFetcherFactory } from '../services'
import type { Address } from 'viem'
import type { EventFetcher } from '../services'

export interface TicketMetadata {
  tokenId: number
  eventId: number
  ticketNumber: number
  purchasePrice: bigint
  purchaseDate: number
  originalBuyer: Address
  currentOwner: Address
  eventName: string
  eventDescription: string
  eventDate: number
  eventVenue: string
  eventStatus: number
  isTransferred: boolean
}

export interface UseUserTicketsReturn {
  tickets: TicketMetadata[]
  isLoading: boolean
  error: Error | null
  refetch: () => void
  getTicketById: (tokenId: number) => TicketMetadata | undefined
}

export const useUserTickets = (): UseUserTicketsReturn => {
  const { address, isConnected } = useWallet()
  const { isContractReady, balanceOf } = useIngressosContract()
  const chainId = useChainId()

  const [tickets, setTickets] = useState<TicketMetadata[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<Error | null>(null)
  const [eventFetcher, setEventFetcher] = useState<EventFetcher | null>(null)

  // Simple cache state for user tickets
  const [ticketCache, setTicketCache] = useState<Map<string, {
    data: TicketMetadata[]
    timestamp: number
    ttl: number
  }>>(new Map())

  // Initialize retry logic with error handling
  const { executeWithRetry, handleError } = useRetryLogic()

  // Cache helper functions
  const getCachedTickets = useCallback((cacheKey: string): TicketMetadata[] | null => {
    const cached = ticketCache.get(cacheKey)
    if (!cached) return null

    const now = Date.now()
    if (now - cached.timestamp > cached.ttl) {
      ticketCache.delete(cacheKey)
      return null
    }

    return cached.data
  }, [ticketCache])

  const setCachedTickets = useCallback((cacheKey: string, data: TicketMetadata[]) => {
    setTicketCache(prev => new Map(prev.set(cacheKey, {
      data,
      timestamp: Date.now(),
      ttl: 10 * 60 * 1000 // OPTIMIZATION 5: Longer cache (10 minutes) for better performance
    })))
  }, [])

  // Initialize EventFetcher when chain changes
  useEffect(() => {
    if (!chainId) {
      console.log('No chainId available, clearing EventFetcher')
      setEventFetcher(null)
      return
    }

    console.log(`Initializing EventFetcher for chain ${chainId}`)

    try {
      const fetcher = EventFetcherFactory.getInstance(chainId)
      setEventFetcher(fetcher)
      console.log(`EventFetcher initialized successfully for chain ${chainId}`)
    } catch (error) {
      console.error(`Failed to initialize EventFetcher for chain ${chainId}:`, error)
      // Don't set this as a user-facing error since we have fallback logic
      setEventFetcher(null)
    }
  }, [chainId])

  // Get user's NFT balance using the contract hook
  const balanceQuery = balanceOf(address as Address)
  const isBalanceLoading = balanceQuery.isLoading
  const refetchBalance = balanceQuery.refetch

  // Fetch all user tickets with dynamic blockchain queries using events
  const fetchUserTickets = useCallback(async (forceRefresh = false) => {
    console.log('fetchUserTickets called:', {
      isContractReady,
      isConnected,
      address,
      chainId,
      eventFetcher: !!eventFetcher,
      forceRefresh
    })

    if (!isContractReady || !isConnected || !address) {
      console.log('Prerequisites not met, clearing tickets')
      setTickets([])
      return
    }

    // Check cache first (unless force refresh)
    const cacheKey = `user-tickets-${address}-${chainId}`
    const cachedTickets = getCachedTickets(cacheKey)

    if (!forceRefresh && cachedTickets) {
      console.log('Using cached user tickets')
      setTickets(cachedTickets)
      return
    }

    setIsLoading(true)
    setError(null)

    try {
      console.log('Fetching user tickets from blockchain...')

      // If EventFetcher is not available, fall back to a simpler approach
      if (!eventFetcher) {
        console.log('EventFetcher not available, using balance-based approach')

        // Get user's balance to know how many tickets they might have
        const userBalance = balanceQuery.data ? Number(balanceQuery.data) : 0
        console.log('User balance:', userBalance)

        if (userBalance === 0) {
          console.log('User has no tickets (balance = 0)')
          setTickets([])
          setIsLoading(false)
          return
        }

        // Check a reasonable range of token IDs for tickets owned by user
        const userTickets: TicketMetadata[] = []
        const maxTokensToCheck = Math.min(userBalance * 10, 500) // Reasonable limit
        console.log(`Checking ${maxTokensToCheck} token IDs for user ownership`)

        for (let tokenId = 1; tokenId <= maxTokensToCheck; tokenId++) {
          try {
            const ticket = await fetchTicketMetadata(tokenId)
            if (ticket && ticket.currentOwner.toLowerCase() === address.toLowerCase()) {
              console.log(`Found owned ticket: ${tokenId}`)
              userTickets.push(ticket)
              // Stop when we have found all tickets (based on balance)
              if (userTickets.length >= userBalance) {
                break
              }
            }
          } catch (err) {
            // Token doesn't exist or error fetching, continue
            continue
          }
        }

        setTickets(userTickets)
        setCachedTickets(cacheKey, userTickets)
        console.log(`Fetched ${userTickets.length} tickets for user ${address}`)
        return
      }

      // Use EventFetcher approach with TicketPurchased events
      const userTickets = await executeWithRetry(
        async () => {
          try {
            // Use the EventFetcher to get TicketPurchased events for this user
            const client = eventFetcher['client'] // Access the viem client from EventFetcher

            if (!client) {
              throw new Error('Blockchain client not available')
            }

            // Get TicketPurchased events where the buyer is the current user
            // Query in chunks to avoid RPC limitations
            const contractAddress = eventFetcher.getConfig().contractAddress as `0x${string}`
            const currentBlock = await client.getBlockNumber()
            // OPTIMIZATION 2: Use larger chunks for fewer requests (but stay under limits)
            const chunkSize = 8000n // Larger chunks = fewer requests = faster

            let allTicketPurchasedEvents: any[] = []

            // OPTIMIZATION 1: Progressive loading - start with recent blocks
            const blocksPerDay = 7200n // Approximate blocks per day on Ethereum
            let daysToLookBack = 7n // Start with just 1 week for fastest initial load
            let startBlock = currentBlock > (blocksPerDay * daysToLookBack)
              ? currentBlock - (blocksPerDay * daysToLookBack)
              : 0n

            console.log(`Querying ticket events from block ${startBlock} to ${currentBlock} (${daysToLookBack} days)`)

            // OPTIMIZATION 3: Parallel chunk processing for much faster queries
            const chunks: Array<{ fromBlock: bigint; toBlock: bigint }> = []
            for (let fromBlock = startBlock; fromBlock <= currentBlock; fromBlock += chunkSize) {
              const toBlock = fromBlock + chunkSize - 1n > currentBlock
                ? currentBlock
                : fromBlock + chunkSize - 1n
              chunks.push({ fromBlock, toBlock })
            }

            console.log(`Processing ${chunks.length} chunks in parallel...`)

            // Process all chunks in parallel (much faster than sequential)
            const chunkPromises = chunks.map(async ({ fromBlock, toBlock }) => {
              try {
                const chunkEvents = await client.getLogs({
                  address: contractAddress,
                  event: {
                    type: 'event',
                    name: 'TicketPurchased',
                    inputs: [
                      { name: 'tokenId', type: 'uint256', indexed: true },
                      { name: 'eventId', type: 'uint256', indexed: true },
                      { name: 'buyer', type: 'address', indexed: true },
                      { name: 'ticketNumber', type: 'uint256', indexed: false },
                      { name: 'price', type: 'uint256', indexed: false }
                    ]
                  },
                  args: {
                    buyer: address as `0x${string}`
                  },
                  fromBlock,
                  toBlock
                })

                console.log(`Found ${chunkEvents.length} events in blocks ${fromBlock}-${toBlock}`)
                return chunkEvents
              } catch (chunkError) {
                console.warn(`Failed to query blocks ${fromBlock}-${toBlock}:`, chunkError)
                return [] // Return empty array instead of failing
              }
            })

            // Wait for all chunks to complete
            const chunkResults = await Promise.all(chunkPromises)
            allTicketPurchasedEvents = chunkResults.flat()

            // OPTIMIZATION 6: Progressive expansion if no tickets found
            if (allTicketPurchasedEvents.length === 0 && daysToLookBack < 90n) {
              console.log('No tickets found in recent blocks, expanding search...')
              daysToLookBack = 90n // Expand to 3 months
              startBlock = currentBlock > (blocksPerDay * daysToLookBack)
                ? currentBlock - (blocksPerDay * daysToLookBack)
                : 0n

              // Repeat search with expanded range
              const expandedChunks: Array<{ fromBlock: bigint; toBlock: bigint }> = []
              for (let fromBlock = startBlock; fromBlock <= currentBlock; fromBlock += chunkSize) {
                const toBlock = fromBlock + chunkSize - 1n > currentBlock
                  ? currentBlock
                  : fromBlock + chunkSize - 1n
                expandedChunks.push({ fromBlock, toBlock })
              }

              const expandedPromises = expandedChunks.map(async ({ fromBlock, toBlock }) => {
                try {
                  return await client.getLogs({
                    address: contractAddress,
                    event: {
                      type: 'event',
                      name: 'TicketPurchased',
                      inputs: [
                        { name: 'tokenId', type: 'uint256', indexed: true },
                        { name: 'eventId', type: 'uint256', indexed: true },
                        { name: 'buyer', type: 'address', indexed: true },
                        { name: 'ticketNumber', type: 'uint256', indexed: false },
                        { name: 'price', type: 'uint256', indexed: false }
                      ]
                    },
                    args: { buyer: address as `0x${string}` },
                    fromBlock,
                    toBlock
                  })
                } catch (error) {
                  return []
                }
              })

              const expandedResults = await Promise.all(expandedPromises)
              allTicketPurchasedEvents = expandedResults.flat()
              console.log(`Expanded search found ${allTicketPurchasedEvents.length} events`)
            }

            const ticketPurchasedEvents = allTicketPurchasedEvents

            console.log(`Found ${ticketPurchasedEvents.length} ticket purchase events for user`)

            // OPTIMIZATION 7: Early termination if no events found
            if (ticketPurchasedEvents.length === 0) {
              console.log('No ticket purchase events found, returning empty array')
              return []
            }

            // OPTIMIZATION 4: Batch process ticket metadata with concurrency limit
            const batchSize = 15 // Increased batch size for better performance
            const allTickets: (TicketMetadata | null)[] = []

            for (let i = 0; i < ticketPurchasedEvents.length; i += batchSize) {
              const batch = ticketPurchasedEvents.slice(i, i + batchSize)
              const batchPromises = batch.map(async (event: any) => {
                const tokenId = Number(event.args.tokenId)
                return await fetchTicketMetadata(tokenId)
              })

              const batchResults = await Promise.all(batchPromises)
              allTickets.push(...batchResults)

              console.log(`Processed batch ${Math.floor(i / batchSize) + 1}/${Math.ceil(ticketPurchasedEvents.length / batchSize)}`)
            }

            // Filter out null tickets and ensure user still owns them
            return allTickets.filter((ticket): ticket is TicketMetadata =>
              ticket !== null && ticket.currentOwner.toLowerCase() === address.toLowerCase()
            )
          } catch (eventError) {
            console.warn('Event-based approach failed, falling back to balance-based approach:', eventError)

            // Fallback to balance-based approach if event queries fail
            const userBalance = balanceQuery.data ? Number(balanceQuery.data) : 0
            if (userBalance === 0) return []

            const fallbackTickets: TicketMetadata[] = []
            const maxTokensToCheck = Math.min(userBalance * 10, 500)

            for (let tokenId = 1; tokenId <= maxTokensToCheck; tokenId++) {
              try {
                const ticket = await fetchTicketMetadata(tokenId)
                if (ticket && ticket.currentOwner.toLowerCase() === address.toLowerCase()) {
                  fallbackTickets.push(ticket)
                  if (fallbackTickets.length >= userBalance) break
                }
              } catch (err) {
                continue
              }
            }

            console.log(`Fallback approach found ${fallbackTickets.length} tickets`)
            return fallbackTickets
          }
        },
        3 // Max 3 retries
      )

      // Cache the fetched tickets
      setCachedTickets(cacheKey, userTickets)

      setTickets(userTickets)

      console.log(`Fetched ${userTickets.length} tickets for user ${address}`)
    } catch (err) {
      console.error('Error fetching user tickets:', err)

      // Handle and format error
      const handledError = handleError(err)
      setError(new Error(handledError.userMessage))

      // Fall back to cached tickets if available
      if (cachedTickets && cachedTickets.length > 0) {
        console.log('Falling back to cached tickets due to error')
        setTickets(cachedTickets)
      } else {
        setTickets([])
      }
    } finally {
      setIsLoading(false)
    }
  }, [isContractReady, isConnected, address, eventFetcher, chainId, getCachedTickets, setCachedTickets, executeWithRetry, handleError, balanceQuery.data])

  // Fetch individual ticket metadata with dynamic event data
  const fetchTicketMetadata = useCallback(async (tokenId: number): Promise<TicketMetadata | null> => {
    if (!isContractReady) return null

    try {
      let client: any = null
      let contractAddress: `0x${string}` | null = null

      // Try to get client and contract address from EventFetcher first
      if (eventFetcher) {
        try {
          client = eventFetcher['client']
          contractAddress = eventFetcher.getConfig().contractAddress as `0x${string}`
        } catch (err) {
          console.warn('Could not get client from EventFetcher, will try alternative approach')
        }
      }

      // If we don't have client/address from EventFetcher, we can't proceed
      if (!client || !contractAddress) {
        console.warn(`Cannot fetch ticket ${tokenId}: missing client or contract address`)
        return null
      }

      // Get current owner of the token
      const currentOwner = await client.readContract({
        address: contractAddress,
        abi: [
          {
            name: 'ownerOf',
            type: 'function',
            stateMutability: 'view',
            inputs: [{ name: 'tokenId', type: 'uint256' }],
            outputs: [{ name: '', type: 'address' }],
          }
        ],
        functionName: 'ownerOf',
        args: [BigInt(tokenId)]
      }) as Address

      if (!currentOwner) return null

      // Get ticket info from contract
      const ticketInfo = await client.readContract({
        address: contractAddress,
        abi: [
          {
            name: 'getTicketInfo',
            type: 'function',
            stateMutability: 'view',
            inputs: [{ name: 'tokenId', type: 'uint256' }],
            outputs: [{
              name: '',
              type: 'tuple',
              components: [
                { name: 'eventId', type: 'uint256' },
                { name: 'ticketNumber', type: 'uint256' },
                { name: 'purchasePrice', type: 'uint256' },
                { name: 'purchaseDate', type: 'uint256' },
                { name: 'originalBuyer', type: 'address' }
              ]
            }]
          }
        ],
        functionName: 'getTicketInfo',
        args: [BigInt(tokenId)]
      }) as {
        eventId: bigint
        ticketNumber: bigint
        purchasePrice: bigint
        purchaseDate: bigint
        originalBuyer: Address
      }

      if (!ticketInfo) return null

      // Parse ticket info from contract response (it's a struct/object, not an array)
      const { eventId, ticketNumber, purchasePrice, purchaseDate, originalBuyer } = ticketInfo

      // Try to fetch event details using EventFetcher
      let eventDetails = null
      if (eventFetcher) {
        try {
          eventDetails = await eventFetcher.fetchEventDetails(Number(eventId))
        } catch (err) {
          console.warn(`Could not fetch event details for event ${eventId}:`, err)
        }
      }

      // If we couldn't get event details, create a basic ticket with minimal info
      if (!eventDetails) {
        return {
          tokenId,
          eventId: Number(eventId),
          ticketNumber: Number(ticketNumber),
          purchasePrice,
          purchaseDate: Number(purchaseDate),
          originalBuyer,
          currentOwner,
          eventName: `Event #${eventId}`,
          eventDescription: 'Event details unavailable',
          eventDate: Number(purchaseDate), // Use purchase date as fallback
          eventVenue: 'Venue unavailable',
          eventStatus: 0, // Assume active
          isTransferred: originalBuyer.toLowerCase() !== currentOwner.toLowerCase(),
        }
      }

      return {
        tokenId,
        eventId: Number(eventId),
        ticketNumber: Number(ticketNumber),
        purchasePrice,
        purchaseDate: Number(purchaseDate),
        originalBuyer,
        currentOwner,
        eventName: eventDetails.name,
        eventDescription: eventDetails.description,
        eventDate: Number(eventDetails.date),
        eventVenue: eventDetails.venue,
        eventStatus: eventDetails.status,
        isTransferred: originalBuyer.toLowerCase() !== currentOwner.toLowerCase(),
      }
    } catch (err) {
      console.error(`Error fetching ticket metadata for token ${tokenId}:`, err)
      // Token doesn't exist or user doesn't own it
      return null
    }
  }, [isContractReady, eventFetcher])

  // Refetch tickets (force refresh from blockchain)
  const refetch = useCallback(() => {
    refetchBalance()

    // Invalidate cache and force refresh
    const cacheKey = `user-tickets-${address}-${chainId}`
    setTicketCache(prev => {
      const newCache = new Map(prev)
      newCache.delete(cacheKey)
      return newCache
    })

    fetchUserTickets(true)
  }, [refetchBalance, fetchUserTickets, address, chainId])

  // Get ticket by ID
  const getTicketById = useCallback((tokenId: number): TicketMetadata | undefined => {
    return tickets.find(ticket => ticket.tokenId === tokenId)
  }, [tickets])

  // Fetch tickets when dependencies change
  useEffect(() => {
    fetchUserTickets()
  }, [fetchUserTickets])

  return {
    tickets,
    isLoading: isLoading || isBalanceLoading,
    error,
    refetch,
    getTicketById,
  }
}
