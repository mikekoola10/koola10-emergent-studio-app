import React, { useState, useEffect, useRef } from 'react';
import { apiClient } from '../lib/api';
import { Terminal, Zap, ShieldAlert, Cpu } from 'lucide-react';

const PortalWatch: React.FC = () => {
  const [activeBooth, setActiveBooth] = useState<'booth3' | 'booth7' | null>(null);
  const [broadcastLog, setBroadcastLog] = useState<string[]>(['[SYSTEM]: Portal Watch initialized.', '[SYSTEM]: Awaiting contestant entry...']);
  const [orb1Message, setOrb1Message] = useState('Watching...');
  const [orb2Message, setOrb2Message] = useState('Waiting...');
  const logEndRef = useRef<HTMLDivElement>(null);

  const addLog = (msg: string) => {
    setBroadcastLog(prev => [...prev.slice(-19), `[${new Date().toLocaleTimeString()}]: ${msg}`]);
  };

  const handleBoothClick = async (booth: 'booth3' | 'booth7') => {
    setActiveBooth(booth);

    if (booth === 'booth3') {
      addLog('Booth 3 Portal Activated. Stability: 98%.');
      setOrb1Message('Praising: "An exemplary entrance."');
      try {
        const lore = await apiClient.getLoreAnswer("What do the Orb judges see when a contestant enters?");
        setOrb1Message(`Praising: "${lore.response.slice(0, 100)}..."`);
        addLog(`Orb 1 Insight: ${lore.response.slice(0, 80)}...`);
      } catch (e) {
        addLog('Error fetching Orb 1 insight.');
      }
    } else {
      addLog('Booth 7 Portal Activated. WARNING: Temporal instability detected!');
      setOrb2Message('Warning: "Spatial fracture imminent!"');
      try {
        const lore = await apiClient.getLoreAnswer("Describe the Diner during an active portal battle");
        setOrb2Message(`Warning: "${lore.response.slice(0, 100)}..."`);
        addLog(`Orb 2 Insight: ${lore.response.slice(0, 80)}...`);
      } catch (e) {
        addLog('Error fetching Orb 2 insight.');
      }
    }
  };

  useEffect(() => {
    logEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [broadcastLog]);

  return (
    <div className="relative min-h-screen w-full bg-koola-dark overflow-hidden font-mono text-gray-300 animate-ambient-pulse">
      {/* Background Hum/Vibe */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(45,27,105,0.2)_0%,rgba(10,14,39,1)_100%)]" />

      {/* HUD Overlays */}
      <div className="absolute top-8 left-8 flex flex-col space-y-2 z-20">
        <div className="flex items-center space-x-2 text-koola-cyan">
          <Cpu size={16} className="animate-pulse" />
          <span className="text-xs font-bold tracking-widest uppercase">Scanner Active</span>
        </div>
        <div className="text-[10px] text-koola-cyan/40">LAT: 40.7128 N | LONG: 74.0060 W</div>
      </div>

      <div className="absolute top-8 right-8 text-right z-20">
        <div className="text-xs text-amber-500 font-bold uppercase">Emergency Protocol</div>
        <div className="text-[10px] text-amber-500/60">STATUS: STANDBY</div>
      </div>

      {/* Main Arena */}
      <div className="relative h-screen w-full flex items-center justify-center space-x-24 px-12">

        {/* Booth 3 Zone */}
        <div className="flex flex-col items-center space-y-8">
          <div
            onClick={() => handleBoothClick('booth3')}
            className={`group relative w-64 h-96 border-2 transition-all cursor-pointer overflow-hidden
              ${activeBooth === 'booth3' ? 'border-koola-cyan shadow-[0_0_50px_rgba(0,240,255,0.5)]' : 'border-koola-cyan/20 hover:border-koola-cyan/60'}`}
          >
            <div className="absolute inset-0 flex items-center justify-center bg-black/40">
              <span className={`text-xl font-bold tracking-[0.5em] transition-opacity ${activeBooth === 'booth3' ? 'opacity-0' : 'opacity-100'}`}>BOOTH 3</span>
            </div>
            {activeBooth === 'booth3' && (
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="w-48 h-48 rounded-full border-4 border-koola-cyan animate-portal-cyan shadow-[0_0_80px_rgba(0,240,255,0.8)]" />
                <div className="absolute w-full h-full animate-particles-cyan opacity-50 bg-[radial-gradient(circle,rgba(0,240,255,0.2)_0%,transparent_70%)]" />
              </div>
            )}
          </div>

          {/* Orb 1 */}
          <div className="relative">
             <div className={`w-12 h-12 rounded-full border-2 border-green-500/50 bg-green-500/20 animate-float flex items-center justify-center
               ${activeBooth === 'booth3' ? 'animate-pulse-green' : ''}`}>
               <ShieldAlert size={16} className="text-green-400" />
             </div>
             <div className="absolute top-14 -left-20 w-52 text-center bg-black/80 border border-green-500/30 p-2 rounded text-[10px] text-green-400 shadow-lg">
                {orb1Message}
             </div>
          </div>
        </div>

        {/* Booth 7 Zone */}
        <div className="flex flex-col items-center space-y-8">
          <div
            onClick={() => handleBoothClick('booth7')}
            className={`group relative w-64 h-96 border-2 transition-all cursor-pointer overflow-hidden
              ${activeBooth === 'booth7' ? 'border-koola-purple shadow-[0_0_50px_rgba(45,27,105,0.5)]' : 'border-koola-purple/20 hover:border-koola-purple/60'}`}
          >
            <div className="absolute inset-0 flex items-center justify-center bg-black/40">
              <span className={`text-xl font-bold tracking-[0.5em] transition-opacity ${activeBooth === 'booth7' ? 'opacity-0' : 'opacity-100'}`}>BOOTH 7</span>
            </div>
            {activeBooth === 'booth7' && (
              <div className="absolute inset-0 flex items-center justify-center">
                 <div className="absolute inset-0 animate-glitch-purple opacity-70 bg-[repeating-linear-gradient(45deg,transparent,transparent_2px,rgba(45,27,105,0.2)_2px,rgba(45,27,105,0.2)_4px)]" />
                 <div className="w-48 h-48 border-4 border-koola-purple rotate-45 animate-portal-purple shadow-[0_0_80px_rgba(45,27,105,0.8)]" />
              </div>
            )}
          </div>

          {/* Orb 2 */}
          <div className="relative">
             <div className={`w-12 h-12 rounded-full border-2 border-red-500/50 bg-red-500/20 animate-float-delayed flex items-center justify-center
               ${activeBooth === 'booth7' ? 'animate-pulse-red' : ''}`}>
               <Zap size={16} className="text-red-400" />
             </div>
             <div className="absolute top-14 -left-20 w-52 text-center bg-black/80 border border-red-500/30 p-2 rounded text-[10px] text-red-400 shadow-lg">
                {orb2Message}
             </div>
          </div>
        </div>

      </div>

      {/* Broadcast Log */}
      <div className="absolute bottom-0 left-0 right-0 h-40 bg-black/60 border-t border-koola-cyan/20 backdrop-blur-md p-4 z-20">
        <div className="flex items-center space-x-2 text-koola-cyan mb-2 border-b border-koola-cyan/10 pb-1">
          <Terminal size={14} />
          <span className="text-[10px] uppercase font-bold tracking-widest">Broadcast Log // Stream_01</span>
        </div>
        <div className="h-24 overflow-y-auto scrollbar-hide text-[11px] space-y-1">
          {broadcastLog.map((log, i) => (
            <div key={i} className="opacity-80 hover:opacity-100 transition-opacity">
              <span className="text-koola-cyan/60 mr-2">{'>'}</span>
              {log}
            </div>
          ))}
          <div ref={logEndRef} />
        </div>
      </div>

      <style>{`
        @keyframes ambient-pulse {
          0%, 100% { filter: brightness(100%); }
          50% { filter: brightness(110%); }
        }
        .animate-ambient-pulse {
          animation: ambient-pulse 8s ease-in-out infinite;
        }
        @keyframes portal-cyan {
          0% { transform: scale(0.8); opacity: 0.5; border-width: 8px; }
          50% { transform: scale(1.1); opacity: 1; border-width: 2px; }
          100% { transform: scale(1.3); opacity: 0; border-width: 1px; }
        }
        .animate-portal-cyan {
          animation: portal-cyan 2s ease-out infinite;
        }
        @keyframes portal-purple {
          0% { transform: rotate(45deg) scale(1); opacity: 0.8; }
          25% { transform: rotate(50deg) scale(1.05) skew(5deg); opacity: 1; }
          50% { transform: rotate(40deg) scale(0.95) skew(-5deg); opacity: 0.8; }
          100% { transform: rotate(45deg) scale(1); opacity: 0.8; }
        }
        .animate-portal-purple {
          animation: portal-purple 0.2s steps(2) infinite;
        }
        @keyframes float {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-10px); }
        }
        .animate-float { animation: float 4s ease-in-out infinite; }
        .animate-float-delayed { animation: float 4s ease-in-out infinite 2s; }

        @keyframes pulse-green {
          0%, 100% { box-shadow: 0 0 0 0 rgba(34, 197, 94, 0.4); }
          70% { box-shadow: 0 0 0 20px rgba(34, 197, 94, 0); }
        }
        .animate-pulse-green { animation: pulse-green 1.5s infinite; }

        @keyframes pulse-red {
          0%, 100% { box-shadow: 0 0 0 0 rgba(239, 68, 68, 0.4); }
          70% { box-shadow: 0 0 0 20px rgba(239, 68, 68, 0); }
        }
        .animate-pulse-red { animation: pulse-red 0.5s infinite; }

        @keyframes glitch {
          0% { clip-path: inset(10% 0 30% 0); transform: translate(-5px, 5px); }
          20% { clip-path: inset(40% 0 10% 0); transform: translate(5px, -5px); }
          40% { clip-path: inset(20% 0 50% 0); transform: translate(-5px, 0); }
          60% { clip-path: inset(80% 0 5% 0); transform: translate(5px, 5px); }
          80% { clip-path: inset(50% 0 20% 0); transform: translate(-5px, -5px); }
          100% { clip-path: inset(10% 0 30% 0); transform: translate(-5px, 5px); }
        }
        .animate-glitch-purple { animation: glitch 0.3s infinite; }

        .scrollbar-hide::-webkit-scrollbar { display: none; }
      `}</style>
    </div>
  );
};

export default PortalWatch;
