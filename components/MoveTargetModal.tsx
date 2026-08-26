'use client';

import React, { useState, useEffect } from 'react';
import { X, FolderKanban, CalendarDays, Images, ArrowRight, Loader2, Folder, Check } from 'lucide-react';
import { formatDate } from '@/lib/utils';

export interface StructureSeason {
  id: string;
  name: string;
  events: {
    id: string;
    name: string;
    days: {
      id: string;
      date: string;
      label?: string | null;
    }[];
  }[];
}

interface MoveTargetModalProps {
  isOpen: boolean;
  mode: 'media' | 'day' | 'event';
  itemTitle: string;
  currentSeasonId?: string;
  currentEventId?: string;
  currentDayId?: string;
  onClose: () => void;
  onConfirm: (target: { seasonId?: string; eventId?: string; dayId?: string }) => Promise<void>;
}

export function MoveTargetModal({
  isOpen,
  mode,
  itemTitle,
  currentSeasonId,
  currentEventId,
  currentDayId,
  onClose,
  onConfirm,
}: MoveTargetModalProps) {
  const [structure, setStructure] = useState<StructureSeason[]>([]);
  const [loadingStructure, setLoadingStructure] = useState(true);

  const [selectedSeasonId, setSelectedSeasonId] = useState<string>('');
  const [selectedEventId, setSelectedEventId] = useState<string>('');
  const [selectedDayId, setSelectedDayId] = useState<string>('');

  const [moving, setMoving] = useState(false);

  useEffect(() => {
    if (isOpen) {
      fetchStructure();
    }
  }, [isOpen]);

  const fetchStructure = async () => {
    setLoadingStructure(true);
    try {
      const res = await fetch('/api/structure');
      if (res.ok) {
        const data = await res.json();
        setStructure(data);

        // Preselect initial season or first season
        if (data.length > 0) {
          const initSeason = data.find((s: StructureSeason) => s.id === currentSeasonId) || data[0];
          setSelectedSeasonId(initSeason.id);

          if (initSeason.events.length > 0) {
            const initEvent = initSeason.events.find((e: any) => e.id === currentEventId) || initSeason.events[0];
            setSelectedEventId(initEvent.id);

            if (initEvent.days.length > 0) {
              const initDay = initEvent.days.find((d: any) => d.id === currentDayId) || initEvent.days[0];
              setSelectedDayId(initDay.id);
            }
          }
        }
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingStructure(false);
    }
  };

  if (!isOpen) return null;

  const currentSeasonObj = structure.find((s) => s.id === selectedSeasonId);
  const availableEvents = currentSeasonObj?.events || [];
  const currentEventObj = availableEvents.find((e) => e.id === selectedEventId);
  const availableDays = currentEventObj?.days || [];

  const handleSeasonChange = (sId: string) => {
    setSelectedSeasonId(sId);
    const sObj = structure.find((s) => s.id === sId);
    const firstEvt = sObj?.events[0];
    if (firstEvt) {
      setSelectedEventId(firstEvt.id);
      setSelectedDayId(firstEvt.days[0]?.id || '');
    } else {
      setSelectedEventId('');
      setSelectedDayId('');
    }
  };

  const handleEventChange = (eId: string) => {
    setSelectedEventId(eId);
    const eObj = availableEvents.find((e) => e.id === eId);
    if (eObj && eObj.days.length > 0) {
      setSelectedDayId(eObj.days[0].id);
    } else {
      setSelectedDayId('');
    }
  };

  const handleSave = async () => {
    setMoving(true);
    try {
      await onConfirm({
        seasonId: selectedSeasonId,
        eventId: selectedEventId,
        dayId: selectedDayId,
      });
      onClose();
    } catch (err) {
      console.error(err);
    } finally {
      setMoving(false);
    }
  };

  const canConfirm = () => {
    if (mode === 'event') return Boolean(selectedSeasonId);
    if (mode === 'day') return Boolean(selectedEventId);
    if (mode === 'media') return Boolean(selectedDayId);
    return false;
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
      <div className="bg-platform-card border border-platform-border rounded-2xl w-full max-w-lg overflow-hidden shadow-2xl flex flex-col max-h-[90vh]">
        
        {/* Header */}
        <div className="p-5 border-b border-platform-border flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="p-2.5 rounded-xl bg-platform-tertiary border border-platform-border text-platform-green">
              <FolderKanban className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold font-display text-white text-base">
                Mută {mode === 'media' ? 'Fișiere' : mode === 'day' ? 'Zi' : 'Eveniment'}
              </h3>
              <p className="text-xs font-mono text-platform-green truncate max-w-xs">{itemTitle}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            disabled={moving}
            className="p-1.5 rounded-lg bg-platform-tertiary hover:bg-platform-border text-platform-textSecondary hover:text-white transition border border-platform-border"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto space-y-4 flex-1">
          {loadingStructure ? (
            <div className="flex items-center justify-center py-12 text-platform-textSecondary space-x-2">
              <Loader2 className="w-6 h-6 animate-spin text-platform-green" />
              <span className="font-mono text-xs">Se încarcă structura platformei...</span>
            </div>
          ) : (
            <div className="space-y-4">
              
              {/* Select Season */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold uppercase text-platform-textSecondary font-mono flex items-center space-x-1.5">
                  <Folder className="w-3.5 h-3.5 text-platform-green" />
                  <span>1. Selectează Sezonul Destinație</span>
                </label>
                <select
                  value={selectedSeasonId}
                  onChange={(e) => handleSeasonChange(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-platform-bg border border-platform-border rounded-xl text-xs text-white outline-none focus:border-platform-green font-mono"
                >
                  {structure.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name} ({s.events.length} Evenimente)
                    </option>
                  ))}
                </select>
              </div>

              {/* Select Event (if mode is day or media) */}
              {(mode === 'day' || mode === 'media') && (
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold uppercase text-platform-textSecondary font-mono flex items-center space-x-1.5">
                    <FolderKanban className="w-3.5 h-3.5 text-platform-blue" />
                    <span>2. Selectează Evenimentul Destinație</span>
                  </label>
                  {availableEvents.length === 0 ? (
                    <p className="text-xs text-red-400 font-mono p-2.5 rounded-xl bg-red-500/10 border border-red-500/20">
                      Nu există evenimente create în acest sezon.
                    </p>
                  ) : (
                    <select
                      value={selectedEventId}
                      onChange={(e) => handleEventChange(e.target.value)}
                      className="w-full px-3.5 py-2.5 bg-platform-bg border border-platform-border rounded-xl text-xs text-white outline-none focus:border-platform-green font-mono"
                    >
                      {availableEvents.map((e) => (
                        <option key={e.id} value={e.id}>
                          {e.name} ({e.days.length} Zile)
                        </option>
                      ))}
                    </select>
                  )}
                </div>
              )}

              {/* Select Day (if mode is media) */}
              {mode === 'media' && (
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold uppercase text-platform-textSecondary font-mono flex items-center space-x-1.5">
                    <CalendarDays className="w-3.5 h-3.5 text-platform-green" />
                    <span>3. Selectează Ziua Destinație</span>
                  </label>
                  {availableDays.length === 0 ? (
                    <p className="text-xs text-red-400 font-mono p-2.5 rounded-xl bg-red-500/10 border border-red-500/20">
                      Nu există zile adăugate în acest eveniment.
                    </p>
                  ) : (
                    <select
                      value={selectedDayId}
                      onChange={(e) => setSelectedDayId(e.target.value)}
                      className="w-full px-3.5 py-2.5 bg-platform-bg border border-platform-border rounded-xl text-xs text-white outline-none focus:border-platform-green font-mono"
                    >
                      {availableDays.map((d) => (
                        <option key={d.id} value={d.id}>
                          {d.label || `Ziua - ${formatDate(d.date)}`}
                        </option>
                      ))}
                    </select>
                  )}
                </div>
              )}

              {/* Preview Destination Box */}
              <div className="p-3.5 rounded-xl bg-platform-tertiary/60 border border-platform-border text-xs space-y-1 mt-2">
                <span className="text-platform-textMuted font-mono text-[11px] block uppercase">Destinație finală:</span>
                <div className="flex items-center space-x-2 text-platform-green font-mono font-semibold">
                  <ArrowRight className="w-4 h-4 shrink-0" />
                  <span className="truncate">
                    {currentSeasonObj?.name}
                    {selectedEventId && currentEventObj ? ` › ${currentEventObj.name}` : ''}
                    {mode === 'media' && selectedDayId ? ` › ${availableDays.find(d => d.id === selectedDayId)?.label || 'Zi Media'}` : ''}
                  </span>
                </div>
              </div>

            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-platform-border bg-platform-bg flex items-center justify-end space-x-3">
          <button
            type="button"
            onClick={onClose}
            disabled={moving}
            className="px-4 py-2 rounded-xl text-xs font-semibold text-platform-textSecondary hover:bg-platform-tertiary transition"
          >
            Anulează
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={!canConfirm() || moving}
            className="btn-platform-primary px-5 py-2 text-xs flex items-center space-x-2 shadow disabled:opacity-50"
          >
            {moving ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Se mută...</span>
              </>
            ) : (
              <>
                <Check className="w-4 h-4" />
                <span>Confirmă Mutarea</span>
              </>
            )}
          </button>
        </div>

      </div>
    </div>
  );
}
