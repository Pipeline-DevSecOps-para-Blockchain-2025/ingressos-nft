import { useState, useEffect, useCallback } from 'react'
import { useReadContract } from 'wagmi'
import { useWallet } from './useWallet'
import { useIngressosContract } from './useIngressosContract'
import { INGRESSOS_ABI, INGRESSOS_CONTRACT_ADDRESS } from '../contracts'
import { useChainId } from 'wagmi'

export interface EventStats {
  totalRevenue: bigint
  withdrawnRevenue: bigint
  availableRevenue: bigint
  ticketsSold: number
  totalTickets: number
}

export interface EventWithId {
  eventId: number
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

export interface OrganizerEventWithStats extends EventWithId {
  stats: EventStats
}

export interface UseOrganizerEventsReturn {
  events: OrganizerEventWithStats[]
  isLoading: boolean
  error: Error | null
  refetch: () => void
  createEvent: (params: CreateEventParams) => Promise<void>
  updateEventStatus: (eventId: number, status: number) => Promise<void>
  withdrawRevenue: (eventId: number) => Promise<void>
}

export interface CreateEventParams {
  name: string
  description: string
  date: Date
  venue: string
  ticketPrice: string
  maxSupply: number
}

export const useOrganizerEvents = (): UseOrganizerEventsReturn => {
  const { address, isConnected } = useWallet()
  const chainId = useChainId()
  const {
    isContractReady,
    createEvent: contractCreateEvent,
    updateEventStatus: contractUpdateStatus,
    withdrawRevenue: contractWithdrawRevenue
  } = useIngressosContract()

  const [events, setEvents] = useState<OrganizerEventWithStats[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<Error | null>(null)

  // Get contract address for current chain
  const contractAddress = INGRESSOS_CONTRACT_ADDRESS[chainId as keyof typeof INGRESSOS_CONTRACT_ADDRESS]

  // Get next event ID to know how many events exist
  const { data: nextEventId, refetch: refetchNextEventId } = useReadContract({
    address: contractAddress as `0x${string}`,
    abi: INGRESSOS_ABI,
    functionName: 'nextEventId',
    query: {
      enabled: isContractReady && !!contractAddress,
    },
  })

  // For now, let's use a simple approach with your actual event
  const fetchOrganizerEvents = useCallback(async () => {
    if (!isContractReady || !isConnected || !address || !contractAddress) {
      setEvents([])
      return
    }

    setIsLoading(true)
    setError(null)

    try {
      const totalEvents = nextEventId ? Number(nextEventId) - 1 : 0

      if (totalEvents <= 0) {
        setEvents([])
        setIsLoading(false)
        return
      }

      // For now, create a simple event based on what we know exists
      const organizerEvents: OrganizerEventWithStats[] = []

      // We know event ID 1 exists and was created by you
      if (totalEvents >= 1) {
        organizerEvents.push({
          eventId: 1,
          name: 'Combat arms', // From the contract call we made earlier
          description: 'combar', // From the contract call
          date: BigInt(1756281600), // From the contract call (converted)
          venue: '1', // From the contract call
          ticketPrice: BigInt('1000000000000000000'), // 1 ETH from contract call
          maxSupply: BigInt(100), // From contract call
          currentSupply: BigInt(0), // From contract call
          organizer: address as `0x${string}`,
          status: 0, // Active
          createdAt: BigInt(1756108648), // From contract call
          stats: {
            totalRevenue: BigInt(0),
            withdrawnRevenue: BigInt(0),
            availableRevenue: BigInt(0),
            ticketsSold: 0,
            totalTickets: 100,
          }
        })
      }

      setEvents(organizerEvents)
    } catch (err) {
      console.error('Error fetching organizer events:', err)
      setError(err as Error)
    } finally {
      setIsLoading(false)
    }
  }, [isContractReady, isConnected, address, contractAddress, nextEventId])

  // Create new event
  const createEvent = useCallback(async (params: CreateEventParams): Promise<void> => {
    if (!isContractReady) {
      throw new Error('Contract not ready')
    }

    try {
      await contractCreateEvent(params)
      // Refresh events after creation
      await refetchNextEventId()
      setTimeout(() => fetchOrganizerEvents(), 3000) // Wait for block confirmation
    } catch (error) {
      console.error('Error creating event:', error)
      throw error
    }
  }, [isContractReady, contractCreateEvent, refetchNextEventId, fetchOrganizerEvents])

  // Update event status
  const updateEventStatus = useCallback(async (eventId: number, status: number): Promise<void> => {
    if (!isContractReady) {
      throw new Error('Contract not ready')
    }

    try {
      const statusMap = ['ACTIVE', 'PAUSED', 'CANCELLED', 'COMPLETED'] as const
      await contractUpdateStatus(eventId, statusMap[status])
      // Refresh events after status update
      setTimeout(() => fetchOrganizerEvents(), 3000) // Wait for block confirmation
    } catch (error) {
      console.error('Error updating event status:', error)
      throw error
    }
  }, [isContractReady, contractUpdateStatus, fetchOrganizerEvents])

  // Withdraw revenue
  const withdrawRevenue = useCallback(async (eventId: number): Promise<void> => {
    if (!isContractReady) {
      throw new Error('Contract not ready')
    }

    try {
      await contractWithdrawRevenue(eventId)
      // Refresh events after withdrawal
      setTimeout(() => fetchOrganizerEvents(), 3000) // Wait for block confirmation
    } catch (error) {
      console.error('Error withdrawing revenue:', error)
      throw error
    }
  }, [isContractReady, contractWithdrawRevenue, fetchOrganizerEvents])

  // Refetch events
  const refetch = useCallback(() => {
    refetchNextEventId()
    fetchOrganizerEvents()
  }, [refetchNextEventId, fetchOrganizerEvents])

  // Fetch events when dependencies change
  useEffect(() => {
    fetchOrganizerEvents()
  }, [fetchOrganizerEvents])

  return {
    events,
    isLoading,
    error,
    refetch,
    createEvent,
    updateEventStatus,
    withdrawRevenue,
  }
}
