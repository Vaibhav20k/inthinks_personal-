import type { AuthContext } from './auth'
import type { Env } from './types'
import { bodyObject, emailValue, reply, textValue } from './access-http'
import { audit } from './audit'
import { signEvidence } from './evidence'
import { caseWorkflowRoutes } from './case-workflow'
import { economicsRoutes } from './assessment'
import { engagementStaffRoutes } from './engagement'

export const isPlatformAdmin = (ctx: AuthContext) => ctx.actor.role === 'admin' || ctx.actor.role === 'super-admin'
export async function assigned(ctx: AuthContext, reference: string) {
  if (isPlatformAdmin(ctx)) return true
  return Boolean(await ctx.db.prepare('SELECT 1 FROM case_assignments WHERE reference=? AND staff_email=?').bind(reference,ctx.actor.email).first())
}
export async function mayDownload(ctx: AuthContext, key: string) {
  const row = await ctx.db.prepare('SELECT id,reference,scan_status FROM evidence WHERE object_key=?').bind(key).first<{id:number;reference:string;scan_status:string}>()
  if (!row || !await assigned(ctx,row.reference)) return false
  // Administrators inspect quarantined files; everyone else waits for release.
  if (!isPlatformAdmin(ctx) && row.scan_status !== 'released') return false
  if (ctx.actor.role === 'rnd-reviewer') return Boolean(await ctx.db.prepare('SELECT 1 FROM reviewer_evidence_approvals WHERE evidence_id=?').bind(row.id).first())
  return true
}

/** A fail-closed boundary before legacy admin routing. New routes are admin-only
 * until their assignment rules are explicitly added here. */
export async function staffAccess(request: Request, env: Env, ctx: AuthContext, path: string, ip: string): Promise<Response | null> {
  const { db, actor } = ctx
  const control = path.match(/^\/access\/([A-Za-z0-9-]{1,32})(?:\/(assignments|brief|evidence|scan))?$/)
  if (control) {
    if (!isPlatformAdmin(ctx)) return reply({error:'Administrator access required.'},403)
    const reference = control[1]
    if (!await db.prepare('SELECT 1 FROM case_records WHERE reference=?').bind(reference).first()) return reply({error:'Not found.'},404)
    if (request.method === 'GET' && !control[2]) {
      const assignments = await db.prepare('SELECT staff_email,assigned_at FROM case_assignments WHERE reference=?').bind(reference).all()
      const brief = await db.prepare('SELECT title,summary,approved_at FROM case_review_briefs WHERE reference=?').bind(reference).first()
      const files = await db.prepare(`SELECT e.id,e.file_name,e.scan_status,e.detected_type,e.scan_note,CASE WHEN a.evidence_id IS NULL THEN 0 ELSE 1 END approved
        FROM evidence e LEFT JOIN reviewer_evidence_approvals a ON a.evidence_id=e.id WHERE e.reference=?`).bind(reference).all()
      return reply({assignments:assignments.results,brief,files:files.results})
    }
    if (request.method !== 'POST') return reply({error:'Method not allowed.'},405)
    const body = await bodyObject(request)
    if (!body) return reply({error:'Invalid request.'},400)
    if (control[2] === 'assignments') {
      const email = emailValue(body.email)
      const staff = await db.prepare("SELECT 1 FROM users WHERE email=? AND disabled=0 AND role IN ('business-development','rnd-reviewer')").bind(email).first()
      if (!staff) return reply({error:'Choose an active mediator or technical reviewer.'},422)
      if (body.revoke === true) await db.prepare('DELETE FROM case_assignments WHERE reference=? AND staff_email=?').bind(reference,email).run()
      else await db.prepare('INSERT OR REPLACE INTO case_assignments(reference,staff_email,assigned_by,assigned_at) VALUES (?,?,?,?)')
        .bind(reference,email,actor.email,new Date().toISOString()).run()
      await audit(db,actor,body.revoke === true ? 'assignment.revoke' : 'assignment.add',reference,{email},ip)
      return reply({ok:true})
    }
    if (control[2] === 'brief') {
      const title = textValue(body.title), summary = textValue(body.summary,8000)
      if (!title || !summary || body.confirmAnonymized !== true) return reply({error:'Confirm the brief excludes identities and private commercial information.'},422)
      await db.prepare(`INSERT INTO case_review_briefs(reference,title,summary,approved_by,approved_at) VALUES (?,?,?,?,?)
        ON CONFLICT(reference) DO UPDATE SET title=excluded.title,summary=excluded.summary,approved_by=excluded.approved_by,approved_at=excluded.approved_at`)
        .bind(reference,title,summary,actor.email,new Date().toISOString()).run()
      await audit(db,actor,'review-brief.approve',reference,undefined,ip)
      return reply({ok:true})
    }
    if (control[2] === 'evidence') {
      const id = Number(body.id)
      if (!Number.isSafeInteger(id) || !await db.prepare('SELECT 1 FROM evidence WHERE id=? AND reference=?').bind(id,reference).first()) return reply({error:'Not found.'},404)
      if (body.revoke === true) await db.prepare('DELETE FROM reviewer_evidence_approvals WHERE evidence_id=?').bind(id).run()
      else {
        if (body.confirmAnonymized !== true) return reply({error:'Confirm the file is safe for technical reviewers.'},422)
        if (!await db.prepare("SELECT 1 FROM evidence WHERE id=? AND scan_status='released'").bind(id).first()) return reply({error:'Release the file from quarantine before sharing it with reviewers.'},409)
        await db.prepare('INSERT OR REPLACE INTO reviewer_evidence_approvals(evidence_id,approved_by,approved_at) VALUES (?,?,?)').bind(id,actor.email,new Date().toISOString()).run()
      }
      await audit(db,actor,body.revoke === true ? 'review-file.revoke' : 'review-file.approve',reference,{id},ip)
      return reply({ok:true})
    }
    if (control[2] === 'scan') {
      const id = Number(body.id), decision = body.decision
      if (decision !== 'released' && decision !== 'rejected') return reply({error:'Choose release or reject.'},422)
      if (body.confirmInspected !== true) return reply({error:'Confirm you inspected the file before deciding.'},422)
      const note = textValue(body.note,500)
      if (decision === 'rejected' && !note) return reply({error:'Record why the file is rejected.'},422)
      const changed = await db.batch([
        db.prepare('UPDATE evidence SET scan_status=?,scan_note=?,scanned_by=?,scanned_at=? WHERE id=? AND reference=?')
          .bind(decision,note || null,actor.email,new Date().toISOString(),Number.isSafeInteger(id) ? id : -1,reference),
        // A rejected file can no longer be shared with reviewers.
        db.prepare("DELETE FROM reviewer_evidence_approvals WHERE evidence_id=? AND EXISTS (SELECT 1 FROM evidence WHERE id=? AND scan_status='rejected')").bind(id,id),
      ])
      if (!changed[0].meta.changes) return reply({error:'Not found.'},404)
      await audit(db,actor,`file.${decision === 'released' ? 'release' : 'reject'}`,reference,{id},ip)
      return reply({ok:true})
    }
    return reply({error:'Not found.'},404)
  }
  const economics = await economicsRoutes(request, ctx, path, ip)
  if (economics) return economics
  const engagement = await engagementStaffRoutes(request, ctx, path, ip)
  if (engagement) return engagement
  const workflow = await caseWorkflowRoutes(request, ctx, path, ip)
  if (workflow) return workflow
  // Prevent staff notes being attached to arbitrary or nonexistent references.
  const note = path.match(/^\/notes\/([A-Za-z0-9-]{1,32})$/)
  if (note && !await db.prepare('SELECT 1 FROM case_records WHERE reference=?').bind(note[1]).first()) return reply({error:'Not found.'},404)
  if (isPlatformAdmin(ctx)) return null
  if (['/me','/meta'].includes(path) && request.method === 'GET') return null
  const list = path === '/challenges' || path === '/innovations'
  if (list && request.method === 'GET') {
    const table = path === '/challenges' ? 'challenges' : 'innovations'
    const rows = await db.prepare(`SELECT r.reference,r.created_at,r.review_status,r.status,
      ${actor.role === 'rnd-reviewer' ? "COALESCE(b.title,r.reference)" : 'r.title'} title
      FROM ${table} r JOIN case_assignments a ON a.reference=r.reference
      LEFT JOIN case_review_briefs b ON b.reference=r.reference WHERE a.staff_email=? ORDER BY r.created_at DESC LIMIT 200`).bind(actor.email).all<Record<string,unknown>>()
    return reply({items:rows.results.map(r=>({reference:r.reference,title:r.title,createdAt:r.created_at,reviewStatus:r.review_status,status:r.status}))})
  }
  const item = path.match(/^\/(innovations|challenges)\/([A-Za-z0-9-]{1,32})(?:\/(scores))?$/)
  const reference = item?.[2] ?? note?.[1]
  if (!reference) return reply({error:'This workspace requires administrator access until case-scoped access is available.'},403)
  if (!await assigned(ctx,reference)) return reply({error:'Not found.'},404)
  if (item && !await db.prepare('SELECT 1 FROM case_records WHERE reference=? AND kind=?')
    .bind(reference,item[1] === 'innovations' ? 'innovation' : 'challenge').first()) return reply({error:'Not found.'},404)
  if (note && request.method === 'POST') return null
  if (item && actor.role === 'business-development') return null
  if (item && actor.role === 'rnd-reviewer') {
    if (item[3] === 'scores' && request.method === 'POST') return null
    if (request.method !== 'GET' || item[3]) return reply({error:'Not permitted.'},403)
    const row = await db.prepare(`SELECT reference,created_at,review_status FROM ${item[1]} WHERE reference=?`).bind(reference).first<Record<string,unknown>>()
    if (!row) return reply({error:'Not found.'},404)
    const brief = await db.prepare('SELECT title,summary FROM case_review_briefs WHERE reference=?').bind(reference).first<{title:string;summary:string}>()
    const notes = await db.prepare('SELECT id,body,author,created_at FROM notes WHERE reference=? AND author=? ORDER BY created_at DESC').bind(reference,actor.email).all()
    const files = await db.prepare(`SELECT e.id,e.object_key,e.size_bytes FROM evidence e JOIN reviewer_evidence_approvals a ON a.evidence_id=e.id WHERE e.reference=? AND e.scan_status='released'`).bind(reference).all<{id:number;object_key:string;size_bytes:number}>()
    const evidence = await Promise.all(files.results.map(async f=>({fileName:`Reviewed evidence ${f.id}`,contentType:'application/octet-stream',sizeBytes:f.size_bytes,url:env.SESSION_SECRET ? await signEvidence(env.SESSION_SECRET,f.object_key) : null})))
    await audit(db,actor,'assigned-case.view',reference,undefined,ip)
    return reply({reference,title:brief?.title ?? reference,createdAt:row.created_at,reviewStatus:row.review_status,
      payload:brief ? {summary:brief.summary,statement:brief.summary} : {},identityWithheld:true,awaitingApprovedBrief:!brief,
      scores:[],notes:notes.results,evidence})
  }
  return reply({error:'Not permitted.'},403)
}
