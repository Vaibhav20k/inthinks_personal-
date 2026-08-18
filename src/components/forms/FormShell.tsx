import type { ReactNode } from 'react'
import { useEffect, useRef } from 'react'
import Button from '../primitives/Button'

export interface Step {
  title: string
  render: () => ReactNode
  /** Returns field-keyed messages; an empty object lets the step advance. */
  validate?: () => Record<string, string>
}

interface Props {
  steps: Step[]
  index: number
  onIndexChange: (i: number) => void
  onSubmit: () => void
  submitLabel: string
  errors: Record<string, string>
  onErrors: (e: Record<string, string>) => void
  savedAt: number | null
  submitting?: boolean
}

/**
 * The chassis both submission flows run on.
 *
 * Long forms fail at the seams — losing work, losing your place, or being
 * told at the end that step 2 was wrong. So: progress is always visible,
 * every change is autosaved, validation runs per step rather than at the end,
 * and moving between steps returns focus to the step heading so keyboard and
 * screen-reader users are not left at the bottom of the page.
 */
export default function FormShell({
  steps,
  index,
  onIndexChange,
  onSubmit,
  submitLabel,
  errors,
  onErrors,
  savedAt,
  submitting = false,
}: Props) {
  const headingRef = useRef<HTMLHeadingElement>(null)
  const mounted = useRef(false)
  const step = steps[index]
  const last = index === steps.length - 1

  useEffect(() => {
    if (!mounted.current) {
      mounted.current = true
      return
    }
    headingRef.current?.focus()
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }, [index])

  const advance = () => {
    const found = step.validate?.() ?? {}
    onErrors(found)
    if (Object.keys(found).length > 0) return
    if (last) onSubmit()
    else onIndexChange(index + 1)
  }

  return (
    <div className="grid gap-12 lg:grid-cols-12 lg:gap-16">
      {/* Progress rail — sticky on desktop so the shape of the task stays visible */}
      <div className="lg:col-span-4 xl:col-span-3">
        <div className="lg:sticky lg:top-28">
          <p className="label" style={{ color: 'var(--color-accent)' }}>
            {String(index + 1).padStart(2, '0')} / {String(steps.length).padStart(2, '0')}
          </p>

          <div className="mt-4 flex gap-1" aria-hidden="true">
            {steps.map((s, i) => (
              <div
                key={s.title}
                className="h-1 flex-1 transition-colors duration-400"
                style={{
                  background:
                    i < index ? 'var(--color-accent-deep)' : i === index ? 'var(--color-accent)' : 'var(--rule)',
                }}
              />
            ))}
          </div>

          <ol className="mt-6 hidden lg:block">
            {steps.map((s, i) => {
              const done = i < index
              const now = i === index
              return (
                <li key={s.title}>
                  <button
                    type="button"
                    // Only completed steps are navigable; jumping ahead would
                    // skip the validation that gates each one.
                    disabled={i > index}
                    onClick={() => onIndexChange(i)}
                    className="flex w-full items-baseline gap-3 py-2 text-left transition-colors duration-250 disabled:cursor-default"
                    style={{ color: now ? 'var(--color-ink)' : done ? 'var(--color-muted)' : 'var(--color-faint)' }}
                  >
                    <span className="label w-6 shrink-0" style={{ color: now ? 'var(--color-accent)' : 'inherit' }}>
                      {String(i + 1).padStart(2, '0')}
                    </span>
                    <span className="text-[0.875rem] leading-snug">{s.title}</span>
                  </button>
                </li>
              )
            })}
          </ol>

          <p className="label mt-6" style={{ color: 'var(--color-faint)' }}>
            {savedAt ? 'DRAFT SAVED IN THIS BROWSER' : 'DRAFT SAVES AUTOMATICALLY'}
          </p>
        </div>
      </div>

      {/* The current step */}
      <div className="lg:col-span-8 xl:col-span-9">
        <h2
          ref={headingRef}
          tabIndex={-1}
          className="section-type outline-none"
        >
          {step.title}
        </h2>

        {Object.keys(errors).length > 0 && (
          <p
            role="alert"
            className="label mt-6 px-3 py-2.5"
            style={{ border: '1px solid var(--color-accent-deep)', color: 'var(--color-accent-deep)' }}
          >
            {Object.keys(errors).length} FIELD{Object.keys(errors).length === 1 ? '' : 'S'} NEED ATTENTION BELOW
          </p>
        )}

        <div className="mt-10 grid gap-8">{step.render()}</div>

        <div
          className="mt-12 flex flex-wrap items-center justify-between gap-4 pt-8"
          style={{ borderTop: '1px solid var(--rule)' }}
        >
          <Button
            variant="outline"
            onClick={() => onIndexChange(Math.max(0, index - 1))}
            disabled={index === 0}
          >
            Back
          </Button>
          <Button onClick={advance} disabled={submitting}>
            {submitting ? 'Submitting…' : last ? submitLabel : 'Continue'}
          </Button>
        </div>
      </div>
    </div>
  )
}
