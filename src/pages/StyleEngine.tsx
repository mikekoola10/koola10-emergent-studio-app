import React, { useState } from 'react'
import { Palette, Zap, Copy, CheckCircle2 } from 'lucide-react'
import { apiClient, StyleResponse } from '../lib/api'
import LoadingState from '../components/LoadingState'
import ErrorState from '../components/ErrorState'
import EmptyState from '../components/EmptyState'

const StyleEngine: React.FC = () => {
  const [scene, setScene] = useState('')
  const [result, setResult] = useState<StyleResponse | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [copied, setCopied] = useState<string | null>(null)

  const handleGenerate = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!scene.trim()) return

    setIsLoading(true)
    setError(null)
    setResult(null)

    try {
      const data = await apiClient.getStyleRules(scene)
      setResult(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to generate style rules')
    } finally {
      setIsLoading(false)
    }
  }

  const copyToClipboard = (text: string, key: string) => {
    navigator.clipboard.writeText(text)
    setCopied(key)
    setTimeout(() => setCopied(null), 2000)
  }

  const handleRetry = () => {
    handleGenerate({ preventDefault: () => {} } as React.FormEvent)
  }

  return (
    <div className="flex flex-col h-screen bg-gradient-to-br from-koola-dark via-black to-koola-dark">
      {/* Header */}
      <div className="bg-koola-purple/30 border-b border-koola-cyan/20 px-6 py-4">
        <div className="flex items-center space-x-3">
          <Palette className="text-koola-cyan" size={28} />
          <div>
            <h1 className="text-3xl font-bold text-koola-cyan">Style Engine</h1>
            <p className="text-gray-400 text-sm mt-1">Generate visual style rules and video prompts</p>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto px-6 py-8">
        <div className="max-w-5xl mx-auto space-y-8">
          {/* Input Section */}
          <div className="bg-koola-purple/20 border border-koola-cyan/30 rounded-xl p-6 shadow-xl">
            <form onSubmit={handleGenerate} className="space-y-4">
              <label className="block text-sm font-medium text-koola-cyan mb-2">
                Describe your scene:
              </label>
              <div className="flex gap-4">
                <textarea
                  value={scene}
                  onChange={(e) => setScene(e.target.value)}
                  placeholder="e.g., A futuristic cyberpunk city street under neon rain..."
                  rows={2}
                  className="flex-1 px-4 py-3 bg-koola-dark border border-koola-cyan/30 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-koola-cyan transition-colors resize-none"
                />
                <button
                  type="submit"
                  disabled={isLoading || !scene.trim()}
                  className="px-6 py-3 bg-koola-cyan text-koola-dark font-bold rounded-lg hover:bg-koola-cyan/80 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex flex-col items-center justify-center space-y-1 min-w-[140px]"
                >
                  <Zap size={20} />
                  <span>Generate</span>
                </button>
              </div>
            </form>
          </div>

          {/* Results Section */}
          <div className="min-h-[400px]">
            {isLoading && (
              <div className="mt-12">
                <LoadingState message="Forging visual aesthetics..." />
              </div>
            )}

            {error && (
              <div className="mt-12">
                <ErrorState error={error} onRetry={handleRetry} />
              </div>
            )}

            {!isLoading && !error && !result && (
              <div className="mt-12">
                <EmptyState
                  message="Provide a scene description to generate style rules and cinematic video prompts."
                  icon={<Palette size={48} className="text-koola-cyan/40 mb-4" />}
                />
              </div>
            )}

            {result && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
                {/* Style Rules */}
                <div className="bg-koola-purple/20 border border-koola-cyan/30 rounded-xl overflow-hidden flex flex-col">
                  <div className="bg-koola-cyan/10 px-6 py-4 border-b border-koola-cyan/30 flex justify-between items-center">
                    <h3 className="text-koola-cyan font-bold uppercase tracking-wider text-sm flex items-center">
                      <Palette size={16} className="mr-2" />
                      Style Rules
                    </h3>
                    <button
                      onClick={() => copyToClipboard(result.styleRules, 'style')}
                      className="text-gray-400 hover:text-koola-cyan transition-colors"
                    >
                      {copied === 'style' ? <CheckCircle2 size={18} className="text-green-400" /> : <Copy size={18} />}
                    </button>
                  </div>
                  <div className="p-6 flex-1 bg-black/40">
                    <pre className="text-gray-300 text-sm whitespace-pre-wrap font-mono leading-relaxed">
                      {result.styleRules}
                    </pre>
                  </div>
                </div>

                {/* Video Prompt */}
                <div className="bg-koola-purple/20 border border-koola-cyan/30 rounded-xl overflow-hidden flex flex-col">
                  <div className="bg-koola-cyan/10 px-6 py-4 border-b border-koola-cyan/30 flex justify-between items-center">
                    <h3 className="text-koola-cyan font-bold uppercase tracking-wider text-sm flex items-center">
                      <Zap size={16} className="mr-2" />
                      Video Prompt
                    </h3>
                    <button
                      onClick={() => copyToClipboard(result.videoPrompt, 'video')}
                      className="text-gray-400 hover:text-koola-cyan transition-colors"
                    >
                      {copied === 'video' ? <CheckCircle2 size={18} className="text-green-400" /> : <Copy size={18} />}
                    </button>
                  </div>
                  <div className="p-6 flex-1 bg-black/40">
                    <p className="text-gray-300 text-sm leading-relaxed italic">
                      "{result.videoPrompt}"
                    </p>
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

export default StyleEngine
