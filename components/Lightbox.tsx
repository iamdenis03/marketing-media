'use client';

import React, { useEffect } from 'react';
import { X, ChevronLeft, ChevronRight, Download, Calendar, User, Tag as TagIcon } from 'lucide-react';
import { formatDateTime } from '@/lib/utils';

export interface MediaItem {
  id: string;
  type: 'PHOTO' | 'VIDEO';
  fileName: string;
  filePath: string;
  thumbnailPath?: string | null;
  originalName: string;
  fileSize: number;
  uploadedAt: string;
  uploadedBy?: { name: string };
  tags?: { id: string; name: string }[];
}

interface LightboxProps {
  asset: MediaItem | null;
  assets: MediaItem[];
  onClose: () => void;
  onSelect: (asset: MediaItem) => void;
}

export function Lightbox({ asset, assets, onClose, onSelect }: LightboxProps) {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!asset) return;
      if (e.key === 'Escape') onClose();
      if (e.key === 'ArrowLeft') handlePrev();
      if (e.key === 'ArrowRight') handleNext();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [asset, assets]);

  if (!asset) return null;

  const currentIndex = assets.findIndex((a) => a.id === asset.id);

  const handlePrev = () => {
    if (currentIndex > 0) {
      onSelect(assets[currentIndex - 1]);
    } else {
      onSelect(assets[assets.length - 1]);
    }
  };

  const handleNext = () => {
    if (currentIndex < assets.length - 1) {
      onSelect(assets[currentIndex + 1]);
    } else {
      onSelect(assets[0]);
    }
  };

  const mediaUrl = `/api/media/${asset.filePath}`;

  const formatBytes = (bytes: number) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/95 backdrop-blur-xl flex flex-col justify-between p-4 sm:p-6 text-white animate-fadeIn">
      {/* Top Header Bar */}
      <div className="flex items-center justify-between z-10">
        <div className="flex items-center space-x-3">
          <span className="text-xs font-mono font-semibold px-2.5 py-1 rounded bg-platform-green/20 text-platform-green border border-platform-green/30">
            {asset.type}
          </span>
          <h3 className="font-semibold text-sm sm:text-base text-slate-200 truncate max-w-[250px] sm:max-w-md font-display">
            {asset.originalName}
          </h3>
        </div>

        <div className="flex items-center space-x-3">
          <a
            href={mediaUrl}
            download={asset.originalName}
            className="btn-platform-primary flex items-center space-x-1.5 px-3 py-1.5 text-xs font-semibold shadow"
          >
            <Download className="w-4 h-4" />
            <span className="hidden sm:inline">Descarcă</span>
          </a>

          <button
            onClick={onClose}
            className="p-2 rounded-full bg-platform-tertiary hover:bg-platform-border text-slate-300 transition border border-platform-border"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Main Preview Container */}
      <div className="relative flex-1 flex items-center justify-center my-4 overflow-hidden">
        {/* Navigation Buttons */}
        {assets.length > 1 && (
          <>
            <button
              onClick={handlePrev}
              className="absolute left-2 sm:left-4 z-20 p-3 rounded-full bg-platform-card/80 hover:bg-platform-tertiary text-white transition border border-platform-border"
            >
              <ChevronLeft className="w-6 h-6" />
            </button>
            <button
              onClick={handleNext}
              className="absolute right-2 sm:right-4 z-20 p-3 rounded-full bg-platform-card/80 hover:bg-platform-tertiary text-white transition border border-platform-border"
            >
              <ChevronRight className="w-6 h-6" />
            </button>
          </>
        )}

        {/* Photo or Video */}
        {asset.type === 'PHOTO' ? (
          <img
            src={mediaUrl}
            alt={asset.originalName}
            className="max-h-full max-w-full object-contain rounded-xl shadow-2xl"
          />
        ) : (
          <video
            src={mediaUrl}
            controls
            autoPlay
            className="max-h-full max-w-full rounded-xl shadow-2xl border border-platform-border"
          />
        )}
      </div>

      {/* Footer Info */}
      <div className="flex flex-col sm:flex-row items-center justify-between text-xs text-platform-textSecondary bg-platform-card p-3 rounded-xl border border-platform-border gap-2 font-mono">
        <div className="flex items-center space-x-4">
          <span className="flex items-center space-x-1.5">
            <User className="w-3.5 h-3.5 text-platform-green" />
            <span>{asset.uploadedBy?.name || 'Incert'}</span>
          </span>
          <span className="flex items-center space-x-1.5">
            <Calendar className="w-3.5 h-3.5 text-platform-green" />
            <span>{formatDateTime(asset.uploadedAt)}</span>
          </span>
          <span>{formatBytes(asset.fileSize)}</span>
        </div>

        {/* Tags */}
        {asset.tags && asset.tags.length > 0 && (
          <div className="flex items-center space-x-1 overflow-x-auto">
            <TagIcon className="w-3.5 h-3.5 text-platform-textMuted" />
            {asset.tags.map((t) => (
              <span
                key={t.id}
                className="px-2 py-0.5 rounded bg-platform-green/10 border border-platform-green/20 text-platform-green text-[11px]"
              >
                #{t.name}
              </span>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
