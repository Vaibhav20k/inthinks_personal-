import { TRL_DEFINITIONS } from '../../data/models'
import type { TRL } from '../../data/models'

interface Props {
  value: TRL | null
  onChange: (v: TRL) => void
}

/**
 * TRL 1–9 as a ladder with definitions attached.
 *
 * Most submitters have never had to place their own work on this scale, so
 * every rung carries its definition rather than hiding it behind a tooltip.
 * The 1–3 band is marked as welcome — that is where sourcing actually starts,
 * and an unmarked scale reads as a bar to clear.
 */
export default function TrlSelector({ value, onChange }: Props) {
  const levels = [1, 2, 3, 4, 5, 6, 7, 8, 9] as const

  return (
    <fieldset>
      <legend className="text-[0.9375rem] font-medium">
        Technology readiness level
        <span aria-hidden="true" style={{ color: 'var(--color-accent)' }}> *</span>
      </legend>
      <p className="mt-1.5 text-[0.8125rem] leading-relaxed" style={{ color: 'var(--color-muted)' }}>
        Early-stage technologies at TRL 1–3 are welcome — that is where most of the
        portfolio enters.
      </p>

      <ul className="mt-4">
        {levels.map((level) => {
          const on = value === level
          const early = level <= 3
          return (
            <li key={level}>
              <label
                className="flex cursor-pointer items-center gap-4 px-4 py-3 transition-colors duration-250"
                style={{
                  borderTop: '1px solid var(--rule)',
                  background: on ? 'color-mix(in oklab, var(--color-accent) 7%, transparent)' : 'transparent',
                }}
              >
                <input
                  type="radio"
                  name="trl"
                  checked={on}
                  onChange={() => onChange(level)}
                  className="sr-only"
                />
                <span
                  aria-hidden="true"
                  className="ident w-8 shrink-0"
                  style={{ color: on ? 'var(--color-accent)' : 'var(--color-faint)' }}
                >
                  {level}
                </span>
                <span className="flex-1 text-[0.9375rem]" style={{ color: on ? 'var(--color-ink)' : 'var(--color-muted)' }}>
                  {TRL_DEFINITIONS[level]}
                </span>
                {early && (
                  <span className="label shrink-0" style={{ color: 'var(--color-accent)' }}>
                    WELCOME
                  </span>
                )}
              </label>
            </li>
          )
        })}
      </ul>
    </fieldset>
  )
}
