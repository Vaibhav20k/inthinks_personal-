export async function testOwnership({mf,db,call,check,challenge,innovation,admin,deliveries}) {
  await db.prepare('DELETE FROM rate_limit').run()
  async function login(email) {
    const start = await call('/api/participant/login/request',{email})
    check('verification email requested',start.status,200)
    const mail = deliveries.findLast(d=>d.body.subject === 'Your InThinks verification code' && d.body.to[0] === email)
    const code = mail.body.text.match(/\b\d{8}\b/)[0]
    const verified = await call('/api/participant/login/verify',{requestId:start.body.requestId,code})
    check('mailbox verified',verified.status,200)
    check('verification code cannot be reused',(await call('/api/participant/login/verify',{requestId:start.body.requestId,code})).status,401)
    return {cookie:verified.headers.get('set-cookie').split(';')[0]}
  }
  const a = await login('owner@example.com'), b = await login('other@example.com'), contributor = await login('member@example.com')
  const lockedRequest = await call('/api/participant/login/request',{email:'locked@example.com'})
  const lockedCode = deliveries.findLast(d=>d.body.to?.[0]==='locked@example.com').body.text.match(/\b\d{8}\b/)[0]
  for(let i=0;i<5;i++) await call('/api/participant/login/verify',{requestId:lockedRequest.body.requestId,code:lockedCode==='00000000'?'11111111':'00000000'})
  check('five wrong codes lock the verification challenge',(await call('/api/participant/login/verify',{requestId:lockedRequest.body.requestId,code:lockedCode})).status,401)
  const expired = await call('/api/participant/login/request',{email:'expired@example.com'})
  const expiredCode = deliveries.findLast(d=>d.body.to?.[0]==='expired@example.com').body.text.match(/\b\d{8}\b/)[0]
  await db.prepare("UPDATE verification_challenges SET expires_at='2000-01-01' WHERE id=?").bind(expired.body.requestId).run()
  check('expired verification code rejected',(await call('/api/participant/login/verify',{requestId:expired.body.requestId,code:expiredCode})).status,401)
  check('email request never returns code',Object.hasOwn((await call('/api/participant/login/request',{email:'someone@example.com'})).body,'code'),false)
  const orgA = (await call('/api/participant/organizations',{name:'Synthetic A'},a)).body.id
  const orgB = (await call('/api/participant/organizations',{name:'Synthetic B'},b)).body.id
  check('organization list is private',(await call('/api/participant/organizations',null,a)).body.items.map(x=>x.id),[orgA])
  check('organization name does not grant membership',(await call(`/api/participant/organizations/${orgA}/members`,null,b)).status,404)
  check('cannot forge organization on intake',(await call('/api/challenges',{...challenge,email:'other@example.com'},{...b,'x-organization-id':orgA,'idempotency-key':crypto.randomUUID()})).status,403)
  const key = crypto.randomUUID()
  const saved = await call('/api/challenges',challenge,{...a,'x-organization-id':orgA,'idempotency-key':key})
  check('verified intake creates owned case',saved.status,201)
  const ref = saved.body.reference
  check('intake owner persisted',(await db.prepare('SELECT organization_id FROM case_records WHERE reference=?').bind(ref).first()).organization_id,orgA)
  check('owned idempotency key cannot leak reference',(await call('/api/challenges',challenge,{'idempotency-key':key})).status,403)
  check('owner sees own case',(await call(`/api/participant/records/${ref}`,null,a)).status,200)
  for (const suffix of ['', '/export']) check(`other company denied record${suffix}`,(await call(`/api/participant/records/${ref}${suffix}`,null,b)).status,404)
  check('other company list omits case',(await call('/api/participant/records',null,b)).body.items.length,0)
  const ownResult = (await call(`/api/participant/records/${ref}`,null,a)).body
  check('participant does not receive internal fields',['scores','notes','priority','economics','matches','analyst'].some(k=>Object.hasOwn(ownResult,k)),false)
  check('participant session cannot enter admin',(await call('/api/admin/challenges',null,a)).status,401)
  check('sensitive participant reads are audited',Boolean(await db.prepare("SELECT 1 FROM audit_log WHERE actor='owner@example.com' AND role='participant' AND action='participant.get'").first()),true)
  const prior = await db.prepare("SELECT reference FROM case_records WHERE organization_id IS NULL AND kind='challenge' LIMIT 1").first()
  check('claim requires original verified mailbox',(await call('/api/participant/claim',{reference:prior.reference,organizationId:orgB},b)).status,404)
  check('verified original contact can claim legacy case',(await call('/api/participant/claim',{reference:prior.reference,organizationId:orgA},a)).status,200)
  check('claim cannot transfer an owned case',(await call('/api/participant/claim',{reference:ref,organizationId:orgB},b)).status,404)
  check('owner invites contributor',(await call(`/api/participant/organizations/${orgA}/members`,{email:'member@example.com'},a)).status,201)
  const invite = (await call('/api/participant/invitations',null,contributor)).body.items[0]
  check('other mailbox cannot accept invite',(await call(`/api/participant/invitations/${invite.id}/accept`,{},b)).status,404)
  check('verified invitee accepts',(await call(`/api/participant/invitations/${invite.id}/accept`,{},contributor)).status,200)
  check('contributor cannot see other member case',(await call(`/api/participant/records/${ref}`,null,contributor)).status,404)
  check('owner grants selected case',(await call(`/api/participant/records/${ref}/grants`,{email:'member@example.com'},a)).status,200)
  check('contributor sees explicitly shared case',(await call(`/api/participant/records/${ref}`,null,contributor)).status,200)
  check('contributor cannot invite members',(await call(`/api/participant/organizations/${orgA}/members`,{email:'outsider@example.com'},contributor)).status,404)
  check('owner revokes contributor',(await call(`/api/participant/organizations/${orgA}/members/member%40example.com`,null,a,'DELETE')).status,200)
  check('revocation takes effect on existing session',(await call(`/api/participant/records/${ref}`,null,contributor)).status,404)
  check('revocation blocks new intake',(await call('/api/challenges',{...challenge,email:'member@example.com'},{...contributor,'x-organization-id':orgA,'idempotency-key':crypto.randomUUID()})).status,403)
  const existingInnovation = await db.prepare('SELECT reference FROM innovations LIMIT 1').first()
  const innovator = await login('innovator@example.com')
  const orgI = (await call('/api/participant/organizations',{name:'Synthetic Innovator'},innovator)).body.id
  await call('/api/participant/claim',{reference:existingInnovation.reference,organizationId:orgI},innovator)
  const file = await db.prepare('SELECT id,object_key FROM evidence WHERE reference=?').bind(existingInnovation.reference).first()
  // Download response is bytes rather than JSON; use raw fetch in this check.
  const filePath = `/api/participant/evidence/${file.id}`
  check('foreign company cannot download evidence',(await call(filePath,null,b)).status,404)
  const ownerFiles = (await call(`/api/participant/records/${existingInnovation.reference}`,null,innovator)).body.evidence
  check('quarantined file has no download link for its owner',ownerFiles[0].url,null)
  check('quarantined file withheld from its own organization',(await call(filePath,null,innovator)).status,404)
  const scan = `/api/admin/access/${existingInnovation.reference}/scan`
  check('release requires confirmed inspection',(await call(scan,{id:file.id,decision:'released'},admin)).status,422)
  check('rejection requires a reason',(await call(scan,{id:file.id,decision:'rejected',confirmInspected:true},admin)).status,422)
  check('quarantined file cannot be shared with reviewers',(await call(`/api/admin/access/${existingInnovation.reference}/evidence`,{id:file.id,confirmAnonymized:true},admin)).status,409)
  check('admin releases inspected file',(await call(scan,{id:file.id,decision:'released',confirmInspected:true},admin)).status,200)
  check('release is audited',Boolean(await db.prepare("SELECT 1 FROM audit_log WHERE action='file.release'").first()),true)
  check('owner gets authorized file endpoint after release',(await call(`/api/participant/records/${existingInnovation.reference}`,null,innovator)).body.evidence[0].url,filePath)
  const download = await mf.dispatchFetch(`https://inthinks.test${filePath}`,{headers:innovator})
  check('released file downloads for its owner',[download.status,await download.text()],[200,'test evidence'])
  const reviewerToken = (await call('/test/session',{email:'reviewer@example.com',role:'rnd-reviewer'})).body.token
  const reviewer = {cookie:`inthinks_admin=${reviewerToken}`}
  const mediatorToken = (await call('/test/session',{email:'mediator@example.com',role:'business-development'})).body.token
  const mediator = {cookie:`inthinks_admin=${mediatorToken}`}
  check('unassigned mediator cannot read case',(await call(`/api/admin/challenges/${ref}`,null,mediator)).status,404)
  await call(`/api/admin/access/${ref}/assignments`,{email:'mediator@example.com'},admin)
  check('assigned mediator can read case',(await call(`/api/admin/challenges/${ref}`,null,mediator)).status,200)
  check('assigned reference cannot be used through wrong record type',(await call(`/api/admin/innovations/${ref}`,null,mediator)).status,404)
  check('mediator cannot access unrelated innovation',(await call(`/api/admin/innovations/${existingInnovation.reference}`,null,mediator)).status,404)
  check('unassigned reviewer sees no cases',(await call('/api/admin/innovations',null,reviewer)).body.items.length,0)
  check('unassigned reviewer detail denied',(await call(`/api/admin/innovations/${existingInnovation.reference}`,null,reviewer)).status,404)
  for (const path of ['/opportunities','/deals','/royalties','/engine','/audit','/messages','/public/technologies'])
    check(`reviewer cannot access global ${path}`,(await call(`/api/admin${path}`,null,reviewer)).status,403)
  await call(`/api/admin/access/${existingInnovation.reference}/assignments`,{email:'reviewer@example.com'},admin)
  const limited = await call(`/api/admin/innovations/${existingInnovation.reference}`,null,reviewer)
  check('assigned reviewer sees approved-brief placeholder',limited.body.awaitingApprovedBrief,true)
  check('unapproved evidence withheld',limited.body.evidence.length,0)
  check('reviewer cannot view raw IP owner',JSON.stringify(limited.body).includes(innovation.owner),false)
  check('reviewer cannot grant own access',(await call(`/api/admin/access/${ref}/assignments`,{email:'reviewer@example.com'},reviewer)).status,403)
  await call(`/api/admin/access/${existingInnovation.reference}/brief`,{title:'Anonymized coating',summary:'Technical heat-loss treatment.',confirmAnonymized:true},admin)
  check('approved brief visible',(await call(`/api/admin/innovations/${existingInnovation.reference}`,null,reviewer)).body.payload.summary,'Technical heat-loss treatment.')
  await call(`/api/admin/access/${existingInnovation.reference}/evidence`,{id:file.id,confirmAnonymized:true},admin)
  const link = (await call(`/api/admin/innovations/${existingInnovation.reference}`,null,reviewer)).body.evidence[0].url
  await call(`/api/admin/access/${existingInnovation.reference}/assignments`,{email:'reviewer@example.com',revoke:true},admin)
  check('old signed URL denied after assignment revocation',(await call(link,null,reviewer)).status,404)
  check('revoked reviewer no longer sees case',(await call(`/api/admin/innovations/${existingInnovation.reference}`,null,reviewer)).status,404)
  check('cross-origin participant mutation blocked',(await call('/api/participant/organizations',{name:'forged'},{...a,origin:'https://attacker.test'})).status,403)
  check('cross-origin admin mutation blocked',(await call(`/api/admin/challenges/${ref}`,{reviewStatus:'declined'},{...admin,origin:'https://attacker.test'},'PATCH')).status,403)
  check('logout revokes session',(await call('/api/participant/logout',{},a)).status,200)
  check('old participant cookie no longer works',(await call('/api/participant/me',null,a)).status,401)
  return {login,orgA,orgB,ref,b,mediator,reviewer,innovator,existingInnovation,file}
}
