import { HumanMessage, type BaseMessage, type HumanMessageFields } from '@langchain/core/messages'
import { createReactAgent } from '@langchain/langgraph/prebuilt'
import { ChatOllama } from '@langchain/ollama'
import { useMemo, useState } from 'react'

import { useIngressosContract } from './useIngressosContract'
import { useTransactionHandler } from './useTransactionHandler'
import { useUserTickets } from './useUserTickets'
import { useWallet } from './useWallet'
import { getContext, listEvents, listTickets, purchaseTickets, type AgentContext } from '../utils/agentTools'
import { useEvents } from './useEvents'

export interface UseAgentReturn {
  prompt: (message: string | HumanMessageFields) => Promise<BaseMessage[]>
  messages: readonly BaseMessage[]
}

const createAgent = () => {
  const model = new ChatOllama({
    model: "llama3.2",
    temperature: 0,
    maxRetries: 2,
  })

  return createReactAgent({
    llm: model,
    tools: [getContext, listEvents, listTickets, purchaseTickets],
  })
}

export const useAgent = (): UseAgentReturn => {
  const agent = useMemo(createAgent, [])
  const [messages, setMessages] = useState<readonly BaseMessage[]>([])

  const wallet = useWallet()
  const contract = useIngressosContract()
  const transactions = useTransactionHandler()
  const tickets = useUserTickets()
  const events = useEvents()

  const prompt = async (message: string | HumanMessageFields) => {
      const prompMessage = new HumanMessage(message)
      setMessages((prevState) => [...prevState, prompMessage])

      const context: AgentContext & Record<string, unknown> = { wallet, contract, transactions, tickets, events }

      const inputMessages = [...messages, prompMessage]
      const { messages: outputMessages } = await agent.invoke({ messages: inputMessages }, { context })

      const newMessages = outputMessages.slice(inputMessages.length)
      if (newMessages.length > 0) {
        setMessages((prevState) => [...prevState, ...newMessages])
      }

      return newMessages
  }

  return {
    prompt,
    messages,
  }
}
