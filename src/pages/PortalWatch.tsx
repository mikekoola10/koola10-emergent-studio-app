import React, { useState, useEffect, useRef } from 'react'
import { Terminal, Activity, ShieldAlert, Cpu, Radio, Zap, AlertTriangle, Eye } from 'lucide-react'
import { apiClient } from '../lib/api'

const LOG_MESSAGES = [
  "BOOTH 3 STABILIZED — CONTESTANT ENTERED WITH HIGH RESONANCE",
  "PORTAL ACTIVE — NEON BATTLE IN PROGRESS",
  "CONTESTANT EMERGED — ORB JUDGES DELIBERATING",
  "THE DINER BREATHES — NEW ENERGY FLOWS THROUGH THE PORTAL",
  "BOOTH 3 READY — AWAITING NEXT CONTESTANT",
  "BOOTH 7 FLICKERING — UNSTABLE PORTAL DETECTED — PROCEED WITH CAUTION",
  "ANOMALY DETECTED — PORTAL FRACTURING",
  "GLITCH SURGE — ORB JUDGES ON ALERT",
  "BOOTH 7 RESONANCE UNSTABLE — ATTEMPTING RECALIBRATION",
  "WARNING: UNKNOWN ENERGY SIGNATURE DETECTED IN BOOTH 7",
  "ORB 1 FLASHES GREEN — PRAISE FOR THE CONTESTANT",
  "ORB 2 PULSES RED — SABOTAGE ATTEMPT DETECTED",
  "ORB 1 AND ORB 2 EXCHANGE GLANCES — THE JUDGES CONFER",
  "ORB 3 APPEARS — THE WATCHER IS PRESENT",
  "THE DINER BREATHES — WALLS SHIFT — A NEW BATTLE BEGINS",
  "NEON FLICKERS — THE DINER IS RESTLESS",
  "SOMETHING MOVES IN THE SHADOWS OF THE DINER",
  "A DISTANT SOUND ECHOES FROM BEHIND THE PORTALS",
  "THE DINER HUMS WITH ANTICIPATION",
  "CONTESTANT RESONANCE RISING — PORTAL INTENSIFYING",
  "ORB 1 WHISPERS: 'THIS ONE HAS POTENTIAL'",
  "ORB 2 SCOWLS: 'I'VE SEEN BETTER'",
  "THE AIR THICKENS WITH RAW MAGIC",
  "BOOTH 3 PORTAL SHIMMERS — IRIDESCENT LIGHT SPILLS OUT",
  "BOOTH 7 GLITCH SPREADS — REALITY UNRAVELING",
  "A PORTAL ECHO — SOMEONE IS WATCHING FROM THE OTHER SIDE",
  "ORB 3 REMAINS SILENT — ITS JUDGMENT UNKNOWN",
  "THE DINER'S FLOORBOARDS CREAK — IT'S ALIVE",
  "A SUDDEN BURST OF NEON — THE BATTLE HAS BEGUN",
  "CONTESTANT STUMBLES — ORB 2 LAUGHS",
  "BOOTH 3 PORTAL STABILIZES — PREPARE FOR ENTRY",
  "BOOTH 7 RECALIBRATING — ATTEMPT #3 FAILED",
  "ORB 1 EMITS A SOFT HUM — APPROVAL",
  "ORB 2 GLITCHES — EVEN THE JUDGES AREN'T SAFE",
  "THE BROADCAST LOG ITSELF FLICKERS — THE DINER IS UNSTABLE",
  "A PORTAL WITHIN A PORTAL — INFINITE RECURSION DETECTED",
  "CONTESTANT VANISHES — WHERE DID THEY GO?",
  "THE ORBZ SPIN IN UNISON — A RARE ALIGNMENT",
  "SOMETHING ANCIENT AWAKENS BENEATH THE DINER",
  "BOOTH 3 AND BOOTH 7 RESONATE TOGETHER — A DUAL BATTLE?",
  "THE NEON SIGNS FLICKER 'WELCOME BACK'",
  "A VOICE FROM THE STATIC: 'YOU ARE NOT READY'",
  "ORB 1 GLOWS BRIGHTER — A MESSAGE OF HOPE",
  "ORB 2 DIMS — TEMPORARY DEFEAT",
  "THE DINER'S HEARTBEAT QUICKENS — SOMETHING BIG IS COMING",
  "BOOTH 7 STABILIZES UNEXPECTEDLY — THE GLITCH IS GONE?",
  "A PORTAL OPENS WITHOUT A CONTESTANT — WHO DARES?",
  "THE ORBZ FORM A TRIANGLE — THE WATCHER JOINS THE JUDGES",
  "BOOTH 3 PORTAL TURNS AMBER — A NEW MAGIC TYPE?",
  "A CONTESTANT'S SHADOW DETACHES — IT MOVES INDEPENDENTLY",
  "THE DINER WHISPERS: 'REMEMBER THE FIRST BATTLE'",
  "A FORGOTTEN PORTAL REOPENS — THE PAST RETURNS",
  "ORB 3 SPEAKS FOR THE FIRST TIME: 'INTERESTING'",
  "THE BROADCAST LOG DISPLAYS A SYMBOL, NOT WORDS",
  "BOOTH 7 EMITS A SOUND LIKE LAUGHTER",
  "THE WALLS BLEED NEON — THE DINER IS WOUNDED",
  "A PORTAL TO SOMEWHERE ELSE — NOT THE ARENA",
  "ORB 1 AND ORB 2 FUSE — A NEW JUDGE EMERGES",
  "THE CONTESTANT'S RESONANCE SHATTERS — TOTAL DEFEAT",
  "BOOTH 3 PORTAL EXPANDS — IT'S SWALLOWING THE DINER",
  "A CHILD'S VOICE: 'CAN I TRY?'",
  "THE ORBZ FLASH IN SEQUENCE — A COUNTDOWN",
  "BOOTH 7 STOPS GLITCHING — IT'S PERFECTLY STILL (TOO STILL)",
  "A PORTAL TO THE KNB STATION APPEARS — CROSSOVER EVENT",
  "SPIRAL CITY'S SKYLINE IS VISIBLE THROUGH BOOTH 3",
  "THE DINER'S JUKEBOX STARTS PLAYING — WITHOUT POWER",
  "A CONTESTANT EMERGES UNCHANGED — BUT THEIR SHADOW IS DIFFERENT",
  "ORB 2 SHATTERS — SABOTAGE FAILED",
  "A NEW ORB MATERIALIZES — ORB 4?",
  "THE BROADCAST LOG GOES BLANK — THEN A SINGLE WORD: 'WELCOME'",
  "THE DINER SHUDDERS — A PORTAL STORM IS COMING",
  "BOOTH 3'S PORTAL SHOWS A BATTLE FROM THE PAST",
  "BOOTH 7'S PORTAL SHOWS A BATTLE FROM THE FUTURE",
  "THE ORBZ FREEZE — TIME HAS STOPPED?",
  "A CONTESTANT STEPS OUT OF A PORTAL THAT NEVER OPENED",
  "THE DINER'S NEON TURNS MONOCHROME — REALITY IS DRAINING",
  "ORB 1 SPEAKS DIRECTLY TO YOU: 'BELIEVE'",
  "ORB 2 LAUGHS: 'YOU THINK YOU CAN CONTROL THIS?'",
  "THE BROADCAST LOG DISPLAYS YOUR NAME",
  "A PORTAL TO THE REAL WORLD? — NO, JUST A REFLECTION",
  "THE CONTESTANT'S RESONANCE CREATES A NEW ORB",
  "BOOTH 3 AND BOOTH 7 SWAP LOCATIONS",
  "THE DINER FOLDS IN ON ITSELF — AND REOPENS",
  "A MESSAGE FROM BEYOND: 'THIS IS ONLY THE BEGINNING'",
  "THE ORBZ SING — A HAUNTING MELODY",
  "BOOTH 7'S GLITCH REVEALS A HIDDEN MESSAGE",
  "A CONTESTANT LEAVES THEIR WEAPON BEHIND",
  "THE DINER'S CLOCK RUNS BACKWARDS",
  "SOMETHING KNOCKS FROM INSIDE BOOTH 3",
  "A PORTAL TO THE MAKER'S WORKSHOP? — TOO DANGEROUS",
  "ORB 3 FINALLY SPEAKS: 'THE CYCLE CONTINUES'",
  "THE BROADCAST LOG FILLS WITH STATIC — THEN A CLEAR IMAGE OF A PAST BATTLE",
  "THE DINER EXHALES — YOU FEEL IT IN YOUR BONES",
  "A CONTESTANT FUSES WITH THEIR PORTAL — BECOMING PURE RESONANCE",
  "THE ORBZ BOW — THE BATTLE IS OVER",
  "A NEW BOOTH MATERIALIZES — BOOTH 1?",
  "THE DINER'S FRONT DOOR OPENS — BUT NO ONE ENTERS",
  "A PORTAL WITHIN A PORTAL WITHIN A PORTAL — RECURSION DETECTED",
  "THE BROADCAST LOG SHOWS TOMORROW'S RESULTS — A GLITCH IN TIME",
  "ORB 1 WEEPS — A CONTESTANT SACRIFICED THEMSELVES",
  "ORB 2 IS SILENT — FOR THE FIRST TIME",
  "THE DINER RESETS — EVERYTHING GOES WHITE, THEN NEON RETURNS"
]

const PRAISE_MESSAGES = [
  "Ah, a bold step! The portal sings with your Resonance.",
  "Witness the brilliance! Orb 1 is impressed.",
  "Glorious! The Diner echoes your potential.",
  "Magnificent resonance. Booth 3 welcomes a champion."
]

const SARCASTIC_MESSAGES = [
  "Hmph. Another one. Let's see how long you last.",
  "Recalibrating... again. Your energy is... messy.",
  "Booth 7 is laughing at you. I might be too.",
  "Predictable. Try not to shatter reality on your way in."
]

const CRYPTIC_MESSAGES = [
  "The cycle continues. Do not forget the first battle.",
  "Beyond the neon, something ancient watches.",
  "Resonance is but a shadow of the truth.",
  "The Diner remembers. Do you?"
]

const PortalWatch: React.FC = () => {
  const [logs, setLogs] = useState<{ id: number; message: string; timestamp: string; type: 'info' | 'warning' | 'alert' | 'success' }[]>([])
  const [currentIndex, setCurrentIndex] = useState(0)
  const [booth3Status, setBooth3Status] = useState<'ACTIVE' | 'IN BATTLE'>('ACTIVE')
  const [booth7Status, setBooth7Status] = useState<'UNSTABLE' | 'RECALIBRATING'>('UNSTABLE')
  const [isBooth3Expanded, setIsBooth3Expanded] = useState(false)
  const [isBooth7Fractured, setIsBooth7Fractured] = useState(false)
  const [showBattleScene, setShowBattleScene] = useState(false)
  const [orb3Visible, setOrb3Visible] = useState(false)
  const [orb1Message, setOrb1Message] = useState('')
  const [orb2Message, setOrb2Message] = useState('')
  const [orb3Message, setOrb3Message] = useState('')
  const scrollRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    setOrb3Visible(Math.random() < 0.3)

    const interval = setInterval(() => {
      if (currentIndex < LOG_MESSAGES.length) {
        addLog(LOG_MESSAGES[currentIndex])
        setCurrentIndex(prev => prev + 1)
      } else {
        setCurrentIndex(0)
      }
    }, 3000)

    return () => clearInterval(interval)
  }, [currentIndex])

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }, [logs])

  const addLog = (message: string) => {
    let type: 'info' | 'warning' | 'alert' | 'success' = 'info'
    if (message.includes('WARNING') || message.includes('UNSTABLE') || message.includes('ANOMALY') || message.includes('GLITCH')) {
      type = 'warning'
    } else if (message.includes('SABOTAGE') || message.includes('DANGER') || message.includes('ALERT')) {
      type = 'alert'
    } else if (message.includes('SUCCESS') || message.includes('STABILIZED') || message.includes('APPROVAL') || message.includes('PRAISE')) {
      type = 'success'
    }

    const newLog = {
      id: Date.now() + Math.random(),
      message,
      timestamp: new Date().toLocaleTimeString(),
      type
    }
    setLogs(prev => [...prev, newLog].slice(-50))
  }

  const handleBooth3Click = () => {
    setIsBooth3Expanded(true)
    setTimeout(() => setIsBooth3Expanded(false), 1000)
    addLog("BOOTH 3 :: RESONANCE EXPANDING...")
  }

  const handleBooth3DoubleClick = async () => {
    setBooth3Status('IN BATTLE')
    setShowBattleScene(true)
    setOrb1Message(PRAISE_MESSAGES[Math.floor(Math.random() * PRAISE_MESSAGES.length)])
    addLog("BOOTH 3 :: PORTAL FULLY OPEN — BATTLE INITIATED")

    try {
      const lore = await apiClient.getLoreAnswer("Describe what happens when a contestant enters Booth 3")
      addLog(`AI_VOICE :: ${lore.response}`)
    } catch (err) {
      console.error("Lore fetch failed", err)
    }

    setTimeout(() => {
      setShowBattleScene(false)
      setBooth3Status('ACTIVE')
      setOrb1Message('')
    }, 5000)
  }

  const handleBooth7Click = () => {
    setIsBooth7Fractured(true)
    setTimeout(() => setIsBooth7Fractured(false), 1000)
    addLog("BOOTH 7 :: GLITCH SURGE DETECTED!")
  }

  const handleBooth7DoubleClick = async () => {
    setBooth7Status('RECALIBRATING')
    setOrb2Message(SARCASTIC_MESSAGES[Math.floor(Math.random() * SARCASTIC_MESSAGES.length)])
    addLog("BOOTH 7 :: ATTEMPTING RECALIBRATION — REALITY FRACTURING")

    try {
      const lore = await apiClient.getLoreAnswer("Describe the chaotic energy of Booth 7's glitched portal")
      addLog(`AI_VOICE :: ${lore.response}`)
    } catch (err) {
      console.error("Lore fetch failed", err)
    }

    setTimeout(() => {
      setBooth7Status('UNSTABLE')
      setOrb2Message('')
    }, 5000)
  }

  const handleOrb3Click = () => {
    setOrb3Message(CRYPTIC_MESSAGES[Math.floor(Math.random() * CRYPTIC_MESSAGES.length)])
    addLog("ORB 3 :: THE WATCHER WHISPERS A CRYPTIC TRUTH")
    setTimeout(() => setOrb3Message(''), 4000)
  }

  return (
    <div className="flex flex-col h-screen bg-[#0A0E27] relative overflow-hidden font-mono animate-diner-breath">
      {/* Neon Grid Background */}
      <div className="absolute inset-0 z-0 opacity-10"
           style={{
             backgroundImage: `linear-gradient(rgba(0, 240, 255, 0.2) 1px, transparent 1px), linear-gradient(90deg, rgba(0, 240, 255, 0.2) 1px, transparent 1px)`,
             backgroundSize: '40px 40px',
             transform: 'perspective(500px) rotateX(60deg) translateY(100px)',
             transformOrigin: 'top'
           }} />

      {/* Header */}
      <div className="relative z-10 flex items-center justify-between p-6 border-b border-koola-cyan/30 bg-black/40 backdrop-blur-sm">
        <div className="flex items-center space-x-3">
          <Radio className="text-koola-cyan animate-pulse" size={24} />
          <h1 className="text-2xl font-bold text-koola-cyan tracking-tighter">PORTAL WATCH :: NEXUS_CONTROL</h1>
        </div>
        <div className="flex items-center space-x-6 text-xs uppercase tracking-widest">
          <div className="flex items-center space-x-2">
            <Activity size={16} className="text-green-500 animate-pulse" />
            <span className="text-green-500">Nexus Live</span>
          </div>
          <div className="flex items-center space-x-2">
            <Zap size={16} className="text-yellow-400" />
            <span className="text-yellow-400">Resonance: Peak</span>
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col md:flex-row p-6 gap-6 relative z-10">

        {/* Left: Portals & Orbs */}
        <div className="flex-1 flex flex-col justify-center items-center gap-12 relative">

          <div className="flex flex-col md:flex-row gap-16 relative">

            {/* Orb 1 */}
            <div className="absolute -top-20 left-0 transition-all duration-1000 animate-bounce">
               <div className="w-12 h-12 rounded-full bg-amber-500/20 border-2 border-amber-500 shadow-[0_0_20px_rgba(245,158,11,0.6)] flex items-center justify-center relative">
                  <div className="w-4 h-4 rounded-full bg-green-400 animate-pulse" />
                  {orb1Message && (
                    <div className="absolute left-16 top-0 w-48 p-2 bg-amber-500/20 border border-amber-500 rounded text-[10px] text-amber-200 backdrop-blur-sm animate-in fade-in zoom-in">
                      {orb1Message}
                    </div>
                  )}
               </div>
            </div>

            {/* Booth 3 */}
            <div
              className={`w-64 h-80 rounded-t-full border-4 transition-all duration-500 cursor-pointer flex flex-col items-center justify-end pb-8 group relative overflow-hidden ${
                booth3Status === 'IN BATTLE' ? 'border-koola-cyan bg-koola-cyan/10 scale-105' : 'border-koola-cyan/50 hover:border-koola-cyan'
              }`}
              onClick={handleBooth3Click}
              onDoubleClick={handleBooth3DoubleClick}
            >
              <div className="absolute inset-0 bg-gradient-to-t from-koola-cyan/20 to-transparent animate-pulse" />
              {isBooth3Expanded && (
                <div className="absolute inset-0 border-8 border-koola-cyan rounded-t-full animate-ping opacity-50" />
              )}
              <div className="z-10 text-center px-4">
                <span className="block text-[10px] text-koola-cyan/60 mb-2 tracking-[0.3em]">BOOTH 3</span>
                <h2 className="text-lg font-bold text-koola-cyan drop-shadow-md mb-4">NEON BATTLE</h2>
                <div className={`px-3 py-1 rounded text-[10px] font-bold ${booth3Status === 'IN BATTLE' ? 'bg-blue-600 text-white animate-pulse' : 'bg-green-600/20 text-green-400 border border-green-500'}`}>
                  {booth3Status === 'IN BATTLE' ? '🔵 IN BATTLE' : '🟢 ACTIVE'}
                </div>
              </div>
            </div>

            {/* Orb 3 (The Watcher) */}
            {orb3Visible && (
              <div
                className="absolute left-1/2 -translate-x-1/2 top-1/4 z-20 cursor-pointer"
                onClick={handleOrb3Click}
              >
                <div className="w-16 h-16 rounded-full bg-white/10 border-2 border-white/40 shadow-[0_0_30px_rgba(255,255,255,0.4)] flex items-center justify-center animate-pulse">
                  <Eye className="text-white/60" size={24} />
                  {orb3Message && (
                    <div className="absolute top-20 w-48 p-2 bg-white/10 border border-white/30 rounded text-[10px] text-white italic backdrop-blur-sm animate-in fade-in slide-in-from-top-2">
                      "{orb3Message}"
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Booth 7 */}
            <div
              className={`w-64 h-80 rounded-t-full border-4 transition-all duration-500 cursor-pointer flex flex-col items-center justify-end pb-8 group relative overflow-hidden ${
                booth7Status === 'RECALIBRATING' ? 'border-purple-500 bg-purple-500/10 scale-105' : 'border-purple-500/50 hover:border-purple-500'
              }`}
              style={{
                clipPath: isBooth7Fractured ? 'polygon(0% 15%, 15% 15%, 15% 5%, 85% 5%, 85% 15%, 100% 15%, 100% 85%, 85% 85%, 85% 95%, 15% 95%, 15% 85%, 0% 85%)' : 'none'
              }}
              onClick={handleBooth7Click}
              onDoubleClick={handleBooth7DoubleClick}
            >
              <div className="absolute inset-0 bg-gradient-to-t from-purple-500/20 to-transparent animate-pulse" />
              <div className="z-10 text-center px-4">
                <span className="block text-[10px] text-purple-400/60 mb-2 tracking-[0.3em]">BOOTH 7</span>
                <h2 className="text-lg font-bold text-purple-400 drop-shadow-md mb-4">UNSTABLE</h2>
                <div className={`px-3 py-1 rounded text-[10px] font-bold ${booth7Status === 'RECALIBRATING' ? 'bg-purple-600 text-white animate-pulse' : 'bg-red-600/20 text-red-400 border border-red-500'}`}>
                   {booth7Status === 'RECALIBRATING' ? '🟣 RECALIBRATING' : '🔴 UNSTABLE'}
                </div>
              </div>
            </div>

            {/* Orb 2 */}
            <div className="absolute -top-20 right-0 transition-all duration-1000 animate-[bounce_2s_infinite_1s]">
               <div className="w-12 h-12 rounded-full bg-red-500/20 border-2 border-red-500 shadow-[0_0_20px_rgba(239,68,68,0.6)] flex items-center justify-center relative">
                  <div className="w-4 h-4 rounded-full bg-purple-600 animate-pulse" />
                  {orb2Message && (
                    <div className="absolute right-16 top-0 w-48 p-2 bg-red-500/20 border border-red-500 rounded text-[10px] text-red-200 backdrop-blur-sm animate-in fade-in zoom-in text-right">
                      {orb2Message}
                    </div>
                  )}
               </div>
            </div>

          </div>

          {/* Battle Scene Placeholder Overlay */}
          {showBattleScene && (
            <div className="absolute inset-0 z-50 bg-black/80 flex items-center justify-center animate-in fade-in duration-700">
               <div className="text-center p-8 border-2 border-koola-cyan rounded-lg bg-koola-dark shadow-[0_0_50px_rgba(0,240,255,0.3)]">
                  <Activity size={48} className="text-koola-cyan mx-auto mb-4 animate-spin" />
                  <h3 className="text-2xl font-bold text-koola-cyan mb-2">NEON BATTLE IN PROGRESS</h3>
                  <p className="text-koola-cyan/60 text-sm">Resonance Synchronizing... Dimensional Anchor Stable.</p>
               </div>
            </div>
          )}
        </div>

        {/* Right: Broadcast Log */}
        <div className="w-full md:w-96 flex flex-col bg-black/40 border border-koola-cyan/20 rounded-lg overflow-hidden shadow-[0_0_20px_rgba(0,240,255,0.1)]">
          <div className="bg-koola-cyan/10 px-4 py-2 flex items-center justify-between border-b border-koola-cyan/20">
            <span className="text-[10px] text-koola-cyan uppercase tracking-widest">BROADCAST_FEED</span>
            <div className="flex space-x-2">
              <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
              <div className="w-2 h-2 rounded-full bg-yellow-500" />
              <div className="w-2 h-2 rounded-full bg-green-500" />
            </div>
          </div>

          <div
            ref={scrollRef}
            className="flex-1 overflow-y-auto p-4 space-y-2 text-[11px]"
          >
            {logs.map((log) => (
              <div
                key={log.id}
                className={`flex items-start space-x-2 animate-in fade-in slide-in-from-left-2 duration-300 ${
                  log.type === 'warning' ? 'text-yellow-400' :
                  log.type === 'alert' ? 'text-red-500' :
                  log.type === 'success' ? 'text-green-400' :
                  'text-koola-cyan/80'
                }`}
              >
                <span className="opacity-30 shrink-0">[{log.timestamp}]</span>
                <span className="shrink-0">{log.type === 'alert' ? <ShieldAlert size={10} className="mt-0.5" /> : '>'}</span>
                <span className="leading-relaxed break-words">{log.message}</span>
              </div>
            ))}
          </div>

          <div className="p-2 border-t border-koola-cyan/20 bg-koola-cyan/5">
             <div className="flex items-center space-x-2 text-[9px] text-koola-cyan/50">
                <Terminal size={12} />
                <span>SYSTEM_LOG_v2.0.48_STABLE</span>
             </div>
          </div>
        </div>

      </div>

      {/* Screen Effects */}
      <div className="fixed inset-0 pointer-events-none z-50">
        {/* CRT Scanlines */}
        <div className="absolute inset-0 bg-[linear-gradient(rgba(18,16,16,0)_50%,rgba(0,0,0,0.1)_50%),linear-gradient(90deg,rgba(255,0,0,0.03),rgba(0,255,0,0.01),rgba(0,0,255,0.03))] bg-[length:100%_2px,3px_100%] opacity-20" />
        {/* Static Noise Overlay */}
        <div className="absolute inset-0 opacity-[0.03] bg-[url('https://grainy-gradients.vercel.app/noise.svg')]" />
      </div>

      <style>{`
        @keyframes diner-breath {
          0%, 100% { filter: brightness(1); }
          50% { filter: brightness(1.15); }
        }
        .animate-diner-breath {
          animation: diner-breath 8s ease-in-out infinite;
        }
        @keyframes glitch {
          0% { clip-path: polygon(0 2%, 100% 2%, 100% 5%, 0 5%); }
          20% { clip-path: polygon(0 15%, 100% 15%, 100% 15%, 0 15%); }
          40% { clip-path: polygon(0 10%, 100% 10%, 100% 20%, 0 20%); }
          60% { clip-path: polygon(0 1%, 100% 1%, 100% 2%, 0 2%); }
          80% { clip-path: polygon(0 33%, 100% 33%, 100% 33%, 0 33%); }
          100% { clip-path: polygon(0 44%, 100% 44%, 100% 44%, 0 44%); }
        }
      `}</style>
    </div>
  )
}

export default PortalWatch
