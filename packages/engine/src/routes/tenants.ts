import { Hono } from 'hono';
import { HonoEnv } from '../types';
import { createTenant, getTenantById, updateTenant } from '../db/queries';
import { hashApiKey } from '../middleware/auth';
import { Tenant } from '@ai-work-partner/shared';
import { writeAudit } from '../services/permissions';
export const tenantRoutes = new Hono<HonoEnv>();

tenantRoutes.post('/', async c => { const body=await c.req.json().catch(()=>({})); if(!body.name)return c.json({error:'Name is required'},400); const rawKey=`sk_${crypto.randomUUID().replace(/-/g,'')}`;const apiKeyHash=await hashApiKey(rawKey);const now=new Date().toISOString();const tenant:Tenant={id:crypto.randomUUID(),name:body.name,email:body.email||'',apiKeyHash,qualityPreference:body.qualityPreference||'balanced',monthlyBudgetCents:body.monthlyBudgetCents||body.budget_limit?(body.budget_limit*100):10000,defaultMode:body.defaultMode||'permissionless',bringOwnKeys:Boolean(body.bringOwnKeys),createdAt:now,updatedAt:now};await createTenant(c.env.DB,tenant);await c.env.DB.prepare(`INSERT INTO tenant_members (id,tenant_id,subject,role) VALUES (?,?,?,'owner')`).bind(crypto.randomUUID(),tenant.id,'tenant-api-key').run();return c.json({tenant,api_key:rawKey},201); });
tenantRoutes.get('/',async c=>{const tenant=await getTenantById(c.env.DB,c.get('tenantId'));return c.json({tenant});});
tenantRoutes.put('/',async c=>{const t=c.get('tenantId');const body=await c.req.json().catch(()=>({}));const updates:Partial<Tenant>={};if(body.name!==undefined)updates.name=body.name;if(body.qualityPreference!==undefined)updates.qualityPreference=body.qualityPreference;if(body.monthlyBudgetCents!==undefined)updates.monthlyBudgetCents=body.monthlyBudgetCents;if(body.defaultMode!==undefined)updates.defaultMode=body.defaultMode;if(body.bringOwnKeys!==undefined)updates.bringOwnKeys=body.bringOwnKeys;await updateTenant(c.env.DB,t,updates);await writeAudit(c.env.DB,t,'tenant.update','tenant',t,undefined,c.get('requestId'));return c.json({success:true});});
tenantRoutes.post('/rotate-key',async c=>{const t=c.get('tenantId');const rawKey=`sk_${crypto.randomUUID().replace(/-/g,'')}`;await updateTenant(c.env.DB,t,{apiKeyHash:await hashApiKey(rawKey)});await writeAudit(c.env.DB,t,'tenant.rotate_key','tenant',t,undefined,c.get('requestId'));return c.json({api_key:rawKey});});
