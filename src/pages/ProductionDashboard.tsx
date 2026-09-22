import React, { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import {
  Film,
  MessageSquare,
  BookOpen,
  Palette,
  Video,
  Tv,
  MapPin,
  Zap,
  Calendar,
  ArrowRight,
} from 'lucide-react'
import { apiClient, Episode, friendlyErrorMessage } from '../lib/api'
import LoadingState from '../components/LoadingState'
import ErrorState from '../components/ErrorState'
import EmptyState from '../components/EmptyState'

const quickLinks = [
  { path: '/chat', label: 'Studio Chat', icon: MessageSquare, blurb: 'Talk to Nova about the universe' },
  { path: '/episodes', label: 'Episodes', icon: Film, blurb: 'Manage story episodes' },
  { path: '/lore', label: 'Lore Console', icon: BookOpen, blurb: 'Ask the universe anything' },
  { path: '/style', label: 'Style Engine', icon: Palette, blurb: 'Generate scene style rules' },
  { path: '/video', label: 'Video Orchestrator', icon: Video, blurb: 'Render broadcasts' },
]

const workflowSteps = [
  'Write script in Chat Workspace',
  'Generate master prompt',
  'Create episode in Episodes Manager',
  'Submit to Video Orchestrator',
  'Store assets in Asset Library',
  'Track progress here',
]

const ProductionDashboard: React.FC = () => {
  const [episodes, setEpisodes] = useState<Episode[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

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
      setError(friendlyErrorMessage(err, 'Failed to fetch episodes'))
    } finally {
      setIsLoading(false)
    }
  }

  const stats = [
    { label: 'Episodes', value: episodes.length.toString(), icon: Film },
    { label: 'Spin-off Shows', value: '4', icon: Tv },
    { label: 'Universe Anchors', value: '3', icon: MapPin },
    { label: 'Magic Systems', value: '2', icon: Zap },
  ]

  return (
    <div className="flex flex-col min-h-full bg-gradient-to-br from-koola-dark via-black to-koola-dark">
      {/* Header */}
      <div className="bg-koola-purple/30 border-b border-koola-cyan/20 px-6 py-4">
        <h1 className="text-3xl font-bold text-koola-cyan">Production Dashboard</h1>
        <p className="text-gray-400 text-sm mt-1">
          Mission control for the KOOLA10 universe
        </p>
      </div>

      <div className="flex-1 overflow-y-auto px-6 py-6 space-y-8">
        {/* Stat cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {stats.map(({ label, value, icon: Icon }) => (
            <div
              key={label}
              className="bg-koola-purple/20 border border-koola-cyan/30 rounded-lg p-4 flex items-center space-x-4"
            >
              <div className="p-3 bg-koola-cyan/10 rounded-lg">
                <Icon size={24} className="text-koola-cyan" />
              </div>
              <div>
                <p className="text-2xl font-bold text-white">{value}</p>
                <p className="text-xs text-gray-400">{label}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Quick links */}
        <div>
          <h2 className="text-xl font-bold text-koola-cyan mb-4">Studio Modules</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {quickLinks.map(({ path, label, icon: Icon, blurb }) => (
              <Link
                key={path}
                to={path}
                className="bg-koola-purple/20 border border-koola-cyan/30 rounded-lg p-5 hover:border-koola-cyan/60 hover:shadow-lg hover:shadow-koola-cyan/20 transition-all group"
              >
                <div className="flex items-center justify-between mb-2">
                  <Icon size={24} className="text-koola-cyan" />
                  <ArrowRight
                    size={18}
                    className="text-gray-500 group-hover:text-koola-cyan group-hover:translate-x-1 transition-all"
                  />
                </div>
                <h3 className="text-lg font-bold text-white">{label}</h3>
                <p className="text-sm text-gray-400">{blurb}</p>
              </Link>
            ))}
          </div>
        </div>

        {/* Recent episodes */}
        <div>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-bold text-koola-cyan">Recent Episodes</h2>
            <Link
              to="/episodes"
              className="text-sm text-koola-cyan/80 hover:text-koola-cyan transition-colors"
            >
              View all
            </Link>
          </div>
          {isLoading && <LoadingState message="Loading episodes..." />}
          {error && !isLoading && <ErrorState error={error} onRetry={fetchEpisodes} />}
          {!isLoading && !error && episodes.length === 0 && (
            <EmptyState message="No episodes yet. Head to the Episodes module to create the first broadcast." />
          )}
          {!isLoading && !error && episodes.length > 0 && (
            <div className="space-y-3">
              {episodes.slice(0, 5).map((episode) => (
                <div
                  key={episode.id}
                  className="bg-koola-purple/20 border border-koola-cyan/20 rounded-lg px-5 py-4"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="min-w-0">
                      <h3 className="font-bold text-white truncate">{episode.title}</h3>
                      <p className="text-sm text-gray-400 line-clamp-2">
                        {episode.description}
                      </p>
                    </div>
                    <div className="flex items-center space-x-2 text-xs text-gray-500 shrink-0">
                      <Calendar size={14} />
                      <span>{new Date(episode.createdAt).toLocaleDateString()}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Studio workflow */}
        <div>
          <h2 className="text-xl font-bold text-koola-cyan mb-4">Studio Workflow</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {workflowSteps.map((step, idx) => (
              <div
                key={step}
                className="flex items-center space-x-3 bg-black/40 border border-koola-cyan/20 rounded-lg px-4 py-3"
              >
                <span className="flex items-center justify-center w-8 h-8 rounded-full bg-koola-cyan/20 text-koola-cyan font-bold text-sm shrink-0">
                  {idx + 1}
                </span>
                <p className="text-sm text-gray-300">{step}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

export default ProductionDashboard
