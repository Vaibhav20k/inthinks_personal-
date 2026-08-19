import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import Button from '../components/primitives/Button'
import MetaList from '../components/primitives/MetaList'
import Reveal from '../components/primitives/Reveal'
import TrlScale from '../components/primitives/TrlScale'
import { fetchTechnology } from '../data/portfolio'
import type { TechnologyDetail as Detail } from '../data/portfolio'

/** A published log entry, dated to the month. Days are working detail. */
const asMonth = (iso: string | null) =>
  iso
    ? new Date(`${iso.slice(0, 7)}-01T00:00:00Z`)
        .toLocaleDateString('en-GB', { month: 'short', year: 'numeric', timeZone: 'UTC' })
        .toUpperCase()
    : '—'

function Block({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="py-9" style={{ borderTop: '1px solid var(--rule)' }}>
      <h2 className="label" style={{ color: 'var(--color-faint)' }}>{title.toUpperCase()}</h2>
      <div className="mt-4 body-type measure-prose" style={{ color: 'var(--color-muted)' }}>
        {children}
      </div>
    </section>
  )
}

/**
 * Technology brief.
 *
 * Reads between a product page, a research note and a case study. The
 * technology is the subject throughout — nothing here identifies the
 * innovator, the source institution or any commercial term.
 */
export default function TechnologyDetail() {
  const { slug } = useParams()
  const [data, setData] = useState<Detail | null>(null)
  const [state, setState] = useState<'loading' | 'ready' | 'missing'>('loading')

  useEffect(() => {
    if (!slug) return setState('missing')
    let live = true
    setState('loading')
    fetchTechnology(slug)
      .then((result) => { if (live) { setData(result); setState('ready') } })
      .catch(() => { if (live) setState('missing') })
    return () => { live = false }
  }, [slug])

  if (state === 'loading') {
    return (
      <section className="container-grid pb-28 pt-36 sm:pt-44">
        <p className="label" style={{ color: 'var(--color-muted)' }} aria-live="polite">LOADING…</p>
      </section>
    )
  }

  if (state === 'missing' || !data) {
    return (
      <section className="container-grid pb-28 pt-36 sm:pt-44">
        <h1 className="statement-type">Technology not found.</h1>
        <p className="body-type mt-6" style={{ color: 'var(--color-muted)' }}>
          That reference is not in the published portfolio.
        </p>
        <div className="mt-8">
          <Button to="/technologies">Back to the Technology Explorer</Button>
        </div>
      </section>
    )
  }

  const { technology: tech, timeline } = data

  return (
    <>
      <section className="container-grid pb-12 pt-36 sm:pt-44">
        <Link to="/technologies" className="tap label inline-flex items-center gap-2" style={{ color: 'var(--color-muted)' }}>
          <span aria-hidden="true">←</span> TECHNOLOGY EXPLORER
        </Link>

        <p className="ident mt-8" style={{ color: 'var(--color-accent)' }}>{tech.id}</p>
        <Reveal as="h1" className="statement-type mt-4 max-w-[18ch]">
          {tech.name}
        </Reveal>
        <Reveal delay={80}>
          <p className="body-type measure-prose mt-6" style={{ color: 'var(--color-muted)' }}>
            {tech.thesis}
          </p>
        </Reveal>

      </section>

      <section className="container-grid pb-28">
        <div className="grid gap-12 lg:grid-cols-12 lg:gap-16">
          {/* Technical sidebar */}
          <aside className="lg:order-2 lg:col-span-4">
            <div className="lg:sticky lg:top-28">
              <div className="p-6" style={{ border: '1px solid var(--rule-strong)' }}>
                <h2 className="label" style={{ color: 'var(--color-ink)' }}>TECHNICAL SUMMARY</h2>
                <div className="mt-4">
                  <MetaList
                    items={[
                      { term: 'TECHNOLOGY ID', value: tech.id },
                      { term: 'DOMAIN', value: tech.domain },
                      { term: 'ENTRY TRL', value: String(tech.entryTrl) },
                      { term: 'CURRENT TRL', value: String(tech.currentTrl), accent: true },
                      { term: 'TARGET TRL', value: String(tech.targetTrl) },
                      { term: 'STAGE', value: tech.stage },
                      { term: 'IP STATUS', value: tech.ipStatus },
                      { term: 'TRANSFER STATUS', value: tech.transferStatus, accent: true },
                    ]}
                  />
                </div>

                <div className="mt-8 flex flex-col gap-3">
                  <Button href="mailto:hello@inthinks.com?subject=Technology%20enquiry">
                    Discuss This Technology
                  </Button>
                  <Button to="/submit-challenge" variant="outline">
                    Submit a Related Challenge
                  </Button>
                </div>
              </div>

              <p className="label mt-5" style={{ color: 'var(--color-faint)' }}>
                INNOVATOR IDENTITY AND SOURCE ARE NOT PUBLISHED
              </p>
            </div>
          </aside>

          {/* Brief */}
          <div className="lg:order-1 lg:col-span-8">
            <Block title="Industrial problem">{tech.problem}</Block>
            {/* The thesis is already the lede under the title; repeating it as
                an overview block reads as padding. */}
            <Block title="How it works">{tech.principle}</Block>
            <Block title="Why it matters">{tech.whyItMatters}</Block>

            <section className="py-9" style={{ borderTop: '1px solid var(--rule)' }}>
              <h2 className="label" style={{ color: 'var(--color-faint)' }}>TRL JOURNEY</h2>
              <div className="mt-6">
                <TrlScale entry={tech.entryTrl} current={tech.currentTrl} target={tech.targetTrl} />
              </div>
            </section>

            <section className="py-9" style={{ borderTop: '1px solid var(--rule)' }}>
              <h2 className="label" style={{ color: 'var(--color-faint)' }}>DEVELOPMENT UNDERTAKEN BY INTHINKS</h2>
              {timeline.length === 0 ? (
                <p className="body-type measure-prose mt-4" style={{ color: 'var(--color-muted)' }}>
                  No development steps have been published for this technology yet.
                </p>
              ) : (
                <ol className="mt-4 space-y-3">
                  {timeline.map((entry, i) => (
                    <li
                      key={`${entry.on}-${entry.title}-${i}`}
                      className="grid grid-cols-[5.5rem_1fr] items-baseline gap-x-4 gap-y-1 text-[0.9375rem]"
                      style={{ color: 'var(--color-muted)' }}
                    >
                      <span className="label tabular-nums" style={{ color: 'var(--color-accent)' }}>
                        {asMonth(entry.on)}
                      </span>
                      <span>
                        {entry.title}
                        <span className="label ml-2" style={{ color: 'var(--color-faint)' }}>
                          {entry.kind.toUpperCase()}
                        </span>
                      </span>
                    </li>
                  ))}
                </ol>
              )}
              <p className="label mt-5" style={{ color: 'var(--color-faint)' }}>
                PUBLISHED DEVELOPMENT RECORD — THE WORKING LOG IS NOT PUBLIC
              </p>
            </section>

            <Block title="Validation status">{tech.validation}</Block>

            <section className="py-9" style={{ borderTop: '1px solid var(--rule)' }}>
              <h2 className="label" style={{ color: 'var(--color-faint)' }}>APPLICATIONS</h2>
              <ul className="mt-4 flex flex-wrap gap-2">
                {tech.applications.map((a) => (
                  <li key={a} className="label px-3 py-2" style={{ border: '1px solid var(--rule-strong)', color: 'var(--color-muted)' }}>
                    {a.toUpperCase()}
                  </li>
                ))}
              </ul>
            </section>

            <section className="py-9" style={{ borderTop: '1px solid var(--rule)' }}>
              <h2 className="label" style={{ color: 'var(--color-faint)' }}>INDUSTRIES THAT MAY BENEFIT</h2>
              <ul className="mt-4 flex flex-wrap gap-2">
                {tech.sectors.map((s) => (
                  <li key={s} className="label px-3 py-2" style={{ border: '1px solid var(--rule-strong)', color: 'var(--color-muted)' }}>
                    {s.toUpperCase()}
                  </li>
                ))}
              </ul>
            </section>

            <section className="py-9" style={{ borderTop: '1px solid var(--rule)', borderBottom: '1px solid var(--rule)' }}>
              <h2 className="label" style={{ color: 'var(--color-faint)' }}>NEXT DEVELOPMENT MILESTONES</h2>
              <ol className="mt-4 space-y-3">
                {tech.nextMilestones.map((m, i) => (
                  <li key={m} className="flex items-baseline gap-4 text-[0.9375rem]" style={{ color: 'var(--color-muted)' }}>
                    <span className="label" style={{ color: 'var(--color-accent)' }}>{String(i + 1).padStart(2, '0')}</span>
                    {m}
                  </li>
                ))}
              </ol>
            </section>
          </div>
        </div>
      </section>
    </>
  )
}
