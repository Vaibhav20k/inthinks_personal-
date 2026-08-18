import { useEffect, useState } from 'react'
import { nav } from '../content'
import Icon from './Icon'
import Logo from './Logo'

export default function Nav() {
  const [open, setOpen] = useState(false)
  const [scrolled, setScrolled] = useState(false)

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8)
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  return (
    <header
      className={`fixed inset-x-0 top-0 z-50 transition-colors duration-300 ${
        scrolled || open
          ? 'border-b border-white/10 bg-ink-950/80 backdrop-blur-xl'
          : 'border-b border-transparent'
      }`}
    >
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-5 sm:px-8">
        <Logo />

        <nav className="hidden items-center gap-8 md:flex">
          {nav.map((item) => (
            <a
              key={item.label}
              href={item.href}
              className="text-sm text-ink-300 transition-colors hover:text-white"
            >
              {item.label}
            </a>
          ))}
        </nav>

        <div className="hidden items-center gap-3 md:flex">
          <a href="#" className="text-sm text-ink-300 transition-colors hover:text-white">
            Sign in
          </a>
          <a
            href="#pricing"
            className="rounded-full bg-white px-4 py-2 text-sm font-medium text-ink-950 transition-transform hover:scale-[1.03]"
          >
            Get started
          </a>
        </div>

        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          aria-expanded={open}
          aria-label={open ? 'Close menu' : 'Open menu'}
          className="grid h-10 w-10 place-items-center rounded-lg text-ink-100 hover:bg-white/10 md:hidden"
        >
          <Icon name={open ? 'close' : 'menu'} className="h-5 w-5" />
        </button>
      </div>

      {open && (
        <div className="border-t border-white/10 px-5 pb-6 pt-4 md:hidden">
          <nav className="flex flex-col gap-1">
            {nav.map((item) => (
              <a
                key={item.label}
                href={item.href}
                onClick={() => setOpen(false)}
                className="rounded-lg px-3 py-2.5 text-sm text-ink-100 hover:bg-white/5"
              >
                {item.label}
              </a>
            ))}
          </nav>
          <a
            href="#pricing"
            onClick={() => setOpen(false)}
            className="mt-4 block rounded-full bg-white px-4 py-2.5 text-center text-sm font-medium text-ink-950"
          >
            Get started
          </a>
        </div>
      )}
    </header>
  )
}
