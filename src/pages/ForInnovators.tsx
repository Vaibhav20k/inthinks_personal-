import Button from '../components/primitives/Button'
import Reveal from '../components/primitives/Reveal'
import SectionLabel from '../components/primitives/SectionLabel'
import PageHero from '../components/layout/PageHero'
import { INSTITUTION_DISCLAIMER, confidentiality, institutions } from '../data/pipeline'

const path = [
  { title: 'Evaluation', body: 'Technical merit, novelty, IP position, feasibility and application potential.' },
  { title: 'Development', body: 'If selected, engineering and experimentation to raise readiness.' },
  { title: 'Validation', body: 'Testing and adaptation against a real industrial requirement.' },
  { title: 'Industry opportunity', body: 'Matching against submitted industrial challenges.' },
  { title: 'Technology transfer', body: 'Licensing, assignment, co-development or transfer.' },
]

export default function ForInnovators() {
  return (
    <>
      <PageHero
        eyebrow="For Innovators"
        title="Built something with industrial potential?"
        lede="InThinks evaluates promising early-stage innovations and develops selected technologies toward real industry applications. Typical entry is TRL 1–3 — a working idea with evidence behind it is enough to start."
      >
        <div className="flex flex-wrap gap-3">
          <Button to="/submit-innovation">Submit Your Innovation</Button>
          <Button to="/confidentiality" variant="outline">How your work is protected</Button>
        </div>
      </PageHero>

      <section className="container-grid py-20 sm:py-28">
        <div className="doc-columns">
          <SectionLabel index="01">Who We Work With</SectionLabel>
          <div>
            <Reveal as="h2" className="section-type max-w-[20ch]">
              Students, researchers, technical teams and independent inventors.
            </Reveal>
            <Reveal delay={80}>
              <p className="body-type measure-prose mt-8" style={{ color: 'var(--color-muted)' }}>
                InThinks evaluates innovations originating from students, researchers and
                technical teams across leading academic and research ecosystems.
              </p>
            </Reveal>
            <ul className="mt-10 flex flex-wrap gap-2">
              {institutions.map((name) => (
                <li key={name} className="label px-3 py-2" style={{ border: '1px solid var(--rule-strong)', color: 'var(--color-muted)' }}>
                  {name.toUpperCase()}
                </li>
              ))}
            </ul>
            <p className="mt-6 text-[0.8125rem] leading-relaxed" style={{ color: 'var(--color-faint)', maxWidth: '62ch' }}>
              {INSTITUTION_DISCLAIMER}
            </p>
          </div>
        </div>
      </section>

      <section className="container-grid py-20 sm:py-28">
        <div className="doc-columns">
          <SectionLabel index="02">The Path</SectionLabel>
          <div>
            <Reveal as="h2" className="section-type max-w-[18ch]">
              What can happen to a selected technology.
            </Reveal>
            <ol className="mt-12 grid gap-px sm:grid-cols-2 lg:grid-cols-5" style={{ background: 'var(--rule)' }}>
              {path.map((stage, i) => (
                <li key={stage.title} style={{ background: 'var(--color-paper)' }}>
                  <Reveal delay={i * 60}>
                    <div className="flex h-full flex-col gap-4 p-5">
                      <span className="label" style={{ color: 'var(--color-accent)' }}>{String(i + 1).padStart(2, '0')}</span>
                      <h3 className="font-display text-[1.125rem] font-medium leading-snug tracking-[-0.02em]">{stage.title}</h3>
                      <p className="text-[0.8125rem] leading-relaxed" style={{ color: 'var(--color-muted)' }}>{stage.body}</p>
                    </div>
                  </Reveal>
                </li>
              ))}
            </ol>
            <Reveal delay={200}>
              <p className="body-type measure-prose mt-10" style={{ color: 'var(--color-muted)' }}>
                Not every submission is selected. InThinks develops a focused portfolio
                rather than accepting everything, and we would rather say no early than
                leave a technology sitting unattended.
              </p>
            </Reveal>
          </div>
        </div>
      </section>

      <section className="py-20 sm:py-28" style={{ background: 'var(--color-graphite)', color: 'var(--color-paper)' }}>
        <div className="container-grid">
          <div className="doc-columns">
            <SectionLabel index="03" invert>IP &amp; Ownership</SectionLabel>
            <div>
              <Reveal as="h2" className="section-type max-w-[20ch]">
                Submitting does not transfer ownership.
              </Reveal>
              <Reveal delay={80}>
                <p className="body-type measure-prose mt-8" style={{ color: 'rgba(255,255,255,0.66)' }}>
                  Any acquisition, assignment, licensing or development relationship
                  requires a separate written agreement. The IP section of the submission
                  form exists so that ownership is clear before anything else is discussed
                  — including where a university, employer or funder may hold rights.
                </p>
              </Reveal>
              <ul className="mt-10 grid gap-x-10 gap-y-4 sm:grid-cols-2">
                {confidentiality[0].points.map((point) => (
                  <li key={point} className="flex items-baseline gap-3 text-[0.9375rem]" style={{ color: 'rgba(255,255,255,0.72)' }}>
                    <span aria-hidden="true" className="h-px w-3 shrink-0" style={{ background: 'var(--color-accent-light)' }} />
                    {point}
                  </li>
                ))}
              </ul>
              <div className="mt-10">
                <Button to="/submit-innovation" variant="invert">Submit Your Innovation</Button>
              </div>
            </div>
          </div>
        </div>
      </section>
    </>
  )
}
