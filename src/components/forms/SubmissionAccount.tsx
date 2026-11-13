import { useEffect, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { activeOrganization, chooseOrganization, participantApi } from '../../lib/participant'
import type { Organization } from '../../lib/participant'
import { openServerDraft, saveServerDraft } from '../../lib/server-draft'
import type { DraftKind } from '../../lib/server-draft'

interface DraftProps { kind: DraftKind; value: object; onRestore: (payload: Record<string, unknown>) => void }

export default function SubmissionAccount({ draft }: { draft?: DraftProps }) {
  const [email,setEmail] = useState('')
  const [organizations,setOrganizations] = useState<Organization[]>([])
  const [selected,setSelected] = useState(activeOrganization)
  const [params, setParams] = useSearchParams()
  const [draftNote,setDraftNote] = useState(''), [saving,setSaving] = useState(false)
  useEffect(()=>{
    let live = true
    participantApi<{email:string}>('/me').then(async user=>{
      const result = await participantApi<{items:Organization[]}>('/organizations')
      if (!live) return
      setEmail(user.email);setOrganizations(result.items)
      const id = result.items.some(o=>o.id===activeOrganization()) ? activeOrganization() : result.items[0]?.id ?? ''
      chooseOrganization(id);setSelected(id)
      // Opened from My submissions → Continue: load the server draft once.
      const requested = params.get('draft')
      if (draft && requested) {
        try { draft.onRestore(await openServerDraft(draft.kind, requested)); setDraftNote('Draft loaded from your account.') }
        catch (e) { setDraftNote(e instanceof Error ? e.message : 'Draft could not be loaded.') }
        params.delete('draft'); setParams(params, { replace: true })
      }
    }).catch(()=>{chooseOrganization('')})
    return ()=>{live=false}
  // eslint-disable-next-line react-hooks/exhaustive-deps
  },[])
  async function save() {
    if (!draft) return
    setSaving(true);setDraftNote('')
    try { await saveServerDraft(draft.kind, draft.value, selected); setDraftNote(`Saved to your account at ${new Date().toLocaleTimeString()}. Attached files are not kept in drafts.`) }
    catch (e) { setDraftNote(e instanceof Error ? e.message : 'Draft could not be saved.') }
    finally { setSaving(false) }
  }
  return <aside className="mb-8 border p-4" style={{borderColor:'var(--rule)'}}>
    {email ? <>
      <p className="mb-3">Submitting as {email}. Use this email in your contact details.</p>
      {organizations.length ? <label>Organization
        <select className="field-input mt-2" value={selected} onChange={e=>{chooseOrganization(e.target.value);setSelected(e.target.value)}}>
          {organizations.map(o=><option key={o.id} value={o.id}>{o.name}</option>)}
        </select>
      </label> : <Link to="/account" className="underline">Create an organization before submitting.</Link>}
      {draft && <div className="mt-3 flex flex-wrap items-center gap-3">
        <button type="button" className="border px-4 py-2 disabled:opacity-50" disabled={saving} onClick={()=>void save()}>{saving ? 'Saving…' : 'Save draft to my account'}</button>
        {draftNote && <span role="status">{draftNote}</span>}
      </div>}
    </> : <p><Link to="/account" className="underline">Verify your email</Link> to manage your submissions and keep drafts in your account. You can also submit now and claim your reference after verifying the contact email.</p>}
  </aside>
}
