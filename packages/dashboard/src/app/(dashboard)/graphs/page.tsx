'use client';
import { useEffect, useState } from 'react';
import TaskGraphView from '@/components/graph/TaskGraphView';
import { api } from '@/lib/api';

export default function GraphsPage(){
 const [graphs,setGraphs]=useState<any[]>([]); const [selected,setSelected]=useState<any>(null); const [loading,setLoading]=useState(true);
 useEffect(()=>{api.getGraphs().then(r=>{setGraphs(r.graphs||[]); if(r.graphs?.[0]) api.getGraph(r.graphs[0].id).then(x=>setSelected(x.graph));}).finally(()=>setLoading(false));},[]);
 return <div className="space-y-6"><div><h2 className="text-2xl font-bold text-[var(--text-primary)]">Task Graphs</h2><p className="text-sm text-[var(--text-secondary)]">Durable execution graphs, dependencies, model routing and outcomes.</p></div>{loading?<div className="glass-card p-8 text-[var(--text-secondary)]">Loading graphs…</div>:graphs.length===0?<div className="glass-card p-8 text-[var(--text-secondary)]">No executed graphs yet. Run a graph task to see its execution here.</div>:<><div className="flex gap-2 overflow-x-auto pb-1">{graphs.map(g=><button key={g.id} onClick={()=>api.getGraph(g.id).then(x=>setSelected(x.graph))} className={`px-4 py-2 rounded-lg border text-sm whitespace-nowrap ${selected?.id===g.id?'border-[var(--accent-primary)] text-[var(--accent-primary)]':'border-[var(--border-color)] text-[var(--text-secondary)]'}`}>{g.goal?.slice(0,45)||g.id}</button>)}</div>{selected&&<TaskGraphView graph={selected}/>}</>}</div>;
}
