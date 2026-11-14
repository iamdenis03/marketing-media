import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { getStorageBasePath } from '@/lib/storage';

/**
 * Chunked, resumable uploads.
 *
 * Each upload session lives in {MEDIA_STORAGE_PATH}/.uploads/{uploadId}/:
 *   meta.json   – who/what/where
 *   data        – the file being assembled (pre-sized, chunks written at their offset)
 *   chunks/N    – empty marker written once chunk N is fully on disk
 *
 * The temp folder sits on the same filesystem as the final media folder, so
 * completing an upload is an instant rename, not a copy.
 */

export const CHUNK_SIZE = 16 * 1024 * 1024; // 16 MB
export const MAX_UPLOAD_SIZE = 100 * 1024 * 1024 * 1024; // 100 GB per file
const STALE_SESSION_MS = 3 * 24 * 60 * 60 * 1000; // abandoned uploads are removed after 3 days

export interface UploadMeta {
  uploadId: string;
  fingerprint: string;
  userId: string;
  dayId: string;
  originalName: string;
  mimeType: string;
  size: number;
  chunkSize: number;
  totalChunks: number;
  tags: string[];
  createdAt: number;
}

const UPLOAD_ID_RE = /^[a-f0-9]{32}$/;

export function getUploadsRoot(): string {
  return path.join(getStorageBasePath(), '.uploads');
}

export function sessionDir(uploadId: string): string {
  if (!UPLOAD_ID_RE.test(uploadId)) throw new Error('ID upload invalid.');
  return path.join(getUploadsRoot(), uploadId);
}

export function dataPath(uploadId: string): string {
  return path.join(sessionDir(uploadId), 'data');
}

export function makeFingerprint(userId: string, dayId: string, name: string, size: number, lastModified: number): string {
  return crypto.createHash('sha256').update([userId, dayId, name, size, lastModified].join('|')).digest('hex');
}

export async function readMeta(uploadId: string): Promise<UploadMeta | null> {
  try {
    const raw = await fs.promises.readFile(path.join(sessionDir(uploadId), 'meta.json'), 'utf8');
    return JSON.parse(raw) as UploadMeta;
  } catch {
    return null;
  }
}

export async function receivedChunks(uploadId: string): Promise<number[]> {
  try {
    const names = await fs.promises.readdir(path.join(sessionDir(uploadId), 'chunks'));
    return names.map(Number).filter((n) => Number.isInteger(n)).sort((a, b) => a - b);
  } catch {
    return [];
  }
}

export function expectedChunkLength(meta: UploadMeta, index: number): number {
  const start = index * meta.chunkSize;
  return Math.max(0, Math.min(meta.chunkSize, meta.size - start));
}

/** Finds an unfinished session for the same file, so a re-selected file resumes instead of restarting. */
export async function findSessionByFingerprint(fingerprint: string): Promise<UploadMeta | null> {
  const root = getUploadsRoot();
  let entries: string[] = [];
  try {
    entries = await fs.promises.readdir(root);
  } catch {
    return null;
  }
  for (const id of entries) {
    if (!UPLOAD_ID_RE.test(id)) continue;
    const meta = await readMeta(id);
    if (meta && meta.fingerprint === fingerprint) return meta;
  }
  return null;
}

export async function createSession(input: Omit<UploadMeta, 'uploadId' | 'chunkSize' | 'totalChunks' | 'createdAt'>): Promise<UploadMeta> {
  const uploadId = crypto.randomBytes(16).toString('hex');
  const dir = sessionDir(uploadId);
  await fs.promises.mkdir(path.join(dir, 'chunks'), { recursive: true });

  const meta: UploadMeta = {
    ...input,
    uploadId,
    chunkSize: CHUNK_SIZE,
    totalChunks: Math.max(1, Math.ceil(input.size / CHUNK_SIZE)),
    createdAt: Date.now(),
  };

  // Pre-size the target file (sparse) so chunks can be written at their offsets in any order
  const fh = await fs.promises.open(path.join(dir, 'data'), 'w');
  await fh.truncate(input.size);
  await fh.close();

  await fs.promises.writeFile(path.join(dir, 'meta.json'), JSON.stringify(meta));
  return meta;
}

export async function markChunk(uploadId: string, index: number): Promise<void> {
  await fs.promises.writeFile(path.join(sessionDir(uploadId), 'chunks', String(index)), '');
}

export async function removeSession(uploadId: string): Promise<void> {
  await fs.promises.rm(sessionDir(uploadId), { recursive: true, force: true });
}

/** Deletes upload sessions nobody touched for a few days. */
export async function cleanupStaleSessions(): Promise<void> {
  const root = getUploadsRoot();
  let entries: string[] = [];
  try {
    entries = await fs.promises.readdir(root);
  } catch {
    return;
  }
  const now = Date.now();
  await Promise.all(
    entries.filter((id) => UPLOAD_ID_RE.test(id)).map(async (id) => {
      try {
        const dir = path.join(root, id);
        const chunksDir = path.join(dir, 'chunks');
        const st = await fs.promises.stat(fs.existsSync(chunksDir) ? chunksDir : dir);
        if (now - st.mtimeMs > STALE_SESSION_MS) {
          await fs.promises.rm(dir, { recursive: true, force: true });
        }
      } catch {
        /* ignore */
      }
    })
  );
}

/** Free bytes on the media disk, or null when the platform cannot tell. */
export async function getFreeBytes(): Promise<number | null> {
  try {
    if (typeof fs.promises.statfs !== 'function') return null;
    const base = getStorageBasePath();
    await fs.promises.mkdir(base, { recursive: true });
    const st = await fs.promises.statfs(base);
    return Number(st.bsize) * Number(st.bavail);
  } catch {
    return null;
  }
}

export function classifyMedia(name: string, mimeType: string): 'PHOTO' | 'VIDEO' | null {
  if (mimeType.startsWith('image/') || /\.(jpe?g|png|heic|heif|webp|gif|tiff?|dng|raw|cr2|nef|arw)$/i.test(name)) return 'PHOTO';
  if (mimeType.startsWith('video/') || /\.(mp4|mov|m4v|mkv|avi|webm|mts|m2ts|3gp|lrv|insv|360)$/i.test(name)) return 'VIDEO';
  return null;
}
