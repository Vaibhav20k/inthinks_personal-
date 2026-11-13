import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { activeOrganization, chooseOrganization, participantApi } from '../../lib/participant'
import type { Organization } from '../../lib/participant'

export default function SubmissionAccount() {
  const [email,setEmail] = useState('')
  const [organizations,setOrganizations] = useState<Organization[]>([])
  const [selected,setSelected] = useState(activeOrganization)
  useEffect(()=>{
    let live = true
    participantApi<{email:string}>('/me').then(async user=>{
      const result = await participantApi<{items:Organization[]}>('/organizations')
      if (!live) return
      setEmail(user.email);setOrganizations(result.items)
      const id = result.items.some(o=>o.id===activeOrganization()) ? activeOrganization() : result.items[0]?.id ?? ''
      chooseOrganization(id);setSelected(id)
    }).catch(()=>{chooseOrganization('')})
    return ()=>{live=false}
  },[])
  return <aside className="mb-8 border p-4" style={{borderColor:'var(--rule)'}}>
    {email ? <>
      <p className="mb-3">Submitting as {email}. Use this email in your contact details.</p>
      {organizations.length ? <label>Organization
        <select className="field-input mt-2" value={selected} onChange={e=>{chooseOrganization(e.target.value);setSelected(e.target.value)}}>
          {organizations.map(o=><option key={o.id} value={o.id}>{o.name}</option>)}
        </select>
      </label> : <Link to="/account" className="underline">Create an organization before submitting.</Link>}
    </> : <p><Link to="/account" className="underline">Verify your email</Link> to manage your submissions. You can also submit now and claim your reference after verifying the contact email.</p>}
  </aside>
}
