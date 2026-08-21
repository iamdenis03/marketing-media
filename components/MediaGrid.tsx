'use client';

import React, { useState } from 'react';
import { MediaItem, Lightbox } from './Lightbox';
import { 
  Play, 
  Download, 
  Trash2, 
  Image as ImageIcon, 
  Video as VideoIcon, 
  Tag as TagIcon, 
  Search 
} from 'lucide-react';

interface MediaGridProps {
  assets: MediaItem[];
  onDeleteAsset?: (id: string) => void;
  userRole?: string;
}

export function MediaGrid({ assets, onDeleteAsset, userRole }: MediaGridProps) {
  const [selectedAsset, setSelectedAsset] = useState<MediaItem | null>(null);
  const [filterType, setFilterType] = useState<'ALL' | 'PHOTO' | 'VIDEO'>('ALL');
  const [selectedTag, setSelectedTag] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Extract all unique tag names
  const allTags = Array.from(
    new Set(assets.flatMap((a) => a.tags?.map((t) => t.name) || []))
  );

  // Filtered Assets
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

  return (
    <div className="space-y-6">
      
      {/* Controls / Filter Bar */}
      <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 bg-slate-900/60 backdrop-blur border border-slate-800 p-3 sm:p-4 rounded-2xl">
        
        {/* Search */}
        <div className="relative flex-1 min-w-[200px]">
          <Search className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Caută după nume sau etichetă..."
            className="w-full pl-9 pr-4 py-2 bg-slate-950 rounded-xl border border-slate-800 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-blue-500"
          />
        </div>

        {/* Filter by Type */}
        <div className="flex items-center space-x-1 bg-slate-950 p-1 rounded-xl border border-slate-800">
          <button
            onClick={() => setFilterType('ALL')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
              filterType === 'ALL'
                ? 'bg-blue-600 text-white shadow'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Toate ({assets.length})
          </button>
          <button
            onClick={() => setFilterType('PHOTO')}
            className={`flex items-center space-x-1 px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
              filterType === 'PHOTO'
                ? 'bg-blue-600 text-white shadow'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <ImageIcon className="w-3.5 h-3.5" />
            <span>Poze</span>
          </button>
          <button
            onClick={() => setFilterType('VIDEO')}
            className={`flex items-center space-x-1 px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
              filterType === 'VIDEO'
                ? 'bg-blue-600 text-white shadow'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <VideoIcon className="w-3.5 h-3.5" />
            <span>Video</span>
          </button>
        </div>

        {/* Filter by Tag Dropdown */}
        {allTags.length > 0 && (
          <div className="flex items-center space-x-2">
            <TagIcon className="w-4 h-4 text-amber-400 shrink-0" />
            <select
              value={selectedTag}
              onChange={(e) => setSelectedTag(e.target.value)}
              className="bg-slate-950 border border-slate-800 text-xs text-slate-200 rounded-xl px-3 py-2 outline-none focus:border-amber-500"
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

      {/* Media Grid */}
      {filteredAssets.length === 0 ? (
        <div className="text-center py-16 bg-slate-900/30 rounded-2xl border border-slate-800/50">
          <ImageIcon className="w-12 h-12 text-slate-600 mx-auto mb-3" />
          <h3 className="text-slate-300 font-semibold text-sm">Nu s-a găsit niciun fișier media</h3>
          <p className="text-xs text-slate-500 mt-1">
            Încearcă să schimbi filtrele sau încarcă fișiere noi în această zi.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3 sm:gap-4">
          {filteredAssets.map((asset) => {
            const isVideo = asset.type === 'VIDEO';
            const mediaUrl = `/api/media/${asset.filePath}`;
            const thumbUrl = asset.thumbnailPath ? `/api/media/${asset.thumbnailPath}` : mediaUrl;

            return (
              <div
                key={asset.id}
                className="group relative bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden aspect-square flex items-center justify-center hover:border-blue-500/50 transition-all duration-300 shadow-md hover:shadow-xl hover:shadow-blue-500/10 cursor-pointer"
                onClick={() => setSelectedAsset(asset)}
              >
                {/* Image or Video Thumbnail */}
                {!isVideo ? (
                  <img
                    src={thumbUrl}
                    alt={asset.originalName}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    loading="lazy"
                  />
                ) : (
                  <div className="w-full h-full bg-gradient-to-br from-slate-900 to-purple-950/60 flex flex-col items-center justify-center relative p-3">
                    <div className="p-3.5 rounded-full bg-purple-600/80 text-white shadow-lg group-hover:scale-110 transition-transform">
                      <Play className="w-6 h-6 fill-current ml-0.5" />
                    </div>
                    <span className="text-[10px] font-semibold text-purple-300 mt-2 truncate max-w-full px-2">
                      VIDEO
                    </span>
                  </div>
                )}

                {/* Type Badge */}
                <span className="absolute top-2 left-2 z-10 px-2 py-0.5 rounded bg-black/60 backdrop-blur text-[10px] font-semibold text-slate-200 border border-white/10">
                  {isVideo ? 'VIDEO' : 'FOTO'}
                </span>

                {/* Hover Overlay Actions */}
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex flex-col justify-between p-3">
                  <div className="flex justify-end space-x-1">
                    {/* Direct Download */}
                    <a
                      href={mediaUrl}
                      download={asset.originalName}
                      onClick={(e) => e.stopPropagation()}
                      className="p-1.5 rounded-lg bg-blue-600/80 hover:bg-blue-600 text-white backdrop-blur shadow transition"
                      title="Descarcă"
                    >
                      <Download className="w-3.5 h-3.5" />
                    </a>

                    {/* Delete for Admin */}
                    {userRole === 'ADMIN' && onDeleteAsset && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          if (confirm(`Ești sigur că vrei să ștergi fișierul "${asset.originalName}"?`)) {
                            onDeleteAsset(asset.id);
                          }
                        }}
                        className="p-1.5 rounded-lg bg-red-600/80 hover:bg-red-600 text-white backdrop-blur shadow transition"
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
                      <div className="flex flex-wrap gap-1 mt-1">
                        {asset.tags.map((t) => (
                          <span key={t.id} className="text-[9px] px-1.5 py-0.5 rounded bg-amber-500/30 text-amber-200">
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
