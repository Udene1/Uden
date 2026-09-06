'use client';
import { useCallback, useEffect, useState } from 'react';
import TaskGraphView from '@/components/graph/TaskGraphView';
import { getGraph,getGraphAttempts,getGraphs,resumeGraph } from '@/lib/graph-api';

export default function GraphsPage(){
 const [graphs,setGraphs]=useState<any[]>([]); const [selected,setSelected]=useState<any>(null); const [attempts,setAttempts]=useState<any[]>([]); const [loading,setLoading]=useState(true); const [error,setError]=useState(''); const [resuming,setResuming]=useState(false);
 const selectGraph=useCallback(async(id:string)=>{const [g,a]=await Promise.all([getGraph(id),getGraphAttempts(id)]);setSelected(g.graph);setAttempts(a.attempts||[]);},[]);
 const refresh=useCallback(async()=>{setError('');try{const r=await getGraphs();setGraphs(r.graphs||[]);if(selected?.id)await selectGraph(selected.id);else if(r.graphs?.[0])await selectGraph(r.graphs[0].id);}catch(e:any){setError(e.message||'Unable to refresh graphs');}},[selected?.id,selectGraph]);
 const resume=async()=>{if(!selected)return;setResuming(true);setError('');try{await resumeGraph(selected.id);await selectGraph(selected.id);await refresh();}catch(e:any){setError(e.message||'Unable to resume graph');}finally{setResuming(false)}};
 useEffect(()=>{refresh().finally(()=>setLoading(false));},[]);
 useEffect(()=>{if(selected?.status!=='running')return;const timer=setInterval(()=>{selectGraph(selected.id).catch(()=>undefined)},5000);return()=>clearInterval(timer)},[selected?.id,selected?.status,selectGraph]);
 return <div className="space-y-6"><div><div className="flex items-center justify-between gap-4"><div><h2 className="text-2xl font-bold text-[var(--text-primary)]">Task Graphs</h2><p className="text-sm text-[var(--text-secondary)]">Durable execution graphs, dependencies, model routing and outcomes.</p></div>{selected?.status==='running'&&<span className="text-xs text-[var(--accent-primary)]">Live · refreshes every 5s</span>}</div></div>{error&&<div className="glass-card p-4 text-red-400">{error}</div>}{loading?<div className="glass-card p-8 text-[var(--text-secondary)]">Loading graphs…</div>:graphs.length===0?<div className="glass-card p-8 text-[var(--text-secondary)]">No executed graphs yet.</div>:<><div className="flex gap-2 overflow-x-auto pb-1">{graphs.map(g=><button key={g.id} onClick={()=>selectGraph(g.id)} className={`px-4 py-2 rounded-lg border text-sm whitespace-nowrap ${selected?.id===g.id?'border-[var(--accent-primary)] text-[var(--accent-primary)]':'border-[var(--border-color)] text-[var(--text-secondary)]'}`}>{g.goal?.slice(0,45)||g.id}</button>)}</div>{selected&&<TaskGraphView graph={selected} attempts={attempts} onRefresh={refresh} onResume={resume} resuming={resuming}/>}</>}</div>
}
