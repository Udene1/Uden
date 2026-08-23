'use client';
import { useState, useEffect } from 'react';
import { Play, Sparkles } from 'lucide-react';

export default function NewTaskPage() {
  const [prompt, setPrompt] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [result, setResult] = useState('');
  const [displayedResult, setDisplayedResult] = useState('');

  // Typewriter effect
  useEffect(() => {
    if (!result) return;
    let i = 0;
    setDisplayedResult('');
    const interval = setInterval(() => {
      setDisplayedResult(prev => prev + result.charAt(i));
      i++;
      if (i === result.length) clearInterval(interval);
    }, 20);
    return () => clearInterval(interval);
  }, [result]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!prompt.trim()) return;
    
    setIsSubmitting(true);
    setResult('');
    setDisplayedResult('');

    // Simulate API call
    setTimeout(() => {
      setIsSubmitting(false);
      setResult("Here is the simulated output for your prompt. The AI Work Partner engine automatically routed this request to the most cost-effective model (Claude 3 Haiku) based on the low complexity of the task, saving you 85% compared to using GPT-4o, while maintaining the required quality threshold.\n\nCode snippet:\n```js\nfunction hello() {\n  console.log('World');\n}\n```");
    }, 1500);
  };

  return (
    <div className="max-w-4xl space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-[var(--text-primary)]">Run a Task</h2>
        <p className="text-sm text-[var(--text-secondary)]">Test the routing engine by executing a prompt.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="md:col-span-2 space-y-6">
          <form onSubmit={handleSubmit} className="glass-card p-6 border border-[var(--border-color)] shadow-lg space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium text-[var(--text-primary)] flex items-center gap-2">
                <Sparkles size={16} className="text-[var(--accent-primary)]" /> Prompt
              </label>
              <textarea
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                className="w-full h-40 bg-[var(--bg-secondary)] border border-[var(--border-color)] rounded-xl p-4 text-[var(--text-primary)] focus:outline-none focus:border-[var(--accent-primary)] resize-none"
                placeholder="Enter your prompt here..."
              />
            </div>
            
            <div className="flex justify-between items-center">
              <div className="text-xs text-[var(--text-muted)]">
                Will be routed automatically based on workspace settings.
              </div>
              <button 
                type="submit" 
                className="btn btn-primary"
                disabled={isSubmitting || !prompt.trim()}
              >
                {isSubmitting ? 'Running...' : <><Play size={16} /> Execute</>}
              </button>
            </div>
          </form>

          {result && (
            <div className="glass-card p-6 border border-[var(--border-color)] animate-slide-up bg-[var(--bg-secondary)]">
              <h3 className="text-sm font-medium text-[var(--text-secondary)] mb-4 uppercase tracking-wider">Output</h3>
              <div className="prose prose-invert max-w-none text-sm text-[var(--text-primary)] whitespace-pre-wrap">
                {displayedResult}
                {displayedResult.length < result.length && <span className="inline-block w-2 h-4 bg-[var(--accent-primary)] animate-pulse ml-1 align-middle"></span>}
              </div>
            </div>
          )}
        </div>

        <div className="space-y-6">
          <div className="glass-card p-6 border border-[var(--border-color)] space-y-4">
            <h3 className="font-semibold text-[var(--text-primary)]">Configuration</h3>
            
            <div className="input-group">
              <label className="input-label">Project</label>
              <select className="input-field appearance-none bg-[var(--bg-secondary)]">
                <option value="">No Project (Default)</option>
                <option value="proj-1">Customer Support Bot</option>
                <option value="proj-2">Data Extraction pipeline</option>
              </select>
            </div>

            <div className="input-group">
              <label className="input-label">Execution Mode</label>
              <select className="input-field appearance-none bg-[var(--bg-secondary)]">
                <option value="permissionless">Permissionless (Auto)</option>
                <option value="permission_based">Require Approval</option>
              </select>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
