import React, { useState, useEffect } from 'react';
import Portal from '../components/Portal';
import Orb from '../components/Orb';
import BroadcastTicker from '../components/BroadcastTicker';
import { X } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const TVAmbient: React.FC = () => {
  const [activePortal, setActivePortal] = useState<'booth-3' | 'booth-7' | null>(null);
  const [showExit, setShowExit] = useState(false);
  const navigate = useNavigate();

  // Fullscreen on mount
  useEffect(() => {
    if (document.documentElement.requestFullscreen) {
      document.documentElement.requestFullscreen().catch(() => {});
    }
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = 'auto';
    };
  }, []);

  // Simulate portal activation every 3 minutes
  useEffect(() => {
    const interval = setInterval(() => {
      const chosen = Math.random() > 0.5 ? 'booth-3' : 'booth-7';
      setActivePortal(chosen);

      // Fade back after 30 seconds
      setTimeout(() => {
        setActivePortal(null);
      }, 30000);
    }, 180000);

    return () => clearInterval(interval);
  }, []);

  const handleExit = () => {
    if (document.fullscreenElement) {
      document.exitFullscreen();
    }
    navigate('/');
  };

  return (
    <div
      className="relative w-full h-screen overflow-hidden diner-breathe-effect flex flex-col items-center justify-center bg-[#0B0A1A]"
      onMouseMove={() => {
        setShowExit(true);
        setTimeout(() => setShowExit(false), 3000);
      }}
    >
      <div className="neon-grid opacity-40"></div>

      {/* Orbs floating slowly */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <div className="animate-orb-float-1 absolute left-1/4 top-1/4">
          <Orb id="orb-1" personality="Encourager" color="#FBBF24" />
        </div>
        <div className="animate-orb-float-2 absolute right-1/4 top-1/2">
          <Orb id="orb-2" personality="Cynic" color="#A855F7" />
        </div>
        <div className="animate-orb-float-3 absolute left-1/2 top-2/3">
          <Orb id="orb-3" personality="Watcher" color="#FFFFFF" />
        </div>
      </div>

      {/* Portals at 40% scale, centered */}
      <div className="z-10 flex gap-32 items-center justify-center transform scale-[0.4] transition-all duration-1000">
        <div className={`${activePortal === 'booth-3' ? 'scale-150 drop-shadow-[0_0_50px_#00F0FF]' : ''} transition-all duration-1000`}>
          <Portal
            id="booth-3"
            type="stable"
            label="Booth 3"
            color="#00F0FF"
          />
        </div>

        <div className="flex flex-col items-center">
          <h1 className="text-8xl font-bold text-koola-cyan drop-shadow-[0_0_30px_rgba(0,240,255,0.8)] tracking-tighter">
            KOOLA10
          </h1>
          <p className="text-xl text-koola-cyan/60 tracking-[1em] text-center mt-4">AMBIENT MODE</p>
        </div>

        <div className={`${activePortal === 'booth-7' ? 'scale-150 drop-shadow-[0_0_50px_#A855F7]' : ''} transition-all duration-1000`}>
          <Portal
            id="booth-7"
            type="glitched"
            label="Booth 7"
            color="#A855F7"
          />
        </div>
      </div>

      {/* Auto-cycling Broadcast Ticker */}
      <div className="absolute bottom-10 w-full">
        <BroadcastTicker />
      </div>

      {/* Exit Button */}
      <button
        onClick={handleExit}
        className={`fixed bottom-6 right-6 p-4 bg-white/10 hover:bg-white/20 border border-white/20 rounded-full transition-opacity duration-500 z-50 ${showExit ? 'opacity-100' : 'opacity-0'}`}
      >
        <X className="text-white" size={24} />
      </button>

      <style dangerouslySetInnerHTML={{ __html: `
        @keyframes orb-float-1 {
          0%, 100% { transform: translate(0, 0); }
          33% { transform: translate(50px, -30px); }
          66% { transform: translate(-20px, 40px); }
        }
        @keyframes orb-float-2 {
          0%, 100% { transform: translate(0, 0); }
          33% { transform: translate(-40px, 50px); }
          66% { transform: translate(30px, -20px); }
        }
        @keyframes orb-float-3 {
          0%, 100% { transform: translate(0, 0); }
          33% { transform: translate(20px, 20px); }
          66% { transform: translate(-30px, -40px); }
        }
        .animate-orb-float-1 { animation: orb-float-1 20s ease-in-out infinite; }
        .animate-orb-float-2 { animation: orb-float-2 25s ease-in-out infinite; }
        .animate-orb-float-3 { animation: orb-float-3 18s ease-in-out infinite; }

        .diner-breathe-effect {
          animation: diner-breathe 8s ease-in-out infinite;
        }
        @keyframes diner-breathe {
          0%, 100% { background-color: #0B0A1A; transform: scale(1); }
          50% { background-color: #0E0D24; transform: scale(1.01); }
        }
      `}} />
    </div>
  );
};

export default TVAmbient;
