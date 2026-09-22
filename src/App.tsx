import React from 'react'
import { BrowserRouter as Router, Routes, Route, NavLink } from 'react-router-dom'
import {
  MessageSquare,
  Film,
  BookOpen,
  Palette,
  Video,
  BarChart3,
} from 'lucide-react'
import Sidebar from './components/Sidebar'
import StudioChat from './pages/StudioChat'
import Episodes from './pages/Episodes'
import LoreConsole from './pages/LoreConsole'
import StyleEngine from './pages/StyleEngine'
import VideoOrchestrator from './pages/VideoOrchestrator'
import ProductionDashboard from './pages/ProductionDashboard'

const navItems = [
  { path: '/', label: 'Dashboard', icon: BarChart3 },
  { path: '/chat', label: 'Chat', icon: MessageSquare },
  { path: '/episodes', label: 'Episodes', icon: Film },
  { path: '/lore', label: 'Lore', icon: BookOpen },
  { path: '/style', label: 'Style', icon: Palette },
  { path: '/video', label: 'Video', icon: Video },
]

function App() {
  return (
    <Router>
      <div className="flex h-screen bg-gradient-to-br from-koola-dark via-black to-koola-dark overflow-hidden">
        <Sidebar />
        <div className="flex-1 flex flex-col min-w-0 min-h-0">
          {/* Mobile top bar (sidebar is hidden on small screens) */}
          <div className="md:hidden shrink-0 border-b border-koola-cyan/20 bg-koola-purple/40 px-4 pt-3 pb-2">
            <h1 className="text-lg font-bold text-koola-cyan">
              Koola10{' '}
              <span className="text-xs font-normal text-koola-cyan/60">
                Emergent Studio
              </span>
            </h1>
            <nav className="flex gap-1 overflow-x-auto mt-2 -mx-1 px-1">
              {navItems.map(({ path, label, icon: Icon }) => (
                <NavLink
                  key={path}
                  to={path}
                  end={path === '/'}
                  className={({ isActive }) =>
                    `flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm whitespace-nowrap transition-colors ${
                      isActive
                        ? 'bg-koola-cyan/20 text-koola-cyan'
                        : 'text-gray-400 hover:text-koola-cyan'
                    }`
                  }
                >
                  <Icon size={16} />
                  <span>{label}</span>
                </NavLink>
              ))}
            </nav>
          </div>

          <main className="flex-1 min-h-0 overflow-y-auto">
            <Routes>
              <Route path="/" element={<ProductionDashboard />} />
              <Route path="/chat" element={<StudioChat />} />
              <Route path="/episodes" element={<Episodes />} />
              <Route path="/lore" element={<LoreConsole />} />
              <Route path="/style" element={<StyleEngine />} />
              <Route path="/video" element={<VideoOrchestrator />} />
            </Routes>
          </main>
        </div>
      </div>
    </Router>
  )
}

export default App
