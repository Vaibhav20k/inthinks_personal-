import { useEffect, useState } from 'react'
import { nav, site } from '../data/site'

export default function Header() {
  const [compact, setCompact] = useState(false)
  const [menuOpen, setMenuOpen] = useState(false)

  useEffect(() => {
    const onScroll = () => setCompact(window.scrollY > 48)
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  useEffect(() => {
    document.body.style.overflow = menuOpen ? 'hidden' : ''
    return () => {
      document.body.style.overflow = ''
    }
  }, [menuOpen])

  return (
    <header
      className="fixed inset-x-0 top-0 z-50 transition-[background-color,border-color,backdrop-filter] duration-500"
      style={{
        backgroundColor: compact || menuOpen ? 'color-mix(in oklab, var(--color-paper) 88%, transparent)' : 'transparent',
        backdropFilter: compact || menuOpen ? 'blur(14px)' : 'none',
        borderBottom: `1px solid ${compact || menuOpen ? 'var(--rule)' : 'transparent'}`,
      }}
    >
      <div
        className="container-grid flex items-center justify-between transition-[height] duration-500 ease-[var(--ease-out-quint)]"
        style={{ height: compact ? '4rem' : '5.5rem' }}
      >
        <a href="#top" className="flex items-baseline gap-2.5">
          <span
            className="font-display text-[1.0625rem] font-semibold tracking-[-0.03em]"
            style={{ fontStretch: '110%' }}
          >
            {site.name}
          </span>
          <span
            aria-hidden="true"
            className="hidden h-1.5 w-1.5 sm:block"
            style={{ background: 'var(--color-accent)' }}
          />
        </a>

        <nav aria-label="Primary" className="hidden items-center gap-7 xl:flex">
          {nav.map((item) => (
            <a
              key={item.label}
              href={item.href}
              className="group relative py-1 text-[0.8125rem] font-medium tracking-[-0.005em] text-graphite transition-colors duration-300 hover:text-ink"
            >
              {item.label}
              <span
                aria-hidden="true"
                className="absolute inset-x-0 -bottom-0.5 h-px origin-left scale-x-0 transition-transform duration-400 ease-[var(--ease-out-quint)] group-hover:scale-x-100"
                style={{ background: 'var(--color-accent)' }}
              />
            </a>
          ))}
        </nav>

        <div className="flex items-center gap-3">
          <a
            href="#partner"
            className="hidden bg-ink px-5 py-2.5 text-[0.8125rem] font-medium text-paper transition-colors duration-300 hover:bg-accent sm:inline-block"
          >
            Partner With Us
          </a>
          <button
            type="button"
            onClick={() => setMenuOpen((v) => !v)}
            aria-expanded={menuOpen}
            aria-controls="mobile-nav"
            className="label flex items-center gap-2 py-2 xl:hidden"
          >
            {menuOpen ? 'Close' : 'Menu'}
            <span
              aria-hidden="true"
              className="flex h-3 w-4 flex-col justify-between transition-transform duration-300"
            >
              <span className="h-px w-full bg-ink" />
              <span className={`h-px bg-ink transition-all duration-300 ${menuOpen ? 'w-full' : 'w-2/3'}`} />
              <span className="h-px w-full bg-ink" />
            </span>
          </button>
        </div>
      </div>

      {menuOpen && (
        <div id="mobile-nav" className="container-grid pb-10 pt-2 xl:hidden">
          <ul className="flex flex-col">
            {nav.map((item, i) => (
              <li key={item.label} style={{ borderTop: '1px solid var(--rule)' }}>
                <a
                  href={item.href}
                  onClick={() => setMenuOpen(false)}
                  className="flex items-baseline justify-between py-4 text-2xl font-medium tracking-[-0.02em]"
                >
                  {item.label}
                  <span className="label text-graphite-light">
                    {String(i + 1).padStart(2, '0')}
                  </span>
                </a>
              </li>
            ))}
          </ul>
          <a
            href="#partner"
            onClick={() => setMenuOpen(false)}
            className="mt-8 block bg-ink px-6 py-4 text-center text-[0.9375rem] font-medium text-paper"
          >
            Partner With Us
          </a>
        </div>
      )}
    </header>
  )
}
