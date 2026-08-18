import { Link } from 'react-router-dom'
import type { Technology } from '../../data/models'
import TrlScale from '../primitives/TrlScale'

interface Props {
  technology: Technology
  index: number
}

/**
 * A technology as an industrial opportunity, not a project card.
 *
 * The ID leads, the TRL scale shows what development has added, and the
 * transfer status tells a buyer whether there is anything to talk about.
 */
export default function TechnologyRow({ technology, index }: Props) {
  return (
    <li style={{ borderTop: '1px solid var(--rule)' }}>
      <Link
        to={`/technologies/${technology.slug}`}
        className="group grid gap-6 py-9 lg:grid-cols-12 lg:gap-10"
      >
        <div className="lg:col-span-3">
          <p className="ident" style={{ color: 'var(--color-accent)' }}>
            {technology.id}
          </p>
          <p className="label mt-3" style={{ color: 'var(--color-faint)' }}>
            {technology.domain.toUpperCase()}
          </p>
        </div>

        <div className="lg:col-span-5">
          <h3 className="font-display text-[clamp(1.4rem,2.4vw,2rem)] font-medium leading-[1.1] tracking-[-0.025em]">
            <span className="bg-[linear-gradient(currentColor,currentColor)] bg-[length:0%_1px] bg-left-bottom bg-no-repeat pb-1 transition-[background-size] duration-500 ease-[var(--ease-out-quint)] group-hover:bg-[length:100%_1px]">
              {technology.name}
            </span>
          </h3>
          <p className="mt-3 text-[0.9375rem] leading-relaxed" style={{ color: 'var(--color-muted)', maxWidth: '48ch' }}>
            {technology.thesis}
          </p>
          <p className="label mt-5" style={{ color: 'var(--color-faint)' }}>
            {technology.applications.join(' · ').toUpperCase()}
          </p>
        </div>

        <div className="lg:col-span-4">
          <TrlScale
            entry={technology.entryTrl}
            current={technology.currentTrl}
            target={technology.targetTrl}
            showLegend={false}
          />
          <dl className="label mt-5 space-y-2">
            <div className="flex justify-between gap-4">
              <dt style={{ color: 'var(--color-faint)' }}>STAGE</dt>
              <dd>{technology.stage.toUpperCase()}</dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt style={{ color: 'var(--color-faint)' }}>IP</dt>
              <dd>{technology.ipStatus.toUpperCase()}</dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt style={{ color: 'var(--color-faint)' }}>TRANSFER</dt>
              <dd style={{ color: technology.transferStatus === 'Transfer Ready' || technology.transferStatus === 'Industry Evaluation' ? 'var(--color-accent)' : undefined }}>
                {technology.transferStatus.toUpperCase()}
              </dd>
            </div>
          </dl>
          <span className="label mt-5 inline-flex items-center gap-2" aria-hidden="true">
            VIEW TECHNOLOGY BRIEF
            <span
              className="transition-transform duration-300 ease-[var(--ease-out-quint)] group-hover:translate-x-1"
              style={{ color: 'var(--color-accent)' }}
            >
              →
            </span>
          </span>
        </div>
      </Link>
      <span className="sr-only">Item {index + 1}</span>
    </li>
  )
}
