import { useEffect, useState } from 'react'

type Ground = 'light' | 'dark'

const KEY = 'inthinks-ground'
const read = (): Ground =>
  document.documentElement.getAttribute('data-ground') === 'dark' ? 'dark' : 'light'

/**
 * Switches the ground, and remembers.
 *
 * The site picks a ground from the visitor's clock, which means the site has
 * made a decision on their behalf. That is only acceptable if they can undo it
 * — so this exists, and what it writes wins over both the clock and the system
 * setting on every later visit.
 *
 * It renders nothing until mounted. The ground is set by an inline script
 * before first paint, so rendering this during SSR or before hydration would
 * mean announcing a state the button might not actually be in.
 */
export default function GroundToggle({ className = '' }: { className?: string }) {
  const [ground, setGround] = useState<Ground | null>(null)

  useEffect(() => { setGround(read()) }, [])

  // A visitor who never touches this should still follow their clock across a
  // long session, so an untouched page keeps up with the system setting.
  useEffect(() => {
    if (!window.matchMedia) return
    const mq = window.matchMedia('(prefers-color-scheme: dark)')
    const onChange = () => {
      try { if (localStorage.getItem(KEY)) return } catch { /* storage blocked */ }
      const next: Ground = mq.matches ? 'dark' : 'light'
      apply(next)
      setGround(next)
    }
    mq.addEventListener('change', onChange)
    return () => mq.removeEventListener('change', onChange)
  }, [])

  const apply = (next: Ground) => {
    if (next === 'dark') document.documentElement.setAttribute('data-ground', 'dark')
    else document.documentElement.removeAttribute('data-ground')
    // The phone's browser bar is tinted by this, so it has to move with the
    // ground or there is a white strip above a black page.
    document
      .querySelector('meta[name="theme-color"]')
      ?.setAttribute('content', next === 'dark' ? '#050505' : '#ffffff')
  }

  if (ground === null) return null

  const next: Ground = ground === 'light' ? 'dark' : 'light'

  return (
    <button
      type="button"
      onClick={() => {
        apply(next)
        setGround(next)
        try { localStorage.setItem(KEY, next) } catch { /* storage blocked; the clock still decides next visit */ }
      }}
      className={`tap label transition-colors duration-250 hover:text-accent ${className}`}
      style={{ color: 'var(--color-faint)' }}
      aria-label={`Switch to the ${next} ground`}
      title={`Switch to the ${next} ground`}
    >
      <span aria-hidden="true">{ground === 'light' ? 'DARK' : 'LIGHT'}</span>
    </button>
  )
}
