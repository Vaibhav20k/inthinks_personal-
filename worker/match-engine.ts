import Anthropic from '@anthropic-ai/sdk'
import { zodOutputFormat } from '@anthropic-ai/sdk/helpers/zod'
import { z } from 'zod'
import { prefilter } from './match-rules'
import type { ChallengeRecord, Prefilter, TechnologyRecord } from './match-rules'

/**
 * Layer 2 — semantic analysis.
 *
 * The rules layer decides *which* technologies are worth reasoning about; this
 * decides *whether and how* each one could answer the challenge, and says what
 * would have to be true for it to work.
 *
 * Two constraints shape the whole module:
 *
 *  1. **No identity reaches the model.** The candidate context is assembled
 *     from technical fields only, and `assertNoIdentity` fails closed if an
 *     identity-shaped field ever appears. Anti-disintermediation is not a UI
 *     concern — the innovator's name should not be in the prompt in the first
 *     place, and neither should the counterparty's.
 *  2. **No fake precision.** The model returns human-readable classifications
 *     and per-dimension fits, never a percentage. A number like "93.76% match"
 *     invents confidence the analysis does not have.
 */

const CLASSIFICATIONS = ['Strong Match', 'Promising Match', 'Adjacent Opportunity', 'Weak Match'] as const
const FITS = ['Strong', 'Moderate', 'Limited', 'Unknown'] as const
const EFFORTS = ['Low', 'Moderate', 'Substantial', 'Unknown'] as const
const RISKS = ['Low', 'Medium', 'High', 'Unknown'] as const
const RECOMMENDATIONS = ['Technical Review', 'Hold', 'Request More Information', 'Reject'] as const

const CandidateAnalysis = z.object({
  technologyReference: z.string(),
  classification: z.enum(CLASSIFICATIONS),
  mechanismFit: z.enum(FITS),
  applicationFit: z.enum(FITS),
  trlFit: z.enum(FITS),
  constraintFit: z.enum(FITS),
  ipAvailability: z.enum(FITS),
  developmentEffort: z.enum(EFFORTS),
  ipRisk: z.enum(RISKS),
  estimatedTrlGap: z.number().int().min(0).max(8),
  challengeSummary: z.string(),
  technologySummary: z.string(),
  whyTheyMatch: z.array(z.string()),
  technicalConflicts: z.array(z.string()),
  missingEvidence: z.array(z.string()),
  requiredDevelopment: z.array(z.string()),
  commercialPotential: z.string(),
  /** What the engine suggests. A person still decides. */
  internalRecommendation: z.enum(RECOMMENDATIONS),
})

const AnalysisBatch = z.object({
  candidates: z.array(CandidateAnalysis),
})

export type CandidateAnalysis = z.infer<typeof CandidateAnalysis>

const SYSTEM = `You are the internal technology-matching analyst for InThinks, a
technology development and transfer company. You compare a confidential industry
challenge against technologies in the InThinks development portfolio and report
whether each could plausibly answer it.

You are one input to a decision, not the decision. Your output is reviewed by an
InThinks engineer before anything reaches the industry counterparty, so your job
is to give that reviewer something they can argue with — not to sell a match.

Rules:
- Be sceptical. "Weak Match" and "Adjacent Opportunity" are correct answers far
  more often than "Strong Match". Reserve "Strong Match" for cases where the
  mechanism genuinely addresses the stated problem under the stated conditions.
- Never invent evidence. If a technology's record does not say whether it works
  at the required temperature, that is missing evidence, not a conflict and not
  a strength. Say what is unknown.
- Name technical conflicts plainly, including ones that would kill the match.
- Estimate the TRL gap as the distance between the technology's current
  readiness and what deploying it in this application would require.
- Judge IP availability and risk only from what the record states. Unclear
  ownership is a real risk and should be reported as such.
- Never produce a numeric match score or percentage.
- The records contain no personal information, and you must not ask for or
  speculate about the identity of any innovator, company or individual.`

function candidateBlock(candidate: Prefilter) {
  const t = candidate.technology
  return `<technology reference="${t.reference}">
  <title>${t.title}</title>
  <domain>${t.category}</domain>
  <readiness entry="${t.entryTrl}" current="${t.currentTrl}" target="${t.targetTrl}" />
  <portfolio_stage>${t.acquisitionStage}</portfolio_stage>
  <summary>${t.summary}</summary>
  <problem_addressed>${t.problem}</problem_addressed>
  <working_principle>${t.principle}</working_principle>
  <applications>${t.applications}</applications>
  <industries>${t.industries.join(', ')}</industries>
  <structured_signals>${candidate.signals.join('; ') || 'none'}</structured_signals>
</technology>`
}

function challengeBlock(challenge: ChallengeRecord) {
  return `<challenge reference="${challenge.reference}">
  <title>${challenge.title}</title>
  <sector>${challenge.sector}</sector>
  <problem_statement>${challenge.statement}</problem_statement>
  <current_solution>${challenge.currentSolution}</current_solution>
  <successful_outcome>${challenge.success}</successful_outcome>
  <performance_requirement>${challenge.performance}</performance_requirement>
  <technical_constraints>${challenge.constraints}</technical_constraints>
  <business_impact>${challenge.impacts.join(', ')}</business_impact>
  <desired_readiness>${challenge.desiredTrl || 'unstated'}</desired_readiness>
</challenge>`
}

/**
 * Fails closed if anything identity-shaped reaches the prompt.
 *
 * The context is built from technical fields, so this should never fire — which
 * is exactly why it is worth having. A future change that widens the record
 * shape should break loudly here rather than quietly start sending an
 * innovator's name to a third party.
 */
const IDENTITY_PATTERNS: [RegExp, string][] = [
  [/[\w.+-]+@[\w-]+\.[\w.]+/, 'an email address'],
  [/\+\d[\d\s()-]{7,}/, 'a phone number'],
  [/linkedin\.com/i, 'a LinkedIn URL'],
]

export function assertNoIdentity(prompt: string) {
  for (const [pattern, description] of IDENTITY_PATTERNS) {
    if (pattern.test(prompt)) {
      throw new Error(`Refusing to send match context containing ${description}`)
    }
  }
}

export interface EngineResult {
  analyses: CandidateAnalysis[]
  engine: string
  considered: number
  shortlisted: number
}

export interface EngineOptions {
  apiKey: string
  model?: string
  /** How many prefiltered candidates go to the semantic layer. */
  shortlist?: number
}

export async function runMatchEngine(
  challenge: ChallengeRecord,
  technologies: TechnologyRecord[],
  options: EngineOptions,
): Promise<EngineResult> {
  const model = options.model ?? 'claude-opus-5'
  const ranked = prefilter(challenge, technologies)
  const shortlist = ranked.slice(0, options.shortlist ?? 6)

  if (shortlist.length === 0) {
    return { analyses: [], engine: `rules-only`, considered: technologies.length, shortlisted: 0 }
  }

  const prompt = `${challengeBlock(challenge)}

The following technologies passed the structured prefilter. Assess each one
against the challenge above.

${shortlist.map(candidateBlock).join('\n\n')}

Return one analysis per technology, using its reference exactly as given.`

  assertNoIdentity(prompt)

  const client = new Anthropic({ apiKey: options.apiKey })

  const response = await client.messages.parse({
    model,
    max_tokens: 16000,
    system: SYSTEM,
    thinking: { type: 'adaptive' },
    output_config: {
      effort: 'high',
      format: zodOutputFormat(AnalysisBatch),
    },
    messages: [{ role: 'user', content: prompt }],
  })

  if (response.stop_reason === 'refusal') {
    throw new Error('The analysis was declined by the model safety system.')
  }

  const parsed = response.parsed_output
  if (!parsed) {
    throw new Error('The analysis did not return usable structured output.')
  }

  // Only keep analyses that name a technology we actually sent.
  const allowed = new Set(shortlist.map((c) => c.technology.reference))
  const analyses = parsed.candidates.filter((c) => allowed.has(c.technologyReference))

  return {
    analyses,
    engine: `rules+${model}`,
    considered: technologies.length,
    shortlisted: shortlist.length,
  }
}
