import { sanitizeError } from './observability';
import type { HonoEnv } from '../types';

export type AlertSeverity = 'warning' | 'error' | 'critical';

export async function sendExternalAlert(env: HonoEnv['Bindings'], event: string, severity: AlertSeverity, fields: Record<string, unknown> = {}): Promise<void> {
  const url = env.ALERT_WEBHOOK_URL;
  if (!url) return;
  const payload = {
    source: 'uden-engine',
    event,
    severity,
    timestamp: new Date().toISOString(),
    ...Object.fromEntries(Object.entries(fields).map(([key, value]) => [key, typeof value === 'string' ? sanitizeError(value) : value])),
  };
  try {
    await fetch(url, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(payload) });
  } catch (error) {
    console.error(JSON.stringify({ event: 'external_alert_failed', error: sanitizeError(error) }));
  }
}
