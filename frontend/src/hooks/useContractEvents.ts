import { useEffect, useCallback, useState } from 'react'
import { useWatchContractEvent, usePublicClient } from 'wagmi'
import { useIngressosContract } from './useIngressosContract'
import { INGRESSOS_ABI } from '../contracts'

export interface ContractEvent {
  id: string
  type: 'EventCreated' | 'TicketPurchased' | 'EventStatusChanged' | 'RevenueWithdrawn'
  blockNumber: number
  transactionHash: string
  timestamp: number
  data: any
}

export interface UseContractEventsReturn {
  events: ContractEvent[]
  isListening: boolean
  error: Error | null
  startListening: () => void
  stopListening: () => void
  clearEvents: () => void
}

export const useContractEvents = (): UseContractEventsReturn => {
  const { contractAddress, isContractReady } = useIngressosContract()
  const publicClient = usePublicClient()
  
  const [events, setEvents] = useState<ContractEvent[]>([])
  const [isListening, setIsListening] = useState(false)
  const [error, setError] = useState<Error | null>(null)

  // Add new event to the list
  const addEvent = useCallback((newEvent: ContractEvent) => {
    setEvents(prev => {
      // Avoid duplicates
      if (prev.some(e => e.id === newEvent.id)) {
        return prev
      }
      // Keep only the latest 50 events
      const updated = [newEvent, ...prev].slice(0, 50)
      return updated
    })
  }, [])

  // Create event ID from transaction hash and log index
  const createEventId = useCallback((txHash: string, logIndex: number): string => {
    return `${txHash}-${logIndex}`
  }, [])

  // Event Created listener
  useWatchContractEvent({
    address: contractAddress || undefined,
    abi: INGRESSOS_ABI,
    eventName: 'EventCreated',
    onLogs: (logs) => {
      logs.forEach((log, index) => {
        const event: ContractEvent = {
          id: createEventId(log.transactionHash, index),
          type: 'EventCreated',
          blockNumber: Number(log.blockNumber),
          transactionHash: log.transactionHash,
          timestamp: Date.now(), // In a real app, you'd get this from the block
          data: {
            eventId: log.args.eventId,
            name: log.args.name,
            organizer: log.args.organizer,
            ticketPrice: log.args.ticketPrice,
            maxSupply: log.args.maxSupply,
          }
        }
        addEvent(event)
      })
    },
    enabled: isContractReady && isListening,
  })

  // Ticket Purchased listener
  useWatchContractEvent({
    address: contractAddress || undefined,
    abi: INGRESSOS_ABI,
    eventName: 'TicketPurchased',
    onLogs: (logs) => {
      logs.forEach((log, index) => {
        const event: ContractEvent = {
          id: createEventId(log.transactionHash, index),
          type: 'TicketPurchased',
          blockNumber: Number(log.blockNumber),
          transactionHash: log.transactionHash,
          timestamp: Date.now(),
          data: {
            tokenId: log.args.tokenId,
            eventId: log.args.eventId,
            buyer: log.args.buyer,
            ticketNumber: log.args.ticketNumber,
            price: log.args.price,
          }
        }
        addEvent(event)
      })
    },
    enabled: isContractReady && isListening,
  })

  // Event Status Changed listener
  useWatchContractEvent({
    address: contractAddress || undefined,
    abi: INGRESSOS_ABI,
    eventName: 'EventStatusChanged',
    onLogs: (logs) => {
      logs.forEach((log, index) => {
        const event: ContractEvent = {
          id: createEventId(log.transactionHash, index),
          type: 'EventStatusChanged',
          blockNumber: Number(log.blockNumber),
          transactionHash: log.transactionHash,
          timestamp: Date.now(),
          data: {
            eventId: log.args.eventId,
            oldStatus: log.args.oldStatus,
            newStatus: log.args.newStatus,
          }
        }
        addEvent(event)
      })
    },
    enabled: isContractReady && isListening,
  })

  // Revenue Withdrawn listener
  useWatchContractEvent({
    address: contractAddress || undefined,
    abi: INGRESSOS_ABI,
    eventName: 'RevenueWithdrawn',
    onLogs: (logs) => {
      logs.forEach((log, index) => {
        const event: ContractEvent = {
          id: createEventId(log.transactionHash, index),
          type: 'RevenueWithdrawn',
          blockNumber: Number(log.blockNumber),
          transactionHash: log.transactionHash,
          timestamp: Date.now(),
          data: {
            eventId: log.args.eventId,
            organizer: log.args.organizer,
            amount: log.args.amount,
          }
        }
        addEvent(event)
      })
    },
    enabled: isContractReady && isListening,
  })

  // Control functions
  const startListening = useCallback(() => {
    if (isContractReady) {
      setIsListening(true)
      setError(null)
    }
  }, [isContractReady])

  const stopListening = useCallback(() => {
    setIsListening(false)
  }, [])

  const clearEvents = useCallback(() => {
    setEvents([])
  }, [])

  // Auto-start listening when contract is ready
  useEffect(() => {
    if (isContractReady) {
      startListening()
    }
    
    return () => {
      stopListening()
    }
  }, [isContractReady, startListening, stopListening])

  return {
    events,
    isListening,
    error,
    startListening,
    stopListening,
    clearEvents,
  }
}