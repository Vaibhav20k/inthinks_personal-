import { err, ok } from './types'
import type { Result } from './types'

/**
 * Server-side validation.
 *
 * The client validates too, but only for the submitter's benefit — anything
 * arriving here is untrusted. Every field is length-capped so a single
 * submission cannot fill the database, and unknown keys are dropped rather
 * than stored, so the payload column can never grow arbitrary content.
 */

export interface FieldSpec {
  max: number
  required?: boolean
  /** Repeated values, e.g. checkbox groups. */
  list?: boolean
  email?: boolean
  int?: { min: number; max: number }
}

export type Schema = Record<string, FieldSpec>

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/

export const CHALLENGE_SCHEMA: Schema = {
  title: { max: 200, required: true },
  statement: { max: 8000, required: true },
  currently: { max: 4000 },
  currentSolution: { max: 4000 },
  inadequate: { max: 4000 },
  success: { max: 4000 },
  sector: { max: 80, required: true },
  application: { max: 300 },
  process: { max: 300 },
  equipment: { max: 300 },
  materials: { max: 500 },
  temperature: { max: 120 },
  pressure: { max: 120 },
  humidity: { max: 120 },
  chemical: { max: 300 },
  scale: { max: 200 },
  performance: { max: 3000 },
  installation: { max: 300 },
  constraints: { max: 3000 },
  impacts: { max: 60, list: true },
  annualImpact: { max: 200 },
  targetPerformance: { max: 3000 },
  timeline: { max: 200 },
  desiredTrl: { max: 120 },
  pilot: { max: 40 },
  retrofit: { max: 40 },
  capex: { max: 40 },
  opex: { max: 40 },
  manufacturing: { max: 2000 },
  regulatory: { max: 2000 },
  geographic: { max: 200 },
  confidentiality: { max: 40, list: true },
  company: { max: 200, required: true },
  contact: { max: 160, required: true },
  designation: { max: 160 },
  email: { max: 254, required: true, email: true },
  phone: { max: 60 },
  location: { max: 160 },
  website: { max: 300 },
}

/**
 * A contact message.
 *
 * Short by design. The two real intakes ask thirty questions because an
 * assessment needs the answers; this asks five because anything longer stops
 * being a way to get in touch and starts being a form people abandon.
 *
 * `website` is the honeypot — see the handler. It is declared here so the
 * validator does not drop it before the handler can look at it.
 */
export const MESSAGE_SCHEMA: Schema = {
  name: { max: 160, required: true },
  email: { max: 254, required: true, email: true },
  organisation: { max: 200 },
  topic: { max: 80, required: true },
  message: { max: 6000, required: true },
  website: { max: 300 },
}

export const INNOVATION_SCHEMA: Schema = {
  title: { max: 200, required: true },
  summary: { max: 400, required: true },
  category: { max: 120, required: true },
  technical: { max: 8000 },
  problem: { max: 6000, required: true },
  whoHasIt: { max: 3000 },
  industries: { max: 60, list: true },
  solvedToday: { max: 4000 },
  different: { max: 4000 },
  principle: { max: 6000 },
  components: { max: 3000 },
  process: { max: 4000 },
  advantages: { max: 3000 },
  limitations: { max: 3000 },
  applications: { max: 3000 },
  trl: { max: 2, required: true, int: { min: 1, max: 9 } },
  isInventor: { max: 40, required: true },
  coInventors: { max: 1000 },
  owner: { max: 300, required: true },
  universityProject: { max: 40 },
  usedInfrastructure: { max: 40 },
  universityFunding: { max: 40 },
  externalFunding: { max: 40 },
  facultyInvolved: { max: 40 },
  duringEmployment: { max: 40 },
  patentFiled: { max: 40, required: true },
  patentNumber: { max: 120 },
  patentOwner: { max: 200 },
  paperPublished: { max: 40 },
  publiclyDisclosed: { max: 40 },
  competition: { max: 40 },
  licenceGranted: { max: 40 },
  commercialised: { max: 40 },
  name: { max: 160, required: true },
  institution: { max: 200 },
  institutionType: { max: 80 },
  department: { max: 160 },
  course: { max: 160 },
  graduationYear: { max: 10 },
  email: { max: 254, required: true, email: true },
  mobile: { max: 60 },
  linkedin: { max: 300 },
  location: { max: 160 },
  teamMembers: { max: 2000 },
  facultyMentor: { max: 200 },
  declarations: { max: 40, list: true },
}

export type Clean = Record<string, string | string[]>

export function validate(schema: Schema, raw: unknown): Result<Clean> {
  if (typeof raw !== 'object' || raw === null || Array.isArray(raw)) {
    return err(400, 'Expected a JSON object')
  }
  const input = raw as Record<string, unknown>
  const clean: Clean = {}
  const fields: Record<string, string> = {}

  for (const [key, spec] of Object.entries(schema)) {
    const value = input[key]

    if (spec.list) {
      const list = Array.isArray(value) ? value : []
      // Cap both the number of entries and each entry, so a crafted array
      // cannot bypass the per-field length limit.
      const items = list
        .filter((v): v is string => typeof v === 'string')
        .slice(0, 40)
        .map((v) => v.trim().slice(0, spec.max))
        .filter(Boolean)
      if (spec.required && items.length === 0) fields[key] = 'Required'
      clean[key] = items
      continue
    }

    const text = typeof value === 'string' ? value.trim() : typeof value === 'number' ? String(value) : ''

    if (!text) {
      if (spec.required) fields[key] = 'Required'
      clean[key] = ''
      continue
    }
    if (text.length > spec.max) {
      fields[key] = `Must be ${spec.max} characters or fewer`
      continue
    }
    if (spec.email && !EMAIL.test(text)) {
      fields[key] = 'Enter a valid email address'
      continue
    }
    if (spec.int) {
      const n = Number(text)
      if (!Number.isInteger(n) || n < spec.int.min || n > spec.int.max) {
        fields[key] = `Must be a whole number between ${spec.int.min} and ${spec.int.max}`
        continue
      }
    }
    clean[key] = text
  }

  if (Object.keys(fields).length > 0) {
    return err(422, 'Some fields need attention', fields)
  }
  return ok(clean)
}

/** Declarations are a legal gate, not a preference — all of them or nothing. */
export const REQUIRED_DECLARATIONS = [
  'accurate', 'authority', 'ownership', 'coinventors',
  'confidential', 'evaluate', 'contact',
]
