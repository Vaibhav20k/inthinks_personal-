import { useEffect } from 'react'
import { Outlet, useLocation } from 'react-router-dom'
import Header from './Header'
import Footer from './Footer'

/**
 * Restores scroll on navigation — the router does not do this by default —
 * and keeps the canonical link pointing at the page you are actually on.
 *
 * The site answers on two hostnames, so every page needs to name one of them
 * as the real address. A canonical set once in the HTML would freeze on the
 * homepage and tell a search engine that every route is the homepage, which is
 * worse than not having one.
 */
function OnNavigate() {
  const { pathname } = useLocation()
  useEffect(() => {
    window.scrollTo(0, 0)
    document
      .querySelector('link[rel="canonical"]')
      ?.setAttribute('href', `https://inthinks.com${pathname}`)
  }, [pathname])
  return null
}

export default function Layout() {
  return (
    <>
      <OnNavigate />
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[100] focus:bg-[var(--color-cta)] focus:px-4 focus:py-2 focus:text-[var(--color-cta-text)]"
      >
        Skip to content
      </a>
      <Header />
      <main id="main">
        <Outlet />
      </main>
      <Footer />
    </>
  )
}
