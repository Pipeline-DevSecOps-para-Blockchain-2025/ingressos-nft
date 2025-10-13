import { tool } from '@langchain/core/tools'
import { z } from 'zod'

// Define the context interface that will be passed to tools
export interface AgentContext {
  wallet: any
  contract: any
  transactions: any
  tickets: any
  events: any
}

// Tool to get current context information
export const getContext = tool(
  async (_input, config) => {
    const context = (config as any)?.context as AgentContext

    if (!context) {
      return "Context not available"
    }

    const { wallet, contract, tickets, events } = context

    const info = {
      wallet: {
        isConnected: wallet.isConnected,
        address: wallet.address,
        chainId: wallet.chainId,
        isCorrectNetwork: wallet.isCorrectNetwork,
        balance: wallet.formatAddress ? wallet.formatAddress() : 'Unknown'
      },
      contract: {
        isReady: contract.isContractReady,
        address: contract.contractAddress
      },
      tickets: {
        count: tickets.tickets?.length || 0,
        isLoading: tickets.isLoading
      },
      events: {
        count: events.events?.length || 0,
        isLoading: events.isLoading
      }
    }

    return `Current Status:
- Wallet: ${info.wallet.isConnected ? 'Connected' : 'Not connected'}
- Address: ${info.wallet.address || 'None'}
- Network: ${info.wallet.isCorrectNetwork ? 'Supported' : 'Unsupported'}
- Contract: ${info.contract.isReady ? 'Ready' : 'Not ready'}
- Your Tickets: ${info.tickets.count}
- Available Events: ${info.events.count}`
  },
  {
    name: "getContext",
    description: "Get current wallet, contract, and user context information",
    schema: z.object({
      type: z.string().optional().describe("Type of context to get (optional)")
    })
  }
)

// Tool to list available events
export const listEvents = tool(
  async (_input, config) => {
    const context = (config as any)?.context as AgentContext

    if (!context?.events) {
      return "Events data not available"
    }

    const { events, isLoading, error } = context.events

    if (isLoading) {
      return "Loading events..."
    }

    if (error) {
      return `Error loading events: ${error.message}`
    }

    if (!events || events.length === 0) {
      return "No events available at the moment."
    }

    const eventList = events.map((event: any) => {
      const eventDate = new Date(Number(event.date) * 1000)
      const isUpcoming = eventDate > new Date()
      const availableTickets = Number(event.maxSupply - event.currentSupply)

      return `Event #${event.eventId}: ${event.name}
- Date: ${eventDate.toLocaleDateString()}
- Venue: ${event.venue}
- Price: ${event.ticketPrice ? (Number(event.ticketPrice) / 1e18).toFixed(4) : 'Unknown'} ETH
- Available: ${availableTickets}/${Number(event.maxSupply)}
- Status: ${isUpcoming ? 'Upcoming' : 'Past'}`
    }).join('\n\n')

    return `Available Events (${events.length}):\n\n${eventList}`
  },
  {
    name: "listEvents",
    description: "List all available events with details",
    schema: z.object({
      filter: z.string().optional().describe("Filter events by status (upcoming, past, all)")
    })
  }
)

// Tool to list user's tickets
export const listTickets = tool(
  async (_input, config) => {
    const context = (config as any)?.context as AgentContext

    if (!context?.tickets) {
      return "Tickets data not available"
    }

    const { tickets, isLoading, error } = context.tickets

    if (isLoading) {
      return "Loading your tickets..."
    }

    if (error) {
      return `Error loading tickets: ${error.message}`
    }

    if (!tickets || tickets.length === 0) {
      return "You don't have any tickets yet. Browse events to purchase your first ticket!"
    }

    const ticketList = tickets.map((ticket: any) => {
      const purchaseDate = new Date(Number(ticket.purchaseDate) * 1000)

      return `Ticket #${ticket.tokenId}:
- Event ID: ${ticket.eventId}
- Purchase Date: ${purchaseDate.toLocaleDateString()}
- Purchase Price: ${ticket.purchasePrice ? (Number(ticket.purchasePrice) / 1e18).toFixed(4) : 'Unknown'} ETH
- Owner: ${ticket.originalBuyer}`
    }).join('\n\n')

    return `Your Tickets (${tickets.length}):\n\n${ticketList}`
  },
  {
    name: "listTickets",
    description: "List user's owned tickets",
    schema: z.object({
      filter: z.string().optional().describe("Filter tickets by status (upcoming, past, all)")
    })
  }
)

// Tool to directly purchase tickets
// Tool to check transaction status
export const checkTransactionStatus = tool(
  async (_input, config) => {
    const context = (config as any)?.context as AgentContext

    if (!context?.transactions) {
      return "Transaction status not available"
    }

    const { transactions } = context
    const { transaction, isPending, isConfirming, isConfirmed, isFailed, getStatusMessage } = transactions

    if (!transaction.hash) {
      return "No recent transaction found"
    }

    const statusMessage = getStatusMessage()
    const hash = transaction.hash

    if (isConfirmed) {
      return `✅ Transaction confirmed!
- Hash: ${hash}
- Status: ${statusMessage}
- Block: ${transaction.receipt?.blockNumber || 'Unknown'}

Your ticket should now appear in "My Tickets".`
    }

    if (isFailed) {
      return `❌ Transaction failed!
- Hash: ${hash}
- Status: ${statusMessage}
- Error: ${transaction.error || 'Unknown error'}

Please try purchasing the ticket again.`
    }

    if (isConfirming) {
      return `⏳ Transaction is being confirmed...
- Hash: ${hash}
- Status: ${statusMessage}

Please wait while the blockchain confirms your transaction.`
    }

    if (isPending) {
      return `🔄 Transaction is pending...
- Hash: ${hash}
- Status: ${statusMessage}

Your transaction has been submitted and is waiting to be processed.`
    }

    return `Transaction status: ${statusMessage}`
  },
  {
    name: "checkTransactionStatus",
    description: "Check the status of the most recent transaction",
    schema: z.object({
      details: z.boolean().optional().describe("Whether to show detailed transaction information")
    })
  }
)

export const purchaseTickets = tool(
  async (input, config) => {
    const context = (config as any)?.context as AgentContext

    if (!context?.wallet?.isConnected) {
      return "Please connect your wallet first to purchase tickets."
    }

    if (!context?.wallet?.isCorrectNetwork) {
      return "Please switch to a supported network to purchase tickets."
    }

    if (!context?.contract?.isContractReady) {
      return "Smart contract is not ready. Please check your network connection."
    }

    const { events } = context.events || {}

    if (!events || events.length === 0) {
      return "No events available for purchase at the moment."
    }

    // If no eventId specified, list available events
    if (!input.eventId) {
      const purchasableEvents = events.filter((event: any) => {
        const eventDate = new Date(Number(event.date) * 1000)
        const isUpcoming = eventDate > new Date()
        const availableTickets = Number(event.maxSupply - event.currentSupply)
        return isUpcoming && availableTickets > 0 && event.status === 0
      })

      if (purchasableEvents.length === 0) {
        return "No events are currently available for purchase."
      }

      const eventList = purchasableEvents.map((event: any) => {
        const eventDate = new Date(Number(event.date) * 1000)
        const availableTickets = Number(event.maxSupply - event.currentSupply)

        return `Event #${event.eventId}: ${event.name}
- Price: ${event.ticketPrice ? (Number(event.ticketPrice) / 1e18).toFixed(4) : 'Unknown'} ETH
- Available: ${availableTickets} tickets
- Date: ${eventDate.toLocaleDateString()}`
      }).join('\n\n')

      return `Events available for purchase:\n\n${eventList}\n\nSpecify an event ID to purchase a ticket. For example: "Buy ticket for event 1"`
    }

    // Find the event by ID
    const event = events.find((e: any) => e.eventId === input.eventId)
    if (!event) {
      return `Event #${input.eventId} not found.`
    }

    const eventDate = new Date(Number(event.date) * 1000)
    const isUpcoming = eventDate > new Date()
    const availableTickets = Number(event.maxSupply - event.currentSupply)

    if (!isUpcoming) {
      return `Event #${input.eventId} has already passed and tickets are no longer available.`
    }

    if (availableTickets <= 0) {
      return `Event #${input.eventId} is sold out.`
    }

    if (event.status !== 0) {
      return `Event #${input.eventId} is not currently active for ticket sales.`
    }

    // Execute the purchase transaction
    try {
      const { contract, transactions } = context

      if (!contract?.purchaseTicket) {
        return "Purchase function is not available. Please try again later."
      }

      // Get the ticket price in ETH format
      const ticketPriceEth = event.ticketPrice ? (Number(event.ticketPrice) / 1e18).toString() : '0'

      // Execute the purchase transaction using the transaction handler
      let transactionHash: string | null = null
      let purchaseError: any = null

      await transactions.executeTransaction(
        contract.purchaseTicket,
        [input.eventId, ticketPriceEth],
        {
          onSuccess: (hash: `0x${string}`) => {
            transactionHash = hash
          },
          onError: (error: Error) => {
            purchaseError = error
          }
        }
      )

      if (purchaseError) {
        return `❌ Failed to purchase ticket: ${purchaseError?.message || 'Unknown error'}`
      }

      if (transactionHash) {
        return `🎉 Successfully initiated ticket purchase for "${event.name}"!

Transaction Details:
- Event: ${event.name}
- Date: ${eventDate.toLocaleDateString()}
- Venue: ${event.venue}
- Price: ${ticketPriceEth} ETH
- Transaction Hash: ${transactionHash}

Your transaction is being processed. Your ticket will appear in "My Tickets" once the transaction is confirmed on the blockchain (usually within a few minutes).`
      } else {
        return `❌ Transaction failed to initiate. Please try again.`
      }
    } catch (error) {
      console.error('Purchase error:', error)
      return `❌ Error purchasing ticket: ${error instanceof Error ? error.message : 'Unknown error occurred'}`
    }
  },
  {
    name: "purchaseTickets",
    description: "Directly purchase tickets for events by executing blockchain transactions",
    schema: z.object({
      eventId: z.number().optional().describe("Specific event ID to purchase ticket for")
    })
  }
)
