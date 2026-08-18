import { useMemo } from 'react'
import type { Domain } from '../data/domains'

/** Deterministic PRNG so a given seed always draws the same figure. */
function rng(seed: number) {
  let s = seed * 9301 + 49297
  return () => {
    s = (s * 9301 + 49297) % 233280
    return s / 233280
  }
}

const INK = 'var(--color-ink)'
const ACCENT = 'var(--color-accent)'

interface Props {
  kind: Domain['figure']
  seed: number
  className?: string
}

/**
 * Abstract technical figures — drawn, not photographed. The brief rules out
 * stock imagery and fake laboratory photography, so every visual on the page
 * is generated geometry in the same drafting language as the rest of the site.
 */
export default function TechFigure({ kind, seed, className = '' }: Props) {
  const elements = useMemo(() => {
    const r = rng(seed)
    const nodes: React.ReactNode[] = []

    switch (kind) {
      case 'lattice': {
        const step = 30
        for (let x = 20; x <= 220; x += step) {
          for (let y = 20; y <= 160; y += step) {
            const jitter = r() * 4 - 2
            nodes.push(<circle key={`n${x}-${y}`} cx={x + jitter} cy={y + jitter} r="1.8" fill={INK} opacity="0.55" />)
            if (x + step <= 220) nodes.push(<line key={`h${x}-${y}`} x1={x} y1={y} x2={x + step} y2={y} stroke={INK} strokeWidth="0.75" opacity="0.28" />)
            if (y + step <= 160) nodes.push(<line key={`v${x}-${y}`} x1={x} y1={y} x2={x} y2={y + step} stroke={INK} strokeWidth="0.75" opacity="0.28" />)
          }
        }
        nodes.push(<circle key="hot" cx="110" cy="80" r="5" fill="none" stroke={ACCENT} strokeWidth="1.25" />)
        break
      }
      case 'flow': {
        for (let i = 0; i < 7; i++) {
          const y = 26 + i * 22
          nodes.push(
            <path
              key={`f${i}`}
              d={`M14 ${y} C 70 ${y - 18 - r() * 14}, 150 ${y + 18 + r() * 14}, 226 ${y}`}
              fill="none"
              stroke={i === 3 ? ACCENT : INK}
              strokeWidth={i === 3 ? 1.25 : 0.75}
              opacity={i === 3 ? 0.9 : 0.32}
            />,
          )
        }
        break
      }
      case 'wave': {
        for (let i = 0; i < 5; i++) {
          const amp = 10 + i * 9
          const pts: string[] = []
          for (let x = 14; x <= 226; x += 4) {
            pts.push(`${x},${(90 + Math.sin((x / 226) * Math.PI * (2 + i * 0.6)) * amp).toFixed(1)}`)
          }
          nodes.push(<polyline key={`w${i}`} points={pts.join(' ')} fill="none" stroke={i === 2 ? ACCENT : INK} strokeWidth={i === 2 ? 1.25 : 0.75} opacity={i === 2 ? 0.9 : 0.26} />)
        }
        break
      }
      case 'stack': {
        for (let i = 0; i < 6; i++) {
          const h = 14 + r() * 10
          const y = 24 + i * 24
          nodes.push(<rect key={`s${i}`} x={24 + i * 6} y={y} width={170 - i * 8} height={h} fill="none" stroke={i === 2 ? ACCENT : INK} strokeWidth={i === 2 ? 1.25 : 0.75} opacity={i === 2 ? 0.9 : 0.35} />)
        }
        break
      }
      case 'grid': {
        for (let i = 0; i < 5; i++) {
          for (let j = 0; j < 4; j++) {
            const skip = r() > 0.78
            if (skip) continue
            nodes.push(<rect key={`g${i}-${j}`} x={24 + i * 38} y={26 + j * 34} width="30" height="26" fill="none" stroke={INK} strokeWidth="0.75" opacity="0.4" />)
          }
        }
        nodes.push(<rect key="ghot" x="100" y="94" width="30" height="26" fill="none" stroke={ACCENT} strokeWidth="1.25" />)
        break
      }
      case 'orbit': {
        for (let i = 0; i < 4; i++) {
          nodes.push(<ellipse key={`o${i}`} cx="120" cy="90" rx={30 + i * 24} ry={16 + i * 13} fill="none" stroke={INK} strokeWidth="0.75" opacity="0.3" />)
        }
        nodes.push(<circle key="core" cx="120" cy="90" r="4" fill={ACCENT} />)
        nodes.push(<circle key="sat" cx="192" cy="90" r="2.5" fill={INK} opacity="0.7" />)
        break
      }
      case 'branch': {
        const draw = (x: number, y: number, len: number, ang: number, depth: number, key: string) => {
          if (depth === 0) return
          const x2 = x + Math.cos(ang) * len
          const y2 = y + Math.sin(ang) * len
          nodes.push(<line key={key} x1={x} y1={y} x2={x2} y2={y2} stroke={depth === 1 ? ACCENT : INK} strokeWidth="0.85" opacity={depth === 1 ? 0.8 : 0.38} />)
          draw(x2, y2, len * 0.72, ang - 0.5 - r() * 0.2, depth - 1, `${key}a`)
          draw(x2, y2, len * 0.72, ang + 0.5 + r() * 0.2, depth - 1, `${key}b`)
        }
        draw(24, 90, 46, 0, 4, 'b')
        break
      }
      case 'field': {
        for (let i = 0; i < 46; i++) {
          const x = 18 + r() * 210
          const y = 18 + r() * 144
          const len = 6 + r() * 10
          const ang = (x / 240) * Math.PI
          nodes.push(<line key={`fd${i}`} x1={x} y1={y} x2={x + Math.cos(ang) * len} y2={y + Math.sin(ang) * len} stroke={i % 11 === 0 ? ACCENT : INK} strokeWidth="0.85" opacity={i % 11 === 0 ? 0.9 : 0.3} />)
        }
        break
      }
      case 'helix': {
        for (let i = 0; i < 26; i++) {
          const t = i / 25
          const x = 20 + t * 200
          const y1 = 90 + Math.sin(t * Math.PI * 3) * 42
          const y2 = 90 - Math.sin(t * Math.PI * 3) * 42
          nodes.push(<line key={`hx${i}`} x1={x} y1={y1} x2={x} y2={y2} stroke={INK} strokeWidth="0.75" opacity="0.24" />)
          nodes.push(<circle key={`ha${i}`} cx={x} cy={y1} r="1.6" fill={i === 13 ? ACCENT : INK} opacity={i === 13 ? 1 : 0.55} />)
          nodes.push(<circle key={`hb${i}`} cx={x} cy={y2} r="1.6" fill={INK} opacity="0.55" />)
        }
        break
      }
    }
    return nodes
  }, [kind, seed])

  return (
    <svg viewBox="0 0 240 180" aria-hidden="true" className={className}>
      {elements}
    </svg>
  )
}
