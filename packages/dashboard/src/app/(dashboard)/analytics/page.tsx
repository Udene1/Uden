'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useSession } from 'next-auth/react';
import { Activity, ArrowRight, BarChart3, Coins, Route, ShieldAlert, TimerReset } from 'lucide-react';
import { api, AnalyticsResponse, UsageSummary } from '@/lib/api';
import { formatCurrency, formatNumber } from '@/lib/utils';

type Daily = { date: string; cost_cents: number; task_count: number; tokens_in: number; tokens_out: number };

export default function AnalyticsPage() {
  const { data: session } = useSession();
  const apiKey = (session as any)?.apiKey;
  const [data, setData] = useState<AnalyticsResponse | null>(null);
  const [usage, setUsage] = useState<UsageSummary | null>(null);
  const [daily, setDaily] = useState<Daily[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!apiKey) return;
    Promise.all([api.getAnalytics(apiKey), api.getUsageSummary(apiKey), api.getDailyUsage(apiKey)])
      .then(([analytics, summary, series]) => { setData(analytics); setUsage(summary); setDaily(series.daily || []); })
      .catch((e) => setError(e instanceof Error ? e.message : 'Failed to load analytics'))
      .finally(() => setLoading(false));
  }, [apiKey]);

  const maxCost = useMemo(() => Math.max(...daily.map((d) => d.cost_cents), 1), [daily]);
  const recentDaily = daily.slice(-14);

  if (loading) return <div className="surface p-8 text-sm text-[var(--text-secondary)]">Loading execution analytics…</div>;
  if (error) return <div className="surface p-6 border border-[var(--status-danger)]/30 text-sm text-[var(--status-danger)]">{error}</div>;
  if (!data) return null;

  const { analytics, savings } = data;
  const completed = Number(analytics.totals.completed_graphs || 0);
  const failed = Number(analytics.totals.failed_graphs || 0);
  const totalGraphs = Number(analytics.totals.graphs || 0);
  const completionRate = totalGraphs ? Math.round((completed / totalGraphs) * 100) : 0;

  return (
    <div className="space-y-7 pb-10">
      <header className="page-header">
        <div>
          <p className="flex items-center gap-2 text-sm text-[var(--accent-primary)]"><BarChart3 size={15} /> System telemetry</p>
          <h1 className="mt-2 text-3xl font-semibold text-[var(--text-primary)]">Analytics</h1>
          <p className="mt-1 max-w-2xl text-sm leading-6 text-[var(--text-secondary)]">Observed execution volume, cost, routing, quality and failure signals. These are recorded measurements, not inferred performance claims.</p>
        </div>
        <Link href="/graphs" className="btn btn-secondary inline-flex items-center gap-2">Execution records <ArrowRight size={14} /></Link>
      </header>

      <section className="surface p-4 md:p-5" aria-label="Execution overview">
        <div className="grid grid-cols-2 gap-x-5 gap-y-5 md:grid-cols-4">
          <Metric label="Recorded graphs" value={formatNumber(totalGraphs)} />
          <Metric label="Completed" value={formatNumber(completed)} />
          <Metric label="Completion rate" value={`${completionRate}%`} />
          <Metric label="Failed" value={formatNumber(failed)} />
        </div>
      </section>

      <section className="surface p-4 md:p-6" aria-labelledby="usage-trend">
        <div className="flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
          <div><h2 id="usage-trend" className="text-lg font-semibold text-[var(--text-primary)]">Execution over time</h2><p className="text-xs text-[var(--text-secondary)] mt-1">Daily recorded task volume and actual cost.</p></div>
          <div className="text-xs text-[var(--text-muted)]">{recentDaily.length ? `Last ${recentDaily.length} recorded days` : 'No daily records yet'}</div>
        </div>
        {recentDaily.length ? <div className="mt-6 grid gap-2 overflow-x-auto" style={{ gridTemplateColumns: `repeat(${recentDaily.length}, minmax(2.5rem, 1fr))` }} aria-label="Daily execution cost chart">
          {recentDaily.map((day) => {
            const height = Math.max(6, Math.round((day.cost_cents / maxCost) * 100));
            return <div key={day.date} className="group min-w-0">
              <div className="flex h-36 items-end justify-center rounded-lg bg-[var(--bg-tertiary)] px-1">
                <div className="w-full max-w-7 rounded-t-md bg-[var(--accent-primary)]/70 transition-all group-hover:bg-[var(--accent-primary)]" style={{ height: `${height}%` }} title={`${day.date}: ${formatCurrency(day.cost_cents)} · ${day.task_count} tasks`} />
              </div>
              <p className="mt-2 truncate text-center text-[9px] text-[var(--text-muted)]">{day.date.slice(5)}</p>
              <p className="truncate text-center text-[10px] font-medium text-[var(--text-secondary)]">{day.task_count}</p>
            </div>;
          })}
        </div> : <Empty />}
      </section>

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
        <Panel icon={<Coins size={17} />} title="Cost & routing">
          <Row label="Actual recorded cost" value={formatCurrency(savings.actualCostCents)} />
          <Row label="Primary-attempt cost" value={formatCurrency(savings.primaryAttemptCostCents)} />
          <Row label="Escalation cost" value={formatCurrency(savings.escalationCostCents)} />
          <Row label="Measured routing difference" value={formatCurrency(savings.routingSavingsCents)} />
          <Row label="Budget used" value={usage ? `${usage.budgetUsedPercent.toFixed(1)}%` : '—'} />
          <Row label="Estimated savings" value={usage ? formatCurrency(usage.savingsEstimateCents) : '—'} />
        </Panel>

        <Panel icon={<TimerReset size={17} />} title="Execution health">
          <Row label="Total tasks" value={usage ? formatNumber(usage.totalTasks) : '—'} />
          <Row label="Completed tasks" value={usage ? formatNumber(usage.completedTasks) : '—'} />
          <Row label="Failed tasks" value={usage ? formatNumber(usage.failedTasks) : '—'} />
          <Row label="Escalations" value={usage ? formatNumber(usage.escalationCount) : '—'} />
          <Row label="Escalation rate" value={usage ? `${(usage.escalationRate * 100).toFixed(1)}%` : '—'} />
          <Row label="Average quality" value={usage ? usage.averageQualityScore.toFixed(1) : '—'} />
        </Panel>

        <Panel icon={<Route size={17} />} title="Model performance">
          {analytics.byModel.length ? <div className="space-y-3">{analytics.byModel.map((x: any) => <div key={x.model} className="border-b border-[var(--border-subtle)] pb-3 last:border-0 last:pb-0"><div className="flex items-center justify-between gap-4"><span className="min-w-0 truncate font-mono text-xs text-[var(--text-primary)]">{x.model}</span><span className="text-xs text-[var(--text-muted)]">{x.attempts} attempts</span></div><div className="mt-1 text-xs text-[var(--text-secondary)]">{formatCurrency(Number(x.cost_cents || 0))} recorded cost · quality {Number(x.quality_score || 0).toFixed(1)}</div></div>)}</div> : <Empty />}
        </Panel>

        <Panel icon={<ShieldAlert size={17} />} title="Quality by domain">
          {analytics.byDomain.length ? <div className="space-y-3">{analytics.byDomain.map((x: any) => <div key={x.domain} className="flex items-center justify-between gap-4 border-b border-[var(--border-subtle)] pb-3 last:border-0 last:pb-0"><span className="truncate text-sm text-[var(--text-primary)]">{x.domain}</span><span className="shrink-0 text-xs text-[var(--text-secondary)]">{Number(x.quality_score || 0).toFixed(1)} quality · {formatCurrency(Number(x.cost_cents || 0))}</span></div>)}</div> : <Empty />}
        </Panel>
      </div>

      <section className="surface p-4 md:p-6" aria-labelledby="recent-graphs">
        <div className="flex items-center justify-between gap-3"><div><h2 id="recent-graphs" className="text-lg font-semibold text-[var(--text-primary)]">Recent execution records</h2><p className="mt-1 text-xs text-[var(--text-secondary)]">Open the durable graph when you need node-level evidence, attempts or recovery.</p></div><Activity size={17} className="text-[var(--accent-primary)]" /></div>
        <div className="mt-4 divide-y divide-[var(--border-subtle)]">{analytics.recentGraphs.length ? analytics.recentGraphs.map((x: any) => <Link key={x.graph_id} href="/graphs" className="flex items-center justify-between gap-4 py-3 group"><div className="min-w-0"><p className="truncate text-sm text-[var(--text-primary)] group-hover:text-[var(--accent-primary)]">{x.goal}</p><p className="mt-1 text-xs text-[var(--text-muted)]">{x.node_count} nodes · {formatCurrency(Number(x.cost_cents || 0))} · quality {Number(x.quality_score || 0).toFixed(1)}</p></div><span className="shrink-0 text-xs text-[var(--text-secondary)]">{String(x.status || 'unknown').replace(/[-_]/g, ' ')}</span></Link>) : <Empty />}</div>
      </section>
    </div>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return <div><p className="text-[10px] font-semibold uppercase tracking-[.12em] text-[var(--text-muted)]">{label}</p><p className="mt-1 text-2xl font-semibold tracking-tight text-[var(--text-primary)]">{value}</p></div>;
}
function Panel({ icon, title, children }: { icon: React.ReactNode; title: string; children: React.ReactNode }) {
  return <section className="surface p-4 md:p-6"><div className="mb-5 flex items-center gap-2"><span className="text-[var(--accent-primary)]">{icon}</span><h2 className="text-base font-semibold text-[var(--text-primary)]">{title}</h2></div><div className="space-y-3 text-sm">{children}</div></section>;
}
function Row({ label, value }: { label: string; value: string }) {
  return <div className="flex items-center justify-between gap-4 border-b border-[var(--border-subtle)] pb-3 last:border-0 last:pb-0"><span className="text-[var(--text-secondary)]">{label}</span><span className="font-medium text-[var(--text-primary)]">{value}</span></div>;
}
function Empty() { return <div className="py-4 text-sm text-[var(--text-muted)]">No recorded data yet.</div>; }
