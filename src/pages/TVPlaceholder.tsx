import React from 'react';

const TVPlaceholder: React.FC = () => {
  return (
    <div className="w-full h-screen bg-black flex items-center justify-center">
      <div className="text-center">
        <div className="w-64 h-48 border-4 border-gray-800 bg-gray-900 rounded-lg mb-4 flex items-center justify-center overflow-hidden">
          <div className="w-full h-full bg-[url('https://media.giphy.com/media/oEI9uWUicGLe9s66Hh/giphy.gif')] bg-cover opacity-30"></div>
        </div>
        <h2 className="text-koola-cyan font-mono animate-pulse">AUTO-CYCLING TV EXPERIENCE COMING SOON</h2>
      </div>
    </div>
  );
};

export default TVPlaceholder;
