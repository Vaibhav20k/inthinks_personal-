import { pricing } from '../content'
import Icon from './Icon'
import Section, { SectionHeading } from './Section'

export default function Pricing() {
  return (
    <Section id="pricing" className="border-t border-white/5">
      <SectionHeading
        eyebrow="Pricing"
        title="Simple plans that scale with you"
        subtitle="Start free. Upgrade when your team does. Cancel whenever."
      />
      <div className="mt-14 grid gap-6 lg:grid-cols-3">
        {pricing.map((tier) => (
          <div
            key={tier.name}
            className={`relative flex flex-col rounded-2xl border p-7 ${
              tier.featured
                ? 'border-brand-500/50 bg-brand-500/[0.08] shadow-2xl shadow-brand-600/10'
                : 'border-white/10 bg-white/[0.03]'
            }`}
          >
            {tier.featured && (
              <span className="absolute -top-3 left-7 rounded-full bg-brand-500 px-3 py-1 text-[11px] font-semibold uppercase tracking-wider text-white">
                Most popular
              </span>
            )}
            <h3 className="text-sm font-semibold uppercase tracking-wider text-ink-300">
              {tier.name}
            </h3>
            <p className="mt-4 flex items-baseline gap-2">
              <span className="text-4xl font-semibold tracking-tight text-white">
                {tier.price}
              </span>
              <span className="text-xs text-ink-500">{tier.period}</span>
            </p>
            <p className="mt-3 text-sm text-ink-300">{tier.blurb}</p>

            <ul className="mt-6 flex-1 space-y-3">
              {tier.features.map((f) => (
                <li key={f} className="flex items-start gap-2.5 text-sm text-ink-100">
                  <Icon name="check" className="mt-0.5 h-4 w-4 shrink-0 text-brand-400" />
                  {f}
                </li>
              ))}
            </ul>

            <a
              href="#"
              className={`mt-8 rounded-full px-5 py-2.5 text-center text-sm font-medium transition-transform hover:scale-[1.02] ${
                tier.featured
                  ? 'bg-white text-ink-950'
                  : 'border border-white/15 text-white hover:bg-white/5'
              }`}
            >
              {tier.cta}
            </a>
          </div>
        ))}
      </div>
    </Section>
  )
}
