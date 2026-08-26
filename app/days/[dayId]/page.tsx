'use client';

import React, { useState, useEffect } from 'react';
import { Breadcrumbs } from '@/components/Breadcrumbs';
import { MediaGrid } from '@/components/MediaGrid';
import { MediaUploadModal } from '@/components/MediaUploadModal';
import { MoveTargetModal } from '@/components/MoveTargetModal';
import { MediaItem } from '@/components/Lightbox';
import { Calendar, UploadCloud, Download, Loader2, Images, Trash2, Pencil, ExternalLink } from 'lucide-react';
import { useSession } from 'next-auth/react';
import { useParams, useRouter } from 'next/navigation';
import { formatDate, toInputDateFormat } from '@/lib/utils';

interface DayDetail {
  id: string;
  date: string;
  label?: string | null;
  eventId: string;
  event?: {
    id: string;
    name: string;
    seasonId: string;
    season?: { name: string };
  };
  mediaAssets: MediaItem[];
}

export default function DayGalleryPage() {
  const { dayId } = useParams() as { dayId: string };
  const { data: session } = useSession();
  const router = useRouter();

  const [day, setDay] = useState<DayDetail | null>(null);
  const [loading, setLoading] = useState(true);

  // Modals
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [showDeleteDayModal, setShowDeleteDayModal] = useState(false);
  const [deletingDay, setDeletingDay] = useState(false);
  const [showMoveDayModal, setShowMoveDayModal] = useState(false);

  // Edit Day State
  const [showEditDayModal, setShowEditDayModal] = useState(false);
  const [editDayLabel, setEditDayLabel] = useState('');
  const [editDayDate, setEditDayDate] = useState('');
  const [updatingDay, setUpdatingDay] = useState(false);

  useEffect(() => {
    fetchDayData();
  }, [dayId]);

  const fetchDayData = async () => {
    try {
      const dRes = await fetch(`/api/days`);
      if (dRes.ok) {
        const days = await dRes.json();
        const found = days.find((d: any) => d.id === dayId);
        if (found) {
          const detailedRes = await fetch(`/api/days/detail?dayId=${dayId}`);
          if (detailedRes.ok) {
            const data = await detailedRes.json();
            setDay(data);
          } else {
            setDay(found);
          }
        }
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleMoveDayConfirm = async (target: { eventId?: string }) => {
    if (!day || !target.eventId) return;

    try {
      const res = await fetch(`/api/days/${day.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          targetEventId: target.eventId,
        }),
      });

      if (res.ok) {
        setShowMoveDayModal(false);
        router.push(`/events/${target.eventId}`);
      } else {
        const err = await res.json();
        alert(err.error || 'A apărut o eroare la mutarea zilei.');
      }
    } catch (err) {
      console.error(err);
    }
  };

  const openEditDayModal = () => {
    if (!day) return;
    setEditDayLabel(day.label || '');
    setEditDayDate(toInputDateFormat(day.date));
    setShowEditDayModal(true);
  };

  const handleEditDay = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!day) return;
    setUpdatingDay(true);

    try {
      const res = await fetch(`/api/days/${day.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          label: editDayLabel,
          date: editDayDate,
        }),
      });

      if (res.ok) {
        setShowEditDayModal(false);
        fetchDayData();
      } else {
        const err = await res.json();
        alert(err.error || 'A apărut o eroare la salvarea modificărilor.');
      }
    } catch (err) {
      console.error(err);
    } finally {
      setUpdatingDay(false);
    }
  };

  const handleDeleteAsset = async (assetId: string) => {
    try {
      const res = await fetch(`/api/media/${assetId}`, {
        method: 'DELETE',
      });

      if (res.ok) {
        fetchDayData();
      } else {
        const err = await res.json();
        alert(err.error || 'A apărut o eroare la ștergere.');
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleDeleteDay = async () => {
    setDeletingDay(true);

    try {
      const res = await fetch(`/api/days/${dayId}`, {
        method: 'DELETE',
      });

      if (res.ok) {
        setShowDeleteDayModal(false);
        router.push(day?.eventId ? `/events/${day.eventId}` : '/');
      } else {
        const err = await res.json();
        alert(err.error || 'A apărut o eroare la ștergerea zilei.');
      }
    } catch (err) {
      console.error(err);
    } finally {
      setDeletingDay(false);
    }
  };

  const role = (session?.user as any)?.role;
  const canManage = role === 'ADMIN' || role === 'EDITOR';

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24 text-platform-textSecondary space-x-2">
        <Loader2 className="w-6 h-6 animate-spin text-platform-green" />
        <span className="font-mono text-sm">Se încarcă fișierele media...</span>
      </div>
    );
  }

  const dayTitle = day?.label || (day?.date ? `Ziua - ${formatDate(day.date)}` : 'Zi Media');

  return (
    <div className="space-y-6">
      
      {/* Breadcrumbs */}
      <Breadcrumbs
        items={[
          { label: day?.event?.season?.name || 'Sezon', href: `/seasons/${day?.event?.seasonId}` },
          { label: day?.event?.name || 'Eveniment', href: `/events/${day?.eventId}` },
          { label: dayTitle },
        ]}
      />

      {/* Header Banner */}
      <div className="platform-card p-4 sm:p-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 sm:gap-4">
        <div className="space-y-1">
          <div className="flex items-center space-x-2.5">
            <div className="p-2 sm:p-2.5 rounded-xl bg-platform-tertiary border border-platform-border shrink-0">
              <Images className="w-5 h-5 sm:w-6 sm:h-6 text-platform-green" />
            </div>
            <h1 className="text-lg sm:text-2xl font-bold font-display text-white">{dayTitle}</h1>
          </div>
          {day?.date && (
            <p className="text-xs sm:text-sm text-platform-textSecondary font-mono flex items-center space-x-2 mt-1">
              <Calendar className="w-3.5 h-3.5 text-platform-green shrink-0" />
              <span>Data: {formatDate(day.date)}</span>
            </p>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto justify-start sm:justify-end">
          {/* Move Day Button */}
          {canManage && (
            <button
              onClick={() => setShowMoveDayModal(true)}
              className="p-2.5 rounded-xl bg-platform-tertiary hover:bg-platform-border text-slate-300 hover:text-platform-green border border-platform-border text-xs font-semibold shadow transition flex items-center space-x-1.5 shrink-0 font-mono min-h-[38px]"
              title="Mută Ziua în alt Eveniment"
            >
              <ExternalLink className="w-4 h-4" />
              <span className="hidden sm:inline">Mută</span>
            </button>
          )}

          {/* Edit Day Button */}
          {canManage && (
            <button
              onClick={openEditDayModal}
              className="p-2.5 rounded-xl bg-platform-tertiary hover:bg-platform-border text-slate-300 hover:text-platform-green border border-platform-border text-xs font-semibold shadow transition flex items-center space-x-1.5 shrink-0 font-mono min-h-[38px]"
              title="Editează Ziua"
            >
              <Pencil className="w-4 h-4" />
              <span className="hidden sm:inline">Editează</span>
            </button>
          )}

          {/* Delete Day Button */}
          {canManage && (
            <button
              onClick={() => setShowDeleteDayModal(true)}
              className="p-2.5 rounded-xl bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/20 text-xs font-semibold shadow transition flex items-center space-x-1.5 shrink-0 font-mono min-h-[38px]"
              title="Șterge Ziua Curentă"
            >
              <Trash2 className="w-4 h-4" />
              <span className="hidden sm:inline">Șterge</span>
            </button>
          )}

          {/* Download Day ZIP */}
          <a
            href={`/api/download/day/${dayId}`}
            download
            className="px-3 py-2.5 rounded-xl bg-platform-tertiary hover:bg-platform-border text-platform-green border border-platform-border text-xs font-mono font-semibold shadow transition flex items-center space-x-1.5 shrink-0 min-h-[38px]"
          >
            <Download className="w-4 h-4" />
            <span>ZIP</span>
          </a>

          {/* Upload Button */}
          {canManage && (
            <button
              onClick={() => setShowUploadModal(true)}
              className="btn-platform-primary px-3.5 py-2.5 text-xs flex items-center justify-center space-x-1.5 shadow flex-1 sm:flex-initial min-h-[38px] font-semibold"
            >
              <UploadCloud className="w-4 h-4" />
              <span>Încarcă Poze/Video</span>
            </button>
          )}
        </div>
      </div>

      {/* Media Grid */}
      <MediaGrid
        assets={day?.mediaAssets || []}
        onDeleteAsset={handleDeleteAsset}
        onRefreshNeeded={fetchDayData}
        userRole={role}
      />

      {/* Move Day Modal */}
      {showMoveDayModal && day && (
        <MoveTargetModal
          isOpen={showMoveDayModal}
          mode="day"
          itemTitle={dayTitle}
          currentSeasonId={day.event?.seasonId}
          currentEventId={day.eventId}
          onClose={() => setShowMoveDayModal(false)}
          onConfirm={handleMoveDayConfirm}
        />
      )}

      {/* Upload Modal */}
      <MediaUploadModal
        dayId={dayId}
        isOpen={showUploadModal}
        onClose={() => setShowUploadModal(false)}
        onUploadSuccess={fetchDayData}
      />

      {/* Edit Day Modal (Admin / Editor) */}
      {showEditDayModal && day && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-platform-card border border-platform-border rounded-2xl w-full max-w-md p-6 space-y-4 shadow-2xl">
            <h3 className="font-bold text-lg font-display text-white flex items-center space-x-2">
              <Pencil className="w-5 h-5 text-platform-green" />
              <span>Editează Zi</span>
            </h3>

            <form onSubmit={handleEditDay} className="space-y-4">
              <div className="space-y-1">
                <label className="text-xs font-semibold uppercase text-platform-textSecondary font-mono">Dată</label>
                <input
                  type="date"
                  required
                  value={editDayDate}
                  onChange={(e) => setEditDayDate(e.target.value)}
                  className="w-full px-3 py-2 bg-platform-bg border border-platform-border rounded-xl text-xs text-white focus:outline-none focus:border-platform-green"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold uppercase text-platform-textSecondary font-mono">Etichetă Zi (Opțional)</label>
                <input
                  type="text"
                  placeholder="Ex: Ziua 1 - Inspecție"
                  value={editDayLabel}
                  onChange={(e) => setEditDayLabel(e.target.value)}
                  className="w-full px-3 py-2 bg-platform-bg border border-platform-border rounded-xl text-xs text-white focus:outline-none focus:border-platform-green"
                />
              </div>

              <div className="pt-2 flex items-center justify-end space-x-3">
                <button
                  type="button"
                  onClick={() => setShowEditDayModal(false)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-platform-textSecondary hover:bg-platform-tertiary transition"
                >
                  Anulează
                </button>
                <button
                  type="submit"
                  disabled={updatingDay}
                  className="btn-platform-primary px-4 py-2 text-xs flex items-center space-x-1"
                >
                  {updatingDay ? <Loader2 className="w-4 h-4 animate-spin" /> : <span>Salvează Modificările</span>}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Day Confirmation Modal */}
      {showDeleteDayModal && day && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-platform-card border border-red-500/30 rounded-2xl w-full max-w-md p-6 space-y-4 shadow-2xl">
            <div className="flex items-center space-x-3 text-red-400">
              <div className="p-2.5 rounded-xl bg-red-500/10 border border-red-500/20">
                <Trash2 className="w-6 h-6" />
              </div>
              <h3 className="font-bold text-lg font-display text-white">Ștergere Zi Curentă</h3>
            </div>

            <p className="text-xs text-slate-300 leading-relaxed">
              Ești sigur că vrei să ștergi ziua <strong className="text-white font-semibold">"{dayTitle}"</strong>?
              <br />
              <span className="text-red-400 font-mono text-[11px] block mt-2">
                ⚠️ Toate fișierele media aferente acestei zile vor fi șterse definitiv din baza de date și de pe disc.
              </span>
            </p>

            <div className="pt-2 flex items-center justify-end space-x-3">
              <button
                type="button"
                onClick={() => setShowDeleteDayModal(false)}
                disabled={deletingDay}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-platform-textSecondary hover:bg-platform-tertiary transition"
              >
                Anulează
              </button>
              <button
                type="button"
                onClick={handleDeleteDay}
                disabled={deletingDay}
                className="px-4 py-2 rounded-xl text-xs font-semibold bg-red-600 hover:bg-red-500 text-white flex items-center space-x-1.5 transition shadow"
              >
                {deletingDay ? <Loader2 className="w-4 h-4 animate-spin" /> : <span>Șterge Definitiv</span>}
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
