import type { ChangeEvent, ReactNode } from 'react'
import { useId } from 'react'

interface BaseProps {
  label: string
  hint?: string
  required?: boolean
  error?: string
}

function Wrapper({
  label,
  hint,
  required,
  error,
  htmlFor,
  children,
}: BaseProps & { htmlFor: string; children: ReactNode }) {
  return (
    <div>
      <label htmlFor={htmlFor} className="block text-[0.9375rem] font-medium">
        {label}
        {required && (
          <span aria-hidden="true" style={{ color: 'var(--color-accent)' }}> *</span>
        )}
        {!required && (
          <span className="label ml-2" style={{ color: 'var(--color-faint)' }}>OPTIONAL</span>
        )}
      </label>
      {hint && (
        <p className="mt-1.5 text-[0.8125rem] leading-relaxed" style={{ color: 'var(--color-muted)' }}>
          {hint}
        </p>
      )}
      <div className="mt-2.5">{children}</div>
      {error && (
        <p role="alert" className="label mt-2" style={{ color: 'var(--color-accent-deep)' }}>
          {error}
        </p>
      )}
    </div>
  )
}

interface TextProps extends BaseProps {
  value: string
  onChange: (v: string) => void
  placeholder?: string
  type?: 'text' | 'email' | 'tel' | 'url' | 'number'
  inputMode?: 'text' | 'email' | 'tel' | 'url' | 'numeric'
}

export function TextField({ value, onChange, placeholder, type = 'text', inputMode, ...base }: TextProps) {
  const id = useId()
  return (
    <Wrapper {...base} htmlFor={id}>
      <input
        id={id}
        type={type}
        inputMode={inputMode}
        value={value}
        placeholder={placeholder}
        aria-invalid={base.error ? true : undefined}
        aria-required={base.required}
        onChange={(e: ChangeEvent<HTMLInputElement>) => onChange(e.target.value)}
        className="field-input"
      />
    </Wrapper>
  )
}

interface AreaProps extends BaseProps {
  value: string
  onChange: (v: string) => void
  placeholder?: string
  rows?: number
}

export function TextArea({ value, onChange, placeholder, rows = 4, ...base }: AreaProps) {
  const id = useId()
  return (
    <Wrapper {...base} htmlFor={id}>
      <textarea
        id={id}
        rows={rows}
        value={value}
        placeholder={placeholder}
        aria-invalid={base.error ? true : undefined}
        aria-required={base.required}
        onChange={(e: ChangeEvent<HTMLTextAreaElement>) => onChange(e.target.value)}
        className="field-input resize-y"
      />
    </Wrapper>
  )
}

interface SelectProps extends BaseProps {
  value: string
  onChange: (v: string) => void
  options: readonly string[]
  placeholder?: string
}

export function SelectField({ value, onChange, options, placeholder = 'Select…', ...base }: SelectProps) {
  const id = useId()
  return (
    <Wrapper {...base} htmlFor={id}>
      <select
        id={id}
        value={value}
        aria-invalid={base.error ? true : undefined}
        aria-required={base.required}
        onChange={(e) => onChange(e.target.value)}
        className="field-input"
      >
        <option value="">{placeholder}</option>
        {options.map((o) => (
          <option key={o} value={o}>{o}</option>
        ))}
      </select>
    </Wrapper>
  )
}

interface ChoiceProps {
  legend: string
  hint?: string
  options: readonly { value: string; label: string; note?: string }[]
  selected: string[]
  onToggle: (value: string) => void
  multiple?: boolean
  required?: boolean
  error?: string
}

/** Radio or checkbox group, rendered as selectable panels rather than dots. */
export function ChoiceGroup({
  legend,
  hint,
  options,
  selected,
  onToggle,
  multiple = true,
  required,
  error,
}: ChoiceProps) {
  return (
    <fieldset>
      <legend className="text-[0.9375rem] font-medium">
        {legend}
        {required && <span aria-hidden="true" style={{ color: 'var(--color-accent)' }}> *</span>}
      </legend>
      {hint && (
        <p className="mt-1.5 text-[0.8125rem] leading-relaxed" style={{ color: 'var(--color-muted)' }}>
          {hint}
        </p>
      )}
      <div className="mt-3 grid gap-2 sm:grid-cols-2">
        {options.map((opt) => {
          const on = selected.includes(opt.value)
          return (
            <label
              key={opt.value}
              className="flex cursor-pointer items-start gap-3 p-3.5 transition-colors duration-250"
              style={{
                border: `1px solid ${on ? 'var(--color-accent)' : 'var(--rule-strong)'}`,
                background: on ? 'color-mix(in oklab, var(--color-accent) 6%, transparent)' : 'transparent',
              }}
            >
              <input
                type={multiple ? 'checkbox' : 'radio'}
                checked={on}
                onChange={() => onToggle(opt.value)}
                className="sr-only"
              />
              <span
                aria-hidden="true"
                className="mt-1 h-3.5 w-3.5 shrink-0"
                style={{
                  border: `1px solid ${on ? 'var(--color-accent)' : 'var(--rule-strong)'}`,
                  background: on ? 'var(--color-accent)' : 'transparent',
                  borderRadius: multiple ? 0 : '50%',
                }}
              />
              <span>
                <span className="block text-[0.9375rem] leading-snug">{opt.label}</span>
                {opt.note && (
                  <span className="mt-1 block text-[0.8125rem] leading-relaxed" style={{ color: 'var(--color-muted)' }}>
                    {opt.note}
                  </span>
                )}
              </span>
            </label>
          )
        })}
      </div>
      {error && (
        <p role="alert" className="label mt-2" style={{ color: 'var(--color-accent-deep)' }}>
          {error}
        </p>
      )}
    </fieldset>
  )
}

interface ConsentProps {
  label: string
  checked: boolean
  onChange: (v: boolean) => void
}

export function Consent({ label, checked, onChange }: ConsentProps) {
  return (
    <label className="flex cursor-pointer items-start gap-3">
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="sr-only"
      />
      <span
        aria-hidden="true"
        className="mt-0.5 grid h-4 w-4 shrink-0 place-items-center"
        style={{
          border: `1px solid ${checked ? 'var(--color-accent)' : 'var(--rule-strong)'}`,
          background: checked ? 'var(--color-accent)' : 'transparent',
        }}
      >
        {checked && (
          <svg viewBox="0 0 12 12" className="h-2.5 w-2.5" fill="none" stroke="#fff" strokeWidth="2">
            <path d="m2 6 3 3 5-6" />
          </svg>
        )}
      </span>
      <span className="text-[0.875rem] leading-relaxed" style={{ color: 'var(--color-muted)' }}>
        {label}
      </span>
    </label>
  )
}
