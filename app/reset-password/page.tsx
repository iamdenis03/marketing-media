'use client';

import React, { useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { Mail, KeyRound, Lock, CheckCheck, ArrowLeft, Save, AlertCircle, Info, Loader2 } from 'lucide-react';

function ResetPasswordForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const initialEmail = searchParams.get('email') || '';
  const sentInfo = searchParams.get('sent') === '1';

  const [email, setEmail] = useState(initialEmail);
  const [code, setCode] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (password !== confirmPassword) {
      setError('Parolele nu se potrivesc.');
      return;
    }

    if (password.length < 6) {
      setError('Parola trebuie să aibă minim 6 caractere.');
      return;
    }

    setLoading(true);

    try {
      const res = await fetch('/api/auth/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, code, password, confirmPassword }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || 'A apărut o eroare.');
        setLoading(false);
      } else {
        router.push('/login?reset=success');
      }
    } catch (err: any) {
      setError('A apărut o eroare neașteptată. Te rugăm să încerci din nou.');
      setLoading(false);
    }
  };

  return (
    <div className="w-full max-w-md platform-card p-6 sm:p-8 space-y-6 shadow-2xl relative">
      
      {/* Header */}
      <div className="text-center space-y-2">
        <div className="inline-flex p-3 rounded-2xl bg-platform-tertiary border border-platform-border shadow-xl mb-2">
          <KeyRound className="w-8 h-8 text-platform-green" />
        </div>
        <h1 className="text-2xl font-bold font-display text-slate-100 tracking-tight">
          Resetare Parolă
        </h1>
        <p className="text-xs font-mono text-platform-textSecondary">
          Introdu codul primit pe email și noua ta parolă.
        </p>
      </div>

      {/* Info Alert if code was sent */}
      {sentInfo && (
        <div className="p-3.5 rounded-xl bg-platform-green/10 border border-platform-green/30 text-platform-green text-xs font-mono flex items-start space-x-2 animate-fadeIn">
          <Info className="w-4 h-4 shrink-0 mt-0.5" />
          <span>Dacă adresa există în sistem, am trimis un cod de securitate de 6 cifre pe email. Verifică și folderul Spam.</span>
        </div>
      )}

      {/* Error Alert */}
      {error && (
        <div className="p-3.5 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 text-xs font-mono flex items-center space-x-2 animate-fadeIn">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Reset Password Form */}
      <form onSubmit={handleSubmit} className="space-y-4">
        
        {/* Email */}
        <div className="space-y-1.5">
          <label className="text-xs font-semibold uppercase text-platform-textSecondary font-mono">
            Adresă Email
          </label>
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

        {/* 6-Digit Code */}
        <div className="space-y-1.5">
          <label className="text-xs font-semibold uppercase text-platform-textSecondary font-mono">
            Cod de 6 cifre
          </label>
          <div className="relative">
            <KeyRound className="w-4 h-4 text-platform-textMuted absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              required
              maxLength={6}
              pattern="[0-9]{6}"
              value={code}
              onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))}
              placeholder="000000"
              className="w-full pl-10 pr-4 py-2.5 bg-platform-bg rounded-xl border border-platform-border text-lg font-mono text-center tracking-[0.5em] text-platform-green placeholder-platform-textMuted focus:outline-none focus:border-platform-green transition font-bold"
            />
          </div>
        </div>

        {/* New Password */}
        <div className="space-y-1.5">
          <label className="text-xs font-semibold uppercase text-platform-textSecondary font-mono">
            Parolă Nouă
          </label>
          <div className="relative">
            <Lock className="w-4 h-4 text-platform-textMuted absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="password"
              required
              minLength={6}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Minim 6 caractere"
              className="w-full pl-10 pr-4 py-2.5 bg-platform-bg rounded-xl border border-platform-border text-sm text-slate-200 placeholder-platform-textMuted focus:outline-none focus:border-platform-green transition"
            />
          </div>
        </div>

        {/* Confirm New Password */}
        <div className="space-y-1.5">
          <label className="text-xs font-semibold uppercase text-platform-textSecondary font-mono">
            Confirmă Parola Nouă
          </label>
          <div className="relative">
            <CheckCheck className="w-4 h-4 text-platform-textMuted absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="password"
              required
              minLength={6}
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="Repetă parola nouă"
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
              <Save className="w-4 h-4" />
              <span>Salvează Noua Parolă</span>
            </>
          )}
        </button>
      </form>

      {/* Back Link */}
      <div className="pt-2 text-center border-t border-platform-border">
        <Link
          href="/login"
          className="inline-flex items-center text-xs font-mono text-platform-textSecondary hover:text-platform-green transition space-x-1"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Înapoi la Autentificare</span>
        </Link>
      </div>

    </div>
  );
}

export default function ResetPasswordPage() {
  return (
    <div className="min-h-[80vh] flex items-center justify-center p-4">
      <Suspense fallback={
        <div className="flex items-center justify-center p-8">
          <Loader2 className="w-8 h-8 text-platform-green animate-spin" />
        </div>
      }>
        <ResetPasswordForm />
      </Suspense>
    </div>
  );
}
