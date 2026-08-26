'use client';

import React, { useState, useEffect } from 'react';
import { 
  X, 
  FolderKanban, 
  CalendarDays, 
  Folder, 
  FolderOpen,
  ChevronRight, 
  ChevronDown, 
  ArrowRight, 
  Loader2, 
  Check, 
  CheckCircle2,
  Search,
  HardDrive
} from 'lucide-react';
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
  const [searchQuery, setSearchQuery] = useState('');

  // Expand / Collapse state (Windows Explorer Tree style)
  const [expandedSeasonIds, setExpandedSeasonIds] = useState<Set<string>>(new Set());
  const [expandedEventIds, setExpandedEventIds] = useState<Set<string>>(new Set());

  // Selected Target state
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
        const data: StructureSeason[] = await res.json();
        setStructure(data);

        if (data.length > 0) {
          // Preselect initial targets
          const initSeason = data.find((s) => s.id === currentSeasonId) || data[0];
          setSelectedSeasonId(initSeason.id);

          const seasonExpandSet = new Set<string>([initSeason.id]);
          const eventExpandSet = new Set<string>();

          if (initSeason.events.length > 0) {
            const initEvent = initSeason.events.find((e) => e.id === currentEventId) || initSeason.events[0];
            setSelectedEventId(initEvent.id);
            eventExpandSet.add(initEvent.id);

            if (initEvent.days.length > 0) {
              const initDay = initEvent.days.find((d) => d.id === currentDayId) || initEvent.days[0];
              setSelectedDayId(initDay.id);
            }
          }

          setExpandedSeasonIds(seasonExpandSet);
          setExpandedEventIds(eventExpandSet);
        }
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingStructure(false);
    }
  };

  if (!isOpen) return null;

  const toggleSeasonExpand = (sId: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setExpandedSeasonIds((prev) => {
      const next = new Set(prev);
      if (next.has(sId)) {
        next.delete(sId);
      } else {
        next.add(sId);
      }
      return next;
    });
  };

  const toggleEventExpand = (eId: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setExpandedEventIds((prev) => {
      const next = new Set(prev);
      if (next.has(eId)) {
        next.delete(eId);
      } else {
        next.add(eId);
      }
      return next;
    });
  };

  const handleSelectSeason = (season: StructureSeason) => {
    setSelectedSeasonId(season.id);
    // Expand when clicked
    setExpandedSeasonIds((prev) => new Set(prev).add(season.id));

    if (season.events.length > 0) {
      const firstEvt = season.events[0];
      setSelectedEventId(firstEvt.id);
      if (firstEvt.days.length > 0) {
        setSelectedDayId(firstEvt.days[0].id);
      } else {
        setSelectedDayId('');
      }
    } else {
      setSelectedEventId('');
      setSelectedDayId('');
    }
  };

  const handleSelectEvent = (seasonId: string, event: StructureSeason['events'][0]) => {
    setSelectedSeasonId(seasonId);
    setSelectedEventId(event.id);
    setExpandedSeasonIds((prev) => new Set(prev).add(seasonId));
    setExpandedEventIds((prev) => new Set(prev).add(event.id));

    if (event.days.length > 0) {
      setSelectedDayId(event.days[0].id);
    } else {
      setSelectedDayId('');
    }
  };

  const handleSelectDay = (seasonId: string, eventId: string, dayId: string) => {
    setSelectedSeasonId(seasonId);
    setSelectedEventId(eventId);
    setSelectedDayId(dayId);
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

  // Find target objects for display summary
  const currentSeasonObj = structure.find((s) => s.id === selectedSeasonId);
  const currentEventObj = currentSeasonObj?.events.find((e) => e.id === selectedEventId);
  const currentDayObj = currentEventObj?.days.find((d) => d.id === selectedDayId);

  // Filter structure if searching
  const filteredStructure = structure.filter((season) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    if (season.name.toLowerCase().includes(q)) return true;
    return season.events.some((evt) => {
      if (evt.name.toLowerCase().includes(q)) return true;
      return evt.days.some((day) => (day.label || formatDate(day.date)).toLowerCase().includes(q));
    });
  });

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-3 sm:p-4 animate-in fade-in duration-200">
      <div className="bg-platform-card border border-platform-border rounded-2xl w-full max-w-xl overflow-hidden shadow-2xl flex flex-col max-h-[90vh]">
        
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-platform-border flex items-center justify-between bg-platform-bg/50">
          <div className="flex items-center space-x-3">
            <div className="p-2.5 rounded-xl bg-platform-tertiary border border-platform-border text-platform-green shadow-sm">
              <FolderKanban className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold font-display text-white text-base flex items-center space-x-2">
                <span>Mută în Structură</span>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-mono bg-platform-green/10 text-platform-green border border-platform-green/20 uppercase">
                  {mode}
                </span>
              </h3>
              <p className="text-xs font-mono text-platform-green truncate max-w-xs sm:max-w-md mt-0.5">
                {itemTitle}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={moving}
            className="p-2 rounded-xl bg-platform-tertiary hover:bg-platform-border text-platform-textSecondary hover:text-white transition border border-platform-border min-h-[38px] min-w-[38px] flex items-center justify-center"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Area */}
        <div className="p-4 sm:p-5 overflow-y-auto space-y-3.5 flex-1">
          
          {/* Quick Search */}
          <div className="relative">
            <Search className="w-4 h-4 text-platform-textMuted absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Caută dosar în arborescență..."
              className="w-full pl-9 pr-4 py-2 bg-platform-bg rounded-xl border border-platform-border text-xs text-slate-200 placeholder-platform-textMuted focus:outline-none focus:border-platform-green min-h-[38px]"
            />
          </div>

          <div className="text-[11px] font-mono text-platform-textSecondary flex items-center space-x-1.5">
            <HardDrive className="w-3.5 h-3.5 text-platform-green" />
            <span>Selectează dosarul destinație (Windows Explorer Tree View):</span>
          </div>

          {loadingStructure ? (
            <div className="flex items-center justify-center py-16 text-platform-textSecondary space-x-2">
              <Loader2 className="w-6 h-6 animate-spin text-platform-green" />
              <span className="font-mono text-xs">Se încarcă arborele de fișiere...</span>
            </div>
          ) : filteredStructure.length === 0 ? (
            <div className="p-6 text-center text-xs text-platform-textMuted font-mono bg-platform-bg rounded-xl border border-platform-border">
              Nu s-a găsit niciun dosar care să se potrivească cu căutarea.
            </div>
          ) : (
            /* Windows File Explorer Tree View Container */
            <div className="bg-platform-bg/90 border border-platform-border rounded-xl p-3 space-y-1 font-mono text-xs max-h-[50vh] overflow-y-auto scrollbar-thin">
              {filteredStructure.map((season) => {
                const isSeasonExpanded = expandedSeasonIds.has(season.id);
                const isSeasonTarget = mode === 'event' && selectedSeasonId === season.id;
                const hasEvents = season.events.length > 0;

                return (
                  <div key={season.id} className="space-y-1">
                    
                    {/* LEVEL 0: SEASON FOLDER */}
                    <div
                      onClick={() => handleSelectSeason(season)}
                      className={`flex items-center space-x-2 px-2.5 py-2 rounded-xl transition cursor-pointer group min-h-[38px] ${
                        isSeasonTarget
                          ? 'bg-platform-green/20 border border-platform-green text-white font-bold shadow-sm'
                          : selectedSeasonId === season.id
                          ? 'bg-platform-tertiary border border-platform-border text-slate-200'
                          : 'hover:bg-platform-tertiary/60 text-slate-300'
                      }`}
                    >
                      {/* Expand / Collapse Toggle Arrow */}
                      {hasEvents ? (
                        <button
                          type="button"
                          onClick={(e) => toggleSeasonExpand(season.id, e)}
                          className="p-1 rounded hover:bg-platform-border text-platform-textMuted hover:text-white transition"
                        >
                          {isSeasonExpanded ? (
                            <ChevronDown className="w-4 h-4 text-platform-green" />
                          ) : (
                            <ChevronRight className="w-4 h-4" />
                          )}
                        </button>
                      ) : (
                        <div className="w-6" />
                      )}

                      {/* Folder Icon */}
                      {isSeasonExpanded ? (
                        <FolderOpen className="w-4 h-4 text-platform-green shrink-0" />
                      ) : (
                        <Folder className="w-4 h-4 text-platform-green shrink-0" />
                      )}

                      {/* Name & Badge */}
                      <span className="flex-1 truncate">{season.name}</span>
                      <span className="text-[10px] px-2 py-0.5 rounded bg-platform-tertiary text-platform-textMuted border border-platform-border/60 shrink-0">
                        {season.events.length} ev.
                      </span>

                      {/* Selected Indicator */}
                      {mode === 'event' && isSeasonTarget && (
                        <CheckCircle2 className="w-4 h-4 text-platform-green shrink-0" />
                      )}
                    </div>

                    {/* LEVEL 1: EVENTS INSIDE EXPANDED SEASON */}
                    {isSeasonExpanded && hasEvents && (
                      <div className="border-l border-platform-border/60 ml-2.5 sm:ml-4 pl-2 sm:pl-3 space-y-1 py-0.5">
                        {season.events.map((evt) => {
                          const isEventExpanded = expandedEventIds.has(evt.id);
                          const isEventTarget = mode === 'day' && selectedEventId === evt.id;
                          const hasDays = evt.days.length > 0;

                          return (
                            <div key={evt.id} className="space-y-1">
                              
                              {/* EVENT SUB-FOLDER */}
                              <div
                                onClick={() => handleSelectEvent(season.id, evt)}
                                className={`flex items-center space-x-2 px-2 py-1.5 rounded-lg transition cursor-pointer group min-h-[36px] ${
                                  isEventTarget
                                    ? 'bg-platform-green/20 border border-platform-green text-white font-bold shadow-sm'
                                    : selectedEventId === evt.id
                                    ? 'bg-platform-tertiary/80 border border-platform-border/80 text-slate-200'
                                    : 'hover:bg-platform-tertiary/40 text-slate-300'
                                }`}
                              >
                                {hasDays ? (
                                  <button
                                    type="button"
                                    onClick={(e) => toggleEventExpand(evt.id, e)}
                                    className="p-0.5 rounded hover:bg-platform-border text-platform-textMuted hover:text-white transition"
                                  >
                                    {isEventExpanded ? (
                                      <ChevronDown className="w-3.5 h-3.5 text-platform-blue" />
                                    ) : (
                                      <ChevronRight className="w-3.5 h-3.5" />
                                    )}
                                  </button>
                                ) : (
                                  <div className="w-4 sm:w-5" />
                                )}

                                <FolderKanban className="w-3.5 h-3.5 text-platform-blue shrink-0" />
                                <span className="flex-1 truncate text-xs">{evt.name}</span>
                                <span className="text-[9px] sm:text-[10px] px-1.5 py-0.5 rounded bg-platform-tertiary/60 text-platform-textMuted shrink-0">
                                  {evt.days.length} z
                                </span>

                                {mode === 'day' && isEventTarget && (
                                  <CheckCircle2 className="w-4 h-4 text-platform-green shrink-0" />
                                )}
                              </div>

                              {/* LEVEL 2: DAYS INSIDE EXPANDED EVENT */}
                              {isEventExpanded && hasDays && (
                                <div className="border-l border-platform-border/50 ml-2 sm:ml-3.5 pl-1.5 sm:pl-3 space-y-1 py-0.5">
                                  {evt.days.map((day) => {
                                    const isDayTarget = mode === 'media' && selectedDayId === day.id;

                                    return (
                                      <div
                                        key={day.id}
                                        onClick={() => handleSelectDay(season.id, evt.id, day.id)}
                                        className={`flex items-center space-x-2 px-2.5 py-1.5 rounded-md transition cursor-pointer min-h-[34px] ${
                                          isDayTarget
                                            ? 'bg-platform-green/25 border border-platform-green text-platform-green font-bold shadow'
                                            : selectedDayId === day.id
                                            ? 'bg-platform-tertiary/60 text-slate-200'
                                            : 'hover:bg-platform-tertiary/30 text-slate-400 hover:text-slate-200'
                                        }`}
                                      >
                                        <CalendarDays className={`w-3.5 h-3.5 shrink-0 ${isDayTarget ? 'text-platform-green' : 'text-platform-textMuted'}`} />
                                        <span className="flex-1 truncate">
                                          {day.label || `Ziua - ${formatDate(day.date)}`}
                                        </span>

                                        {mode === 'media' && isDayTarget && (
                                          <CheckCircle2 className="w-4 h-4 text-platform-green shrink-0" />
                                        )}
                                      </div>
                                    );
                                  })}
                                </div>
                              )}

                            </div>
                          );
                        })}
                      </div>
                    )}

                  </div>
                );
              })}
            </div>
          )}

          {/* Selected Target Summary Box */}
          <div className="p-3.5 rounded-xl bg-platform-tertiary/70 border border-platform-border text-xs space-y-1.5">
            <span className="text-platform-textMuted font-mono text-[10px] uppercase font-semibold block tracking-wider">
              Destinație finală selectată:
            </span>
            <div className="flex items-center space-x-2 text-platform-green font-mono font-semibold text-xs">
              <ArrowRight className="w-4 h-4 shrink-0 text-platform-green animate-pulse" />
              <span className="truncate">
                {currentSeasonObj ? `📂 ${currentSeasonObj.name}` : 'Niciun Sezon'}
                {selectedEventId && currentEventObj ? ` › 📁 ${currentEventObj.name}` : ''}
                {mode === 'media' && selectedDayId && currentDayObj ? ` › 📅 ${currentDayObj.label || formatDate(currentDayObj.date)}` : ''}
              </span>
            </div>
          </div>

        </div>

        {/* Footer Actions */}
        <div className="p-4 border-t border-platform-border bg-platform-bg/80 flex items-center justify-end space-x-3">
          <button
            type="button"
            onClick={onClose}
            disabled={moving}
            className="px-4 py-2.5 rounded-xl text-xs font-semibold text-platform-textSecondary hover:bg-platform-tertiary transition min-h-[44px]"
          >
            Anulează
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={!canConfirm() || moving}
            className="btn-platform-primary px-5 py-2.5 text-xs flex items-center space-x-2 shadow disabled:opacity-50 min-h-[44px] font-mono font-bold"
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
