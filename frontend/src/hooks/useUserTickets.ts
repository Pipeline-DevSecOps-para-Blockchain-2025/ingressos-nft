import { useState, useEffect, useCallback } from 'react'
import { useReadContract } from 'wagmi'
import { useWallet } from './useWallet'
import { useIngressosContract } from './useIngressosContract'
import type { Address } from 'viem'

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
  const { contractAddress, isContractReady, getTicketInfo, getEventDetails, balanceOf } = useIngressosContract()

  const [tickets, setTickets] = useState<TicketMetadata[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<Error | null>(null)

  // Get user's NFT balance
  const {
    data: balance,
    isLoading: isBalanceLoading,
    refetch: refetchBalance
  } = useReadContract({
    ...contractAddress ? {
      address: contractAddress,
      abi: [
        {
          name: 'balanceOf',
          type: 'function',
          stateMutability: 'view',
          inputs: [{ name: 'owner', type: 'address' }],
          outputs: [{ name: '', type: 'uint256' }],
        }
      ],
      functionName: 'balanceOf',
      args: address ? [address] : undefined,
    } : {},
    query: {
      enabled: isContractReady && isConnected && !!address,
    },
  })

  // Fetch all user tickets
  const fetchUserTickets = useCallback(async () => {
    if (!isContractReady || !isConnected || !address || !balance) {
      setTickets([])
      return
    }

    setIsLoading(true)
    setError(null)

    try {
      const userBalance = Number(balance)
      const ticketPromises: Promise<TicketMetadata | null>[] = []

      // For now, we'll iterate through token IDs to find user's tickets
      // In a production app, you'd want to use events or a subgraph for better performance
      for (let tokenId = 1; tokenId <= 1000; tokenId++) {
        ticketPromises.push(fetchTicketMetadata(tokenId))
      }

      const allTickets = await Promise.all(ticketPromises)
      const userTickets = allTickets.filter((ticket): ticket is TicketMetadata =>
        ticket !== null && ticket.currentOwner.toLowerCase() === address.toLowerCase()
      )

      setTickets(userTickets)
    } catch (err) {
      console.error('Error fetching user tickets:', err)
      setError(err as Error)
    } finally {
      setIsLoading(false)
    }
  }, [isContractReady, isConnected, address, balance])

  // Fetch individual ticket metadata
  const fetchTicketMetadata = useCallback(async (tokenId: number): Promise<TicketMetadata | null> => {
    if (!isContractReady) return null

    try {
      // This would normally use the contract's ownerOf function
      // For now, we'll simulate the data structure
      const ticketInfo = {
        eventId: 1,
        ticketNumber: 1,
        purchasePrice: BigInt('100000000000000000'), // 0.1 ETH
        purchaseDate: Math.floor(Date.now() / 1000),
        originalBuyer: address as Address,
      }

      const eventDetails = {
        name: 'Sample Event',
        description: 'This is a sample event',
        date: Math.floor(Date.now() / 1000) + 86400, // Tomorrow
        venue: 'Sample Venue',
        status: 0, // Active
      }

      return {
        tokenId,
        eventId: ticketInfo.eventId,
        ticketNumber: ticketInfo.ticketNumber,
        purchasePrice: ticketInfo.purchasePrice,
        purchaseDate: ticketInfo.purchaseDate,
        originalBuyer: ticketInfo.originalBuyer,
        currentOwner: address as Address,
        eventName: eventDetails.name,
        eventDescription: eventDetails.description,
        eventDate: eventDetails.date,
        eventVenue: eventDetails.venue,
        eventStatus: eventDetails.status,
        isTransferred: ticketInfo.originalBuyer.toLowerCase() !== address?.toLowerCase(),
      }
    } catch (err) {
      // Token doesn't exist or user doesn't own it
      return null
    }
  }, [isContractReady, address])

  // Refetch tickets
  const refetch = useCallback(() => {
    refetchBalance()
    fetchUserTickets()
  }, [refetchBalance, fetchUserTickets])

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
