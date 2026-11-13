import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import PageMeta from '../components/layout/PageMeta'
import { activeOrganization, chooseOrganization, participantApi as api } from '../lib/participant'
import type { Organization } from '../lib/participant'

interface RecordItem {reference:string;title:string;kind:string;reviewStatus:string;organization_id:string}
interface RecordDetail extends RecordItem {answers:Record<string,unknown>;evidence:{id:number;name:string;url:string}[]}
export default function Account() {
  const [identity,setIdentity] = useState<string|null>(null)
  const [loading,setLoading] = useState(true)
  const [email,setEmail] = useState(''), [code,setCode] = useState(''), [requestId,setRequestId] = useState('')
  const [organizations,setOrganizations] = useState<Organization[]>([]), [selected,setSelected] = useState(activeOrganization)
  const [records,setRecords] = useState<RecordItem[]>([]), [detail,setDetail] = useState<RecordDetail|null>(null)
  const [invitations,setInvitations] = useState<{id:string;name:string}[]>([])
  const [members,setMembers] = useState<{email:string;role:string;active:number}[]>([])
  const [name,setName] = useState(''), [reference,setReference] = useState(''), [inviteEmail,setInviteEmail] = useState('')
  const [shareEmail,setShareEmail] = useState('')
  const [busy,setBusy] = useState(false), [error,setError] = useState(''), [notice,setNotice] = useState('')
  const owner = organizations.find(o=>o.id===selected)?.role === 'owner'
  async function refresh() {
    const [orgs,cases,invites] = await Promise.all([api<{items:Organization[]}>('/organizations'),api<{items:RecordItem[]}>('/records'),api<{items:{id:string;name:string}[]}>('/invitations')])
    setOrganizations(orgs.items);setRecords(cases.items);setInvitations(invites.items)
    const id = orgs.items.some(o=>o.id===activeOrganization()) ? activeOrganization() : orgs.items[0]?.id ?? ''
    chooseOrganization(id);setSelected(id)
  }
  async function action(fn:()=>Promise<void>) {
    setBusy(true);setError('');setNotice('')
    try { await fn() } catch(e) {setError(e instanceof Error ? e.message : 'Request failed')}
    finally {setBusy(false)}
  }
  useEffect(()=>{
    api<{email:string}>('/me').then(async user=>{setIdentity(user.email);await refresh()}).catch(()=>setIdentity(null)).finally(()=>setLoading(false))
  },[])
  useEffect(()=>{
    setMembers([])
    if (!owner || !selected) return
    let live = true
    api<{items:typeof members}>(`/organizations/${selected}/members`).then(r=>{if(live)setMembers(r.items)}).catch(()=>{})
    return ()=>{live=false}
  },[selected,owner,organizations])
  const button = 'border px-4 py-2 disabled:opacity-50'
  return <section className="container-grid pt-36 pb-24 max-w-5xl">
    <PageMeta title="My submissions" description="Manage your own InThinks submissions." noindex />
    <h1 className="section-type mb-8">My submissions</h1>
    {error && <p role="alert" className="mb-4">{error}</p>}
    {notice && <p role="status" className="mb-4">{notice}</p>}
    {loading ? <p>Checking your session…</p> : !identity ? <form className="grid gap-5 max-w-lg" onSubmit={e=>{e.preventDefault();void action(async()=>{
      if (!requestId) {const r=await api<{requestId:string}>('/login/request',{email});setRequestId(r.requestId);setNotice('Check your email for the eight-digit code.')}
      else {const r=await api<{email:string}>('/login/verify',{requestId,code});setIdentity(r.email);await refresh()}
    })}}>
      <p>Verify your contact email to access your records. Organization membership requires an invitation; matching company names never grant access.</p>
      <label>Email<input className="field-input mt-2" required type="email" autoComplete="email" value={email} disabled={Boolean(requestId)} onChange={e=>setEmail(e.target.value)}/></label>
      {requestId && <label>Verification code<input className="field-input mt-2" required inputMode="numeric" autoComplete="one-time-code" pattern="[0-9]{8}" maxLength={8} value={code} onChange={e=>setCode(e.target.value)}/></label>}
      <button className={button} disabled={busy}>{busy?'Please wait…':requestId?'Verify and sign in':'Send verification code'}</button>
      {requestId && <button className="underline" type="button" disabled={busy} onClick={()=>{setRequestId('');setCode('')}}>Use another email or request a new code</button>}
    </form> : <div className="grid gap-8">
      <div className="flex flex-wrap justify-between gap-3"><p>{identity}</p><button className={button} disabled={busy} onClick={()=>void action(async()=>{await api('/logout',{});chooseOrganization('');setIdentity(null);setDetail(null);setRequestId('');setCode('')})}>Sign out</button></div>
      {invitations.map(i=><div key={i.id} className="border p-4">Invitation to {i.name} <button className={button} disabled={busy} onClick={()=>void action(async()=>{await api(`/invitations/${i.id}/accept`,{});await refresh()})}>Accept invitation</button></div>)}
      <form className="flex flex-wrap items-end gap-3" onSubmit={e=>{e.preventDefault();void action(async()=>{const org=await api<Organization>('/organizations',{name});chooseOrganization(org.id);setName('');await refresh()})}}>
        <label>Create an organization<input className="field-input mt-2" required maxLength={200} value={name} onChange={e=>setName(e.target.value)}/></label><button className={button} disabled={busy}>Create</button>
      </form>
      {organizations.length>0 && <>
        <label>Active organization<select className="field-input mt-2" value={selected} onChange={e=>{setSelected(e.target.value);chooseOrganization(e.target.value);setDetail(null)}}>{organizations.map(o=><option key={o.id} value={o.id}>{o.name} — {o.role}</option>)}</select></label>
        <div className="flex gap-5"><Link className="underline" to="/submit-challenge">Submit a problem</Link><Link className="underline" to="/submit-innovation">Submit a solution</Link></div>
        <form className="flex flex-wrap items-end gap-3" onSubmit={e=>{e.preventDefault();void action(async()=>{await api('/claim',{reference,organizationId:selected});setReference('');await refresh();setNotice('Submission claimed.')})}}>
          <label>Claim an earlier submission<input className="field-input mt-2" required placeholder="CH-2026-0001" value={reference} onChange={e=>setReference(e.target.value)}/></label><button className={button} disabled={busy}>Claim reference</button>
        </form>
        <p>You can claim only submissions originally sent using your verified email. Claims cannot transfer an already owned submission.</p>
        {owner && <div className="border p-5 grid gap-4">
          <h2 className="text-xl">Organization members</h2>
          <form className="flex flex-wrap items-end gap-3" onSubmit={e=>{e.preventDefault();void action(async()=>{const r=await api<{message:string}>(`/organizations/${selected}/members`,{email:inviteEmail});setNotice(r.message);setInviteEmail('')})}}><label>Invite contributor<input className="field-input mt-2" type="email" required value={inviteEmail} onChange={e=>setInviteEmail(e.target.value)}/></label><button className={button} disabled={busy}>Invite</button></form>
          <p>Invitees sign in with that email to accept. Contributors see their own submissions and records you explicitly share.</p>
          {members.map(m=><div key={m.email} className="flex flex-wrap justify-between gap-3"><span>{m.email} — {m.role}{m.active?'':' (revoked)'}</span>{m.active===1&&m.role==='contributor'&&<button className={button} disabled={busy} onClick={()=>void action(async()=>{await api(`/organizations/${selected}/members/${encodeURIComponent(m.email)}`,undefined,'DELETE');await refresh()})}>Revoke membership</button>}</div>)}
        </div>}
      </>}
      <div className="grid gap-3"><h2 className="text-xl">Your records</h2>{records.filter(r=>r.organization_id===selected).map(r=><button key={r.reference} className="border p-4 text-left" onClick={()=>void action(async()=>setDetail(await api<RecordDetail>(`/records/${r.reference}`)))}><strong>{r.title}</strong><br/>{r.reference} · {r.reviewStatus.replaceAll('_',' ')}</button>)}{!records.some(r=>r.organization_id===selected)&&<p>No submissions available for this organization yet.</p>}</div>
      {detail && <article className="border p-5 grid gap-4"><h2 className="text-xl">{detail.title}</h2><a className="underline" href={`/api/participant/records/${detail.reference}/export`}>Download submission</a>
        <dl className="grid gap-3">{Object.entries(detail.answers).filter(([,v])=>v!==''&&v!==null).map(([k,v])=><div key={k}><dt className="font-semibold">{k.replaceAll('_',' ')}</dt><dd className="whitespace-pre-wrap break-words">{Array.isArray(v)?v.join(', '):String(v)}</dd></div>)}</dl>
        {detail.evidence.map(f=><a className="underline" key={f.id} href={f.url}>{f.name}</a>)}
        {owner && <form className="flex flex-wrap items-end gap-3" onSubmit={e=>{e.preventDefault();void action(async()=>{await api(`/records/${detail.reference}/grants`,{email:shareEmail});setNotice('Record shared with the selected member.')})}}><label>Share with active contributor<input className="field-input mt-2" required type="email" value={shareEmail} onChange={e=>setShareEmail(e.target.value)}/></label><button className={button} disabled={busy}>Grant access</button><button type="button" className={button} disabled={busy||!shareEmail} onClick={()=>void action(async()=>{await api(`/records/${detail.reference}/grants`,{email:shareEmail,revoke:true});setNotice('Explicit access revoked.')})}>Revoke access</button></form>}
      </article>}
    </div>}
  </section>
}
