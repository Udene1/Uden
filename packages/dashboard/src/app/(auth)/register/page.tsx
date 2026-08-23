'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Sparkles, Building2, ArrowRight } from 'lucide-react';
import { api } from '@/lib/api';

export default function RegisterPage() {
  const [name, setName] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [generatedKey, setGeneratedKey] = useState('');
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    
    try {
      const res = await api.registerTenant(name);
      if (res.apiKey) {
        setGeneratedKey(res.apiKey);
      }
    } catch (error) {
      alert('Registration failed');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="glass-card p-8 rounded-2xl shadow-2xl border border-[var(--border-color)]">
      <div className="flex flex-col items-center mb-8">
        <div className="w-12 h-12 rounded-xl mb-4 flex items-center justify-center text-white" style={{ background: 'var(--accent-gradient)' }}>
          <Sparkles size={24} />
        </div>
        <h1 className="text-2xl font-bold text-center gradient-text">Create Workspace</h1>
        <p className="text-[var(--text-secondary)] text-sm mt-2">Setup your AI Work Partner environment</p>
      </div>

      {!generatedKey ? (
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="input-group">
            <label className="input-label flex items-center gap-2">
              <Building2 size={16} /> Company / Workspace Name
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="input-field"
              placeholder="Acme Corp"
              required
            />
          </div>

          <button 
            type="submit" 
            className="btn btn-primary w-full py-3 rounded-xl flex items-center justify-center gap-2"
            disabled={isLoading}
          >
            {isLoading ? 'Creating...' : 'Generate API Key'}
            {!isLoading && <ArrowRight size={18} />}
          </button>
        </form>
      ) : (
        <div className="space-y-6 animate-slide-up">
          <div className="p-4 rounded-xl bg-green-500/10 border border-green-500/20 text-center">
            <h3 className="text-green-500 font-semibold mb-1">Workspace Created!</h3>
            <p className="text-sm text-[var(--text-secondary)]">Save this API key. You won't be able to see it again.</p>
          </div>
          
          <div className="p-4 bg-[var(--bg-primary)] border border-[var(--border-color)] rounded-xl relative group">
            <code className="text-mono text-sm text-[var(--text-primary)] break-all">{generatedKey}</code>
            <button 
              className="absolute top-2 right-2 p-1.5 bg-[var(--bg-secondary)] rounded-md opacity-0 group-hover:opacity-100 transition-opacity"
              onClick={() => navigator.clipboard.writeText(generatedKey)}
            >
              Copy
            </button>
          </div>

          <Link href="/login" className="btn btn-primary w-full py-3 rounded-xl flex items-center justify-center">
            Proceed to Login
          </Link>
        </div>
      )}

      <div className="mt-8 text-center text-sm text-[var(--text-secondary)]">
        Already have an account?{' '}
        <Link href="/login" className="text-[var(--accent-primary)] hover:underline font-medium">
          Sign in
        </Link>
      </div>
    </div>
  );
}
