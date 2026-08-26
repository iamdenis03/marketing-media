'use client';

import React, { useState } from 'react';
import { MediaItem, Lightbox } from './Lightbox';
import { MoveTargetModal } from './MoveTargetModal';
import { 
  Play, 
  Download, 
  Trash2, 
  Image as ImageIcon, 
  Video as VideoIcon, 
  Tag as TagIcon, 
  Search,
  CheckSquare,
  Square,
  FolderKanban,
  X,
  CheckCircle2,
  ListFilter
} from 'lucide-react';

interface MediaGridProps {
  assets: MediaItem[];
  onDeleteAsset?: (id: string) => void;
  onRefreshNeeded?: () => void;
  userRole?: string;
}

export function MediaGrid({ assets, onDeleteAsset, onRefreshNeeded, userRole }: MediaGridProps) {
  const [selectedAsset, setSelectedAsset] = useState<MediaItem | null>(null);
  const [filterType, setFilterType] = useState<'ALL' | 'PHOTO' | 'VIDEO'>('ALL');
  const [selectedTag, setSelectedTag] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Multi-select state
  const [selectedAssetIds, setSelectedAssetIds] = useState<string[]>([]);
  const [showMoveModal, setShowMoveModal] = useState(false);

  const allTags = Array.from(
    new Set(assets.flatMap((a) => a.tags?.map((t) => t.name) || []))
  );

  const filteredAssets = assets.filter((asset) => {
    if (filterType !== 'ALL' && asset.type !== filterType) return false;
    if (selectedTag !== 'ALL' && !asset.tags?.some((t) => t.name === selectedTag)) return false;
    if (searchQuery.trim() !== '') {
      const q = searchQuery.toLowerCase();
      const matchName = asset.originalName.toLowerCase().includes(q);
      const matchTag = asset.tags?.some((t) => t.name.toLowerCase().includes(q));
      if (!matchName && !matchTag) return false;
    }
    return true;
  });

  const isAllSelected =
    filteredAssets.length > 0 &&
    filteredAssets.every((a) => selectedAssetIds.includes(a.id));

  const toggleSelectAll = () => {
    if (isAllSelected) {
      setSelectedAssetIds([]);
    } else {
      setSelectedAssetIds(filteredAssets.map((a) => a.id));
    }
  };

  const toggleSelectAsset = (id: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    if (selectedAssetIds.includes(id)) {
      setSelectedAssetIds(selectedAssetIds.filter((item) => item !== id));
    } else {
      setSelectedAssetIds([...selectedAssetIds, id]);
    }
  };

  const handleBulkMoveConfirm = async (target: { dayId?: string }) => {
    if (!target.dayId || selectedAssetIds.length === 0) return;

    try {
      const res = await fetch('/api/media/move', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          assetIds: selectedAssetIds,
          targetDayId: target.dayId,
        }),
      });

      if (res.ok) {
        setSelectedAssetIds([]);
        if (onRefreshNeeded) onRefreshNeeded();
      } else {
        const err = await res.json();
        alert(err.error || 'A apărut o eroare la mutarea fișierelor.');
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleBulkDelete = async () => {
    if (selectedAssetIds.length === 0 || !onDeleteAsset) return;

    if (confirm(`Ești sigur că vrei să ștergi ${selectedAssetIds.length} fișiere selectate?`)) {
      for (const id of selectedAssetIds) {
        await onDeleteAsset(id);
      }
      setSelectedAssetIds([]);
    }
  };

  const canManage = userRole === 'ADMIN' || userRole === 'EDITOR';

  return (
    <div className="space-y-5 relative">
      
      {/* Controls & Search / Filter Toolbar */}
      <div className="platform-card p-3.5 sm:p-4 space-y-3">
        
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
          {/* Search bar */}
          <div className="relative flex-1 min-w-[200px]">
            <Search className="w-4 h-4 text-platform-textMuted absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Caută fișier sau etichetă..."
              className="w-full pl-9 pr-9 py-2 bg-platform-bg rounded-xl border border-platform-border text-xs text-slate-200 placeholder-platform-textMuted focus:outline-none focus:border-platform-green min-h-[40px]"
            />
            {searchQuery !== '' && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-platform-textMuted hover:text-white"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Select All Toggle Button */}
          {canManage && filteredAssets.length > 0 && (
            <button
              onClick={toggleSelectAll}
              className={`px-3.5 py-2 rounded-xl text-xs font-mono font-semibold border transition flex items-center justify-center space-x-2 shrink-0 min-h-[40px] ${
                isAllSelected
                  ? 'bg-platform-green/10 border-platform-green/40 text-platform-green'
                  : 'bg-platform-bg hover:bg-platform-tertiary border-platform-border text-platform-textSecondary hover:text-white'
              }`}
            >
              {isAllSelected ? (
                <CheckSquare className="w-4 h-4 text-platform-green" />
              ) : (
                <Square className="w-4 h-4 text-platform-textMuted" />
              )}
              <span>{isAllSelected ? 'Deselectează Tot' : 'Selectează Tot'}</span>
            </button>
          )}
        </div>

        {/* Filter Pills & Tags Row */}
        <div className="flex flex-wrap items-center justify-between gap-2.5 pt-1 border-t border-platform-border/50">
          {/* Type Filters */}
          <div className="flex items-center space-x-1.5 overflow-x-auto scrollbar-none py-0.5 max-w-full">
            <button
              onClick={() => setFilterType('ALL')}
              className={`px-3 py-1.5 rounded-lg text-xs font-mono font-semibold transition shrink-0 min-h-[36px] ${
                filterType === 'ALL'
                  ? 'bg-platform-green text-slate-950 shadow-md font-bold'
                  : 'bg-platform-bg hover:bg-platform-tertiary text-platform-textSecondary hover:text-slate-200 border border-platform-border/60'
              }`}
            >
              Toate ({assets.length})
            </button>
            <button
              onClick={() => setFilterType('PHOTO')}
              className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-mono font-semibold transition shrink-0 min-h-[36px] ${
                filterType === 'PHOTO'
                  ? 'bg-platform-green text-slate-950 shadow-md font-bold'
                  : 'bg-platform-bg hover:bg-platform-tertiary text-platform-textSecondary hover:text-slate-200 border border-platform-border/60'
              }`}
            >
              <ImageIcon className="w-3.5 h-3.5" />
              <span>Poze</span>
            </button>
            <button
              onClick={() => setFilterType('VIDEO')}
              className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-mono font-semibold transition shrink-0 min-h-[36px] ${
                filterType === 'VIDEO'
                  ? 'bg-platform-green text-slate-950 shadow-md font-bold'
                  : 'bg-platform-bg hover:bg-platform-tertiary text-platform-textSecondary hover:text-slate-200 border border-platform-border/60'
              }`}
            >
              <VideoIcon className="w-3.5 h-3.5" />
              <span>Video</span>
            </button>
          </div>

          {/* Tag Filter Dropdown */}
          {allTags.length > 0 && (
            <div className="flex items-center space-x-2 shrink-0">
              <TagIcon className="w-3.5 h-3.5 text-platform-green shrink-0" />
              <select
                value={selectedTag}
                onChange={(e) => setSelectedTag(e.target.value)}
                className="bg-platform-bg border border-platform-border text-xs text-slate-200 rounded-xl px-3 py-1.5 outline-none focus:border-platform-green font-mono min-h-[36px]"
              >
                <option value="ALL">Toate Etichetele</option>
                {allTags.map((t) => (
                  <option key={t} value={t}>
                    #{t}
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>

      </div>

      {/* Media Grid */}
      {filteredAssets.length === 0 ? (
        <div className="platform-card text-center py-16 px-4">
          <ImageIcon className="w-12 h-12 text-platform-textMuted mx-auto mb-3" />
          <h3 className="text-slate-200 font-semibold text-sm">Nu s-a găsit niciun fișier media</h3>
          <p className="text-xs text-platform-textSecondary mt-1">
            Încearcă să schimbi filtrele sau încarcă fișiere noi.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3 sm:gap-4">
          {filteredAssets.map((asset) => {
            const isVideo = asset.type === 'VIDEO';
            const mediaUrl = `/api/media/${asset.filePath}`;
            const thumbUrl = asset.thumbnailPath ? `/api/media/${asset.thumbnailPath}` : mediaUrl;
            const isSelected = selectedAssetIds.includes(asset.id);

            return (
              <div
                key={asset.id}
                className={`group relative bg-platform-card border rounded-2xl overflow-hidden aspect-square flex items-center justify-center transition-all duration-200 shadow-md cursor-pointer select-none ${
                  isSelected
                    ? 'border-platform-green ring-2 ring-platform-green/60 scale-[0.98]'
                    : 'border-platform-border hover:border-platform-green/70'
                }`}
                onClick={() => {
                  if (selectedAssetIds.length > 0) {
                    toggleSelectAsset(asset.id);
                  } else {
                    setSelectedAsset(asset);
                  }
                }}
              >
                {/* Select Checkbox (top right) - Always touchable for admins/editors */}
                {canManage && (
                  <button
                    type="button"
                    onClick={(e) => toggleSelectAsset(asset.id, e)}
                    className="absolute top-2 right-2 z-20 p-1.5 rounded-xl bg-slate-950/70 backdrop-blur hover:bg-black transition active:scale-90"
                    title={isSelected ? 'Deselectează' : 'Selectează'}
                  >
                    {isSelected ? (
                      <CheckCircle2 className="w-5 h-5 text-platform-green fill-platform-green/20" />
                    ) : (
                      <Square className="w-5 h-5 text-slate-300 opacity-70 group-hover:opacity-100" />
                    )}
                  </button>
                )}

                {/* Media Thumbnail */}
                {!isVideo ? (
                  <img
                    src={thumbUrl}
                    alt={asset.originalName}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    loading="lazy"
                  />
                ) : (
                  <div className="w-full h-full bg-platform-tertiary flex flex-col items-center justify-center relative p-3">
                    <div className="p-3 rounded-full bg-platform-green/20 text-platform-green shadow-lg border border-platform-green/30 group-hover:scale-110 transition-transform">
                      <Play className="w-5 h-5 fill-current ml-0.5" />
                    </div>
                    <span className="text-[10px] font-mono font-semibold text-platform-green mt-2 truncate max-w-full px-2">
                      VIDEO
                    </span>
                  </div>
                )}

                {/* Type Badge */}
                <span className="absolute top-2 left-2 z-10 px-2 py-0.5 rounded-md bg-slate-950/75 backdrop-blur text-[10px] font-mono font-semibold text-platform-green border border-platform-green/30">
                  {isVideo ? 'VIDEO' : 'FOTO'}
                </span>

                {/* Hover / Active Info Overlay */}
                <div className="absolute inset-0 bg-gradient-to-t from-slate-950/90 via-slate-950/30 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex flex-col justify-between p-2.5">
                  <div className="flex justify-end space-x-1.5 pr-8">
                    {/* Direct Download */}
                    <a
                      href={mediaUrl}
                      download={asset.originalName}
                      onClick={(e) => e.stopPropagation()}
                      className="p-1.5 rounded-lg bg-platform-tertiary hover:bg-platform-green hover:text-slate-950 text-platform-green backdrop-blur shadow transition border border-platform-border"
                      title="Descarcă"
                    >
                      <Download className="w-3.5 h-3.5" />
                    </a>

                    {/* Quick Delete */}
                    {userRole === 'ADMIN' && onDeleteAsset && (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          if (confirm(`Ești sigur că vrei să ștergi fișierul "${asset.originalName}"?`)) {
                            onDeleteAsset(asset.id);
                          }
                        }}
                        className="p-1.5 rounded-lg bg-red-600/80 hover:bg-red-600 text-white backdrop-blur shadow transition border border-red-500/30"
                        title="Șterge fișier"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>

                  <div>
                    <p className="text-xs font-semibold text-white truncate shadow-text">
                      {asset.originalName}
                    </p>
                    {asset.tags && asset.tags.length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-1 font-mono">
                        {asset.tags.map((t) => (
                          <span key={t.id} className="text-[9px] px-1.5 py-0.5 rounded bg-platform-green/20 text-platform-green border border-platform-green/30">
                            #{t.name}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

              </div>
            );
          })}
        </div>
      )}

      {/* Dynamic Floating Action Toolbar: Appears ONLY when 1 or more assets are selected */}
      {canManage && selectedAssetIds.length > 0 && (
        <div className="fixed bottom-4 left-4 right-4 md:left-1/2 md:-translate-x-1/2 md:w-auto z-40 bg-slate-900/95 backdrop-blur-xl border border-platform-green/60 rounded-2xl px-4 py-3 shadow-2xl flex flex-wrap sm:flex-nowrap items-center justify-between sm:justify-start gap-3 animate-in fade-in slide-in-from-bottom-4 duration-200">
          
          <div className="flex items-center space-x-2">
            <span className="px-2.5 py-1 rounded-lg bg-platform-green/20 text-platform-green border border-platform-green/30 text-xs font-mono font-bold flex items-center space-x-1.5">
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>{selectedAssetIds.length} selectate</span>
            </span>
          </div>

          <div className="hidden sm:block h-4 w-px bg-platform-border" />

          {/* Prominent MOVE button - Primary Action */}
          <button
            type="button"
            onClick={() => setShowMoveModal(true)}
            className="btn-platform-primary px-4 py-2 text-xs flex items-center space-x-2 shadow-lg font-mono font-bold shrink-0 active:scale-95"
          >
            <FolderKanban className="w-4 h-4" />
            <span>Mută Fișierele</span>
          </button>

          {/* Delete Button for Admin */}
          {userRole === 'ADMIN' && onDeleteAsset && (
            <button
              type="button"
              onClick={handleBulkDelete}
              className="px-3.5 py-2 rounded-xl bg-red-500/15 hover:bg-red-600 text-red-400 hover:text-white border border-red-500/30 text-xs font-mono font-semibold transition flex items-center space-x-1.5 shrink-0 active:scale-95"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Șterge</span>
            </button>
          )}

          {/* Cancel Selection */}
          <button
            type="button"
            onClick={() => setSelectedAssetIds([])}
            className="p-1.5 rounded-xl text-platform-textMuted hover:text-white transition hover:bg-platform-tertiary ml-auto"
            title="Anulează Selecția"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Move Target Modal for Media */}
      {showMoveModal && (
        <MoveTargetModal
          isOpen={showMoveModal}
          mode="media"
          itemTitle={`${selectedAssetIds.length} fișiere selectate`}
          onClose={() => setShowMoveModal(false)}
          onConfirm={handleBulkMoveConfirm}
        />
      )}

      {/* Lightbox Modal */}
      <Lightbox
        asset={selectedAsset}
        assets={filteredAssets}
        onClose={() => setSelectedAsset(null)}
        onSelect={(asset) => setSelectedAsset(asset)}
      />
    </div>
  );
}
