import { HumanMessage, type BaseMessage, type HumanMessageFields } from '@langchain/core/messages'
import { createReactAgent } from '@langchain/langgraph/prebuilt'
import { ChatOpenAI } from '@langchain/openai'
import { ChatGoogleGenerativeAI } from '@langchain/google-genai'
import { ChatOllama } from '@langchain/ollama'
import { useMemo, useState } from 'react'

import { useIngressosContract } from './useIngressosContract'
import { useTransactionHandler } from './useTransactionHandler'
import { useUserTickets } from './useUserTickets'
import { useWallet } from './useWallet'
import { getContext, listEvents, listTickets, purchaseTickets, checkTransactionStatus, type AgentContext } from '../utils/agentTools'
import { useEvents } from './useEvents'

export interface UseAgentReturn {
  prompt: (message: string | HumanMessageFields) => Promise<BaseMessage[]>
  messages: readonly BaseMessage[]
  currentProvider: string
  switchProvider: (provider: AIProvider) => void
  availableProviders: AIProvider[]
  error: string | null
}

// AI Provider Configuration
type AIProvider = 'openai' | 'gemini' | 'ollama'

interface AIConfig {
  provider: AIProvider
  apiKey?: string
  model?: string
  baseUrl?: string
}

// Check which providers are available
const getAvailableProviders = (): AIProvider[] => {
  const providers: AIProvider[] = []

  if (import.meta.env.VITE_OPENAI_API_KEY && import.meta.env.VITE_OPENAI_API_KEY !== 'your_openai_api_key_here') {
    providers.push('openai')
  }

  if (import.meta.env.VITE_GEMINI_API_KEY && import.meta.env.VITE_GEMINI_API_KEY !== 'your_gemini_api_key_here') {
    providers.push('gemini')
  }

  // Ollama is always available (assumes local installation)
  providers.push('ollama')

  return providers
}

// Get default provider (prefer order: OpenAI > Gemini > Ollama)
const getDefaultProvider = (): AIProvider => {
  const available = getAvailableProviders()

  if (available.includes('openai')) return 'openai'
  if (available.includes('gemini')) return 'gemini'
  return 'ollama'
}

// Get AI configuration for a specific provider
const getAIConfig = (provider: AIProvider): AIConfig => {
  switch (provider) {
    case 'openai':
      return {
        provider: 'openai',
        apiKey: import.meta.env.VITE_OPENAI_API_KEY,
        model: import.meta.env.VITE_OPENAI_MODEL || 'gpt-3.5-turbo'
      }

    case 'gemini':
      return {
        provider: 'gemini',
        apiKey: import.meta.env.VITE_GEMINI_API_KEY,
        model: import.meta.env.VITE_GEMINI_MODEL || 'gemini-pro'
      }

    case 'ollama':
      return {
        provider: 'ollama',
        model: 'llama3.2',
        baseUrl: 'http://localhost:11434'
      }

    default:
      throw new Error(`Unsupported AI provider: ${provider}`)
  }
}

const createAgent = (provider: AIProvider) => {
  const config = getAIConfig(provider)
  let model

  try {
    switch (config.provider) {
      case 'openai':
        if (!config.apiKey) {
          throw new Error('OpenAI API key not configured')
        }
        model = new ChatOpenAI({
          openAIApiKey: config.apiKey,
          modelName: config.model,
          temperature: 0,
          maxRetries: 2,
        })
        break

      case 'gemini':
        if (!config.apiKey) {
          throw new Error('Gemini API key not configured')
        }
        model = new ChatGoogleGenerativeAI({
          apiKey: config.apiKey,
          model: config.model || 'gemini-pro',
          temperature: 0,
          maxRetries: 2,
        })
        break

      case 'ollama':
        model = new ChatOllama({
          model: config.model || 'llama3.2',
          temperature: 0,
          maxRetries: 2,
          baseUrl: config.baseUrl || 'http://localhost:11434',
        })
        break

      default:
        throw new Error(`Unsupported AI provider: ${config.provider}`)
    }

    return createReactAgent({
      llm: model,
      tools: [getContext, listEvents, listTickets, purchaseTickets, checkTransactionStatus],
    })
  } catch (error) {
    console.error(`Failed to create agent with ${provider}:`, error)
    throw error
  }
}

export const useAgent = (): UseAgentReturn => {
  const availableProviders = useMemo(() => getAvailableProviders(), [])
  const [currentProvider, setCurrentProvider] = useState<AIProvider>(getDefaultProvider())
  const [error, setError] = useState<string | null>(null)
  const [messages, setMessages] = useState<readonly BaseMessage[]>([])

  const agent = useMemo(() => {
    try {
      setError(null)
      return createAgent(currentProvider)
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error'
      setError(errorMessage)
      console.error('Failed to create agent:', err)
      return null
    }
  }, [currentProvider])

  const wallet = useWallet()
  const contract = useIngressosContract()
  const transactions = useTransactionHandler()
  const tickets = useUserTickets()
  const events = useEvents()

  const switchProvider = (provider: AIProvider) => {
    if (!availableProviders.includes(provider)) {
      setError(`Provider ${provider} is not available. Please check your configuration.`)
      return
    }

    setCurrentProvider(provider)
    setMessages([]) // Clear messages when switching providers
    setError(null)
  }

  const prompt = async (message: string | HumanMessageFields) => {
    if (!agent) {
      const errorMsg = error || 'Agent not available'
      setError(errorMsg)
      return []
    }

    try {
      setError(null)
      const promptMessage = new HumanMessage(message)
      setMessages((prevState) => [...prevState, promptMessage])

      const context: AgentContext & Record<string, unknown> = {
        wallet,
        contract,
        transactions,
        tickets,
        events
      }

      const inputMessages = [...messages, promptMessage]
      const { messages: outputMessages } = await agent.invoke(
        { messages: inputMessages },
        { context }
      )

      const newMessages = outputMessages.slice(inputMessages.length)
      if (newMessages.length > 0) {
        setMessages((prevState) => [...prevState, ...newMessages])
      }

      return newMessages
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to get response from AI'
      setError(errorMessage)
      console.error('Agent prompt error:', err)

      // Add error message to chat
      const errorMsg = new HumanMessage(`Error: ${errorMessage}`)
      setMessages((prevState) => [...prevState, errorMsg])

      return []
    }
  }

  return {
    prompt,
    messages,
    currentProvider,
    switchProvider,
    availableProviders,
    error,
  }
}
