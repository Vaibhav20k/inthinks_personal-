import { useCallback, useEffect, useState } from 'react'
import { Route, Routes } from 'react-router-dom'
import * as api from './api'
import type { Me } from './api'
import Login from './Login'
import Shell from './Shell'
import Overview from './Overview'
import Innovations from './Innovations'
import InnovationDetail from './InnovationDetail'
import Challenges from './Challenges'
import ChallengeDetail from './ChallengeDetail'
import Matches from './Matches'
import MatchRoom from './MatchRoom'
import Development from './Development'
import Workspace from './Workspace'
import Pipeline from './Pipeline'
import Opportunity from './Opportunity'
import Deals from './Deals'
import DealRoom from './DealRoom'
import Royalties from './Royalties'
import Royalty from './Royalty'
import AuditLog from './AuditLog'
import Users from './Users'
import { Empty } from './ui'

/**
 * Admin entry point.
 *
 * The session check is a server round-trip on every mount. Nothing here is
 * trusted from the client: the server decides whether there is a session at
 * all, and each request re-derives what the role may do.
 */
export default function AdminApp() {
  const [me, setMe] = useState<Me | null>(null)
  const [state, setState] = useState<'checking' | 'anonymous' | 'ready'>('checking')

  const check = useCallback(() => {
    setState('checking')
    api.me()
      .then((identity) => {
        setMe(identity)
        setState('ready')
      })
      .catch(() => {
        setMe(null)
        setState('anonymous')
      })
  }, [])

  useEffect(() => { check() }, [check])

  useEffect(() => {
    // Keeps this surface out of search results even if a link escapes.
    const tag = document.createElement('meta')
    tag.name = 'robots'
    tag.content = 'noindex, nofollow'
    document.head.appendChild(tag)
    const previousTitle = document.title
    document.title = 'InThinks — Internal'
    return () => {
      tag.remove()
      document.title = previousTitle
    }
  }, [])

  if (state === 'checking') {
    return <div className="admin-shell"><Empty>Checking session…</Empty></div>
  }
  if (state === 'anonymous' || !me) {
    return <Login onSignedIn={check} />
  }

  return (
    <Shell me={me} onSignedOut={() => { setMe(null); setState('anonymous') }}>
      <Routes>
        <Route index element={<Overview me={me} />} />
        <Route path="innovations" element={<Innovations me={me} />} />
        <Route path="innovations/:reference" element={<InnovationDetail me={me} />} />
        <Route path="challenges" element={<Challenges me={me} />} />
        <Route path="challenges/:reference" element={<ChallengeDetail me={me} />} />
        <Route path="matches" element={<Matches />} />
        <Route path="matches/:reference" element={<MatchRoom me={me} />} />
        <Route path="development" element={<Development />} />
        <Route path="development/:reference" element={<Workspace me={me} />} />
        <Route path="opportunities" element={<Pipeline />} />
        <Route path="opportunities/:reference" element={<Opportunity me={me} />} />
        {me.can.viewCommercialTerms && <Route path="deals" element={<Deals me={me} />} />}
        {me.can.viewCommercialTerms && <Route path="deals/:reference" element={<DealRoom me={me} />} />}
        {me.can.viewCommercialTerms && <Route path="royalties" element={<Royalties me={me} />} />}
        {me.can.viewCommercialTerms && <Route path="royalties/:reference" element={<Royalty me={me} />} />}
        {me.can.viewAudit && <Route path="audit" element={<AuditLog />} />}
        {me.can.manageUsers && <Route path="users" element={<Users />} />}
        <Route path="*" element={<Empty>That admin page does not exist.</Empty>} />
      </Routes>
    </Shell>
  )
}
