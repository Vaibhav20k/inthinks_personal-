import { useEffect, useState } from 'react'
import * as api from './api'
import { Distribution, Empty, Panel, Stat } from './ui'
import type { Me } from './api'

const trl = (v: number | null) => (v === null ? '—' : v.toFixed(1))

/**
 * Every figure is counted from stored rows. Nothing is estimated or projected,
 * and a metric with no data reads as zero rather than being invented — an
 * empty pipeline is information, not a gap to fill.
 */
export default function Overview({ me }: { me: Me }) {
  const [data, setData] = useState<api.Overview | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    api.overview().then(setData).catch((e) => setError(e.message))
  }, [])

  if (error) return <Empty>{error}</Empty>
  if (!data) return <Empty>Loading…</Empty>

  const nothingYet = data.innovations === 0 && data.challenges === 0

  return (
    <div className="grid gap-6">
      <div className="flex flex-wrap items-baseline justify-between gap-4">
        <h1 className="section-type">Overview</h1>
        <p className="label" style={{ color: 'var(--color-faint)' }}>COUNTED FROM STORED RECORDS</p>
      </div>

      {nothingYet && (
        <div className="panel p-6">
          <p className="text-[0.9375rem] leading-relaxed">
            No submissions yet. Figures below will populate as innovations and industry
            challenges arrive — nothing here is seeded or estimated.
          </p>
        </div>
      )}

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Stat label="Innovations submitted" value={data.innovations} />
        <Stat label="Past initial review" value={data.qualified} note="EXCLUDES SUBMITTED AND ARCHIVED" />
        <Stat label="In development portfolio" value={data.inDevelopment} />
        <Stat label="Industry challenges" value={data.challenges} />
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <Stat label="Average entry TRL" value={trl(data.averageEntryTrl)} note="WHERE TECHNOLOGIES ARRIVE" />
        <Stat label="Average current TRL" value={trl(data.averageCurrentTrl)} note="WHERE THEY ARE NOW" />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Panel title="Acquisition pipeline">
          <Distribution rows={data.byAcquisitionStage} />
        </Panel>
        <Panel title="Innovations by category">
          <Distribution rows={data.byCategory} />
        </Panel>
        <Panel title="Challenges by sector">
          <Distribution rows={data.bySector} />
        </Panel>
        <Panel title="Innovations by institution type">
          {data.byInstitutionType ? (
            <Distribution rows={data.byInstitutionType} />
          ) : (
            <p className="label" style={{ color: 'var(--color-faint)' }}>
              NOT AVAILABLE TO THE {me.role.toUpperCase().replace('-', ' ')} ROLE
            </p>
          )}
        </Panel>
      </div>
    </div>
  )
}
