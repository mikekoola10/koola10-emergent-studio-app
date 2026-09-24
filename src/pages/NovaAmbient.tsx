import React, { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { ChevronLeft, Mic, MicOff, Send, Shuffle } from 'lucide-react'
import { apiClient } from '../lib/api'

function greetingForHour(h: number): string {
  if (h >= 5 && h < 12) return 'Good morning'
  if (h >= 12 && h < 18) return 'Good afternoon'
  if (h >= 18 && h < 22) return 'Good evening'
  return 'Good night'
}

const DEFAULT_TITLE = 'Koola10 Emergent Studio'

// Nova's shapeshifting looks — full-body, all original characters
interface NovaLook {
  id: string
  name: string
  img: string
  video: string
}
const LOOKS: NovaLook[] = [
  { id: 'streetwear', name: 'Streetwear', img: '/nova-ambient/nova-fullbody.jpg', video: '/nova-ambient/nova-idle.mp4' },
  { id: 'fairy', name: 'Fairy Goddess', img: '/nova-ambient/look-fairy.jpg', video: '/nova-ambient/look-fairy.mp4' },
  { id: 'goddess', name: 'Golden Goddess', img: '/nova-ambient/look-goddess.jpg', video: '/nova-ambient/look-goddess.mp4' },
  { id: 'neon', name: 'Neon Cyber', img: '/nova-ambient/look-neon.jpg', video: '/nova-ambient/look-neon.mp4' },
]

// Keyword → look mapping for voice/text commands
function detectLookInText(text: string, currentId: string): string | null {
  const t = text.toLowerCase()
  if (/\bfairy\b|\bwings\b|\bfae\b|\bpixie\b|\bmagical\b|\benchanted\b/.test(t)) return 'fairy'
  if (/\bgoddess\b|\bgolden\b|\bgold\b/.test(t)) return 'goddess'
  if (/\bneon\b|\bcyber\b|\bfutur|\bhologram\b/.test(t)) return 'neon'
  if (/\bstreetwear\b|\bnormal\b|\boriginal\b|\bdefault\b/.test(t)) return 'streetwear'
  if (/change (your|the) look|new look|switch( it)? up|surprise me|different outfit|shapeshift|change .* (look|outfit|form)|\bbecome\b/.test(t)) {
    const others = LOOKS.filter((l) => l.id !== currentId)
    return others[Math.floor(Math.random() * others.length)].id
  }
  return null
}

// Minimal typing for the browser speech APIs (not in TS DOM lib)
interface RecResultLike {
  isFinal: boolean
  0: { transcript: string }
}
interface RecEventLike {
  resultIndex: number
  results: ArrayLike<RecResultLike> & { length: number }
}
interface RecognitionLike {
  continuous: boolean
  interimResults: boolean
  lang: string
  onresult: ((e: RecEventLike) => void) | null
  onerror: ((e: { error?: string }) => void) | null
  onend: (() => void) | null
  start: () => void
  stop: () => void
}

function getRecognitionCtor(): (new () => RecognitionLike) | null {
  const w = window as unknown as Record<string, unknown>
  const ctor = w.SpeechRecognition || w.webkitSpeechRecognition
  return typeof ctor === 'function' ? (ctor as new () => RecognitionLike) : null
}

const NovaAmbient: React.FC = () => {
  const [now, setNow] = useState(() => new Date())
  const [idle, setIdle] = useState(false)
  const [pulse, setPulse] = useState(false)

  // --- Listening state ---
  const [supported] = useState(() => getRecognitionCtor() !== null)
  const [micOn, setMicOn] = useState(false) // user asked to listen
  const [micLive, setMicLive] = useState(false) // recognition actually running
  const [caption, setCaption] = useState('') // live interim transcript
  const [bubble, setBubble] = useState<string | null>(null) // Nova's spoken reply
  const [copied, setCopied] = useState(false) // copy-feedback for the bubble
  const [micNote, setMicNote] = useState<string | null>(null) // transient status
  const [chatText, setChatText] = useState('') // typed message to Nova
  const [lookId, setLookId] = useState('streetwear') // Nova's current shapeshifted look
  const look = LOOKS.find((l) => l.id === lookId) ?? LOOKS[0]

  const recRef = useRef<RecognitionLike | null>(null)
  const wantMicRef = useRef(false) // mirrors micOn inside recognition callbacks
  const captionTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const failCountRef = useRef(0) // consecutive instant recognition deaths (restart backoff)
  const lastStartRef = useRef(0) // timestamp of the last rec.start()
  const lookIdRef = useRef('streetwear') // fresh look id for recognition callbacks

  const setLook = (id: string) => {
    lookIdRef.current = id
    setLookId(id)
  }

  const shuffleLook = () => {
    const others = LOOKS.filter((l) => l.id !== lookIdRef.current)
    setLook(others[Math.floor(Math.random() * others.length)].id)
  }

  // Preload all look images so shapeshifting is instant
  useEffect(() => {
    LOOKS.forEach((l) => {
      const im = new Image()
      im.src = l.img
    })
  }, [])

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

  const speak = (text: string) => {
    try {
      if (!('speechSynthesis' in window)) return
      window.speechSynthesis.cancel()
      const u = new SpeechSynthesisUtterance(text)
      u.rate = 1
      window.speechSynthesis.speak(u)
    } catch {
      // No voice available — the text bubble still shows
    }
  }

  const dismissBubble = () => {
    setBubble(null)
    setCopied(false)
  }

  const copyBubble = async () => {
    if (!bubble || bubble === '…') return
    try {
      await navigator.clipboard.writeText(bubble)
    } catch {
      // Clipboard API unavailable — fall back to selecting the text so the user can copy manually
      const el = document.getElementById('nova-bubble-text')
      if (el) {
        const range = document.createRange()
        range.selectNodeContents(el)
        const sel = window.getSelection()
        sel?.removeAllRanges()
        sel?.addRange(range)
      }
    }
    setCopied(true)
    window.setTimeout(() => setCopied(false), 2000)
  }

  const askNova = async (query: string) => {
    setBubble('…')
    setCopied(false)
    try {
      const { reply } = await apiClient.novaTalk(query)
      setBubble(reply)
      speak(reply)
    } catch {
      setBubble("I couldn't reach my brain just now — try again in a bit.")
    }
  }

  const handleFinalTranscript = (transcript: string) => {
    setCaption('')
    if (!/nova/i.test(transcript)) return
    const query = transcript
      .replace(/nova/gi, '')
      .replace(/\s+/g, ' ')
      .trim()
      .replace(/[,.!?]+$/, '')
    if (!query) {
      // Just said her name to get her attention
      setBubble("Yes? I'm here.")
      setCopied(false)
      speak("Yes? I'm here.")
      return
    }
    // Shapeshift command? Switch her look, but still let her answer normally
    const lookHit = detectLookInText(query, lookIdRef.current)
    if (lookHit) setLook(lookHit)
    askNova(query)
  }

  const resetCaptionFade = () => {
    if (captionTimer.current) clearTimeout(captionTimer.current)
    captionTimer.current = setTimeout(() => setCaption(''), 4000)
  }

  // Typed chat, merged with the avatar view — same askNova path as voice
  const sendChat = (e: React.FormEvent) => {
    e.preventDefault()
    const text = chatText.trim()
    if (!text) return
    setChatText('')
    ;(document.activeElement as HTMLElement | null)?.blur?.()
    // Shapeshift command? Switch her look, but still let her answer normally
    const lookHit = detectLookInText(text, lookIdRef.current)
    if (lookHit) setLook(lookHit)
    askNova(text)
  }

  // Recognition lifecycle: (re)create when the user enables listening
  useEffect(() => {
    wantMicRef.current = micOn
    if (!micOn) {
      try {
        recRef.current?.stop()
      } catch {
        /* already stopped */
      }
      recRef.current = null
      setMicLive(false)
      setCaption('')
      return
    }
    const Ctor = getRecognitionCtor()
    if (!Ctor) {
      setMicOn(false)
      return
    }
    const rec: RecognitionLike = new Ctor()
    rec.continuous = true
    rec.interimResults = true
    rec.lang = 'en-US'

    rec.onresult = (e: RecEventLike) => {
      let interim = ''
      for (let i = e.resultIndex; i < e.results.length; i++) {
        const res = e.results[i]
        const transcript = res[0]?.transcript || ''
        if (res.isFinal) {
          failCountRef.current = 0 // real speech — healthy session, reset backoff
          handleFinalTranscript(transcript)
        } else interim += transcript
      }
      if (interim.trim()) {
        setCaption(interim)
        resetCaptionFade()
      }
    }

    rec.onerror = (e: { error?: string }) => {
      const code = e?.error || ''
      if (code === 'not-allowed' || code === 'service-not-allowed') {
        setMicNote('Mic blocked — allow microphone access, then tap Enable listening again.')
        setMicOn(false)
        return
      }
      // 'aborted' = our own stop(); 'no-speech' = quiet room (normal). Both are
      // silent — onend restarts with backoff below. Every restart beeps on
      // Android, so we never hot-loop here.
      if (code === 'aborted' || code === 'no-speech') return
      setMicNote('Mic hiccup — retrying…')
      // onend fires next and restarts while listening is enabled
    }

    rec.onend = () => {
      setMicLive(false)
      if (wantMicRef.current) {
        // Chrome stops continuous recognition on its own — restart it, but back
        // off when sessions die instantly (quiet-room no-speech loops), because
        // every restart beeps on Android.
        const sessionLen = Date.now() - lastStartRef.current
        if (sessionLen < 4000) failCountRef.current += 1
        else failCountRef.current = 0
        const delay = Math.min(800 + failCountRef.current * 2500, 20000)
        window.setTimeout(() => {
          if (!wantMicRef.current || !recRef.current) return
          try {
            lastStartRef.current = Date.now()
            recRef.current.start()
            setMicLive(true)
          } catch {
            /* already started */
          }
        }, delay)
      }
    }

    recRef.current = rec
    try {
      lastStartRef.current = Date.now()
      rec.start()
      setMicLive(true)
      setMicNote(null)
    } catch {
      setMicNote('Could not start listening — tap Enable listening again.')
      setMicOn(false)
    }

    return () => {
      wantMicRef.current = false
      try {
        rec.stop()
      } catch {
        /* ignore */
      }
      recRef.current = null
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [micOn])

  const toggleMic = (e: React.MouseEvent) => {
    e.stopPropagation()
    setMicNote(null)
    if (micOn) {
      setMicOn(false)
      try {
        window.speechSynthesis?.cancel()
      } catch {
        /* ignore */
      }
    } else {
      // Prime a voice so the first spoken reply isn't delayed (also unlocks
      // audio on browsers that need a user gesture)
      try {
        window.speechSynthesis?.getVoices()
      } catch {
        /* ignore */
      }
      setMicOn(true)
    }
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

  const micDot = micLive ? 'bg-emerald-400' : micOn ? 'bg-amber-400' : 'bg-gray-500'

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

      {/* Top-right controls: look shuffle + listening toggle */}
      <div className="absolute top-4 right-4 z-20 flex items-center gap-2">
        <button
          onClick={(e) => { e.stopPropagation(); shuffleLook() }}
          title="Change Nova's look"
          aria-label="Change Nova's look"
          className="flex h-8 w-8 items-center justify-center rounded-full border border-koola-cyan/20 bg-black/40 text-gray-300 hover:border-koola-cyan/50 transition-colors"
        >
          <Shuffle size={14} />
        </button>
        {supported ? (
          <button
            onClick={toggleMic}
            className="flex items-center gap-2 rounded-full border border-koola-cyan/20 bg-black/40 px-3 py-1.5 text-xs text-gray-300 hover:border-koola-cyan/50 transition-colors"
          >
            <span className={`inline-block h-2 w-2 rounded-full ${micDot}`} />
            {micOn ? <Mic size={14} /> : <MicOff size={14} />}
            <span>{micOn ? 'Listening' : 'Enable listening'}</span>
          </button>
        ) : (
          <div className="rounded-full border border-gray-700 bg-black/40 px-3 py-1.5 text-xs text-gray-500">
            Listening not supported in this browser
          </div>
        )}
      </div>

      {/* Nova, full body: alive, drifting across the room */}
      <div className="animate-nova-pace relative flex items-center justify-center flex-shrink min-h-0">
        {/* Soft cyan glow behind her */}
        <div className="animate-glow-pulse absolute rounded-full bg-[radial-gradient(ellipse,rgba(0,240,255,0.30)_0%,rgba(0,240,255,0.07)_55%,transparent_70%)] blur-2xl w-[58vmin] h-[76vmin]" />
        <video
          key={look.id}
          src={look.video}
          poster={look.img}
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
        {/* Nova's reply — speech bubble above her head, travels with her as she paces */}
        {bubble && (
          <div className="absolute z-20 left-1/2 -translate-x-1/2 bottom-full mb-[1.2vmin] w-max max-w-[62vmin] rounded-2xl border border-koola-cyan/40 bg-black/70 px-5 py-3 backdrop-blur-sm" style={{ fontSize: '2.6vmin' }}>
            <div id="nova-bubble-text" className="text-center text-gray-100 select-text">
              {bubble}
            </div>
            {bubble !== '…' && (
              <div className="mt-2 flex items-center justify-center gap-3">
                <button
                  onClick={(e) => { e.stopPropagation(); copyBubble() }}
                  className="rounded-full border border-koola-cyan/50 px-4 py-1 text-koola-cyan"
                  style={{ fontSize: '2vmin' }}
                >
                  {copied ? 'Copied ✓' : 'Copy'}
                </button>
                <button
                  onClick={(e) => { e.stopPropagation(); dismissBubble() }}
                  className="rounded-full border border-gray-500/50 px-4 py-1 text-gray-400"
                  style={{ fontSize: '2vmin' }}
                >
                  Dismiss
                </button>
              </div>
            )}
            {/* speech tail pointing down at her */}
            <div className="absolute -bottom-[5px] left-1/2 -translate-x-1/2 h-2.5 w-2.5 rotate-45 border-b border-r border-koola-cyan/40 bg-black/70" />
          </div>
        )}
      </div>

      {/* Live captions of what she hears */}
      {caption.trim() && (
        <div className="absolute z-20 left-1/2 -translate-x-1/2 bottom-[8vmin] max-w-[85vw] text-center text-gray-400/70 italic" style={{ fontSize: '2.2vmin' }}>
          {caption}
        </div>
      )}

      {/* Transient mic status notes */}
      {micNote && (
        <div className="absolute z-20 left-1/2 -translate-x-1/2 bottom-[4vmin] max-w-[85vw] text-center text-amber-300/80" style={{ fontSize: '2vmin' }}>
          {micNote}
        </div>
      )}

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
          Nova &middot; always here &middot; {look.name}
        </div>
      </div>

      {/* Type-to-Nova, merged with the avatar view */}
      <form
        onSubmit={sendChat}
        onClick={(e) => e.stopPropagation()}
        className="z-20 mt-[2vmin] flex w-[min(92vw,560px)] flex-shrink-0 items-center gap-2 px-2"
      >
        <input
          value={chatText}
          onChange={(e) => setChatText(e.target.value)}
          placeholder="Type to Nova…"
          aria-label="Type a message to Nova"
          className="h-11 flex-1 select-text rounded-full border border-koola-cyan/25 bg-black/50 px-4 text-sm text-gray-100 placeholder:text-gray-500 outline-none focus:border-koola-cyan/60"
        />
        <button
          type="submit"
          aria-label="Send message"
          className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-full border border-koola-cyan/40 bg-koola-cyan/10 text-koola-cyan transition-colors hover:bg-koola-cyan/20"
        >
          <Send size={16} />
        </button>
      </form>
    </div>
  )
}

export default NovaAmbient
