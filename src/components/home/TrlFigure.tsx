import { clamp01, lerp, stageProgress } from '../../lib/motion'

const INK = 'var(--color-ink)'
const ACCENT = 'var(--color-accent)'
const RULE = 'var(--rule)'

interface Props {
  /** 0 → 1 across the seven pipeline stages. */
  progress: number
}

/**
 * One object, maturing.
 *
 * A rough sketched form at TRL 1–3 becomes a dimensioned, toleranced,
 * qualified industrial part by TRL 7–9. Each stage adds what that stage
 * actually contributes: evaluation adds a boundary, acquisition adds
 * ownership, development regularises the geometry, validation adds
 * measurement, industrialisation adds tolerance and datum, transfer adds
 * the qualification stamp. Nothing is decorative.
 */
export default function TrlFigure({ progress }: Props) {
  const s = (i: number) => stageProgress(progress, i, 7)

  const discover = s(0)
  const evaluate = s(1)
  const acquire = s(2)
  const develop = s(3)
  const validate = s(4)
  const industrialise = s(5)
  const transfer = s(6)

  // The form resolves from a hand-loose outline into exact geometry as
  // development proceeds.
  const rough: [number, number][] = [
    [96, 158], [186, 132], [268, 166], [286, 246], [212, 292], [118, 268],
  ]
  const exact: [number, number][] = [
    [104, 152], [200, 128], [280, 168], [280, 248], [200, 288], [104, 264],
  ]
  const t = develop * develop * (3 - 2 * develop)
  const pts = rough.map(([x, y], i) => [
    lerp(x, exact[i][0], t),
    lerp(y, exact[i][1], t),
  ])
  const poly = pts.map(([x, y]) => `${x.toFixed(1)},${y.toFixed(1)}`).join(' ')

  return (
    <svg viewBox="0 0 480 420" aria-hidden="true" className="h-auto w-full">
      {/* 01 DISCOVER — the form is noticed before it is understood */}
      <polygon
        points={poly}
        fill="none"
        stroke={INK}
        strokeWidth="1.25"
        strokeDasharray={develop > 0.6 ? '0' : '5 4'}
        opacity={clamp01(discover * 2) * 0.75}
      />

      {/* 02 EVALUATE — a boundary is drawn around it and it is assessed */}
      <g opacity={clamp01(evaluate * 2)}>
        <rect x="72" y="104" width="240" height="208" fill="none" stroke={RULE} strokeWidth="1" />
        {['NOVELTY', 'MERIT', 'IP', 'FEASIBILITY'].map((k, i) => (
          <g key={k}>
            <text x="330" y={126 + i * 22} className="trl-meta" opacity={clamp01(evaluate * 3 - i * 0.4)}>
              {k}
            </text>
            <line
              x1="312"
              y1={122 + i * 22}
              x2="324"
              y2={122 + i * 22}
              stroke={RULE}
              strokeWidth="1"
              opacity={clamp01(evaluate * 3 - i * 0.4)}
            />
          </g>
        ))}
      </g>

      {/* 03 ACQUIRE — it enters the portfolio and gets an identity */}
      <g opacity={clamp01(acquire * 2)}>
        <rect x="72" y="76" width="120" height="22" fill={ACCENT} />
        <text x="80" y="91" className="trl-id">INT / — / ###</text>
      </g>

      {/* 04 DEVELOP — the geometry becomes exact, internal structure appears */}
      <g opacity={clamp01(develop * 1.6)}>
        {pts.map(([x, y], i) => (
          <line
            key={`spoke-${i}`}
            x1={192}
            y1={208}
            x2={x}
            y2={y}
            stroke={INK}
            strokeWidth="1"
            opacity="0.22"
          />
        ))}
        <polygon points={poly} fill={ACCENT} opacity={develop * 0.06} />
      </g>

      {/* 05 VALIDATE — it is measured against a requirement */}
      <g opacity={clamp01(validate * 2)}>
        <line x1="104" y1="332" x2="280" y2="332" stroke={INK} strokeWidth="1" opacity="0.5" />
        <line x1="104" y1="326" x2="104" y2="338" stroke={INK} strokeWidth="1" opacity="0.5" />
        <line x1="280" y1="326" x2="280" y2="338" stroke={INK} strokeWidth="1" opacity="0.5" />
        <text x="192" y="352" textAnchor="middle" className="trl-meta">MEASURED AGAINST REQUIREMENT</text>
      </g>

      {/* 06 INDUSTRIALISE — tolerance, datum, manufacturability */}
      <g opacity={clamp01(industrialise * 2)}>
        {pts.map(([x, y], i) => (
          <rect key={`datum-${i}`} x={x - 3} y={y - 3} width="6" height="6" fill="none" stroke={ACCENT} strokeWidth="1" />
        ))}
        <text x="330" y="228" className="trl-meta">TOLERANCE</text>
        <text x="330" y="250" className="trl-meta">MANUFACTURABILITY</text>
        <text x="330" y="272" className="trl-meta">COST AT VOLUME</text>
      </g>

      {/* 07 TRANSFER — qualified, and released */}
      <g opacity={clamp01(transfer * 1.8)}>
        <rect x="330" y="300" width="118" height="26" fill="none" stroke={ACCENT} strokeWidth="1.25" />
        <text x="340" y="317" className="trl-id-accent">TRANSFER READY</text>
        <line x1="292" y1="208" x2="440" y2="208" stroke={ACCENT} strokeWidth="1" strokeDasharray="4 3" />
        <path d="M 440 208 l -8 -4 v 8 z" fill={ACCENT} />
      </g>

      <style>{`
        .trl-meta {
          font: 500 9px var(--font-mono);
          letter-spacing: 0.13em;
          fill: var(--color-faint);
        }
        .trl-id {
          font: 500 10px var(--font-mono);
          letter-spacing: 0.1em;
          fill: #fff;
        }
        .trl-id-accent {
          font: 500 10px var(--font-mono);
          letter-spacing: 0.13em;
          fill: var(--color-accent);
        }
      `}</style>
    </svg>
  )
}
