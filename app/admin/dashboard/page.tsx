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
      <div className="flex items-center justify-center py-24 text-platform-textSecondary space-x-2">
        <Loader2 className="w-6 h-6 animate-spin text-platform-green" />
        <span className="font-mono text-sm">Se preiau datele despre stocare pe server...</span>
      </div>
    );
  }

  const mediaPercent = stats.totalBytes > 0 ? ((stats.mediaUsedBytes / stats.totalBytes) * 100).toFixed(1) : '0';
  const totalUsedPercent = stats.totalBytes > 0 ? (((stats.totalBytes - stats.freeBytes) / stats.totalBytes) * 100).toFixed(1) : '0';

  return (
    <div className="space-y-6">
      <Breadcrumbs items={[{ label: 'Panou Admin Server Storage' }]} />

      {/* Header Banner */}
      <div className="platform-card p-6 flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <div className="p-3 rounded-2xl bg-platform-tertiary border border-platform-border">
            <HardDrive className="w-6 h-6 text-platform-green" />
          </div>
          <div>
            <h1 className="text-xl font-bold font-display text-white flex items-center space-x-2">
              <span>Monitorizare Spațiu Disc (Server AlmaLinux)</span>
              <ShieldCheck className="w-4 h-4 text-platform-green" />
            </h1>
            <p className="text-xs text-platform-textSecondary mt-1">
              Calea pe disc: <code className="font-mono text-platform-green bg-platform-bg px-2 py-0.5 rounded border border-platform-border">{stats.storageBasePath}</code>
            </p>
          </div>
        </div>

        <button
          onClick={fetchStats}
          className="p-2.5 rounded-xl bg-platform-tertiary hover:bg-platform-border text-slate-200 transition border border-platform-border flex items-center space-x-2 text-xs font-semibold"
          title="Reîmprospătează datele"
        >
          <RefreshCw className="w-4 h-4" />
          <span className="hidden sm:inline">Actualizează</span>
        </button>
      </div>

      {/* Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        
        {/* Total Disk Space */}
        <div className="platform-card p-6 border-l-4 border-l-platform-blue space-y-4">
          <div className="flex items-center justify-between text-platform-textSecondary text-xs font-mono font-semibold uppercase tracking-wider">
            <span>Capacitate Totală Disc</span>
            <Server className="w-4 h-4 text-platform-blue" />
          </div>
          <p className="text-3xl font-bold font-mono text-white tracking-tight">{formatBytes(stats.totalBytes)}</p>
          <div className="w-full bg-platform-bg rounded-full h-2 overflow-hidden border border-platform-border">
            <div className="bg-platform-blue h-full rounded-full" style={{ width: `${totalUsedPercent}%` }} />
          </div>
          <p className="text-xs font-mono text-platform-textMuted">{totalUsedPercent}% Utilizat pe întreg serverul</p>
        </div>

        {/* Media Storage Folder Space */}
        <div className="platform-card p-6 border-l-4 border-l-platform-green space-y-4">
          <div className="flex items-center justify-between text-platform-textSecondary text-xs font-mono font-semibold uppercase tracking-wider">
            <span>Ocupat de Folder-ul Media</span>
            <Folder className="w-4 h-4 text-platform-green" />
          </div>
          <p className="text-3xl font-bold font-mono text-platform-green tracking-tight">{formatBytes(stats.mediaUsedBytes)}</p>
          <div className="w-full bg-platform-bg rounded-full h-2 overflow-hidden border border-platform-border">
            <div className="bg-platform-green h-full rounded-full" style={{ width: `${mediaPercent}%` }} />
          </div>
          <p className="text-xs font-mono text-platform-textMuted">{mediaPercent}% din spațiul total al serverului</p>
        </div>

        {/* Free Space */}
        <div className="platform-card p-6 border-l-4 border-l-platform-green space-y-4">
          <div className="flex items-center justify-between text-platform-textSecondary text-xs font-mono font-semibold uppercase tracking-wider">
            <span>Spațiu Liber Rămas</span>
            <PieChart className="w-4 h-4 text-platform-green" />
          </div>
          <p className="text-3xl font-bold font-mono text-platform-green tracking-tight">{formatBytes(stats.freeBytes)}</p>
          <p className="text-xs font-mono text-platform-textMuted">Disponibil direct pentru noi fișiere media</p>
        </div>

      </div>

    </div>
  );
}
