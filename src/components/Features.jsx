import { features } from '../content'
import Icon from './Icon'
import Section, { SectionHeading } from './Section'

export default function Features() {
  return (
    <Section id="features" className="border-t border-white/5">
      <SectionHeading
        eyebrow="Product"
        title="Everything you need to think clearly"
        subtitle="Six building blocks that take an idea from a scribbled note to something a team can act on."
      />
      <div className="mt-14 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {features.map((f) => (
          <div
            key={f.title}
            className="group rounded-2xl border border-white/10 bg-white/[0.03] p-6 transition-colors hover:border-white/20 hover:bg-white/[0.06]"
          >
            <span className="grid h-10 w-10 place-items-center rounded-xl border border-white/10 bg-brand-500/15 text-brand-400">
              <Icon name={f.icon} />
            </span>
            <h3 className="mt-5 text-base font-semibold text-white">{f.title}</h3>
            <p className="mt-2 text-sm leading-relaxed text-ink-300">{f.body}</p>
          </div>
        ))}
      </div>
    </Section>
  )
}
