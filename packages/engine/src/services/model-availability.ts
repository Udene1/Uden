import type { Env } from '../types';

export type ModelAvailabilityState = 'unknown' | 'healthy' | 'unavailable' | 'cooldown';

export interface ModelAvailability {
  tenantId: string;
  modelReference: string;
  provider: string;
  state: ModelAvailabilityState;
  failureCode?: string;
  lastObservedAt?: string;
  cooldownUntil?: string;
  consecutiveFailures: number;
  lastSuccessAt?: string;
}

const COOLDOWN_SECONDS = 60;

function providerFor(modelReference: string): string {
  const reference = modelReference.startsWith('nvidia/')
    ? modelReference.slice('nvidia/'.length)
    : modelReference.startsWith('agentrouter/')
    ? modelReference.slice('agentrouter/'.length)
    : modelReference;
  if (modelReference.startsWith('nvidia/')) return 'nvidia';
  if (/^(openai\/|gpt|o3|o4)/i.test(reference)) return modelReference.startsWith('agentrouter/') ? 'agentrouter/openai' : 'openai';
  if (/^(anthropic\/|claude)/i.test(reference)) return modelReference.startsWith('agentrouter/') ? 'agentrouter/anthropic' : 'anthropic';
  if (/^(google\/|gemini)/i.test(reference)) return modelReference.startsWith('agentrouter/') ? 'agentrouter/google' : 'google';
  if (/^deepseek/i.test(reference)) return modelReference.startsWith('agentrouter/') ? 'agentrouter/deepseek' : 'deepseek';
  return modelReference.startsWith('agentrouter/') ? 'agentrouter' : 'unknown';
}

function configured(env: Env, modelReference: string): boolean {
  if (modelReference.startsWith('nvidia/')) return Boolean(env.NVIDIA_API_KEY);
  if (modelReference.startsWith('agentrouter/')) return Boolean(env.AGENTROUTER_API_KEY);
  const model = modelReference.toLowerCase();
  if (model.startsWith('gpt') || model.startsWith('o3') || model.startsWith('o4') || model.startsWith('openai/')) return Boolean(env.OPENAI_API_KEY);
  if (model.startsWith('claude') || model.startsWith('anthropic/')) return Boolean(env.ANTHROPIC_API_KEY);
  if (model.startsWith('gemini') || model.startsWith('google/')) return Boolean(env.GEMINI_API_KEY || env.GOOGLE_AI_API_KEY);
  if (model.startsWith('deepseek')) return Boolean(env.DEEPSEEK_API_KEY);
  return false;
}

export async function getModelAvailability(db: D1Database, tenantId: string, modelReference: string): Promise<ModelAvailability | null> {
  const row = await db.prepare(
    'SELECT tenant_id, model_reference, provider, state, failure_code, last_observed_at, cooldown_until, consecutive_failures, last_success_at FROM model_availability WHERE tenant_id = ? AND model_reference = ?'
  ).bind(tenantId, modelReference).first<any>();
  if (!row) return null;
  return {
    tenantId: row.tenant_id,
    modelReference: row.model_reference,
    provider: row.provider,
    state: row.state,
    failureCode: row.failure_code || undefined,
    lastObservedAt: row.last_observed_at || undefined,
    cooldownUntil: row.cooldown_until || undefined,
    consecutiveFailures: row.consecutive_failures || 0,
    lastSuccessAt: row.last_success_at || undefined,
  };
}

export async function markModelHealthy(db: D1Database, tenantId: string, modelReference: string): Promise<void> {
  const now = new Date().toISOString();
  await db.prepare(
    `INSERT INTO model_availability (tenant_id, model_reference, provider, state, last_observed_at, cooldown_until, consecutive_failures, last_success_at)
     VALUES (?, ?, ?, 'healthy', ?, NULL, 0, ?)
     ON CONFLICT(tenant_id, model_reference) DO UPDATE SET
       provider=excluded.provider, state='healthy', last_observed_at=excluded.last_observed_at,
       cooldown_until=NULL, consecutive_failures=0, last_success_at=excluded.last_success_at`
  ).bind(tenantId, modelReference, providerFor(modelReference), now, now).run();
}

export async function markModelUnavailable(db: D1Database, tenantId: string, modelReference: string, failureCode: string): Promise<void> {
  const now = new Date().toISOString();
  await db.prepare(
    `INSERT INTO model_availability (tenant_id, model_reference, provider, state, failure_code, last_observed_at, cooldown_until, consecutive_failures)
     VALUES (?, ?, ?, 'unavailable', ?, ?, NULL, 1)
     ON CONFLICT(tenant_id, model_reference) DO UPDATE SET
       provider=excluded.provider, state='unavailable', failure_code=excluded.failure_code,
       last_observed_at=excluded.last_observed_at, cooldown_until=NULL,
       consecutive_failures=model_availability.consecutive_failures + 1`
  ).bind(tenantId, modelReference, providerFor(modelReference), failureCode, now).run();
}

export async function markModelCooldown(db: D1Database, tenantId: string, modelReference: string, failureCode: string, seconds = COOLDOWN_SECONDS): Promise<void> {
  const now = new Date();
  const cooldownUntil = new Date(now.getTime() + seconds * 1000).toISOString();
  await db.prepare(
    `INSERT INTO model_availability (tenant_id, model_reference, provider, state, failure_code, last_observed_at, cooldown_until, consecutive_failures)
     VALUES (?, ?, ?, 'cooldown', ?, ?, ?, 1)
     ON CONFLICT(tenant_id, model_reference) DO UPDATE SET
       provider=excluded.provider, state='cooldown', failure_code=excluded.failure_code,
       last_observed_at=excluded.last_observed_at, cooldown_until=excluded.cooldown_until,
       consecutive_failures=model_availability.consecutive_failures + 1`
  ).bind(tenantId, modelReference, providerFor(modelReference), failureCode, now.toISOString(), cooldownUntil).run();
}

export async function resolveModelCandidates(
  env: Env,
  tenantId: string,
  db: D1Database,
  candidates: string[],
): Promise<string[]> {
  const unique = candidates.filter((model, index) => Boolean(model) && candidates.indexOf(model) === index);
  const resolved: string[] = [];
  for (const modelReference of unique) {
    if (!configured(env, modelReference)) {
      await markModelUnavailable(db, tenantId, modelReference, 'CREDENTIAL_MISSING');
      continue;
    }
    const availability = await getModelAvailability(db, tenantId, modelReference);
    if (availability?.state === 'unavailable') continue;
    if (availability?.state === 'cooldown' && availability.cooldownUntil && availability.cooldownUntil > new Date().toISOString()) continue;
    resolved.push(modelReference);
  }
  return resolved;
}

export function availabilityFailureKind(code: string): 'unavailable' | 'cooldown' | 'ambiguous' {
  if (code === 'PROVIDER_RATE_LIMITED' || code === 'PROVIDER_UNAVAILABLE' || code === 'PROVIDER_TRANSIENT_FAILURE') return 'cooldown';
  if (code === 'PROVIDER_EXTERNAL_OUTCOME_UNKNOWN' || code === 'PROVIDER_RECONCILIATION_REQUIRED') return 'ambiguous';
  return 'unavailable';
}
