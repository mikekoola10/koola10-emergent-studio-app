import React, { useState, useEffect } from 'react'
import { Plus, Calendar, Trash2 } from 'lucide-react'
import { apiClient, Episode } from '../lib/api'
import LoadingState from '../components/LoadingState'
import ErrorState from '../components/ErrorState'
import EmptyState from '../components/EmptyState'

const Episodes: React.FC = () => {
  const [episodes, setEpisodes] = useState<Episode[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [showForm, setShowForm] = useState(false)
  const [formData, setFormData] = useState({ title: '', description: '' })
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)

  useEffect(() => {
    fetchEpisodes()
  }, [])

  const fetchEpisodes = async () => {
    setIsLoading(true)
    setError(null)
    try {
      const data = await apiClient.getEpisodes()
      setEpisodes(data)
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'Failed to fetch episodes'
      )
    } finally {
      setIsLoading(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setFormError(null)

    if (!formData.title.trim() || !formData.description.trim()) {
      setFormError('Please fill in all fields')
      return
    }

    setIsSubmitting(true)
    try {
      const newEpisode = await apiClient.createEpisode({
        title: formData.title,
        description: formData.description,
      })
      setEpisodes([newEpisode, ...episodes])
      setFormData({ title: '', description: '' })
      setShowForm(false)
    } catch (err) {
      setFormError(
        err instanceof Error ? err.message : 'Failed to create episode'
      )
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleRetry = () => {
    fetchEpisodes()
  }

  return (
    <div className="flex flex-col h-screen bg-gradient-to-br from-koola-dark via-black to-koola-dark">
      {/* Header */}
      <div className="bg-koola-purple/30 border-b border-koola-cyan/20 px-6 py-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-koola-cyan">Episodes</h1>
            <p className="text-gray-400 text-sm mt-1">View and manage your story episodes</p>
          </div>
          <button
            onClick={() => setShowForm(!showForm)}
            className="flex items-center space-x-2 px-4 py-2 bg-koola-cyan text-koola-dark font-semibold rounded-lg hover:bg-koola-cyan/80 transition-colors"
          >
            <Plus size={20} />
            <span>New Episode</span>
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto px-6 py-6">
        {/* Create Episode Form */}
        {showForm && (
          <div className="mb-6 p-6 bg-koola-purple/20 border border-koola-cyan/30 rounded-lg">
            <h2 className="text-xl font-bold text-koola-cyan mb-4">Create New Episode</h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Title
                </label>
                <input
                  type="text"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  placeholder="Enter episode title"
                  disabled={isSubmitting}
                  className="w-full px-4 py-2 bg-koola-dark border border-koola-cyan/30 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-koola-cyan transition-colors disabled:opacity-50"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Description
                </label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Enter episode description"
                  disabled={isSubmitting}
                  rows={4}
                  className="w-full px-4 py-2 bg-koola-dark border border-koola-cyan/30 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-koola-cyan transition-colors disabled:opacity-50 resize-none"
                />
              </div>
              {formError && (
                <div className="p-3 bg-red-500/20 border border-red-500/50 rounded-lg text-red-400 text-sm">
                  {formError}
                </div>
              )}
              <div className="flex gap-3">
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-6 py-2 bg-koola-cyan text-koola-dark font-semibold rounded-lg hover:bg-koola-cyan/80 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isSubmitting ? 'Creating...' : 'Create Episode'}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowForm(false)
                    setFormData({ title: '', description: '' })
                    setFormError(null)
                  }}
                  disabled={isSubmitting}
                  className="px-6 py-2 bg-gray-600 text-white font-semibold rounded-lg hover:bg-gray-700 transition-colors disabled:opacity-50"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Loading State */}
        {isLoading && <LoadingState message="Loading episodes..." />}

        {/* Error State */}
        {error && !isLoading && <ErrorState error={error} onRetry={handleRetry} />}

        {/* Empty State */}
        {!isLoading && !error && episodes.length === 0 && (
          <EmptyState message="No episodes yet. Create your first episode to get started." />
        )}

        {/* Episodes Grid */}
        {!isLoading && !error && episodes.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {episodes.map((episode) => (
              <div
                key={episode.id}
                className="bg-koola-purple/20 border border-koola-cyan/30 rounded-lg p-6 hover:border-koola-cyan/60 transition-all hover:shadow-lg hover:shadow-koola-cyan/20"
              >
                <h3 className="text-lg font-bold text-koola-cyan mb-2 line-clamp-2">
                  {episode.title}
                </h3>
                <p className="text-gray-400 text-sm mb-4 line-clamp-3">
                  {episode.description}
                </p>
                <div className="flex items-center justify-between pt-4 border-t border-koola-cyan/20">
                  <div className="flex items-center space-x-2 text-xs text-gray-500">
                    <Calendar size={14} />
                    <span>
                      {new Date(episode.createdAt).toLocaleDateString()}
                    </span>
                  </div>
                  {episode.status && (
                    <span className="px-2 py-1 bg-koola-cyan/20 text-koola-cyan text-xs rounded">
                      {episode.status}
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

export default Episodes
