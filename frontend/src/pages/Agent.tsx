import { BaseMessage } from '@langchain/core/messages'
import { useState } from 'react'
import { useAgent } from '../hooks/useAgent'

const ChatMessageItem = ({ message }: { message: BaseMessage }) => {
  if (!message.text.trim()) {
    return undefined
  }

  let speaker: 'You' | 'Bot'
  switch (message.getType()) {
    case 'human':
      speaker = 'You'
      break
    case 'ai':
      speaker = 'Bot'
      break
    default:
      return undefined
  }

  return (
    <p className="whitespace-pre-line border border-b-1 border-slate-400 p-2 m-2">
      {speaker}: {message.text}
    </p>
  )
}

const Agent = () => {
  const agent = useAgent()
  const [prompt, setPrompt] = useState("")
  const [isLoading, setIsLoading] = useState(false)

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault()
    setPrompt("")

    setIsLoading(true)
    await agent.prompt(prompt)
    setIsLoading(false)
  }

  return (
    <div>
      <div>
        {agent.messages.map((message, index) => (
          <ChatMessageItem key={index} message={message} />
        ))}
      </div>

      {isLoading && <p>Loading...</p>}

      <form onSubmit={handleSubmit}>
        <input
          type="text"
          value={prompt}
          onChange={(event) => setPrompt(event.target.value)}
        />

        <button type="submit" disabled={isLoading}>Submit</button>
      </form>
    </div>
  )
}

export default Agent;
