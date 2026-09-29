'use client';

import { useEffect, useRef, useState } from 'react';

type LogEntry = {
  at: string;
  raw: string;
};

export default function OpsLogsPage() {
  const [token, setToken] = useState('');
  const [entries, setEntries] = useState<LogEntry[]>([]);
  const [status, setStatus] = useState<'idle' | 'starting' | 'live' | 'error'>('idle');
  const socketRef = useRef<WebSocket | null>(null);

  useEffect(() => () => socketRef.current?.close(), []);

  async function start() {
    if (!token.trim()) return;
    socketRef.current?.close();
    setEntries([]);
    setStatus('starting');

    try {
      const response = await fetch('/api/ops/logs?mode=tail', {
        headers: { Authorization: `Bearer ${token.trim()}` },
        cache: 'no-store',
      });
      const payload = await response.json();

      if (!response.ok || !payload?.tail?.url) {
        throw new Error(payload?.error ?? 'Could not start log tail');
      }

      const socket = new WebSocket(payload.tail.url);
      socketRef.current = socket;

      socket.onopen = () => setStatus('live');
      socket.onmessage = (event) => {
        const raw = typeof event.data === 'string' ? event.data : String(event.data);
        setEntries((current) => [
          ...current.slice(-499),
          { at: new Date().toISOString(), raw },
        ]);
      };
      socket.onerror = () => setStatus('error');
      socket.onclose = () => {
        if (socketRef.current === socket) setStatus('idle');
      };
    } catch (error) {
      setStatus('error');
      setEntries([{ at: new Date().toISOString(), raw: String(error) }]);
    }
  }

  function stop() {
    socketRef.current?.close();
    socketRef.current = null;
    setStatus('idle');
  }

  return (
    <main className="space-y-6">
      <div>
        <p className="text-xs font-medium uppercase tracking-[0.18em] text-muted-foreground">Internal</p>
        <h1 className="mt-2 text-2xl font-semibold">Live Worker Logs</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Private operator console for the Uden production Worker.
        </p>
      </div>

      <section className="rounded-2xl border border-border bg-card p-4 shadow-sm">
        <div className="flex flex-col gap-3 md:flex-row">
          <input
            type="password"
            value={token}
            onChange={(event) => setToken(event.target.value)}
            placeholder="Operator token"
            autoComplete="off"
            className="min-w-0 flex-1 rounded-xl border border-border bg-background px-4 py-3 text-sm outline-none"
          />
          <button
            onClick={start}
            disabled={status === 'starting' || !token.trim()}
            className="rounded-xl bg-foreground px-4 py-3 text-sm font-medium text-background disabled:opacity-50"
          >
            {status === 'starting' ? 'Connecting…' : 'Start tail'}
          </button>
          <button
            onClick={stop}
            disabled={status !== 'live'}
            className="rounded-xl border border-border px-4 py-3 text-sm font-medium disabled:opacity-50"
          >
            Stop
          </button>
        </div>
        <div className="mt-3 text-xs text-muted-foreground">
          Status: <span className="font-medium text-foreground">{status}</span>
        </div>
      </section>

      <section className="overflow-hidden rounded-2xl border border-border bg-black text-white shadow-sm">
        <div className="flex items-center justify-between border-b border-white/10 px-4 py-3 text-xs text-white/60">
          <span>ai-work-partner-engine</span>
          <span>{entries.length} events</span>
        </div>
        <pre className="max-h-[65vh] min-h-[320px] overflow-auto p-4 text-xs leading-5">
          {entries.length
            ? entries.map((entry, index) => (
                <div key={`${entry.at}-${index}`} className="whitespace-pre-wrap break-words">
                  <span className="text-white/40">{entry.at}</span>{' '}{entry.raw}
                </div>
              ))
            : 'No events yet.'}
        </pre>
      </section>
    </main>
  );
}
