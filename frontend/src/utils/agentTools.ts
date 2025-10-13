import { tool } from '@langchain/core/tools'
import z from 'zod'

import type { UseIngressosContractReturn } from '../hooks/useIngressosContract'
import type { UseTransactionHandlerReturn } from '../hooks/useTransactionHandler'
import type { UseUserTicketsReturn } from '../hooks/useUserTickets'
import type { UseWalletReturn } from '../hooks/useWallet'
import type { UseEventsReturn } from '../hooks/useEvents'

export interface AgentContext {
  wallet: UseWalletReturn
  contract: UseIngressosContractReturn
  transactions: UseTransactionHandlerReturn
  tickets: UseUserTicketsReturn
  events: UseEventsReturn
}

const getAgentContext = (options: object): AgentContext | undefined => {
  if ('context' in options) {
    return options.context as AgentContext
  } else {
    return undefined
  }
}

const safeJson = <T>(target: T): string => {
  const json = JSON.stringify(target, (_, value) => {
    if (typeof value === 'bigint') {
      return Number(value)
    }
    return value
  })

  return json ?? 'null'
}

export const getContext = tool(
  (input, options) => {
    console.log('get-context', input, options)
    return safeJson(getAgentContext(options))
  },
  {
    name: 'get-context',
    description: 'Get current context',
    schema: z.unknown()
  }
)

export const listTickets = tool(
  (input, options) => {
    console.log('list-tickets', input, options)
    const context = getAgentContext(options)
    context?.tickets.refetch()
    return safeJson(context?.tickets)
  },
  {
    name: 'list-tickets',
    description: 'Get tickets assigned to current user',
    schema: z.unknown()
  }
)

export const listEvents = tool(
  (input, options) => {
    console.log('list-events', input, options)
    const context = getAgentContext(options)
    context?.events.refetch()
    return safeJson(context?.events.events)
  },
  {
    name: 'list-events',
    description: 'Get tickets assigned to current user',
    schema: z.unknown()
  }
)

export const purchaseTickets = tool(
  async (input, options) => {
    console.log('purchase-tickets', input, options)
    const context = getAgentContext(options)
    if (!context) {
      return { ok: false, reason: 'missing context' }
    }

    const event = context.events.getEvent(input.eventId)
    if (!event.data) {
      return { ok: false, reason: `event '${input.eventId}' not found` }
    }

    context.tickets.refetch()
    await context.transactions.executeTransaction(
      context.contract.purchaseTicket,
      [event.data.eventId, context.contract.formatPrice(event.data.ticketPrice)],
    )

    return { ok: true }
  },
  {
    name: 'purchase-tickets',
    description: 'Purchase tickets for an event',
    schema: z.object({
      eventId: z.number().describe('ID of event to purchase')
    }).describe('Target event')
  }
)
