'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { Breadcrumbs } from '@/components/Breadcrumbs';
import { MediaGrid } from '@/components/MediaGrid';
import { MediaUploadModal } from '@/components/MediaUploadModal';
import { MoveTargetModal } from '@/components/MoveTargetModal';
import { CardActionMenu } from '@/components/CardActionMenu';
import { MediaItem } from '@/components/Lightbox';
import { Calendar, MapPin, Plus, ChevronRight, Download, Loader2, CalendarDays, Images, Trash2, Pencil, UploadCloud, ExternalLink } from 'lucide-react';
import { useSession } from 'next-auth/react';
import { useParams, useRouter } from 'next/navigation';
import { formatDate, toInputDateFormat } from '@/lib/utils';

interface DayItem {
  id: string;
  date: string;
  label?: string | null;
  _count?: { mediaAssets: number };
}

interface EventDetail {
  id: string;
  name: string;
  location: string;
  startDate: string;
  endDate: string;
  seasonId: string;
  season?: { name: string };
}

export default function EventDaysPage() {
  const { eventId } = useParams() as { eventId: string };
  const { data: session } = useSession();
  const router = useRouter();

  const [event, setEvent] = useState<EventDetail | null>(null);
  const [days, setDays] = useState<DayItem[]>([]);
  const [mediaAssets, setMediaAssets] = useState<MediaItem[]>([]);
  const [loading, setLoading] = useState(true);

  // Tabs / View mode
  const [viewMode, setViewMode] = useState<'days' | 'gallery'>('days');

  // Upload modal state
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [targetUploadDayId, setTargetUploadDayId] = useState<string>('');

  // Move States
  const [showMoveEventModal, setShowMoveEventModal] = useState(false);
  const [dayToMove, setDayToMove] = useState<DayItem | null>(null);

  // Create Day Modal
  const [showCreateDayModal, setShowCreateDayModal] = useState(false);

  // Edit Event State
  const [showEditEventModal, setShowEditEventModal] = useState(false);
  const [editEventName, setEditEventName] = useState('');
  const [editEventLocation, setEditEventLocation] = useState('');
  const [editEventStartDate, setEditEventStartDate] = useState('');
  const [editEventEndDate, setEditEventEndDate] = useState('');
  const [updatingEvent, setUpdatingEvent] = useState(false);

  // Edit Day State
  const [dayToEdit, setDayToEdit] = useState<DayItem | null>(null);
  const [editDayLabel, setEditDayLabel] = useState('');
  const [editDayDate, setEditDayDate] = useState('');
  const [updatingDay, setUpdatingDay] = useState(false);

  // Delete states
  const [dayToDelete, setDayToDelete] = useState<DayItem | null>(null);
  const [deletingDay, setDeletingDay] = useState(false);
  const [showDeleteEventModal, setShowDeleteEventModal] = useState(false);
  const [deletingEvent, setDeletingEvent] = useState(false);

  // Create Day Form state
  const [newDate, setNewDate] = useState('');
  const [newLabel, setNewLabel] = useState('');
  const [creatingDay, setCreatingDay] = useState(false);

  useEffect(() => {
    fetchData();
  }, [eventId]);

  const fetchData = async () => {
    try {
      const eRes = await fetch(`/api/events`);
      let currentEvent: EventDetail | null = null;
      if (eRes.ok) {
        const events = await eRes.json();
        const found = events.find((e: EventDetail) => e.id === eventId);
        if (found) {
          setEvent(found);
          currentEvent = found;
        }
      }

      const dRes = await fetch(`/api/days?eventId=${eventId}`);
      let currentDays: DayItem[] = [];
      if (dRes.ok) {
        currentDays = await dRes.json();
        setDays(currentDays);
      }

      // Fetch all media assets across days for direct event gallery view
      if (currentDays.length > 0) {
        const allMedia: MediaItem[] = [];
        for (const dayItem of currentDays) {
          const detailedRes = await fetch(`/api/days/detail?dayId=${dayItem.id}`);
          if (detailedRes.ok) {
            const data = await detailedRes.json();
            if (Array.isArray(data.mediaAssets)) {
              allMedia.push(...data.mediaAssets);
            }
          }
        }
        setMediaAssets(allMedia);
      }

      // If single day event, switch view mode to gallery by default
      if (currentDays.length === 1) {
        setViewMode('gallery');
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateDay = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreatingDay(true);

    try {
      const res = await fetch('/api/days', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          eventId,
          date: newDate,
          label: newLabel,
        }),
      });

      if (res.ok) {
        setNewDate('');
        setNewLabel('');
        setShowCreateDayModal(false);
        fetchData();
      } else {
        const err = await res.json();
        alert(err.error || 'A apărut o eroare la adăugarea zilei.');
      }
    } catch (err) {
      console.error(err);
    } finally {
      setCreatingDay(false);
    }
  };

  const handleMoveEventConfirm = async (target: { seasonId?: string }) => {
    if (!event || !target.seasonId) return;

    try {
      const res = await fetch(`/api/events/${event.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          targetSeasonId: target.seasonId,
        }),
      });

      if (res.ok) {
        setShowMoveEventModal(false);
        router.push(`/seasons/${target.seasonId}`);
      } else {
        const err = await res.json();
        alert(err.error || 'A apărut o eroare la mutarea evenimentului.');
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleMoveDayConfirm = async (target: { eventId?: string }) => {
    if (!dayToMove || !target.eventId) return;

    try {
      const res = await fetch(`/api/days/${dayToMove.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          targetEventId: target.eventId,
        }),
      });

      if (res.ok) {
        setDayToMove(null);
        fetchData();
      } else {
        const err = await res.json();
        alert(err.error || 'A apărut o eroare la mutarea zilei.');
      }
    } catch (err) {
      console.error(err);
    }
  };

  const openEditEventModal = () => {
    if (!event) return;
    setEditEventName(event.name);
    setEditEventLocation(event.location);
    setEditEventStartDate(toInputDateFormat(event.startDate));
    setEditEventEndDate(toInputDateFormat(event.endDate));
    setShowEditEventModal(true);
  };

  const handleEditEvent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!event) return;
    setUpdatingEvent(true);

    try {
      const res = await fetch(`/api/events/${event.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: editEventName,
          location: editEventLocation,
          startDate: editEventStartDate,
          endDate: editEventEndDate,
        }),
      });

      if (res.ok) {
        setShowEditEventModal(false);
        fetchData();
      } else {
        const err = await res.json();
        alert(err.error || 'A apărut o eroare la salvarea modificărilor.');
      }
    } catch (err) {
      console.error(err);
    } finally {
      setUpdatingEvent(false);
    }
  };

  const openEditDayModal = (day: DayItem) => {
    setDayToEdit(day);
    setEditDayLabel(day.label || '');
    setEditDayDate(toInputDateFormat(day.date));
  };

  const handleEditDay = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!dayToEdit) return;
    setUpdatingDay(true);

    try {
      const res = await fetch(`/api/days/${dayToEdit.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          label: editDayLabel,
          date: editDayDate,
        }),
      });

      if (res.ok) {
        setDayToEdit(null);
        fetchData();
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

  const handleOpenDirectUpload = async () => {
    let dayIdToUse = days[0]?.id;

    if (!dayIdToUse && event) {
      try {
        const res = await fetch('/api/days', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            eventId,
            date: event.startDate,
            label: 'Eveniment',
          }),
        });

        if (res.ok) {
          const createdDay = await res.json();
          dayIdToUse = createdDay.id;
          fetchData();
        }
      } catch (err) {
        console.error('Error auto-creating day for upload:', err);
      }
    }

    if (dayIdToUse) {
      setTargetUploadDayId(dayIdToUse);
      setShowUploadModal(true);
    }
  };

  const handleDeleteAsset = async (assetId: string) => {
    try {
      const res = await fetch(`/api/media/${assetId}`, {
        method: 'DELETE',
      });

      if (res.ok) {
        fetchData();
      } else {
        const err = await res.json();
        alert(err.error || 'A apărut o eroare la ștergere.');
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleDeleteDay = async () => {
    if (!dayToDelete) return;
    setDeletingDay(true);

    try {
      const res = await fetch(`/api/days/${dayToDelete.id}`, {
        method: 'DELETE',
      });

      if (res.ok) {
        setDayToDelete(null);
        fetchData();
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

  const handleDeleteEvent = async () => {
    setDeletingEvent(true);

    try {
      const res = await fetch(`/api/events/${eventId}`, {
        method: 'DELETE',
      });

      if (res.ok) {
        setShowDeleteEventModal(false);
        router.push(event?.seasonId ? `/seasons/${event.seasonId}` : '/');
      } else {
        const err = await res.json();
        alert(err.error || 'A apărut o eroare la ștergerea evenimentului.');
      }
    } catch (err) {
      console.error(err);
    } finally {
      setDeletingEvent(false);
    }
  };

  const role = (session?.user as any)?.role;
  const canManage = role === 'ADMIN' || role === 'EDITOR';

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24 text-platform-textSecondary space-x-2">
        <Loader2 className="w-6 h-6 animate-spin text-platform-green" />
        <span className="font-mono text-sm">Se încarcă evenimentul...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      
      {/* Breadcrumbs */}
      <Breadcrumbs
        items={[
          { label: event?.season?.name || 'Sezon', href: `/seasons/${event?.seasonId}` },
          { label: event?.name || 'Eveniment' },
        ]}
      />

      {/* Event Header Banner */}
      <div className="platform-card p-4 sm:p-6 flex flex-col md:flex-row items-start md:items-center justify-between gap-3 sm:gap-4">
        <div className="space-y-1">
          <div className="flex items-center space-x-2.5">
            <h1 className="text-lg sm:text-2xl font-bold font-display text-white">{event?.name}</h1>
          </div>
          <div className="flex flex-wrap items-center gap-3 sm:gap-4 text-xs text-platform-textSecondary font-mono pt-1">
            <span className="flex items-center space-x-1.5">
              <MapPin className="w-3.5 h-3.5 text-platform-blue shrink-0" />
              <span>{event?.location}</span>
            </span>
            {event && (
              <span className="flex items-center space-x-1.5">
                <Calendar className="w-3.5 h-3.5 text-platform-green shrink-0" />
                <span>
                  {formatDate(event.startDate)} - {formatDate(event.endDate)}
                </span>
              </span>
            )}
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2 w-full md:w-auto justify-start sm:justify-end">
          {/* Move Event Button */}
          {canManage && (
            <button
              onClick={() => setShowMoveEventModal(true)}
              className="p-2.5 rounded-xl bg-platform-tertiary hover:bg-platform-border text-slate-300 hover:text-platform-green border border-platform-border text-xs font-semibold shadow transition flex items-center space-x-1.5 shrink-0 font-mono min-h-[38px]"
              title="Mută Evenimentul în alt Sezon"
            >
              <ExternalLink className="w-4 h-4" />
              <span className="hidden sm:inline">Mută</span>
            </button>
          )}

          {/* Edit Event Button */}
          {canManage && (
            <button
              onClick={openEditEventModal}
              className="p-2.5 rounded-xl bg-platform-tertiary hover:bg-platform-border text-slate-300 hover:text-platform-green border border-platform-border text-xs font-semibold shadow transition flex items-center space-x-1.5 shrink-0 font-mono min-h-[38px]"
              title="Editează Eveniment"
            >
              <Pencil className="w-4 h-4" />
              <span className="hidden sm:inline">Editează</span>
            </button>
          )}

          {/* Delete Event Button */}
          {canManage && (
            <button
              onClick={() => setShowDeleteEventModal(true)}
              className="p-2.5 rounded-xl bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/20 text-xs font-semibold shadow transition flex items-center space-x-1.5 shrink-0 font-mono min-h-[38px]"
              title="Șterge Evenimentul Curent"
            >
              <Trash2 className="w-4 h-4" />
              <span className="hidden sm:inline">Șterge</span>
            </button>
          )}

          {/* Download Event ZIP */}
          <a
            href={`/api/download/event/${eventId}`}
            download
            className="px-3 py-2.5 rounded-xl bg-platform-tertiary hover:bg-platform-border text-platform-green border border-platform-border text-xs font-semibold shadow transition flex items-center space-x-1.5 shrink-0 font-mono min-h-[38px]"
            title="Descarcă toate fișierele ca ZIP"
          >
            <Download className="w-4 h-4" />
            <span>ZIP</span>
          </a>

          {/* Direct Upload Button */}
          {canManage && (
            <button
              onClick={handleOpenDirectUpload}
              className="btn-platform-primary px-3.5 py-2.5 text-xs flex items-center justify-center space-x-1.5 shadow flex-1 sm:flex-initial min-h-[38px] font-semibold"
            >
              <UploadCloud className="w-4 h-4" />
              <span>Încarcă Poze/Video</span>
            </button>
          )}
        </div>
      </div>

      {/* Tab Navigation / View Modes */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between border-b border-platform-border pb-3 gap-2">
        <div className="flex items-center space-x-1.5 overflow-x-auto scrollbar-none py-0.5">
          <button
            onClick={() => setViewMode('gallery')}
            className={`px-3 py-2 rounded-xl text-xs font-mono font-semibold transition flex items-center space-x-1.5 shrink-0 min-h-[36px] ${
              viewMode === 'gallery'
                ? 'bg-platform-green/20 text-platform-green border border-platform-green/40'
                : 'bg-platform-card text-platform-textSecondary border border-platform-border hover:text-white'
            }`}
          >
            <Images className="w-3.5 h-3.5" />
            <span>Galerie Directă ({mediaAssets.length})</span>
          </button>

          <button
            onClick={() => setViewMode('days')}
            className={`px-3 py-2 rounded-xl text-xs font-mono font-semibold transition flex items-center space-x-1.5 shrink-0 min-h-[36px] ${
              viewMode === 'days'
                ? 'bg-platform-green/20 text-platform-green border border-platform-green/40'
                : 'bg-platform-card text-platform-textSecondary border border-platform-border hover:text-white'
            }`}
          >
            <CalendarDays className="w-3.5 h-3.5" />
            <span>Zile Eveniment ({days.length})</span>
          </button>
        </div>

        {canManage && viewMode === 'days' && (
          <button
            onClick={() => setShowCreateDayModal(true)}
            className="px-3.5 py-2 rounded-xl bg-platform-tertiary hover:bg-platform-border text-platform-green border border-platform-border text-xs font-semibold shadow transition flex items-center justify-center space-x-1 font-mono shrink-0 min-h-[36px]"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Adaugă Zi</span>
          </button>
        )}
      </div>

      {/* VIEW MODE: GALLERY */}
      {viewMode === 'gallery' && (
        <div className="space-y-4">
          <MediaGrid
            assets={mediaAssets}
            onDeleteAsset={handleDeleteAsset}
            onRefreshNeeded={fetchData}
            userRole={role}
          />
        </div>
      )}

      {/* VIEW MODE: DAYS GRID */}
      {viewMode === 'days' && (
        <>
          {days.length === 0 ? (
            <div className="platform-card text-center py-16 space-y-3">
              <CalendarDays className="w-12 h-12 text-platform-textMuted mx-auto" />
              <h3 className="text-slate-200 font-semibold text-sm">Nu sunt zile separate configurate</h3>
              <p className="text-xs text-platform-textSecondary">
                Poți adăuga o zi sau poți încărca poze direct pe eveniment folosind butonul din antet.
              </p>
              {canManage && (
                <button
                  onClick={handleOpenDirectUpload}
                  className="btn-platform-primary px-4 py-2 text-xs inline-flex items-center space-x-2 shadow mt-2"
                >
                  <UploadCloud className="w-4 h-4" />
                  <span>Încarcă Poze Direct</span>
                </button>
              )}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {days.map((day) => (
                <div
                  key={day.id}
                  className="platform-card p-6 flex flex-col justify-between group hover:border-platform-green/60 transition-all duration-300 shadow-md relative"
                >
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <span className="px-3 py-1 rounded-full bg-platform-green/10 border border-platform-green/20 text-platform-green text-xs font-mono font-semibold flex items-center space-x-1.5">
                        <Images className="w-3.5 h-3.5" />
                        <span>{day._count?.mediaAssets || 0} Fișiere Media</span>
                      </span>

                      <div className="flex items-center space-x-1.5">
                        {canManage && (
                          <CardActionMenu
                            actions={[
                              {
                                label: 'Mută în alt Eveniment',
                                icon: <ExternalLink className="w-4 h-4 text-platform-green" />,
                                onClick: () => setDayToMove(day),
                                variant: 'primary' as const,
                              },
                              {
                                label: 'Editează Zi',
                                icon: <Pencil className="w-4 h-4" />,
                                onClick: () => openEditDayModal(day),
                              },
                              {
                                label: 'Descarcă ZIP Zi',
                                icon: <Download className="w-4 h-4" />,
                                onClick: () => {},
                                href: `/api/download/day/${day.id}`,
                                download: true,
                              },
                              {
                                label: 'Șterge Zi',
                                icon: <Trash2 className="w-4 h-4" />,
                                onClick: () => setDayToDelete(day),
                                variant: 'danger' as const,
                              },
                            ]}
                          />
                        )}
                        <Link href={`/days/${day.id}`}>
                          <ChevronRight className="w-5 h-5 text-platform-textMuted group-hover:text-platform-green group-hover:translate-x-1 transition" />
                        </Link>
                      </div>
                    </div>

                    <Link href={`/days/${day.id}`} className="block">
                      <h2 className="text-lg font-bold font-display text-white group-hover:text-platform-green transition-colors">
                        {day.label || `Ziua - ${formatDate(day.date)}`}
                      </h2>
                    </Link>
                  </div>

                  <div className="mt-6 pt-4 border-t border-platform-border/80 flex items-center justify-between text-xs text-platform-textSecondary font-mono">
                    <span className="flex items-center space-x-1.5">
                      <Calendar className="w-3.5 h-3.5 text-platform-green" />
                      <span>{formatDate(day.date)}</span>
                    </span>
                    
                    <Link href={`/days/${day.id}`} className="text-xs font-semibold text-platform-green group-hover:underline">
                      Deschide Galeria →
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      )}

      {/* Move Event Modal */}
      {showMoveEventModal && event && (
        <MoveTargetModal
          isOpen={showMoveEventModal}
          mode="event"
          itemTitle={event.name}
          currentSeasonId={event.seasonId}
          onClose={() => setShowMoveEventModal(false)}
          onConfirm={handleMoveEventConfirm}
        />
      )}

      {/* Move Day Modal */}
      {dayToMove && (
        <MoveTargetModal
          isOpen={Boolean(dayToMove)}
          mode="day"
          itemTitle={dayToMove.label || formatDate(dayToMove.date)}
          currentSeasonId={event?.seasonId}
          currentEventId={eventId}
          onClose={() => setDayToMove(null)}
          onConfirm={handleMoveDayConfirm}
        />
      )}

      {/* Direct Upload Modal */}
      {showUploadModal && targetUploadDayId && (
        <MediaUploadModal
          dayId={targetUploadDayId}
          isOpen={showUploadModal}
          onClose={() => setShowUploadModal(false)}
          onUploadSuccess={fetchData}
        />
      )}

      {/* Create Day Modal */}
      {showCreateDayModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-platform-card border border-platform-border rounded-2xl w-full max-w-md p-6 space-y-4 shadow-2xl">
            <h3 className="font-bold text-lg font-display text-white flex items-center space-x-2">
              <Plus className="w-5 h-5 text-platform-green" />
              <span>Adaugă Zi Manual</span>
            </h3>

            <form onSubmit={handleCreateDay} className="space-y-4">
              <div className="space-y-1">
                <label className="text-xs font-semibold uppercase text-platform-textSecondary font-mono">Dată</label>
                <input
                  type="date"
                  required
                  value={newDate}
                  onChange={(e) => setNewDate(e.target.value)}
                  className="w-full px-3 py-2 bg-platform-bg border border-platform-border rounded-xl text-xs text-white focus:outline-none focus:border-platform-green"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold uppercase text-platform-textSecondary font-mono">Etichetă Zi (Opțional)</label>
                <input
                  type="text"
                  placeholder="Ex: Ziua 1 - Inspecție & Pits"
                  value={newLabel}
                  onChange={(e) => setNewLabel(e.target.value)}
                  className="w-full px-3 py-2 bg-platform-bg border border-platform-border rounded-xl text-xs text-white focus:outline-none focus:border-platform-green"
                />
              </div>

              <div className="pt-2 flex items-center justify-end space-x-3">
                <button
                  type="button"
                  onClick={() => setShowCreateDayModal(false)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-platform-textSecondary hover:bg-platform-tertiary transition"
                >
                  Anulează
                </button>
                <button
                  type="submit"
                  disabled={creatingDay}
                  className="btn-platform-primary px-4 py-2 text-xs flex items-center space-x-1"
                >
                  {creatingDay ? <Loader2 className="w-4 h-4 animate-spin" /> : <span>Salvează</span>}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Event Modal (Admin / Editor) */}
      {showEditEventModal && event && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-platform-card border border-platform-border rounded-2xl w-full max-w-md p-6 space-y-4 shadow-2xl">
            <h3 className="font-bold text-lg font-display text-white flex items-center space-x-2">
              <Pencil className="w-5 h-5 text-platform-green" />
              <span>Editează Eveniment</span>
            </h3>

            <form onSubmit={handleEditEvent} className="space-y-4">
              <div className="space-y-1">
                <label className="text-xs font-semibold uppercase text-platform-textSecondary font-mono">Nume Eveniment</label>
                <input
                  type="text"
                  required
                  value={editEventName}
                  onChange={(e) => setEditEventName(e.target.value)}
                  className="w-full px-3 py-2 bg-platform-bg border border-platform-border rounded-xl text-xs text-white focus:outline-none focus:border-platform-green"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold uppercase text-platform-textSecondary font-mono">Locație</label>
                <input
                  type="text"
                  required
                  value={editEventLocation}
                  onChange={(e) => setEditEventLocation(e.target.value)}
                  className="w-full px-3 py-2 bg-platform-bg border border-platform-border rounded-xl text-xs text-white focus:outline-none focus:border-platform-green"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-xs font-semibold uppercase text-platform-textSecondary font-mono">Data Început</label>
                  <input
                    type="date"
                    required
                    value={editEventStartDate}
                    onChange={(e) => setEditEventStartDate(e.target.value)}
                    className="w-full px-3 py-2 bg-platform-bg border border-platform-border rounded-xl text-xs text-white focus:outline-none focus:border-platform-green"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-semibold uppercase text-platform-textSecondary font-mono">Data Sfârșit</label>
                  <input
                    type="date"
                    required
                    value={editEventEndDate}
                    onChange={(e) => setEditEventEndDate(e.target.value)}
                    className="w-full px-3 py-2 bg-platform-bg border border-platform-border rounded-xl text-xs text-white focus:outline-none focus:border-platform-green"
                  />
                </div>
              </div>

              <div className="pt-2 flex items-center justify-end space-x-3">
                <button
                  type="button"
                  onClick={() => setShowEditEventModal(false)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-platform-textSecondary hover:bg-platform-tertiary transition"
                >
                  Anulează
                </button>
                <button
                  type="submit"
                  disabled={updatingEvent}
                  className="btn-platform-primary px-4 py-2 text-xs flex items-center space-x-1"
                >
                  {updatingEvent ? <Loader2 className="w-4 h-4 animate-spin" /> : <span>Salvează Modificările</span>}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Day Modal (Admin / Editor) */}
      {dayToEdit && (
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
                  onClick={() => setDayToEdit(null)}
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
      {dayToDelete && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-platform-card border border-red-500/30 rounded-2xl w-full max-w-md p-6 space-y-4 shadow-2xl">
            <div className="flex items-center space-x-3 text-red-400">
              <div className="p-2.5 rounded-xl bg-red-500/10 border border-red-500/20">
                <Trash2 className="w-6 h-6" />
              </div>
              <h3 className="font-bold text-lg font-display text-white">Ștergere Zi</h3>
            </div>

            <p className="text-xs text-slate-300 leading-relaxed">
              Ești sigur că vrei să ștergi ziua <strong className="text-white font-semibold">"{dayToDelete.label || formatDate(dayToDelete.date)}"</strong>?
              <br />
              <span className="text-red-400 font-mono text-[11px] block mt-2">
                ⚠️ Toate fișierele media aferente acestei zile vor fi șterse definitiv din baza de date și de pe disc.
              </span>
            </p>

            <div className="pt-2 flex items-center justify-end space-x-3">
              <button
                type="button"
                onClick={() => setDayToDelete(null)}
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

      {/* Delete Event Confirmation Modal */}
      {showDeleteEventModal && event && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-platform-card border border-red-500/30 rounded-2xl w-full max-w-md p-6 space-y-4 shadow-2xl">
            <div className="flex items-center space-x-3 text-red-400">
              <div className="p-2.5 rounded-xl bg-red-500/10 border border-red-500/20">
                <Trash2 className="w-6 h-6" />
              </div>
              <h3 className="font-bold text-lg font-display text-white">Ștergere Eveniment Curent</h3>
            </div>

            <p className="text-xs text-slate-300 leading-relaxed">
              Ești sigur că vrei să ștergi evenimentul <strong className="text-white font-semibold">"{event.name}"</strong>?
              <br />
              <span className="text-red-400 font-mono text-[11px] block mt-2">
                ⚠️ Toate zilele și fișierele media aferente acestui eveniment vor fi șterse definitiv.
              </span>
            </p>

            <div className="pt-2 flex items-center justify-end space-x-3">
              <button
                type="button"
                onClick={() => setShowDeleteEventModal(false)}
                disabled={deletingEvent}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-platform-textSecondary hover:bg-platform-tertiary transition"
              >
                Anulează
              </button>
              <button
                type="button"
                onClick={handleDeleteEvent}
                disabled={deletingEvent}
                className="px-4 py-2 rounded-xl text-xs font-semibold bg-red-600 hover:bg-red-500 text-white flex items-center space-x-1.5 transition shadow"
              >
                {deletingEvent ? <Loader2 className="w-4 h-4 animate-spin" /> : <span>Șterge Definitiv</span>}
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
