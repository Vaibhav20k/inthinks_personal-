import type { ReactNode } from 'react'
import Reveal from '../primitives/Reveal'

interface Props {
  eyebrow: string
  title: string
  lede?: string
  children?: ReactNode
}

/** Shared hero for every page other than home, which has the signal field. */
export default function PageHero({ eyebrow, title, lede, children }: Props) {
  return (
    <section className="container-grid pb-16 pt-36 sm:pb-24 sm:pt-44">
      <div className="doc-columns">
        <div className="label border-t pt-3" style={{ borderColor: 'var(--rule)' }}>
          <span style={{ color: 'var(--color-muted)' }}>{eyebrow.toUpperCase()}</span>
        </div>
        <div>
          <Reveal as="h1" className="statement-type max-w-[16ch]">
            {title}
          </Reveal>
          {lede && (
            <Reveal delay={90}>
              <p className="body-type measure-prose mt-8" style={{ color: 'var(--color-muted)' }}>
                {lede}
              </p>
            </Reveal>
          )}
          {children && <Reveal delay={150}><div className="mt-10">{children}</div></Reveal>}
        </div>
      </div>
    </section>
  )
}
