'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { Breadcrumbs } from '@/components/Breadcrumbs';
import { Calendar, MapPin, Plus, ChevronRight, Download, Loader2, CalendarDays, Images } from 'lucide-react';
import { useSession } from 'next-auth/react';
import { useParams } from 'next/navigation';

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

  const [event, setEvent] = useState<EventDetail | null>(null);
  const [days, setDays] = useState<DayItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);

  // Form state
  const [date, setDate] = useState('');
  const [label, setLabel] = useState('');
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    fetchData();
  }, [eventId]);

  const fetchData = async () => {
    try {
      // Fetch event detail
      const eRes = await fetch(`/api/events`);
      if (eRes.ok) {
        const events = await eRes.json();
        const found = events.find((e: EventDetail) => e.id === eventId);
        if (found) setEvent(found);
      }

      // Fetch days for event
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

  const role = (session?.user as any)?.role;

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24 text-slate-400 space-x-2">
        <Loader2 className="w-6 h-6 animate-spin text-blue-400" />
        <span>Se încarcă zilele...</span>
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
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 bg-gradient-to-r from-slate-900 via-slate-900 to-blue-950/40 p-6 rounded-3xl border border-slate-800 shadow-xl">
        <div className="space-y-1">
          <h1 className="text-xl sm:text-2xl font-bold text-white">{event?.name}</h1>
          <div className="flex flex-wrap items-center gap-4 text-xs text-slate-400">
            <span className="flex items-center space-x-1">
              <MapPin className="w-3.5 h-3.5 text-blue-400" />
              <span>{event?.location}</span>
            </span>
            {event && (
              <span className="flex items-center space-x-1">
                <Calendar className="w-3.5 h-3.5 text-amber-400" />
                <span>
                  {new Date(event.startDate).toLocaleDateString('ro-RO')} - {new Date(event.endDate).toLocaleDateString('ro-RO')}
                </span>
              </span>
            )}
          </div>
        </div>

        <div className="flex items-center space-x-3">
          {/* Download Event ZIP */}
          <a
            href={`/api/download/event/${eventId}`}
            download
            className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-amber-400 border border-slate-700 text-xs font-semibold shadow transition flex items-center space-x-2 shrink-0"
          >
            <Download className="w-4 h-4" />
            <span>ZIP Tot Evenimentul</span>
          </a>

          {(role === 'ADMIN' || role === 'EDITOR') && (
            <button
              onClick={() => setShowCreateModal(true)}
              className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-blue-600 to-amber-600 hover:opacity-95 text-white text-xs font-semibold shadow transition flex items-center space-x-2 shrink-0"
            >
              <Plus className="w-4 h-4" />
              <span>Adaugă Zi Nouă</span>
            </button>
          )}
        </div>
      </div>

      {/* Days Grid */}
      {days.length === 0 ? (
        <div className="text-center py-16 bg-slate-900/30 rounded-3xl border border-slate-800">
          <CalendarDays className="w-12 h-12 text-slate-600 mx-auto mb-3" />
          <h3 className="text-slate-300 font-semibold text-sm">Nu sunt zile adăugate pentru acest eveniment</h3>
          <p className="text-xs text-slate-500 mt-1">Adaugă o zi pentru a putea încărca fișiere media.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {days.map((day) => (
            <Link
              key={day.id}
              href={`/days/${day.id}`}
              className="group bg-slate-900/80 hover:bg-slate-900 border border-slate-800 hover:border-blue-500/50 p-6 rounded-3xl transition-all duration-300 shadow-lg hover:shadow-2xl hover:shadow-blue-500/10 flex flex-col justify-between"
            >
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="px-3 py-1 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-400 text-xs font-semibold flex items-center space-x-1">
                    <Images className="w-3.5 h-3.5" />
                    <span>{day._count?.mediaAssets || 0} Fișiere Media</span>
                  </span>
                  <ChevronRight className="w-5 h-5 text-slate-600 group-hover:text-blue-400 group-hover:translate-x-1 transition" />
                </div>

                <h2 className="text-lg font-bold text-white group-hover:text-amber-400 transition">
                  {day.label || `Ziua - ${new Date(day.date).toLocaleDateString('ro-RO')}`}
                </h2>
              </div>

              <div className="mt-6 pt-4 border-t border-slate-800/80 flex items-center justify-between text-xs text-slate-400">
                <span className="flex items-center space-x-1">
                  <Calendar className="w-3.5 h-3.5 text-amber-400" />
                  <span>{new Date(day.date).toLocaleDateString('ro-RO')}</span>
                </span>
                
                <span className="text-xs font-semibold text-blue-400 group-hover:underline">
                  Deschide Galeria →
                </span>
              </div>
            </Link>
          ))}
        </div>
      )}

      {/* Create Day Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-md p-6 space-y-4 shadow-2xl">
            <h3 className="font-bold text-lg text-white flex items-center space-x-2">
              <Plus className="w-5 h-5 text-amber-400" />
              <span>Adaugă Zi Manual</span>
            </h3>

            <form onSubmit={handleCreateDay} className="space-y-4">
              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-300">Dată</label>
                <input
                  type="date"
                  required
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-blue-500"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-300">Etichetă Zi (Opțional)</label>
                <input
                  type="text"
                  placeholder="Ex: Ziua 1 - Inspecție & Pits"
                  value={label}
                  onChange={(e) => setLabel(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-blue-500"
                />
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
