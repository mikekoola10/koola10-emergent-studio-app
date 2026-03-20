import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { MessageSquare, Film, Video, Image, BarChart3, LogOut } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

const Sidebar = () => {
  const location = useLocation();
  const { logout } = useAuth();

  const menuItems = [
    { path: '/chat', icon: MessageSquare, label: 'Chat Workspace' },
    { path: '/episodes', icon: Film, label: 'Episodes' },
    { path: '/orchestrator', icon: Video, label: 'Orchestrator' },
    { path: '/assets', icon: Image, label: 'Assets' },
    { path: '/dashboard', icon: BarChart3, label: 'Dashboard' },
  ];

  return (
    <div className="w-64 bg-gray-900 text-white h-screen flex flex-col" data-testid="sidebar">
      <div className="p-6 border-b border-gray-800">
        <h1 className="text-2xl font-bold bg-gradient-to-r from-purple-400 to-pink-600 bg-clip-text text-transparent">
          KOOLA10
        </h1>
        <p className="text-xs text-gray-400 mt-1">Emergent Studio</p>
      </div>

      <nav className="flex-1 p-4 space-y-2">
        {menuItems.map((item) => {
          const Icon = item.icon;
          const isActive = location.pathname === item.path;

          return (
            <Link
              key={item.path}
              to={item.path}
              data-testid={`nav-${item.label.toLowerCase().replace(' ', '-')}`}
              className={`flex items-center space-x-3 px-4 py-3 rounded-lg transition-all ${
                isActive
                  ? 'bg-purple-600 text-white'
                  : 'text-gray-400 hover:bg-gray-800 hover:text-white'
              }`}
            >
              <Icon size={20} />
              <span>{item.label}</span>
            </Link>
          );
        })}
      </nav>

      <div className="p-4 border-t border-gray-800">
        <button
          onClick={logout}
          data-testid="logout-button"
          className="flex items-center space-x-3 px-4 py-3 w-full text-gray-400 hover:bg-gray-800 hover:text-white rounded-lg transition-all"
        >
          <LogOut size={20} />
          <span>Logout</span>
        </button>
      </div>
    </div>
  );
};

export default Sidebar;
