import { useEffect, useRef, useState } from 'react'
import { Consent, SelectField, TextArea, TextField } from '../components/forms/Fields'
import Button from '../components/primitives/Button'
import Notice from '../components/primitives/Notice'
import Reveal from '../components/primitives/Reveal'
import PageHero from '../components/layout/PageHero'
import { SubmissionError, submissionStatus, submitMessage } from '../lib/api'
import { officeLines, officeMapUrl, site } from '../data/site'

/**
 * Must match the list the Worker checks. The admin view filters on this
 * column, and a topic nobody offered turns a filter into a guess.
 */
const TOPICS = [
  'General enquiry',
  'Technology transfer or licensing',
  'Partnership or collaboration',
  'Working with InThinks',
  'Press or media',
  'Something else',
]

interface Draft {
  name: string
  email: string
  organisation: string
  topic: string
  message: string
  consent: boolean
}

const EMPTY: Draft = { name: '', email: '', organisation: '', topic: '', message: '', consent: false }

/**
 * Must match MESSAGE_SCHEMA in the Worker.
 *
 * The server refuses anything longer, with a field error rather than a silent
 * truncation — quietly cutting someone's message in half is worse than saying
 * no. But finding out at submit that the last 3,000 words will not send is a
 * bad way to learn a limit, so the field stops accepting at the cap and says
 * so as it gets close.
 */
const MESSAGE_MAX = 6000

/**
 * Contact.
 *
 * Deliberately not a third intake. The site already has two long forms, and
 * they are long because an assessment needs particular facts in particular
 * fields — a challenge dropped into a free-text box arrives without the
 * operating conditions that make it answerable. So this page says plainly
 * which form a submission belongs in, and keeps five fields for everything
 * else: the question, the partnership, the "are we even in the right place".
 *
 * A single screen, not a stepped shell. Steps earn their place when a form is
 * long enough to lose your bearings in; wrapping five fields in a wizard would
 * be ceremony.
 */
export default function Contact() {
  const [value, setValue] = useState<Draft>(EMPTY)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [reference, setReference] = useState<string | null>(null)
  const [sending, setSending] = useState(false)
  const [sendError, setSendError] = useState<string | null>(null)
  const [connected, setConnected] = useState<boolean | null>(null)
  /** Bumped on every rejected submit, so the focus effect runs again. */
  const [attempt, setAttempt] = useState(0)

  /**
   * The honeypot's value. A ref, not state: nothing re-renders when it
   * changes, and it never appears in React's tree as something a person is
   * expected to fill.
   */
  const trap = useRef('')

  // Asked on mount so the page can say up front whether it can send, rather
  // than accepting a message the deployment cannot store.
  useEffect(() => {
    let live = true
    submissionStatus().then((s) => live && setConnected(s.submissions))
    return () => { live = false }
  }, [])

  /**
   * Move focus to the first field that needs attention.
   *
   * In an effect rather than in the submit handler: `aria-invalid` is set by
   * the render that the error state triggers, so a query run straight after
   * `setErrors` searches the previous DOM, finds nothing, and leaves focus on
   * the submit button — which is exactly what it did. Keyed on the attempt
   * counter so pressing send twice with the same errors focuses again.
   */
  useEffect(() => {
    if (attempt === 0) return
    document.querySelector<HTMLElement>('[aria-invalid="true"]')?.focus()
  }, [attempt])

  /**
   * Writes a change, and retires any error on the field it touches.
   *
   * Errors were only recomputed on submit, so "PLEASE WRITE A LITTLE MORE" sat
   * under a paragraph the reader had just written — the form telling them off
   * for something they had already fixed. Clearing on edit rather than
   * re-validating on edit is deliberate: validating every keystroke means
   * "A VALID EMAIL ADDRESS" appears the moment someone types the first letter
   * of their own address.
   */
  const update = (patch: Partial<Draft>) => {
    setValue((v) => ({ ...v, ...patch }))
    setErrors((current) => {
      const keys = Object.keys(patch).filter((k) => k in current)
      if (keys.length === 0) return current
      const next = { ...current }
      for (const k of keys) delete next[k]
      return next
    })
  }
  const err = (k: string) => errors[k]

  const check = () => {
    const e: Record<string, string> = {}
    if (!value.name.trim()) e.name = 'Tell us who you are'
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(value.email.trim())) e.email = 'A valid email address, so we can reply'
    if (!value.topic) e.topic = 'Choose what this is about'
    if (value.message.trim().length < 10) e.message = 'Please write a little more'
    if (!value.consent) e.consent = 'Please confirm before sending'
    return e
  }

  const send = async (event: React.FormEvent) => {
    event.preventDefault()
    const found = check()
    setErrors(found)
    if (Object.keys(found).length > 0) {
      setAttempt((n) => n + 1)
      return
    }

    setSending(true)
    setSendError(null)
    try {
      const { consent: _consent, ...rest } = value
      const { reference: issued } = await submitMessage({ ...rest, website: trap.current })
      setReference(issued)
      setValue(EMPTY)
    } catch (cause) {
      if (cause instanceof SubmissionError) {
        setSendError(cause.message)
        if (cause.fields) setErrors(cause.fields)
      } else {
        setSendError('The message could not be sent. Please check your connection and try again.')
      }
    } finally {
      setSending(false)
    }
  }

  if (reference) {
    return (
      <section className="container-grid pb-28 pt-36 sm:pt-44">
        <div className="max-w-2xl">
          <h1 className="statement-type">Message received.</h1>
          <p className="body-type mt-8" style={{ color: 'var(--color-muted)' }}>
            Someone will read this and reply to the address you gave. If it is time-critical,
            write to <a href={`mailto:${site.email}`} className="border-b border-current pb-0.5">{site.email}</a> and
            quote the reference below.
          </p>
          <div className="mt-10 p-6" style={{ border: '1px solid var(--rule-strong)' }}>
            <p className="label" style={{ color: 'var(--color-faint)' }}>MESSAGE REFERENCE</p>
            <p className="ident mt-2 text-[1.5rem]" style={{ color: 'var(--color-accent)' }}>{reference}</p>
          </div>
          <div className="mt-10 flex flex-wrap gap-3">
            <Button to="/technologies">Explore Technologies</Button>
            <Button to="/" variant="outline">Back to home</Button>
          </div>
        </div>
      </section>
    )
  }

  return (
    <>
      <PageHero
        eyebrow="Contact"
        title="Talk to InThinks."
        lede="A question, a partnership, or working out whether we are the right people to ask. If you are submitting an industrial challenge or an innovation, the forms for those ask for what an assessment actually needs — use them instead and it will reach the right desk."
      >
        {connected === false && (
          <Notice>
            Messages are not configured on this deployment yet — the form will not send.
            Email {site.email} in the meantime.
          </Notice>
        )}
      </PageHero>

      <section className="container-grid pb-28">
        <div className="grid gap-14 lg:grid-cols-12 lg:gap-16">
          {/* The form leads: this page exists to be written in. */}
          <div className="min-w-0 lg:col-span-7">
            <form onSubmit={send} noValidate>
              <div className="grid gap-7">
                <div className="grid gap-7 sm:grid-cols-2">
                  <TextField
                    label="Your name" required value={value.name} error={err('name')}
                    onChange={(v) => update({ name: v })}
                  />
                  {/* No hint here on purpose. "Where the reply goes" repeats
                      what the button already says, and its extra line pushed
                      this input a row below the one beside it. */}
                  <TextField
                    label="Email" required type="email" inputMode="email"
                    value={value.email} error={err('email')}
                    onChange={(v) => update({ email: v })}
                  />
                </div>

                <TextField
                  label="Organisation" value={value.organisation}
                  onChange={(v) => update({ organisation: v })}
                  placeholder="Company, institution, or leave blank"
                />

                <SelectField
                  label="What is this about" required options={TOPICS}
                  value={value.topic} error={err('topic')}
                  onChange={(v) => update({ topic: v })}
                  placeholder="Choose one…"
                />

                <div>
                  <TextArea
                    label="Message" required rows={8} value={value.message} error={err('message')}
                    onChange={(v) => update({ message: v.slice(0, MESSAGE_MAX) })}
                    hint="Plain language is fine. Enough detail that a reply can be useful rather than a request for more detail."
                  />
                  {/* Silent until it matters. A counter running from zero on an
                      empty box reads as a word limit to hit rather than a
                      ceiling to stay under. */}
                  {value.message.length > MESSAGE_MAX * 0.8 && (
                    <p className="label mt-2" aria-live="polite" style={{ color: value.message.length >= MESSAGE_MAX ? 'var(--color-accent-deep)' : 'var(--color-faint)' }}>
                      {value.message.length >= MESSAGE_MAX
                        ? `MESSAGE LIMIT REACHED — ${MESSAGE_MAX.toLocaleString()} CHARACTERS`
                        : `${(MESSAGE_MAX - value.message.length).toLocaleString()} CHARACTERS LEFT`}
                    </p>
                  )}
                </div>

                {/* The honeypot.
                    Off-screen rather than display:none — some bots skip hidden
                    inputs but fill positioned ones. Out of the tab order,
                    hidden from assistive tech, and autocomplete off, so no
                    person and no password manager ever puts anything in it.
                    A filled value is answered with a plausible reference and
                    quietly dropped; see handleMessage in worker/index.ts. */}
                <div aria-hidden="true" className="absolute left-[-9999px] top-0 h-0 w-0 overflow-hidden">
                  <label htmlFor="contact-website">Website</label>
                  <input
                    id="contact-website"
                    name="website"
                    type="text"
                    tabIndex={-1}
                    autoComplete="off"
                    defaultValue=""
                    onChange={(e) => { trap.current = e.target.value }}
                  />
                </div>

                <div>
                  <Consent
                    label="I agree that InThinks may store this message and the details above in order to reply to it."
                    checked={value.consent}
                    onChange={(v) => update({ consent: v })}
                  />
                  {err('consent') && (
                    <p role="alert" className="label mt-2" style={{ color: 'var(--color-accent-deep)' }}>
                      {err('consent')}
                    </p>
                  )}
                </div>

                {sendError && (
                  <p role="alert" className="label px-3 py-2" style={{ border: '1px solid var(--color-accent-deep)', color: 'var(--color-accent-deep)' }}>
                    {sendError}
                  </p>
                )}

                <div className="flex flex-wrap items-center gap-4 pt-2">
                  <button
                    type="submit"
                    disabled={sending}
                    className="tap bg-[var(--color-cta)] px-7 py-3.5 text-[0.9375rem] font-medium text-[var(--color-cta-text)] transition-colors duration-300 hover:bg-accent disabled:opacity-60"
                  >
                    {sending ? 'Sending…' : 'Send message'}
                  </button>
                  {/* Says what happens next, next to the button that makes it
                      happen — the one place a reader is deciding to press it. */}
                  <p className="label" style={{ color: 'var(--color-faint)' }}>
                    WE REPLY BY EMAIL
                  </p>
                </div>
              </div>
            </form>
          </div>

          {/* The other ways to reach us, and the two forms this page is not. */}
          <aside className="min-w-0 lg:col-span-4 lg:col-start-9">
            <Reveal>
              <h2 className="label pb-3" style={{ color: 'var(--color-muted)', borderTop: '1px solid var(--rule)', paddingTop: '0.75rem' }}>
                DIRECT
              </h2>
              <dl className="mt-4">
                <dt className="label" style={{ color: 'var(--color-faint)' }}>EMAIL</dt>
                <dd className="mt-2">
                  <a href={`mailto:${site.email}`} className="tap group inline-flex min-h-11 items-center text-[0.9375rem] font-medium">
                    <span className="border-b border-transparent pb-0.5 transition-colors duration-250 group-hover:border-current">
                      {site.email}
                    </span>
                  </a>
                </dd>

                <dt className="label mt-8 pt-6" style={{ color: 'var(--color-faint)', borderTop: '1px solid var(--rule)' }}>OFFICE</dt>
                <dd className="mt-2">
                  <address className="not-italic text-[0.9375rem] font-medium leading-relaxed">
                    {officeLines.map((line) => (
                      <span key={line} className="block">{line}</span>
                    ))}
                  </address>
                  <a
                    href={officeMapUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="tap group mt-1 inline-flex min-h-11 items-center gap-2 text-[0.875rem]"
                    style={{ color: 'var(--color-muted)' }}
                  >
                    <span className="border-b border-transparent pb-0.5 transition-colors duration-250 group-hover:border-current">
                      View on map
                    </span>
                    <span aria-hidden="true" style={{ color: 'var(--color-accent)' }}>↗</span>
                    <span className="sr-only">(opens in a new tab)</span>
                  </a>
                </dd>
              </dl>
            </Reveal>

            <Reveal delay={90}>
              <div className="mt-10 pt-6" style={{ borderTop: '1px solid var(--rule)' }}>
                <h2 className="label" style={{ color: 'var(--color-faint)' }}>SENDING SOMETHING SPECIFIC?</h2>
                <p className="body-type mt-3 text-[0.9375rem]" style={{ color: 'var(--color-muted)' }}>
                  These ask the questions an assessment needs, so a submission through them
                  can actually be evaluated rather than returned with more questions.
                </p>
                <div className="mt-5 flex flex-col gap-3">
                  <Button to="/submit-challenge" variant="outline">Submit a Challenge</Button>
                  <Button to="/submit-innovation" variant="outline">Submit an Innovation</Button>
                </div>
              </div>
            </Reveal>
          </aside>
        </div>
      </section>
    </>
  )
}
