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
  const { isContractReady, getTicketInfo, ownerOf, balanceOf } = useIngressosContract()
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
      ttl: 5 * 60 * 1000 // 5 minutes
    })))
  }, [])

  // Initialize EventFetcher when chain changes
  useEffect(() => {
    if (!chainId) {
      setEventFetcher(null)
      return
    }

    try {
      const fetcher = EventFetcherFactory.getInstance(chainId)
      setEventFetcher(fetcher)
    } catch (error) {
      console.error('Failed to initialize EventFetcher:', error)
      setError(error as Error)
      setEventFetcher(null)
    }
  }, [chainId])

  // Get user's NFT balance using the contract hook
  const balanceQuery = balanceOf(address as Address)
  const balance = balanceQuery.data
  const isBalanceLoading = balanceQuery.isLoading
  const refetchBalance = balanceQuery.refetch

  // Fetch all user tickets with dynamic blockchain queries
  const fetchUserTickets = useCallback(async (forceRefresh = false) => {
    if (!isContractReady || !isConnected || !address || !eventFetcher) {
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

      // Get user's NFT balance to know how many tickets they have
      const userBalance = balance ? Number(balance) : 0

      if (userBalance === 0) {
        setTickets([])
        setIsLoading(false)
        return
      }

      // Fetch user tickets with retry logic
      const userTickets = await executeWithRetry(
        async () => {
          const ticketPromises: Promise<TicketMetadata | null>[] = []

          // We need to find which tokens the user owns
          // Since we don't have a direct way to get user's token IDs,
          // we'll check a reasonable range and filter by ownership
          // In production, you'd use events or indexed data for efficiency
          const maxTokensToCheck = Math.min(userBalance * 20, 2000) // Check more tokens than balance to account for transfers

          for (let tokenId = 1; tokenId <= maxTokensToCheck; tokenId++) {
            ticketPromises.push(fetchTicketMetadata(tokenId))
          }

          const allTickets = await Promise.all(ticketPromises)
          const ownedTickets = allTickets.filter((ticket): ticket is TicketMetadata =>
            ticket !== null && ticket.currentOwner.toLowerCase() === address.toLowerCase()
          )

          // Limit to actual balance to avoid inconsistencies
          return ownedTickets.slice(0, userBalance)
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
  }, [isContractReady, isConnected, address, eventFetcher, balance, chainId, getCachedTickets, setCachedTickets, executeWithRetry, handleError])

  // Fetch individual ticket metadata with dynamic event data
  const fetchTicketMetadata = useCallback(async (tokenId: number): Promise<TicketMetadata | null> => {
    if (!isContractReady || !eventFetcher) return null

    try {
      // First, check if the token exists and get its owner
      const ownerQuery = ownerOf(tokenId)
      const currentOwner = ownerQuery.data as Address

      if (!currentOwner) return null

      // Get ticket info from contract
      const ticketQuery = getTicketInfo(tokenId)
      const ticketInfo = ticketQuery.data

      if (!ticketInfo) return null

      // Parse ticket info from contract response
      const [eventId, ticketNumber, purchasePrice, purchaseDate, originalBuyer] = ticketInfo as [
        bigint,
        bigint,
        bigint,
        bigint,
        Address
      ]

      // Fetch real event details using EventFetcher
      const eventDetails = await eventFetcher.fetchEventDetails(Number(eventId))

      if (!eventDetails) {
        return null // Event doesn't exist
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
      // Token doesn't exist or user doesn't own it
      return null
    }
  }, [isContractReady, eventFetcher, ownerOf, getTicketInfo])

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
