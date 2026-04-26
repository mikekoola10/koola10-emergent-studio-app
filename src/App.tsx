import React from 'react'
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom'
import Sidebar from './components/Sidebar'
import StudioChat from './pages/StudioChat'
import Episodes from './pages/Episodes'
import LoreConsole from './pages/LoreConsole'
import StyleEngine from './pages/StyleEngine'
import VideoOrchestrator from './pages/VideoOrchestrator'
import ProductionDashboard from './pages/ProductionDashboard'

function App() {
  return (
    <Router>
      <div className="flex min-h-screen bg-gradient-to-br from-koola-dark via-black to-koola-dark">
        <Sidebar />
        <main className="flex-1 overflow-auto">
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
    </Router>
  )
}

export default App
