'use client';
import { useState } from 'react';
import { Save, Key, Shield, Zap, RefreshCw } from 'lucide-react';

export default function SettingsPage() {
  const [isSaving, setIsSaving] = useState(false);

  const handleSave = () => {
    setIsSaving(true);
    setTimeout(() => setIsSaving(false), 1000);
  };

  return (
    <div className="max-w-4xl space-y-8">
      <div>
        <h2 className="text-2xl font-bold text-[var(--text-primary)] mb-2">Workspace Settings</h2>
        <p className="text-[var(--text-secondary)]">Manage your routing preferences and integrations.</p>
      </div>

      <div className="glass-card p-6 border border-[var(--border-color)]">
        <div className="flex items-center gap-3 mb-6 border-b border-[var(--border-color)] pb-4">
          <Shield size={20} className="text-[var(--accent-primary)]" />
          <h3 className="text-lg font-semibold text-[var(--text-primary)]">Routing & Quality Preferences</h3>
        </div>

        <div className="space-y-6">
          <div className="space-y-3">
            <label className="text-sm font-medium text-[var(--text-primary)]">Default Routing Strategy</label>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <label className="border border-[var(--accent-primary)] bg-[var(--accent-glow)] rounded-xl p-4 cursor-pointer relative">
                <input type="radio" name="strategy" defaultChecked className="absolute top-4 right-4" />
                <div className="font-semibold text-[var(--text-primary)] mb-1">Cost-Optimized</div>
                <div className="text-xs text-[var(--text-secondary)]">Starts with fast models, escalates only on low confidence.</div>
              </label>
              <label className="border border-[var(--border-color)] bg-[var(--bg-secondary)] hover:border-[var(--border-highlight)] rounded-xl p-4 cursor-pointer relative transition-colors">
                <input type="radio" name="strategy" className="absolute top-4 right-4" />
                <div className="font-semibold text-[var(--text-primary)] mb-1">Quality-First</div>
                <div className="text-xs text-[var(--text-secondary)]">Always uses premium models for guaranteed output quality.</div>
              </label>
              <label className="border border-[var(--border-color)] bg-[var(--bg-secondary)] hover:border-[var(--border-highlight)] rounded-xl p-4 cursor-pointer relative transition-colors">
                <input type="radio" name="strategy" className="absolute top-4 right-4" />
                <div className="font-semibold text-[var(--text-primary)] mb-1">Speed-Optimized</div>
                <div className="text-xs text-[var(--text-secondary)]">Forces fast models. No escalation. Minimum latency.</div>
              </label>
            </div>
          </div>

          <div className="input-group">
            <label className="input-label">Monthly Budget (USD)</label>
            <input type="number" defaultValue={500} className="input-field max-w-xs" />
          </div>

          <div className="flex items-center justify-between p-4 bg-[var(--bg-secondary)] rounded-xl border border-[var(--border-color)]">
            <div>
              <div className="font-medium text-[var(--text-primary)]">Require Human Approval</div>
              <div className="text-xs text-[var(--text-secondary)]">Pause execution if cost exceeds $1.00 per task</div>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input type="checkbox" value="" className="sr-only peer" defaultChecked />
              <div className="w-11 h-6 bg-gray-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[var(--accent-primary)]"></div>
            </label>
          </div>
        </div>
      </div>

      <div className="glass-card p-6 border border-[var(--border-color)]">
        <div className="flex items-center gap-3 mb-6 border-b border-[var(--border-color)] pb-4">
          <Key size={20} className="text-purple-500" />
          <h3 className="text-lg font-semibold text-[var(--text-primary)]">API Keys & Integrations</h3>
        </div>

        <div className="space-y-4">
          <div className="input-group">
            <label className="input-label flex justify-between">
              <span>OpenAI API Key</span>
              <span className="text-green-500 text-xs flex items-center gap-1"><Shield size={12}/> Connected</span>
            </label>
            <input type="password" value="sk-••••••••••••••••••••••••" readOnly className="input-field bg-black/20" />
          </div>
          
          <div className="input-group">
            <label className="input-label">Anthropic API Key</label>
            <input type="password" placeholder="sk-ant-..." className="input-field" />
          </div>
        </div>
      </div>

      <div className="flex justify-end gap-4">
        <button className="btn btn-secondary">Cancel</button>
        <button className="btn btn-primary" onClick={handleSave} disabled={isSaving}>
          {isSaving ? <RefreshCw className="animate-spin" size={16} /> : <Save size={16} />}
          {isSaving ? 'Saving...' : 'Save Changes'}
        </button>
      </div>
    </div>
  );
}
