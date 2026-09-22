import React, { useState } from 'react'
import { BookOpen, Send, Sparkles } from 'lucide-react'
import { apiClient } from '../lib/api'
import LoadingState from '../components/LoadingState'
import ErrorState from '../components/ErrorState'
import EmptyState from '../components/EmptyState'
import ReactMarkdown from 'react-markdown'

interface LoreEntry {
  question: string
  answer: string
}

const quickQuestions = [
  'Tell me about the KOOLA10 Diner',
  'What is the KNB Station?',
  'What are Orbz?',
  'Who are Idiomsz and Skrollz?',
]

const LoreConsole: React.FC = () => {
  const [question, setQuestion] = useState('')
  const [history, setHistory] = useState<LoreEntry[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const askQuestion = async (q: string) => {
    const trimmed = q.trim()
    if (!trimmed || isLoading) return

    setQuestion('')
    setError(null)
    setIsLoading(true)

    try {
      const response = await apiClient.getLoreAnswer(trimmed)
      setHistory([{ question: trimmed, answer: response.answer }, ...history])
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to consult the lore')
    } finally {
      setIsLoading(false)
    }
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    askQuestion(question)
  }

  return (
    <div className="flex flex-col h-full bg-gradient-to-br from-koola-dark via-black to-koola-dark">
      {/* Header */}
      <div className="bg-koola-purple/30 border-b border-koola-cyan/20 px-6 py-4">
        <h1 className="text-3xl font-bold text-koola-cyan">Lore Console</h1>
        <p className="text-gray-400 text-sm mt-1">
          Ask the universe anything — answered from the Master Bible
        </p>
      </div>

      <div className="flex-1 overflow-y-auto px-6 py-6 space-y-6">
        {/* Quick questions */}
        <div>
          <p className="text-sm text-gray-400 mb-3 flex items-center gap-2">
            <Sparkles size={16} className="text-koola-cyan" />
            Try asking about the anchors of the universe
          </p>
          <div className="flex flex-wrap gap-2">
            {quickQuestions.map((q) => (
              <button
                key={q}
                onClick={() => askQuestion(q)}
                disabled={isLoading}
                className="px-4 py-2 text-sm bg-koola-cyan/10 border border-koola-cyan/30 text-koola-cyan rounded-full hover:bg-koola-cyan/20 transition-colors disabled:opacity-50"
              >
                {q}
              </button>
            ))}
          </div>
        </div>

        {/* States */}
        {isLoading && <LoadingState message="Consulting the Master Bible..." />}
        {error && <ErrorState error={error} onRetry={() => setError(null)} />}

        {history.length === 0 && !isLoading && !error && (
          <EmptyState
            message="No questions yet. Ask about the Diner, the KNB Station, Spiral City, Orbz, Portals — anything in the KOOLA10 universe."
            icon={<BookOpen size={48} className="text-koola-cyan/40 mb-4" />}
          />
        )}

        {/* History */}
        <div className="space-y-4">
          {history.map((entry, idx) => (
            <div
              key={idx}
              className="bg-koola-purple/20 border border-koola-cyan/30 rounded-lg overflow-hidden"
            >
              <div className="px-5 py-3 bg-koola-cyan/10 border-b border-koola-cyan/20">
                <p className="font-semibold text-koola-cyan">{entry.question}</p>
              </div>
              <div className="px-5 py-4 markdown-content text-sm text-gray-100">
                <ReactMarkdown>{entry.answer}</ReactMarkdown>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Input */}
      <div className="border-t border-koola-cyan/20 bg-koola-purple/20 px-6 py-4">
        <form onSubmit={handleSubmit} className="flex gap-3">
          <input
            type="text"
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            placeholder="Ask about the Diner, Orbz, Spiral City..."
            disabled={isLoading}
            className="flex-1 px-4 py-3 bg-koola-dark border border-koola-cyan/30 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-koola-cyan transition-colors disabled:opacity-50"
          />
          <button
            type="submit"
            disabled={isLoading || !question.trim()}
            className="px-6 py-3 bg-koola-cyan text-koola-dark font-semibold rounded-lg hover:bg-koola-cyan/80 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2"
          >
            <Send size={18} />
            <span>Ask</span>
          </button>
        </form>
      </div>
    </div>
  )
}

export default LoreConsole
