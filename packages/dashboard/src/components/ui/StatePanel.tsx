import { AlertTriangle, Inbox, Loader2, RefreshCw } from 'lucide-react';

export function LoadingPanel({ label = 'Loading recorded state…' }: { label?: string }) {
  return <div className="glass-card border border-[var(--border-color)] p-8 flex items-center justify-center gap-3 text-sm text-[var(--text-secondary)]" role="status" aria-live="polite"><Loader2 size={16} className="animate-spin text-[var(--accent-primary)]"/>{label}</div>;
}

export function EmptyPanel({ title, detail, action }: { title: string; detail: string; action?: React.ReactNode }) {
  return <div className="glass-card border border-[var(--border-color)] p-8 md:p-10 text-center"><Inbox size={22} className="mx-auto text-[var(--text-muted)]"/><p className="font-medium text-[var(--text-primary)] mt-3">{title}</p><p className="text-sm text-[var(--text-secondary)] mt-2 max-w-md mx-auto leading-6">{detail}</p>{action&&<div className="mt-5">{action}</div>}</div>;
}

export function ErrorPanel({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return <div className="rounded-xl border border-[var(--status-danger)]/30 bg-[var(--status-danger)]/5 p-4" role="alert"><div className="flex items-start gap-3"><AlertTriangle size={17} className="text-[var(--status-danger)] mt-0.5"/><div className="min-w-0 flex-1"><p className="text-sm font-medium text-[var(--text-primary)]">We could not read the current state.</p><p className="text-xs text-[var(--text-secondary)] mt-1 leading-5">{message}</p>{onRetry&&<button type="button" onClick={onRetry} className="btn btn-secondary mt-3 text-xs"><RefreshCw size={13}/> Retry</button>}</div></div></div>;
}
