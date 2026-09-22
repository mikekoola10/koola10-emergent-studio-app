import React, { useState, useRef, useEffect } from 'react'
import { Send, AudioWaveform, Paperclip, X } from 'lucide-react'
import { apiClient, ChatMessage, friendlyErrorMessage } from '../lib/api'
import LoadingState from '../components/LoadingState'
import ErrorState from '../components/ErrorState'
import EmptyState from '../components/EmptyState'
import ReactMarkdown from 'react-markdown'

const QUICK_PROMPTS = [
  'My 808 is muddy — how do I clean it up?',
  'Give me a mastering chain for Spotify in FL Studio',
  'How do I gain stage a beat properly?',
  'My mix sounds quiet next to pro tracks — why?',
  'Walk me through a pre-release mix checklist',
]

const BeatLab: React.FC = () => {
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [inputValue, setInputValue] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [audioFile, setAudioFile] = useState<File | null>(null)
  const [isListening, setIsListening] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] || null
    setAudioFile(file)
    // Reset the input so the same file can be picked again after removing it
    e.target.value = ''
  }

  const sendMessage = async (text: string) => {
    if ((!text.trim() && !audioFile) || isLoading) return

    const label = audioFile
      ? `🎧 ${audioFile.name}${text.trim() ? `\n${text.trim()}` : ''}`
      : text
    const userMessage: ChatMessage = { role: 'user', content: label }
    const updatedMessages = [...messages, userMessage]
    setMessages(updatedMessages)
    setInputValue('')
    const attachedFile = audioFile
    setAudioFile(null)
    setError(null)
    setIsListening(!!attachedFile)
    setIsLoading(true)

    try {
      let response
      if (attachedFile) {
        response = await apiClient.beatlabListen(attachedFile, text.trim())
      } else {
        response = await apiClient.beatlab(updatedMessages)
      }
      const assistantMessage: ChatMessage = {
        role: 'assistant',
        content: response.response,
      }
      setMessages([...updatedMessages, assistantMessage])
    } catch (err) {
      setError(friendlyErrorMessage(err, 'Failed to get a response from the Beat Lab'))
      setMessages(messages)
    } finally {
      setIsLoading(false)
      setIsListening(false)
    }
  }

  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault()
    sendMessage(inputValue)
  }

  const handleRetry = () => {
    setError(null)
  }

  return (
    <div className="flex flex-col h-full bg-gradient-to-br from-koola-dark via-black to-koola-dark">
      {/* Header */}
      <div className="bg-koola-purple/30 border-b border-koola-cyan/20 px-6 py-4">
        <div className="flex items-center gap-3">
          <AudioWaveform size={28} className="text-koola-cyan" />
          <div>
            <h1 className="text-3xl font-bold text-koola-cyan">Beat Lab</h1>
            <p className="text-gray-400 text-sm mt-1">
              Nova coaches your mix &amp; master — FL Studio focused
            </p>
          </div>
        </div>
      </div>

      {/* Messages Container */}
      <div className="flex-1 overflow-y-auto px-6 py-6 space-y-4">
        {messages.length === 0 && !isLoading && !error && (
          <>
            <EmptyState message="Describe your mix problem or pick a starting point — Nova answers with exact FL Studio moves." />
            <div className="flex flex-wrap gap-2 justify-center max-w-2xl mx-auto">
              {QUICK_PROMPTS.map((prompt) => (
                <button
                  key={prompt}
                  onClick={() => sendMessage(prompt)}
                  disabled={isLoading}
                  className="px-4 py-2 text-sm bg-koola-cyan/10 border border-koola-cyan/40 text-koola-cyan rounded-full hover:bg-koola-cyan/20 transition-colors disabled:opacity-50"
                >
                  {prompt}
                </button>
              ))}
            </div>
          </>
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

        {isLoading && (
          <LoadingState
            message={isListening ? 'Nova is listening to your bounce...' : 'Nova is working on it...'}
          />
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input Form */}
      <div className="border-t border-koola-cyan/20 bg-koola-purple/20 px-6 py-4">
        {audioFile && (
          <div className="flex items-center gap-2 mb-3 max-w-2xl mx-auto">
            <span className="inline-flex items-center gap-2 px-3 py-1.5 text-sm bg-koola-cyan/10 border border-koola-cyan/40 text-koola-cyan rounded-full">
              <AudioWaveform size={14} />
              {audioFile.name}
            </span>
            <button
              onClick={() => setAudioFile(null)}
              disabled={isLoading}
              className="p-1.5 text-gray-400 hover:text-white transition-colors disabled:opacity-50"
              aria-label="Remove attached audio"
            >
              <X size={16} />
            </button>
          </div>
        )}
        <form onSubmit={handleSendMessage} className="flex gap-3">
          <input
            ref={fileInputRef}
            type="file"
            accept="audio/*,.mp3,.wav,.ogg,.oga,.m4a,.aac,.flac,.opus,.webm"
            onChange={handleFileSelect}
            className="hidden"
          />
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={isLoading}
            className="px-4 py-3 bg-koola-purple/40 border border-koola-cyan/30 text-koola-cyan rounded-lg hover:bg-koola-purple/60 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
            aria-label="Attach a bounce for Nova to hear"
            title="Attach a bounce (mp3, wav, ogg, m4a, flac — up to 15MB)"
          >
            <Paperclip size={18} />
          </button>
          <input
            type="text"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            placeholder={audioFile ? 'Ask about this bounce (optional)...' : 'e.g. my hi-hats sound harsh...'}
            disabled={isLoading}
            className="flex-1 px-4 py-3 bg-koola-dark border border-koola-cyan/30 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-koola-cyan transition-colors disabled:opacity-50"
          />
          <button
            type="submit"
            disabled={isLoading || (!inputValue.trim() && !audioFile)}
            className="px-6 py-3 bg-koola-cyan text-koola-dark font-semibold rounded-lg hover:bg-koola-cyan/80 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2"
          >
            <Send size={18} />
            <span>Send</span>
          </button>
        </form>
        <p className="text-xs text-gray-500 mt-2 text-center">
          Attach a bounce and Nova will actually listen to it — or just describe the problem and she&apos;ll coach from that.
        </p>
      </div>
    </div>
  )
}

export default BeatLab
