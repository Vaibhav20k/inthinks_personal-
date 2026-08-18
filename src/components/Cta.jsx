import { useState } from 'react'
import Section from './Section'

export default function Cta() {
  const [email, setEmail] = useState('')
  const [sent, setSent] = useState(false)

  const onSubmit = (e) => {
    e.preventDefault()
    if (!email) return
    // Template: wire this up to your own signup endpoint.
    setSent(true)
    setEmail('')
  }

  return (
    <Section className="border-t border-white/5">
      <div className="relative overflow-hidden rounded-3xl border border-white/10 bg-white/[0.03] px-6 py-16 text-center sm:px-16">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute left-1/2 top-full -z-10 h-96 w-[48rem] -translate-x-1/2 -translate-y-1/2 rounded-full bg-brand-600/25 blur-[100px]"
        />
        <h2 className="text-3xl font-semibold tracking-tight text-white sm:text-4xl">
          Start thinking out loud
        </h2>
        <p className="mx-auto mt-4 max-w-md text-sm text-ink-300 sm:text-base">
          Join the beta and get every Pro feature free while we build.
        </p>

        <form
          onSubmit={onSubmit}
          className="mx-auto mt-8 flex max-w-md flex-col gap-3 sm:flex-row"
        >
          <label htmlFor="cta-email" className="sr-only">
            Email address
          </label>
          <input
            id="cta-email"
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@company.com"
            className="w-full rounded-full border border-white/15 bg-ink-950/60 px-5 py-3 text-sm text-white placeholder:text-ink-500 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/30"
          />
          <button
            type="submit"
            className="shrink-0 rounded-full bg-white px-6 py-3 text-sm font-medium text-ink-950 transition-transform hover:scale-[1.03]"
          >
            Request access
          </button>
        </form>

        <p className="mt-4 h-4 text-xs text-brand-400" role="status">
          {sent ? 'Thanks — we’ll be in touch.' : ''}
        </p>
      </div>
    </Section>
  )
}
