/**
 * Appearance: AUTO, LIGHT, DARK.
 *
 * The rule is short and the whole system exists to keep it true: a mode the
 * visitor chose is obeyed until they change it. Only AUTO responds to anything.
 *
 *   LIGHT / DARK  → that ground, regardless of room, system or hour.
 *   AUTO          → ambient light where it is available and usable,
 *                   otherwise the system's own appearance.
 *
 * Ambient sensing is a progressive enhancement and nothing depends on it. It is
 * unavailable in most browsers, and where it exists it can be refused, throw,
 * or report from hardware that is not there. Every one of those paths ends in
 * the same place — the system setting — without a message, because a visitor
 * whose browser has no light sensor has not done anything wrong.
 */

export type Mode = 'auto' | 'light' | 'dark'
export type Ground = 'light' | 'dark'
/** Where AUTO's answer came from, for the menu to report honestly. */
export type Source = 'ambient' | 'system'

export const MODE_KEY = 'inthinks-theme-mode'

/**
 * The key this replaced.
 *
 * Its values are dropped rather than carried forward. AUTO is the default and
 * stays the default: a pin written under the old two-then-three-position
 * control is not a choice anyone made about *this* system, and honouring it
 * would leave a returning visitor stuck on a ground they never picked here.
 * It is deleted on sight so it cannot come back.
 */
const LEGACY_KEY = 'inthinks-ground-v2'

/**
 * Hysteresis, not a threshold.
 *
 * One number means a room sitting near it flips the site back and forth as a
 * cloud passes. Below 30 lux is dark, above 80 is light, and the gap between
 * belongs to whichever ground is already showing.
 */
export const DARK_BELOW = 30
export const LIGHT_ABOVE = 80

/** How long a reading has to hold before it counts. */
export const SETTLE_MS = 3000

export const readMode = (): Mode => {
  try {
    localStorage.removeItem(LEGACY_KEY)
    const v = localStorage.getItem(MODE_KEY)
    if (v === 'auto' || v === 'light' || v === 'dark') return v
  } catch { /* storage blocked: AUTO is the right default anyway */ }
  return 'auto'
}

export const writeMode = (mode: Mode) => {
  try {
    localStorage.setItem(MODE_KEY, mode)
    localStorage.removeItem(LEGACY_KEY)
  } catch { /* storage blocked; the choice holds for this page only */ }
}

export const systemGround = (): Ground =>
  typeof window !== 'undefined' && window.matchMedia?.('(prefers-color-scheme: dark)').matches
    ? 'dark'
    : 'light'

/** Whether this browser has the sensor at all. Says nothing about permission. */
export const ambientSupported = () =>
  typeof window !== 'undefined' && 'AmbientLightSensor' in window

/**
 * Paints a ground.
 *
 * The transition class is added only around an actual change, so the page does
 * not carry a transition on every colour for its whole life — which would make
 * every hover fade.
 */
export function paint(ground: Ground, animate = true) {
  const root = document.documentElement
  const current: Ground = root.dataset.ground === 'dark' ? 'dark' : 'light'
  // Already there: setting it again would restart the transition for nothing.
  if (current === ground) return
  if (animate && !window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) {
    root.classList.add('theme-shifting')
    window.setTimeout(() => root.classList.remove('theme-shifting'), 300)
  }
  if (ground === 'dark') root.setAttribute('data-ground', 'dark')
  else root.removeAttribute('data-ground')
  document
    .querySelector('meta[name="theme-color"]')
    ?.setAttribute('content', ground === 'dark' ? '#050505' : '#ffffff')
}

/* ------------------------------------------------------------- interaction */

/**
 * Is the visitor in the middle of something?
 *
 * A ground change is never worth interrupting a sentence someone is typing or
 * a file they are dropping. Nothing is lost by it — the ground is an attribute
 * on the root element and React state survives — but the flash pulls attention
 * away from the field they are in, and on a long form that is its own kind of
 * data loss.
 */
export function isBusy(): boolean {
  const el = document.activeElement
  if (el instanceof HTMLElement) {
    const tag = el.tagName
    if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || el.isContentEditable) return true
    if (el.getAttribute('aria-expanded') === 'true') return true
  }
  // A dialog open on screen is a decision in progress.
  return document.querySelector('dialog[open], [role="dialog"]') !== null
}

/* ----------------------------------------------------------------- ambient */

interface AmbientHandle {
  stop: () => void
}

/**
 * Watches the room, if the browser will let it.
 *
 * Returns null the moment anything is missing, so the caller falls back to the
 * system setting without having to know why. Nothing about the reading is
 * stored, sent anywhere or kept between readings: the lux value is compared
 * against two constants and discarded.
 */
export function watchAmbient(onGround: (ground: Ground) => void): AmbientHandle | null {
  if (!ambientSupported()) return null

  interface SensorLike {
    illuminance?: number
    addEventListener: (type: string, fn: () => void) => void
    start: () => void
    stop: () => void
  }
  type SensorCtor = new (options: { frequency: number }) => SensorLike

  let sensor: SensorLike
  try {
    const Ctor = (window as unknown as { AmbientLightSensor: SensorCtor }).AmbientLightSensor
    // A low frequency on purpose: this is a room, not a waveform, and polling
    // hard would cost battery to learn nothing.
    sensor = new Ctor({ frequency: 1 })
  } catch {
    return null
  }

  let settleTimer: number | null = null
  let pending: Ground | null = null
  let failed = false

  const clear = () => {
    if (settleTimer !== null) window.clearTimeout(settleTimer)
    settleTimer = null
    pending = null
  }

  const onReading = () => {
    const lux = sensor.illuminance
    if (typeof lux !== 'number' || Number.isNaN(lux)) return

    // Between the two thresholds nothing changes — that band belongs to
    // whichever ground is already showing.
    const wants: Ground | null = lux < DARK_BELOW ? 'dark' : lux > LIGHT_ABOVE ? 'light' : null
    const current: Ground = document.documentElement.dataset.ground === 'dark' ? 'dark' : 'light'
    if (wants === null || wants === current) { clear(); return }

    // The condition has to hold. A hand passing over the sensor, a window, a
    // bright screen — all of them read as a change for a moment.
    if (pending === wants) return
    clear()
    pending = wants
    settleTimer = window.setTimeout(function commit() {
      if (pending === null) return
      if (isBusy()) {
        // Wait rather than interrupt; check again shortly.
        settleTimer = window.setTimeout(commit, 1500)
        return
      }
      const ground = pending
      clear()
      onGround(ground)
    }, SETTLE_MS)
  }

  try {
    sensor.addEventListener('reading', onReading)
    sensor.addEventListener('error', () => { failed = true; clear() })
    sensor.start()
  } catch {
    // Permission refused, hardware absent, blocked by policy — all the same
    // outcome, and none of them is worth telling the visitor about.
    return null
  }

  return {
    stop: () => {
      clear()
      try { if (!failed) sensor.stop() } catch { /* already gone */ }
    },
  }
}
