import type { ReactNode } from 'react'
import { NavLink, useNavigate } from 'react-router-dom'
import Logo from '../components/primitives/Logo'
import * as api from './api'
import type { Me } from './api'

const ROLE_LABEL: Record<string, string> = {
  'super-admin': 'Super admin',
  admin: 'Admin',
  'business-development': 'Business development',
  'rnd-reviewer': 'R&D reviewer',
}

export default function Shell({ me, onSignedOut, children }: { me: Me; onSignedOut: () => void; children: ReactNode }) {
  const navigate = useNavigate()

  const links = [
    { to: '/admin', label: 'Overview', end: true },
    { to: '/admin/innovations', label: 'Innovations' },
    { to: '/admin/challenges', label: 'Challenges' },
    { to: '/admin/matches', label: 'Matches' },
    { to: '/admin/development', label: 'R&D' },
    { to: '/admin/opportunities', label: 'Opportunities' },
    ...(me.can.viewCommercialTerms
      ? [{ to: '/admin/deals', label: 'Deals' }, { to: '/admin/royalties', label: 'Royalties' }]
      : []),
    ...(me.can.viewAudit ? [{ to: '/admin/audit', label: 'Audit log' }] : []),
    ...(me.can.manageUsers ? [{ to: '/admin/users', label: 'Users' }] : []),
  ]

  return (
    <div className="admin-shell">
      <header
        className="sticky top-0 z-40 flex flex-wrap items-center justify-between gap-4 px-5 py-3"
        style={{ background: 'var(--color-paper)', borderBottom: '1px solid var(--rule)' }}
      >
        <div className="flex items-center gap-3">
          <Logo size={1.5} />
          <span className="font-display text-[0.9375rem] font-semibold tracking-[-0.03em]" style={{ fontStretch: '110%' }}>
            InThinks
          </span>
          <span className="chip">INTERNAL</span>
        </div>

        <nav aria-label="Admin" className="order-3 flex flex-wrap gap-1 md:order-none">
          {links.map((link) => (
            <NavLink
              key={link.to}
              to={link.to}
              end={link.end}
              className="px-3 py-2 text-[0.875rem] transition-colors duration-200"
              style={({ isActive }) => ({
                color: isActive ? 'var(--color-accent)' : 'var(--color-muted)',
                borderBottom: `2px solid ${isActive ? 'var(--color-accent)' : 'transparent'}`,
              })}
            >
              {link.label}
            </NavLink>
          ))}
        </nav>

        <div className="flex items-center gap-4">
          <span className="label text-right" style={{ color: 'var(--color-faint)' }}>
            {me.email}
            <br />
            {ROLE_LABEL[me.role] ?? me.role}
          </span>
          <button
            type="button"
            onClick={async () => {
              await api.logout().catch(() => undefined)
              onSignedOut()
              navigate('/admin')
            }}
            className="label px-3 py-2 transition-colors duration-200 hover:text-accent"
            style={{ border: '1px solid var(--rule-strong)' }}
          >
            SIGN OUT
          </button>
        </div>
      </header>

      <main className="mx-auto max-w-[1600px] px-5 py-8">{children}</main>
    </div>
  )
}
