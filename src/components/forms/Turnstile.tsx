import { useEffect, useRef, useState } from 'react'

/**
 * Cloudflare Turnstile — the bot check on the public forms.
 *
 * Rendered only when the deployment reports a site key, so a deployment
 * without Turnstile shows nothing. The script loads on first use rather than
 * with the site, so a visitor who never submits never contacts Cloudflare's
 * challenge host. Tokens are single-use: change `resetSignal` after a failed
 * submission to get a fresh one.
 */

interface TurnstileApi {
  render: (el: HTMLElement, options: Record<string, unknown>) => string
  reset: (id?: string) => void
  remove: (id: string) => void
}

declare global {
  interface Window {
    turnstile?: TurnstileApi
  }
}

const SCRIPT = 'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit'
let loading: Promise<void> | null = null

function load(): Promise<void> {
  if (window.turnstile) return Promise.resolve()
  loading ??= new Promise<void>((resolve, reject) => {
    const script = document.createElement('script')
    script.src = SCRIPT
    script.async = true
    script.onload = () => resolve()
    script.onerror = () => {
      loading = null
      reject(new Error('turnstile failed to load'))
    }
    document.head.appendChild(script)
  })
  return loading
}

interface Props {
  siteKey: string
  onToken: (token: string | null) => void
  /** Any change re-issues the challenge (tokens are single-use). */
  resetSignal?: number
}

export default function Turnstile({ siteKey, onToken, resetSignal = 0 }: Props) {
  const host = useRef<HTMLDivElement>(null)
  const widget = useRef<string | null>(null)
  const [failed, setFailed] = useState(false)
  // Kept in a ref so a new callback identity does not re-render the widget.
  const report = useRef(onToken)
  report.current = onToken

  useEffect(() => {
    let live = true
    load()
      .then(() => {
        if (!live || !host.current || !window.turnstile) return
        widget.current = window.turnstile.render(host.current, {
          sitekey: siteKey,
          theme: 'auto',
          callback: (token: string) => report.current(token),
          'expired-callback': () => report.current(null),
          'error-callback': () => report.current(null),
        })
      })
      .catch(() => live && setFailed(true))
    return () => {
      live = false
      if (widget.current && window.turnstile) window.turnstile.remove(widget.current)
      widget.current = null
    }
  }, [siteKey])

  useEffect(() => {
    if (resetSignal === 0 || !widget.current || !window.turnstile) return
    report.current(null)
    window.turnstile.reset(widget.current)
  }, [resetSignal])

  if (failed) {
    return (
      <p role="alert" className="text-[0.9375rem] leading-relaxed" style={{ color: 'var(--color-accent-deep)' }}>
        The verification check could not load. Check your connection or any content blocker, then reload the page.
        Your draft is saved.
      </p>
    )
  }
  return <div ref={host} />
}
