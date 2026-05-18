import React, { useState, useEffect, useRef } from 'react'
import { Terminal, Activity, ShieldAlert, Cpu } from 'lucide-react'

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

const PortalWatch: React.FC = () => {
  const [logs, setLogs] = useState<{ id: number; message: string; timestamp: string; type: 'info' | 'warning' | 'alert' | 'success' }[]>([])
  const [currentIndex, setCurrentIndex] = useState(0)
  const scrollRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const interval = setInterval(() => {
      if (currentIndex < LOG_MESSAGES.length) {
        const message = LOG_MESSAGES[currentIndex]
        let type: 'info' | 'warning' | 'alert' | 'success' = 'info'

        if (message.includes('WARNING') || message.includes('UNSTABLE') || message.includes('ANOMALY') || message.includes('GLITCH')) {
          type = 'warning'
        } else if (message.includes('SABOTAGE') || message.includes('DANGER') || message.includes('ALERT')) {
          type = 'alert'
        } else if (message.includes('SUCCESS') || message.includes('STABILIZED') || message.includes('APPROVAL') || message.includes('PRAISE')) {
          type = 'success'
        }

        const newLog = {
          id: Date.now(),
          message,
          timestamp: new Date().toLocaleTimeString(),
          type
        }

        setLogs(prev => [...prev, newLog].slice(-50))
        setCurrentIndex(prev => prev + 1)
      } else {
        // Reset to loop the logs for continuous display
        setCurrentIndex(0)
      }
    }, 2000)

    return () => clearInterval(interval)
  }, [currentIndex])

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }, [logs])

  return (
    <div className="flex flex-col h-screen bg-koola-dark p-6 font-mono">
      {/* Header */}
      <div className="flex items-center justify-between mb-6 border-b border-koola-cyan/30 pb-4">
        <div className="flex items-center space-x-3">
          <Terminal className="text-koola-cyan animate-pulse" size={24} />
          <h1 className="text-2xl font-bold text-koola-cyan tracking-tighter">PORTAL WATCH :: BROADCAST_LOG</h1>
        </div>
        <div className="flex items-center space-x-6">
          <div className="flex items-center space-x-2">
            <Activity size={16} className="text-green-500 animate-pulse" />
            <span className="text-xs text-green-500 uppercase">System Live</span>
          </div>
          <div className="flex items-center space-x-2">
            <Cpu size={16} className="text-koola-cyan" />
            <span className="text-xs text-koola-cyan uppercase">Resonance: High</span>
          </div>
        </div>
      </div>

      {/* Main Terminal View */}
      <div className="flex-1 bg-black/40 border border-koola-cyan/20 rounded-lg overflow-hidden flex flex-col shadow-[0_0_20px_rgba(0,240,255,0.1)]">
        {/* Status Bar */}
        <div className="bg-koola-cyan/10 px-4 py-2 flex items-center justify-between border-b border-koola-cyan/20">
          <span className="text-[10px] text-koola-cyan uppercase tracking-widest">Feed Status: Active</span>
          <span className="text-[10px] text-koola-cyan uppercase tracking-widest">Booth 3: Stable | Booth 7: Fluctuating</span>
        </div>

        {/* Log Area */}
        <div
          ref={scrollRef}
          className="flex-1 overflow-y-auto p-4 space-y-2 scroll-smooth"
        >
          {logs.map((log) => (
            <div
              key={log.id}
              className={`flex items-start space-x-3 text-sm animate-in fade-in slide-in-from-left-2 duration-300 ${
                log.type === 'warning' ? 'text-yellow-400' :
                log.type === 'alert' ? 'text-red-500' :
                log.type === 'success' ? 'text-green-400' :
                'text-koola-cyan'
              }`}
            >
              <span className="opacity-50 shrink-0">[{log.timestamp}]</span>
              <span className="shrink-0">{log.type === 'alert' ? <ShieldAlert size={14} className="mt-1" /> : '>'}</span>
              <span className="leading-relaxed">{log.message}</span>
            </div>
          ))}
          {logs.length === 0 && (
            <div className="flex items-center justify-center h-full text-koola-cyan/30 animate-pulse">
              INITIALIZING BROADCAST FEED...
            </div>
          )}
        </div>

        {/* Footer Scanline/Effect */}
        <div className="h-1 bg-gradient-to-r from-transparent via-koola-cyan/50 to-transparent animate-pulse" />
      </div>

      {/* Grid Overlay for aesthetic */}
      <div className="fixed inset-0 pointer-events-none bg-[linear-gradient(rgba(18,16,16,0)_50%,rgba(0,0,0,0.25)_50%),linear-gradient(90deg,rgba(255,0,0,0.06),rgba(0,255,0,0.02),rgba(0,0,255,0.06))] bg-[length:100%_2px,3px_100%] z-50 opacity-20" />
    </div>
  )
}

export default PortalWatch
