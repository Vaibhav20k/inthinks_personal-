import { Link } from 'react-router-dom'
import { footerGroups, site } from '../../data/site'
import Logo from '../primitives/Logo'

/** The pipeline, stated once at the end as a compact graphic. */
const lifecycle = ['Discover', 'Evaluate', 'Acquire', 'Develop', 'Validate', 'Match', 'Transfer']

export default function Footer() {
  return (
    <footer style={{ background: 'var(--color-graphite)', color: 'var(--color-paper)' }}>
      <div className="container-grid py-20">
        <div className="grid gap-12 lg:grid-cols-12">
          <div className="lg:col-span-4">
            <div className="flex items-center gap-3">
              <Logo size={2.25} tone="light" />
              <p className="font-display text-[1.75rem] font-semibold tracking-[-0.03em]" style={{ fontStretch: '110%' }}>
                {site.name}
              </p>
            </div>
            <p className="label mt-4" style={{ color: 'rgba(255,255,255,0.45)' }}>
              {site.line}
            </p>
          </div>

          {footerGroups.map((group) => (
            <nav key={group.title} aria-label={group.title} className="lg:col-span-2">
              <h2 className="label" style={{ color: 'rgba(255,255,255,0.45)' }}>
                {group.title.toUpperCase()}
              </h2>
              <ul className="mt-3">
                {group.links.map((link) => (
                  <li key={link.label}>
                    <Link
                      to={link.to}
                      className="inline-flex min-h-11 items-center text-[0.9375rem] transition-colors duration-300 hover:text-white"
                      style={{ color: 'rgba(255,255,255,0.72)' }}
                    >
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </nav>
          ))}

          <div className="lg:col-span-2">
            <h2 className="label" style={{ color: 'rgba(255,255,255,0.45)' }}>CONNECT</h2>
            <ul className="mt-3">
              <li>
                <a
                  href={`mailto:${site.email}`}
                  className="inline-flex min-h-11 items-center text-[0.9375rem] transition-colors duration-300 hover:text-white"
                  style={{ color: 'rgba(255,255,255,0.72)' }}
                >
                  {site.email}
                </a>
              </li>
            </ul>
          </div>
        </div>

        <ol className="mt-20 flex flex-wrap items-center gap-x-3 gap-y-2 pt-8" style={{ borderTop: '1px solid var(--rule-invert)' }}>
          {lifecycle.map((step, i) => (
            <li key={step} className="flex items-center gap-3">
              <span
                className="label"
                style={{ color: i === lifecycle.length - 1 ? 'var(--color-accent-light)' : 'rgba(255,255,255,0.42)' }}
              >
                {step.toUpperCase()}
              </span>
              {i < lifecycle.length - 1 && (
                <span aria-hidden="true" className="h-px w-5" style={{ background: 'var(--rule-invert)' }} />
              )}
            </li>
          ))}
        </ol>

        <div className="label mt-10 flex flex-wrap items-center justify-between gap-4" style={{ color: 'rgba(255,255,255,0.4)' }}>
          <span>
            © {new Date().getFullYear()} {site.name}
          </span>
          <Link to="/confidentiality" className="-my-3 inline-flex min-h-11 items-center py-3 transition-colors duration-300 hover:text-white">
            Confidentiality
          </Link>
        </div>
      </div>
    </footer>
  )
}
