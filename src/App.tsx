import React from 'react'
import { BrowserRouter as Router, Routes, Route, useLocation } from 'react-router-dom'
import Sidebar from './components/Sidebar'
import StudioChat from './pages/StudioChat'
import Episodes from './pages/Episodes'
import LoreConsole from './pages/LoreConsole'
import StyleEngine from './pages/StyleEngine'
import VideoOrchestrator from './pages/VideoOrchestrator'
import ProductionDashboard from './pages/ProductionDashboard'
import Diner from './pages/Diner'
import TVPlaceholder from './pages/TVPlaceholder'

const AppContent: React.FC = () => {
  const location = useLocation();
  const isDinerPage = location.pathname === '/';
  const isTVPage = location.pathname === '/tv';
  const isFullScreen = isDinerPage || isTVPage;

  return (
    <div className="flex min-h-screen bg-gradient-to-br from-koola-dark via-black to-koola-dark">
      {!isFullScreen && <Sidebar />}
      <main className={`flex-1 overflow-auto ${isFullScreen ? 'w-full' : ''}`}>
        <Routes>
          <Route path="/" element={<Diner />} />
          <Route path="/dashboard" element={<ProductionDashboard />} />
          <Route path="/chat" element={<StudioChat />} />
          <Route path="/episodes" element={<Episodes />} />
          <Route path="/lore" element={<LoreConsole />} />
          <Route path="/style" element={<StyleEngine />} />
          <Route path="/video" element={<VideoOrchestrator />} />
          <Route path="/tv" element={<TVPlaceholder />} />
        </Routes>
      </main>
    </div>
  );
};

function App() {
  return (
    <Router>
      <AppContent />
    </Router>
  )
}

export default App
