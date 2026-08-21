'use client';

import React, { useState, useRef } from 'react';
import { X, UploadCloud, FileImage, FileVideo, CheckCircle2, AlertCircle, Loader2, Tag } from 'lucide-react';

interface MediaUploadModalProps {
  dayId: string;
  isOpen: boolean;
  onClose: () => void;
  onUploadSuccess: () => void;
}

interface FileItem {
  id: string;
  file: File;
  progress: number;
  status: 'pending' | 'uploading' | 'success' | 'error';
  errorMsg?: string;
}

export function MediaUploadModal({ dayId, isOpen, onClose, onUploadSuccess }: MediaUploadModalProps) {
  const [files, setFiles] = useState<FileItem[]>([]);
  const [tagInput, setTagInput] = useState<string>('');
  const [tags, setTags] = useState<string[]>([]);
  const [isUploading, setIsUploading] = useState<boolean>(false);
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  const handleAddFiles = (newFiles: FileList | File[]) => {
    const fileItems: FileItem[] = Array.from(newFiles).map((file) => ({
      id: Math.random().toString(36).substring(2, 9),
      file,
      progress: 0,
      status: 'pending',
    }));

    setFiles((prev) => [...prev, ...fileItems]);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleAddFiles(e.dataTransfer.files);
    }
  };

  const handleAddTag = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault();
      const val = tagInput.trim().toLowerCase();
      if (val && !tags.includes(val)) {
        setTags([...tags, val]);
      }
      setTagInput('');
    }
  };

  const removeTag = (tagToRemove: string) => {
    setTags(tags.filter((t) => t !== tagToRemove));
  };

  const removeFile = (id: string) => {
    setFiles(files.filter((f) => f.id !== id));
  };

  const handleStartUpload = async () => {
    if (files.length === 0) return;

    setIsUploading(true);

    // Upload in batches or all together via FormData
    const formData = new FormData();
    formData.append('dayId', dayId);
    formData.append('tags', JSON.stringify(tags));

    files.forEach((item) => {
      formData.append('files', item.file);
    });

    // Update status to uploading
    setFiles((prev) =>
      prev.map((f) => ({ ...f, status: 'uploading', progress: 50 }))
    );

    try {
      const res = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'A apărut o eroare la upload.');
      }

      setFiles((prev) =>
        prev.map((f) => ({ ...f, status: 'success', progress: 100 }))
      );

      setTimeout(() => {
        setIsUploading(false);
        onUploadSuccess();
        onClose();
        setFiles([]);
        setTags([]);
      }, 1000);
    } catch (err: any) {
      console.error(err);
      setFiles((prev) =>
        prev.map((f) => ({ ...f, status: 'error', errorMsg: err.message }))
      );
      setIsUploading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-2xl overflow-hidden shadow-2xl flex flex-col max-h-[90vh]">
        
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <div className="p-2 rounded-lg bg-blue-500/20 text-blue-400">
              <UploadCloud className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-slate-100 text-base">Încărcare Media (Poze & Video)</h3>
              <p className="text-xs text-slate-400">Drag & drop fișiere sau selectează din computer</p>
            </div>
          </div>
          <button
            onClick={onClose}
            disabled={isUploading}
            className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-4 sm:p-6 overflow-y-auto space-y-4 flex-1">
          
          {/* Dropzone */}
          <div
            onDragOver={(e) => {
              e.preventDefault();
              setIsDragging(true);
            }}
            onDragLeave={() => setIsDragging(false)}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
            className={`border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition flex flex-col items-center justify-center space-y-2 ${
              isDragging
                ? 'border-blue-500 bg-blue-500/10'
                : 'border-slate-700 hover:border-slate-600 bg-slate-800/40 hover:bg-slate-800/70'
            }`}
          >
            <input
              type="file"
              ref={fileInputRef}
              multiple
              accept="image/*,video/*"
              className="hidden"
              onChange={(e) => {
                if (e.target.files) handleAddFiles(e.target.files);
              }}
            />
            <UploadCloud className="w-10 h-10 text-blue-400 animate-bounce" />
            <p className="text-sm font-semibold text-slate-200">
              Trage fișierele aici sau <span className="text-blue-400 underline">răsfoiește</span>
            </p>
            <p className="text-xs text-slate-500">
              Suportat: JPG, PNG, HEIC, MP4, MOV. Max 500MB / fișier video.
            </p>
          </div>

          {/* Tags Input Section */}
          <div className="space-y-2">
            <label className="text-xs font-semibold text-slate-300 flex items-center space-x-1">
              <Tag className="w-3.5 h-3.5 text-amber-400" />
              <span>Etichete pentru toate fișierele (Apasă Enter):</span>
            </label>
            <div className="flex flex-wrap gap-1.5 p-2 bg-slate-950 rounded-lg border border-slate-800 items-center">
              {tags.map((t) => (
                <span
                  key={t}
                  className="inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-md bg-amber-500/20 text-amber-300 border border-amber-500/30 text-xs font-medium"
                >
                  <span>#{t}</span>
                  <button onClick={() => removeTag(t)} className="hover:text-red-400">
                    <X className="w-3 h-3" />
                  </button>
                </span>
              ))}
              <input
                type="text"
                value={tagInput}
                onChange={(e) => setTagInput(e.target.value)}
                onKeyDown={handleAddTag}
                placeholder="Ex: robot, echipa..."
                className="bg-transparent text-xs text-slate-200 outline-none flex-1 min-w-[120px]"
              />
            </div>
          </div>

          {/* Selected Files List */}
          {files.length > 0 && (
            <div className="space-y-2">
              <h4 className="text-xs font-semibold text-slate-400">
                Fișiere selectate ({files.length}):
              </h4>
              <div className="max-h-48 overflow-y-auto space-y-2 pr-1">
                {files.map((item) => {
                  const isImage = item.file.type.startsWith('image/');
                  return (
                    <div
                      key={item.id}
                      className="flex items-center justify-between p-3 bg-slate-950 rounded-xl border border-slate-800 text-xs"
                    >
                      <div className="flex items-center space-x-3 truncate">
                        {isImage ? (
                          <FileImage className="w-5 h-5 text-blue-400 shrink-0" />
                        ) : (
                          <FileVideo className="w-5 h-5 text-purple-400 shrink-0" />
                        )}
                        <div className="truncate">
                          <p className="font-semibold text-slate-200 truncate">{item.file.name}</p>
                          <p className="text-[10px] text-slate-500">
                            {(item.file.size / 1024 / 1024).toFixed(2)} MB
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center space-x-3">
                        {item.status === 'uploading' && (
                          <Loader2 className="w-4 h-4 text-blue-400 animate-spin" />
                        )}
                        {item.status === 'success' && (
                          <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                        )}
                        {item.status === 'error' && (
                          <span className="text-red-400 text-[11px] flex items-center space-x-1">
                            <AlertCircle className="w-3.5 h-3.5" />
                            <span>{item.errorMsg || 'Eroare'}</span>
                          </span>
                        )}
                        {item.status === 'pending' && !isUploading && (
                          <button
                            onClick={() => removeFile(item.id)}
                            className="p-1 text-slate-500 hover:text-red-400 transition"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

        </div>

        {/* Footer Actions */}
        <div className="p-4 border-t border-slate-800 bg-slate-950 flex items-center justify-end space-x-3">
          <button
            onClick={onClose}
            disabled={isUploading}
            className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-300 hover:bg-slate-800 transition"
          >
            Anulează
          </button>
          <button
            onClick={handleStartUpload}
            disabled={files.length === 0 || isUploading}
            className="px-5 py-2 rounded-xl text-xs font-semibold bg-gradient-to-r from-blue-600 to-amber-600 hover:opacity-95 text-white disabled:opacity-50 transition flex items-center space-x-2 shadow"
          >
            {isUploading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Se încarcă...</span>
              </>
            ) : (
              <>
                <UploadCloud className="w-4 h-4" />
                <span>Începe Upload ({files.length})</span>
              </>
            )}
          </button>
        </div>

      </div>
    </div>
  );
}
