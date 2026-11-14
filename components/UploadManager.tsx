'use client';

import React, { createContext, useContext, useEffect, useRef, useState, useSyncExternalStore } from 'react';
import {
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  FileImage,
  FileVideo,
  RotateCw,
  WifiOff,
  X,
  AlertCircle,
  Loader2,
} from 'lucide-react';

/* ------------------------------------------------------------------ */
/* Upload engine: chunked, parallel, resumable, survives page changes  */
/* ------------------------------------------------------------------ */

const MAX_PARALLEL_FILES = 3;
const MAX_PARALLEL_CHUNKS = 3; // per file
const RETRY_DELAYS_S = [1, 2, 4, 8, 15, 30, 30, 60, 60, 60];
const CHUNK_TIMEOUT_MS = 10 * 60 * 1000;
export const UPLOAD_COMPLETE_EVENT = 'media-upload-complete';

export type UploadStatus = 'queued' | 'preparing' | 'uploading' | 'finalizing' | 'done' | 'error' | 'canceled';

export interface UploadItem {
  id: string;
  file: File;
  dayId: string;
  tags: string[];
  status: UploadStatus;
  uploaded: number;
  speed: number; // bytes/s
  note?: string; // transient info: "reîncercare", "offline"
  error?: string;
  resumed?: boolean;
}

interface Internal {
  uploadId?: string;
  xhrs: Set<XMLHttpRequest>;
  inflight: Map<number, number>;
  doneBytes: number;
  samples: { t: number; b: number }[];
  canceled: boolean;
}

class HttpError extends Error {
  constructor(public status: number, message: string, public body?: any) {
    super(message);
  }
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

function waitOnline(): Promise<void> {
  if (typeof navigator === 'undefined' || navigator.onLine) return Promise.resolve();
  return new Promise((resolve) => window.addEventListener('online', () => resolve(), { once: true }));
}

// Network failures, timeouts (408), throttling (429) and server errors are retried; 4xx answers are final
const isRetryable = (e: unknown) =>
  !(e instanceof HttpError) || e.status >= 500 || e.status === 408 || e.status === 429;

class UploadStore {
  private items: UploadItem[] = [];
  private internal = new Map<string, Internal>();
  private listeners = new Set<() => void>();
  private emitTimer: ReturnType<typeof setTimeout> | null = null;
  private active = 0;

  subscribe = (fn: () => void) => {
    this.listeners.add(fn);
    return () => this.listeners.delete(fn);
  };

  getSnapshot = () => this.items;

  private emitNow() {
    if (this.emitTimer) {
      clearTimeout(this.emitTimer);
      this.emitTimer = null;
    }
    this.items = [...this.items];
    this.listeners.forEach((l) => l());
  }

  /** Progress updates are batched to ~5/s so big uploads don't re-render on every byte. */
  private emitSoon() {
    if (this.emitTimer) return;
    this.emitTimer = setTimeout(() => this.emitNow(), 200);
  }

  private patch(id: string, p: Partial<UploadItem>, immediate = true) {
    const idx = this.items.findIndex((i) => i.id === id);
    if (idx === -1) return;
    this.items[idx] = { ...this.items[idx], ...p };
    immediate ? this.emitNow() : this.emitSoon();
  }

  private get(id: string) {
    return this.items.find((i) => i.id === id);
  }

  enqueue(files: File[], dayId: string, tags: string[]) {
    for (const file of files) {
      const id = `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
      this.items.push({ id, file, dayId, tags, status: 'queued', uploaded: 0, speed: 0 });
      this.internal.set(id, { xhrs: new Set(), inflight: new Map(), doneBytes: 0, samples: [], canceled: false });
    }
    this.emitNow();
    this.pump();
  }

  cancel(id: string) {
    const it = this.get(id);
    const inn = this.internal.get(id);
    if (!it || !inn || it.status === 'done') return;
    inn.canceled = true;
    inn.xhrs.forEach((x) => x.abort());
    if (inn.uploadId) {
      fetch(`/api/upload/${inn.uploadId}`, { method: 'DELETE' }).catch(() => {});
    }
    this.patch(id, { status: 'canceled', speed: 0, note: undefined });
  }

  cancelAll() {
    this.items.filter((i) => !['done', 'canceled', 'error'].includes(i.status)).forEach((i) => this.cancel(i.id));
  }

  retry(id: string) {
    const it = this.get(id);
    if (!it || (it.status !== 'error' && it.status !== 'canceled')) return;
    this.internal.set(id, { xhrs: new Set(), inflight: new Map(), doneBytes: 0, samples: [], canceled: false });
    this.patch(id, { status: 'queued', error: undefined, note: undefined, uploaded: 0, speed: 0 });
    this.pump();
  }

  remove(id: string) {
    const it = this.get(id);
    if (it && !['done', 'error', 'canceled'].includes(it.status)) this.cancel(id);
    this.items = this.items.filter((i) => i.id !== id);
    this.internal.delete(id);
    this.emitNow();
  }

  clearFinished() {
    this.items.filter((i) => ['done', 'canceled'].includes(i.status)).forEach((i) => this.internal.delete(i.id));
    this.items = this.items.filter((i) => !['done', 'canceled'].includes(i.status));
    this.emitNow();
  }

  clearAll() {
    this.cancelAll();
    this.items = [];
    this.internal.clear();
    this.emitNow();
  }

  private pump() {
    while (this.active < MAX_PARALLEL_FILES) {
      const next = this.items.find((i) => i.status === 'queued');
      if (!next) return;
      this.active++;
      this.patch(next.id, { status: 'preparing' });
      this.run(next.id).finally(() => {
        this.active--;
        this.pump();
      });
    }
  }

  private updateProgress(id: string) {
    const inn = this.internal.get(id);
    if (!inn) return;
    let inflight = 0;
    inn.inflight.forEach((b) => (inflight += b));
    const uploaded = inn.doneBytes + inflight;
    const now = performance.now();
    inn.samples.push({ t: now, b: uploaded });
    while (inn.samples.length > 2 && now - inn.samples[0].t > 6000) inn.samples.shift();
    const first = inn.samples[0];
    const dt = (now - first.t) / 1000;
    const speed = dt > 0.5 ? Math.max(0, (uploaded - first.b) / dt) : 0;
    this.patch(id, { uploaded, speed }, false);
  }

  /** Runs fn with retries/backoff; waits for the network when offline. */
  private async withRetry<T>(id: string, label: string, fn: () => Promise<T>): Promise<T> {
    const inn = this.internal.get(id)!;
    for (let attempt = 0; ; attempt++) {
      if (inn.canceled) throw new Error('canceled');
      try {
        const out = await fn();
        if (this.get(id)?.note) this.patch(id, { note: undefined });
        return out;
      } catch (e) {
        if (inn.canceled) throw new Error('canceled');
        if (!isRetryable(e) || attempt >= RETRY_DELAYS_S.length) throw e;
        if (typeof navigator !== 'undefined' && !navigator.onLine) {
          this.patch(id, { note: 'offline', speed: 0 });
          await waitOnline();
          continue;
        }
        this.patch(id, { note: `${label}: reîncercare ${attempt + 1}…` });
        await sleep(RETRY_DELAYS_S[attempt] * 1000);
      }
    }
  }

  private async json(url: string, init?: RequestInit) {
    const res = await fetch(url, init);
    let body: any = null;
    try {
      body = await res.json();
    } catch {
      /* empty body */
    }
    if (!res.ok) throw new HttpError(res.status, body?.error || `Eroare ${res.status}`, body);
    return body;
  }

  private sendChunk(id: string, uploadId: string, index: number, blob: Blob): Promise<void> {
    const inn = this.internal.get(id)!;
    return new Promise((resolve, reject) => {
      const xhr = new XMLHttpRequest();
      inn.xhrs.add(xhr);
      xhr.open('PUT', `/api/upload/${uploadId}/chunk?index=${index}`);
      xhr.setRequestHeader('Content-Type', 'application/octet-stream');
      xhr.timeout = CHUNK_TIMEOUT_MS;
      xhr.upload.onprogress = (e) => {
        inn.inflight.set(index, e.loaded);
        this.updateProgress(id);
      };
      const done = (err?: Error) => {
        inn.xhrs.delete(xhr);
        inn.inflight.delete(index);
        err ? reject(err) : resolve();
      };
      xhr.onload = () => {
        if (xhr.status >= 200 && xhr.status < 300) {
          inn.doneBytes += blob.size;
          done();
          this.updateProgress(id);
        } else {
          let msg = `Eroare ${xhr.status}`;
          try {
            msg = JSON.parse(xhr.responseText).error || msg;
          } catch {
            /* not json */
          }
          done(new HttpError(xhr.status, msg));
        }
      };
      xhr.onerror = () => done(new Error('Conexiune întreruptă'));
      xhr.ontimeout = () => done(new Error('Timeout'));
      xhr.onabort = () => done(new Error('canceled'));
      xhr.send(blob);
    });
  }

  private async run(id: string) {
    const item = this.get(id);
    const inn = this.internal.get(id);
    if (!item || !inn) return;
    const { file } = item;

    try {
      const init = await this.withRetry(id, 'Pornire', () =>
        this.json('/api/upload/init', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            dayId: item.dayId,
            name: file.name,
            size: file.size,
            mimeType: file.type,
            lastModified: file.lastModified,
            tags: item.tags,
          }),
        })
      );
      inn.uploadId = init.uploadId;
      const chunkSize: number = init.chunkSize;
      const total: number = init.totalChunks;
      const lengthOf = (i: number) => Math.min(chunkSize, file.size - i * chunkSize);

      const have = new Set<number>(init.received || []);
      inn.doneBytes = Array.from(have).reduce((s, i) => s + lengthOf(i), 0);
      inn.samples = [];
      this.patch(id, { status: 'uploading', uploaded: inn.doneBytes, resumed: !!init.resumed && have.size > 0 });

      let pending = Array.from({ length: total }, (_, i) => i).filter((i) => !have.has(i));

      for (let round = 0; round < 3; round++) {
        const queue = [...pending];
        const worker = async () => {
          while (queue.length) {
            const index = queue.shift()!;
            const blob = file.slice(index * chunkSize, index * chunkSize + lengthOf(index));
            await this.withRetry(id, `Bucata ${index + 1}`, () => this.sendChunk(id, init.uploadId, index, blob));
          }
        };
        await Promise.all(Array.from({ length: Math.min(MAX_PARALLEL_CHUNKS, queue.length) }, worker));

        this.patch(id, { status: 'finalizing', speed: 0, uploaded: file.size });
        try {
          const res = await this.withRetry(id, 'Salvare', () =>
            this.json(`/api/upload/${init.uploadId}/complete`, { method: 'POST' })
          );
          this.patch(id, { status: 'done', note: undefined });
          window.dispatchEvent(new CustomEvent(UPLOAD_COMPLETE_EVENT, { detail: { dayId: item.dayId, asset: res.asset } }));
          return;
        } catch (e) {
          // Server says some chunks are missing: send just those again
          if (e instanceof HttpError && e.status === 409 && Array.isArray(e.body?.missing) && e.body.missing.length) {
            pending = e.body.missing;
            inn.doneBytes = file.size - pending.reduce((s: number, i: number) => s + lengthOf(i), 0);
            this.patch(id, { status: 'uploading' });
            continue;
          }
          throw e;
        }
      }
      throw new Error('Fișierul nu a putut fi asamblat corect.');
    } catch (e: any) {
      if (inn.canceled || e?.message === 'canceled') return;
      this.patch(id, { status: 'error', speed: 0, note: undefined, error: e?.message || 'Eroare necunoscută' });
    }
  }
}

/* ------------------------------------------------------------------ */
/* React glue                                                          */
/* ------------------------------------------------------------------ */

const StoreContext = createContext<UploadStore | null>(null);

export function UploadProvider({ children }: { children: React.ReactNode }) {
  const [store] = useState(() => new UploadStore());
  return (
    <StoreContext.Provider value={store}>
      {children}
      <UploadPanel />
    </StoreContext.Provider>
  );
}

export function useUploads() {
  const store = useContext(StoreContext);
  if (!store) throw new Error('useUploads must be used inside UploadProvider');
  const items = useSyncExternalStore(store.subscribe, store.getSnapshot, store.getSnapshot);
  return { items, store };
}

/** Calls `callback` (debounced) whenever an upload finishes — optionally only for one day. */
export function useUploadCompleted(callback: () => void, dayId?: string) {
  const cbRef = useRef(callback);
  cbRef.current = callback;
  useEffect(() => {
    let t: ReturnType<typeof setTimeout> | null = null;
    const handler = (e: Event) => {
      const detail = (e as CustomEvent).detail;
      if (dayId && detail?.dayId !== dayId) return;
      if (t) clearTimeout(t);
      t = setTimeout(() => cbRef.current(), 700);
    };
    window.addEventListener(UPLOAD_COMPLETE_EVENT, handler);
    return () => {
      window.removeEventListener(UPLOAD_COMPLETE_EVENT, handler);
      if (t) clearTimeout(t);
    };
  }, [dayId]);
}

/* ------------------------------------------------------------------ */
/* Drive-style floating panel                                          */
/* ------------------------------------------------------------------ */

export function formatBytes(b: number) {
  if (!b) return '0 B';
  const u = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.min(u.length - 1, Math.floor(Math.log(b) / Math.log(1024)));
  return `${(b / 1024 ** i).toFixed(i >= 3 ? 2 : i === 0 ? 0 : 1)} ${u[i]}`;
}

function formatEta(seconds: number) {
  if (!isFinite(seconds) || seconds <= 0) return '';
  if (seconds < 60) return `${Math.ceil(seconds)} sec`;
  if (seconds < 3600) return `${Math.ceil(seconds / 60)} min`;
  const h = Math.floor(seconds / 3600);
  return `${h} h ${Math.ceil((seconds % 3600) / 60)} min`;
}

const ACTIVE: UploadStatus[] = ['queued', 'preparing', 'uploading', 'finalizing'];

function UploadPanel() {
  const { items, store } = useUploads();
  const [collapsed, setCollapsed] = useState(false);

  const active = items.filter((i) => ACTIVE.includes(i.status));
  const failed = items.filter((i) => i.status === 'error');
  const done = items.filter((i) => i.status === 'done');

  // Warn before closing the tab while something is still uploading
  useEffect(() => {
    if (!active.length) return;
    const h = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = '';
    };
    window.addEventListener('beforeunload', h);
    return () => window.removeEventListener('beforeunload', h);
  }, [active.length]);

  if (!items.length) return null;

  const totalBytes = active.reduce((s, i) => s + i.file.size, 0);
  const sentBytes = active.reduce((s, i) => s + i.uploaded, 0);
  const speed = active.reduce((s, i) => s + i.speed, 0);
  const pct = totalBytes ? Math.min(100, Math.floor((sentBytes / totalBytes) * 100)) : 100;
  const eta = speed > 0 ? (totalBytes - sentBytes) / speed : NaN;
  const offline = active.some((i) => i.note === 'offline');

  let title: string;
  if (active.length) title = `Se încarcă ${active.length} ${active.length === 1 ? 'fișier' : 'fișiere'}`;
  else if (failed.length) title = `${failed.length} ${failed.length === 1 ? 'încărcare eșuată' : 'încărcări eșuate'}`;
  else title = `${done.length} ${done.length === 1 ? 'fișier încărcat' : 'fișiere încărcate'}`;

  const onClose = () => {
    if (active.length && !window.confirm('Anulezi toate încărcările în curs?')) return;
    store.clearAll();
  };

  return (
    <div
      className="fixed z-[60] bottom-4 left-4 right-4 sm:left-auto sm:right-6 sm:bottom-6 sm:w-[420px] rounded-2xl border border-platform-border bg-platform-card shadow-2xl shadow-black/60 overflow-hidden"
      role="region"
      aria-label="Încărcări"
    >
      {/* Header */}
      <div className="flex items-center gap-3 px-4 py-3 bg-platform-tertiary/60 border-b border-platform-border">
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-slate-100 truncate flex items-center gap-2">
            {active.length > 0 && !offline && <Loader2 className="w-4 h-4 text-platform-green animate-spin shrink-0" />}
            {offline && <WifiOff className="w-4 h-4 text-platform-copper shrink-0" />}
            {!active.length && failed.length > 0 && <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />}
            {!active.length && !failed.length && <CheckCircle2 className="w-4 h-4 text-platform-green shrink-0" />}
            <span className="truncate">{title}</span>
          </p>
          {active.length > 0 && (
            <p className="text-[11px] font-mono text-platform-textSecondary mt-0.5 truncate">
              {offline
                ? 'Fără conexiune – se reia automat'
                : `${pct}% · ${formatBytes(sentBytes)} / ${formatBytes(totalBytes)}${speed > 0 ? ` · ${formatBytes(speed)}/s` : ''}${formatEta(eta) ? ` · ~${formatEta(eta)}` : ''}`}
            </p>
          )}
        </div>
        <button
          onClick={() => setCollapsed((c) => !c)}
          className="p-2 rounded-lg text-platform-textSecondary hover:text-white hover:bg-platform-border transition"
          aria-label={collapsed ? 'Extinde' : 'Restrânge'}
        >
          {collapsed ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
        </button>
        <button
          onClick={onClose}
          className="p-2 rounded-lg text-platform-textSecondary hover:text-white hover:bg-platform-border transition"
          aria-label="Închide"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {active.length > 0 && (
        <div className="h-1 bg-platform-bg">
          <div className="h-full bg-platform-green transition-[width] duration-300" style={{ width: `${pct}%` }} />
        </div>
      )}

      {!collapsed && (
        <>
          <ul className="max-h-[45vh] overflow-y-auto divide-y divide-platform-border">
            {items.map((it) => (
              <UploadRow key={it.id} item={it} store={store} />
            ))}
          </ul>
          {(done.length > 0 || failed.length > 0) && active.length > 0 && (
            <div className="px-4 py-2 border-t border-platform-border text-right">
              <button
                onClick={() => store.clearFinished()}
                className="text-[11px] font-mono text-platform-textSecondary hover:text-white"
              >
                Ascunde finalizate
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}

function UploadRow({ item, store }: { item: UploadItem; store: UploadStore }) {
  const isVideo = item.file.type.startsWith('video/') || /\.(mp4|mov|m4v|mkv|avi|webm|mts)$/i.test(item.file.name);
  const pct = item.file.size ? Math.min(100, (item.uploaded / item.file.size) * 100) : 0;
  const eta = item.speed > 0 ? (item.file.size - item.uploaded) / item.speed : NaN;

  let sub: React.ReactNode;
  switch (item.status) {
    case 'queued':
      sub = `În așteptare · ${formatBytes(item.file.size)}`;
      break;
    case 'preparing':
      sub = 'Se pregătește…';
      break;
    case 'uploading':
      sub =
        item.note === 'offline'
          ? 'Fără conexiune – se reia automat'
          : item.note
          ? item.note
          : `${formatBytes(item.uploaded)} din ${formatBytes(item.file.size)}${item.speed > 0 ? ` · ${formatBytes(item.speed)}/s` : ''}${formatEta(eta) ? ` · ${formatEta(eta)}` : ''}`;
      break;
    case 'finalizing':
      sub = item.note || 'Se salvează pe server…';
      break;
    case 'done':
      sub = `Încărcat · ${formatBytes(item.file.size)}`;
      break;
    case 'canceled':
      sub = 'Anulat';
      break;
    case 'error':
      sub = item.error || 'Eroare';
      break;
  }

  const busy = item.status === 'uploading' || item.status === 'finalizing' || item.status === 'preparing';

  return (
    <li className="px-4 py-3">
      <div className="flex items-center gap-3">
        {isVideo ? (
          <FileVideo className="w-5 h-5 text-platform-blue shrink-0" />
        ) : (
          <FileImage className="w-5 h-5 text-platform-green shrink-0" />
        )}
        <div className="flex-1 min-w-0">
          <p className="text-xs font-semibold text-slate-200 truncate" title={item.file.name}>
            {item.file.name}
          </p>
          <p
            className={`text-[11px] font-mono truncate mt-0.5 ${
              item.status === 'error' ? 'text-red-400' : item.note ? 'text-platform-copper' : 'text-platform-textMuted'
            }`}
            title={typeof sub === 'string' ? sub : undefined}
          >
            {sub}
          </p>
        </div>
        <div className="flex items-center gap-1 shrink-0">
          {item.status === 'uploading' && (
            <span className="text-[11px] font-mono text-platform-textSecondary w-10 text-right">{Math.floor(pct)}%</span>
          )}
          {item.status === 'done' && <CheckCircle2 className="w-5 h-5 text-platform-green" />}
          {(item.status === 'error' || item.status === 'canceled') && (
            <button
              onClick={() => store.retry(item.id)}
              className="p-2 rounded-lg text-platform-textSecondary hover:text-platform-green hover:bg-platform-tertiary transition"
              aria-label="Reîncearcă"
              title="Reîncearcă"
            >
              <RotateCw className="w-4 h-4" />
            </button>
          )}
          {item.status !== 'done' && (
            <button
              onClick={() => (busy || item.status === 'queued' ? store.cancel(item.id) : store.remove(item.id))}
              className="p-2 rounded-lg text-platform-textSecondary hover:text-red-400 hover:bg-platform-tertiary transition"
              aria-label={busy || item.status === 'queued' ? 'Anulează' : 'Elimină'}
              title={busy || item.status === 'queued' ? 'Anulează' : 'Elimină'}
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>
      {busy && (
        <div className="mt-2 h-1.5 rounded-full bg-platform-bg overflow-hidden">
          <div
            className={`h-full rounded-full transition-[width] duration-300 ${
              item.status === 'finalizing' || item.status === 'preparing' ? 'bg-platform-green/60 animate-pulse' : 'bg-platform-green'
            }`}
            style={{ width: `${item.status === 'preparing' ? 3 : pct}%` }}
          />
        </div>
      )}
    </li>
  );
}
