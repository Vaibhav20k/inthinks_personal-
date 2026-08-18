import { useCallback, useEffect, useState } from 'react'
import * as api from './api'
import { Chip, Empty, Panel, shortDate } from './ui'
import type { Role } from './api'

const ROLE_NOTE: Record<Role, string> = {
  'super-admin': 'Everything, including managing accounts.',
  admin: 'All records and identities, review state, audit log.',
  'business-development': 'Records, identities and acquisition stage. No scoring.',
  'rnd-reviewer': 'Technology and scoring. Innovator identity is withheld.',
}

export default function Users() {
  const [items, setItems] = useState<api.AdminUser[] | null>(null)
  const [roles, setRoles] = useState<Role[]>([])
  const [email, setEmail] = useState('')
  const [role, setRole] = useState<Role>('rnd-reviewer')
  const [password, setPassword] = useState('')
  const [message, setMessage] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(() => {
    api.users().then((r) => setItems(r.items)).catch((e) => setError(e.message))
  }, [])

  useEffect(() => { load() }, [load])
  useEffect(() => { api.meta().then((m) => setRoles(m.roles)).catch(() => undefined) }, [])

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setMessage(null)
    try {
      await api.upsertUser({ email, role, ...(password ? { password } : {}) })
      setMessage(`${email} saved. Any existing sessions for that account have ended.`)
      setEmail('')
      setPassword('')
      load()
    } catch (cause) {
      setError(cause instanceof api.AdminError ? cause.message : 'Could not save the account.')
    }
  }

  return (
    <div className="grid gap-6">
      <h1 className="section-type">Users</h1>

      <div className="grid gap-6 xl:grid-cols-[1fr_24rem]">
        <div className="panel overflow-x-auto">
          {!items ? <Empty>Loading…</Empty>
          : items.length === 0 ? <Empty>No accounts yet.</Empty>
          : (
            <table className="data-table">
              <thead>
                <tr><th>Email</th><th>Role</th><th>State</th><th>Created</th><th>Last seen</th></tr>
              </thead>
              <tbody>
                {items.map((user) => (
                  <tr key={user.email}>
                    <td>{user.email}</td>
                    <td><Chip>{user.role}</Chip></td>
                    <td>{user.disabled ? <Chip tone="quiet">Disabled</Chip> : <Chip tone="active">Active</Chip>}</td>
                    <td className="num whitespace-nowrap" style={{ color: 'var(--color-muted)' }}>{shortDate(user.created_at)}</td>
                    <td className="num whitespace-nowrap" style={{ color: 'var(--color-muted)' }}>
                      {user.last_seen_at ? shortDate(user.last_seen_at) : '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        <Panel title="Add or update an account">
          <form onSubmit={submit} className="grid gap-4">
            <label className="grid gap-2">
              <span className="label" style={{ color: 'var(--color-faint)' }}>EMAIL</span>
              <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} className="field-input py-2 text-[0.875rem]" />
            </label>
            <label className="grid gap-2">
              <span className="label" style={{ color: 'var(--color-faint)' }}>ROLE</span>
              <select value={role} onChange={(e) => setRole(e.target.value as Role)} className="field-input py-2 text-[0.875rem]">
                {roles.map((r) => <option key={r} value={r}>{r}</option>)}
              </select>
              <span className="text-[0.8125rem] leading-relaxed" style={{ color: 'var(--color-muted)' }}>
                {ROLE_NOTE[role]}
              </span>
            </label>
            <label className="grid gap-2">
              <span className="label" style={{ color: 'var(--color-faint)' }}>PASSWORD</span>
              <input
                type="password"
                autoComplete="new-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Leave blank to keep the current one"
                className="field-input py-2 text-[0.875rem]"
              />
              <span className="text-[0.8125rem] leading-relaxed" style={{ color: 'var(--color-muted)' }}>
                Minimum 12 characters. Leave blank for accounts that sign in through
                Cloudflare Access.
              </span>
            </label>

            {message && <p className="label" style={{ color: 'var(--color-accent)' }}>{message}</p>}
            {error && <p role="alert" className="label" style={{ color: 'var(--color-accent-deep)' }}>{error}</p>}

            <div>
              <button type="submit" className="bg-graphite px-4 py-2.5 text-[0.875rem] font-medium text-paper transition-colors duration-300 hover:bg-accent">
                Save account
              </button>
            </div>
          </form>
        </Panel>
      </div>
    </div>
  )
}
