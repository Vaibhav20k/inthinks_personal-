import { useEffect, useState } from 'react'
import PageMeta from '../components/layout/PageMeta'
import FormShell from '../components/forms/FormShell'
import type { Step } from '../components/forms/FormShell'
import Confirmation from '../components/forms/Confirmation'
import FileUpload from '../components/forms/FileUpload'
import TrlSelector from '../components/forms/TrlSelector'
import { ChoiceGroup, Consent, SelectField, TextArea, TextField } from '../components/forms/Fields'
import PageHero from '../components/layout/PageHero'
import Notice from '../components/primitives/Notice'
import { useDraft, useSubmissionKey } from '../lib/draft'
import Turnstile from '../components/forms/Turnstile'
import { SubmissionError, submissionStatus, submitInnovation } from '../lib/api'
import { domains, sectors } from '../data/taxonomy'
import type { TRL } from '../data/models'

const INSTITUTION_TYPES = [
  'IIT', 'NIT', 'IISc', 'IISER', 'NISER',
  'Government University', 'Private University', 'Research Institute',
  'Independent', 'Other',
] as const

const YES_NO = ['Yes', 'No', 'Not sure'] as const

const DECLARATIONS = [
  { value: 'accurate', label: 'The information provided is accurate to the best of my knowledge.' },
  { value: 'authority', label: 'I have the authority to submit this innovation.' },
  { value: 'ownership', label: 'Ownership of the technology has been disclosed accurately.' },
  { value: 'coinventors', label: 'All co-inventors have been disclosed.' },
  { value: 'confidential', label: 'Any confidential information here is submitted intentionally.' },
  { value: 'evaluate', label: 'InThinks may evaluate this submission.' },
  { value: 'contact', label: 'InThinks may contact me about this submission.' },
]

interface InnovationDraft {
  /** Persisted so a reload returns to the step the user was on. */
  step: number
  title: string
  summary: string
  category: string
  technical: string
  problem: string
  whoHasIt: string
  industries: string[]
  solvedToday: string
  different: string
  principle: string
  components: string
  process: string
  advantages: string
  limitations: string
  applications: string
  trl: TRL | null
  isInventor: string
  coInventors: string
  owner: string
  universityProject: string
  usedInfrastructure: string
  universityFunding: string
  externalFunding: string
  facultyInvolved: string
  duringEmployment: string
  patentFiled: string
  patentNumber: string
  patentOwner: string
  paperPublished: string
  publiclyDisclosed: string
  competition: string
  licenceGranted: string
  commercialised: string
  name: string
  institution: string
  institutionType: string
  department: string
  course: string
  graduationYear: string
  email: string
  mobile: string
  linkedin: string
  location: string
  teamMembers: string
  facultyMentor: string
  declarations: string[]
}

const EMPTY: InnovationDraft = {
  step: 0,
  title: '', summary: '', category: '', technical: '', problem: '', whoHasIt: '',
  industries: [], solvedToday: '', different: '', principle: '', components: '',
  process: '', advantages: '', limitations: '', applications: '', trl: null,
  isInventor: '', coInventors: '', owner: '', universityProject: '', usedInfrastructure: '',
  universityFunding: '', externalFunding: '', facultyInvolved: '', duringEmployment: '',
  patentFiled: '', patentNumber: '', patentOwner: '', paperPublished: '',
  publiclyDisclosed: '', competition: '', licenceGranted: '', commercialised: '',
  name: '', institution: '', institutionType: '', department: '', course: '',
  graduationYear: '', email: '', mobile: '', linkedin: '', location: '',
  teamMembers: '', facultyMentor: '', declarations: [],
}

export default function SubmitInnovation() {
  const { value, update, clear, savedAt } = useDraft<InnovationDraft>('inthinks.innovation', EMPTY)
  const submission = useSubmissionKey('inthinks.innovation')
  const [siteKey, setSiteKey] = useState<string | null>(null)
  const [token, setToken] = useState<string | null>(null)
  const [resetSignal, setResetSignal] = useState(0)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [reference, setReference] = useState<string | null>(null)
  const [sentFiles, setSentFiles] = useState(0)
  const [submitting, setSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState<string | null>(null)
  const [status, setStatus] = useState<{ submissions: boolean; uploads: boolean } | null>(null)
  // Real File objects, so they live in component state rather than the draft —
  // localStorage cannot hold them.
  const [files, setFiles] = useState<File[]>([])

  useEffect(() => {
    let live = true
    submissionStatus().then((s) => {
      if (!live) return
      setStatus(s)
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
      const { step: _step, ...record } = value
      const { reference: issued } = await submitInnovation(record, files, { idempotencyKey: submission.key, turnstileToken: token })
      setSentFiles(files.length)
      setReference(issued)
      setFiles([])
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
  const toggleList = (key: 'industries' | 'declarations', v: string) =>
    update({
      [key]: value[key].includes(v) ? value[key].filter((x) => x !== v) : [...value[key], v],
    } as Partial<InnovationDraft>)

  const steps: Step[] = [
    {
      title: 'Your innovation',
      validate: (): Record<string, string> => {
        const e: Record<string, string> = {}
        if (!value.title.trim()) e.title = 'Give the innovation a title'
        if (!value.summary.trim()) e.summary = 'One line is enough here'
        if (!value.category) e.category = 'Choose the closest category'
        return e
      },
      render: () => (
        <>
          <TextField label="Innovation title" required value={value.title} error={err('title')} onChange={(v) => update({ title: v })} />
          <TextField label="One-line summary" required value={value.summary} error={err('summary')} onChange={(v) => update({ summary: v })} hint="If someone reads one sentence about this, make it this one." />
          <SelectField label="Technology category" required options={domains.map((d) => d.name)} value={value.category} error={err('category')} onChange={(v) => update({ category: v })} />
          <TextArea label="Technical summary" rows={6} value={value.technical} onChange={(v) => update({ technical: v })} hint="What it is and what it does. Detail is welcome — this stays private." />
        </>
      ),
    },
    {
      title: 'The problem',
      validate: (): Record<string, string> =>
        value.problem.trim() ? {} : { problem: 'Describe the problem it solves' },
      render: () => (
        <>
          <TextArea label="What problem does it solve?" required value={value.problem} error={err('problem')} onChange={(v) => update({ problem: v })} />
          <TextArea label="Who has this problem?" value={value.whoHasIt} onChange={(v) => update({ whoHasIt: v })} />
          <ChoiceGroup
            legend="Which industries may benefit?"
            options={sectors.map((s) => ({ value: s, label: s }))}
            selected={value.industries}
            onToggle={(v) => toggleList('industries', v)}
          />
          <TextArea label="How is the problem solved today?" value={value.solvedToday} onChange={(v) => update({ solvedToday: v })} />
          <TextArea label="Why is your approach different?" value={value.different} onChange={(v) => update({ different: v })} />
        </>
      ),
    },
    {
      title: 'How it works',
      render: () => (
        <>
          <TextArea label="Scientific or engineering principle" rows={5} value={value.principle} onChange={(v) => update({ principle: v })} />
          <TextArea label="Key materials or components" value={value.components} onChange={(v) => update({ components: v })} />
          <TextArea label="Process description" value={value.process} onChange={(v) => update({ process: v })} />
          <TextArea label="Main advantages" value={value.advantages} onChange={(v) => update({ advantages: v })} />
          <TextArea label="Known limitations" value={value.limitations} onChange={(v) => update({ limitations: v })} hint="Stating limits honestly speeds up evaluation. It does not count against a submission." />
          <TextArea label="Potential applications" value={value.applications} onChange={(v) => update({ applications: v })} />
        </>
      ),
    },
    {
      title: 'Technology readiness level',
      validate: (): Record<string, string> =>
        value.trl ? {} : { trl: 'Select the level that best describes the work today' },
      render: () => (
        <>
          <TrlSelector value={value.trl} onChange={(v) => update({ trl: v })} />
          {err('trl') && <p role="alert" className="label" style={{ color: 'var(--color-accent-deep)' }}>{err('trl')}</p>}
        </>
      ),
    },
    {
      title: 'Evidence',
      render: () => (
        <>
          <p className="body-type" style={{ color: 'var(--color-muted)' }}>
            Photographs, technical reports, test results, papers, patent documents,
            video, drawings, CAD or presentations. Anything that shows the work is real.
          </p>
          <FileUpload files={files} onChange={setFiles} enabled={status?.uploads !== false} />
          <Notice>
            Attachments are held in this tab only and are sent when you submit. Unlike your
            written answers, they are not part of the saved draft — reloading clears them.
          </Notice>
        </>
      ),
    },
    {
      title: 'Intellectual property',
      validate: (): Record<string, string> => {
        const e: Record<string, string> = {}
        if (!value.isInventor) e.isInventor = 'Required'
        if (!value.owner.trim()) e.owner = 'State who currently owns the innovation'
        if (!value.patentFiled) e.patentFiled = 'Required'
        return e
      },
      render: () => (
        <>
          <Notice>
            This section is mandatory. Ownership questions decide whether a technology can move at all,
            so it is better to answer &ldquo;not sure&rdquo; than to guess.
          </Notice>
          <div className="grid gap-8 sm:grid-cols-2">
            <SelectField label="Are you the inventor?" required options={YES_NO} value={value.isInventor} error={err('isInventor')} onChange={(v) => update({ isInventor: v })} />
            <TextField label="Co-inventors" value={value.coInventors} onChange={(v) => update({ coInventors: v })} />
          </div>
          <TextField label="Who currently owns the innovation?" required value={value.owner} error={err('owner')} onChange={(v) => update({ owner: v })} />
          <div className="grid gap-8 sm:grid-cols-2">
            <SelectField label="Developed through a college or university project?" options={YES_NO} value={value.universityProject} onChange={(v) => update({ universityProject: v })} />
            <SelectField label="Institutional equipment or infrastructure used?" options={YES_NO} value={value.usedInfrastructure} onChange={(v) => update({ usedInfrastructure: v })} />
            <SelectField label="University funding involved?" options={YES_NO} value={value.universityFunding} onChange={(v) => update({ universityFunding: v })} />
            <SelectField label="External funding involved?" options={YES_NO} value={value.externalFunding} onChange={(v) => update({ externalFunding: v })} />
            <SelectField label="Professor or faculty member involved?" options={YES_NO} value={value.facultyInvolved} onChange={(v) => update({ facultyInvolved: v })} />
            <SelectField label="Developed during employment?" options={YES_NO} value={value.duringEmployment} onChange={(v) => update({ duringEmployment: v })} />
          </div>

          <SelectField label="Has a patent been filed?" required options={YES_NO} value={value.patentFiled} error={err('patentFiled')} onChange={(v) => update({ patentFiled: v })} />
          {/* Only asked once a filing exists — conditional, not a wall of fields. */}
          {value.patentFiled === 'Yes' && (
            <div className="grid gap-8 sm:grid-cols-2">
              <TextField label="Patent application number" value={value.patentNumber} onChange={(v) => update({ patentNumber: v })} />
              <TextField label="Who owns the patent?" value={value.patentOwner} onChange={(v) => update({ patentOwner: v })} />
            </div>
          )}

          <div className="grid gap-8 sm:grid-cols-2">
            <SelectField label="Has a paper been published?" options={YES_NO} value={value.paperPublished} onChange={(v) => update({ paperPublished: v })} />
            <SelectField label="Publicly disclosed anywhere?" options={YES_NO} value={value.publiclyDisclosed} onChange={(v) => update({ publiclyDisclosed: v })} />
            <SelectField label="Shown in a competition?" options={YES_NO} value={value.competition} onChange={(v) => update({ competition: v })} />
            <SelectField label="Has any licence already been granted?" options={YES_NO} value={value.licenceGranted} onChange={(v) => update({ licenceGranted: v })} />
            <SelectField label="Has it been commercialised?" options={YES_NO} value={value.commercialised} onChange={(v) => update({ commercialised: v })} />
          </div>

          <p className="text-[0.875rem] leading-relaxed" style={{ color: 'var(--color-muted)' }}>
            Submitting an innovation does not transfer ownership. Any acquisition,
            assignment, licensing or development relationship will require a separate
            written agreement.
          </p>
        </>
      ),
    },
    {
      title: 'Innovator details',
      validate: (): Record<string, string> => {
        const e: Record<string, string> = {}
        if (!value.name.trim()) e.name = 'Your name is required'
        if (!/^\S+@\S+\.\S+$/.test(value.email)) e.email = 'Enter a valid email address'
        return e
      },
      render: () => (
        <>
          <Notice>All identity information remains private and is never published on a technology profile.</Notice>
          <div className="grid gap-8 sm:grid-cols-2">
            <TextField label="Name" required value={value.name} error={err('name')} onChange={(v) => update({ name: v })} />
            <TextField label="Email" required type="email" inputMode="email" value={value.email} error={err('email')} onChange={(v) => update({ email: v })} />
            <TextField label="Institution" value={value.institution} onChange={(v) => update({ institution: v })} />
            <SelectField label="Institution type" options={INSTITUTION_TYPES} value={value.institutionType} onChange={(v) => update({ institutionType: v })} />
            <TextField label="Department" value={value.department} onChange={(v) => update({ department: v })} />
            <TextField label="Course" value={value.course} onChange={(v) => update({ course: v })} />
            <TextField label="Graduation year" inputMode="numeric" value={value.graduationYear} onChange={(v) => update({ graduationYear: v })} />
            <TextField label="Mobile" type="tel" inputMode="tel" value={value.mobile} onChange={(v) => update({ mobile: v })} />
            <TextField label="LinkedIn" type="url" inputMode="url" value={value.linkedin} onChange={(v) => update({ linkedin: v })} />
            <TextField label="Location" value={value.location} onChange={(v) => update({ location: v })} />
          </div>
          <TextArea label="Co-inventors / team members" value={value.teamMembers} onChange={(v) => update({ teamMembers: v })} />
          <TextField label="Faculty mentor" value={value.facultyMentor} onChange={(v) => update({ facultyMentor: v })} />
        </>
      ),
    },
    {
      title: 'Declaration',
      validate: (): Record<string, string> =>
        value.declarations.length === DECLARATIONS.length
          ? {}
          : { declarations: 'All declarations must be confirmed' },
      render: () => (
        <>
          <div className="grid gap-3">
            {DECLARATIONS.map((d) => (
              <Consent
                key={d.value}
                label={d.label}
                checked={value.declarations.includes(d.value)}
                onChange={() => toggleList('declarations', d.value)}
              />
            ))}
          </div>
          {err('declarations') && (
            <p role="alert" className="label" style={{ color: 'var(--color-accent-deep)' }}>{err('declarations')}</p>
          )}
        </>
      ),
    },
  ]

  if (reference) {
    return (
      <section className="container-grid pb-28 pt-36 sm:pt-44">
        <Confirmation
          title="Innovation received."
          reference={reference}
          referenceLabel="INNOVATION REFERENCE"
          body="Selected technologies may progress into deeper technical evaluation and the InThinks development pipeline."
          fileCount={sentFiles}
        />
      </section>
    )
  }

  return (
    <>
      <PageMeta title="Submit an Innovation" description="Submit an early-stage technology for assessment. Submitting transfers nothing, and your identity is not published." />
      <PageHero
        eyebrow="For Innovators"
        title="Built something worth taking further?"
        lede="Submit your technology for evaluation and potential inclusion in the InThinks development portfolio. Early-stage work at TRL 1–3 is where most of the portfolio enters."
      >
        {status?.submissions === false && (
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
          submitLabel="Submit Innovation"
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
