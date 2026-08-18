import type { TRL } from '../../data/models'

interface Props {
  entry: TRL
  current: TRL
  target: TRL
  invert?: boolean
  showLegend?: boolean
}

/**
 * TRL 1–9 as a real scale rather than a badge.
 *
 * Three marks read at once: where the technology entered, where it is now,
 * and where development is aimed. The span between entry and current is the
 * value InThinks has added — which is the whole argument of the business.
 */
export default function TrlScale({ entry, current, target, invert = false, showLegend = true }: Props) {
  const levels = [1, 2, 3, 4, 5, 6, 7, 8, 9] as const
  const rule = invert ? 'var(--rule-invert)' : 'var(--rule)'

  return (
    <div>
      <div className="flex gap-1" role="img" aria-label={`Technology readiness: entered at TRL ${entry}, currently TRL ${current}, target TRL ${target}`}>
        {levels.map((level) => {
          const added = level > entry && level <= current
          const reached = level <= entry
          const planned = level > current && level <= target
          return (
            <div key={level} className="flex-1">
              <div
                className="h-8 transition-colors duration-500"
                style={{
                  background: added
                    ? 'var(--color-accent)'
                    : reached
                      ? invert ? 'rgba(255,255,255,0.34)' : 'var(--color-muted)'
                      : 'transparent',
                  border: `1px solid ${planned ? 'var(--color-accent)' : rule}`,
                  borderStyle: planned ? 'dashed' : 'solid',
                }}
              />
              <span
                className="label mt-1.5 block text-center"
                style={{
                  color:
                    level === current
                      ? 'var(--color-accent)'
                      : invert ? 'rgba(255,255,255,0.4)' : 'var(--color-faint)',
                }}
              >
                {level}
              </span>
            </div>
          )
        })}
      </div>

      {showLegend && (
        <ul className="label mt-4 flex flex-wrap gap-x-6 gap-y-2" style={{ color: invert ? 'rgba(255,255,255,0.5)' : 'var(--color-muted)' }}>
          <li className="flex items-center gap-2">
            <span className="h-2.5 w-2.5" style={{ background: invert ? 'rgba(255,255,255,0.34)' : 'var(--color-muted)' }} />
            Entry TRL {entry}
          </li>
          <li className="flex items-center gap-2">
            <span className="h-2.5 w-2.5" style={{ background: 'var(--color-accent)' }} />
            Advanced by InThinks — now TRL {current}
          </li>
          <li className="flex items-center gap-2">
            <span className="h-2.5 w-2.5" style={{ border: '1px dashed var(--color-accent)' }} />
            Target TRL {target}
          </li>
        </ul>
      )}
    </div>
  )
}
