'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Mail, ArrowLeft, Send, AlertCircle, Loader2, KeyRound } from 'lucide-react';

export default function ForgotPasswordPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const res = await fetch('/api/auth/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || 'A apărut o eroare.');
        setLoading(false);
      } else {
        const encodedEmail = encodeURIComponent(email.trim().toLowerCase());
        router.push(`/reset-password?email=${encodedEmail}&sent=1`);
      }
    } catch (err: any) {
      setError('A apărut o eroare neașteptată. Te rugăm să încerci din nou.');
      setLoading(false);
    }
  };

  return (
    <div className="min-h-[80vh] flex items-center justify-center p-4">
      <div className="w-full max-w-md platform-card p-6 sm:p-8 space-y-6 shadow-2xl relative">
        
        {/* Header */}
        <div className="text-center space-y-2">
          <div className="inline-flex p-3 rounded-2xl bg-platform-tertiary border border-platform-border shadow-xl mb-2">
            <KeyRound className="w-8 h-8 text-platform-green" />
          </div>
          <h1 className="text-2xl font-bold font-display text-slate-100 tracking-tight">
            Am uitat parola
          </h1>
          <p className="text-xs font-mono text-platform-textSecondary">
            Introdu adresa ta de email pentru a primi un cod de securitate de 6 cifre.
          </p>
        </div>

        {/* Error Alert */}
        {error && (
          <div className="p-3.5 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 text-xs font-mono flex items-center space-x-2 animate-fadeIn">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <label className="text-xs font-semibold uppercase text-platform-textSecondary font-mono">
              Adresă Email VVRobots
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

          <button
            type="submit"
            disabled={loading}
            className="btn-platform-primary w-full py-3 rounded-xl font-semibold text-sm shadow flex items-center justify-center space-x-2 disabled:opacity-50"
          >
            {loading ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : (
              <>
                <Send className="w-4 h-4" />
                <span>Trimite Cod Resetare</span>
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
    </div>
  );
}
