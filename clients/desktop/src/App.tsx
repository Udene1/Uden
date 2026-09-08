import { FolderOpen, GitBranch, Monitor, Play, Plus, Settings, Sparkles } from 'lucide-react';
import { CLIENT_CAPABILITIES } from '@ai-work-partner/shared';

export default function App() {
  const capabilities = CLIENT_CAPABILITIES.desktop;
  return (
    <main className="min-h-screen bg-slate-950 text-slate-100 flex">
      <aside className="w-64 border-r border-slate-800 p-5 flex flex-col">
        <div className="flex items-center gap-2 font-semibold"><Sparkles size={18} /> Uden</div>
        <nav className="mt-8 space-y-2 text-sm">
          <button className="w-full text-left rounded-lg bg-slate-800 px-3 py-2">Workspace</button>
          <button className="w-full text-left rounded-lg px-3 py-2 text-slate-400">Projects</button>
          <button className="w-full text-left rounded-lg px-3 py-2 text-slate-400">Graphs</button>
          <button className="w-full text-left rounded-lg px-3 py-2 text-slate-400">Approvals</button>
        </nav>
        <div className="mt-auto text-xs text-slate-500">Desktop capabilities: {capabilities.length}</div>
      </aside>
      <section className="flex-1 p-8 max-w-6xl">
        <header className="flex justify-between items-start gap-4">
          <div><p className="text-sm text-sky-400">Uden desktop</p><h1 className="text-3xl font-semibold mt-1">Work locally, execute deliberately.</h1><p className="text-slate-400 mt-2">The desktop client will expose the deepest project and local-runtime capabilities while sharing Uden's execution model.</p></div>
          <button className="rounded-lg bg-sky-500 text-slate-950 px-4 py-2 flex items-center gap-2"><Plus size={16} /> New work</button>
        </header>
        <div className="grid md:grid-cols-3 gap-4 mt-8">
          <article className="border border-slate-800 rounded-xl p-5"><FolderOpen size={19} /><h2 className="font-medium mt-4">Local projects</h2><p className="text-sm text-slate-400 mt-1">Connect a real local workspace when the desktop bridge is available.</p></article>
          <article className="border border-slate-800 rounded-xl p-5"><GitBranch size={19} /><h2 className="font-medium mt-4">Git workflow</h2><p className="text-sm text-slate-400 mt-1">Inspect and change repositories through explicit desktop capabilities.</p></article>
          <article className="border border-slate-800 rounded-xl p-5"><Play size={19} /><h2 className="font-medium mt-4">Runtime</h2><p className="text-sm text-slate-400 mt-1">Run project commands only through the fenced execution boundary.</p></article>
        </div>
        <div className="mt-6 border border-slate-800 rounded-xl p-5 flex items-center gap-3 text-sm text-slate-400"><Monitor size={18} /><span>Execution state will come from the same Uden API and durable graph state as web and mobile.</span><Settings size={16} className="ml-auto" /></div>
      </section>
    </main>
  );
}
