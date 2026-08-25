'use client';

import React, { useState, useEffect } from 'react';
import { Breadcrumbs } from '@/components/Breadcrumbs';
import { HardDrive, Server, ShieldCheck, PieChart, RefreshCw, Folder, Loader2, Users, UserCheck } from 'lucide-react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';

interface DiskStats {
  totalBytes: number;
  freeBytes: number;
  usedBytes: number;
  mediaUsedBytes: number;
  storageBasePath: string;
}

interface UserItem {
  id: string;
  email: string;
  name: string;
  role: 'ADMIN' | 'EDITOR' | 'VIEWER';
  createdAt: string;
}

export default function AdminDashboardPage() {
  const { data: session, status } = useSession();
  const router = useRouter();

  const [stats, setStats] = useState<DiskStats | null>(null);
  const [users, setUsers] = useState<UserItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [updatingUser, setUpdatingUser] = useState<string | null>(null);

  const fetchStats = async () => {
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
    }
  };

  const fetchUsers = async () => {
    try {
      const res = await fetch('/api/admin/users');
      if (res.ok) {
        const data = await res.json();
        setUsers(data);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const loadAll = async () => {
    setLoading(true);
    await Promise.all([fetchStats(), fetchUsers()]);
    setLoading(false);
  };

  useEffect(() => {
    if (status === 'authenticated') {
      const role = (session?.user as any)?.role;
      if (role !== 'ADMIN') {
        router.push('/');
      } else {
        loadAll();
      }
    } else if (status === 'unauthenticated') {
      router.push('/login');
    }
  }, [status]);

  const handleRoleChange = async (userId: string, newRole: string) => {
    setUpdatingUser(userId);
    try {
      const res = await fetch('/api/admin/users', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, newRole }),
      });

      if (res.ok) {
        fetchUsers();
      } else {
        const err = await res.json();
        alert(err.error || 'A apărut o eroare la schimbarea rolului.');
      }
    } catch (err) {
      console.error(err);
    } finally {
      setUpdatingUser(null);
    }
  };

  const formatBytes = (bytes: number) => {
    if (!bytes || bytes === 0) return '0 GB';
    const gb = bytes / (1024 * 1024 * 1024);
    return gb.toFixed(2) + ' GB';
  };

  if (loading || !stats) {
    return (
      <div className="flex items-center justify-center py-24 text-platform-textSecondary space-x-2">
        <Loader2 className="w-6 h-6 animate-spin text-platform-green" />
        <span className="font-mono text-sm">Se preiau datele despre stocare și utilizatori...</span>
      </div>
    );
  }

  const mediaPercent = stats.totalBytes > 0 ? ((stats.mediaUsedBytes / stats.totalBytes) * 100).toFixed(1) : '0';
  const totalUsedPercent = stats.totalBytes > 0 ? (((stats.totalBytes - stats.freeBytes) / stats.totalBytes) * 100).toFixed(1) : '0';

  return (
    <div className="space-y-8">
      <Breadcrumbs items={[{ label: 'Panou Admin & Drepturi Accese' }]} />

      {/* Header Banner */}
      <div className="platform-card p-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center space-x-3">
          <div className="p-3 rounded-2xl bg-platform-tertiary border border-platform-border">
            <HardDrive className="w-6 h-6 text-platform-green" />
          </div>
          <div>
            <h1 className="text-xl font-bold font-display text-white flex items-center space-x-2">
              <span>Administrare Server & Roluri Utilizatori</span>
              <ShieldCheck className="w-4 h-4 text-platform-green" />
            </h1>
            <p className="text-xs text-platform-textSecondary mt-1">
              Calea pe disc: <code className="font-mono text-platform-green bg-platform-bg px-2 py-0.5 rounded border border-platform-border">{stats.storageBasePath}</code>
            </p>
          </div>
        </div>

        <button
          onClick={loadAll}
          className="p-2.5 rounded-xl bg-platform-tertiary hover:bg-platform-border text-slate-200 transition border border-platform-border flex items-center space-x-2 text-xs font-semibold"
          title="Reîmprospătează datele"
        >
          <RefreshCw className="w-4 h-4" />
          <span className="hidden sm:inline">Actualizează</span>
        </button>
      </div>

      {/* Disk Storage Cards Grid */}
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

      {/* User Roles Management Section */}
      <div className="platform-card p-6 space-y-4">
        <div className="flex items-center justify-between pb-4 border-b border-platform-border">
          <div className="flex items-center space-x-3">
            <div className="p-2 rounded-xl bg-platform-tertiary border border-platform-border text-platform-green">
              <Users className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold font-display text-white">Gestionare Roluri Utilizatori (vvrobots_media)</h2>
              <p className="text-xs text-platform-textSecondary">Atribuie sau modifică drepturile de acces ale fiecărui membru din echipă.</p>
            </div>
          </div>
          <span className="px-3 py-1 rounded-full bg-platform-green/10 border border-platform-green/20 text-platform-green text-xs font-mono font-semibold">
            {users.length} Utilizatori Înregistrați
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-platform-textSecondary">
            <thead className="bg-platform-tertiary/50 uppercase font-mono text-[11px] text-platform-textMuted">
              <tr>
                <th className="p-3 font-semibold">Nume</th>
                <th className="p-3 font-semibold">Email (Cont VVRobots)</th>
                <th className="p-3 font-semibold">Rol Curent</th>
                <th className="p-3 font-semibold">Schimbă Rolul</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-platform-border">
              {users.map((u) => (
                <tr key={u.id} className="hover:bg-platform-tertiary/30 transition">
                  <td className="p-3 font-semibold text-slate-100">{u.name}</td>
                  <td className="p-3 font-mono text-slate-300">{u.email}</td>
                  <td className="p-3">
                    <span
                      className={`inline-flex items-center space-x-1 px-2.5 py-1 rounded-full font-mono text-[11px] font-semibold border ${
                        u.role === 'ADMIN'
                          ? 'bg-platform-green/10 text-platform-green border-platform-green/30'
                          : u.role === 'EDITOR'
                          ? 'bg-platform-blue/10 text-platform-blue border-platform-blue/30'
                          : 'bg-platform-tertiary text-slate-300 border-platform-border'
                      }`}
                    >
                      <UserCheck className="w-3 h-3" />
                      <span>{u.role}</span>
                    </span>
                  </td>
                  <td className="p-3">
                    <div className="flex items-center space-x-2">
                      <select
                        value={u.role}
                        disabled={updatingUser === u.id}
                        onChange={(e) => handleRoleChange(u.id, e.target.value)}
                        className="bg-platform-bg border border-platform-border text-xs text-slate-200 rounded-xl px-2.5 py-1.5 outline-none focus:border-platform-green font-mono disabled:opacity-50"
                      >
                        <option value="VIEWER">VIEWER (Doar Vizualizare)</option>
                        <option value="EDITOR">EDITOR (Upload Media)</option>
                        <option value="ADMIN">ADMIN (Drepturi Depline)</option>
                      </select>
                      {updatingUser === u.id && (
                        <Loader2 className="w-4 h-4 animate-spin text-platform-green" />
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

    </div>
  );
}
