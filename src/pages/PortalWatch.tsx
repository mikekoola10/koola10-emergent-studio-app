import React, { useEffect, useRef, useState, useCallback } from 'react';
import { apiClient } from '../lib/api';

// --- Types & Constants ---
type PortalState = 'inactive' | 'activating' | 'open';
type BoothId = 3 | 7;

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
  color: string;
  size: number;
  isGlitch: boolean;
}

const STATIC_LOG_MESSAGES = [
  "BOOTH 3 STABILIZED — CONTESTANT ENTERED WITH HIGH RESONANCE",
  "BOOTH 7 FLICKERING — UNSTABLE PORTAL DETECTED — PROCEED WITH CAUTION",
  "THE DINER BREATHES — WALLS SHIFT — A NEW BATTLE BEGINS",
  "RESONANCE CALIBRATION IN PROGRESS...",
  "VOICES FROM THE NEXUS DETECTED",
  "CAUTION: REALITY BENDING AT NODE 7"
];

// --- Components ---

const PortalCanvas: React.FC<{
  state: PortalState;
  isGlitch: boolean;
}> = ({ state, isGlitch }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const particles = useRef<Particle[]>([]);
  const requestRef = useRef<number>();
  const activeStartTime = useRef<number | null>(null);

  const createParticle = (width: number, height: number): Particle => {
    const angle = Math.random() * Math.PI * 2;
    const distance = 100 + Math.random() * 50;
    const x = width / 2 + Math.cos(angle) * distance;
    const y = height / 2 + Math.sin(angle) * distance;

    const vx = (width / 2 - x) * (isGlitch ? 0.05 : 0.02);
    const vy = (height / 2 - y) * (isGlitch ? 0.05 : 0.02);

    return {
      x,
      y,
      vx: vx + (Math.random() - 0.5) * (isGlitch ? 5 : 1),
      vy: vy + (Math.random() - 0.5) * (isGlitch ? 5 : 1),
      life: 0,
      maxLife: 30 + Math.random() * 20,
      color: isGlitch
        ? (Math.random() > 0.5 ? '#8B5CF6' : '#EF4444')
        : '#00F0FF',
      size: Math.random() * (isGlitch ? 4 : 2) + 1,
      isGlitch
    };
  };

  const animate = useCallback((time: number) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    if (state !== 'inactive') {
      if (!activeStartTime.current) activeStartTime.current = time;

      const spawnCount = state === 'open' ? (isGlitch ? 5 : 2) : (isGlitch ? 15 : 8);
      for (let i = 0; i < spawnCount; i++) {
        particles.current.push(createParticle(canvas.width, canvas.height));
      }
    } else {
      activeStartTime.current = null;
    }

    particles.current = particles.current.filter(p => {
      p.x += p.vx;
      p.y += p.vy;
      p.life++;

      if (p.isGlitch && Math.random() > 0.9) {
        p.x += (Math.random() - 0.5) * 20;
      }

      const opacity = 1 - p.life / p.maxLife;
      ctx.fillStyle = p.color;
      ctx.globalAlpha = opacity;

      if (p.isGlitch && Math.random() > 0.8) {
        ctx.fillRect(p.x, p.y, p.size * 2, p.size / 2);
      } else {
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fill();
      }

      return p.life < p.maxLife;
    });

    if (state !== 'inactive') {
      const elapsed = (time - (activeStartTime.current || time)) / 1000;
      const progress = state === 'open' ? 1 : Math.min(elapsed / 1.5, 1);

      ctx.globalAlpha = progress * (isGlitch ? 0.7 : 0.5);
      ctx.strokeStyle = isGlitch ? '#8B5CF6' : '#00F0FF';
      ctx.lineWidth = isGlitch ? 3 : 2;

      if (isGlitch) {
        ctx.beginPath();
        for (let i = 0; i < 20; i++) {
          const angle = (i / 20) * Math.PI * 2;
          const r = 60 * progress + (Math.random() - 0.5) * 20;
          const x = canvas.width / 2 + Math.cos(angle) * r;
          const y = canvas.height / 2 + Math.sin(angle) * r;
          if (i === 0) ctx.moveTo(x, y);
          else ctx.lineTo(x, y);
        }
        ctx.closePath();
        ctx.stroke();
      } else {
        ctx.beginPath();
        ctx.arc(canvas.width / 2, canvas.height / 2, 70 * progress, 0, Math.PI * 2);
        ctx.stroke();
      }
    }

    requestRef.current = requestAnimationFrame(animate);
  }, [state, isGlitch]);

  useEffect(() => {
    requestRef.current = requestAnimationFrame(animate);
    return () => {
      if (requestRef.current) cancelAnimationFrame(requestRef.current);
    };
  }, [animate]);

  return (
    <canvas
      ref={canvasRef}
      width={400}
      height={400}
      className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none z-20"
    />
  );
};

const Orb: React.FC<{
  color: string;
  label: string;
  message: string;
  flash: boolean;
  active: boolean;
}> = ({ color, label, message, flash, active }) => {
  if (!active) return null;

  return (
    <div className="absolute flex flex-col items-center group pointer-events-none transition-all duration-1000"
         style={{ transition: 'opacity 1s, transform 2s ease-in-out' }}>
      <div className={`w-12 h-12 rounded-full blur-md animate-pulse ${color} ${flash ? 'animate-ping scale-150' : ''}`} />
      <div className={`absolute top-0 w-8 h-8 rounded-full border border-white/20 flex items-center justify-center ${flash ? 'bg-white shadow-[0_0_20px_#fff]' : ''}`}>
        <div className={`w-2 h-2 rounded-full ${color.replace('bg-', 'bg-').replace('/40', '')}`} />
      </div>
      <div className="mt-4 flex flex-col items-center">
        <span className="text-[10px] text-white/40 uppercase tracking-widest">{label}</span>
        {message && (
          <div className="mt-2 p-2 bg-black/60 border border-white/10 rounded backdrop-blur-md max-w-[150px] text-center">
            <p className="text-[9px] text-white/80 leading-tight italic">"{message}"</p>
          </div>
        )}
      </div>
    </div>
  );
};

const PortalWatch: React.FC = () => {
  const [booth3State, setBooth3State] = useState<PortalState>('inactive');
  const [booth7State, setBooth7State] = useState<PortalState>('inactive');
  const [dimmed, setDimmed] = useState(false);
  const [showWatcher, setShowWatcher] = useState(false);

  const [orb1Message, setOrb1Message] = useState("");
  const [orb1Flash, setOrb1Flash] = useState(false);

  const [orb2Message, setOrb2Message] = useState("");
  const [orb2Flash, setOrb2Flash] = useState(false);

  const [logMessages, setLogMessages] = useState<string[]>(STATIC_LOG_MESSAGES);
  const [currentLogIndex, setCurrentLogIndex] = useState(0);

  // Fetch initial lore for "The Diner Breathes"
  useEffect(() => {
    const fetchDinerLore = async () => {
      try {
        const res = await apiClient.getLoreAnswer("What is the Diner thinking right now?");
        if (res.response) {
          setLogMessages(prev => [...prev, res.response.toUpperCase()]);
        }
      } catch (err) {
        console.error("Failed to fetch initial diner lore:", err);
      }
    };
    fetchDinerLore();
  }, []);

  useEffect(() => {
    setShowWatcher(Math.random() < 0.3);

    const interval = setInterval(() => {
      setCurrentLogIndex(prev => (prev + 1) % logMessages.length);
    }, 5000);

    return () => clearInterval(interval);
  }, [logMessages]);

  const activatePortal = async (id: BoothId) => {
    if (id === 3) {
      if (booth3State !== 'inactive') return;
      setBooth3State('activating');

      // Call Lore for portal activation
      apiClient.getLoreAnswer("Describe what happens when a portal activates in the Diner").then(res => {
        if (res.response) {
          setLogMessages(prev => [res.response.toUpperCase(), ...prev]);
          setCurrentLogIndex(0);
        }
      });

      // Call Lore for Orb commentary
      apiClient.getLoreAnswer("What does the Orb judge see in this contestant? (Praise)").then(res => {
        if (res.response) {
           setOrb1Message(res.response);
        }
      });

      // Sequence
      setTimeout(() => {
        setOrb1Flash(true);
        if (!orb1Message) setOrb1Message("Ah, a bold step! The portal sings with your Resonance.");
        setTimeout(() => setOrb1Flash(false), 1000);
      }, 1000);

      setTimeout(() => {
        setBooth3State('open');
      }, 1500);

    } else {
      if (booth7State !== 'inactive') return;
      setBooth7State('activating');

      // Call Lore for instability
      apiClient.getLoreAnswer("Describe the instability at Booth 7").then(res => {
        if (res.response) {
          setLogMessages(prev => [res.response.toUpperCase(), ...prev]);
          setCurrentLogIndex(0);
        }
      });

      // Call Lore for Orb commentary
      apiClient.getLoreAnswer("What does the Orb judge see in this contestant? (Sarcastic)").then(res => {
        if (res.response) {
           setOrb2Message(res.response);
        }
      });

      // Sequence
      setTimeout(() => {
        setOrb2Flash(true);
        if (!orb2Message) setOrb2Message("Hmph. Another one. Let's see how long you last.");
        setTimeout(() => setOrb2Flash(false), 1000);
      }, 600);

      setTimeout(() => {
        setBooth7State('open');
      }, 1200);
    }
  };

  const handleDoubleClick = (id: BoothId) => {
    setDimmed(true);
    activatePortal(id);
  };

  return (
    <div className={`relative min-h-screen w-full bg-[#1E1B4B] overflow-hidden flex flex-col font-mono transition-colors duration-1000 ${dimmed ? 'bg-black' : ''}`}>
      {/* Background Grid */}
      <div
        className="absolute inset-0 opacity-10 pointer-events-none"
        style={{
          backgroundImage: 'linear-gradient(rgba(0, 240, 255, 0.2) 1px, transparent 1px), linear-gradient(90deg, rgba(0, 240, 255, 0.2) 1px, transparent 1px)',
          backgroundSize: '50px 50px'
        }}
      />

      {/* The Diner Breathes Effect */}
      <div className="absolute inset-0 animate-diner-breathe pointer-events-none bg-black/20 mix-blend-overlay" />

      {/* Orbs */}
      <div className="absolute inset-0 pointer-events-none">
        {/* Orb 1 near Booth 3 */}
        <div className="absolute left-[20%] top-[30%]">
          <Orb color="bg-amber-400/40" label="ORB 01 — THE ENCOURAGER" message={orb1Message} flash={orb1Flash} active={true} />
        </div>

        {/* Orb 2 near Booth 7 */}
        <div className="absolute right-[20%] top-[40%]">
          <Orb color="bg-red-500/40" label="ORB 02 — THE CYNIC" message={orb2Message} flash={orb2Flash} active={true} />
        </div>

        {/* Orb 3 Watcher */}
        <div className="absolute left-1/2 top-1/4 -translate-x-1/2">
          <Orb color="bg-white/40" label="ORB 03 — THE WATCHER" message="" flash={false} active={showWatcher} />
        </div>
      </div>

      {/* UI Overlay */}
      <div className={`relative z-10 flex-1 flex flex-col items-center justify-center p-8 transition-opacity duration-1000 ${dimmed ? 'opacity-40' : 'opacity-100'}`}>
        <h2 className="text-koola-cyan text-sm tracking-[0.3em] mb-12 opacity-50 uppercase">Portal Watch — Monitoring Active Nodes</h2>

        <div className="flex flex-col md:flex-row gap-24 items-center justify-center w-full max-w-6xl">
          {/* Booth 3 */}
          <div
            className="relative group cursor-pointer"
            onClick={() => activatePortal(3)}
            onDoubleClick={() => handleDoubleClick(3)}
          >
             <div className={`w-80 h-[450px] border-2 rounded-2xl flex flex-col items-center justify-center bg-black/40 backdrop-blur-sm transition-all duration-500 overflow-hidden ${
               booth3State === 'inactive' ? 'border-koola-cyan/30 hover:border-koola-cyan animate-pulse-slow' : 'border-koola-cyan shadow-[0_0_30px_rgba(0,240,255,0.4)]'
             }`}>
                <div className="absolute top-4 text-xs tracking-tighter text-koola-cyan/40">NODE :: B3</div>
                <div className="text-koola-cyan font-bold tracking-widest">BOOTH 3 — NEON BATTLE</div>
                <div className="text-[10px] text-koola-cyan/60 mt-2">STABLE RESONANCE</div>

                {booth3State === 'open' && (
                  <div className="absolute inset-0 bg-koola-cyan/5 animate-pulse flex items-center justify-center">
                    <div className="text-koola-cyan/40 text-[8px] animate-bounce uppercase">Battle Scene Teaser Loaded</div>
                  </div>
                )}
             </div>
             <PortalCanvas state={booth3State} isGlitch={false} />
          </div>

          {/* Booth 7 */}
          <div
            className="relative group cursor-pointer"
            onClick={() => activatePortal(7)}
            onDoubleClick={() => handleDoubleClick(7)}
          >
             <div className={`w-80 h-[450px] border-2 rounded-2xl flex flex-col items-center justify-center bg-black/40 backdrop-blur-sm transition-all duration-500 overflow-hidden ${
               booth7State === 'inactive' ? 'border-purple-500/30 hover:border-purple-500 animate-flicker' : 'border-red-500 shadow-[0_0_30px_rgba(239,68,68,0.4)]'
             } ${booth7State !== 'inactive' ? 'animate-glitch-fracture' : ''}`}>
                <div className="absolute top-4 text-xs tracking-tighter text-purple-500/40">NODE :: B7</div>
                <div className="text-purple-500 font-bold tracking-widest">BOOTH 7 — UNSTABLE</div>
                <div className="text-[10px] text-purple-500/60 mt-2">UNSTABLE NODE</div>

                {booth7State === 'open' && (
                  <div className="absolute inset-0 bg-red-500/5 animate-flicker flex items-center justify-center">
                    <div className="text-red-500/40 text-[8px] uppercase">Warning: Signal Lost</div>
                  </div>
                )}
             </div>
             <PortalCanvas state={booth7State} isGlitch={true} />
          </div>
        </div>
      </div>

      {/* Dimmed Overlay Battle Scene */}
      {dimmed && (
        <div className="fixed inset-0 z-50 flex items-center justify-center pointer-events-none">
          <div className="text-koola-cyan text-4xl font-bold tracking-[1em] animate-pulse opacity-20">
            ENTER THE NEXUS
          </div>
        </div>
      )}

      {/* Broadcast Log */}
      <div className="relative z-20 w-full h-20 bg-black/90 border-t border-koola-cyan/30 flex items-center px-12 overflow-hidden">
        <div className="flex items-center space-x-4">
          <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse" />
          <div className="text-koola-cyan/40 text-[10px] font-bold uppercase tracking-widest min-w-[150px]">Live Broadcast:</div>
        </div>
        <div className="flex-1 relative h-full flex items-center ml-8">
          {logMessages.map((msg, i) => (
            <div
              key={i}
              className={`absolute inset-0 flex items-center transition-all duration-1000 ${
                i === currentLogIndex ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'
              }`}
            >
              <span className="text-koola-cyan text-xs tracking-[0.2em] uppercase font-bold">
                {msg}
              </span>
            </div>
          ))}
        </div>
      </div>

      <style dangerouslySetInnerHTML={{ __html: `
        @keyframes diner-breathe {
          0%, 100% { opacity: 0.1; }
          50% { opacity: 0.3; }
        }
        .animate-diner-breathe {
          animation: diner-breathe 8s ease-in-out infinite;
        }
        @keyframes pulse-slow {
          0%, 100% { box-shadow: 0 0 20px rgba(0, 240, 255, 0.1); }
          50% { box-shadow: 0 0 40px rgba(0, 240, 255, 0.2); }
        }
        .animate-pulse-slow {
          animation: pulse-slow 4s ease-in-out infinite;
        }
        @keyframes flicker {
          0%, 19.999%, 22%, 62.999%, 64%, 64.999%, 70%, 100% { opacity: 1; }
          20%, 21.999%, 63%, 63.999%, 65%, 69.999% { opacity: 0.4; }
        }
        .animate-flicker {
          animation: flicker 3s linear infinite;
        }
        @keyframes glitch-fracture {
          0% { clip-path: inset(0 0 0 0); }
          20% { clip-path: inset(10% 0 40% 0); transform: translateX(-5px); }
          40% { clip-path: inset(40% 0 10% 0); transform: translateX(5px); }
          60% { clip-path: inset(0 0 0 0); }
          80% { clip-path: inset(20% 0 20% 0); transform: scale(1.02); }
          100% { clip-path: inset(0 0 0 0); }
        }
        .animate-glitch-fracture {
          animation: glitch-fracture 0.5s steps(2) infinite;
        }
      `}} />
    </div>
  );
};

export default PortalWatch;
