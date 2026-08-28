import React, { useState, useEffect } from 'react'
import { BarChart3, Film, Video, MessageSquare, Plus, ArrowRight, Calendar } from 'lucide-react'
import { Link } from 'react-router-dom'
import { apiClient, Episode } from '../lib/api'
import LoadingState from '../components/LoadingState'
import ErrorState from '../components/ErrorState'
import EmptyState from '../components/EmptyState'

const ProductionDashboard: React.FC = () => {
  const [episodes, setEpisodes] = useState<Episode[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetchData()
  }, [])

  const fetchData = async () => {
    setIsLoading(true)
    setError(null)
    try {
      const episodesData = await apiClient.getEpisodes()
      setEpisodes(episodesData)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load dashboard data')
    } finally {
      setIsLoading(false)
    }
  }

  if (isLoading) return <div className="h-screen"><LoadingState message="Initializing dashboard..." /></div>
  if (error) return <div className="h-screen"><ErrorState error={error} onRetry={fetchData} /></div>

  const stats = [
    { label: 'Total Episodes', value: episodes.length, icon: Film, color: 'text-koola-cyan' },
    { label: 'Active Video Jobs', value: 0, icon: Video, color: 'text-purple-400' },
    { label: 'Chat Sessions', value: 'Live', icon: MessageSquare, color: 'text-green-400' },
  ]

  return (
    <div className="flex flex-col min-h-screen bg-gradient-to-br from-koola-dark via-black to-koola-dark p-8">
      {/* Header */}
      <header className="mb-10">
        <h1 className="text-4xl font-bold text-white mb-2 flex items-center">
          <BarChart3 className="mr-4 text-koola-cyan" size={36} />
          Production Dashboard
        </h1>
        <p className="text-gray-400">Overview of your emergent studio's creative output.</p>
      </header>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
        {stats.map((stat, idx) => (
          <div key={idx} className="bg-koola-purple/20 border border-koola-cyan/20 rounded-xl p-6 shadow-lg hover:border-koola-cyan/40 transition-all">
            <div className="flex items-center justify-between mb-4">
              <stat.icon className={stat.color} size={24} />
              <span className="text-xs font-bold text-gray-500 uppercase tracking-widest">Live Status</span>
            </div>
            <p className="text-3xl font-bold text-white">{stat.value}</p>
            <p className="text-sm text-gray-400 mt-1">{stat.label}</p>
          </div>
        ))}
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">

        {/* Recent Episodes */}
        <div className="lg:col-span-2 space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-bold text-white flex items-center">
              <Film size={20} className="mr-2 text-koola-cyan" />
              Recent Episodes
            </h2>
            <Link to="/episodes" className="text-koola-cyan text-sm hover:underline flex items-center">
              View all <ArrowRight size={14} className="ml-1" />
            </Link>
          </div>

          <div className="space-y-4">
            {episodes.length === 0 ? (
              <div className="bg-koola-purple/10 border border-dashed border-koola-cyan/20 rounded-xl p-8">
                <EmptyState message="No episodes found. Create your first one to see it here." />
                <div className="flex justify-center mt-4">
                  <Link to="/episodes" className="bg-koola-cyan text-koola-dark px-4 py-2 rounded-lg font-bold text-sm flex items-center">
                    <Plus size={16} className="mr-1" /> New Episode
                  </Link>
                </div>
              </div>
            ) : (
              episodes.slice(0, 3).map((episode) => (
                <div key={episode.id} className="bg-koola-purple/20 border border-koola-cyan/20 rounded-xl p-5 flex items-center justify-between hover:bg-koola-cyan/5 transition-colors group">
                  <div className="flex-1 min-w-0 pr-4">
                    <h3 className="text-white font-semibold truncate group-hover:text-koola-cyan transition-colors">{episode.title}</h3>
                    <div className="flex items-center text-xs text-gray-500 mt-1 space-x-4">
                      <span className="flex items-center"><Calendar size={12} className="mr-1" /> {new Date(episode.createdAt).toLocaleDateString()}</span>
                      {episode.status && <span className="text-koola-cyan/80">{episode.status}</span>}
                    </div>
                  </div>
                  <Link to="/episodes" className="p-2 rounded-full bg-koola-dark border border-koola-cyan/20 text-gray-400 hover:text-koola-cyan hover:border-koola-cyan transition-all">
                    <ArrowRight size={18} />
                  </Link>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Quick Actions / System Health */}
        <div className="space-y-6">
          <h2 className="text-xl font-bold text-white flex items-center">
            <Plus size={20} className="mr-2 text-koola-cyan" />
            Quick Access
          </h2>
          <div className="grid grid-cols-1 gap-4">
            <Link to="/chat" className="bg-koola-cyan/10 border border-koola-cyan/30 rounded-xl p-4 flex items-center space-x-4 hover:bg-koola-cyan/20 transition-all">
              <div className="w-10 h-10 rounded-lg bg-koola-cyan/20 flex items-center justify-center text-koola-cyan">
                <MessageSquare size={20} />
              </div>
              <div>
                <p className="text-white font-medium">Studio Chat</p>
                <p className="text-xs text-gray-400">Consult the AI</p>
              </div>
            </Link>
            <Link to="/lore" className="bg-purple-500/10 border border-purple-500/30 rounded-xl p-4 flex items-center space-x-4 hover:bg-purple-500/20 transition-all">
              <div className="w-10 h-10 rounded-lg bg-purple-500/20 flex items-center justify-center text-purple-400">
                <Video size={20} />
              </div>
              <div>
                <p className="text-white font-medium">Lore Console</p>
                <p className="text-xs text-gray-400">Manage universe lore</p>
              </div>
            </Link>
            <Link to="/video" className="bg-pink-500/10 border border-pink-500/30 rounded-xl p-4 flex items-center space-x-4 hover:bg-pink-500/20 transition-all">
              <div className="w-10 h-10 rounded-lg bg-pink-500/20 flex items-center justify-center text-pink-400">
                <Video size={20} />
              </div>
              <div>
                <p className="text-white font-medium">Video Engine</p>
                <p className="text-xs text-gray-400">Start new jobs</p>
              </div>
            </Link>
          </div>
        </div>

      </div>
    </div>
  )
}

export default ProductionDashboard
