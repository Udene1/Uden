'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { Command, Search, ArrowRight, CornerDownLeft } from 'lucide-react';
import { usePathname, useRouter } from 'next/navigation';

const actions = [
  { id: 'new', label: 'Start new work', hint: 'Create a durable task', href: '/tasks/new', keys: 'new work' },
  { id: 'tasks', label: 'Find work', hint: 'Open task history', href: '/tasks', keys: 'tasks history work' },
  { id: 'graphs', label: 'Execution graphs', hint: 'Inspect recorded runs', href: '/graphs', keys: 'graphs execution runs' },
  { id: 'projects', label: 'Projects', hint: 'Open project workspace', href: '/projects', keys: 'projects' },
  { id: 'analytics', label: 'Analytics', hint: 'Review usage and routing', href: '/analytics', keys: 'analytics usage cost' },
  { id: 'settings', label: 'Settings', hint: 'Workspace policy and credentials', href: '/settings', keys: 'settings policy api key' },
];

export default function CommandPalette() {
  const router = useRouter(); const pathname = usePathname(); const input = useRef<HTMLInputElement>(null);
  const [open, setOpen] = useState(false); const [query, setQuery] = useState(''); const [selected, setSelected] = useState(0);
  const filtered = useMemo(() => { const q=query.trim().toLowerCase(); return q ? actions.filter(a=>`${a.label} ${a.hint} ${a.keys}`.toLowerCase().includes(q)) : actions; }, [query]);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      const command = event.metaKey || event.ctrlKey;
      if ((command && event.key.toLowerCase()==='k') || (!command && event.key==='/')) {
        const target=event.target as HTMLElement|null; if(target?.tagName==='INPUT'||target?.tagName==='TEXTAREA'||target?.isContentEditable)return;
        event.preventDefault(); setOpen(true); setQuery('');
      }
      if(event.key==='Escape'&&open){event.preventDefault();setOpen(false);}
    };
    const onCommand=()=>{setOpen(true);setQuery('');};
    window.addEventListener('keydown',onKeyDown); window.addEventListener('uden:command',onCommand);
    return()=>{window.removeEventListener('keydown',onKeyDown);window.removeEventListener('uden:command',onCommand);};
  },[open]);
  useEffect(()=>{if(open)window.setTimeout(()=>input.current?.focus(),0);},[open]);
  useEffect(()=>setSelected(0),[query]);
  function run(index=selected){const action=filtered[index];if(!action)return;setOpen(false);router.push(action.href);}
  if(!open)return null;
  return <div className="fixed inset-0 z-[100] flex items-start justify-center bg-black/40 px-4 pt-[12vh] backdrop-blur-sm" role="dialog" aria-modal="true" aria-label="Uden command palette" onMouseDown={e=>{if(e.target===e.currentTarget)setOpen(false)}}>
    <div className="w-full max-w-xl overflow-hidden rounded-2xl border border-[var(--border-color)] bg-[var(--bg-card)] shadow-2xl" onMouseDown={e=>e.stopPropagation()}>
      <div className="flex items-center gap-3 border-b border-[var(--border-color)] px-4 py-3"><Search size={17} className="text-[var(--text-muted)]"/><input ref={input} value={query} onChange={e=>setQuery(e.target.value)} onKeyDown={e=>{if(e.key==='ArrowDown'){e.preventDefault();setSelected(v=>Math.min(v+1,Math.max(filtered.length-1,0)));}else if(e.key==='ArrowUp'){e.preventDefault();setSelected(v=>Math.max(v-1,0));}else if(e.key==='Enter'){e.preventDefault();run();}}} placeholder="Search workspace actions…" className="min-w-0 flex-1 bg-transparent text-sm text-[var(--text-primary)] outline-none placeholder:text-[var(--text-muted)]"/><kbd className="hidden sm:inline-flex items-center gap-1 rounded-md border border-[var(--border-color)] px-1.5 py-1 text-[10px] text-[var(--text-muted)]"><Command size={10}/>K</kbd></div>
      <div className="max-h-[55vh] overflow-y-auto p-2" role="listbox" aria-label="Workspace actions">{filtered.length===0?<div className="px-4 py-10 text-center text-sm text-[var(--text-muted)]">No workspace action matches “{query}”.</div>:filtered.map((action,index)=><button key={action.id} type="button" role="option" aria-selected={index===selected} onMouseEnter={()=>setSelected(index)} onClick={()=>run(index)} className={`flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left ${index===selected?'bg-[var(--accent-primary)]/10':'hover:bg-[var(--bg-hover)]'}`}><span className={`flex h-9 w-9 items-center justify-center rounded-lg border ${index===selected?'border-[var(--accent-primary)]/40 text-[var(--accent-primary)]':'border-[var(--border-color)] text-[var(--text-muted)]'}`}><ArrowRight size={15}/></span><span className="min-w-0 flex-1"><span className="block text-sm font-medium text-[var(--text-primary)]">{action.label}</span><span className="block text-xs text-[var(--text-muted)] mt-0.5">{action.hint}</span></span>{index===selected&&<CornerDownLeft size={14} className="text-[var(--text-muted)]"/>}</button>)}</div>
      <div className="flex items-center gap-4 border-t border-[var(--border-color)] px-4 py-2 text-[10px] text-[var(--text-muted)]"><span>↑↓ navigate</span><span>Enter open</span><span>Esc close</span><span className="ml-auto">{pathname.replace('/','')||'workspace'}</span></div>
    </div>
  </div>;
}
