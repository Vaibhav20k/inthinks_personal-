import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import ArrowLink from '../primitives/ArrowLink'
import Notice from '../primitives/Notice'
import Reveal from '../primitives/Reveal'
import SectionLabel from '../primitives/SectionLabel'
import { loadMatches, loadPortfolio, loadProblems } from '../../data/portfolio'
import { exampleProblems, exampleTechnologies } from '../../data/examples'
import type { IndustrialProblem, PublicMatch, Technology } from '../../data/models'

/**
 * Section 02 — the three datasets, side by side.
 *
 * The platform holds three things and a visitor could previously infer only
 * one of them from the homepage. This is the map: technologies are the supply,
 * industrial problems are the demand, matches are what InThinks does with
 * both. Two records from each, named by their real reference numbers, so the
 * section reads as a window onto the database rather than as a diagram of one.
 *
 * Deliberately no totals. "10,000 innovations" is a number nobody can check
 * and the platform does not have; two records anyone can click are worth more
 * than a figure that would have to be walked back later.
 */

/** One record line: the reference above, the name below. */
function Record({ to, id, name }: { to: string; id: string; name: string }) {
  return (
    <li style={{ borderTop: '1px solid var(--rule)' }}>
      <Link to={to} className="tap group block py-4">
        <span className="ident block" style={{ color: 'var(--color-accent)' }}>{id}</span>
        <span className="mt-1.5 block text-[0.9375rem] font-medium">
          <span className="border-b border-transparent transition-colors duration-250 group-hover:border-current">
            {name}
          </span>
        </span>
      </Link>
    </li>
  )
}

function Column({
  label,
  concept,
  children,
  to,
  cta,
  delay,
}: {
  label: string
  concept: string
  children: React.ReactNode
  to: string
  cta: string
  delay: number
}) {
  return (
    <Reveal delay={delay} className="flex min-w-0 flex-col">
      <h3 className="label" style={{ color: 'var(--color-ink)' }}>{label}</h3>
      <p className="label mt-1.5" style={{ color: 'var(--color-faint)' }}>{concept}</p>
      <ul className="mt-5 grow">{children}</ul>
      <div className="pt-5" style={{ borderTop: '1px solid var(--rule)' }}>
        <ArrowLink to={to}>{cta}</ArrowLink>
      </div>
    </Reveal>
  )
}

/**
 * A match rendered as what it is: two references joined.
 *
 * The vertical arrow is the same one the hero field and the match rows use, so
 * "connection" reads the same way everywhere on the site.
 */
function MatchRecord({
  match,
  problem,
  technology,
}: {
  match: PublicMatch
  problem?: IndustrialProblem
  technology?: Technology
}) {
  return (
    <li style={{ borderTop: '1px solid var(--rule)' }}>
      <Link to="/matches" className="tap group block py-4">
        <span className="ident block" style={{ color: 'var(--color-muted)' }}>
          {problem?.id ?? match.problemSlug}
        </span>
        <span className="my-1 block leading-none" aria-hidden="true" style={{ color: 'var(--color-accent)' }}>
          ↕
        </span>
        <span className="ident block" style={{ color: 'var(--color-muted)' }}>
          {technology?.id ?? match.technologySlug}
        </span>
        <span className="label mt-2 block" style={{ color: 'var(--color-accent)' }}>
          <span className="border-b border-transparent transition-colors duration-250 group-hover:border-current">
            {match.matchClass.toUpperCase()}
          </span>
        </span>
      </Link>
    </li>
  )
}

export default function IntelligenceSnapshot() {
  const [technologies, setTechnologies] = useState<Technology[]>([])
  const [problems, setProblems] = useState<IndustrialProblem[]>([])
  const [matches, setMatches] = useState<PublicMatch[]>([])
  const [examples, setExamples] = useState(false)

  useEffect(() => {
    let live = true
    Promise.all([loadPortfolio(), loadProblems(), loadMatches()]).then(([p, q, m]) => {
      if (!live) return
      setTechnologies(p.technologies)
      setProblems(q.problems)
      setMatches(m.matches)
      setExamples(p.usingExamples || q.usingExamples || m.usingExamples)
    })
    return () => { live = false }
  }, [])

  // The match column names records from both other columns, so it resolves
  // references against the example set as well — a match is meaningless if one
  // of its two ends renders as a slug.
  const findProblem = (slug: string) =>
    problems.find((p) => p.slug === slug) ?? exampleProblems.find((p) => p.slug === slug)
  const findTechnology = (slug: string) =>
    technologies.find((t) => t.slug === slug) ?? exampleTechnologies.find((t) => t.slug === slug)

  return (
    <section id="intelligence" className="container-grid py-24 sm:py-32">
      <div className="doc-columns">
        <SectionLabel index="02">Intelligence Layer</SectionLabel>
        <div>
          <Reveal as="h2" className="section-type max-w-[20ch]">
            The InThinks intelligence layer.
          </Reveal>
          <Reveal delay={70}>
            <p className="body-type measure-prose mt-6" style={{ color: 'var(--color-muted)' }}>
              Three registers, kept separate on purpose. What has been built, what industry
              needs built, and the connections between them that have survived a technical
              review.
            </p>
          </Reveal>

          {examples && (
            <Reveal delay={100}>
              <div className="mt-8">
                <Notice>Illustrative example records</Notice>
              </div>
            </Reveal>
          )}

          <div className="mt-12 grid gap-10 md:grid-cols-3 md:gap-8">
            <Column label="TECHNOLOGIES" concept="POSSIBILITIES" to="/technologies" cta="Explore technologies" delay={0}>
              {technologies.slice(0, 2).map((t) => (
                <Record key={t.slug} to={`/technologies/${t.slug}`} id={t.id} name={t.name} />
              ))}
            </Column>

            <Column label="INDUSTRIAL PROBLEMS" concept="DEMAND" to="/problems" cta="Explore problems" delay={80}>
              {problems.slice(0, 2).map((p) => (
                <Record key={p.slug} to={`/problems/${p.slug}`} id={p.id} name={p.title} />
              ))}
            </Column>

            <Column label="MATCHES" concept="CONNECTION" to="/matches" cta="Explore matches" delay={160}>
              {matches.slice(0, 2).map((m) => (
                <MatchRecord
                  key={m.id}
                  match={m}
                  problem={findProblem(m.problemSlug)}
                  technology={findTechnology(m.technologySlug)}
                />
              ))}
            </Column>
          </div>
        </div>
      </div>
    </section>
  )
}
