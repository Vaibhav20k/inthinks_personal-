import { useCallback, useEffect, useState } from 'react'

/** Tracks the user's reduced-motion preference and reacts to changes. */
export function usePrefersReducedMotion(): boolean {
  const [reduced, setReduced] = useState(false)
  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)')
    const update = () => setReduced(mq.matches)
    update()
    mq.addEventListener('change', update)
    return () => mq.removeEventListener('change', update)
  }, [])
  return reduced
}

/** Reactive media query. */
export function useMediaQuery(query: string): boolean {
  const [matches, setMatches] = useState(false)
  useEffect(() => {
    const mq = window.matchMedia(query)
    const update = () => setMatches(mq.matches)
    update()
    mq.addEventListener('change', update)
    return () => mq.removeEventListener('change', update)
  }, [query])
  return matches
}

/**
 * Fires once when the element crosses into view.
 *
 * Callback ref rather than useRef throughout this module: several of these
 * elements mount conditionally behind a media query, and an effect keyed on a
 * useRef would never re-subscribe when the node finally arrives.
 */
export function useInView<T extends HTMLElement>(rootMargin = '-10% 0px -10% 0px') {
  const [node, setNode] = useState<T | null>(null)
  const ref = useCallback((el: T | null) => setNode(el), [])
  const [inView, setInView] = useState(false)

  useEffect(() => {
    if (!node) return
    const io = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setInView(true)
          io.disconnect()
        }
      },
      { rootMargin, threshold: 0.01 },
    )
    io.observe(node)
    return () => io.disconnect()
  }, [node, rootMargin])

  return { ref, inView }
}

/** Progress of an element through the viewport, 0 → 1. rAF-throttled. */
export function useScrollProgress<T extends HTMLElement>() {
  const [node, setNode] = useState<T | null>(null)
  const ref = useCallback((el: T | null) => setNode(el), [])
  const [progress, setProgress] = useState(0)

  useEffect(() => {
    if (!node) return
    let frame = 0
    const measure = () => {
      frame = 0
      const rect = node.getBoundingClientRect()
      const travel = rect.height - window.innerHeight
      if (travel <= 0) {
        setProgress(rect.top <= 0 ? 1 : 0)
        return
      }
      setProgress(Math.min(1, Math.max(0, -rect.top / travel)))
    }
    const onScroll = () => {
      if (!frame) frame = requestAnimationFrame(measure)
    }
    measure()
    window.addEventListener('scroll', onScroll, { passive: true })
    window.addEventListener('resize', onScroll)
    return () => {
      if (frame) cancelAnimationFrame(frame)
      window.removeEventListener('scroll', onScroll)
      window.removeEventListener('resize', onScroll)
    }
  }, [node])

  return { ref, progress }
}

/** Pointer position within an element, normalised to -1 → 1 on both axes. */
export function usePointerField<T extends HTMLElement>() {
  const [node, setNode] = useState<T | null>(null)
  const ref = useCallback((el: T | null) => setNode(el), [])
  const [point, setPoint] = useState({ x: 0, y: 0, active: false })

  useEffect(() => {
    if (!node) return
    const onMove = (e: PointerEvent) => {
      const rect = node.getBoundingClientRect()
      setPoint({
        x: ((e.clientX - rect.left) / rect.width) * 2 - 1,
        y: ((e.clientY - rect.top) / rect.height) * 2 - 1,
        active: true,
      })
    }
    const onLeave = () => setPoint((p) => ({ ...p, active: false }))
    node.addEventListener('pointermove', onMove)
    node.addEventListener('pointerleave', onLeave)
    return () => {
      node.removeEventListener('pointermove', onMove)
      node.removeEventListener('pointerleave', onLeave)
    }
  }, [node])

  return { ref, point }
}

export const lerp = (a: number, b: number, t: number) => a + (b - a) * t
export const clamp01 = (v: number) => Math.min(1, Math.max(0, v))

/** Maps a global 0→1 progress onto one stage of an n-stage sequence. */
export const stageProgress = (progress: number, index: number, count: number) =>
  clamp01(progress * count - index)
