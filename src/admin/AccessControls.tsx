import { useEffect, useState } from 'react'
import { Panel } from './ui'

interface AccessState {assignments:{staff_email:string}[];brief:{title:string;summary:string}|null;files:{id:number;file_name:string;approved:number;scan_status:string;detected_type:string|null;scan_note:string|null}[]}
export default function AccessControls({reference}:{reference:string}) {
  const [data,setData] = useState<AccessState|null>(null), [error,setError] = useState(''), [busy,setBusy] = useState(false)
  const [email,setEmail] = useState(''), [title,setTitle] = useState(''), [summary,setSummary] = useState(''), [confirmed,setConfirmed] = useState(false)
  async function call(suffix='',body?:unknown) {
    const response = await fetch(`/api/admin/access/${reference}${suffix}`,{method:body?'POST':'GET',headers:body?{'content-type':'application/json'}:{},body:body?JSON.stringify(body):undefined})
    const value = await response.json()
    if (!response.ok) throw new Error(value.error ?? 'Request failed')
    return value as AccessState
  }
  async function reload() {setData(await call())}
  useEffect(()=>{call().then(d=>{setData(d);setTitle(d.brief?.title??'');setSummary(d.brief?.summary??'')}).catch(e=>setError(e.message))},[reference])
  async function change(suffix:string,body:unknown) {setBusy(true);setError('');try{await call(suffix,body);await reload()}catch(e){setError(e instanceof Error?e.message:'Request failed')}finally{setBusy(false)}}
  return <Panel title="Case access">
    <div className="grid gap-4">
      {error&&<p role="alert">{error}</p>}
      <p>Mediators and technical reviewers can access only assigned cases. Reviewers see the approved brief and explicitly approved evidence, not the raw submission.</p>
      <form className="flex flex-wrap items-end gap-3" onSubmit={e=>{e.preventDefault();void change('/assignments',{email})}}><label>Staff email<input required type="email" className="field-input mt-2" value={email} onChange={e=>setEmail(e.target.value)}/></label><button className="border px-4 py-2" disabled={busy}>Assign</button></form>
      {data?.assignments.map(a=><div key={a.staff_email} className="flex flex-wrap justify-between gap-3"><span>{a.staff_email}</span><button className="underline" disabled={busy} onClick={()=>void change('/assignments',{email:a.staff_email,revoke:true})}>Revoke assignment</button></div>)}
      <form className="grid gap-3" onSubmit={e=>{e.preventDefault();void change('/brief',{title,summary,confirmAnonymized:confirmed})}}>
        <label>Reviewer-safe title<input className="field-input mt-2" required maxLength={200} value={title} onChange={e=>setTitle(e.target.value)}/></label>
        <label>Technical brief<textarea className="field-input mt-2" required rows={5} maxLength={8000} value={summary} onChange={e=>setSummary(e.target.value)}/></label>
        <label className="flex items-start gap-3"><input type="checkbox" required checked={confirmed} onChange={e=>setConfirmed(e.target.checked)}/>I reviewed this brief and removed names, identifiable locations, contact details, and private commercial information.</label>
        <button className="border px-4 py-2" disabled={busy||!confirmed}>Approve reviewer brief</button>
      </form>
      {Boolean(data?.files.length)&&<h3 className="font-semibold">Files</h3>}
      <p className="text-sm">Every file starts quarantined. No virus scanner runs here: download it as an administrator, inspect it on a protected machine, then release or reject it. Only released files reach the submitter's team, mediators or reviewers.</p>
      {data?.files.map(f=><div key={f.id} className="grid gap-2 border p-3" style={{borderColor:'var(--rule)'}}>
        <span>{f.file_name} · {f.scan_status}{f.detected_type?` · content looks like ${f.detected_type}`:''}{f.scan_note?` · ${f.scan_note}`:''}</span>
        {f.scan_status!=='released'&&<button className="underline justify-self-start" disabled={busy} onClick={()=>{if(window.confirm('Release this file? Confirm you inspected its contents.'))void change('/scan',{id:f.id,decision:'released',confirmInspected:true})}}>Release after inspection</button>}
        {f.scan_status!=='rejected'&&<button className="underline justify-self-start" disabled={busy} onClick={()=>{const note=window.prompt('Why is this file rejected?');if(note)void change('/scan',{id:f.id,decision:'rejected',confirmInspected:true,note})}}>Reject file</button>}
        {f.scan_status==='released'&&<label className="flex items-start gap-3"><input type="checkbox" disabled={busy} checked={Boolean(f.approved)} onChange={e=>void change('/evidence',{id:f.id,revoke:!e.target.checked,confirmAnonymized:e.target.checked})}/><span>Safe for assigned technical reviewers. Approve only after checking the contents for identity and commercial information.</span></label>}
      </div>)}
    </div>
  </Panel>
}
