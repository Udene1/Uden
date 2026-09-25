'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Sparkles, Building2, Mail, Lock, ArrowRight } from 'lucide-react';
import { api } from '@/lib/api';
import { signIn } from 'next-auth/react';

export default function RegisterPage() {
  const [name,setName]=useState(''); const [email,setEmail]=useState(''); const [password,setPassword]=useState(''); const [error,setError]=useState(''); const [isLoading,setIsLoading]=useState(false); const router=useRouter();
  const handleSubmit=async(e:React.FormEvent)=>{e.preventDefault();setIsLoading(true);setError('');try{await api.registerTenant(name,email,password);const res=await signIn('credentials',{email,password,redirect:false});if(res?.error)throw new Error('Account created, but sign-in failed. Please sign in manually.');router.push('/dashboard');router.refresh();}catch(error){setError(error instanceof Error?error.message:'Registration failed.');}finally{setIsLoading(false);}};
  return <div className="glass-card p-8 rounded-2xl shadow-2xl border border-[var(--border-color)]">
    <div className="flex flex-col items-center mb-8"><div className="w-12 h-12 rounded-xl mb-4 flex items-center justify-center text-white" style={{background:'var(--accent-gradient)'}}><Sparkles size={24}/></div><h1 className="text-2xl font-bold text-center gradient-text">Create your Uden account</h1><p className="text-[var(--text-secondary)] text-sm mt-2">Use the same account across Uden clients.</p></div>
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="input-group"><label className="input-label flex items-center gap-2"><Building2 size={16}/> Name</label><input value={name} onChange={e=>setName(e.target.value)} className="input-field" placeholder="Your name or workspace" required /></div>
      <div className="input-group"><label className="input-label flex items-center gap-2"><Mail size={16}/> Email</label><input type="email" value={email} onChange={e=>setEmail(e.target.value)} className="input-field" autoComplete="email" required /></div>
      <div className="input-group"><label className="input-label flex items-center gap-2"><Lock size={16}/> Password</label><input type="password" value={password} onChange={e=>setPassword(e.target.value)} className="input-field" autoComplete="new-password" minLength={8} required /></div>
      {error&&<p className="text-sm text-red-400">{error}</p>}
      <button type="submit" className="btn btn-primary w-full py-3 rounded-xl flex items-center justify-center gap-2" disabled={isLoading}>{isLoading?'Creating...':'Create account'}{!isLoading&&<ArrowRight size={18}/>}</button>
    </form>
    <div className="mt-8 text-center text-sm text-[var(--text-secondary)]">Already have an account? <Link href="/login" className="text-[var(--accent-primary)] hover:underline font-medium">Sign in</Link></div>
  </div>;
}
