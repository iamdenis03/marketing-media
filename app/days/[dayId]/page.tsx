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
      <div className="flex items-center justify-center py-24 text-platform-textSecondary space-x-2">
        <Loader2 className="w-6 h-6 animate-spin text-platform-green" />
        <span className="font-mono text-sm">Se încarcă fișierele media...</span>
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
      <div className="platform-card p-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center space-x-3">
            <div className="p-2.5 rounded-xl bg-platform-tertiary border border-platform-border">
              <Images className="w-6 h-6 text-platform-green" />
            </div>
            <h1 className="text-xl sm:text-2xl font-bold font-display text-white">{dayTitle}</h1>
          </div>
          {day?.date && (
            <p className="text-xs sm:text-sm text-platform-textSecondary font-mono flex items-center space-x-2 mt-1">
              <Calendar className="w-3.5 h-3.5 text-platform-green" />
              <span>Data: {new Date(day.date).toLocaleDateString('ro-RO')}</span>
            </p>
          )}
        </div>

        <div className="flex items-center space-x-3">
          {/* Download Day ZIP */}
          <a
            href={`/api/download/day/${dayId}`}
            download
            className="px-4 py-2.5 rounded-xl bg-platform-tertiary hover:bg-platform-border text-platform-green border border-platform-border text-xs font-mono font-semibold shadow transition flex items-center space-x-2 shrink-0"
          >
            <Download className="w-4 h-4" />
            <span>Descarcă ZIP Ziua</span>
          </a>

          {/* Upload Button */}
          {(role === 'ADMIN' || role === 'EDITOR') && (
            <button
              onClick={() => setShowUploadModal(true)}
              className="btn-platform-primary px-4 py-2.5 text-xs flex items-center space-x-2 shrink-0 shadow"
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
