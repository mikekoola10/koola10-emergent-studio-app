import React, { useState, useRef, useEffect } from 'react'
import { Send, ChevronDown } from 'lucide-react'
import { apiClient, ChatMessage } from '../lib/api'
import LoadingState from '../components/LoadingState'
import ErrorState from '../components/ErrorState'
import EmptyState from '../components/EmptyState'
import ReactMarkdown from 'react-markdown'

const StudioChat: React.FC = () => {
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [inputValue, setInputValue] = useState('')
  const [selectedModel, setSelectedModel] = useState('nova')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isDropdownOpen, setIsDropdownOpen] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  const models = ['nova', 'gpt-4', 'claude', 'llama']

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!inputValue.trim()) return

    // Add user message to the chat
    const userMessage: ChatMessage = { role: 'user', content: inputValue }
    const updatedMessages = [...messages, userMessage]
    setMessages(updatedMessages)
    setInputValue('')
    setError(null)
    setIsLoading(true)

    try {
      const response = await apiClient.chat(updatedMessages, selectedModel)
      const assistantMessage: ChatMessage = {
        role: 'assistant',
        content: response.response,
      }
      setMessages([...updatedMessages, assistantMessage])
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'Failed to get response from the AI model'
      )
      // Remove the user message if the request failed
      setMessages(messages)
    } finally {
      setIsLoading(false)
    }
  }

  const handleRetry = () => {
    setError(null)
  }

  return (
    <div className="flex flex-col h-screen bg-gradient-to-br from-koola-dark via-black to-koola-dark">
      {/* Header */}
      <div className="bg-koola-purple/30 border-b border-koola-cyan/20 px-6 py-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-koola-cyan">Studio Chat</h1>
            <p className="text-gray-400 text-sm mt-1">Chat with Nova about the universe</p>
          </div>

          {/* Model Selector */}
          <div className="relative">
            <button
              onClick={() => setIsDropdownOpen(!isDropdownOpen)}
              className="flex items-center space-x-2 px-4 py-2 bg-koola-cyan/10 border border-koola-cyan/50 rounded-lg hover:bg-koola-cyan/20 transition-colors text-koola-cyan"
            >
              <span className="font-medium">{selectedModel}</span>
              <ChevronDown
                size={18}
                className={`transition-transform ${
                  isDropdownOpen ? 'rotate-180' : ''
                }`}
              />
            </button>

            {/* Dropdown Menu */}
            {isDropdownOpen && (
              <div className="absolute top-full right-0 mt-2 w-40 bg-koola-dark border border-koola-cyan/30 rounded-lg shadow-2xl z-10">
                {models.map((model) => (
                  <button
                    key={model}
                    onClick={() => {
                      setSelectedModel(model)
                      setIsDropdownOpen(false)
                    }}
                    className={`w-full text-left px-4 py-2 transition-colors ${
                      selectedModel === model
                        ? 'bg-koola-cyan/20 text-koola-cyan border-l-2 border-koola-cyan'
                        : 'text-gray-300 hover:bg-koola-cyan/10 hover:text-koola-cyan'
                    }`}
                  >
                    {model}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Messages Container */}
      <div className="flex-1 overflow-y-auto px-6 py-6 space-y-4">
        {messages.length === 0 && !isLoading && !error && (
          <EmptyState message="Start a conversation with Nova. Ask about the universe, consciousness, or anything on your mind." />
        )}

        {error && <ErrorState error={error} onRetry={handleRetry} />}

        {messages.map((msg, idx) => (
          <div
            key={idx}
            className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            <div
              className={`max-w-2xl px-4 py-3 rounded-lg ${
                msg.role === 'user'
                  ? 'bg-koola-cyan/20 border border-koola-cyan/50 text-white'
                  : 'bg-koola-purple/20 border border-koola-cyan/30 text-gray-100'
              }`}
            >
              {msg.role === 'assistant' ? (
                <div className="markdown-content text-sm">
                  <ReactMarkdown>{msg.content}</ReactMarkdown>
                </div>
              ) : (
                <p className="text-sm">{msg.content}</p>
              )}
            </div>
          </div>
        ))}

        {isLoading && <LoadingState message="Nova is thinking..." />}

        <div ref={messagesEndRef} />
      </div>

      {/* Input Form */}
      <div className="border-t border-koola-cyan/20 bg-koola-purple/20 px-6 py-4">
        <form onSubmit={handleSendMessage} className="flex gap-3">
          <input
            type="text"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            placeholder="Ask Nova anything..."
            disabled={isLoading}
            className="flex-1 px-4 py-3 bg-koola-dark border border-koola-cyan/30 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-koola-cyan transition-colors disabled:opacity-50"
          />
          <button
            type="submit"
            disabled={isLoading || !inputValue.trim()}
            className="px-6 py-3 bg-koola-cyan text-koola-dark font-semibold rounded-lg hover:bg-koola-cyan/80 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2"
          >
            <Send size={18} />
            <span>Send</span>
          </button>
        </form>
      </div>
    </div>
  )
}

export default StudioChat
