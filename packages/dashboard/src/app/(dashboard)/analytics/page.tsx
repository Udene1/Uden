'use client';
import { Calendar, Download, BarChart2, PieChart } from 'lucide-react';
import SpendChart from '@/components/charts/SpendChart';
import ModelDistribution from '@/components/charts/ModelDistribution';
import CostByProvider from '@/components/charts/CostByProvider';

export default function AnalyticsPage() {
  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-[var(--text-primary)]">Analytics & Reports</h2>
        
        <div className="flex gap-3">
          <div className="flex items-center gap-2 px-4 py-2 glass-card rounded-lg border border-[var(--border-color)] text-sm text-[var(--text-secondary)]">
            <Calendar size={16} />
            <span>Last 30 Days</span>
          </div>
          <button className="btn btn-secondary">
            <Download size={16} /> Export CSV
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="glass-card p-6 border border-[var(--border-color)]">
          <div className="flex items-center gap-2 mb-6">
            <BarChart2 size={20} className="text-[var(--accent-primary)]" />
            <h3 className="text-lg font-semibold text-[var(--text-primary)]">Spend Over Time</h3>
          </div>
          <SpendChart />
        </div>

        <div className="glass-card p-6 border border-[var(--border-color)]">
          <div className="flex items-center gap-2 mb-6">
            <PieChart size={20} className="text-purple-500" />
            <h3 className="text-lg font-semibold text-[var(--text-primary)]">Cost by Provider</h3>
          </div>
          <CostByProvider />
        </div>

        <div className="glass-card p-6 border border-[var(--border-color)]">
          <div className="flex items-center gap-2 mb-6">
            <PieChart size={20} className="text-green-500" />
            <h3 className="text-lg font-semibold text-[var(--text-primary)]">Task Distribution by Model</h3>
          </div>
          <ModelDistribution />
        </div>

        <div className="glass-card p-6 border border-[var(--border-color)] flex flex-col justify-center items-center text-center">
          <div className="w-16 h-16 rounded-full bg-[var(--bg-secondary)] flex items-center justify-center mb-4">
            <span className="text-2xl">⚡</span>
          </div>
          <h3 className="text-xl font-bold text-[var(--text-primary)] mb-2">Escalation Funnel</h3>
          <p className="text-[var(--text-secondary)] text-sm max-w-xs">
            Visualization of tasks routed to fast models vs escalated to premium models.
          </p>
          <div className="mt-8 w-full max-w-sm space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-[var(--text-primary)]">Total Tasks</span>
              <span className="font-mono">10,420</span>
            </div>
            <div className="w-full bg-[var(--bg-secondary)] h-8 rounded flex items-center px-3 relative overflow-hidden">
               <div className="absolute left-0 top-0 bottom-0 bg-blue-500/20 w-full"></div>
               <span className="relative z-10 text-xs font-medium">100% Routed</span>
            </div>
            
            <div className="flex justify-between text-sm pt-2">
              <span className="text-[var(--text-primary)]">Fast Model Success</span>
              <span className="font-mono">8,950</span>
            </div>
            <div className="w-full bg-[var(--bg-secondary)] h-8 rounded flex items-center px-3 relative overflow-hidden">
               <div className="absolute left-0 top-0 bottom-0 bg-green-500/20 w-[85%]"></div>
               <span className="relative z-10 text-xs font-medium">85% Resolved</span>
            </div>

            <div className="flex justify-between text-sm pt-2">
              <span className="text-[var(--text-primary)]">Escalated to Premium</span>
              <span className="font-mono">1,470</span>
            </div>
            <div className="w-full bg-[var(--bg-secondary)] h-8 rounded flex items-center px-3 relative overflow-hidden">
               <div className="absolute left-0 top-0 bottom-0 bg-purple-500/20 w-[15%]"></div>
               <span className="relative z-10 text-xs font-medium">15% Escalated</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
