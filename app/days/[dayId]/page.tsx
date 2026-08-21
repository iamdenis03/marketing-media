'use client';

import React, { useState, useEffect } from 'react';
import { Breadcrumbs } from '@/components/Breadcrumbs';
import { MediaGrid } from '@/components/MediaGrid';
import { MediaUploadModal } from '@/components/MediaUploadModal';
import { MediaItem } from '@/components/Lightbox';
import { Calendar, UploadCloud, Download, Loader2, Images } from 'lucide-react';
import { useSession } from 'next-auth/react';
import { useParams } from 'next/navigation';

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

  const [day, setDay] = useState<DayDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [showUploadModal, setShowUploadModal] = useState(false);

  useEffect(() => {
    fetchDayData();
  }, [dayId]);

  const fetchDayData = async () => {
    try {
      const res = await fetch(`/api/days?eventId=`);
      // Or fetch assets for day
      const dRes = await fetch(`/api/days`);
      if (dRes.ok) {
        const days = await dRes.json();
        const found = days.find((d: any) => d.id === dayId);
        if (found) {
          // Fetch full day details with mediaAssets
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

  const role = (session?.user as any)?.role;

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24 text-slate-400 space-x-2">
        <Loader2 className="w-6 h-6 animate-spin text-blue-400" />
        <span>Se încarcă fișierele media...</span>
      </div>
    );
  }

  const dayTitle = day?.label || (day?.date ? `Ziua - ${new Date(day.date).toLocaleDateString('ro-RO')}` : 'Zi Media');

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
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-gradient-to-r from-slate-900 via-slate-900 to-blue-950/40 p-6 rounded-3xl border border-slate-800 shadow-xl">
        <div className="space-y-1">
          <div className="flex items-center space-x-2">
            <Images className="w-6 h-6 text-amber-400" />
            <h1 className="text-xl sm:text-2xl font-bold text-white">{dayTitle}</h1>
          </div>
          {day?.date && (
            <p className="text-xs sm:text-sm text-slate-400 flex items-center space-x-1.5">
              <Calendar className="w-3.5 h-3.5 text-amber-400" />
              <span>Data: {new Date(day.date).toLocaleDateString('ro-RO')}</span>
            </p>
          )}
        </div>

        <div className="flex items-center space-x-3">
          {/* Download Day ZIP */}
          <a
            href={`/api/download/day/${dayId}`}
            download
            className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-amber-400 border border-slate-700 text-xs font-semibold shadow transition flex items-center space-x-2 shrink-0"
          >
            <Download className="w-4 h-4" />
            <span>Descarcă ZIP Ziua</span>
          </a>

          {/* Upload Button */}
          {(role === 'ADMIN' || role === 'EDITOR') && (
            <button
              onClick={() => setShowUploadModal(true)}
              className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-blue-600 to-amber-600 hover:opacity-95 text-white text-xs font-semibold shadow transition flex items-center space-x-2 shrink-0"
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
        userRole={role}
      />

      {/* Upload Modal */}
      <MediaUploadModal
        dayId={dayId}
        isOpen={showUploadModal}
        onClose={() => setShowUploadModal(false)}
        onUploadSuccess={fetchDayData}
      />

    </div>
  );
}
