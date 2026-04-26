import React, { useState } from 'react'
import { BookOpen, Send, Sparkles } from 'lucide-react'
import { apiClient } from '../lib/api'
import LoadingState from '../components/LoadingState'
import ErrorState from '../components/ErrorState'
import EmptyState from '../components/EmptyState'
import ReactMarkdown from 'react-markdown'

const LoreConsole: React.FC = () => {
  const [question, setQuestion] = useState('')
  const [answer, setAnswer] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!question.trim()) return

    setIsLoading(true)
    setError(null)
    setAnswer(null)

    try {
      const response = await apiClient.getLoreAnswer(question)
      setAnswer(response.answer)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to retrieve lore')
    } finally {
      setIsLoading(false)
    }
  }

  const handleRetry = () => {
    handleSubmit({ preventDefault: () => {} } as React.FormEvent)
  }

  return (
    <div className="flex flex-col h-screen bg-gradient-to-br from-koola-dark via-black to-koola-dark">
      {/* Header */}
      <div className="bg-koola-purple/30 border-b border-koola-cyan/20 px-6 py-4">
        <div className="flex items-center space-x-3">
          <BookOpen className="text-koola-cyan" size={28} />
          <div>
            <h1 className="text-3xl font-bold text-koola-cyan">Lore Console</h1>
            <p className="text-gray-400 text-sm mt-1">Consult the Universe Lorekeeper</p>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto px-6 py-8">
        <div className="max-w-4xl mx-auto space-y-8">
          {/* Input Section */}
          <div className="bg-koola-purple/20 border border-koola-cyan/30 rounded-xl p-6 shadow-xl">
            <form onSubmit={handleSubmit} className="space-y-4">
              <label className="block text-sm font-medium text-koola-cyan mb-2">
                Ask a question about the universe lore:
              </label>
              <div className="flex gap-4">
                <textarea
                  value={question}
                  onChange={(e) => setQuestion(e.target.value)}
                  placeholder="e.g., What is the origin of the neon nebula?"
                  rows={3}
                  className="flex-1 px-4 py-3 bg-koola-dark border border-koola-cyan/30 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-koola-cyan transition-colors resize-none"
                />
                <button
                  type="submit"
                  disabled={isLoading || !question.trim()}
                  className="px-6 py-3 bg-koola-cyan text-koola-dark font-bold rounded-lg hover:bg-koola-cyan/80 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex flex-col items-center justify-center space-y-1 min-w-[120px]"
                >
                  <Send size={20} />
                  <span>Ask</span>
                </button>
              </div>
            </form>
          </div>

          {/* Results Section */}
          <div className="min-h-[300px] flex flex-col">
            {isLoading && (
              <div className="mt-12">
                <LoadingState message="Consulting the ancient records..." />
              </div>
            )}

            {error && (
              <div className="mt-12">
                <ErrorState error={error} onRetry={handleRetry} />
              </div>
            )}

            {!isLoading && !error && !answer && (
              <div className="mt-12">
                <EmptyState
                  message="Ask a question above to reveal the secrets of the universe."
                  icon={<Sparkles size={48} className="text-koola-cyan/40 mb-4" />}
                />
              </div>
            )}

            {answer && (
              <div className="bg-koola-cyan/10 border border-koola-cyan/50 rounded-xl p-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
                <div className="flex items-center space-x-2 mb-4">
                  <Sparkles size={18} className="text-koola-cyan" />
                  <h3 className="text-lg font-bold text-koola-cyan uppercase tracking-wider">Lorekeeper's Revelation</h3>
                </div>
                <div className="prose prose-invert max-w-none">
                  <div className="text-gray-100 leading-relaxed markdown-content">
                    <ReactMarkdown>{answer}</ReactMarkdown>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

export default LoreConsole
