import React, { useState, useRef, useEffect } from 'react'
import { Send, AudioWaveform, Paperclip, X, Wand2, MessageCircle, Dices } from 'lucide-react'
import { apiClient, ChatMessage, SoundDesignResponse, friendlyErrorMessage } from '../lib/api'
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

const DESIGN_EXAMPLES = [
  'dark 808',
  'airy bell arp',
  'gritty rage lead',
  'warm lofi keys',
  'deep sub bass',
]

const PARAM_LABELS: Record<string, string> = {
  osc_type: 'Oscillator',
  detune: 'Detune',
  cutoff: 'Cutoff (Hz)',
  resonance: 'Resonance',
  attack: 'Attack (s)',
  decay: 'Decay (s)',
  sustain: 'Sustain',
  release: 'Release (s)',
  reverb: 'Reverb',
  distortion: 'Distortion',
}

function formatParamValue(key: string, value: number | string): string {
  if (typeof value === 'string') return value
  if (key === 'cutoff') return String(Math.round(value))
  if (key === 'attack' || key === 'decay' || key === 'release') return value.toFixed(3)
  return value.toFixed(2)
}

// Nova's faces — one is picked at random from the user's photo set on each visit.
const NOVA_AVATARS = Array.from({ length: 13 }, (_, i) => `/nova-avatars/nova-${i + 1}.jpg`)

function randomAvatarIndex(except?: number): number {
  if (NOVA_AVATARS.length <= 1) return 0
  let idx = Math.floor(Math.random() * NOVA_AVATARS.length)
  while (idx === except) {
    idx = Math.floor(Math.random() * NOVA_AVATARS.length)
  }
  return idx
}

const BeatLab: React.FC = () => {
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [inputValue, setInputValue] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [audioFile, setAudioFile] = useState<File | null>(null)
  const [isListening, setIsListening] = useState(false)
  const [mode, setMode] = useState<'coach' | 'design'>('coach')
  const [designInput, setDesignInput] = useState('')
  const [designResult, setDesignResult] = useState<SoundDesignResponse | null>(null)
  const [designLoading, setDesignLoading] = useState(false)
  const [designError, setDesignError] = useState<string | null>(null)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [avatarIdx, setAvatarIdx] = useState<number>(() => randomAvatarIndex())

  const shuffleAvatar = () => {
    setAvatarIdx((prev) => randomAvatarIndex(prev))
  }

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

  const runDesign = async (text: string) => {
    if (!text.trim() || designLoading) return
    setDesignLoading(true)
    setDesignError(null)
    try {
      const result = await apiClient.beatlabDesign(text.trim())
      setDesignResult(result)
    } catch (err) {
      setDesignError(friendlyErrorMessage(err, 'Sound Designer failed'))
      setDesignResult(null)
    } finally {
      setDesignLoading(false)
    }
  }

  const handleDesignSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    runDesign(designInput)
  }

  return (
    <div className="flex flex-col h-full bg-gradient-to-br from-koola-dark via-black to-koola-dark">
      {/* Header */}
      <div className="bg-koola-purple/30 border-b border-koola-cyan/20 px-6 py-4">
        <div className="flex items-center gap-3">
          <div className="relative flex-shrink-0">
            <img
              src={NOVA_AVATARS[avatarIdx]}
              alt="Nova"
              className="w-14 h-14 rounded-full object-cover border-2 border-koola-cyan/60"
            />
            <button
              onClick={shuffleAvatar}
              title="New face"
              aria-label="Give Nova a new face"
              className="absolute -bottom-1 -right-1 p-1.5 bg-koola-dark border border-koola-cyan/50 text-koola-cyan rounded-full hover:bg-koola-cyan/20 transition-colors"
            >
              <Dices size={14} />
            </button>
          </div>
          <div>
            <h1 className="text-3xl font-bold text-koola-cyan">Beat Lab</h1>
            <p className="text-gray-400 text-sm mt-1">
              Nova coaches your mix &amp; master — FL Studio focused
            </p>
          </div>
        </div>
      </div>

      {/* Mode tabs */}
      <div className="flex gap-2 px-6 pt-4">
        <button
          onClick={() => setMode('coach')}
          className={`flex items-center gap-2 px-4 py-2 text-sm rounded-full border transition-colors ${
            mode === 'coach'
              ? 'bg-koola-cyan/20 border-koola-cyan/60 text-koola-cyan'
              : 'bg-transparent border-koola-cyan/20 text-gray-400 hover:text-gray-200'
          }`}
        >
          <MessageCircle size={16} />
          Coach
        </button>
        <button
          onClick={() => setMode('design')}
          className={`flex items-center gap-2 px-4 py-2 text-sm rounded-full border transition-colors ${
            mode === 'design'
              ? 'bg-koola-cyan/20 border-koola-cyan/60 text-koola-cyan'
              : 'bg-transparent border-koola-cyan/20 text-gray-400 hover:text-gray-200'
          }`}
        >
          <Wand2 size={16} />
          Sound Designer
        </button>
      </div>

      {mode === 'coach' && (
      <>
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
            className={`flex items-start gap-2 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            {msg.role === 'assistant' && (
              <img
                src={NOVA_AVATARS[avatarIdx]}
                alt="Nova"
                className="w-8 h-8 rounded-full object-cover border border-koola-cyan/40 flex-shrink-0 mt-1"
              />
            )}
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
      </>
      )}

      {mode === 'design' && (
      <div className="flex-1 overflow-y-auto px-6 py-6">
        <div className="max-w-2xl mx-auto space-y-6">
          <p className="text-gray-400 text-sm text-center">
            Describe the sound you want — Nova turns it into synth settings with exact 3xOSC dial positions.
          </p>
          <form onSubmit={handleDesignSubmit} className="flex gap-3">
            <input
              type="text"
              value={designInput}
              onChange={(e) => setDesignInput(e.target.value)}
              placeholder="e.g. dark 808, airy bell arp..."
              disabled={designLoading}
              className="flex-1 px-4 py-3 bg-koola-dark border border-koola-cyan/30 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-koola-cyan transition-colors disabled:opacity-50"
            />
            <button
              type="submit"
              disabled={designLoading || !designInput.trim()}
              className="px-6 py-3 bg-koola-cyan text-koola-dark font-semibold rounded-lg hover:bg-koola-cyan/80 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2"
            >
              <Wand2 size={18} />
              <span>Design</span>
            </button>
          </form>
          <div className="flex flex-wrap gap-2 justify-center">
            {DESIGN_EXAMPLES.map((example) => (
              <button
                key={example}
                onClick={() => { setDesignInput(example); runDesign(example) }}
                disabled={designLoading}
                className="px-4 py-2 text-sm bg-koola-purple/30 border border-koola-cyan/40 text-koola-cyan rounded-full hover:bg-koola-cyan/20 transition-colors disabled:opacity-50"
              >
                {example}
              </button>
            ))}
          </div>

          {designLoading && <LoadingState message="Designing your sound..." />}

          {designError && <ErrorState error={designError} onRetry={() => setDesignError(null)} />}

          {designResult && (
            <div className="bg-koola-purple/20 border border-koola-cyan/30 rounded-lg p-5 space-y-5">
              <div>
                <h3 className="text-koola-cyan font-semibold mb-2">
                  &ldquo;{designResult.description}&rdquo;
                </h3>
                {designResult.matched.length > 0 ? (
                  <div className="flex flex-wrap gap-2">
                    {designResult.matched.map((kw) => (
                      <span
                        key={kw}
                        className="px-3 py-1 text-xs bg-koola-cyan/10 border border-koola-cyan/40 text-koola-cyan rounded-full"
                      >
                        {kw}
                      </span>
                    ))}
                  </div>
                ) : (
                  <p className="text-gray-400 text-sm">No keywords matched — neutral starting point.</p>
                )}
              </div>

              <div>
                <h4 className="text-white font-semibold text-sm mb-2">Parameters</h4>
                <div className="grid grid-cols-2 gap-2">
                  {Object.entries(designResult.parameters).map(([key, value]) => (
                    <div
                      key={key}
                      className="flex justify-between px-3 py-2 bg-black/30 rounded text-sm"
                    >
                      <span className="text-gray-400">{PARAM_LABELS[key] || key}</span>
                      <span className="text-koola-cyan font-mono">{formatParamValue(key, value)}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <h4 className="text-white font-semibold text-sm mb-2">Dial it in — 3xOSC</h4>
                <ol className="space-y-3">
                  {designResult.dial_in.map((step, idx) => (
                    <li key={idx} className="flex gap-3 text-sm">
                      <span className="flex-shrink-0 w-6 h-6 rounded-full bg-koola-cyan/20 border border-koola-cyan/50 text-koola-cyan text-xs flex items-center justify-center font-semibold">
                        {idx + 1}
                      </span>
                      <div>
                        <p className="text-white font-medium">{step.title}</p>
                        <p className="text-gray-400 mt-0.5">{step.detail}</p>
                      </div>
                    </li>
                  ))}
                </ol>
              </div>

              <p className="text-xs text-gray-500">{designResult.note}</p>
            </div>
          )}
        </div>
      </div>
      )}
    </div>
  )
}

export default BeatLab
