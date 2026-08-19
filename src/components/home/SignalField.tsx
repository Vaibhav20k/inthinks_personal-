import { useCallback, useEffect, useRef, useState } from 'react'
import PointerLabel from '../primitives/PointerLabel'
import { demandSignals, qualifiedPairs, technologySignals } from '../../data/signals'
import type { Signal } from '../../data/signals'
import { useMediaQuery, usePrefersReducedMotion } from '../../lib/motion'

/**
 * THE INNOVATION SIGNAL
 *
 * The hero's field, and the visual thesis of the site: industry emits problem
 * signals, researchers emit technology signals, and InThinks resolves one
 * meaningful connection out of the noise.
 *
 * Nodes are real HTML buttons rather than SVG shapes, and the connection paths
 * are computed from their measured positions. That costs a measurement pass,
 * and buys keyboard focus, screen-reader labels and responsive reflow for
 * free — a field drawn entirely in SVG would have none of those.
 *
 * Pointer behaviour follows the brief: nodes never chase the cursor. Hovering
 * shifts which relationship is in focus and reveals that node's metadata.
 */

interface Point { x: number; y: number }

export default function SignalField() {
  const reduced = usePrefersReducedMotion()
  const isDesktop = useMediaQuery('(width >= 64rem)')
  const frameRef = useRef<HTMLDivElement>(null)
  const demandRefs = useRef<(HTMLButtonElement | null)[]>([])
  const technologyRefs = useRef<(HTMLButtonElement | null)[]>([])

  const [active, setActive] = useState(0)
  const [held, setHeld] = useState<{ side: 'demand' | 'technology'; index: number } | null>(null)
  const [left, setLeft] = useState<Point[]>([])
  const [right, setRight] = useState<Point[]>([])
  const [size, setSize] = useState({ width: 0, height: 0 })
  /** 0 → 1 for the current resolution: search, then lock. */
  const [phase, setPhase] = useState(reduced ? 1 : 0)

  /** Measures node anchor points relative to the field. */
  const measure = useCallback(() => {
    const frame = frameRef.current
    if (!frame) return
    const box = frame.getBoundingClientRect()
    setSize({ width: box.width, height: box.height })

    const anchor = (el: HTMLButtonElement | null, edge: 'right' | 'left'): Point | null => {
      if (!el) return null
      const r = el.getBoundingClientRect()
      return {
        x: (edge === 'right' ? r.right : r.left) - box.left,
        y: r.top + r.height / 2 - box.top,
      }
    }

    setLeft(demandRefs.current.map((el) => anchor(el, 'right')).filter((p): p is Point => p !== null))
    setRight(technologyRefs.current.map((el) => anchor(el, 'left')).filter((p): p is Point => p !== null))
  }, [])

  useEffect(() => {
    measure()
    const observer = new ResizeObserver(measure)
    if (frameRef.current) observer.observe(frameRef.current)
    window.addEventListener('resize', measure)
    // Anchors move once the webfont swaps in and reflows the labels.
    document.fonts?.ready.then(measure).catch(() => undefined)
    return () => {
      observer.disconnect()
      window.removeEventListener('resize', measure)
    }
  }, [measure])

  // Cycle through qualified connections. Holding a node pins the cycle.
  useEffect(() => {
    if (reduced || held) {
      setPhase(1)
      return
    }
    let raf = 0
    let start = performance.now()
    const DURATION = 5200
    const tick = (now: number) => {
      const t = (now - start) / DURATION
      if (t >= 1) {
        start = now
        setActive((a) => (a + 1) % qualifiedPairs.length)
        setPhase(0)
      } else {
        setPhase(t)
      }
      raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [reduced, held])

  // Holding a node selects the connection that involves it.
  useEffect(() => {
    if (!held) return
    const index = qualifiedPairs.findIndex((p) =>
      held.side === 'demand' ? p.demand === held.index : p.technology === held.index,
    )
    if (index >= 0) setActive(index)
  }, [held])

  const pair = qualifiedPairs[active]
  const draw = Math.min(1, phase / 0.42)
  const locked = phase > 0.42 || Boolean(held) || reduced

  const from = left[pair.demand]
  const to = right[pair.technology]

  const metadataFor = (): { signal: Signal; side: 'demand' | 'technology' } | null => {
    if (!held) return null
    return {
      signal: held.side === 'demand' ? demandSignals[held.index] : technologySignals[held.index],
      side: held.side,
    }
  }
  const metadata = metadataFor()

  const node = (
    signal: Signal,
    index: number,
    side: 'demand' | 'technology',
  ) => {
    const isActive = side === 'demand' ? index === pair.demand : index === pair.technology
    return (
      <li key={signal.id}>
        <button
          type="button"
          ref={(el) => {
            if (side === 'demand') demandRefs.current[index] = el
            else technologyRefs.current[index] = el
          }}
          onMouseEnter={() => isDesktop && setHeld({ side, index })}
          onMouseLeave={() => isDesktop && setHeld(null)}
          onFocus={() => setHeld({ side, index })}
          onBlur={() => setHeld(null)}
          aria-label={`${signal.label} — ${signal.meta.map(([k, v]) => `${k} ${v}`).join(', ')}`}
          className="label w-full px-3 py-2.5 text-left transition-colors duration-500 lg:w-auto"
          style={{
            border: `1px solid ${isActive && locked ? 'var(--color-accent)' : 'var(--rule)'}`,
            color: isActive && locked ? 'var(--color-accent)' : 'var(--color-muted)',
            background: 'var(--color-paper)',
          }}
        >
          {signal.label.toUpperCase()}
        </button>
      </li>
    )
  }

  return (
    <PointerLabel label="CONNECT">
    <div ref={frameRef} className="relative">
      {/* Connections, drawn behind the nodes from their measured anchors. */}
      {size.width > 0 && (
        <svg
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 h-full w-full"
          viewBox={`0 0 ${size.width} ${size.height}`}
          style={{ zIndex: 0 }}
        >
          {/* Latent relationships — the noise a signal is resolved out of. */}
          {left.map((a, i) =>
            right.map((b, j) => {
              if (i === pair.demand && j === pair.technology) return null
              const mid = (a.x + b.x) / 2
              return (
                <path
                  key={`latent-${i}-${j}`}
                  d={`M ${a.x} ${a.y} C ${mid} ${a.y}, ${mid} ${b.y}, ${b.x} ${b.y}`}
                  fill="none"
                  stroke="var(--color-ink)"
                  strokeWidth="1"
                  style={{
                    opacity: locked ? 0.05 : 0.12,
                    transition: 'opacity 900ms var(--ease-instrument)',
                  }}
                />
              )
            }),
          )}

          {/* The qualified connection. */}
          {from && to && (
            <>
              <path
                d={`M ${from.x} ${from.y} C ${(from.x + to.x) / 2} ${from.y}, ${(from.x + to.x) / 2} ${to.y}, ${to.x} ${to.y}`}
                fill="none"
                stroke="var(--color-accent)"
                strokeWidth="1.5"
                pathLength={1}
                strokeDasharray="1"
                strokeDashoffset={1 - draw}
              />
              <circle cx={from.x} cy={from.y} r="3" fill="var(--color-accent)" opacity={draw} />
              <circle cx={to.x} cy={to.y} r="3" fill="var(--color-accent)" opacity={draw > 0.9 ? 1 : 0} />
            </>
          )}
        </svg>
      )}

      <div className="relative grid gap-8 lg:grid-cols-[minmax(0,10rem)_1fr_minmax(0,10rem)] lg:gap-6" style={{ zIndex: 1 }}>
        {/* Left — industrial demand */}
        <div>
          <p className="label mb-4" style={{ color: 'var(--color-faint)' }}>INDUSTRIAL DEMAND</p>
          <ul className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-1">
            {demandSignals.map((s, i) => node(s, i, 'demand'))}
          </ul>
        </div>

        {/* Centre — the readout that names what just resolved */}
        <div className="flex flex-col items-center justify-center py-6 text-center lg:py-0">
          <p
            className="label transition-opacity duration-700"
            style={{ color: 'var(--color-accent)', opacity: locked ? 1 : 0.25 }}
          >
            QUALIFIED CONNECTION
          </p>
          <p
            className="ident mt-3 text-[1.0625rem] transition-opacity duration-700"
            style={{ opacity: locked ? 1 : 0 }}
          >
            {pair.id}
          </p>

          {/* Metadata for the held node — revealed, not chased. */}
          <div className="mt-6 min-h-[6.5rem] w-full max-w-[16rem]">
            {metadata ? (
              <dl
                className="px-3 py-3 text-left"
                style={{ border: '1px solid var(--rule-strong)', background: 'var(--color-paper)' }}
              >
                <p className="label" style={{ color: 'var(--color-accent)' }}>
                  {metadata.signal.label.toUpperCase()}
                </p>
                {metadata.signal.meta.map(([k, v]) => (
                  <div key={k} className="label mt-1.5 flex justify-between gap-3">
                    <dt style={{ color: 'var(--color-faint)' }}>{k}</dt>
                    <dd style={{ color: 'var(--color-muted)' }}>{v}</dd>
                  </div>
                ))}
              </dl>
            ) : (
              isDesktop && (
                <p className="label" style={{ color: 'var(--color-faint)' }}>
                  HOVER A SIGNAL FOR DETAIL
                </p>
              )
            )}
          </div>
        </div>

        {/* Right — emerging technology */}
        <div>
          <p className="label mb-4 lg:text-right" style={{ color: 'var(--color-faint)' }}>EMERGING TECHNOLOGY</p>
          <ul className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-1">
            {technologySignals.map((s, i) => node(s, i, 'technology'))}
          </ul>
        </div>
      </div>
    </div>
    </PointerLabel>
  )
}
