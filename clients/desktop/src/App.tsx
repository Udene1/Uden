import { useCallback, useEffect, useMemo, useState } from 'react';
import { CheckCircle2, Clock3, FolderOpen, GitBranch, LogOut, Play, RefreshCw, Settings, ShieldCheck, Sparkles, XCircle } from 'lucide-react';
import { CLIENT_CAPABILITIES } from '@ai-work-partner/shared';
import { defaultEngineUrl, EngineApi, Task, TaskStatus } from './engine-api';
import { addWorkspace, loadWorkspaceState, removeWorkspace, selectWorkspace } from './workspace-manager';

const URL_KEY = 'uden.engine.url';
const KEY_KEY = 'uden.engine.api_key';
const activeStatuses: TaskStatus[] = ['pending', 'classifying', 'routing', 'processing', 'quality-check', 'escalating', 'approved', 'awaiting-approval'];

function statusLabel(status: TaskStatus) { return status.replace(/-/g, ' '); }
function money(cents: number) { return `$${(cents / 100).toFixed(2)}`; }

function Connection({ onConnected }: { onConnected: (api: EngineApi, url: string) => void }) {
  const [url, setUrl] = useState(defaultEngineUrl());
  const [key, setKey] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const connect = async () => {
    setBusy(true); setError('');
    try {
      const api = new EngineApi(url.trim(), key.trim());
      await api.getTenant();
      localStorage.setItem(URL_KEY, url.trim());
      localStorage.setItem(KEY_KEY, key.trim());
      onConnected(api, url.trim());
    } catch (e) { setError(e instanceof Error ? e.message : 'Unable to connect.'); }
    finally { setBusy(false); }
  };
  return <main className="connection"><div className="connection-card">
    <Sparkles size={24} className="accent" /><div className="eyebrow">UDEN DESKTOP</div>
    <h1>Connect your work engine.</h1>
    <p>The desktop client connects to the real Uden API. Credentials are entered by the user and are not bundled into the application.</p>
    <label>ENGINE URL<input value={url} onChange={e => setUrl(e.target.value)} autoCapitalize="none" /></label>
    <label>API KEY<input value={key} onChange={e => setKey(e.target.value)} type="password" /></label>
    {error && <div className="error"><XCircle size={17} />{error}</div>}
    <button className="primary" disabled={!url.trim() || !key.trim() || busy} onClick={connect}>{busy ? 'Connecting…' : 'Connect to Uden'}</button>
  </div></main>;
}

function TaskRow({ task, onSelect }: { task: Task; onSelect: () => void }) {
  return <button className="task-row" onClick={onSelect}>
    <span className={`dot ${task.status}`} />
    <span className="task-copy"><strong>{task.prompt}</strong><small>{statusLabel(task.status)} · {new Date(task.createdAt).toLocaleString()}</small></span>
    <span className="task-meta">{money(task.totalCostCents)}</span>
  </button>;
}

function WorkspacePanel() {
  const [workspaces, setWorkspaces] = useState<string[]>([]);
  const [selected, setSelected] = useState<string | null>(null);
  const [path, setPath] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [ready, setReady] = useState(false);

  const refresh = useCallback(async () => {
    try {
      const state = await loadWorkspaceState();
      setWorkspaces(state.workspaces);
      setSelected(state.selected);
      setError('');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'The desktop filesystem bridge is unavailable.');
    } finally { setReady(true); }
  }, []);

  useEffect(() => { void refresh(); }, [refresh]);

  const add = async () => {
    setBusy(true); setError('');
    try {
      const state = await addWorkspace(path);
      setWorkspaces(state.workspaces); setSelected(state.selected); setPath('');
    } catch (e) { setError(e instanceof Error ? e.message : 'Unable to register workspace.'); }
    finally { setBusy(false); }
  };

  const remove = async () => {
    if (!selected) return;
    setBusy(true); setError('');
    try {
      const state = await removeWorkspace(selected);
      setWorkspaces(state.workspaces); setSelected(state.selected);
    } catch (e) { setError(e instanceof Error ? e.message : 'Unable to unregister workspace.'); }
    finally { setBusy(false); }
  };

  const choose = (value: string | null) => {
    setSelected(value);
    selectWorkspace(value);
  };

  return <section className="panel workspace-panel">
    <div className="panel-head"><div><h2>Local workspace</h2><small>Registered through the Tauri filesystem boundary</small></div><button className="ghost icon-button" onClick={() => void refresh()} disabled={!ready || busy}><RefreshCw size={15} /></button></div>
    {error && <div className="error inline-error"><XCircle size={16} />{error}</div>}
    {!error || workspaces.length > 0 ? <>
      <div className="workspace-picker">
        <select value={selected ?? ''} onChange={e => choose(e.target.value || null)} disabled={!workspaces.length || busy}>
          <option value="">No workspace selected</option>
          {workspaces.map(workspace => <option key={workspace} value={workspace}>{workspace}</option>)}
        </select>
        <button className="ghost" onClick={() => void remove()} disabled={!selected || busy}>Unregister</button>
      </div>
      <div className="workspace-add"><input value={path} onChange={e => setPath(e.target.value)} placeholder="/absolute/path/to/project" onKeyDown={e => { if (e.key === 'Enter') void add(); }} /><button className="primary compact" disabled={!path.trim() || busy} onClick={() => void add()}>{busy ? 'Saving…' : 'Register workspace'}</button></div>
      <p className="panel-note">Uden will only treat a registered path as a local workspace. Registration does not grant arbitrary command execution; commands remain subject to the desktop capability and approval boundary.</p>
    </> : <div className="empty"><FolderOpen size={18} /><span>Desktop filesystem bridge unavailable. Run the packaged Tauri client to manage local workspaces.</span></div>}
  </section>;
}

function Detail({ task, onClose, onApprove, approving }: { task: Task; onClose: () => void; onApprove: () => void; approving: boolean }) {
  return <div className="detail-panel">
    <div className="detail-head"><div><div className="eyebrow">EXECUTION</div><h2>{task.prompt}</h2></div><button className="ghost" onClick={onClose}>Close</button></div>
    <div className="stats"><div><small>STATUS</small><strong>{statusLabel(task.status)}</strong></div><div><small>MODEL</small><strong>{task.modelUsed ?? 'Not recorded'}</strong></div><div><small>COST</small><strong>{money(task.totalCostCents)}</strong></div><div><small>QUALITY</small><strong>{task.qualityScore == null ? 'Not recorded' : `${task.qualityScore}%`}</strong></div></div>
    {task.status === 'awaiting-approval' && <div className="approval"><ShieldCheck size={18} /><div><strong>Your decision is required.</strong><span>This boundary is enforced by the engine; approving here sends the real approval request.</span></div><button className="primary compact" disabled={approving} onClick={onApprove}>{approving ? 'Approving…' : 'Approve work'}</button></div>}
    <section className="output"><div className="eyebrow">RECORDED OUTPUT</div><pre>{task.output ?? 'No output has been recorded for this execution.'}</pre><p>Output presence does not independently prove correctness. Review the execution evidence and verification state before treating the result as trusted.</p></section>
  </div>;
}

export default function App() {
  const [api, setApi] = useState<EngineApi | null>(null);
  const [engineUrl, setEngineUrl] = useState('');
  const [tasks, setTasks] = useState<Task[]>([]);
  const [selected, setSelected] = useState<Task | null>(null);
  const [prompt, setPrompt] = useState('');
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');
  const capabilities = CLIENT_CAPABILITIES.desktop;

  const load = useCallback(async (client: EngineApi, manual = false) => {
    if (manual) setRefreshing(true);
    try { const next = await client.getTasks(); setTasks(next); setSelected(current => current ? next.find(t => t.id === current.id) ?? current : null); setError(''); }
    catch (e) { setError(e instanceof Error ? e.message : 'Unable to load work.'); }
    finally { if (manual) setRefreshing(false); }
  }, []);

  useEffect(() => {
    const url = localStorage.getItem(URL_KEY); const key = localStorage.getItem(KEY_KEY);
    if (!url || !key) { setLoading(false); return; }
    const client = new EngineApi(url, key);
    client.getTenant().then(() => { setApi(client); setEngineUrl(url); return load(client); }).catch(e => setError(e instanceof Error ? e.message : 'Saved connection is unavailable.')).finally(() => setLoading(false));
  }, [load]);

  useEffect(() => {
    if (!api || !tasks.some(t => activeStatuses.includes(t.status))) return;
    const timer = window.setInterval(() => void load(api), 3000);
    return () => window.clearInterval(timer);
  }, [api, tasks, load]);

  const approvals = useMemo(() => tasks.filter(t => t.status === 'awaiting-approval'), [tasks]);
  const active = useMemo(() => tasks.filter(t => activeStatuses.includes(t.status)), [tasks]);
  const results = useMemo(() => tasks.filter(t => ['completed', 'failed', 'rejected'].includes(t.status)), [tasks]);

  const create = async () => {
    if (!api || !prompt.trim()) return;
    setBusy(true); setError('');
    try { const task = await api.createTask(prompt.trim()); setPrompt(''); setTasks(current => [task, ...current.filter(t => t.id !== task.id)]); setSelected(task); }
    catch (e) { setError(e instanceof Error ? e.message : 'Unable to start work.'); }
    finally { setBusy(false); }
  };
  const approve = async () => {
    if (!api || !selected) return;
    setBusy(true);
    try { const updated = await api.approveTask(selected.id); setTasks(current => current.map(t => t.id === updated.id ? updated : t)); setSelected(updated); }
    catch (e) { setError(e instanceof Error ? e.message : 'Unable to approve work.'); }
    finally { setBusy(false); }
  };
  const disconnect = () => { localStorage.removeItem(URL_KEY); localStorage.removeItem(KEY_KEY); setApi(null); setTasks([]); setSelected(null); setEngineUrl(''); };

  if (loading) return <main className="center"><span>Loading Uden…</span></main>;
  if (!api) return <Connection onConnected={(client, url) => { setApi(client); setEngineUrl(url); void load(client); }} />;

  return <main className="app-shell">
    <aside className="sidebar"><div className="brand"><Sparkles size={18} /> Uden</div><nav><button className="nav-active">Workspace</button><button>Projects</button><button>Graphs</button><button>Approvals {approvals.length > 0 && <b>{approvals.length}</b>}</button></nav><div className="sidebar-bottom"><small>{capabilities.length} desktop capabilities</small><button className="ghost" onClick={disconnect}><LogOut size={15} /> Disconnect</button></div></aside>
    <section className="workspace"><header><div><div className="eyebrow accent">WORKSPACE</div><h1>Work locally. Execute deliberately.</h1><p>{engineUrl}</p></div><button className="ghost" onClick={() => void load(api, true)}><RefreshCw size={15} /> {refreshing ? 'Refreshing…' : 'Refresh'}</button></header>
      {error && <div className="error banner"><XCircle size={17} />{error}</div>}
      <section className="composer"><div className="eyebrow">NEW WORK</div><textarea value={prompt} onChange={e => setPrompt(e.target.value)} placeholder="What should Uden work on?" /><button className="primary" disabled={!prompt.trim() || busy} onClick={create}><Play size={15} />{busy ? 'Working…' : 'Start work'}</button></section>
      <WorkspacePanel />
      <div className="grid"><section className="panel"><div className="panel-head"><h2>Active work</h2><span>{active.length}</span></div>{active.length ? active.map(t => <TaskRow key={t.id} task={t} onSelect={() => setSelected(t)} />) : <Empty icon={<Clock3 size={18} />} text="No recorded work is running." />}</section>
      <section className="panel"><div className="panel-head"><h2>Approvals</h2><span>{approvals.length}</span></div>{approvals.length ? approvals.map(t => <TaskRow key={t.id} task={t} onSelect={() => setSelected(t)} />) : <Empty icon={<ShieldCheck size={18} />} text="Nothing is waiting for your decision." />}</section></div>
      <section className="panel"><div className="panel-head"><h2>Recent results</h2><span>{results.length}</span></div>{results.slice(0, 8).map(t => <TaskRow key={t.id} task={t} onSelect={() => setSelected(t)} />)}{!results.length && <Empty icon={<CheckCircle2 size={18} />} text="Completed and failed executions will appear here." />}</section>
      <div className="capability-strip"><FolderOpen size={17} /><span>Registered local workspaces</span><GitBranch size={17} /><span>Git workflow</span><Play size={17} /><span>Fenced runtime</span><Settings size={16} className="push" /></div>
    </section>
    {selected && <Detail task={selected} onClose={() => setSelected(null)} onApprove={() => void approve()} approving={busy} />}
  </main>;
}

function Empty({ icon, text }: { icon: React.ReactNode; text: string }) { return <div className="empty">{icon}<span>{text}</span></div>; }
