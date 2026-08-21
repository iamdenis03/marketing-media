'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { Breadcrumbs } from '@/components/Breadcrumbs';
import { Calendar, Plus, ChevronRight, Trophy, Folder, Loader2 } from 'lucide-react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';

interface SeasonItem {
  id: string;
  name: string;
  startDate: string;
  endDate: string;
  _count?: { events: number };
}

export default function SeasonsPage() {
  const { data: session, status } = useSession();
  const router = useRouter();

  const [seasons, setSeasons] = useState<SeasonItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);

  // Form state
  const [name, setName] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/login');
    } else if (status === 'authenticated') {
      fetchSeasons();
    }
  }, [status]);

  const fetchSeasons = async () => {
    try {
      const res = await fetch('/api/seasons');
      if (res.ok) {
        const data = await res.json();
        setSeasons(data);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateSeason = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreating(true);

    try {
      const res = await fetch('/api/seasons', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, startDate, endDate }),
      });

      if (res.ok) {
        setName('');
        setStartDate('');
        setEndDate('');
        setShowCreateModal(false);
        fetchSeasons();
      } else {
        const err = await res.json();
        alert(err.error || 'A apărut o eroare la crearea sezonului.');
      }
    } catch (err) {
      console.error(err);
    } finally {
      setCreating(false);
    }
  };

  const role = (session?.user as any)?.role;

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24 text-slate-400 space-x-2">
        <Loader2 className="w-6 h-6 animate-spin text-blue-400" />
        <span>Se încarcă sezoanele...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      
      {/* Breadcrumbs */}
      <Breadcrumbs items={[]} />

      {/* Header Section */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-gradient-to-r from-slate-900 via-slate-900 to-blue-950/40 p-6 rounded-3xl border border-slate-800 shadow-xl">
        <div>
          <div className="flex items-center space-x-2">
            <Trophy className="w-6 h-6 text-amber-400" />
            <h1 className="text-xl sm:text-2xl font-bold text-white">Sezoane Competitional FTC</h1>
          </div>
          <p className="text-xs sm:text-sm text-slate-400 mt-1">
            Selectează un sezon pentru a accesa evenimentele, meciurile și arhiva media.
          </p>
        </div>

        {role === 'ADMIN' && (
          <button
            onClick={() => setShowCreateModal(true)}
            className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-blue-600 to-amber-600 hover:opacity-95 text-white text-xs font-semibold shadow transition flex items-center space-x-2 shrink-0"
          >
            <Plus className="w-4 h-4" />
            <span>Adaugă Sezon Nou</span>
          </button>
        )}
      </div>

      {/* Seasons Grid */}
      {seasons.length === 0 ? (
        <div className="text-center py-16 bg-slate-900/30 rounded-3xl border border-slate-800">
          <Folder className="w-12 h-12 text-slate-600 mx-auto mb-3" />
          <h3 className="text-slate-300 font-semibold text-sm">Nu există sezoane create</h3>
          <p className="text-xs text-slate-500 mt-1">Administratorul poate adăuga primul sezon.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {seasons.map((season) => (
            <Link
              key={season.id}
              href={`/seasons/${season.id}`}
              className="group bg-slate-900/80 hover:bg-slate-900 border border-slate-800 hover:border-blue-500/50 p-6 rounded-3xl transition-all duration-300 shadow-lg hover:shadow-2xl hover:shadow-blue-500/10 flex flex-col justify-between"
            >
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="px-3 py-1 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-400 text-xs font-semibold">
                    {season._count?.events || 0} Evenimente
                  </span>
                  <ChevronRight className="w-5 h-5 text-slate-600 group-hover:text-blue-400 group-hover:translate-x-1 transition" />
                </div>

                <h2 className="text-lg font-bold text-white group-hover:text-amber-400 transition line-clamp-2">
                  {season.name}
                </h2>
              </div>

              <div className="mt-6 pt-4 border-t border-slate-800/80 flex items-center justify-between text-xs text-slate-400">
                <span className="flex items-center space-x-1">
                  <Calendar className="w-3.5 h-3.5 text-amber-400" />
                  <span>
                    {new Date(season.startDate).toLocaleDateString('ro-RO')} - {new Date(season.endDate).toLocaleDateString('ro-RO')}
                  </span>
                </span>
              </div>
            </Link>
          ))}
        </div>
      )}

      {/* Create Season Modal (Admin) */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-md p-6 space-y-4 shadow-2xl">
            <h3 className="font-bold text-lg text-white flex items-center space-x-2">
              <Plus className="w-5 h-5 text-amber-400" />
              <span>Adaugă Sezon Nou</span>
            </h3>

            <form onSubmit={handleCreateSeason} className="space-y-4">
              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-300">Nume Sezon</label>
                <input
                  type="text"
                  required
                  placeholder="Ex: Sezonul 2025-2026 - INTO THE DEEP"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-blue-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-300">Data Început</label>
                  <input
                    type="date"
                    required
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-blue-500"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-300">Data Sfârșit</label>
                  <input
                    type="date"
                    required
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-blue-500"
                  />
                </div>
              </div>

              <div className="pt-2 flex items-center justify-end space-x-3">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-400 hover:bg-slate-800 transition"
                >
                  Anulează
                </button>
                <button
                  type="submit"
                  disabled={creating}
                  className="px-4 py-2 rounded-xl text-xs font-semibold bg-blue-600 hover:bg-blue-500 text-white transition flex items-center space-x-1"
                >
                  {creating ? <Loader2 className="w-4 h-4 animate-spin" /> : <span>Salvează</span>}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
