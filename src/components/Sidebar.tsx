import React from 'react'
import { Link, useLocation } from 'react-router-dom'
import { MessageSquare, Film, BookOpen, Palette, Video, BarChart3, Activity } from 'lucide-react'

const Sidebar: React.FC = () => {
  const location = useLocation()

  const isActive = (path: string) => location.pathname === path

  const navItems = [
    { path: '/', label: 'Dashboard', icon: BarChart3 },
    { path: '/chat', label: 'Studio Chat', icon: MessageSquare },
    { path: '/episodes', label: 'Episodes', icon: Film },
    { path: '/lore', label: 'Lore Console', icon: BookOpen },
    { path: '/style', label: 'Style Engine', icon: Palette },
    { path: '/video', label: 'Video Orchestrator', icon: Video },
    { path: '/swarm', label: 'Swarm Ops', icon: Activity },
  ]

  return (
    <div className="w-64 bg-koola-purple border-r border-koola-cyan/20 flex flex-col">
      {/* Header */}
      <div className="p-6 border-b border-koola-cyan/20">
        <h1 className="text-2xl font-bold text-koola-cyan drop-shadow-lg">
          Koola10
        </h1>
        <p className="text-xs text-koola-cyan/60 mt-1">Emergent Studio</p>
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-4 space-y-2">
        {navItems.map(({ path, label, icon: Icon }) => (
          <Link
            key={path}
            to={path}
            className={`flex items-center space-x-3 px-4 py-3 rounded-lg transition-all ${
              isActive(path)
                ? 'bg-koola-cyan/20 text-koola-cyan border border-koola-cyan/50'
                : 'text-gray-300 hover:text-koola-cyan hover:bg-koola-cyan/10'
            }`}
          >
            <Icon size={20} />
            <span className="font-medium">{label}</span>
          </Link>
        ))}
      </nav>

      {/* Footer */}
      <div className="p-4 border-t border-koola-cyan/20 text-center">
        <p className="text-xs text-gray-400">
          Powered by
        </p>
        <p className="text-xs font-semibold text-koola-cyan">Koola10 Agent</p>
      </div>
    </div>
  )
}

export default Sidebar
