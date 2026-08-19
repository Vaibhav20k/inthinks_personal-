import { useCallback, useEffect, useState } from 'react'

type Ground = 'light' | 'dark'
type Mode = 'auto' | Ground

const KEY = 'inthinks-ground'

/** The order a click walks through. AUTO is first, and is where you land back. */
const CYCLE: Mode[] = ['auto', 'light', 'dark']

/**
 * What the pre-paint script in index.html hands over.
 *
 * It owns the definition of "automatic" — system setting, then the visitor's
 * own sunrise and sunset — because it has to answer that question before the
 * bundle exists. This component asks it rather than keeping a second copy.
 */
declare global {
  interface Window {
    __inthinksGround?: {
      auto: () => Ground
      mode: () => Mode
      apply: (ground: Ground) => void
    }
  }
}

/** Falls back to reading the DOM if the inline script did not run. */
const readMode = (): Mode => {
  const api = window.__inthinksGround
  if (api) return api.mode()
  try {
    const v = localStorage.getItem(KEY)
    return v === 'light' || v === 'dark' ? v : 'auto'
  } catch { return 'auto' }
}

const resolve = (mode: Mode): Ground => {
  if (mode !== 'auto') return mode
  const api = window.__inthinksGround
  if (api) return api.auto()
  return document.documentElement.getAttribute('data-ground') === 'dark' ? 'dark' : 'light'
}

const paint = (ground: Ground) => {
  const api = window.__inthinksGround
  if (api) { api.apply(ground); return }
  if (ground === 'dark') document.documentElement.setAttribute('data-ground', 'dark')
  else document.documentElement.removeAttribute('data-ground')
  document
    .querySelector('meta[name="theme-color"]')
    ?.setAttribute('content', ground === 'dark' ? '#050505' : '#ffffff')
}

const COPY: Record<Mode, { label: string; hint: string }> = {
  auto: { label: 'AUTO', hint: 'following your sunset' },
  light: { label: 'LIGHT', hint: 'held light' },
  dark: { label: 'DARK', hint: 'held dark' },
}

/**
 * Switches the ground, in three positions rather than two.
 *
 * A two-position switch had a trap in it: the site picks a ground from the
 * visitor's clock, one click pinned the opposite, and there was no way back to
 * automatic short of clearing site data. Someone who tried the control once at
 * noon was still being shown a white page at ten at night, with nothing on
 * screen to tell them why or how to undo it.
 *
 * So AUTO is a position you can see and return to, not the absence of a
 * choice. The label says which of the three you are in — this control was
 * missed entirely when it was an unlabelled icon, and a three-state icon
 * would have been harder to read, not easier.
 *
 * It renders nothing until mounted. The ground is set before first paint, so
 * rendering during SSR or before hydration would announce a state the control
 * might not actually be in.
 *
 * The display class is the caller's, not this component's: the header hides
 * its copy below `sm` and the mobile menu shows one instead. A `display` baked
 * in here would win over the `hidden` the header passes — Tailwind resolves
 * that clash by stylesheet order, not by class order — and both copies would
 * render on a phone.
 */
export default function GroundToggle({ className = 'inline-flex' }: { className?: string }) {
  const [mode, setMode] = useState<Mode | null>(null)

  useEffect(() => { setMode(readMode()) }, [])

  const sync = useCallback(() => {
    setMode((current) => {
      if (current === null || current !== 'auto') return current
      paint(resolve('auto'))
      return current
    })
  }, [])

  // AUTO has to keep up on its own, or it is only automatic at the moment the
  // page loaded. Three things move under it: the system setting, the clock
  // crossing sunset during a long read, and the sunrise times arriving from
  // the API a moment after load on a first visit.
  useEffect(() => {
    if (mode !== 'auto') return
    const mq = window.matchMedia?.('(prefers-color-scheme: dark)')
    mq?.addEventListener('change', sync)
    const tick = window.setInterval(sync, 60_000)
    // A tab left open overnight is the common case for the clock crossing.
    document.addEventListener('visibilitychange', sync)
    return () => {
      mq?.removeEventListener('change', sync)
      window.clearInterval(tick)
      document.removeEventListener('visibilitychange', sync)
    }
  }, [mode, sync])

  if (mode === null) return null

  const next = CYCLE[(CYCLE.indexOf(mode) + 1) % CYCLE.length]

  const advance = () => {
    setMode(next)
    paint(resolve(next))
    try {
      if (next === 'auto') localStorage.removeItem(KEY)
      else localStorage.setItem(KEY, next)
    } catch { /* storage blocked; the sun still decides on the next visit */ }
  }

  return (
    <button
      type="button"
      onClick={advance}
      className={`tap label items-center gap-1.5 transition-colors duration-250 hover:text-accent ${className}`}
      style={{ color: mode === 'auto' ? 'var(--color-faint)' : 'var(--color-accent)' }}
      aria-label={`Theme ${COPY[mode].label.toLowerCase()}, ${COPY[mode].hint}. Switch to ${COPY[next].label.toLowerCase()}.`}
      title={`Theme: ${COPY[mode].label.toLowerCase()} — ${COPY[mode].hint}. Click for ${COPY[next].label.toLowerCase()}.`}
    >
      {/* The icon names the position the control is in, and the word beside it
          says the same thing — the icon alone was the version nobody found. */}
      <svg viewBox="0 0 20 20" width="15" height="15" fill="none" stroke="currentColor"
           strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" focusable="false">
        {mode === 'auto' ? (
          /* Half lit: neither one nor the other, because the sun decides. */
          <>
            <circle cx="10" cy="10" r="6.4" />
            <path d="M10 3.6a6.4 6.4 0 0 1 0 12.8Z" fill="currentColor" stroke="none" />
          </>
        ) : mode === 'light' ? (
          <>
            <circle cx="10" cy="10" r="3.4" />
            <path d="M10 2v1.8M10 16.2V18M2 10h1.8M16.2 10H18M4.3 4.3l1.3 1.3M14.4 14.4l1.3 1.3M15.7 4.3l-1.3 1.3M5.6 14.4l-1.3 1.3" />
          </>
        ) : (
          <path d="M16.5 11.4A6.6 6.6 0 0 1 8.6 3.5a6.8 6.8 0 1 0 7.9 7.9Z" />
        )}
      </svg>
      <span aria-hidden="true">{COPY[mode].label}</span>
    </button>
  )
}
