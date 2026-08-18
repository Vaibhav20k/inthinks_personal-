import { useState } from 'react'
import { Link } from 'react-router-dom'
import Logo from '../primitives/Logo'
import { site } from '../../data/site'

/**
 * Section 12 — the closing fork.
 *
 * Two doors and the company between them. Hovering a side draws that side's
 * flow into the centre, which is the whole business model compressed into one
 * interaction: both routes lead through InThinks.
 */
export default function FinalCta() {
  const [side, setSide] = useState<'challenge' | 'innovation' | null>(null)

  const sides = [
    {
      key: 'challenge' as const,
      heading: 'I have an industrial challenge.',
      cta: 'Submit Challenge',
      to: '/submit-challenge',
    },
    {
      key: 'innovation' as const,
      heading: 'I have an innovation.',
      cta: 'Submit Innovation',
      to: '/submit-innovation',
    },
  ]

  return (
    <section
      className="py-24 sm:py-32"
      style={{ background: 'var(--color-graphite)', color: 'var(--color-paper)' }}
    >
      <div className="container-grid">
        <h2 className="statement-type mx-auto max-w-[18ch] text-center">
          Which side of innovation are you on?
        </h2>

        <div className="mt-16 grid items-stretch gap-px lg:grid-cols-[1fr_auto_1fr]" style={{ background: 'var(--rule-invert)' }}>
          <Link
            to={sides[0].to}
            onMouseEnter={() => setSide('challenge')}
            onMouseLeave={() => setSide(null)}
            onFocus={() => setSide('challenge')}
            onBlur={() => setSide(null)}
            className="group flex flex-col justify-between gap-10 p-8 transition-colors duration-500 sm:p-12"
            style={{ background: side === 'challenge' ? 'var(--color-graphite-soft)' : 'var(--color-graphite)' }}
          >
            <p className="label" style={{ color: 'rgba(255,255,255,0.45)' }}>INDUSTRY</p>
            <div>
              <p className="font-display text-[clamp(1.6rem,2.8vw,2.375rem)] font-medium leading-tight tracking-[-0.025em]">
                {sides[0].heading}
              </p>
              <span className="tap mt-6 inline-flex items-baseline gap-2.5 text-[0.9375rem] font-medium">
                <span className="border-b border-current pb-0.5">{sides[0].cta}</span>
                <span
                  aria-hidden="true"
                  className="transition-transform duration-300 ease-[var(--ease-out-quint)] group-hover:translate-x-1"
                  style={{ color: 'var(--color-accent-light)' }}
                >
                  →
                </span>
              </span>
            </div>
          </Link>

          {/* The centre both doors lead through */}
          <div
            className="flex flex-col items-center justify-center gap-4 px-8 py-12"
            style={{ background: 'var(--color-graphite)' }}
          >
            <Logo size={2.75} tone="light" />
            <p className="font-display text-[1.25rem] font-semibold tracking-[-0.03em]" style={{ fontStretch: '110%' }}>
              {site.wordmark}
            </p>
            <p className="label text-center" style={{ color: 'var(--color-accent-light)' }}>
              {site.triad.toUpperCase()}
            </p>
            <div
              aria-hidden="true"
              className="mt-2 h-px w-16 transition-all duration-500"
              style={{
                background: side ? 'var(--color-accent-light)' : 'var(--rule-invert-strong)',
                transform: side === 'challenge' ? 'translateX(-6px)' : side === 'innovation' ? 'translateX(6px)' : 'none',
              }}
            />
          </div>

          <Link
            to={sides[1].to}
            onMouseEnter={() => setSide('innovation')}
            onMouseLeave={() => setSide(null)}
            onFocus={() => setSide('innovation')}
            onBlur={() => setSide(null)}
            className="group flex flex-col justify-between gap-10 p-8 transition-colors duration-500 sm:p-12"
            style={{ background: side === 'innovation' ? 'var(--color-graphite-soft)' : 'var(--color-graphite)' }}
          >
            <p className="label" style={{ color: 'rgba(255,255,255,0.45)' }}>INNOVATORS</p>
            <div>
              <p className="font-display text-[clamp(1.6rem,2.8vw,2.375rem)] font-medium leading-tight tracking-[-0.025em]">
                {sides[1].heading}
              </p>
              <span className="tap mt-6 inline-flex items-baseline gap-2.5 text-[0.9375rem] font-medium">
                <span className="border-b border-current pb-0.5">{sides[1].cta}</span>
                <span
                  aria-hidden="true"
                  className="transition-transform duration-300 ease-[var(--ease-out-quint)] group-hover:translate-x-1"
                  style={{ color: 'var(--color-accent-light)' }}
                >
                  →
                </span>
              </span>
            </div>
          </Link>
        </div>
      </div>
    </section>
  )
}
