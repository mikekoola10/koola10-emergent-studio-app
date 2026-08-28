import React, { useState } from 'react';
import { apiClient } from '../lib/api';

interface PortalProps {
  id: string;
  type: 'stable' | 'glitched';
  label: string;
  color: string;
}

const Portal: React.FC<PortalProps> = ({ id, type, label, color }) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [isBattleActive, setIsBattleActive] = useState(false);
  const [lore, setLore] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleClick = async () => {
    if (type === 'stable') {
      setIsExpanded(!isExpanded);
    } else {
      // Glitched fractures open
      setIsExpanded(!isExpanded);
    }

    setIsLoading(true);
    try {
      const response = await apiClient.getLoreAnswer(`Activate ${label} in the Diner`);
      setLore(response.answer || (response as any).response);
    } catch (error) {
      console.error('Failed to fetch lore:', error);
      setLore("The portal hums with an indecipherable frequency...");
    } finally {
      setIsLoading(false);
    }
  };

  const handleDoubleClick = () => {
    if (type === 'stable') {
      setIsBattleActive(true);
      setTimeout(() => setIsBattleActive(false), 5000);
    } else {
      // Partially stabilize
      setIsExpanded(false);
    }
  };

  const portalBaseClass = type === 'stable'
    ? 'border-koola-cyan shadow-[0_0_15px_rgba(0,240,255,0.5)] animate-pulse'
    : 'border-purple-500 shadow-[0_0_15px_rgba(168,85,247,0.5)] animate-flicker';

  const glitchedStyle = type === 'glitched' ? {
    clipPath: isExpanded
      ? 'polygon(0% 0%, 100% 0%, 100% 100%, 0% 100%)'
      : 'polygon(5% 5%, 95% 2%, 92% 95%, 8% 90%, 2% 50%)'
  } : {};

  return (
    <div
      className={`relative group cursor-pointer transition-all duration-500 transform ${isExpanded ? 'scale-110' : 'scale-100'}`}
      onClick={handleClick}
      onDoubleClick={handleDoubleClick}
    >
      <div
        className={`w-48 h-64 md:w-64 md:h-80 border-4 rounded-xl flex flex-col items-center justify-center bg-black/40 backdrop-blur-sm overflow-hidden ${portalBaseClass}`}
        style={glitchedStyle}
      >
        <div className={`text-2xl font-bold mb-2 ${type === 'stable' ? 'text-koola-cyan' : 'text-purple-400'}`}>
          {label}
        </div>

        {isLoading ? (
          <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-white"></div>
        ) : (
          <div className="px-4 text-center text-sm text-gray-300">
            {isBattleActive ? (
              <div className="text-red-500 font-black animate-bounce">[ BATTLE SCENE ACTIVE ]</div>
            ) : (
              lore || (isExpanded ? "Portal Expanded" : "Click to Activate")
            )}
          </div>
        )}

        {isExpanded && type === 'stable' && (
          <div className="absolute inset-0 border-8 border-koola-cyan/30 rounded-full animate-ping pointer-events-none"></div>
        )}
      </div>

      {/* Portal Label */}
      <div className="mt-4 text-center">
        <span className={`px-3 py-1 rounded-full text-xs font-bold border ${type === 'stable' ? 'border-koola-cyan text-koola-cyan' : 'border-purple-500 text-purple-400'}`}>
          {type.toUpperCase()}
        </span>
      </div>
    </div>
  );
};

export default Portal;
