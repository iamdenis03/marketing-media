'use client';

import React, { useState, Suspense } from 'react';
import { signIn } from 'next-auth/react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { Film, Lock, Mail, AlertCircle, CheckCircle2, Loader2, KeyRound } from 'lucide-react';

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const resetSuccess = searchParams.get('reset') === 'success';

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const res = await signIn('credentials', {
        email,
        password,
        redirect: false,
      });

      if (res?.error) {
        setError(res.error);
        setLoading(false);
      } else {
        router.push('/');
        router.refresh();
      }
    } catch (err: any) {
      setError('A apărut o eroare neașteptată.');
      setLoading(false);
    }
  };

  return (
    <div className="w-full max-w-md platform-card p-6 sm:p-8 space-y-6 shadow-2xl">
      {/* Header Logo */}
      <div className="text-center space-y-2">
        <div className="inline-flex p-3 rounded-2xl bg-platform-tertiary border border-platform-border shadow-xl mb-2">
          <Film className="w-8 h-8 text-platform-green" />
        </div>
        <h1 className="text-2xl font-bold font-display text-slate-100 tracking-tight">
          VVROBOTS 19116
        </h1>
        <p className="text-xs font-mono text-platform-textSecondary">Platformă Organizare Media Marketing</p>
        <p className="text-[11px] font-mono text-platform-green bg-platform-green/10 border border-platform-green/20 py-1 px-3 rounded-full inline-block mt-1">
          Autentificare cu contul echipei VVRobots
        </p>
      </div>

      {/* Success Alert for Reset */}
      {resetSuccess && (
        <div className="p-3.5 rounded-xl bg-platform-green/10 border border-platform-green/30 text-platform-green text-xs font-mono flex items-start space-x-2 animate-fadeIn">
          <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5" />
          <span>Parola ta a fost schimbată cu succes! Te poți conecta cu noua parolă.</span>
        </div>
      )}

      {/* Error Alert */}
      {error && (
        <div className="p-3.5 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 text-xs font-mono flex items-center space-x-2 animate-fadeIn">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Login Form */}
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="space-y-1.5">
          <label className="text-xs font-semibold uppercase text-platform-textSecondary font-mono">Email VVRobots</label>
          <div className="relative">
            <Mail className="w-4 h-4 text-platform-textMuted absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="nume@vvrobots.ro"
              className="w-full pl-10 pr-4 py-2.5 bg-platform-bg rounded-xl border border-platform-border text-sm text-slate-200 placeholder-platform-textMuted focus:outline-none focus:border-platform-green transition"
            />
          </div>
        </div>

        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <label className="text-xs font-semibold uppercase text-platform-textSecondary font-mono">Parolă</label>
            <Link
              href="/forgot-password"
              className="text-xs font-mono text-platform-green hover:underline transition"
            >
              Ai uitat parola?
            </Link>
          </div>
          <div className="relative">
            <Lock className="w-4 h-4 text-platform-textMuted absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              className="w-full pl-10 pr-4 py-2.5 bg-platform-bg rounded-xl border border-platform-border text-sm text-slate-200 placeholder-platform-textMuted focus:outline-none focus:border-platform-green transition"
            />
          </div>
        </div>

        <button
          type="submit"
          disabled={loading}
          className="btn-platform-primary w-full py-3 rounded-xl font-semibold text-sm shadow flex items-center justify-center space-x-2 disabled:opacity-50"
        >
          {loading ? (
            <Loader2 className="w-5 h-5 animate-spin" />
          ) : (
            <>
              <KeyRound className="w-4 h-4" />
              <span>Autentificare</span>
            </>
          )}
        </button>
      </form>
    </div>
  );
}

export default function LoginPage() {
  return (
    <div className="min-h-[80vh] flex items-center justify-center p-4">
      <Suspense fallback={
        <div className="flex items-center justify-center p-8">
          <Loader2 className="w-8 h-8 text-platform-green animate-spin" />
        </div>
      }>
        <LoginForm />
      </Suspense>
    </div>
  );
}
