import { BaseMessage } from '@langchain/core/messages'
import { useState } from 'react'
import { useAgent } from '../hooks/useAgent'

const ChatMessageItem = ({ message }: { message: BaseMessage }) => {
  if (!message.content || (typeof message.content === 'string' && !message.content.trim())) {
    return null
  }

  let speaker: 'You' | 'Bot'
  let bgColor: string

  switch (message.getType()) {
    case 'human':
      speaker = 'You'
      bgColor = 'bg-blue-50 border-blue-200'
      break
    case 'ai':
      speaker = 'Bot'
      bgColor = 'bg-green-50 border-green-200'
      break
    default:
      return null
  }

  const content = typeof message.content === 'string' ? message.content : JSON.stringify(message.content)

  return (
    <div className={`p-4 rounded-lg mb-4 ${bgColor} border`}>
      <div className="flex items-center gap-2 mb-2">
        <span className="text-xs font-medium px-2 py-1 rounded bg-white border">
          {speaker}
        </span>
      </div>
      <p className="whitespace-pre-wrap text-sm leading-relaxed">
        {content}
      </p>
    </div>
  )
}

const Agent = () => {
  const [prompt, setPrompt] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Initialize agent with error handling
  let agent
  try {
    agent = useAgent()
  } catch (err) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-2xl mx-auto bg-white rounded-lg shadow-md p-6">
          <div className="flex items-center gap-2 mb-4">
            <div className="w-5 h-5 text-red-500">⚠️</div>
            <h2 className="text-xl font-semibold text-red-600">AI Agent Configuration Error</h2>
          </div>
          <p className="text-gray-600 mb-4">
            {err instanceof Error ? err.message : 'Failed to initialize AI agent'}
          </p>
          <div className="bg-gray-50 p-4 rounded-lg">
            <h4 className="font-medium mb-2">To fix this:</h4>
            <ol className="list-decimal list-inside space-y-1 text-sm">
              <li>Get an API key from OpenAI or Google AI</li>
              <li>Add it to your <code className="bg-gray-200 px-1 rounded">.env</code> file</li>
              <li>Restart the development server</li>
            </ol>
          </div>
        </div>
      </div>
    )
  }

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault()
    if (!prompt.trim()) return

    const currentPrompt = prompt
    setPrompt("")
    setError(null)
    setIsLoading(true)

    try {
      await agent.prompt(currentPrompt)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-bold">AI Assistant</h1>
            </div>

            {/* Provider Selection */}
            <div className="flex items-center gap-2">
              <span className="text-sm text-gray-600">Provider:</span>
              <select
                value={agent.currentProvider}
                onChange={(e) => agent.switchProvider(e.target.value as any)}
                className="px-3 py-1 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              >
                {agent.availableProviders.map((provider) => (
                  <option key={provider} value={provider}>
                    {provider === 'openai' ? 'OpenAI GPT' :
                     provider === 'gemini' ? 'Google Gemini' :
                     provider === 'ollama' ? 'Ollama (Local)' : provider}
                  </option>
                ))}
              </select>
              <div className={`px-2 py-1 text-xs rounded-full ${
                agent.currentProvider === 'openai' ? 'bg-green-100 text-green-800' :
                agent.currentProvider === 'gemini' ? 'bg-blue-100 text-blue-800' :
                'bg-purple-100 text-purple-800'
              }`}>
                {agent.availableProviders.length} available
              </div>
            </div>
          </div>

          <p className="text-gray-600">
            Ask me about your tickets, events, or wallet. I can help you navigate the NFT ticketing system.
          </p>

          {/* Error Display */}
          {agent.error && (
            <div className="mt-4 bg-red-50 border border-red-200 rounded-lg p-3">
              <div className="flex items-center gap-2 text-red-600 text-sm">
                <span>⚠️</span>
                <span>{agent.error}</span>
              </div>
            </div>
          )}
        </div>

        {/* Chat Messages */}
        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <div className="max-h-96 overflow-y-auto">
            {agent.messages.length === 0 ? (
              <div className="text-center text-gray-500 py-8">
                <div className="text-4xl mb-4">💬</div>
                <p>Start a conversation! Ask me about your tickets or events.</p>
              </div>
            ) : (
              agent.messages.map((message, index) => (
                <ChatMessageItem key={index} message={message} />
              ))
            )}

            {isLoading && (
              <div className="flex items-center gap-2 text-gray-500 p-4">
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-current"></div>
                <span>AI is thinking...</span>
              </div>
            )}
          </div>
        </div>

        {/* Local Error Display */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
            <div className="flex items-center gap-2 text-red-600">
              <span>⚠️</span>
              <span className="text-sm">{error}</span>
            </div>
          </div>
        )}

        {/* Input Form */}
        <div className="bg-white rounded-lg shadow-md p-6">
          <form onSubmit={handleSubmit} className="flex gap-2">
            <input
              type="text"
              value={prompt}
              onChange={(event) => setPrompt(event.target.value)}
              placeholder="Ask me about your tickets, events, or wallet..."
              disabled={isLoading}
              className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
            <button
              type="submit"
              disabled={isLoading || !prompt.trim()}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              <span>📤</span>
              Send
            </button>
          </form>

          {/* Example prompts */}
          <div className="mt-4">
            <p className="text-sm text-gray-600 mb-2">Try asking:</p>
            <div className="flex flex-wrap gap-2">
              {[
                "Show me my tickets",
                "List available events",
                "What's my wallet balance?",
                "Help me buy a ticket"
              ].map((example) => (
                <button
                  key={example}
                  onClick={() => setPrompt(example)}
                  disabled={isLoading}
                  className="px-3 py-1 text-xs border border-gray-300 rounded-full hover:bg-gray-50 disabled:opacity-50"
                >
                  {example}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default Agent;
