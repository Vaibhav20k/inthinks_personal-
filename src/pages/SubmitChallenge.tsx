import { useEffect, useState } from 'react'
import PageMeta from '../components/layout/PageMeta'
import FormShell from '../components/forms/FormShell'
import type { Step } from '../components/forms/FormShell'
import Confirmation from '../components/forms/Confirmation'
import { ChoiceGroup, Consent, SelectField, TextArea, TextField } from '../components/forms/Fields'
import PageHero from '../components/layout/PageHero'
import Notice from '../components/primitives/Notice'
import { useDraft, useSubmissionKey } from '../lib/draft'
import Turnstile from '../components/forms/Turnstile'
import { SubmissionError, submissionStatus, submitChallenge } from '../lib/api'
import { impactOptions, sectors } from '../data/taxonomy'

interface ChallengeDraft {
  /** Persisted so a reload returns to the step the user was on. */
  step: number
  title: string
  statement: string
  currently: string
  currentSolution: string
  inadequate: string
  success: string
  sector: string
  application: string
  process: string
  equipment: string
  materials: string
  temperature: string
  pressure: string
  humidity: string
  chemical: string
  scale: string
  performance: string
  installation: string
  constraints: string
  impacts: string[]
  annualImpact: string
  targetPerformance: string
  timeline: string
  desiredTrl: string
  pilot: string
  retrofit: string
  capex: string
  opex: string
  manufacturing: string
  regulatory: string
  geographic: string
  confidentiality: string[]
  company: string
  contact: string
  designation: string
  email: string
  phone: string
  location: string
  website: string
  consent: boolean
}

const EMPTY: ChallengeDraft = {
  step: 0,
  title: '', statement: '', currently: '', currentSolution: '', inadequate: '', success: '',
  sector: '', application: '', process: '', equipment: '', materials: '', temperature: '',
  pressure: '', humidity: '', chemical: '', scale: '', performance: '', installation: '',
  constraints: '', impacts: [], annualImpact: '', targetPerformance: '', timeline: '',
  desiredTrl: '', pilot: '', retrofit: '', capex: '', opex: '', manufacturing: '',
  regulatory: '', geographic: '', confidentiality: ['standard'], company: '', contact: '',
  designation: '', email: '', phone: '', location: '', website: '', consent: false,
}

const YES_NO = ['Yes', 'No', 'Not sure'] as const
const SENSITIVITY = ['Low', 'Moderate', 'High', 'Not sure'] as const

export default function SubmitChallenge() {
  const { value, update, clear, savedAt } = useDraft<ChallengeDraft>('inthinks.challenge', EMPTY)
  const submission = useSubmissionKey('inthinks.challenge')
  const [siteKey, setSiteKey] = useState<string | null>(null)
  const [token, setToken] = useState<string | null>(null)
  const [resetSignal, setResetSignal] = useState(0)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [reference, setReference] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState<string | null>(null)
  const [connected, setConnected] = useState<boolean | null>(null)

  // Asked once on mount so the form can say up front whether it can be sent,
  // rather than failing at the end of six steps.
  useEffect(() => {
    let live = true
    submissionStatus().then((s) => {
      if (!live) return
      setConnected(s.submissions)
      setSiteKey(s.turnstileSiteKey)
    })
    return () => {
      live = false
    }
  }, [])

  const send = async () => {
    if (siteKey && !token) {
      setSubmitError('Please complete the verification check below, then submit again.')
      return
    }
    setSubmitting(true)
    setSubmitError(null)
    try {
      // `step` is local bookkeeping and never leaves the browser.
      const { step: _step, ...record } = value
      const { reference: issued } = await submitChallenge(record, { idempotencyKey: submission.key, turnstileToken: token })
      setReference(issued)
      clear()
      submission.renew()
    } catch (cause) {
      // The bot-check token was spent on this attempt; a retry needs a new one.
      // The idempotency key is kept, so a retry cannot open a second case.
      setResetSignal((n) => n + 1)
      if (cause instanceof SubmissionError) {
        setSubmitError(cause.message)
        if (cause.fields) setErrors(cause.fields)
      } else {
        setSubmitError('The submission could not be sent. Please check your connection and try again.')
      }
    } finally {
      setSubmitting(false)
    }
  }

  const err = (k: string) => errors[k]
  const toggle = (key: 'impacts', v: string) =>
    update({ [key]: value[key].includes(v) ? value[key].filter((x) => x !== v) : [...value[key], v] } as Partial<ChallengeDraft>)

  const steps: Step[] = [
    {
      title: 'Define the challenge',
      validate: () => {
        const e: Record<string, string> = {}
        if (!value.title.trim()) e.title = 'Give the challenge a short title'
        if (value.statement.trim().length < 40) e.statement = 'Describe the problem in a little more detail'
        return e
      },
      render: () => (
        <>
          <TextField label="Challenge title" required value={value.title} error={err('title')} onChange={(v) => update({ title: v })} placeholder="A short name for the problem" />
          <TextArea label="Detailed problem statement" required rows={6} value={value.statement} error={err('statement')} onChange={(v) => update({ statement: v })} hint="What is going wrong, where, and under what conditions." />
          <TextArea label="What currently happens?" value={value.currently} onChange={(v) => update({ currently: v })} />
          <TextArea label="What solution do you currently use?" value={value.currentSolution} onChange={(v) => update({ currentSolution: v })} />
          <TextArea label="What is inadequate about the current solution?" value={value.inadequate} onChange={(v) => update({ inadequate: v })} />
          <TextArea label="What would a successful outcome look like?" value={value.success} onChange={(v) => update({ success: v })} hint="The clearer this is, the more precisely the portfolio can be searched." />
        </>
      ),
    },
    {
      title: 'Technical environment',
      validate: (): Record<string, string> =>
        value.sector ? {} : { sector: 'Select the industry sector' },
      render: () => (
        <>
          <SelectField label="Industry sector" required options={sectors} value={value.sector} error={err('sector')} onChange={(v) => update({ sector: v })} />
          <TextField label="Application" value={value.application} onChange={(v) => update({ application: v })} />
          <TextField label="Process" value={value.process} onChange={(v) => update({ process: v })} />
          <TextField label="Equipment" value={value.equipment} onChange={(v) => update({ equipment: v })} />
          <TextField label="Materials involved" value={value.materials} onChange={(v) => update({ materials: v })} />
          <div className="grid gap-8 sm:grid-cols-2">
            <TextField label="Operating temperature" value={value.temperature} onChange={(v) => update({ temperature: v })} placeholder="e.g. −20 to 180 °C" />
            <TextField label="Pressure" value={value.pressure} onChange={(v) => update({ pressure: v })} />
            <TextField label="Humidity" value={value.humidity} onChange={(v) => update({ humidity: v })} />
            <TextField label="Chemical environment" value={value.chemical} onChange={(v) => update({ chemical: v })} />
          </div>
          <TextField label="Production scale" value={value.scale} onChange={(v) => update({ scale: v })} />
          <TextArea label="Performance requirement" value={value.performance} onChange={(v) => update({ performance: v })} />
          <TextField label="Installation environment" value={value.installation} onChange={(v) => update({ installation: v })} />
          <TextArea label="Other technical constraints" value={value.constraints} onChange={(v) => update({ constraints: v })} />
        </>
      ),
    },
    {
      title: 'Business impact',
      validate: (): Record<string, string> =>
        value.impacts.length ? {} : { impacts: 'Select at least one impact' },
      render: () => (
        <>
          <ChoiceGroup
            legend="What does the problem cause?"
            required
            hint="Select everything that applies."
            options={impactOptions.map((o) => ({ value: o, label: o }))}
            selected={value.impacts}
            onToggle={(v) => toggle('impacts', v)}
            error={err('impacts')}
          />
          <TextField label="Estimated annual impact" value={value.annualImpact} onChange={(v) => update({ annualImpact: v })} hint="Only if you are comfortable sharing it. A range is fine, and this is never published." />
        </>
      ),
    },
    {
      title: 'Solution constraints',
      render: () => (
        <>
          <TextArea label="Target performance" value={value.targetPerformance} onChange={(v) => update({ targetPerformance: v })} />
          <TextField label="Target implementation timeline" value={value.timeline} onChange={(v) => update({ timeline: v })} />
          <SelectField label="Desired TRL" options={['TRL 4–6 — validated, needs adaptation', 'TRL 7–9 — deployment ready', 'Open to earlier stage']} value={value.desiredTrl} onChange={(v) => update({ desiredTrl: v })} />
          <div className="grid gap-8 sm:grid-cols-2">
            <SelectField label="Pilot requirement" options={YES_NO} value={value.pilot} onChange={(v) => update({ pilot: v })} />
            <SelectField label="Retrofit requirement" options={YES_NO} value={value.retrofit} onChange={(v) => update({ retrofit: v })} />
            <SelectField label="CAPEX sensitivity" options={SENSITIVITY} value={value.capex} onChange={(v) => update({ capex: v })} />
            <SelectField label="Operating-cost sensitivity" options={SENSITIVITY} value={value.opex} onChange={(v) => update({ opex: v })} />
          </div>
          <TextArea label="Manufacturing restrictions" value={value.manufacturing} onChange={(v) => update({ manufacturing: v })} />
          <TextArea label="Regulatory constraints" value={value.regulatory} onChange={(v) => update({ regulatory: v })} />
          <TextField label="Geographic constraints" value={value.geographic} onChange={(v) => update({ geographic: v })} />
        </>
      ),
    },
    {
      title: 'Confidentiality',
      render: () => (
        <>
          <ChoiceGroup
            legend="How should this challenge be handled?"
            multiple={false}
            options={[
              { value: 'standard', label: 'Standard confidential submission', note: 'Reviewed internally. Not shared outside the evaluation team.' },
              { value: 'nda-required', label: 'NDA required before detailed discussion', note: 'We will put an agreement in place before technical detail is exchanged.' },
              { value: 'open-innovation', label: 'Open innovation challenge', note: 'You are willing for the problem to be described publicly.' },
            ]}
            selected={value.confidentiality}
            onToggle={(v) => update({ confidentiality: [v] })}
          />
          <Notice>Challenge information is not publicly displayed without your authorisation.</Notice>
        </>
      ),
    },
    {
      title: 'Company details',
      validate: () => {
        const e: Record<string, string> = {}
        if (!value.company.trim()) e.company = 'Company name is required'
        if (!value.contact.trim()) e.contact = 'Contact name is required'
        if (!/^\S+@\S+\.\S+$/.test(value.email)) e.email = 'Enter a valid corporate email address'
        if (!value.consent) e.consent = 'Consent is required to proceed'
        return e
      },
      render: () => (
        <>
          <TextField label="Company" required value={value.company} error={err('company')} onChange={(v) => update({ company: v })} />
          <div className="grid gap-8 sm:grid-cols-2">
            <TextField label="Contact name" required value={value.contact} error={err('contact')} onChange={(v) => update({ contact: v })} />
            <TextField label="Designation" value={value.designation} onChange={(v) => update({ designation: v })} />
            <TextField label="Corporate email" required type="email" inputMode="email" value={value.email} error={err('email')} onChange={(v) => update({ email: v })} />
            <TextField label="Phone" type="tel" inputMode="tel" value={value.phone} onChange={(v) => update({ phone: v })} />
            <TextField label="Location" value={value.location} onChange={(v) => update({ location: v })} />
            <TextField label="Website" type="url" inputMode="url" value={value.website} onChange={(v) => update({ website: v })} />
          </div>
          <Consent
            label="I consent to InThinks reviewing this challenge and contacting me about relevant technology opportunities."
            checked={value.consent}
            onChange={(v) => update({ consent: v })}
          />
          {err('consent') && (
            <p role="alert" className="label" style={{ color: 'var(--color-accent-deep)' }}>{err('consent')}</p>
          )}
        </>
      ),
    },
  ]

  if (reference) {
    return (
      <section className="container-grid pb-28 pt-36 sm:pt-44">
        <Confirmation
          title="Challenge received."
          reference={reference}
          referenceLabel="CHALLENGE REFERENCE"
          body="Our team will review the requirement and evaluate relevant technology opportunities."
        />
      </section>
    )
  }

  return (
    <>
      <PageMeta title="Submit a Challenge" description="Describe an industrial problem in technical terms. It is structured internally and reviewed before any technology is put in front of you." />
      <PageHero
        eyebrow="For Industry"
        title="Submit an industry challenge."
        lede="Describe the problem in technical terms. It is structured internally, compared against the InThinks portfolio, and reviewed by our technical team before anything is put in front of you."
      >
        {connected === false && (
          <Notice>
            Submissions are not configured on this deployment yet — the form will not send.
            Your draft stays saved in this browser.
          </Notice>
        )}
      </PageHero>

      <section className="container-grid pb-28">
        <FormShell
          steps={steps}
          index={Math.min(value.step, steps.length - 1)}
          onIndexChange={(i) => update({ step: i })}
          onSubmit={send}
          submitLabel="Submit Challenge"
          errors={errors}
          onErrors={setErrors}
          savedAt={savedAt}
          submitting={submitting}
          submitError={submitError}
          finalStep={siteKey ? <Turnstile siteKey={siteKey} onToken={setToken} resetSignal={resetSignal} /> : null}
          onClearDraft={() => {
            clear()
            submission.renew()
            setErrors({})
            setSubmitError(null)
          }}
        />
      </section>
    </>
  )
}
