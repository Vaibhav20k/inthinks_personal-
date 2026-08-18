import { useEffect, useRef } from 'react'
import { usePrefersReducedMotion } from '../lib/motion'

interface Node {
  /** Free-drifting position — the unstructured thought. */
  fx: number
  fy: number
  vx: number
  vy: number
  /** Target position on the settled lattice — the structure. */
  lx: number
  ly: number
}

const COUNT_DESKTOP = 92
const COUNT_MOBILE = 44
const LINK_DIST = 132
const POINTER_RADIUS = 190

/**
 * Section 01 visual. Loose points drift as unstructured thought; the pointer
 * draws local relationships between them; scrolling resolves the field into a
 * regular lattice. thought → structure → invention.
 *
 * Canvas rather than WebGL: the whole figure is points and hairlines, so the
 * 2D context is both sufficient and far cheaper on mobile.
 */
export default function HeroThoughtSystem() {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const reduced = usePrefersReducedMotion()

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d', { alpha: true })
    if (!ctx) return

    let width = 0
    let height = 0
    let nodes: Node[] = []
    let frame = 0
    // 0 = free drift, 1 = fully resolved lattice
    let order = 0
    const pointer = { x: -9999, y: -9999, active: false }

    const build = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2)
      const rect = canvas.getBoundingClientRect()
      width = rect.width
      height = rect.height
      canvas.width = Math.round(width * dpr)
      canvas.height = Math.round(height * dpr)
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)

      const count = width < 720 ? COUNT_MOBILE : COUNT_DESKTOP
      const cols = Math.ceil(Math.sqrt(count * (width / Math.max(height, 1))))
      const rows = Math.ceil(count / cols)

      nodes = Array.from({ length: count }, (_, i) => {
        const col = i % cols
        const row = Math.floor(i / cols)
        return {
          fx: Math.random() * width,
          fy: Math.random() * height,
          vx: (Math.random() - 0.5) * 0.22,
          vy: (Math.random() - 0.5) * 0.22,
          lx: ((col + 0.5) / cols) * width,
          ly: ((row + 0.5) / rows) * height,
        }
      })
    }

    const onScroll = () => {
      // Resolve the lattice across the first viewport of scrolling.
      order = Math.min(1, Math.max(0, window.scrollY / (window.innerHeight * 0.85)))
    }

    const onPointer = (e: PointerEvent) => {
      const rect = canvas.getBoundingClientRect()
      pointer.x = e.clientX - rect.left
      pointer.y = e.clientY - rect.top
      pointer.active = true
    }
    const onLeave = () => {
      pointer.active = false
      pointer.x = -9999
      pointer.y = -9999
    }

    const draw = () => {
      ctx.clearRect(0, 0, width, height)

      const positions = nodes.map((n) => {
        // Ease the settle so the middle of the transition reads as motion,
        // not a linear slide.
        const t = order * order * (3 - 2 * order)
        return {
          x: n.fx + (n.lx - n.fx) * t,
          y: n.fy + (n.ly - n.fy) * t,
        }
      })

      // Relationships: near-neighbour links, strengthened around the pointer
      // and by the settling order.
      ctx.lineWidth = 1
      for (let i = 0; i < positions.length; i++) {
        const a = positions[i]
        const dpx = a.x - pointer.x
        const dpy = a.y - pointer.y
        const pDist = Math.sqrt(dpx * dpx + dpy * dpy)
        const pInfluence = pointer.active ? Math.max(0, 1 - pDist / POINTER_RADIUS) : 0

        for (let j = i + 1; j < positions.length; j++) {
          const b = positions[j]
          const dx = a.x - b.x
          const dy = a.y - b.y
          const dist = Math.sqrt(dx * dx + dy * dy)
          if (dist > LINK_DIST) continue

          const proximity = 1 - dist / LINK_DIST
          const alpha = proximity * (0.05 + pInfluence * 0.5 + order * 0.16)
          if (alpha < 0.012) continue

          ctx.strokeStyle =
            pInfluence > 0.25
              ? `rgba(232, 0, 111, ${alpha * 0.85})`
              : `rgba(20, 18, 22, ${alpha})`
          ctx.beginPath()
          ctx.moveTo(a.x, a.y)
          ctx.lineTo(b.x, b.y)
          ctx.stroke()
        }
      }

      // Points
      for (let i = 0; i < positions.length; i++) {
        const p = positions[i]
        const dpx = p.x - pointer.x
        const dpy = p.y - pointer.y
        const pDist = Math.sqrt(dpx * dpx + dpy * dpy)
        const near = pointer.active && pDist < POINTER_RADIUS * 0.42

        ctx.beginPath()
        ctx.arc(p.x, p.y, near ? 2.4 : 1.5, 0, Math.PI * 2)
        ctx.fillStyle = near
          ? 'rgba(232, 0, 111, 0.9)'
          : `rgba(20, 18, 22, ${0.2 + order * 0.18})`
        ctx.fill()
      }
    }

    const step = () => {
      for (const n of nodes) {
        n.fx += n.vx
        n.fy += n.vy
        if (n.fx < 0 || n.fx > width) n.vx *= -1
        if (n.fy < 0 || n.fy > height) n.vy *= -1
      }
      draw()
      frame = requestAnimationFrame(step)
    }

    build()
    onScroll()

    if (reduced) {
      // Reduced motion: present the resolved structure, no animation loop.
      order = 1
      draw()
    } else {
      frame = requestAnimationFrame(step)
      window.addEventListener('scroll', onScroll, { passive: true })
      window.addEventListener('pointermove', onPointer)
      canvas.addEventListener('pointerleave', onLeave)
    }

    const onResize = () => {
      build()
      if (reduced) draw()
    }
    window.addEventListener('resize', onResize)

    return () => {
      if (frame) cancelAnimationFrame(frame)
      window.removeEventListener('scroll', onScroll)
      window.removeEventListener('pointermove', onPointer)
      window.removeEventListener('resize', onResize)
      canvas.removeEventListener('pointerleave', onLeave)
    }
  }, [reduced])

  return (
    <canvas
      ref={canvasRef}
      aria-hidden="true"
      className="pointer-events-none absolute inset-0 h-full w-full"
    />
  )
}
