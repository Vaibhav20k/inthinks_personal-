import { useEffect, useState } from 'react'
import type { Me } from './api'
import { logout } from './api'
interface Case {reference:string;title:string;reviewStatus:string;kind:string}
interface Detail {reference:string;title:string;payload:Record<string,unknown>;awaitingApprovedBrief?:boolean;notes:{id:number;body:string}[];evidence:{fileName:string;url:string|null}[]}
export default function AssignedWorkspace({me,onSignedOut}:{me:Me;onSignedOut:()=>void}) {
  const [items,setItems] = useState<Case[]>([]), [detail,setDetail] = useState<Detail|null>(null), [error,setError] = useState('')
  const [note,setNote] = useState(''), [busy,setBusy] = useState(false)
  async function get<T>(path:string,body?:unknown):Promise<T> {
    const r=await fetch(`/api/admin${path}`,{method:body?'POST':'GET',headers:body?{'content-type':'application/json'}:{},body:body?JSON.stringify(body):undefined})
    const data=await r.json();if(!r.ok)throw new Error(data.error??'Request failed');return data
  }
  useEffect(()=>{Promise.all(['challenges','innovations'].map(async kind=>{
    const data=await get<{items:Case[]}>(`/${kind}`);return data.items.map(x=>({...x,kind}))
  })).then(results=>setItems(results.flat())).catch(e=>setError(e.message))},[])
  async function run(fn:()=>Promise<void>) {setBusy(true);setError('');try{await fn()}catch(e){setError(e instanceof Error?e.message:'Request failed')}finally{setBusy(false)}}
  return <main className="admin-shell p-6 grid gap-6 max-w-6xl mx-auto">
    <header className="flex flex-wrap justify-between gap-4"><h1 className="section-type">Assigned cases</h1><button className="underline" onClick={()=>void run(async()=>{await logout();onSignedOut()})}>Sign out</button></header>
    <p>{me.email} · {me.role}. This workspace shows only your assigned cases. Organization-wide and commercial workspaces require administrator access.</p>
    {error&&<p role="alert">{error}</p>}
    {!items.length&&<p>No cases assigned yet. An administrator can assign cases from their detail page.</p>}
    <div className="grid gap-3">{items.map(c=><button disabled={busy} key={c.reference} className="border p-4 text-left" onClick={()=>void run(async()=>setDetail(await get<Detail>(`/${c.kind}/${c.reference}`)))}>{c.title} · {c.reference} · {c.reviewStatus}</button>)}</div>
    {detail&&<article className="border p-5 grid gap-4"><h2 className="text-xl">{detail.title}</h2>{detail.awaitingApprovedBrief&&<p>The administrator has not approved a technical brief yet.</p>}
      <dl className="grid gap-3">{Object.entries(detail.payload).filter(([,v])=>v!==''&&v!==null).map(([k,v])=><div key={k}><dt className="font-semibold">{k}</dt><dd className="whitespace-pre-wrap break-words">{Array.isArray(v)?v.join(', '):String(v)}</dd></div>)}</dl>
      {detail.evidence.map((f,i)=>f.url&&<a key={i} className="underline" href={f.url}>{f.fileName}</a>)}
      <h3 className="font-semibold">Review notes</h3>{detail.notes.map(n=><p key={n.id} className="whitespace-pre-wrap">{n.body}</p>)}
      <form className="grid gap-3" onSubmit={e=>{e.preventDefault();void run(async()=>{await get(`/notes/${detail.reference}`,{body:note});setNote('');const c=items.find(x=>x.reference===detail.reference)!;setDetail(await get<Detail>(`/${c.kind}/${c.reference}`))})}}><label>Technical note<textarea className="field-input mt-2" required rows={3} maxLength={4000} value={note} onChange={e=>setNote(e.target.value)}/></label><button className="border px-4 py-2" disabled={busy}>Save note</button></form>
    </article>}
  </main>
}
