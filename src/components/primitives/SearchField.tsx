import { useId } from 'react'

/**
 * The search box each Explorer carries.
 *
 * One component so all three behave identically — same clear affordance, same
 * live count wiring, same keyboard behaviour. Escape clears, because a reader
 * who has filtered down to nothing reaches for Escape before they reach for
 * the mouse.
 */
export default function SearchField({
  value,
  onChange,
  label,
  placeholder,
}: {
  value: string
  onChange: (v: string) => void
  label: string
  placeholder: string
}) {
  const id = useId()
  return (
    <div>
      <label htmlFor={id} className="label" style={{ color: 'var(--color-faint)' }}>
        {label.toUpperCase()}
      </label>
      <div className="relative mt-2.5">
        <input
          id={id}
          type="search"
          value={value}
          placeholder={placeholder}
          onChange={(e) => onChange(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Escape') onChange('') }}
          className="field-input py-2.5 pr-9 text-[0.9375rem]"
          autoComplete="off"
        />
        {value !== '' && (
          <button
            type="button"
            onClick={() => onChange('')}
            aria-label="Clear search"
            className="tap absolute right-0 top-0 flex h-full w-9 items-center justify-center transition-colors duration-250 hover:text-accent"
            style={{ color: 'var(--color-faint)' }}
          >
            <svg viewBox="0 0 16 16" width="12" height="12" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden="true">
              <path d="m3 3 10 10M13 3 3 13" />
            </svg>
          </button>
        )}
      </div>
    </div>
  )
}
