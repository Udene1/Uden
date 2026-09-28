// Production deployment trigger: keep engine deployment tied to the authoritative main client/backend state.
import { Hono } from 'hono';
import { HonoEnv } from '../types';
import { createTenant, getTenantById, updateTenant } from '../db/queries';
import { hashApiKey } from '../middleware/auth';
import { Tenant, TenantPublic } from '@ai-work-partner/shared';

function publicTenant(tenant: Tenant): TenantPublic {
  return { id: tenant.id, name: tenant.name, email: tenant.email, qualityPreference: tenant.qualityPreference, monthlyBudgetCents: tenant.monthlyBudgetCents, defaultMode: tenant.defaultMode, bringOwnKeys: tenant.bringOwnKeys, createdAt: tenant.createdAt, updatedAt: tenant.updatedAt };
}
import { writeAudit, requirePermission } from '../services/permissions';
import { createAuthSession, AuthClient, sessionCookie } from '../services/auth-sessions';

export const tenantRoutes = new Hono<HonoEnv>();
function isClient(value: unknown): value is AuthClient { return value === 'desktop' || value === 'web' || value === 'mobile' || value === 'api'; }

tenantRoutes.post('/', async c => {
  const body=await c.req.json().catch(()=>({}));
  if(!body.name)return c.json({error:'Name is required'},400);
  const rawKey=`sk_${crypto.randomUUID().replace(/-/g,'')}`;
  const tenant:Tenant={id:crypto.randomUUID(),name:body.name,email:body.email||'',apiKeyHash:await hashApiKey(rawKey),qualityPreference:body.qualityPreference||'balanced',monthlyBudgetCents:body.monthlyBudgetCents||body.budget_limit?(body.budget_limit*100):10000,defaultMode:body.defaultMode||'permissionless',bringOwnKeys:Boolean(body.bringOwnKeys),createdAt:new Date().toISOString(),updatedAt:new Date().toISOString()};
  const client=isClient(body.client)?body.client:'api';
  const subject=`tenant:${tenant.id}`;
  try {
    await createTenant(c.env.DB,tenant);
    await c.env.DB.prepare(`INSERT INTO tenant_members (id,tenant_id,subject,role) VALUES (?,?,?,'owner')`).bind(crypto.randomUUID(),tenant.id,subject).run();
    const session=await createAuthSession(c.env.DB,tenant.id,client,subject);
    c.header('Set-Cookie', sessionCookie(session.token, session.expiresAt));
    return c.json({tenant: publicTenant(tenant),api_key:rawKey,session_token:session.token,expires_at:session.expiresAt,subject,client},201);
  } catch(error) {
    await c.env.DB.batch([
      c.env.DB.prepare('DELETE FROM auth_sessions WHERE tenant_id=?').bind(tenant.id),
      c.env.DB.prepare('DELETE FROM tenant_members WHERE tenant_id=?').bind(tenant.id),
      c.env.DB.prepare('DELETE FROM tenants WHERE id=?').bind(tenant.id),
    ]);
    throw error;
  }
});
tenantRoutes.get('/',async c=>{const tenant=await getTenantById(c.env.DB,c.get('tenantId'));return c.json({tenant: publicTenant(tenant)});});
tenantRoutes.put('/',async c=>{const t=c.get('tenantId');await requirePermission(c.env.DB,t,'settings:write');const body=await c.req.json().catch(()=>({}));const updates:Partial<Tenant>={};if(body.name!==undefined)updates.name=body.name;if(body.qualityPreference!==undefined)updates.qualityPreference=body.qualityPreference;if(body.monthlyBudgetCents!==undefined)updates.monthlyBudgetCents=body.monthlyBudgetCents;if(body.defaultMode!==undefined)updates.defaultMode=body.defaultMode;if(body.bringOwnKeys!==undefined)updates.bringOwnKeys=body.bringOwnKeys;await updateTenant(c.env.DB,t,updates);await writeAudit(c.env.DB,t,'tenant.update','tenant',t,undefined,c.get('requestId'));return c.json({success:true});});
tenantRoutes.post('/rotate-key',async c=>{const t=c.get('tenantId');await requirePermission(c.env.DB,t,'settings:write');const rawKey=`sk_${crypto.randomUUID().replace(/-/g,'')}`;await updateTenant(c.env.DB,t,{apiKeyHash:await hashApiKey(rawKey)});await writeAudit(c.env.DB,t,'tenant.rotate_key','tenant',t,undefined,c.get('requestId'));return c.json({api_key:rawKey});});