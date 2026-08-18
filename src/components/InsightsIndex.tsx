import ArrowLink from './primitives/ArrowLink'
import Reveal from './primitives/Reveal'
import SectionLabel from './primitives/SectionLabel'
import { insights } from '../data/content'

/** Section 10 — Insights, set as a publication index rather than blog cards. */
export default function InsightsIndex() {
  return (
    <section id="insights" className="container-grid py-28 sm:py-40">
      <div className="doc-columns">
        <SectionLabel index="10">Insights</SectionLabel>

        <div>
          <div className="flex flex-wrap items-end justify-between gap-6">
            <Reveal>
              <h2 className="section-type">Thinking in public.</h2>
            </Reveal>
            <Reveal delay={80}>
              <ArrowLink href="#insights">View All Insights</ArrowLink>
            </Reveal>
          </div>

          <Reveal delay={120}>
            <p
              className="label mt-10 inline-flex items-center gap-2.5 px-3 py-2 text-graphite"
              style={{ border: '1px solid var(--rule-strong)' }}
            >
              <span aria-hidden="true" className="h-1.5 w-1.5" style={{ background: 'var(--color-accent)' }} />
              Placeholder entries — awaiting published writing
            </p>
          </Reveal>

          <ul className="mt-12">
            {insights.map((item, i) => (
              <li key={item.title} style={{ borderTop: '1px solid var(--rule)' }}>
                <Reveal delay={i * 70}>
                  <a
                    href="#insights"
                    className="group grid items-baseline gap-x-8 gap-y-2 py-7 md:grid-cols-12"
                  >
                    <span className="label text-graphite md:col-span-2">{item.category.toUpperCase()}</span>
                    <span className="label text-graphite-light md:col-span-1">{item.date.toUpperCase()}</span>
                    <h3 className="font-display text-[clamp(1.25rem,2vw,1.75rem)] font-medium leading-snug tracking-[-0.025em] md:col-span-6">
                      <span className="bg-[linear-gradient(currentColor,currentColor)] bg-[length:0%_1px] bg-left-bottom bg-no-repeat pb-1 transition-[background-size] duration-500 ease-[var(--ease-out-quint)] group-hover:bg-[length:100%_1px]">
                        {item.title}
                      </span>
                    </h3>
                    <p className="text-[0.9375rem] leading-relaxed text-graphite md:col-span-3">
                      {item.descriptor}
                    </p>
                  </a>
                </Reveal>
              </li>
            ))}
            <li style={{ borderTop: '1px solid var(--rule)' }} />
          </ul>
        </div>
      </div>
    </section>
  )
}
