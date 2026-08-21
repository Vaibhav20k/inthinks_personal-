import { useCallback, useEffect, useRef, useState } from 'react'
import {
  MODE_KEY, ambientSupported, paint, readMode, systemGround, watchAmbient, writeMode,
} from '../../lib/theme'
import type { Ground, Mode, Source } from '../../lib/theme'

const COPY: Record<Mode, { label: string; note: string }> = {
  auto: { label: 'Auto', note: 'Adapts to your device and, where supported, your environment.' },
  light: { label: 'Light', note: 'Always light.' },
  dark: { label: 'Dark', note: 'Always dark.' },
}

const MODES: Mode[] = ['auto', 'light', 'dark']

/** Minimal line marks. Auto is half-lit, because it is neither on its own. */
function Icon({ mode }: { mode: Mode }) {
  return (
    <svg viewBox="0 0 20 20" width="15" height="15" fill="none" stroke="currentColor"
         strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" focusable="false">
      {mode === 'auto' ? (
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
  )
}

/**
 * Appearance.
 *
 * A menu rather than a cycling button. Three states behind one control means
 * reaching the third by pressing twice and watching the page change on the way
 * — fine for two, wrong for three.
 *
 * AUTO reports what it currently resolves to and where that came from, because
 * "Auto" alone tells a reader nothing about why their screen is dark. The
 * wording never claims more than is true: ambient adaptation is named only
 * where the browser actually offers it.
 */
export default function AppearanceMenu({ className = 'inline-flex' }: { className?: string }) {
  const [mode, setMode] = useState<Mode | null>(null)
  const [ground, setGround] = useState<Ground>('light')
  const [source, setSource] = useState<Source>('system')
  const [open, setOpen] = useState(false)
  const root = useRef<HTMLDivElement>(null)

  useEffect(() => {
    setMode(readMode())
    setGround(document.documentElement.dataset.ground === 'dark' ? 'dark' : 'light')
  }, [])

  const apply = useCallback((next: Ground, from: Source) => {
    paint(next)
    setGround(next)
    setSource(from)
  }, [])

  /**
   * AUTO's watchers.
   *
   * Ambient first where it exists; the system setting otherwise, and also as
   * the answer the moment the sensor is refused or fails — `watchAmbient`
   * returns null for every one of those, so there is a single fallback path
   * rather than one per failure mode.
   */
  useEffect(() => {
    if (mode !== 'auto') return
    const handle = watchAmbient((next) => apply(next, 'ambient'))
    if (handle) {
      setSource('ambient')
      return () => handle.stop()
    }
    // No sensor: follow the system, and keep following it while the page is
    // open, so changing appearance in macOS or Android is reflected at once.
    setSource('system')
    apply(systemGround(), 'system')
    const mq = window.matchMedia?.('(prefers-color-scheme: dark)')
    const onChange = () => apply(systemGround(), 'system')
    mq?.addEventListener('change', onChange)
    return () => mq?.removeEventListener('change', onChange)
  }, [mode, apply])

  /** LIGHT and DARK ignore everything, which is the point of choosing one. */
  useEffect(() => {
    if (mode === 'light' || mode === 'dark') apply(mode, 'system')
  }, [mode, apply])

  /**
   * Another tab changed the preference.
   *
   * `storage` fires only in the tabs that did not make the change, which is
   * exactly the set that needs telling.
   */
  useEffect(() => {
    const onStorage = (e: StorageEvent) => {
      if (e.key !== MODE_KEY) return
      const next = readMode()
      setMode(next)
      if (next !== 'auto') apply(next, 'system')
    }
    window.addEventListener('storage', onStorage)
    return () => window.removeEventListener('storage', onStorage)
  }, [apply])

  // Close on an outside click or Escape, like any menu.
  useEffect(() => {
    if (!open) return
    const onDown = (e: MouseEvent) => {
      if (!root.current?.contains(e.target as Node)) setOpen(false)
    }
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false) }
    document.addEventListener('mousedown', onDown)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onDown)
      document.removeEventListener('keydown', onKey)
    }
  }, [open])

  if (mode === null) return null

  const choose = (next: Mode) => {
    setMode(next)
    writeMode(next)
    setOpen(false)
  }

  return (
    <div ref={root} className={`relative ${className}`}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-haspopup="true"
        className="tap label inline-flex items-center gap-1.5 transition-colors duration-250 hover:text-accent"
        style={{ color: mode === 'auto' ? 'var(--color-faint)' : 'var(--color-accent)' }}
        title={mode === 'auto' ? `Appearance: auto — currently ${ground}` : `Appearance: ${mode}`}
      >
        <Icon mode={mode} />
        <span aria-hidden="true">{COPY[mode].label.toUpperCase()}</span>
        <span className="sr-only">
          Appearance, {COPY[mode].label.toLowerCase()}
          {mode === 'auto' ? `, currently ${ground}` : ''}
        </span>
      </button>

      {open && (
        <div
          role="group"
          aria-label="Appearance"
          className="absolute right-0 top-full z-50 mt-2 w-64 p-4"
          style={{ background: 'var(--color-paper-raised)', border: '1px solid var(--rule-strong)' }}
        >
          <p className="label" style={{ color: 'var(--color-faint)' }}>APPEARANCE</p>

          <ul className="mt-3">
            {MODES.map((m) => {
              const on = m === mode
              return (
                <li key={m}>
                  <button
                    type="button"
                    onClick={() => choose(m)}
                    aria-pressed={on}
                    className="tap flex w-full items-start gap-3 py-2 text-left"
                  >
                    {/* A filled ring, not a tick: three options where exactly
                        one holds is a radio, and it should look like one. */}
                    <span
                      aria-hidden="true"
                      className="mt-[0.2em] grid h-3.5 w-3.5 shrink-0 place-items-center rounded-full"
                      style={{ border: `1px solid ${on ? 'var(--color-accent)' : 'var(--rule-strong)'}` }}
                    >
                      {on && <span className="block h-1.5 w-1.5 rounded-full" style={{ background: 'var(--color-accent)' }} />}
                    </span>
                    <span className="min-w-0">
                      <span className="flex items-center gap-2 text-[0.9375rem] font-medium"
                            style={{ color: on ? 'var(--color-accent)' : 'var(--color-ink)' }}>
                        <Icon mode={m} />
                        {COPY[m].label}
                      </span>
                      {m === 'auto' && (
                        <span className="label mt-1 block" style={{ color: 'var(--color-faint)' }}>
                          {on ? `CURRENTLY ${ground.toUpperCase()} · SOURCE ${source.toUpperCase()}` : 'FOLLOWS YOUR DEVICE'}
                        </span>
                      )}
                    </span>
                  </button>
                </li>
              )
            })}
          </ul>

          {/* Says what Auto actually does on this browser. Claiming room-light
              detection everywhere would be untrue on almost every device. */}
          <p className="body-type mt-3 pt-3 text-[0.8125rem]"
             style={{ color: 'var(--color-muted)', borderTop: '1px solid var(--rule)' }}>
            {ambientSupported()
              ? 'Auto adapts to your device appearance, and to the light in the room where your browser allows it.'
              : 'Auto follows your device appearance.'}
          </p>
        </div>
      )}
    </div>
  )
}
