import React from 'react';
import { useAuth } from '../context/AuthContext';

const Header = ({ title, subtitle }) => {
  const { user } = useAuth();

  return (
    <div className="bg-white border-b border-gray-200 px-8 py-6" data-testid="header">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-3xl font-bold text-gray-900">{title}</h2>
          {subtitle && <p className="text-gray-600 mt-1">{subtitle}</p>}
        </div>
        <div className="flex items-center space-x-4">
          <div className="text-right">
            <p className="text-sm text-gray-600">Logged in as</p>
            <p className="text-sm font-semibold text-gray-900" data-testid="user-email">{user?.email}</p>
          </div>
          <div className="w-10 h-10 bg-gradient-to-r from-purple-400 to-pink-600 rounded-full flex items-center justify-center text-white font-bold">
            {user?.username?.[0]?.toUpperCase() || 'U'}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Header;
