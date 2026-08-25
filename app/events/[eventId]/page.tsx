'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { Breadcrumbs } from '@/components/Breadcrumbs';
import { Calendar, MapPin, Plus, ChevronRight, Download, Loader2, CalendarDays, Images, Trash2 } from 'lucide-react';
import { useSession } from 'next-auth/react';
import { useParams, useRouter } from 'next/navigation';

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
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);

  // Delete states
  const [dayToDelete, setDayToDelete] = useState<DayItem | null>(null);
  const [deletingDay, setDeletingDay] = useState(false);
  const [showDeleteEventModal, setShowDeleteEventModal] = useState(false);
  const [deletingEvent, setDeletingEvent] = useState(false);

  // Form state
  const [date, setDate] = useState('');
  const [label, setLabel] = useState('');
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    fetchData();
  }, [eventId]);

  const fetchData = async () => {
    try {
      const eRes = await fetch(`/api/events`);
      if (eRes.ok) {
        const events = await eRes.json();
        const found = events.find((e: EventDetail) => e.id === eventId);
        if (found) setEvent(found);
      }

      const dRes = await fetch(`/api/days?eventId=${eventId}`);
      if (dRes.ok) {
        const dData = await dRes.json();
        setDays(dData);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateDay = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreating(true);

    try {
      const res = await fetch('/api/days', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          eventId,
          date,
          label,
        }),
      });

      if (res.ok) {
        setDate('');
        setLabel('');
        setShowCreateModal(false);
        fetchData();
      } else {
        const err = await res.json();
        alert(err.error || 'A apărut o eroare la adăugarea zilei.');
      }
    } catch (err) {
      console.error(err);
    } finally {
      setCreating(false);
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
        <span className="font-mono text-sm">Se încarcă zilele...</span>
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
      <div className="platform-card p-6 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="space-y-1">
          <h1 className="text-xl sm:text-2xl font-bold font-display text-white">{event?.name}</h1>
          <div className="flex flex-wrap items-center gap-4 text-xs text-platform-textSecondary font-mono">
            <span className="flex items-center space-x-1.5">
              <MapPin className="w-3.5 h-3.5 text-platform-blue" />
              <span>{event?.location}</span>
            </span>
            {event && (
              <span className="flex items-center space-x-1.5">
                <Calendar className="w-3.5 h-3.5 text-platform-green" />
                <span>
                  {new Date(event.startDate).toLocaleDateString('ro-RO')} - {new Date(event.endDate).toLocaleDateString('ro-RO')}
                </span>
              </span>
            )}
          </div>
        </div>

        <div className="flex items-center space-x-3">
          {/* Delete Event Button */}
          {canManage && (
            <button
              onClick={() => setShowDeleteEventModal(true)}
              className="p-2.5 rounded-xl bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/20 text-xs font-semibold shadow transition flex items-center space-x-1.5 shrink-0 font-mono"
              title="Șterge Evenimentul Curent"
            >
              <Trash2 className="w-4 h-4" />
              <span className="hidden sm:inline">Șterge Eveniment</span>
            </button>
          )}

          {/* Download Event ZIP */}
          <a
            href={`/api/download/event/${eventId}`}
            download
            className="px-4 py-2.5 rounded-xl bg-platform-tertiary hover:bg-platform-border text-platform-green border border-platform-border text-xs font-semibold shadow transition flex items-center space-x-2 shrink-0 font-mono"
          >
            <Download className="w-4 h-4" />
            <span>ZIP Tot Evenimentul</span>
          </a>

          {canManage && (
            <button
              onClick={() => setShowCreateModal(true)}
              className="btn-platform-primary px-4 py-2.5 text-xs flex items-center space-x-2 shrink-0 shadow"
            >
              <Plus className="w-4 h-4" />
              <span>Adaugă Zi Nouă</span>
            </button>
          )}
        </div>
      </div>

      {/* Days Grid */}
      {days.length === 0 ? (
        <div className="platform-card text-center py-16">
          <CalendarDays className="w-12 h-12 text-platform-textMuted mx-auto mb-3" />
          <h3 className="text-slate-200 font-semibold text-sm">Nu sunt zile adăugate pentru acest eveniment</h3>
          <p className="text-xs text-platform-textSecondary mt-1">Adaugă o zi pentru a putea încărca fișiere media.</p>
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

                  <div className="flex items-center space-x-1">
                    {canManage && (
                      <button
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          setDayToDelete(day);
                        }}
                        className="p-1.5 rounded-lg bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/20 transition"
                        title="Șterge Zi"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                    <Link href={`/days/${day.id}`}>
                      <ChevronRight className="w-5 h-5 text-platform-textMuted group-hover:text-platform-green group-hover:translate-x-1 transition" />
                    </Link>
                  </div>
                </div>

                <Link href={`/days/${day.id}`} className="block">
                  <h2 className="text-lg font-bold font-display text-white group-hover:text-platform-green transition-colors">
                    {day.label || `Ziua - ${new Date(day.date).toLocaleDateString('ro-RO')}`}
                  </h2>
                </Link>
              </div>

              <div className="mt-6 pt-4 border-t border-platform-border/80 flex items-center justify-between text-xs text-platform-textSecondary font-mono">
                <span className="flex items-center space-x-1.5">
                  <Calendar className="w-3.5 h-3.5 text-platform-green" />
                  <span>{new Date(day.date).toLocaleDateString('ro-RO')}</span>
                </span>
                
                <Link href={`/days/${day.id}`} className="text-xs font-semibold text-platform-green group-hover:underline">
                  Deschide Galeria →
                </Link>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Create Day Modal */}
      {showCreateModal && (
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
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  className="w-full px-3 py-2 bg-platform-bg border border-platform-border rounded-xl text-xs text-white focus:outline-none focus:border-platform-green"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold uppercase text-platform-textSecondary font-mono">Etichetă Zi (Opțional)</label>
                <input
                  type="text"
                  placeholder="Ex: Ziua 1 - Inspecție & Pits"
                  value={label}
                  onChange={(e) => setLabel(e.target.value)}
                  className="w-full px-3 py-2 bg-platform-bg border border-platform-border rounded-xl text-xs text-white focus:outline-none focus:border-platform-green"
                />
              </div>

              <div className="pt-2 flex items-center justify-end space-x-3">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-platform-textSecondary hover:bg-platform-tertiary transition"
                >
                  Anulează
                </button>
                <button
                  type="submit"
                  disabled={creating}
                  className="btn-platform-primary px-4 py-2 text-xs flex items-center space-x-1"
                >
                  {creating ? <Loader2 className="w-4 h-4 animate-spin" /> : <span>Salvează</span>}
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
              Ești sigur că vrei să ștergi ziua <strong className="text-white font-semibold">"{dayToDelete.label || new Date(dayToDelete.date).toLocaleDateString('ro-RO')}"</strong>?
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

