import { site } from '../data/site'

const groups = [
  { title: 'Explore', links: ['Innovations', 'Studio', 'Insights'] },
  { title: 'Work With Us', links: ['Licensing', 'Technology Transfer', 'Partnerships'] },
  { title: 'Connect', links: ['Email', 'LinkedIn'] },
]

/** The lifecycle, stated once at the end as a compact graphic. */
const lifecycle = ['Undefined', 'Question', 'Idea', 'Experiment', 'Structure', 'Technology', 'Impact']

export default function Footer() {
  return (
    <footer style={{ background: 'var(--color-ink-deep)', color: 'var(--color-paper)' }}>
      <div className="container-grid py-20">
        <div className="grid gap-12 lg:grid-cols-12">
          <div className="lg:col-span-5">
            <p className="font-display text-[1.75rem] font-semibold tracking-[-0.03em]" style={{ fontStretch: '110%' }}>
              {site.name}
            </p>
            <p className="label mt-4 text-white/45">Ideas → Technologies → Impact</p>
          </div>

          {groups.map((group) => (
            <nav key={group.title} aria-label={group.title} className="lg:col-span-2">
              <h2 className="label text-white/45">{group.title.toUpperCase()}</h2>
              <ul className="mt-5 space-y-2.5">
                {group.links.map((link) => (
                  <li key={link}>
                    <a
                      href={link === 'Email' ? `mailto:${site.email}` : '#top'}
                      className="text-[0.9375rem] text-white/72 transition-colors duration-300 hover:text-white"
                    >
                      {link}
                    </a>
                  </li>
                ))}
              </ul>
            </nav>
          ))}
        </div>

        {/* Lifecycle graphic */}
        <ol
          className="mt-20 flex flex-wrap items-center gap-x-3 gap-y-2 pt-8"
          style={{ borderTop: '1px solid var(--rule-invert)' }}
        >
          {lifecycle.map((step, i) => (
            <li key={step} className="flex items-center gap-3">
              <span
                className="label"
                style={{
                  color: i === lifecycle.length - 1 ? 'var(--color-accent)' : 'rgba(255,255,255,0.42)',
                }}
              >
                {step.toUpperCase()}
              </span>
              {i < lifecycle.length - 1 && (
                <span aria-hidden="true" className="h-px w-5" style={{ background: 'var(--rule-invert)' }} />
              )}
            </li>
          ))}
        </ol>

        <div className="label mt-10 flex flex-wrap items-center justify-between gap-4 text-white/40">
          <span>{site.locus}</span>
          <span>© {new Date().getFullYear()} {site.name}</span>
          <a href="#top" className="transition-colors duration-300 hover:text-white/80">
            Privacy
          </a>
        </div>
      </div>
    </footer>
  )
}
