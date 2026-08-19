import { useEffect, useState } from 'react'
import GroundToggle from '../primitives/GroundToggle'
import { Link, NavLink, useLocation } from 'react-router-dom'
import { nav, site } from '../../data/site'
import Logo from '../primitives/Logo'

export default function Header() {
  const [compact, setCompact] = useState(false)
  const [menuOpen, setMenuOpen] = useState(false)
  const { pathname } = useLocation()

  useEffect(() => {
    const onScroll = () => setCompact(window.scrollY > 40)
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  useEffect(() => setMenuOpen(false), [pathname])

  useEffect(() => {
    document.body.style.overflow = menuOpen ? 'hidden' : ''
    return () => {
      document.body.style.overflow = ''
    }
  }, [menuOpen])

  const solid = compact || menuOpen

  return (
    <header
      className="fixed inset-x-0 top-0 z-50 transition-[background-color,border-color,backdrop-filter] duration-500"
      style={{
        // The open menu is a surface, not an overlay. A translucent bar reads
        // as a bar; the same treatment behind a full sheet of navigation just
        // reads as the page showing through it, and 90% of the paper colour is
        // not enough to hold 24px type off a hero. So: solid while open.
        backgroundColor: menuOpen
          ? 'var(--color-paper)'
          : compact
            ? 'color-mix(in oklab, var(--color-paper) 90%, transparent)'
            : 'transparent',
        backdropFilter: compact && !menuOpen ? 'blur(14px)' : 'none',
        borderBottom: `1px solid ${solid ? 'var(--rule)' : 'transparent'}`,
      }}
    >
      <div
        className="container-grid flex items-center justify-between transition-[height] duration-500 ease-[var(--ease-out-quint)]"
        // Opening the menu collapses the bar. Not decoration: the sheet below
        // is sized `100svh - 3.75rem`, so a 5.25rem bar pushes its last 24px
        // past the fold where nothing can reach it.
        style={{ height: compact || menuOpen ? '3.75rem' : '5.25rem' }}
      >
        <Link to="/" className="-my-2 flex min-h-11 items-center gap-2.5 py-2" aria-label={`${site.name} — home`}>
          <Logo size={compact || menuOpen ? 1.6 : 1.9} className="transition-[height] duration-500 ease-[var(--ease-out-quint)]" />
          <span className="font-display text-[1.0625rem] font-semibold tracking-[-0.03em]" style={{ fontStretch: '110%' }}>
            {site.name}
          </span>
        </Link>

        <nav aria-label="Primary" className="hidden items-center gap-6 xl:flex">
          {nav.map((item) => (
            <NavLink
              key={item.label}
              to={item.to}
              className="group relative py-1 text-[0.8125rem] font-medium transition-colors duration-300"
              style={({ isActive }) => ({ color: isActive ? 'var(--color-ink)' : 'var(--color-muted)' })}
            >
              {({ isActive }) => (
                <>
                  {item.label}
                  <span
                    aria-hidden="true"
                    className={`absolute inset-x-0 -bottom-0.5 h-px origin-left transition-transform duration-400 ease-[var(--ease-out-quint)] group-hover:scale-x-100 ${
                      isActive ? 'scale-x-100' : 'scale-x-0'
                    }`}
                    style={{ background: 'var(--color-accent)' }}
                  />
                </>
              )}
            </NavLink>
          ))}
        </nav>

        <div className="flex items-center gap-4">
          <GroundToggle className="hidden sm:inline-flex" />
          <Link
            to="/submit-innovation"
            className="hidden text-[0.8125rem] font-medium transition-colors duration-300 lg:inline-block"
            style={{ color: 'var(--color-muted)' }}
          >
            Submit Innovation
          </Link>
          <Link
            to="/submit-challenge"
            className="hidden bg-[var(--color-cta)] px-5 py-2.5 text-[0.8125rem] font-medium text-[var(--color-cta-text)] transition-colors duration-300 hover:bg-accent sm:inline-block"
          >
            Submit a Challenge
          </Link>
          <button
            type="button"
            onClick={() => setMenuOpen((v) => !v)}
            aria-expanded={menuOpen}
            aria-controls="mobile-nav"
            className="label -mr-2 flex min-h-11 items-center gap-2 px-2 py-2 xl:hidden"
          >
            {menuOpen ? 'Close' : 'Menu'}
            <span aria-hidden="true" className="flex h-3 w-4 flex-col justify-between">
              <span className="h-px w-full" style={{ background: 'var(--color-ink)' }} />
              <span className={`h-px transition-all duration-300 ${menuOpen ? 'w-full' : 'w-2/3'}`} style={{ background: 'var(--color-ink)' }} />
              <span className="h-px w-full" style={{ background: 'var(--color-ink)' }} />
            </span>
          </button>
        </div>
      </div>

      {menuOpen && (
        <div id="mobile-nav" className="container-grid h-[calc(100svh-3.75rem)] overflow-y-auto pb-10 pt-2 xl:hidden">
          <ul className="flex flex-col">
            {nav.map((item, i) => (
              <li key={item.label} style={{ borderTop: '1px solid var(--rule)' }}>
                <Link to={item.to} className="flex items-baseline justify-between py-4 text-2xl font-medium tracking-[-0.02em]">
                  {item.label}
                  <span className="label" style={{ color: 'var(--color-faint)' }}>
                    {String(i + 1).padStart(2, '0')}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
          {/* The header control is hidden on a narrow screen, so without this
              a phone has no way back to AUTO once someone pins a ground. */}
          <div
            className="mt-6 flex items-center justify-between py-4 sm:hidden"
            style={{ borderTop: '1px solid var(--rule)', borderBottom: '1px solid var(--rule)' }}
          >
            <span className="label" style={{ color: 'var(--color-faint)' }}>THEME</span>
            <GroundToggle />
          </div>

          <div className="mt-6 flex flex-col gap-3">
            <Link to="/submit-challenge" className="bg-[var(--color-cta)] px-6 py-4 text-center text-[0.9375rem] font-medium text-[var(--color-cta-text)]">
              Submit a Challenge
            </Link>
            <Link
              to="/submit-innovation"
              className="px-6 py-4 text-center text-[0.9375rem] font-medium"
              style={{ border: '1px solid var(--rule-strong)' }}
            >
              Submit Your Innovation
            </Link>
          </div>
        </div>
      )}
    </header>
  )
}
