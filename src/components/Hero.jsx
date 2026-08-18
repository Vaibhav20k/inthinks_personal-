import { hero, stats } from '../content'
import Icon from './Icon'

export default function Hero() {
  return (
    <div id="top" className="relative overflow-hidden pt-32 pb-20 sm:pt-40 sm:pb-28">
      {/* backdrop */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute left-1/2 top-0 -z-10 h-[42rem] w-[72rem] -translate-x-1/2 rounded-full bg-brand-600/20 blur-[120px]"
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 -z-10 bg-[linear-gradient(to_right,rgba(255,255,255,0.045)_1px,transparent_1px),linear-gradient(to_bottom,rgba(255,255,255,0.045)_1px,transparent_1px)] bg-[size:56px_56px] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_0%,#000,transparent)]"
      />

      <div className="mx-auto max-w-6xl px-5 text-center sm:px-8">
        <a
          href="#features"
          className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/5 px-3.5 py-1.5 text-xs font-medium text-ink-100 backdrop-blur transition-colors hover:border-white/25"
        >
          <span className="h-1.5 w-1.5 rounded-full bg-brand-400" />
          {hero.eyebrow}
          <Icon name="arrow" className="h-3.5 w-3.5" />
        </a>

        <h1 className="mx-auto mt-7 max-w-3xl text-4xl font-semibold leading-[1.08] tracking-tight text-white sm:text-6xl">
          {hero.title}{' '}
          <span className="bg-gradient-to-r from-brand-400 to-brand-600 bg-clip-text text-transparent">
            {hero.titleAccent}
          </span>
        </h1>

        <p className="mx-auto mt-6 max-w-xl text-base leading-relaxed text-ink-300 sm:text-lg">
          {hero.subtitle}
        </p>

        <div className="mt-9 flex flex-col items-center justify-center gap-3 sm:flex-row">
          <a
            href={hero.primaryCta.href}
            className="w-full rounded-full bg-white px-6 py-3 text-sm font-medium text-ink-950 transition-transform hover:scale-[1.03] sm:w-auto"
          >
            {hero.primaryCta.label}
          </a>
          <a
            href={hero.secondaryCta.href}
            className="inline-flex w-full items-center justify-center gap-2 rounded-full border border-white/15 px-6 py-3 text-sm font-medium text-white transition-colors hover:bg-white/5 sm:w-auto"
          >
            {hero.secondaryCta.label}
            <Icon name="arrow" className="h-4 w-4" />
          </a>
        </div>

        <p className="mt-5 text-xs text-ink-500">{hero.note}</p>

        {/* app preview */}
        <div className="mx-auto mt-16 max-w-4xl">
          <div className="rounded-2xl border border-white/10 bg-white/5 p-2 shadow-2xl shadow-black/50 backdrop-blur">
            <div className="overflow-hidden rounded-xl border border-white/10 bg-ink-900">
              <div className="flex items-center gap-2 border-b border-white/10 px-4 py-3">
                <span className="h-2.5 w-2.5 rounded-full bg-white/20" />
                <span className="h-2.5 w-2.5 rounded-full bg-white/20" />
                <span className="h-2.5 w-2.5 rounded-full bg-white/20" />
                <span className="ml-3 rounded-md bg-white/5 px-2.5 py-1 text-[11px] text-ink-500">
                  app.inthinks.com
                </span>
              </div>
              <div className="grid gap-4 p-5 text-left sm:grid-cols-3">
                {['Inbox', 'Clusters', 'Briefs'].map((col, i) => (
                  <div key={col} className="space-y-2.5">
                    <p className="text-[11px] font-semibold uppercase tracking-wider text-ink-500">
                      {col}
                    </p>
                    {Array.from({ length: 3 + i }).map((_, j) => (
                      <div
                        key={j}
                        className="rounded-lg border border-white/5 bg-white/[0.03] p-3"
                      >
                        <div
                          className="h-2 rounded-full bg-white/15"
                          style={{ width: `${55 + ((i * 3 + j) % 4) * 10}%` }}
                        />
                        <div className="mt-2 h-2 rounded-full bg-white/[0.07]" />
                      </div>
                    ))}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* stats */}
        <dl className="mx-auto mt-16 grid max-w-3xl grid-cols-2 gap-8 sm:grid-cols-4">
          {stats.map((s) => (
            <div key={s.label}>
              <dt className="sr-only">{s.label}</dt>
              <dd className="text-2xl font-semibold tracking-tight text-white sm:text-3xl">
                {s.value}
              </dd>
              <p className="mt-1 text-xs text-ink-500">{s.label}</p>
            </div>
          ))}
        </dl>
      </div>
    </div>
  )
}
