import { useEffect, useState } from 'react'
import Logo from '../components/primitives/Logo'
import * as api from './api'

interface Props {
  onSignedIn: () => void
}

export default function Login({ onSignedIn }: Props) {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [config, setConfig] = useState<{ configured: boolean; access: boolean; passwords: boolean } | null>(null)

  useEffect(() => {
    api.adminConfig().then(setConfig).catch(() => setConfig({ configured: false, access: false, passwords: false }))
  }, [])

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    setBusy(true)
    setError(null)
    try {
      await api.login(email, password)
      onSignedIn()
    } catch (cause) {
      setError(cause instanceof api.AdminError ? cause.message : 'Sign-in failed.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="admin-shell grid place-items-center px-5 py-20">
      <div className="w-full max-w-sm">
        <div className="flex items-center gap-3">
          <Logo size={2} />
          <span className="font-display text-[1.25rem] font-semibold tracking-[-0.03em]" style={{ fontStretch: '110%' }}>
            InThinks
          </span>
        </div>
        <p className="label mt-3" style={{ color: 'var(--color-faint)' }}>INTERNAL — AUTHORISED ACCESS ONLY</p>

        {config && !config.configured && (
          <div className="panel mt-8 p-5">
            <p className="text-[0.9375rem] leading-relaxed">
              Admin access is not configured on this deployment.
            </p>
            <p className="mt-3 text-[0.875rem] leading-relaxed" style={{ color: 'var(--color-muted)' }}>
              Set <code className="ident">SESSION_SECRET</code> (or Cloudflare Access) and create an
              account before signing in. Until then this surface is closed rather than open.
            </p>
          </div>
        )}

        {config?.access && !config.passwords && (
          <div className="panel mt-8 p-5">
            <p className="text-[0.9375rem] leading-relaxed">This deployment signs in through Cloudflare Access.</p>
            <p className="mt-3 text-[0.875rem] leading-relaxed" style={{ color: 'var(--color-muted)' }}>
              Reload this page once you have authenticated with Access.
            </p>
          </div>
        )}

        {config?.passwords && (
          <form onSubmit={submit} className="panel mt-8 p-6">
            <div className="grid gap-5">
              <div>
                <label htmlFor="admin-email" className="block text-[0.875rem] font-medium">Email</label>
                <input
                  id="admin-email"
                  type="email"
                  autoComplete="username"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="field-input mt-2"
                />
              </div>
              <div>
                <label htmlFor="admin-password" className="block text-[0.875rem] font-medium">Password</label>
                <input
                  id="admin-password"
                  type="password"
                  autoComplete="current-password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="field-input mt-2"
                />
              </div>

              {error && (
                <p role="alert" className="label px-3 py-2" style={{ border: '1px solid var(--color-accent-deep)', color: 'var(--color-accent-deep)' }}>
                  {error}
                </p>
              )}

              <button
                type="submit"
                disabled={busy}
                className="bg-graphite px-5 py-3 text-[0.9375rem] font-medium text-paper transition-colors duration-300 hover:bg-accent disabled:opacity-50"
              >
                {busy ? 'Signing in…' : 'Sign in'}
              </button>
            </div>
          </form>
        )}

        <p className="label mt-8" style={{ color: 'var(--color-faint)' }}>
          ACCESS IS LOGGED
        </p>
      </div>
    </div>
  )
}
