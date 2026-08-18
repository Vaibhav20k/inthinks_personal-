import { useEffect, useState } from 'react'
import { usePointerField, usePrefersReducedMotion } from '../../lib/motion'

/**
 * THE INTHINKS MATCHFIELD
 *
 * Two ecosystems and the company between them. Industrial challenges on the
 * left, emerging technologies on the right, InThinks on the centre axis.
 *
 * Every node is a labelled real thing and every line means "this problem could
 * be answered by that technology" — it is a relationship diagram, not a
 * particle field and not a neural network. Each latent link is drawn only
 * between plausible neighbours, so the field stays legible rather than becoming
 * a mesh.
 *
 * The figure cycles through qualified matches. One pair resolves, its path is
 * drawn through the centre axis, the rest of the field recedes, and the three
 * stages that follow a match run underneath. Pointer height biases which row is
 * interrogated, so moving across the field reads as questioning it.
 */

const CHALLENGES = ['THERMAL LOSS', 'CORROSION', 'PROCESS YIELD', 'ENERGY COST', 'EFFLUENT LOAD']
const INNOVATIONS = ['INT / MAT / 024', 'INT / MFG / 041', 'INT / ELC / 056', 'INT / ENR / 017', 'INT / CLN / 032']

/** Qualified pairs, so the figure never draws a match that makes no sense. */
const PAIRS: [number, number][] = [[0, 0], [1, 1], [2, 2], [3, 3], [4, 4]]

/**
 * Latent links: each challenge reaches only its plausible neighbours. Drawing
 * every pair would be 25 lines and would read as a mesh.
 */
const LATENT: [number, number][] = [
  [0, 0], [0, 2], [1, 1], [1, 3], [2, 2], [2, 1],
  [3, 3], [3, 0], [4, 4], [4, 2],
]

const STAGES = ['DEVELOP', 'VALIDATE', 'TRANSFER']

const W = 1000
const H = 620
const NODE_W = 156
const NODE_H = 34
const LEFT_X = 150
const RIGHT_X = W - 150
const CENTER_X = W / 2
const ROW_TOP = 104
const ROW_GAP = 84
const FIELD_BOTTOM = ROW_TOP + 4 * ROW_GAP + 44

const rowY = (i: number) => ROW_TOP + i * ROW_GAP

export default function Matchfield() {
  const reduced = usePrefersReducedMotion()
  const { ref, point } = usePointerField<HTMLDivElement>()
  const [active, setActive] = useState(0)
  /** 0 → 1 within the current match: draw the path, lock it, run the stages. */
  const [phase, setPhase] = useState(reduced ? 1 : 0)

  useEffect(() => {
    if (reduced) {
      setPhase(1)
      return
    }
    let raf = 0
    let start = performance.now()
    const DURATION = 4600

    const tick = (now: number) => {
      const t = (now - start) / DURATION
      if (t >= 1) {
        start = now
        setActive((a) => (a + 1) % PAIRS.length)
        setPhase(0)
      } else {
        setPhase(t)
      }
      raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [reduced])

  useEffect(() => {
    if (reduced || !point.active) return
    const row = Math.round(((point.y + 1) / 2) * (PAIRS.length - 1))
    setActive(Math.min(PAIRS.length - 1, Math.max(0, row)))
  }, [point.active, point.y, reduced])

  const [ci, ti] = PAIRS[active]
  const draw = Math.min(1, phase / 0.4)
  const locked = phase > 0.4
  const stageRun = Math.max(0, (phase - 0.45) / 0.5)

  const cy = rowY(ci)
  const ty = rowY(ti)
  const midY = (cy + ty) / 2

  const leftEdge = LEFT_X + NODE_W / 2
  const rightEdge = RIGHT_X - NODE_W / 2

  return (
    <div ref={ref} className="w-full">
      <svg
        viewBox={`0 0 ${W} ${H}`}
        className="h-auto w-full"
        role="img"
        aria-label="The InThinks Matchfield: industrial challenges on the left, emerging technologies on the right. Relationships resolve to one qualified match, which then runs through develop, validate and transfer."
      >
        {/* Column headers */}
        <text x={LEFT_X} y="44" textAnchor="middle" className="mf-head">INDUSTRIAL CHALLENGES</text>
        <text x={CENTER_X} y="44" textAnchor="middle" className="mf-head">INTHINKS</text>
        <text x={RIGHT_X} y="44" textAnchor="middle" className="mf-head">EMERGING TECHNOLOGIES</text>
        <line x1="40" y1="62" x2={W - 40} y2="62" className="mf-rule" />

        {/* The InThinks axis — every match is routed through it */}
        <line x1={CENTER_X} y1="78" x2={CENTER_X} y2={FIELD_BOTTOM} className="mf-axis" />

        {/* Latent relationships */}
        {LATENT.map(([i, j]) => {
          if (i === ci && j === ti) return null
          return (
            <path
              key={`latent-${i}-${j}`}
              d={`M ${leftEdge} ${rowY(i)} Q ${CENTER_X} ${(rowY(i) + rowY(j)) / 2} ${rightEdge} ${rowY(j)}`}
              className="mf-latent"
              style={{ opacity: locked ? 0.1 : 0.22 }}
            />
          )
        })}

        {/* The qualified match, drawn through the centre */}
        <path
          d={`M ${leftEdge} ${cy} Q ${CENTER_X} ${midY} ${rightEdge} ${ty}`}
          className="mf-match"
          pathLength={1}
          strokeDasharray="1"
          strokeDashoffset={1 - draw}
        />
        {/* The point where it crosses InThinks */}
        <circle
          cx={CENTER_X}
          cy={midY}
          r="4"
          className="mf-hinge"
          style={{ opacity: draw > 0.5 ? 1 : 0 }}
        />

        {/* Challenge nodes */}
        {CHALLENGES.map((label, i) => {
          const on = i === ci
          return (
            <g key={label}>
              <rect
                x={LEFT_X - NODE_W / 2}
                y={rowY(i) - NODE_H / 2}
                width={NODE_W}
                height={NODE_H}
                className={on ? 'mf-node-on' : 'mf-node'}
              />
              <text x={LEFT_X} y={rowY(i) + 4} textAnchor="middle" className={on ? 'mf-label-on' : 'mf-label'}>
                {label}
              </text>
            </g>
          )
        })}

        {/* Technology nodes */}
        {INNOVATIONS.map((label, j) => {
          const on = j === ti
          return (
            <g key={label}>
              <rect
                x={RIGHT_X - NODE_W / 2}
                y={rowY(j) - NODE_H / 2}
                width={NODE_W}
                height={NODE_H}
                className={on ? 'mf-node-on' : 'mf-node'}
              />
              <text x={RIGHT_X} y={rowY(j) + 4} textAnchor="middle" className={on ? 'mf-label-on' : 'mf-label'}>
                {label}
              </text>
            </g>
          )
        })}

        {/* Readout sits below the field, so nothing overlaps the relationships */}
        <line x1="40" y1={FIELD_BOTTOM} x2={W - 40} y2={FIELD_BOTTOM} className="mf-rule" />

        <g style={{ opacity: locked ? 1 : 0.22, transition: 'opacity 400ms' }}>
          <rect x={CENTER_X - 92} y={FIELD_BOTTOM + 22} width="184" height="30" className="mf-status" />
          <text x={CENTER_X} y={FIELD_BOTTOM + 42} textAnchor="middle" className="mf-status-text">
            MATCH IDENTIFIED
          </text>
        </g>

        {/* The three stages a qualified match then runs through */}
        {STAGES.map((stage, s) => {
          const lit = stageRun > s / STAGES.length
          const spacing = 210
          const x = CENTER_X + (s - 1) * spacing
          const y = FIELD_BOTTOM + 92
          return (
            <g key={stage}>
              <rect x={x - 7} y={y - 7} width="14" height="14" className={lit ? 'mf-stage-on' : 'mf-stage'} />
              <text x={x} y={y + 30} textAnchor="middle" className={lit ? 'mf-label-on' : 'mf-label'}>
                {stage}
              </text>
              {s < STAGES.length - 1 && (
                <line
                  x1={x + 14}
                  y1={y}
                  x2={x + spacing - 14}
                  y2={y}
                  className={lit ? 'mf-flow-on' : 'mf-flow'}
                />
              )}
            </g>
          )
        })}

        <style>{`
          .mf-head {
            font: 500 11px var(--font-mono);
            letter-spacing: 0.15em;
            fill: var(--color-faint);
          }
          .mf-rule { stroke: var(--rule); stroke-width: 1; }
          .mf-axis { stroke: var(--rule-strong); stroke-width: 1; stroke-dasharray: 3 5; }
          .mf-latent {
            fill: none;
            stroke: var(--color-ink);
            stroke-width: 1;
            transition: opacity 500ms var(--ease-out-quint);
          }
          .mf-match { fill: none; stroke: var(--color-accent); stroke-width: 1.75; }
          .mf-hinge { fill: var(--color-accent); transition: opacity 300ms; }
          .mf-node { fill: var(--color-paper); stroke: var(--rule-strong); stroke-width: 1; }
          .mf-node-on { fill: var(--color-paper); stroke: var(--color-accent); stroke-width: 1.5; }
          .mf-label {
            font: 500 10.5px var(--font-mono);
            letter-spacing: 0.1em;
            fill: var(--color-muted);
          }
          .mf-label-on {
            font: 500 10.5px var(--font-mono);
            letter-spacing: 0.1em;
            fill: var(--color-accent);
          }
          .mf-status { fill: none; stroke: var(--color-accent); stroke-width: 1; }
          .mf-status-text {
            font: 500 10.5px var(--font-mono);
            letter-spacing: 0.15em;
            fill: var(--color-accent);
          }
          .mf-stage { fill: none; stroke: var(--rule-strong); stroke-width: 1; }
          .mf-stage-on { fill: var(--color-accent); stroke: var(--color-accent); }
          .mf-flow { stroke: var(--rule-strong); stroke-width: 1; }
          .mf-flow-on { stroke: var(--color-accent); stroke-width: 1; }
        `}</style>
      </svg>
    </div>
  )
}
