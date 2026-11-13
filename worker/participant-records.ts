import type { Env } from './types'
import type { Participant } from './participant-auth'
import { bodyObject, emailValue, reply, textValue } from './access-http'
import { membership } from './participant-organizations'

export interface OwnedCase { reference:string;kind:'challenge'|'innovation';organization_id:string;created_by:string }
export async function accessibleCase(db: D1Database, reference: string, email: string) {
  return db.prepare(`SELECT c.* FROM case_records c JOIN memberships m ON m.organization_id=c.organization_id
    WHERE c.reference=? AND m.email=? AND m.active=1 AND (m.role='owner' OR c.created_by=? OR EXISTS
      (SELECT 1 FROM case_grants g WHERE g.reference=c.reference AND g.email=?))`)
    .bind(reference,email,email,email).first<OwnedCase>()
}
export function caseInsert(db: D1Database, reference: string, kind: string, organization: string | null, email: string | null) {
  return db.prepare('INSERT INTO case_records(reference,kind,organization_id,created_by) VALUES (?,?,?,?)').bind(reference,kind,organization,email)
}
export async function recordRoutes(request: Request, env: Env, user: Participant, path: string) {
  const db = env.DB!
  if (path === '/records' && request.method === 'GET') {
    const records = await db.prepare(`SELECT c.reference,c.kind,c.organization_id,COALESCE(ch.title,i.title) title,
      COALESCE(ch.review_status,i.review_status) reviewStatus FROM case_records c
      JOIN memberships m ON m.organization_id=c.organization_id
      LEFT JOIN challenges ch ON ch.reference=c.reference LEFT JOIN innovations i ON i.reference=c.reference
      WHERE m.email=? AND m.active=1 AND (m.role='owner' OR c.created_by=? OR EXISTS
      (SELECT 1 FROM case_grants g WHERE g.reference=c.reference AND g.email=?)) ORDER BY c.reference DESC LIMIT 201`)
      .bind(user.email,user.email,user.email).all()
    return reply({items:records.results.slice(0,200),truncated:records.results.length>200})
  }
  if (path === '/claim' && request.method === 'POST') {
    const body = await bodyObject(request)
    const reference = textValue(body?.reference,32), org = textValue(body?.organizationId,36)
    if (!await membership(db,org,user.email)) return reply({error:'Record unavailable.'},404)
    // Knowing a reference or company name grants nothing. The verified mailbox
    // must match the ORIGINAL submission contact. Claims never move owned cases.
    const result = await db.prepare(`UPDATE case_records SET organization_id=?,created_by=? WHERE reference=? AND organization_id IS NULL
      AND (EXISTS (SELECT 1 FROM challenges ch WHERE ch.reference=case_records.reference AND lower(ch.email)=?)
      OR EXISTS (SELECT 1 FROM innovations i WHERE i.reference=case_records.reference AND lower(i.innovator_email)=?)) RETURNING reference`)
      .bind(org,user.email,reference,user.email,user.email).first()
    return result ? reply({ok:true}) : reply({error:'Record unavailable or already claimed.'},404)
  }
  const file = path.match(/^\/evidence\/(\d+)$/)
  if (file && request.method === 'GET') {
    const evidence = await db.prepare("SELECT reference,object_key FROM evidence WHERE id=? AND scan_status='released'").bind(Number(file[1])).first<{reference:string;object_key:string}>()
    // Quarantined files are withheld even from their own organization: another
    // member's upload is not proven safe until a person releases it.
    if (!evidence || !await accessibleCase(db,evidence.reference,user.email)) return reply({error:'Not found.'},404)
    if (!env.EVIDENCE) return reply({error:'File storage unavailable.'},503)
    const object = await env.EVIDENCE.get(evidence.object_key)
    if (!object) return reply({error:'Not found.'},404)
    return new Response(object.body,{headers:{'content-type':'application/octet-stream','content-disposition':'attachment','x-content-type-options':'nosniff','cache-control':'no-store','x-robots-tag':'noindex'}})
  }
  const match = path.match(/^\/records\/([A-Za-z0-9-]{1,32})(?:\/(export|grants))?$/)
  if (!match) return null
  const record = await accessibleCase(db,match[1],user.email)
  if (!record) return reply({error:'Not found.'},404)
  if (match[2] === 'grants' && request.method === 'POST') {
    if ((await membership(db,record.organization_id,user.email))?.role !== 'owner') return reply({error:'Owner access required.'},403)
    const body = await bodyObject(request); const email = emailValue(body?.email)
    if (!await membership(db,record.organization_id,email)) return reply({error:'Active member required.'},422)
    if (body?.revoke === true) await db.prepare('DELETE FROM case_grants WHERE reference=? AND email=?').bind(record.reference,email).run()
    else await db.prepare('INSERT OR IGNORE INTO case_grants(reference,email) VALUES (?,?)').bind(record.reference,email).run()
    return reply({ok:true})
  }
  if (request.method !== 'GET' || match[2] === 'grants') return reply({error:'Method not allowed.'},405)
  const table = record.kind === 'challenge' ? 'challenges' : 'innovations'
  // Deliberately excludes internal scores, notes, priority, economics and matches.
  const row = await db.prepare(`SELECT reference,title,created_at,review_status,payload FROM ${table} WHERE reference=?`).bind(record.reference).first<Record<string,unknown>>()
  if (!row) return reply({error:'Not found.'},404)
  const files = await db.prepare('SELECT id,file_name,size_bytes,scan_status FROM evidence WHERE reference=?').bind(record.reference).all<{id:number;file_name:string;size_bytes:number;scan_status:string}>()
  return reply({reference:row.reference,kind:record.kind,title:row.title,createdAt:row.created_at,reviewStatus:row.review_status,
    answers:JSON.parse(String(row.payload)),evidence:files.results.map(f=>({id:f.id,name:f.file_name,size:f.size_bytes,status:f.scan_status,url:f.scan_status === 'released' ? `/api/participant/evidence/${f.id}` : null}))},200,
    match[2] === 'export' ? {'content-disposition':`attachment; filename="${record.reference}.json"`} : {})
}
