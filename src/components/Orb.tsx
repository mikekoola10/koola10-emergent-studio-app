import React, { useState, useEffect } from 'react';
import { apiClient } from '../lib/api';

interface OrbProps {
  id: string;
  personality: 'Encourager' | 'Cynic' | 'Watcher';
  color: string;
}

const Orb: React.FC<OrbProps> = ({ id, personality, color }) => {
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [isVisible, setIsVisible] = useState(true);
  const [message, setMessage] = useState<string | null>(null);
  const [isHovered, setIsHovered] = useState(false);

  useEffect(() => {
    if (personality === 'Watcher') {
      setIsVisible(Math.random() > 0.7);
    }

    const setRandomPosition = () => {
      const x = Math.random() * 80 - 40; // -40 to 40
      const y = Math.random() * 80 - 40; // -40 to 40
      setPosition({ x, y });
    };

    setRandomPosition();
    const interval = setInterval(setRandomPosition, 5000 + Math.random() * 5000);
    return () => clearInterval(interval);
  }, [personality]);

  const handleClick = async () => {
    try {
      const response = await apiClient.getLoreAnswer(`As the ${personality} Orb in the Koola10 Diner, give me a personality-driven message.`);
      setMessage(response.answer || (response as any).response);
      setTimeout(() => setMessage(null), 8000);
    } catch (error) {
      console.error('Failed to fetch Orb lore:', error);
      const fallbacks = {
        Encourager: "You're doing great, keep going!",
        Cynic: "Is this the best you can do? Really?",
        Watcher: "..."
      };
      setMessage(fallbacks[personality]);
    }
  };

  if (!isVisible) return null;

  const basePositionClass = {
    Encourager: 'top-[20%] left-[20%]',
    Cynic: 'top-[20%] right-[20%]',
    Watcher: ''
  }[personality];

  // For Watcher, we use truly random screen position if personality is Watcher
  const style: React.CSSProperties = {
    transform: `translate(${position.x}px, ${position.y}px)`,
    boxShadow: `0 0 20px 5px ${color}`,
    transition: 'transform 5s ease-in-out, opacity 0.5s',
    backgroundColor: color,
    ...(personality === 'Watcher' && {
      top: `${Math.random() * 80 + 10}%`,
      left: `${Math.random() * 80 + 10}%`
    })
  };

  return (
    <div
      className={`fixed z-20 w-6 h-6 md:w-8 md:h-8 rounded-full cursor-pointer hover:scale-125 transition-transform duration-300 ${basePositionClass}`}
      data-testid={`orb-${personality}`}
      style={style}
      onClick={handleClick}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* Orb Message Bubble */}
      {(message || isHovered) && (
        <div className="absolute bottom-full mb-4 left-1/2 -translate-x-1/2 w-48 p-2 bg-black/80 border border-white/20 rounded-lg backdrop-blur-md text-[10px] text-center text-white z-30 pointer-events-none">
          <div className="font-bold mb-1 uppercase tracking-widest" style={{ color }}>{personality}</div>
          {message || `The ${personality} is watching.`}
        </div>
      )}

      {/* Inner Glow */}
      <div className="absolute inset-0 rounded-full animate-ping opacity-20" style={{ backgroundColor: color }}></div>
    </div>
  );
};

export default Orb;
