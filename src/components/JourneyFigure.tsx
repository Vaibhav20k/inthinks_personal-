import { clamp01, lerp, stageProgress } from '../lib/motion'
import { outcomes } from '../data/journey'

const CX = 196
const CY = 210
const R = 104

/** Six loose hypotheses, before they resolve into anything. */
const SCATTER = [
  { x: 96, y: 128 },
  { x: 292, y: 104 },
  { x: 322, y: 236 },
  { x: 232, y: 330 },
  { x: 84, y: 300 },
  { x: 58, y: 200 },
]

/** The same six points, resolved onto a regular figure. */
const VERTICES = Array.from({ length: 6 }, (_, i) => {
  const angle = (-90 + i * 60) * (Math.PI / 180)
  return { x: CX + Math.cos(angle) * R, y: CY + Math.sin(angle) * R }
})

/** Every pair worth drawing while the points are still being investigated. */
const LINKS: [number, number][] = [
  [0, 1], [1, 2], [2, 3], [3, 4], [4, 5], [5, 0],
  [0, 3], [1, 4], [2, 5],
]

const INK = 'var(--color-ink)'
const ACCENT = 'var(--color-accent)'

interface Props {
  /** 0 → 1 across the whole seven-stage sequence. */
  progress: number
}

/**
 * Section 03's single evolving graphic.
 *
 * A dot becomes a set of hypotheses, the hypotheses gain relationships, the
 * relationships get measured, the measurement resolves into a figure, the
 * figure gains structure, and the structure branches toward its three exits.
 * Nothing is thrown away — each stage is built on what the last one left.
 */
export default function JourneyFigure({ progress }: Props) {
  const s = (i: number) => stageProgress(progress, i, 7)

  const observe = s(0)
  const imagine = s(1)
  const investigate = s(2)
  const experiment = s(3)
  const invent = s(4)
  const productise = s(5)
  const transfer = s(6)

  // Points travel from scatter to figure across the INVENT stage.
  const points = SCATTER.map((p, i) => ({
    x: lerp(p.x, VERTICES[i].x, invent),
    y: lerp(p.y, VERTICES[i].y, invent),
  }))

  const polygon = points.map((p) => `${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' ')

  return (
    // The viewBox reserves the right-hand strip for the three transfer
    // labels, so they stay inside the figure at every width instead of
    // overflowing and being clipped by the page.
    <svg viewBox="0 0 520 420" aria-hidden="true" className="h-full w-full">
      {/* 01 OBSERVE — a single point of attention, and the sweep that found it */}
      <circle
        cx={CX}
        cy={CY}
        r={lerp(6, 128, clamp01(observe))}
        fill="none"
        stroke={INK}
        strokeWidth="1"
        opacity={observe * (1 - observe) * 1.6}
      />
      <circle
        cx={CX}
        cy={CY}
        r={3.5}
        fill={ACCENT}
        opacity={clamp01(observe * 3) * (1 - invent * 0.75)}
      />

      {/* 02 IMAGINE — hypotheses, still unattached */}
      {points.map((p, i) => {
        const appear = clamp01(imagine * 6 - i * 0.55)
        return (
          <circle
            key={`pt-${i}`}
            cx={p.x}
            cy={p.y}
            r={2.6}
            fill={INK}
            opacity={appear * 0.85}
          />
        )
      })}

      {/* 03 INVESTIGATE — relationships drawn between them */}
      {LINKS.map(([a, b], i) => {
        const pa = points[a]
        const pb = points[b]
        const len = Math.hypot(pb.x - pa.x, pb.y - pa.y)
        const drawn = clamp01(investigate * 3 - i * 0.2)
        return (
          <line
            key={`ln-${i}`}
            x1={pa.x}
            y1={pa.y}
            x2={pb.x}
            y2={pb.y}
            stroke={INK}
            strokeWidth="1"
            strokeDasharray={len}
            strokeDashoffset={len * (1 - drawn)}
            opacity={0.26 * clamp01(investigate * 2) * (1 - invent * 0.55)}
          />
        )
      })}

      {/* 04 EXPERIMENT — the field gets measured */}
      <g opacity={clamp01(experiment * 2) * (1 - productise * 0.4)}>
        {[
          [40, 62], [380, 62], [40, 362], [380, 362],
        ].map(([x, y], i) => {
          const dx = x < 210 ? 1 : -1
          const dy = y < 210 ? 1 : -1
          return (
            <g key={`tick-${i}`} stroke={INK} strokeWidth="1" opacity="0.5">
              <line x1={x} y1={y} x2={x + 18 * dx} y2={y} />
              <line x1={x} y1={y} x2={x} y2={y + 18 * dy} />
            </g>
          )
        })}
        <g stroke={INK} strokeWidth="1" opacity="0.42">
          <line x1="40" y1="392" x2="380" y2="392" strokeDasharray="2 4" />
          <line x1="40" y1="386" x2="40" y2="398" />
          <line x1="380" y1="386" x2="380" y2="398" />
        </g>
        <text
          x="210"
          y="384"
          textAnchor="middle"
          fill={INK}
          opacity="0.5"
          style={{ font: '500 9px var(--font-mono)', letterSpacing: '0.14em' }}
        >
          MEASURED
        </text>
      </g>

      {/* 05 INVENT — the resolved figure */}
      <polygon
        points={polygon}
        fill="none"
        stroke={ACCENT}
        strokeWidth="1.5"
        opacity={clamp01(invent * 1.6)}
      />

      {/* 06 PRODUCTISE — structure added around the invention */}
      <g opacity={clamp01(productise * 1.5)}>
        <polygon
          points={VERTICES.map((v) => {
            const k = 1.24
            return `${(CX + (v.x - CX) * k).toFixed(1)},${(CY + (v.y - CY) * k).toFixed(1)}`
          }).join(' ')}
          fill="none"
          stroke={INK}
          strokeWidth="1"
          opacity="0.45"
        />
        {VERTICES.map((v, i) => (
          <line
            key={`spoke-${i}`}
            x1={v.x}
            y1={v.y}
            x2={CX + (v.x - CX) * 1.24}
            y2={CY + (v.y - CY) * 1.24}
            stroke={INK}
            strokeWidth="1"
            opacity="0.32"
          />
        ))}
        <polygon
          points={polygon}
          fill={ACCENT}
          opacity={productise * 0.05}
        />
      </g>

      {/* 07 TRANSFER — three exits into the world */}
      <g opacity={clamp01(transfer * 1.4)}>
        {outcomes.map((name, i) => {
          const y = 150 + i * 60
          const startX = CX + R * 1.24
          const endX = lerp(startX, 404, clamp01(transfer * 1.8 - i * 0.15))
          return (
            <g key={name}>
              <line
                x1={startX}
                y1={CY}
                x2={endX}
                y2={y}
                stroke={ACCENT}
                strokeWidth="1"
                opacity="0.75"
              />
              <circle cx={endX} cy={y} r="2.5" fill={ACCENT} />
              <text
                x={endX + 8}
                y={y + 3}
                fill={INK}
                style={{ font: '500 9px var(--font-mono)', letterSpacing: '0.14em' }}
                opacity={clamp01(transfer * 2 - i * 0.2)}
              >
                {name.toUpperCase()}
              </text>
            </g>
          )
        })}
      </g>
    </svg>
  )
}
