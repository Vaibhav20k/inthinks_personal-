import { useEffect, useRef, useState } from 'react'
import { useMediaQuery, usePrefersReducedMotion } from '../../lib/motion'

interface Props {
  /** What this region does: EXPLORE, CONNECT, VIEW. */
  label: string
  children: React.ReactNode
  className?: string
}

/**
 * A cursor that names what a region does — section 25, and only where that
 * section allows it: the signal field, the technology index, the interactive
 * diagrams. The pointer is the operating system's everywhere else.
 *
 * Three conditions, all of which must hold:
 *
 *   - a fine pointer. On touch there is no cursor to transform and no hover to
 *     read, so the whole idea is meaningless.
 *   - motion is not reduced. A label chasing the pointer is exactly the sort
 *     of movement that setting exists to stop.
 *   - the pointer is inside this region.
 *
 * Position is written straight to the node's transform on a rAF, not through
 * React state. A pointermove that re-renders a subtree is how a cursor effect
 * ends up feeling heavier than the page it decorates.
 *
 * The region keeps its native cursor. Hiding it would trade a real, precise,
 * accessible pointer for a decorative one, and the label already says what the
 * region does without taking anything away.
 */
export default function PointerLabel({ label, children, className = '' }: Props) {
  const fine = useMediaQuery('(pointer: fine)')
  const reduced = usePrefersReducedMotion()
  const region = useRef<HTMLDivElement | null>(null)
  const marker = useRef<HTMLSpanElement | null>(null)
  const [inside, setInside] = useState(false)

  const enabled = fine && !reduced

  useEffect(() => {
    const el = region.current
    if (!enabled || !el) return

    let frame = 0
    let x = 0
    let y = 0

    const paint = () => {
      frame = 0
      const node = marker.current
      if (node) node.style.transform = `translate3d(${x}px, ${y}px, 0)`
    }

    const onMove = (event: PointerEvent) => {
      const box = el.getBoundingClientRect()
      x = event.clientX - box.left
      y = event.clientY - box.top
      if (!frame) frame = requestAnimationFrame(paint)
    }

    const onEnter = () => setInside(true)
    const onLeave = () => {
      setInside(false)
      if (frame) { cancelAnimationFrame(frame); frame = 0 }
    }

    el.addEventListener('pointermove', onMove)
    el.addEventListener('pointerenter', onEnter)
    el.addEventListener('pointerleave', onLeave)
    return () => {
      if (frame) cancelAnimationFrame(frame)
      el.removeEventListener('pointermove', onMove)
      el.removeEventListener('pointerenter', onEnter)
      el.removeEventListener('pointerleave', onLeave)
    }
  }, [enabled])

  return (
    <div ref={region} className={`relative ${className}`}>
      {children}
      {enabled && (
        <span
          ref={marker}
          aria-hidden="true"
          className="pointer-events-none absolute left-0 top-0 z-40 will-change-transform"
          style={{ opacity: inside ? 1 : 0, transition: 'opacity 220ms var(--ease-instrument)' }}
        >
          <span
            className="label absolute whitespace-nowrap px-2 py-1"
            style={{
              left: '14px',
              top: '10px',
              background: 'var(--color-accent)',
              color: '#fff',
            }}
          >
            {label}
          </span>
        </span>
      )}
    </div>
  )
}
