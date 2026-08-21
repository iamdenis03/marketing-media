'use client';

import React, { useState, useEffect } from 'react';
import { Breadcrumbs } from '@/components/Breadcrumbs';
import { HardDrive, Server, ShieldCheck, PieChart, RefreshCw, Folder, Loader2 } from 'lucide-react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';

interface DiskStats {
  totalBytes: number;
  freeBytes: number;
  usedBytes: number;
  mediaUsedBytes: number;
  storageBasePath: string;
}

export default function AdminDashboardPage() {
  const { data: session, status } = useSession();
  const router = useRouter();

  const [stats, setStats] = useState<DiskStats | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchStats = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/admin/disk-space');
      if (res.ok) {
        const data = await res.json();
        setStats(data);
      } else {
        const err = await res.json();
        alert(err.error || 'Fără drepturi de administrator.');
        router.push('/');
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (status === 'authenticated') {
      const role = (session?.user as any)?.role;
      if (role !== 'ADMIN') {
        router.push('/');
      } else {
        fetchStats();
      }
    } else if (status === 'unauthenticated') {
      router.push('/login');
    }
  }, [status]);

  const formatBytes = (bytes: number) => {
    if (!bytes || bytes === 0) return '0 GB';
    const gb = bytes / (1024 * 1024 * 1024);
    return gb.toFixed(2) + ' GB';
  };

  if (loading || !stats) {
    return (
      <div className="flex items-center justify-center py-24 text-slate-400 space-x-2">
        <Loader2 className="w-6 h-6 animate-spin text-amber-400" />
        <span>Se preiau datele despre stocare pe server...</span>
      </div>
    );
  }

  const mediaPercent = stats.totalBytes > 0 ? ((stats.mediaUsedBytes / stats.totalBytes) * 100).toFixed(1) : '0';
  const totalUsedPercent = stats.totalBytes > 0 ? (((stats.totalBytes - stats.freeBytes) / stats.totalBytes) * 100).toFixed(1) : '0';

  return (
    <div className="space-y-6">
      <Breadcrumbs items={[{ label: 'Panou Admin Server Storage' }]} />

      {/* Header Banner */}
      <div className="flex items-center justify-between bg-slate-900 p-6 rounded-3xl border border-slate-800 shadow-xl">
        <div className="flex items-center space-x-3">
          <div className="p-3 rounded-2xl bg-amber-500/20 text-amber-400 border border-amber-500/30">
            <HardDrive className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-white flex items-center space-x-2">
              <span>Monitorizare Spațiu Disc (Server AlmaLinux)</span>
              <ShieldCheck className="w-4 h-4 text-amber-400" />
            </h1>
            <p className="text-xs text-slate-400 mt-0.5">
              Calea pe disc: <code className="font-mono text-amber-300 bg-slate-950 px-2 py-0.5 rounded">{stats.storageBasePath}</code>
            </p>
          </div>
        </div>

        <button
          onClick={fetchStats}
          className="p-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 transition flex items-center space-x-1.5 text-xs font-semibold"
          title="Reîmprospătează datele"
        >
          <RefreshCw className="w-4 h-4" />
          <span className="hidden sm:inline">Actualizează</span>
        </button>
      </div>

      {/* Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        
        {/* Total Disk Space */}
        <div className="bg-slate-900/80 border border-slate-800 p-6 rounded-3xl space-y-3">
          <div className="flex items-center justify-between text-slate-400 text-xs font-semibold">
            <span>Capacitate Totală Disc</span>
            <Server className="w-4 h-4 text-blue-400" />
          </div>
          <p className="text-2xl font-black text-white">{formatBytes(stats.totalBytes)}</p>
          <div className="w-full bg-slate-950 rounded-full h-2 overflow-hidden border border-slate-800">
            <div className="bg-blue-500 h-full rounded-full" style={{ width: `${totalUsedPercent}%` }} />
          </div>
          <p className="text-[11px] text-slate-500">{totalUsedPercent}% Utilizat pe întreg serverul</p>
        </div>

        {/* Media Storage Folder Space */}
        <div className="bg-slate-900/80 border border-slate-800 p-6 rounded-3xl space-y-3">
          <div className="flex items-center justify-between text-slate-400 text-xs font-semibold">
            <span>Ocupat de Folder-ul Media</span>
            <Folder className="w-4 h-4 text-amber-400" />
          </div>
          <p className="text-2xl font-black text-amber-400">{formatBytes(stats.mediaUsedBytes)}</p>
          <div className="w-full bg-slate-950 rounded-full h-2 overflow-hidden border border-slate-800">
            <div className="bg-amber-500 h-full rounded-full" style={{ width: `${mediaPercent}%` }} />
          </div>
          <p className="text-[11px] text-slate-500">{mediaPercent}% din spațiul total al serverului</p>
        </div>

        {/* Free Space */}
        <div className="bg-slate-900/80 border border-slate-800 p-6 rounded-3xl space-y-3">
          <div className="flex items-center justify-between text-slate-400 text-xs font-semibold">
            <span>Spațiu Liber Rămas</span>
            <PieChart className="w-4 h-4 text-emerald-400" />
          </div>
          <p className="text-2xl font-black text-emerald-400">{formatBytes(stats.freeBytes)}</p>
          <p className="text-[11px] text-slate-500">Disponibil direct pentru noi fișiere media</p>
        </div>

      </div>

    </div>
  );
}
