import React, { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { ChevronLeft } from 'lucide-react'

function greetingForHour(h: number): string {
  if (h >= 5 && h < 12) return 'Good morning'
  if (h >= 12 && h < 18) return 'Good afternoon'
  if (h >= 18 && h < 22) return 'Good evening'
  return 'Good night'
}

const DEFAULT_TITLE = 'Koola10 Emergent Studio'

const NovaAmbient: React.FC = () => {
  const [now, setNow] = useState(() => new Date())
  const [idle, setIdle] = useState(false)
  const [pulse, setPulse] = useState(false)

  // Page title
  useEffect(() => {
    document.title = 'Nova'
    return () => {
      document.title = DEFAULT_TITLE
    }
  }, [])

  // Clock tick
  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 5000)
    return () => clearInterval(t)
  }, [])

  // Tap: a small flourish (gentle scale pulse), not a face change
  const onTap = () => {
    setPulse(true)
    window.setTimeout(() => setPulse(false), 900)
  }

  // Hide the cursor on wall displays after 4s without mouse movement
  useEffect(() => {
    let t: ReturnType<typeof setTimeout>
    const poke = () => {
      setIdle(false)
      clearTimeout(t)
      t = setTimeout(() => setIdle(true), 4000)
    }
    poke()
    window.addEventListener('mousemove', poke)
    return () => {
      window.removeEventListener('mousemove', poke)
      clearTimeout(t)
    }
  }, [])

  // Keep the screen awake on wall tablets / TVs (graceful where unsupported)
  useEffect(() => {
    let lock: { release: () => Promise<void> } | null = null
    let cancelled = false
    const request = async () => {
      try {
        const nav = navigator as Navigator & {
          wakeLock?: { request: (type: string) => Promise<{ release: () => Promise<void> }> }
        }
        if (nav.wakeLock) {
          const l = await nav.wakeLock.request('screen')
          if (!cancelled) lock = l
          else await l.release().catch(() => {})
        }
      } catch {
        // Wake Lock unsupported or denied — page still works fine
      }
    }
    request()
    const onVisibility = () => {
      if (document.visibilityState === 'visible') request()
    }
    document.addEventListener('visibilitychange', onVisibility)
    return () => {
      cancelled = true
      document.removeEventListener('visibilitychange', onVisibility)
      if (lock) lock.release().catch(() => {})
    }
  }, [])

  const timeStr = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
  const dateStr = now.toLocaleDateString([], {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
  })

  return (
    <div
      onClick={onTap}
      className={`relative h-full w-full overflow-hidden bg-gradient-to-br from-koola-dark via-black to-koola-dark flex flex-col items-center justify-center select-none ${
        idle ? 'cursor-none' : 'cursor-pointer'
      }`}
    >
      {/* Discreet way back to the studio — does not trigger the tap flourish */}
      <Link
        to="/beatlab"
        onClick={(e) => e.stopPropagation()}
        className="absolute top-4 left-4 z-20 flex items-center gap-1 text-koola-cyan/30 hover:text-koola-cyan/80 transition-colors text-sm"
      >
        <ChevronLeft size={16} />
        <span>Studio</span>
      </Link>

      {/* Nova, full body: alive, drifting across the room */}
      <div className="animate-nova-pace relative flex items-center justify-center flex-shrink min-h-0">
        {/* Soft cyan glow behind her */}
        <div className="animate-glow-pulse absolute rounded-full bg-[radial-gradient(ellipse,rgba(0,240,255,0.30)_0%,rgba(0,240,255,0.07)_55%,transparent_70%)] blur-2xl w-[58vmin] h-[76vmin]" />
        <video
          src="/nova-ambient/nova-idle.mp4"
          poster="/nova-ambient/nova-fullbody.jpg"
          autoPlay
          muted
          loop
          playsInline
          disablePictureInPicture
          className={`relative object-contain drop-shadow-[0_0_60px_rgba(0,240,255,0.20)] ${
            pulse ? 'animate-nova-tap-pulse' : ''
          }`}
          style={{ height: '68vmin', width: 'auto' }}
        />
      </div>

      {/* Presence UI */}
      <div className="mt-[3vmin] flex flex-col items-center text-center px-6 flex-shrink-0">
        <div className="text-koola-cyan/90 font-light tracking-wide" style={{ fontSize: '8vmin', lineHeight: 1 }}>
          {timeStr}
        </div>
        <div className="mt-2 text-gray-400" style={{ fontSize: '2.6vmin' }}>
          {dateStr}
        </div>
        <div className="mt-[2vmin] text-gray-300" style={{ fontSize: '3vmin' }}>
          {greetingForHour(now.getHours())}
        </div>
        <div className="mt-[1.6vmin] uppercase text-koola-cyan/50 tracking-[0.35em]" style={{ fontSize: '1.6vmin' }}>
          Nova &middot; always here
        </div>
      </div>
    </div>
  )
}

export default NovaAmbient
