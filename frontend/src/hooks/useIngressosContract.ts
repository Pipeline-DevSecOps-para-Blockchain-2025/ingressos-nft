import { useReadContract, useWriteContract } from 'wagmi'
import { useChainId } from 'wagmi'
import { INGRESSOS_ABI, INGRESSOS_CONTRACT_ADDRESS, type SupportedChainId, EVENT_STATUS } from '../contracts'
import { useCallback, useMemo } from 'react'
import type { Address } from 'viem'
import { formatEther, parseEther } from 'viem'

// Types for contract interactions
export interface EventDetails {
  name: string
  description: string
  date: bigint
  venue: string
  ticketPrice: bigint
  maxSupply: bigint
  currentSupply: bigint
  organizer: Address
  status: number
  createdAt: bigint
}

export interface TicketInfo {
  eventId: bigint
  ticketNumber: bigint
  purchasePrice: bigint
  purchaseDate: bigint
  originalBuyer: Address
}

export interface CreateEventParams {
  name: string
  description: string
  date: Date
  venue: string
  ticketPrice: string // in ETH
  maxSupply: number
}

export interface UseIngressosContractReturn {
  // Contract info
  contractAddress: Address | null
  isContractReady: boolean
  
  // Read functions
  getEventDetails: (eventId: number) => any
  getTicketInfo: (tokenId: number) => any
  hasRole: (role: `0x${string}`, account: Address) => any
  getNextEventId: () => any
  balanceOf: (owner: Address) => any
  ownerOf: (tokenId: number) => any
  
  // Write functions
  createEvent: (params: CreateEventParams) => Promise<`0x${string}`>
  purchaseTicket: (eventId: number, ticketPrice: string) => Promise<`0x${string}`>
  updateEventStatus: (eventId: number, status: keyof typeof EVENT_STATUS) => Promise<`0x${string}`>
  withdrawRevenue: (eventId: number) => Promise<`0x${string}`>
  grantOrganizerRole: (account: Address) => Promise<`0x${string}`>
  revokeOrganizerRole: (account: Address) => Promise<`0x${string}`>
  transferTicket: (from: Address, to: Address, tokenId: number) => Promise<`0x${string}`>
  
  // Transaction status
  isWritePending: boolean
  writeError: Error | null
  
  // Utilities
  formatPrice: (price: bigint) => string
  parsePrice: (price: string) => bigint
  getEventStatusName: (status: number) => string
}

export const useIngressosContract = (): UseIngressosContractReturn => {
  const chainId = useChainId()
  const { writeContractAsync, isPending: isWritePending, error: writeError } = useWriteContract()
  
  // Get contract address for current chain
  const contractAddress = useMemo(() => {
    const supportedChainId = chainId as SupportedChainId
    const address = INGRESSOS_CONTRACT_ADDRESS[supportedChainId]
    return address && address !== '0x0000000000000000000000000000000000000000' 
      ? (address as Address)
      : null
  }, [chainId])
  
  const isContractReady = contractAddress !== null
  
  // Base contract config
  const getContractConfig = useCallback(() => {
    if (!contractAddress) {
      throw new Error(`Contract not deployed on chain ${chainId}`)
    }
    
    return {
      address: contractAddress,
      abi: INGRESSOS_ABI,
    }
  }, [contractAddress, chainId])
  
  // Read functions
  const getEventDetails = useCallback((eventId: number) => {
    return useReadContract({
      ...getContractConfig(),
      functionName: 'getEventDetails',
      args: [BigInt(eventId)],
      query: {
        enabled: isContractReady,
      },
    })
  }, [getContractConfig, isContractReady])
  
  const getTicketInfo = useCallback((tokenId: number) => {
    return useReadContract({
      ...getContractConfig(),
      functionName: 'getTicketInfo',
      args: [BigInt(tokenId)],
      query: {
        enabled: isContractReady,
      },
    })
  }, [getContractConfig, isContractReady])
  
  const hasRole = useCallback((role: `0x${string}`, account: Address) => {
    return useReadContract({
      ...getContractConfig(),
      functionName: 'hasRole',
      args: [role, account],
      query: {
        enabled: isContractReady && !!account,
      },
    })
  }, [getContractConfig, isContractReady])
  
  const getNextEventId = useCallback(() => {
    return useReadContract({
      ...getContractConfig(),
      functionName: 'nextEventId',
      query: {
        enabled: isContractReady,
      },
    })
  }, [getContractConfig, isContractReady])
  
  const balanceOf = useCallback((owner: Address) => {
    return useReadContract({
      ...getContractConfig(),
      functionName: 'balanceOf',
      args: [owner],
      query: {
        enabled: isContractReady && !!owner,
      },
    })
  }, [getContractConfig, isContractReady])
  
  const ownerOf = useCallback((tokenId: number) => {
    return useReadContract({
      ...getContractConfig(),
      functionName: 'ownerOf',
      args: [BigInt(tokenId)],
      query: {
        enabled: isContractReady,
      },
    })
  }, [getContractConfig, isContractReady])
  
  // Write functions
  const createEvent = useCallback(async (params: CreateEventParams): Promise<`0x${string}`> => {
    if (!isContractReady) {
      throw new Error('Contract not ready')
    }
    
    const dateTimestamp = BigInt(Math.floor(params.date.getTime() / 1000))
    const ticketPriceWei = parseEther(params.ticketPrice)
    
    return await writeContractAsync({
      ...getContractConfig(),
      functionName: 'createEvent',
      args: [
        params.name,
        params.description,
        dateTimestamp,
        params.venue,
        ticketPriceWei,
        BigInt(params.maxSupply),
      ],
    })
  }, [writeContractAsync, getContractConfig, isContractReady])
  
  const purchaseTicket = useCallback(async (eventId: number, ticketPrice: string): Promise<`0x${string}`> => {
    if (!isContractReady) {
      throw new Error('Contract not ready')
    }
    
    const priceWei = parseEther(ticketPrice)
    
    return await writeContractAsync({
      ...getContractConfig(),
      functionName: 'purchaseTicket',
      args: [BigInt(eventId)],
      value: priceWei,
    })
  }, [writeContractAsync, getContractConfig, isContractReady])
  
  const updateEventStatus = useCallback(async (eventId: number, status: keyof typeof EVENT_STATUS): Promise<`0x${string}`> => {
    if (!isContractReady) {
      throw new Error('Contract not ready')
    }
    
    return await writeContractAsync({
      ...getContractConfig(),
      functionName: 'updateEventStatus',
      args: [BigInt(eventId), EVENT_STATUS[status]],
    })
  }, [writeContractAsync, getContractConfig, isContractReady])
  
  const withdrawRevenue = useCallback(async (eventId: number): Promise<`0x${string}`> => {
    if (!isContractReady) {
      throw new Error('Contract not ready')
    }
    
    return await writeContractAsync({
      ...getContractConfig(),
      functionName: 'withdrawRevenue',
      args: [BigInt(eventId)],
    })
  }, [writeContractAsync, getContractConfig, isContractReady])
  
  const grantOrganizerRole = useCallback(async (account: Address): Promise<`0x${string}`> => {
    if (!isContractReady) {
      throw new Error('Contract not ready')
    }
    
    return await writeContractAsync({
      ...getContractConfig(),
      functionName: 'grantOrganizerRole',
      args: [account],
    })
  }, [writeContractAsync, getContractConfig, isContractReady])
  
  const revokeOrganizerRole = useCallback(async (account: Address): Promise<`0x${string}`> => {
    if (!isContractReady) {
      throw new Error('Contract not ready')
    }
    
    return await writeContractAsync({
      ...getContractConfig(),
      functionName: 'revokeOrganizerRole',
      args: [account],
    })
  }, [writeContractAsync, getContractConfig, isContractReady])
  
  const transferTicket = useCallback(async (from: Address, to: Address, tokenId: number): Promise<`0x${string}`> => {
    if (!isContractReady) {
      throw new Error('Contract not ready')
    }
    
    return await writeContractAsync({
      ...getContractConfig(),
      functionName: 'transferFrom',
      args: [from, to, BigInt(tokenId)],
    })
  }, [writeContractAsync, getContractConfig, isContractReady])
  
  // Utility functions
  const formatPrice = useCallback((price: bigint): string => {
    return formatEther(price)
  }, [])
  
  const parsePrice = useCallback((price: string): bigint => {
    return parseEther(price)
  }, [])
  
  const getEventStatusName = useCallback((status: number): string => {
    switch (status) {
      case EVENT_STATUS.ACTIVE: return 'Active'
      case EVENT_STATUS.PAUSED: return 'Paused'
      case EVENT_STATUS.CANCELLED: return 'Cancelled'
      case EVENT_STATUS.COMPLETED: return 'Completed'
      default: return 'Unknown'
    }
  }, [])
  
  return {
    // Contract info
    contractAddress,
    isContractReady,
    
    // Read functions
    getEventDetails,
    getTicketInfo,
    hasRole,
    getNextEventId,
    balanceOf,
    ownerOf,
    
    // Write functions
    createEvent,
    purchaseTicket,
    updateEventStatus,
    withdrawRevenue,
    grantOrganizerRole,
    revokeOrganizerRole,
    transferTicket,
    
    // Transaction status
    isWritePending,
    writeError,
    
    // Utilities
    formatPrice,
    parsePrice,
    getEventStatusName,
  }
}