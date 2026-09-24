import React, { useEffect, useRef } from 'react'

// Ambient tint per Nova look — drives the aurora hues (CSS @property, crossfades
// over ~2s) and the canvas particle hue (lerped in the render loop, no hard cuts)
export const LOOK_TINTS: Record<string, { hueA: number; hueB: number; particleHue: number }> = {
  streetwear: { hueA: 186, hueB: 162, particleHue: 184 }, // deep cyan/teal
  goddess: { hueA: 45, hueB: 30, particleHue: 46 }, // warm gold/amber
  fairy: { hueA: 215, hueB: 278, particleHue: 232 }, // icy blue/violet
  neon: { hueA: 190, hueB: 322, particleHue: 305 }, // cyan/magenta (Neon Siren)
}

interface Particle {
  x: number
  y: number
  r: number
  vx: number
  vy: number
  phase: number
  freq: number
  baseAlpha: number
  hueJitter: number
}

// Full-screen live wallpaper: drifting aurora blobs + glowing dust particles,
// tinted per Nova's current look. Purely decorative — pointer-events none.
const NovaWallpaper: React.FC<{ lookId: string }> = ({ lookId }) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const tint = LOOK_TINTS[lookId] ?? LOOK_TINTS.streetwear
  // Target hue updates every render without rebuilding the particle field
  const targetHueRef = useRef(tint.particleHue)
  targetHueRef.current = tint.particleHue

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    let w = 0
    let h = 0
    let particles: Particle[] = []
    let raf = 0
    let running = true
    let last = performance.now()
    const hue = { current: targetHueRef.current }
    const reduceMotion =
      typeof window.matchMedia === 'function' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches

    const seedParticles = () => {
      // Modest count scaled to screen area: 60–110 particles
      const count = Math.max(60, Math.min(110, Math.round((w * h) / 22000)))
      particles = Array.from({ length: count }, () => ({
        x: Math.random() * w,
        y: Math.random() * h,
        r: 0.6 + Math.random() * 1.8,
        vx: (Math.random() - 0.5) * 10, // px/s, gentle sideways drift
        vy: -(3 + Math.random() * 9), // px/s, slow upward float
        phase: Math.random() * Math.PI * 2,
        freq: 0.4 + Math.random() * 1.2, // twinkle speed
        baseAlpha: 0.12 + Math.random() * 0.35,
        hueJitter: (Math.random() - 0.5) * 30,
      }))
    }

    const resize = () => {
      // Cap DPR at 2 — retina-sharp without the GPU cost of 3x panels
      const dpr = Math.min(window.devicePixelRatio || 1, 2)
      const cw = canvas.clientWidth
      const ch = canvas.clientHeight
      if (!cw || !ch) return
      w = cw
      h = ch
      canvas.width = Math.round(cw * dpr)
      canvas.height = Math.round(ch * dpr)
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
      seedParticles()
    }

    const drawFrame = (t: number) => {
      ctx.clearRect(0, 0, w, h)
      for (const p of particles) {
        const twinkle = 0.55 + 0.45 * Math.sin(t * p.freq + p.phase)
        const a = p.baseAlpha * twinkle
        if (a <= 0.01) continue
        ctx.beginPath()
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2)
        ctx.fillStyle = `hsla(${hue.current + p.hueJitter}, 90%, 72%, ${a.toFixed(3)})`
        ctx.fill()
      }
    }

    const frame = (now: number) => {
      if (!running) return
      raf = requestAnimationFrame(frame)
      if (document.hidden) {
        last = now
        return // pause rendering while the tab is hidden
      }
      let dt = (now - last) / 1000
      last = now
      if (dt > 0.05) dt = 0.05 // clamp tab-switch jumps
      // Smooth hue transition toward the look's tint (~2s, no hard cuts)
      const k = 1 - Math.exp(-dt / 0.7)
      hue.current += (targetHueRef.current - hue.current) * k
      const t = now / 1000
      for (const p of particles) {
        p.x += p.vx * dt
        p.y += p.vy * dt
        if (p.y < -8) {
          p.y = h + 8
          p.x = Math.random() * w
        } else if (p.y > h + 8) {
          p.y = -8
          p.x = Math.random() * w
        }
        if (p.x < -8) p.x = w + 8
        else if (p.x > w + 8) p.x = -8
      }
      drawFrame(t)
    }

    resize()
    window.addEventListener('resize', resize)

    if (reduceMotion) {
      // One static frame, no animation loop
      drawFrame(0)
    } else {
      raf = requestAnimationFrame(frame)
    }

    return () => {
      running = false
      cancelAnimationFrame(raf)
      window.removeEventListener('resize', resize)
    }
    // Intentionally run once: look changes flow through targetHueRef so the
    // particle field never pops or rebuilds mid-session.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return (
    <div
      aria-hidden
      className="nova-wallpaper pointer-events-none absolute inset-0 z-0 overflow-hidden"
      style={{ '--wall-hue-a': tint.hueA, '--wall-hue-b': tint.hueB } as React.CSSProperties}
    >
      {/* Parallax wrapper has bleed (-inset-10) so the ±10px drift never exposes edges */}
      <div className="animate-wallpaper-parallax absolute -inset-10">
        <div className="aurora-blob aurora-a" />
        <div className="aurora-blob aurora-b" />
        <div className="aurora-blob aurora-c" />
        <canvas ref={canvasRef} className="absolute inset-0 h-full w-full" />
      </div>
      {/* Vignette: transparent center → near-black edges, so Nova pops like she's in a room */}
      <div className="wallpaper-vignette absolute inset-0" />
    </div>
  )
}

export default NovaWallpaper
