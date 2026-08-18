import { footer, site } from '../content'
import Logo from './Logo'

export default function Footer() {
  return (
    <footer className="border-t border-white/10 px-5 py-14 sm:px-8">
      <div className="mx-auto max-w-6xl">
        <div className="grid gap-10 md:grid-cols-[1.5fr_repeat(4,1fr)]">
          <div>
            <Logo />
            <p className="mt-4 max-w-xs text-sm leading-relaxed text-ink-500">
              {site.tagline} A landing page template built with React and Tailwind CSS.
            </p>
          </div>

          {footer.columns.map((col) => (
            <div key={col.title}>
              <h3 className="text-xs font-semibold uppercase tracking-wider text-white">
                {col.title}
              </h3>
              <ul className="mt-4 space-y-2.5">
                {col.links.map((link) => (
                  <li key={link}>
                    <a
                      href="#"
                      className="text-sm text-ink-500 transition-colors hover:text-white"
                    >
                      {link}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="mt-12 flex flex-col items-center justify-between gap-3 border-t border-white/10 pt-7 sm:flex-row">
          <p className="text-xs text-ink-500">
            © {new Date().getFullYear()} {site.domain}. All rights reserved.
          </p>
          <p className="text-xs text-ink-500">Built with React + Tailwind CSS</p>
        </div>
      </div>
    </footer>
  )
}
