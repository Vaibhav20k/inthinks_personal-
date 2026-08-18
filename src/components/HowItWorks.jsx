import { steps } from '../content'
import Section, { SectionHeading } from './Section'

export default function HowItWorks() {
  return (
    <Section id="how" className="border-t border-white/5">
      <SectionHeading
        eyebrow="How it works"
        title="Three steps, no ceremony"
        subtitle="You already do the thinking. inthinks just stops it from evaporating."
      />
      <ol className="mt-14 grid gap-6 md:grid-cols-3">
        {steps.map((s, i) => (
          <li key={s.title} className="relative rounded-2xl border border-white/10 bg-white/[0.03] p-7">
            <span className="text-sm font-semibold tabular-nums text-brand-400">
              {String(i + 1).padStart(2, '0')}
            </span>
            <h3 className="mt-3 text-lg font-semibold text-white">{s.title}</h3>
            <p className="mt-2 text-sm leading-relaxed text-ink-300">{s.body}</p>
            {i < steps.length - 1 && (
              <span
                aria-hidden="true"
                className="absolute -right-3 top-1/2 hidden h-px w-6 -translate-y-1/2 bg-white/15 md:block"
              />
            )}
          </li>
        ))}
      </ol>
    </Section>
  )
}
