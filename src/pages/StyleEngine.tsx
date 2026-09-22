import React, { useState } from 'react'
import { Palette, Wand2, Copy, Check } from 'lucide-react'
import { apiClient, StyleResponse, friendlyErrorMessage } from '../lib/api'
import LoadingState from '../components/LoadingState'
import ErrorState from '../components/ErrorState'
import EmptyState from '../components/EmptyState'
import ReactMarkdown from 'react-markdown'

const StyleEngine: React.FC = () => {
  const [scene, setScene] = useState('')
  const [result, setResult] = useState<StyleResponse | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)

  const handleGenerate = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!scene.trim() || isLoading) return

    setError(null)
    setIsLoading(true)
    setCopied(false)

    try {
      const response = await apiClient.getStyleRules(scene.trim())
      setResult(response)
    } catch (err) {
      setError(friendlyErrorMessage(err, 'Failed to generate style rules'))
    } finally {
      setIsLoading(false)
    }
  }

  const handleCopy = async () => {
    if (!result?.videoPrompt) return
    try {
      await navigator.clipboard.writeText(result.videoPrompt)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      setCopied(false)
    }
  }

  return (
    <div className="flex flex-col h-full bg-gradient-to-br from-koola-dark via-black to-koola-dark">
      {/* Header */}
      <div className="bg-koola-purple/30 border-b border-koola-cyan/20 px-6 py-4">
        <h1 className="text-3xl font-bold text-koola-cyan">Style Engine</h1>
        <p className="text-gray-400 text-sm mt-1">
          Describe a scene — get back style rules and a video prompt
        </p>
      </div>

      <div className="flex-1 overflow-y-auto px-6 py-6 space-y-6">
        {/* Scene input */}
        <form
          onSubmit={handleGenerate}
          className="p-6 bg-koola-purple/20 border border-koola-cyan/30 rounded-lg space-y-4"
        >
          <label className="block text-sm font-medium text-gray-300">
            Scene description
          </label>
          <textarea
            value={scene}
            onChange={(e) => setScene(e.target.value)}
            placeholder="e.g. The KOOLA10 Diner at 3AM — neon flicker, booth 7 glowing, an Orb hovering over the counter..."
            disabled={isLoading}
            rows={4}
            className="w-full px-4 py-3 bg-koola-dark border border-koola-cyan/30 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-koola-cyan transition-colors disabled:opacity-50 resize-none"
          />
          <button
            type="submit"
            disabled={isLoading || !scene.trim()}
            className="px-6 py-3 bg-koola-cyan text-koola-dark font-semibold rounded-lg hover:bg-koola-cyan/80 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2"
          >
            <Wand2 size={18} />
            <span>{isLoading ? 'Generating...' : 'Generate Style'}</span>
          </button>
        </form>

        {/* States */}
        {isLoading && <LoadingState message="Dreaming up the style..." />}
        {error && <ErrorState error={error} onRetry={() => setError(null)} />}

        {!result && !isLoading && !error && (
          <EmptyState
            message="No style generated yet. Describe a scene above and the Style Engine will return the visual rules and a ready-to-render video prompt."
            icon={<Palette size={48} className="text-koola-cyan/40 mb-4" />}
          />
        )}

        {/* Result */}
        {result && !isLoading && (
          <div className="space-y-4">
            <div className="bg-koola-purple/20 border border-koola-cyan/30 rounded-lg overflow-hidden">
              <div className="px-5 py-3 bg-koola-cyan/10 border-b border-koola-cyan/20">
                <h2 className="font-bold text-koola-cyan">Style Rules</h2>
              </div>
              <div className="px-5 py-4 markdown-content text-sm text-gray-100">
                <ReactMarkdown>{result.styleRules}</ReactMarkdown>
              </div>
            </div>

            <div className="bg-koola-purple/20 border border-koola-cyan/30 rounded-lg overflow-hidden">
              <div className="px-5 py-3 bg-koola-cyan/10 border-b border-koola-cyan/20 flex items-center justify-between">
                <h2 className="font-bold text-koola-cyan">Video Prompt</h2>
                <button
                  onClick={handleCopy}
                  className="flex items-center space-x-2 px-3 py-1.5 text-sm bg-koola-cyan/10 border border-koola-cyan/30 text-koola-cyan rounded-lg hover:bg-koola-cyan/20 transition-colors"
                >
                  {copied ? <Check size={16} /> : <Copy size={16} />}
                  <span>{copied ? 'Copied' : 'Copy'}</span>
                </button>
              </div>
              <div className="px-5 py-4">
                <pre className="whitespace-pre-wrap text-sm text-gray-100 font-mono">
                  {result.videoPrompt}
                </pre>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

export default StyleEngine
